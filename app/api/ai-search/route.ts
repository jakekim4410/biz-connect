import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { anthropic } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, searchRole } = await req.json();
  const userRole = (session.user as any).role;

  if (userRole === "BUYER" && searchRole !== "SELLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (userRole === "SELLER" && searchRole !== "BUYER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let candidates: any[] = [];

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

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    tools: [
      {
        type: "web_search_20250305" as any,
        name: "web_search",
      },
    ],
    system: `당신은 B2B 비즈니스 매칭 전문가입니다.
사용자의 검색 쿼리를 분석하여 후보 기업 목록에서 가장 관련성 높은 기업을 추천합니다.

[핵심 규칙 - 반드시 준수]
1. results 배열은 절대 비워두지 마세요. 검색 조건이 모호하거나 데이터가 부족해도 반드시 후보 기업 중 최소 1개 이상을 포함하세요.
2. 검색 쿼리가 특정 회사명이나 사람을 언급하면, 해당 회사가 목록에 있으면 무조건 포함하고 matchReason에 "검색하신 회사입니다"로 표기하세요.
3. 데이터가 "정보 없음"이어도 웹 검색으로 보완하고 결과를 반환하세요.
4. matchScore는 1~100 사이 숫자로, 관련성이 낮아도 최소 30점 이상 부여하세요.

[응답 형식 - JSON만 출력, 다른 텍스트 절대 금지]
{"results":[{"companyName":"회사명","matchScore":85,"matchReason":"추천 이유 3-4문장","basicInfo":{"industry":"산업분야","stage":"투자단계","tech":"핵심기술","product":"주요제품"},"webInfo":"웹 검색 기반 최신 정보 2-3문장"}]}`,
    messages: [
      {
        role: "user",
        content: `검색 조건: "${query}"

후보 기업 목록 (총 ${candidates.length}개):
${JSON.stringify(candidates, null, 2)}

[지시사항]
- 검색 조건과 관련된 기업을 최대 5개 추천하세요.
- 검색 조건에 특정 회사명이 포함된 경우, 해당 회사를 반드시 1순위로 포함하세요.
- 데이터 품질과 관계없이 모든 후보 중 가장 연관성 높은 기업을 선정하세요.
- results가 빈 배열이 되는 것은 허용되지 않습니다. 반드시 1개 이상 포함하세요.
- 순수 JSON만 출력하세요. 설명, 마크다운, 코드블록 없이.`,
      },
    ],
  });

  // text 블록만 수집 (server_tool_use, web_search_tool_result 제외)
  const fullText = response.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("");

  console.log("=== AI 응답 원문 ===");
  console.log(fullText);
  console.log("블록 타입들:", response.content.map((b: any) => b.type));
  console.log("====================");

  let parsed: any = null;

  // 전략 A: 순수 JSON
  try { parsed = JSON.parse(fullText.trim()); } catch (_) {}

  // 전략 B: 코드블록 제거
  if (!parsed) {
    try {
      const stripped = fullText.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(stripped);
    } catch (_) {}
  }

  // 전략 C: {"results" 위치부터 슬라이스
  if (!parsed) {
    try {
      const startIdx = fullText.lastIndexOf('{"results"');
      if (startIdx !== -1) parsed = JSON.parse(fullText.slice(startIdx));
    } catch (_) {}
  }

  // 전략 D: 정규식 fallback
  if (!parsed) {
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("파싱 최종 실패:", e);
    }
  }

  if (!parsed || !Array.isArray(parsed.results)) {
    return NextResponse.json(
      { error: "parsing error", raw: fullText.slice(0, 1000) },
      { status: 500 }
    );
  }

  // ✅ 파싱 성공했지만 results가 비어있는 경우: DB 데이터로 fallback 결과 생성
  if (parsed.results.length === 0) {
    const fallbackResults = candidates.slice(0, 3).map((c: any, i: number) => ({
      companyName: c.companyNameKr || c.companyName || "알 수 없음",
      matchScore: 40 - i * 5,
      matchReason: `검색 조건 "${query}"과(와) 직접적인 연관 정보를 찾지 못했습니다. 현재 등록된 정보가 부족하여 정확한 매칭이 어렵습니다. 해당 기업의 원페이저를 확인해 보세요.`,
      basicInfo: {
        industry: c.industrySector || "미지정",
        stage: c.investmentStage || "미정",
        tech: c.primaryTech || "정보 없음",
        product: c.productType || "정보 없음",
      },
      webInfo: "등록된 정보가 부족하여 웹 검색 결과를 활용하지 못했습니다. 기업 원페이저를 업데이트하면 더 정확한 매칭이 가능합니다.",
    }));
    return NextResponse.json({ results: fallbackResults, isFallback: true });
  }

  return NextResponse.json(parsed);
}