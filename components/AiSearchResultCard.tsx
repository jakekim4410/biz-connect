"use client";

import { Sparkles, FileSearch, AlertCircle } from "lucide-react";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
export interface AiResult {
  companyName: string;
  matchScore: number;
  matchReason: string;
  basicInfo?: {
    industry?: string;
    stage?: string;
    tech?: string;
    product?: string;
  };
  webInfo?: string;
}

interface AiSearchResultCardProps {
  /** AI 검색 결과 배열 */
  results: AiResult[];
  /** 검색어 (결과 없음 메시지에 사용) */
  query: string;
  /** 결과 없을 때 Fallback 여부 */
  isFallback?: boolean;
  /** 에러 메시지 */
  error?: string | null;
  /** DB에 일치하는 셀러가 있을 때 원페이저 모달을 여는 콜백 */
  onViewOnePager?: (companyName: string) => void;
  /** "원페이저 보기" 버튼 텍스트 (기본: "원페이저 보기") */
  onePagerLabel?: string;
  /** 각 결과에서 DB 매칭 여부를 판단하는 함수 (없으면 버튼 미노출) */
  isMatched?: (companyName: string) => boolean;
  /** 언어 설정 (기본: "ko") */
  locale?: string;
}

// ─────────────────────────────────────────────
// 점수에 따른 색상 유틸
// ─────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 80) return { bar: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700" };
  if (score >= 60) return { bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700" };
  return               { bar: "bg-slate-300",    badge: "bg-slate-100 text-slate-600"  };
}

// ─────────────────────────────────────────────
// 평균 점수 계산
// ─────────────────────────────────────────────
function calcAvgScore(results: AiResult[]) {
  if (!results.length) return 0;
  return Math.round(results.reduce((s, r) => s + (r.matchScore ?? 0), 0) / results.length);
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function AiSearchResultCard({
  results,
  query,
  isFallback = false,
  error = null,
  onViewOnePager,
  onePagerLabel = "원페이저 보기",
  isMatched,
  locale = "ko",
}: AiSearchResultCardProps) {
  const avgScore = calcAvgScore(results);

  // ── [1] 결과 헤더 (상태 배너) ──────────────────────
  const headerState = error
    ? "error"
    : results.length === 0
    ? "empty"
    : isFallback
    ? "fallback"
    : "success";

  const headerStyles = {
    error:    "bg-rose-50 border-rose-100",
    empty:    "bg-slate-50 border-slate-200",
    fallback: "bg-amber-50 border-amber-100",
    success:  "bg-indigo-50 border-indigo-100",
  };

  const iconStyles = {
    error:    "text-rose-400",
    empty:    "text-slate-400",
    fallback: "text-amber-500",
    success:  "text-indigo-500",
  };

  const textStyles = {
    error:    "text-rose-700",
    empty:    "text-slate-600",
    fallback: "text-amber-700",
    success:  "text-indigo-700",
  };

  const headerLabel = {
    error:    error ?? "오류가 발생했습니다.",
    empty:    locale === "ko" ? `"${query}" 검색 결과 없음` : `No results for "${query}"`,
    fallback: locale === "ko"
                ? `유사 셀러 ${results.length}개 표시 중 (참고용)`
                : `Showing ${results.length} similar results (for reference)`,
    success:  locale === "ko"
                ? `AI 추천 셀러 ${results.length}개`
                : `${results.length} AI-recommended sellers`,
  };

  return (
    <div className="space-y-4">

      {/* ── 헤더 ── */}
      <div
        className={`rounded-[20px] p-4 flex items-center justify-between border ${headerStyles[headerState]}`}
      >
        <div className="flex items-center gap-3">
          <Sparkles size={16} className={iconStyles[headerState]} />
          <span className={`text-sm font-black ${textStyles[headerState]}`}>
            {headerLabel[headerState]}
          </span>
        </div>

        {results.length > 0 && (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-black ${
              avgScore >= 70
                ? "bg-indigo-100 text-indigo-700"
                : avgScore >= 50
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {locale === "ko" ? `평균 ${avgScore}점` : `Avg. ${avgScore}pt`}
          </span>
        )}
      </div>

      {/* ── 결과 카드 리스트 ── */}
      {results.length > 0 && (
        <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {results.map((result, idx) => {
              const score = result.matchScore ?? 0;
              const scoreColor = getScoreColor(score);
              const matched = isMatched?.(result.companyName) ?? false;

              return (
                <div
                  key={idx}
                  className="p-5 md:p-6 hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="flex items-start gap-4">

                    {/* 순위 번호 */}
                    <div className="w-9 h-9 rounded-[10px] bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">

                      {/* 회사명 + 배지들 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-800 text-base">
                          {result.companyName}
                        </h4>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${scoreColor.badge}`}>
                          {score}{locale === "ko" ? "점" : "pt"}
                        </span>
                        {!matched && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-black rounded-md">
                            {locale === "ko" ? "DB 미등록" : "Not in DB"}
                          </span>
                        )}
                        {isFallback && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-500 text-[9px] font-black rounded-md">
                            {locale === "ko" ? "참고용" : "Reference"}
                          </span>
                        )}
                      </div>

                      {/* 점수 바 */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${scoreColor.bar}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 w-8 text-right">
                          {score}%
                        </span>
                      </div>

                      {/* 산업/단계 태그 */}
                      {result.basicInfo && (
                        <div className="flex flex-wrap gap-1.5">
                          {result.basicInfo.industry && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg">
                              {result.basicInfo.industry}
                            </span>
                          )}
                          {result.basicInfo.stage && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg">
                              {result.basicInfo.stage}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 추천 이유 */}
                      <p className="text-xs text-slate-600 font-bold leading-relaxed flex items-start gap-1.5">
                        <Sparkles
                          size={12}
                          className="shrink-0 mt-0.5 text-indigo-400"
                        />
                        {result.matchReason}
                      </p>

                      {/* 원페이저 보기 버튼 (DB 매칭된 경우만) */}
                      {matched && onViewOnePager && (
                        <button
                          onClick={() => onViewOnePager(result.companyName)}
                          className="mt-1 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-[12px] hover:bg-indigo-700 transition-colors flex items-center gap-1.5 w-fit shadow-md whitespace-nowrap shrink-0"
                        >
                          <FileSearch size={12} />
                          <span className="whitespace-nowrap">{onePagerLabel}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}