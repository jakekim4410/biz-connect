import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { anthropic } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────
// 0. 쿼리 언어 감지 함수 (신규 추가)
// 한글 유니코드 범위로 판별 — 코드 레벨에서 언어를 감지해
// 프롬프트에 명시적으로 주입함으로써 모델의 언어 혼용 문제 해결
// ─────────────────────────────────────────────
function detectQueryLanguage(query: string): "ko" | "en" {
  // AC00-D7A3: 완성형 한글, 1100-11FF: 자모, 3130-318F: 호환 자모
  const koreanRegex = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
  return koreanRegex.test(query) ? "ko" : "en";
}

// ─────────────────────────────────────────────
// 1. DB 데이터로 키워드 매칭 (web_search 스킵 판단용) - 기존 유지
// ─────────────────────────────────────────────
function hasGoodDBMatch(query: string, candidates: any[]): boolean {
  const keywords = query.toLowerCase().split(/\s+/).filter((k) => k.length > 1);
  const matchCount = candidates.filter((c: any) => {
    const target = [
      c.companyNameKr,
      c.companyNameEn,
      c.solutionSummary,
      c.industrySector,
      c.primaryTech,
      c.productType,
      c.companyName,
      c.userType,
      c.userTypeDetail,
      c.preferredPartners,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return keywords.some((kw) => target.includes(kw));
  });
  return matchCount.length >= 3;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, searchRole } = await req.json();
  const userRole = (session.user as any).role;

  if (userRole === "BUYER" && searchRole !== "SELLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (userRole === "SELLER" && searchRole !== "BUYER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ─────────────────────────────────────────────
  // [신규] 쿼리 언어 감지 — 이후 프롬프트에 주입
  // ─────────────────────────────────────────────
  const detectedLang = detectQueryLanguage(query);
  const langInstruction =
    detectedLang === "ko"
      ? `[LANGUAGE RULE - MANDATORY]
You MUST respond in KOREAN (한국어) only.
All values for "matchReason", "industry", "stage", "tech", "product", "webInfo" MUST be written in Korean.
Do NOT use English in any field value. This is non-negotiable.`
      : `[LANGUAGE RULE - MANDATORY]
You MUST respond in ENGLISH only.
All values for "matchReason", "industry", "stage", "tech", "product", "webInfo" MUST be written in English.
Even if candidate data contains Korean text, translate and write all output values in English.
Do NOT use Korean in any field value. This is non-negotiable.`;

  console.log(`[AI Search] query="${query}" | detectedLang=${detectedLang}`);

  // ① DB 기반 캐시 확인 (7일 유효) - 기존 유지
  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .replace(/[?.!,]/g, "");

  const SEVEN_DAYS_AGO = new Date();
  SEVEN_DAYS_AGO.setDate(SEVEN_DAYS_AGO.getDate() - 7);

  const { data: cachedEntry } = await supabase
    .from('ai_search_cache')
    .select('result_json')
    .eq('query_text', normalizedQuery)
    .eq('search_role', searchRole)
    .gt('created_at', SEVEN_DAYS_AGO.toISOString())
    .maybeSingle();

  if (cachedEntry) {
    console.log(`[AI Search] DB Cache HIT: "${normalizedQuery}"`);
    return NextResponse.json({ ...cachedEntry.result_json, fromCache: true });
  }

  let candidates: any[] = [];

  // 후보군 추출 및 모든 상세 필드 매핑 로직 - 기존 기능 유지
  if (searchRole === "SELLER") {
    const onePagers = await db.onePager.findMany({
      include: {
        user: { select: { companyName: true, role: true } },
      },
      where: {
        user: { role: "SELLER" },
      },
    });
    candidates = onePagers.map((op) => ({
      companyNameKr: op.companyNameKr || op.user?.companyName || "미등록",
      companyNameEn: op.companyNameEn || "",
      productType: op.productType || "미등록",
      solutionSummary: op.solutionSummary || "정보 없음",
      problem: op.problem || "정보 없음",
      solution: op.solution || "정보 없음",
      traction: op.traction || "정보 없음",
      bizModel: op.bizModel || "정보 없음",
      primaryTech: op.primaryTech || "정보 없음",
      industrySector: op.industrySector || "미지정",
      yearFounded: op.yearFounded || "미등록",
      investmentStage: op.investmentStage || "미정",
      monthlyRevenue: op.monthlyRevenue || "정보 없음",
    }));
  } else if (searchRole === "BUYER") {
    const buyers = await db.user.findMany({
      where: { role: "BUYER" },
      select: {
        companyName: true,
        jobTitle: true,
        userType: true,
        userTypeDetail: true,
        preferredPartners: true,
      },
    });
    candidates = buyers;
  }

  if (candidates.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // ② web_search 조건부 스킵 판단 - 기존 유지
  const skipWebSearch = hasGoodDBMatch(query, candidates);
  console.log(`[AI Search] query="${query}" | web_search: ${skipWebSearch ? "SKIP ✅" : "USE 🌐"}`);

  // ③ Anthropic 호출 - 언어 감지값을 system/user 양쪽에 주입 (핵심 수정)
  // [변경점]
  //   - system 프롬프트 상단에 langInstruction 블록을 동적으로 삽입
  //   - user 메시지 하단에도 언어 지시를 반복 삽입하여 모델이 무시하지 못하게 강제
  //   - 기존 JSON 파싱 규칙, web_search 조건부 로직 등 모든 기존 기능 유지
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    ...(skipWebSearch
      ? {}
      : {
          tools: [
            {
              type: "web_search_20250305" as any,
              name: "web_search",
            },
          ],
        }),
    system: `You are a B2B business matching expert.

${langInstruction}

[JSON Parsing Error Prevention Rules]
1. Output ONLY pure valid JSON.
2. If description text contains double quotes ("), you MUST escape them with a backslash (\\").
3. results array must NEVER be empty. Minimum 1 recommendation.
4. matchScore: 1-100. Minimum 10 points.

[Response Format - JSON ONLY]
{"results":[{"companyName":"...","matchScore":85,"matchReason":"...","basicInfo":{"industry":"...","stage":"...","tech":"...","product":"..."},"webInfo":"..."}]}`,
    messages: [
      {
        role: "user",
        content: `Search Query: "${query}"

Candidate List (Total ${candidates.length} cos):
${JSON.stringify(candidates.slice(0, 15), null, 2)}

[Instruction]
- Recommend up to 5 companies.
- Output pure JSON. No markdown, no explanation.
- CRITICAL: ${detectedLang === "ko"
  ? "모든 응답 필드(matchReason, industry, stage, tech, product, webInfo)를 반드시 한국어로 작성하세요."
  : "You MUST write ALL response field values (matchReason, industry, stage, tech, product, webInfo) in English. Translate Korean source data into English."
}`,
      },
    ],
  });

  const fullText = response.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("");

  let parsed: any = null;

  // ─────────────────────────────────────────────
  // 4단계 파싱 전략 - 기존 다단계 파싱 기능 100% 유지
  // ─────────────────────────────────────────────
  try { parsed = JSON.parse(fullText.trim()); } catch (_) {}
  if (!parsed) {
    try {
      const stripped = fullText.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(stripped);
    } catch (_) {}
  }
  if (!parsed) {
    try {
      const startIdx = fullText.lastIndexOf('{"results"');
      if (startIdx !== -1) parsed = JSON.parse(fullText.slice(startIdx));
    } catch (_) {}
  }
  if (!parsed) {
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) { console.error("파싱 최종 실패:", e); }
  }

  if (!parsed || !Array.isArray(parsed.results)) {
    return NextResponse.json({ error: "parsing error", raw: fullText.slice(0, 1000) }, { status: 500 });
  }

  // ✅ 비어있는 경우 Fallback 결과 생성 및 캐시 저장 - 기존 유지
  if (parsed.results.length === 0) {
    const fallbackResults = candidates
      .slice(0, 3)
      .map((c: any, i: number) => ({
        companyName: c.companyNameKr || c.companyName || "알 수 없음",
        matchScore: 40 - i * 5,
        matchReason: `검색 조건 "${query}"과(와) 직접적인 연관 정보를 찾지 못했습니다. DB에 등록된 기업 정보를 기반으로 추천드립니다.`,
        basicInfo: {
          industry: c.industrySector || "미지정",
          stage: c.investmentStage || "미정",
          tech: c.primaryTech || "정보 없음",
          product: c.productType || "정보 없음",
        },
        webInfo: "등록된 정보가 부족하여 웹 검색 결과를 활용하지 못했습니다.",
      }));
    const fallbackResponse = { results: fallbackResults, isFallback: true };

    await supabase.from('ai_search_cache').insert({
      query_text: normalizedQuery,
      search_role: searchRole,
      result_json: fallbackResponse
    });

    return NextResponse.json(fallbackResponse);
  }

  // ④ 성공한 검색 결과 DB 캐시에 저장 후 반환 - 기존 유지
  await supabase.from('ai_search_cache').insert({
    query_text: normalizedQuery,
    search_role: searchRole,
    result_json: parsed
  });

  return NextResponse.json(parsed);
}