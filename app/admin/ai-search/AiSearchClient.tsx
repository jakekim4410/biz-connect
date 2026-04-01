"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Sparkles, Search, Clock, AlertCircle, Building2,
  Globe, Info, TrendingUp, Download, FileSpreadsheet,
  BarChart2, X, FileText, History, ArrowLeft
} from "lucide-react";
import Link from "next/link";

// ─── 타입 ──────────────────────────────────────────────────────────────────
interface BasicInfo {
  industry?: string;
  stage?: string;
  tech?: string;
  product?: string;
}
interface SearchResultItem {
  companyName: string;
  matchScore: number;
  matchReason: string;
  webInfo?: string;
  basicInfo?: BasicInfo;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  pitchDeckUrl?: string;
  solutionSummary?: string;
  problem?: string;
  solution?: string;
  traction?: string;
  bizModel?: string;
}
interface SearchSession {
  query: string;
  timestamp: string;
  buyerResults: SearchResultItem[];
  sellerResults: SearchResultItem[];
  isFallback: boolean;
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────
const getScoreStyle = (score: number) => {
  if (score >= 80) return { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "높음" };
  if (score >= 60) return { bar: "bg-amber-400",   badge: "bg-amber-100 text-amber-700",    label: "보통" };
  return              { bar: "bg-slate-300",        badge: "bg-slate-100 text-slate-500",    label: "낮음" };
};
const avgScore = (arr: SearchResultItem[]) =>
  arr.length ? Math.round(arr.reduce((s, r) => s + (r.matchScore ?? 0), 0) / arr.length) : 0;

// ─── 메인 ──────────────────────────────────────────────────────────────────
export default function AiSearchClient() {
  const [query, setQuery]                 = useState("");
  const [buyerResults, setBuyerResults]   = useState<SearchResultItem[]>([]);
  const [sellerResults, setSellerResults] = useState<SearchResultItem[]>([]);
  const [summary, setSummary]             = useState("");
  const [keywords, setKeywords]           = useState<string[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [searched, setSearched]           = useState(false);
  const [isFallback, setIsFallback]       = useState(false);
  const [activeDetail, setActiveDetail]   = useState<SearchResultItem | null>(null);
  const [history, setHistory]             = useState<SearchSession[]>([]);
  const [showHistory, setShowHistory]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── 검색 ─────────────────────────────────────────────────────────────────
  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    inputRef.current?.blur(); // 모바일 키보드 닫기

    setIsLoading(true);
    setBuyerResults([]); setSellerResults([]);
    setSummary(""); setKeywords([]);
    setError(null); setIsFallback(false); setSearched(true);

    try {
      const [buyerRes, sellerRes] = await Promise.all([
        fetch("/api/ai-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, searchRole: "BUYER" }) }),
        fetch("/api/ai-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, searchRole: "SELLER" }) }),
      ]);
      const buyerData  = await buyerRes.json();
      const sellerData = await sellerRes.json();
      if (!buyerRes.ok && !sellerRes.ok) { setError("검색 중 오류가 발생했습니다."); return; }

      const buyers:  SearchResultItem[] = buyerData.results  || [];
      const sellers: SearchResultItem[] = sellerData.results || [];
      const fb = buyerData.isFallback || sellerData.isFallback || false;
      setBuyerResults(buyers); setSellerResults(sellers); setIsFallback(fb);

      if (buyerData.summary) {
        setSummary(buyerData.summary);
        setKeywords(buyerData.keywords || []);
      } else {
        const topB = buyers[0]?.companyName  || "-";
        const topS = sellers[0]?.companyName || "-";
        setSummary(
          buyers.length + sellers.length > 0
            ? `"${q}" 검색 결과 바이어 ${buyers.length}개사, 셀러 ${sellers.length}개사가 매칭되었습니다. 가장 관련도 높은 바이어는 ${topB}(${buyers[0]?.matchScore ?? 0}점), 셀러는 ${topS}(${sellers[0]?.matchScore ?? 0}점)입니다. 평균 매칭도는 바이어 ${avgScore(buyers)}%, 셀러 ${avgScore(sellers)}%입니다.`
            : `"${q}"에 해당하는 매칭 결과가 없습니다. 검색어를 바꿔보세요.`
        );
      }
      setHistory(prev => [
        { query: q, timestamp: new Date().toLocaleTimeString("ko-KR"), buyerResults: buyers, sellerResults: sellers, isFallback: fb },
        ...prev.slice(0, 9),
      ]);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── 엑셀 ─────────────────────────────────────────────────────────────────
  const downloadExcel = () => {
    if (!buyerResults.length && !sellerResults.length) return;
    const wb = XLSX.utils.book_new();
    const mapRow = (r: SearchResultItem, role: string) => ({
      "계정 유형": role, "관련도 점수": r.matchScore, "회사명": r.companyName,
      "업종": r.basicInfo?.industry || "-", "투자·단계": r.basicInfo?.stage || "-",
      "제품·기술": r.basicInfo?.product || r.basicInfo?.tech || "-",
      "이메일": r.email || "-", "연락처": r.phone || "-",
      "웹사이트": r.websiteUrl || "-", "피치덱": r.pitchDeckUrl || "-",
      "AI 분석 이유": r.matchReason, "웹 참고 정보": r.webInfo || "-",
    });
    if (buyerResults.length)  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buyerResults.map(r => mapRow(r, "BUYER"))),  "바이어_VC");
    if (sellerResults.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sellerResults.map(r => mapRow(r, "SELLER"))), "셀러_스타트업");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      "검색어": query, "검색 일시": new Date().toLocaleString("ko-KR"),
      "AI 종합 분석": summary, "핵심 키워드": keywords.join(", "),
      "바이어 결과 수": buyerResults.length, "바이어 평균 관련도": avgScore(buyerResults) + "%",
      "셀러 결과 수":  sellerResults.length, "셀러 평균 관련도":  avgScore(sellerResults) + "%",
    }]), "검색 요약");
    XLSX.writeFile(wb, `AI검색_${query}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const hasResults = buyerResults.length > 0 || sellerResults.length > 0;

  // ── 결과 카드 ─────────────────────────────────────────────────────────────
  const ResultCard = ({ item, rank, role }: { item: SearchResultItem; rank: number; role: "BUYER" | "SELLER" }) => {
    const sc = getScoreStyle(item.matchScore ?? 0);
    const isBuyer = role === "BUYER";
    return (
      <div
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
        onClick={() => setActiveDetail(item)}
      >
        <div className={`h-1 w-full bg-slate-100`}>
          <div className={`h-full ${sc.bar}`} style={{ width: `${item.matchScore}%` }} />
        </div>
        <div className="p-4">
          {/* 회사명 + 점수 — min-w-0 필수로 flex 자식 넘침 방지 */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 text-white ${isBuyer ? "bg-indigo-600" : "bg-emerald-600"}`}>
                {rank}
              </span>
              {/* word-break: keep-all + overflow-wrap: anywhere 조합으로 한·영 모두 처리 */}
              <p className="font-black text-slate-900 text-sm leading-snug min-w-0" style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {item.companyName}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-0.5 pl-1">
              <span className="text-base font-black text-slate-800 tabular-nums">{item.matchScore}%</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap ${sc.badge}`}>{sc.label}</span>
            </div>
          </div>

          {/* 태그 — max-w truncate 로 컨테이너 이탈 방지 */}
          {item.basicInfo && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {[item.basicInfo.industry, item.basicInfo.stage, item.basicInfo.tech, item.basicInfo.product]
                .filter(v => v && v !== "미지정" && v !== "미정" && v !== "정보 없음" && v !== "미등록")
                .slice(0, 3)
                .map((v, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-md max-w-[130px] truncate">{v}</span>
                ))}
            </div>
          )}

          {/* AI 이유 — 3줄 clamp + 한·영 줄바꿈 */}
          <div className={`rounded-xl p-2.5 border text-[11px] leading-relaxed line-clamp-3 ${isBuyer ? "bg-indigo-50/70 border-indigo-50 text-indigo-900" : "bg-emerald-50/70 border-emerald-50 text-emerald-900"}`}
            style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}
          >
            <Sparkles size={9} className={`inline mr-1 ${isBuyer ? "text-indigo-400" : "text-emerald-400"}`} />
            {item.matchReason}
          </div>

          {/* 웹 정보 — 짧고 유의미한 경우만 */}
          {item.webInfo && item.webInfo.length < 100 && !item.webInfo.includes("부족") && (
            <p className="mt-2 text-[10px] text-slate-400 flex items-start gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg"
              style={{ overflowWrap: "anywhere" }}
            >
              <Globe size={9} className="shrink-0 mt-0.5" />{item.webInfo}
            </p>
          )}
        </div>
      </div>
    );
  };

  // ── 컬럼 헤더 ─────────────────────────────────────────────────────────────
  const ColumnHeader = ({ role, results }: { role: "BUYER" | "SELLER"; results: SearchResultItem[] }) => {
    const isBuyer = role === "BUYER";
    const avg = avgScore(results);
    return (
      <div className={`flex items-center justify-between mb-3 px-4 py-3 rounded-2xl border ${isBuyer ? "bg-indigo-50 border-indigo-100" : "bg-emerald-50 border-emerald-100"}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isBuyer ? "bg-indigo-600" : "bg-emerald-600"} text-white`}>
            {isBuyer ? <TrendingUp size={14} /> : <Building2 size={14} />}
          </div>
          <div>
            <p className={`text-sm font-black leading-none ${isBuyer ? "text-indigo-700" : "text-emerald-700"}`}>
              {isBuyer ? "바이어 / VC" : "셀러 / 스타트업"}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{results.length}개 결과</p>
          </div>
        </div>
        {results.length > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black text-slate-400 uppercase">평균 매칭도</p>
            <p className={`text-lg font-black tabular-nums ${avg >= 70 ? "text-emerald-600" : avg >= 50 ? "text-amber-500" : "text-slate-500"}`}>{avg}%</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 전역 스타일 */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* iOS input 자동 줌 방지 — font-size 16px 이상 유지 */
        input, select, textarea { font-size: max(16px, 1em); }
        /* 터치 하이라이트 제거 */
        * { -webkit-tap-highlight-color: transparent; }
        /* 스크롤바 숨김 */
        .hide-sb::-webkit-scrollbar { display: none; }
        .hide-sb { -ms-overflow-style: none; scrollbar-width: none; }
        /* iOS safe area */
        .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
        /* 최소 터치 타겟 */
        .tt { min-height: 44px; min-width: 44px; }
      `}} />

      <div className="min-h-screen bg-[#f4f7fa] font-pretendard text-left" style={{ WebkitFontSmoothing: "antialiased" }}>

        {/* ── 헤더 ────────────────────────────────────────────── */}
        <header className="bg-white/95 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-100 shadow-sm">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-2">

            {/* 왼쪽 — min-w-0 으로 flex 자식 넘침 방지 */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link href="/admin"
                className="tt p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0 flex items-center justify-center">
                <ArrowLeft size={16} />
              </Link>
              <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <Sparkles size={15} />
              </div>
              <div className="min-w-0">
                {/* 좁은 화면에서 타이틀 잘림 방지 */}
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none truncate">AI 파트너 통합 검색</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 hidden sm:block">Admin — AI Smart Search</p>
              </div>
            </div>

            {/* 오른쪽 버튼 그룹 */}
            <div className="flex items-center gap-1.5 shrink-0">
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="tt flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[11px] font-black text-slate-600 transition-colors"
                >
                  <History size={13} />
                  <span className="hidden sm:inline">최근 검색</span>
                  <span className="w-4 h-4 bg-slate-700 text-white rounded-full text-[9px] flex items-center justify-center">{history.length}</span>
                </button>
              )}
              {hasResults && (
                <button
                  onClick={downloadExcel}
                  className="tt flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-[11px] font-black shadow-md hover:bg-indigo-600 transition-colors"
                >
                  <FileSpreadsheet size={13} />
                  <span className="hidden sm:inline">엑셀 저장</span>
                  <span className="sm:hidden">저장</span>
                </button>
              )}
            </div>
          </div>

          {/* 히스토리 드롭다운 */}
          {showHistory && history.length > 0 && (
            <div className="border-t border-slate-100 bg-white px-3 sm:px-6 py-2.5 flex gap-2 overflow-x-auto hide-sb">
              {history.map((h, i) => (
                <button key={i}
                  onClick={() => { setQuery(h.query); handleSearch(h.query); setShowHistory(false); }}
                  className="tt flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors shrink-0"
                >
                  <Clock size={10} />
                  <span className="max-w-[100px] truncate">{h.query}</span>
                  <span className="text-[9px] text-slate-400 shrink-0">{h.timestamp}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* ── 본문 ────────────────────────────────────────────── */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 md:px-8 py-4 sm:py-6 md:py-10 space-y-4 sm:space-y-6">

          {/* 검색창 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="예: AI 헬스케어, 시리즈A SaaS..."
                  // font-size 16px 유지 → iOS 자동 줌 방지
                  style={{ fontSize: "16px" }}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-indigo-100 rounded-xl font-bold outline-none transition-all placeholder:text-slate-300 tt"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !query.trim()}
                className="tt shrink-0 px-4 sm:px-6 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg"
                style={{ fontSize: "14px" }}
              >
                {isLoading ? <Clock className="animate-spin" size={15} /> : <Sparkles size={15} />}
                <span className="hidden sm:inline">{isLoading ? "분석 중..." : "통합 검색"}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-bold mt-2.5" style={{ wordBreak: "keep-all" }}>
              💡 바이어·셀러 구분 없이 자유롭게 입력하세요.
            </p>
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4 border border-slate-100 shadow-sm">
              <div className="relative">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                  <Sparkles size={22} className="text-slate-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-700">바이어·셀러 동시 분석 중...</p>
                <p className="text-xs text-slate-400 font-bold mt-1">DB + 웹 검색을 병렬 처리 중이에요</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {["바이어 DB", "셀러 DB", "웹 검색", "매칭 스코어"].map((step, i) => (
                  <span key={step} className="px-2.5 py-1 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full animate-pulse border border-slate-100"
                    style={{ animationDelay: `${i * 0.2}s` }}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 에러 */}
          {!isLoading && error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-black text-rose-700 text-sm">검색 오류</p>
                <p className="text-xs text-rose-500 mt-1 font-bold" style={{ wordBreak: "keep-all" }}>{error}</p>
                <button onClick={() => handleSearch()} className="tt mt-2.5 px-4 py-2 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-colors">
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* 결과 */}
          {!isLoading && searched && !error && (
            <div className="space-y-4 sm:space-y-5">

              {/* [1] AI 종합 분석 요약 */}
              <div className="bg-slate-900 text-white rounded-2xl sm:rounded-[26px] p-5 sm:p-7 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-bl-[70px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-500/10 rounded-tr-[40px] pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shrink-0">
                      <BarChart2 size={15} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-black text-white text-sm sm:text-base leading-none">AI 종합 분석 결과</h2>
                      {/* truncate 로 긴 검색어 헤더 이탈 방지 */}
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                        SEARCH SUMMARY — "{query}"
                      </p>
                    </div>
                  </div>

                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {keywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white/10 text-slate-300 rounded-full text-[10px] font-black border border-white/10">#{kw}</span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium mb-5"
                    style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>
                    {summary}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "바이어 / VC",     results: buyerResults,  color: "bg-indigo-500",  textColor: "text-indigo-400",  letter: "B" },
                      { label: "셀러 / 스타트업", results: sellerResults, color: "bg-emerald-500", textColor: "text-emerald-400", letter: "S" },
                    ].map((col) => (
                      <div key={col.letter} className="bg-white/[0.07] rounded-xl p-3 sm:p-4 border border-white/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`w-5 h-5 rounded-md ${col.color} flex items-center justify-center text-[9px] font-black text-white shrink-0`}>{col.letter}</span>
                          <span className="text-[10px] font-black text-slate-400 leading-none" style={{ wordBreak: "keep-all" }}>{col.label}</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-white tabular-nums">
                          {col.results.length}<span className="text-xs text-slate-400 ml-1">개</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          평균 관련도 <span className={col.textColor}>{avgScore(col.results)}%</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* [2] 다운로드 배너 */}
              {hasResults && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-sm">검색 결과 내보내기</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5" style={{ wordBreak: "keep-all" }}>
                        바이어/셀러 목록 + AI 분석 요약 · Excel (.xlsx)
                      </p>
                    </div>
                  </div>
                  <button onClick={downloadExcel}
                    className="tt w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 transition-colors">
                    <Download size={13} /> 엑셀 다운로드 (.xlsx)
                  </button>
                </div>
              )}

              {/* fallback 경고 */}
              {isFallback && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-600" style={{ wordBreak: "keep-all" }}>
                    일부 결과는 원페이저 정보가 부족해 정확도가 낮을 수 있습니다.
                  </p>
                </div>
              )}

              {/* [3] 결과 리스트 — 모바일 탭 / PC 2컬럼 */}
              <ResultColumns
                buyerResults={buyerResults}
                sellerResults={sellerResults}
                ResultCard={ResultCard}
                ColumnHeader={ColumnHeader}
              />
            </div>
          )}
        </div>
      </div>

      {/* 상세 모달 */}
      {activeDetail && <DetailModal item={activeDetail} onClose={() => setActiveDetail(null)} />}
    </>
  );
}

// ── 모바일 탭 / PC 2컬럼 ─────────────────────────────────────────────────
function ResultColumns({ buyerResults, sellerResults, ResultCard, ColumnHeader }: {
  buyerResults: SearchResultItem[];
  sellerResults: SearchResultItem[];
  ResultCard: any;
  ColumnHeader: any;
}) {
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");
  const cols = [
    { key: "buyer" as const, role: "BUYER" as const, results: buyerResults, label: "바이어 / VC",    Icon: TrendingUp, activeCls: "bg-indigo-600" },
    { key: "seller" as const, role: "SELLER" as const, results: sellerResults, label: "셀러 / 스타트업", Icon: Building2,  activeCls: "bg-emerald-600" },
  ];
  const Empty = ({ label }: { label: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
      <Search size={22} className="mx-auto text-slate-200 mb-2" />
      <p className="text-sm font-bold text-slate-400">{label}</p>
    </div>
  );

  return (
    <>
      {/* 모바일(lg 미만) — 탭 UI */}
      <div className="lg:hidden">
        <div className="flex bg-white rounded-2xl border border-slate-100 p-1 mb-4 shadow-sm">
          {cols.map((c) => (
            <button key={c.key} onClick={() => setTab(c.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                tab === c.key ? `${c.activeCls} text-white shadow-md` : "text-slate-400"
              }`}
              style={{ minHeight: "44px" }}
            >
              <c.Icon size={13} />
              <span style={{ wordBreak: "keep-all" }}>{c.label}</span>
              <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${tab === c.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {c.results.length}
              </span>
            </button>
          ))}
        </div>
        {cols.filter(c => c.key === tab).map(c => (
          <div key={c.key}>
            <ColumnHeader role={c.role} results={c.results} />
            {c.results.length === 0
              ? <Empty label={`관련 ${c.label} 없음`} />
              : <div className="space-y-3">{c.results.map((r: SearchResultItem, i: number) => <ResultCard key={i} item={r} rank={i + 1} role={c.role} />)}</div>
            }
          </div>
        ))}
      </div>

      {/* PC(lg+) — 2컬럼 */}
      <div className="hidden lg:flex gap-6">
        {cols.map((c, ci) => (
          <div key={c.key} className="flex-1 min-w-0">
            {ci === 1 && <div className="hidden" />}
            <ColumnHeader role={c.role} results={c.results} />
            {c.results.length === 0
              ? <Empty label={`관련 ${c.label} 없음`} />
              : <div className="space-y-3">{c.results.map((r: SearchResultItem, i: number) => <ResultCard key={i} item={r} rank={i + 1} role={c.role} />)}</div>
            }
          </div>
        ))}
      </div>
    </>
  );
}

// ── 상세 모달 ──────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }: { item: SearchResultItem; onClose: () => void }) {
  const sc = getScoreStyle(item.matchScore);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-slate-900/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-xl overflow-y-auto rounded-t-[28px] sm:rounded-[24px] shadow-2xl"
        style={{ maxHeight: "88dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
          <div className="min-w-0 flex-1 pr-3">
            <p className="font-black text-slate-900 text-sm leading-snug"
              style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}>
              {item.companyName}
            </p>
            {item.basicInfo?.industry && (
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{item.basicInfo.industry}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0 flex items-center justify-center" style={{ minWidth: "44px", minHeight: "44px" }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3.5" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          {/* 점수 */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase">관련도 점수</p>
              <p className="text-3xl font-black text-slate-900 tabular-nums">{item.matchScore}%</p>
            </div>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full ${sc.bar}`} style={{ width: `${item.matchScore}%` }} />
            </div>
          </div>

          {/* 태그 */}
          {item.basicInfo && (
            <div className="flex flex-wrap gap-1.5">
              {[item.basicInfo.industry, item.basicInfo.stage, item.basicInfo.tech, item.basicInfo.product]
                .filter(v => v && v !== "미지정" && v !== "미정" && v !== "정보 없음" && v !== "미등록")
                .map((v, i) => (
                  <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[11px] font-black rounded-lg border border-indigo-100 max-w-[160px] truncate">{v}</span>
                ))}
            </div>
          )}

          {/* AI 이유 */}
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase mb-2 flex items-center gap-1.5">
              <Sparkles size={10} /> AI 분석 이유
            </p>
            <p className="text-sm font-medium text-slate-700 leading-relaxed"
              style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}>
              {item.matchReason}
            </p>
          </div>

          {/* 원페이저 섹션 */}
          {[
            { label: "솔루션 요약",           value: item.solutionSummary },
            { label: "문제 (Problem)",         value: item.problem },
            { label: "해결 방안 (Solution)",   value: item.solution },
            { label: "성과 (Traction)",        value: item.traction },
            { label: "비즈니스 모델",           value: item.bizModel },
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">{f.label}</p>
              <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-line"
                style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {f.value}
              </p>
            </div>
          ))}

          {/* 웹 정보 */}
          {item.webInfo && !item.webInfo.includes("부족") && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                <Globe size={10} /> 웹 참고 정보
              </p>
              <p className="text-xs font-medium text-slate-600 leading-relaxed"
                style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {item.webInfo}
              </p>
            </div>
          )}

          {/* 링크 버튼 */}
          <div className="flex gap-2 pt-1">
            {item.websiteUrl && (
              <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 text-white py-3 rounded-2xl text-xs font-black hover:bg-indigo-600 transition-colors"
                style={{ minHeight: "44px" }}>
                <Globe size={13} /> 웹사이트
              </a>
            )}
            {item.pitchDeckUrl && (
              <a href={item.pitchDeckUrl} target="_blank" rel="noopener noreferrer"
                className="flex-[2] flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-3 rounded-2xl text-xs font-black hover:bg-indigo-700 transition-colors"
                style={{ minHeight: "44px" }}>
                <FileText size={13} /> Pitch Deck 보기
              </a>
            )}
            {!item.websiteUrl && !item.pitchDeckUrl && item.email && (
              <div className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 py-3 rounded-2xl text-xs font-black border border-slate-200 min-w-0"
                style={{ minHeight: "44px" }}>
                <Info size={13} className="shrink-0" />
                <span className="truncate">{item.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}