"use client"

import { saveOnePager } from "./actions";
import { useState } from "react";
import { 
  Upload, FileCheck, Loader2, ChevronLeft, ChevronDown, Sparkles, 
  Target, Lightbulb, TrendingUp, Briefcase, Mail, Building2, User, AlertCircle, FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 스타트업 씬 대표 카테고리 리스트
const INDUSTRY_CATEGORIES = [
  "인공지능 (AI & Big Data)",
  "핀테크 (Fintech)",
  "바이오/헬스케어 (Bio & Healthcare)",
  "이커머스/물류 (E-commerce & Logistics)",
  "에듀테크 (Edtech)",
  "모빌리티/자율주행 (Mobility & Auto)",
  "프롭테크/부동산 (Proptech)",
  "SaaS/B2B 솔루션 (SaaS & B2B)",
  "ESG/클린테크 (ESG & Cleantech)",
  "로보틱스/딥테크 (Robotics & Deeptech)",
  "콘텐츠/엔터테인먼트 (Content & Entertainment)",
  "기타 (Others)"
];

export default function OnePagerForm({ initialData }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const router = useRouter();

  // 기존 데이터 중 산업 분야(industrySector) 세팅
  const existingIndustry = initialData?.industrySector || "";
  const isExistingCustom = existingIndustry && !INDUSTRY_CATEGORIES.includes(existingIndustry);

  const [selectedIndustry, setSelectedIndustry] = useState(
    isExistingCustom ? "기타 (Others)" : existingIndustry || ""
  );
  const [customIndustry, setCustomIndustry] = useState(
    isExistingCustom ? existingIndustry : ""
  );

  // 파일 선택 시 이벤트 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert("PDF 파일만 업로드 가능합니다. (PDF Only)");
        e.target.value = "";
        setSelectedFileName(null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert("파일 용량은 50MB를 초과할 수 없습니다. (Max 50MB)");
        e.target.value = "";
        setSelectedFileName(null);
        return;
      }
      setSelectedFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await saveOnePager(formData);
    setLoading(false);
    
    if (res.success) {
      alert("✨ 원페이저가 성공적으로 저장되었습니다!");
      router.push("/seller");
    } else {
      alert(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 font-pretendard text-left leading-relaxed">
      
      {/* 1. 통합 헤더 (Sticky Header) */}
      <div className="sticky top-0 z-30 bg-[#f8fafc]/95 backdrop-blur-md pt-6 pb-4 mb-8 border-b border-slate-200/60">
        <div className="flex flex-col gap-5">
          {/* 타이틀 영역 */}
          <div className="flex items-center gap-3">
            <Link href="/seller" className="p-2.5 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 shrink-0 shadow-sm md:shadow-none">
              <ChevronLeft size={20} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                기업 소개 원페이저 관리
              </h1>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-widest italic opacity-70">
                Professional Business One-Pager Editor
              </p>
            </div>
          </div>
          
          {/* 버튼 그룹 */}
          <div className="flex items-center gap-2.5 w-full">
            <Link href="/seller" className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all text-center">
              취소 (Cancel)
            </Link>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
              저장 및 게시 (Save & Publish)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        
        {/* 2. 왼쪽 메인 섹션 (8열) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 2-1. 기업 및 담당자 상세 정보 */}
          <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500"><Building2 size={20} /></div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">기업 및 담당자 정보 (Company & PIC)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 ml-1">회사명 (국문) | Company Name (KR)</label>
                <input name="companyNameKr" defaultValue={initialData?.companyNameKr} placeholder="예: 주식회사 비즈커넥트" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-50 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 ml-1">회사명 (영문) | Company Name (EN)</label>
                <input name="companyNameEn" defaultValue={initialData?.companyNameEn} placeholder="e.g., BizConnect Inc." className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-50 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 ml-1">대표자 성함 | CEO Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input name="ceoName" defaultValue={initialData?.ceoName} placeholder="성함을 입력하세요 (Gildong Hong)" className="w-full bg-slate-50 border-none pl-12 pr-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 ml-1">담당자 성함 (PIC Name)</label>
                  <input name="picName" defaultValue={initialData?.picName} placeholder="성함 (Name)" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 ml-1">담당자 직함 (PIC Title)</label>
                  <input name="picTitle" defaultValue={initialData?.picTitle} placeholder="직함 (Title)" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-50 transition-all" />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <label className="text-[11px] font-bold text-slate-400 ml-1 mb-3 block">제품 및 서비스 유형 | Product Type</label>
              <input name="productType" defaultValue={initialData?.productType} className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-50 transition-all" placeholder="예: K-뷰티 수출 전문 솔루션 (K-Beauty Export Solution)" />
            </div>
          </div>

          {/* 2-2. 솔루션 요약 */}
          <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div> 솔루션 요약 | Solution Summary
            </h3>
            <textarea 
              name="solutionSummary" 
              defaultValue={initialData?.solutionSummary} 
              className="w-full min-h-[120px] bg-slate-50/50 p-6 rounded-3xl text-[14px] leading-relaxed text-slate-600 outline-none focus:bg-white focus:ring-2 ring-indigo-50 transition-all resize-none border border-transparent placeholder:text-slate-300 whitespace-pre-line" 
              placeholder={`회사의 가치를 한 문장으로 정의해 주세요. 바이어가 5초 내에 핵심 가치를 이해할 수 있어야 합니다.\nDefine your value in a single sentence. It should be clear and powerful.`} 
            />
          </div>

          {/* 2-3. 전문 비즈니스 상세 (4단 그리드) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { 
                id: "problem", 
                label: "마켓 문제점 | Market Problem", 
                icon: <Target className="text-rose-500" size={20}/>, 
                guide: `시장의 어떤 비효율성이나 페인포인트를 해결하려 하나요? 수치나 사례를 곁들이세요.\nWhat market pain point are you addressing? Please use data or examples.` 
              },
              { 
                id: "solution", 
                label: "해결 방안 | Our Solution", 
                icon: <Lightbulb className="text-amber-500" size={20}/>, 
                guide: `우리만의 독보적인 해결 방식과 기술적 혁신 요소를 기술하세요. 경쟁사 대비 우위를 강조합니다.\nDescribe your unique solution and technical edge. Highlight your edge over competitors.` 
              },
              { 
                id: "traction", 
                label: "성과 및 지표 | Traction", 
                icon: <TrendingUp className="text-emerald-500" size={20}/>, 
                guide: `현재까지의 매출액, 주요 고객사 등 성과를 정량적으로 보여주세요.\nQuantitatively showcase your revenue and achievements.` 
              },
              { 
                id: "bizModel", 
                label: "비즈니스 모델 | Business Model", 
                icon: <Briefcase className="text-indigo-500" size={20}/>, 
                guide: `수익 창출 방식과 향후 시장 확장 계획을 설명하세요.\nHow do you generate revenue and scale your business?` 
              }
            ].map((section) => (
              <div key={section.id} className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-slate-100 group transition-all">
                <div className="flex items-center gap-2 mb-5 border-b border-slate-50 pb-4">
                   <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:scale-105 transition-transform">{section.icon}</div>
                   <h4 className="text-[13px] font-black text-slate-800 leading-tight">{section.label}</h4>
                </div>
                <textarea 
                  name={section.id} 
                  defaultValue={initialData?.[section.id]} 
                  className="w-full min-h-[180px] text-[13px] leading-relaxed text-slate-500 outline-none resize-none focus:text-slate-900 transition-colors placeholder:text-slate-300 whitespace-pre-line" 
                  placeholder={section.guide}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3. 오른쪽 사이드바 (4열) */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* 다크 카드: 핵심 지표 정보 */}
          <div className="bg-slate-900 text-white rounded-[40px] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <h3 className="text-sm font-black tracking-tight mb-8 border-b border-slate-800 pb-4 flex items-center gap-2 relative z-10">
              <Sparkles size={16} className="text-indigo-400"/>
              핵심 지표 요약 | Quick Info
            </h3>
            
            <div className="space-y-6 relative z-10">
              
              {/* 주요 기술 */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">주요 기술 | Primary Tech</label>
                <input name="primaryTech" defaultValue={initialData?.primaryTech} className="w-full bg-slate-800/50 border-none px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:bg-slate-800 transition-all rounded-2xl placeholder:text-slate-700" placeholder="e.g. AI, Robotics" />
              </div>

              {/* 🚀 산업 분야 드롭다운 + 커스텀 입력 */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">산업 분야 | Industry Sector</label>
                <div className="relative">
                  <select
                    value={selectedIndustry}
                    onChange={(e) => {
                      setSelectedIndustry(e.target.value);
                      if (e.target.value !== "기타 (Others)") {
                        setCustomIndustry(""); 
                      }
                    }}
                    required
                    className="w-full bg-slate-800/50 border-none px-4 py-3 pr-10 text-xs font-bold text-slate-200 outline-none focus:bg-slate-800 transition-all rounded-2xl appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-500">
                      카테고리를 선택해주세요
                    </option>
                    {INDUSTRY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>

                {/* '기타 (Others)' 선택 시만 나타나는 인풋창 */}
                {selectedIndustry === "기타 (Others)" && (
                  <input
                    type="text"
                    required
                    placeholder="직접 입력 (e.g. Space Tech, Web3)"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="w-full mt-2 bg-slate-800/50 border border-indigo-500/30 px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:bg-slate-800 transition-all rounded-2xl animate-in fade-in slide-in-from-top-2 placeholder:text-slate-600"
                  />
                )}
                
                {/* 실제 서버로 넘어가는 데이터 (Hidden) */}
                <input 
                  type="hidden" 
                  name="industrySector" 
                  value={selectedIndustry === "기타 (Others)" ? customIndustry : selectedIndustry} 
                />
              </div>

              {/* 설립 연도 */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">설립 연도 | Year Founded</label>
                <input name="yearFounded" defaultValue={initialData?.yearFounded} className="w-full bg-slate-800/50 border-none px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:bg-slate-800 transition-all rounded-2xl placeholder:text-slate-700" placeholder="YYYY (e.g. 2024)" />
              </div>

              {/* 투자 단계 */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">투자 단계 | Investment Stage</label>
                <input name="investmentStage" defaultValue={initialData?.investmentStage} className="w-full bg-slate-800/50 border-none px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:bg-slate-800 transition-all rounded-2xl placeholder:text-slate-700" placeholder="e.g. Seed / Series A" />
              </div>

              {/* 월 매출 규모 */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">월 매출 규모 | Monthly Revenue</label>
                <input name="monthlyRevenue" defaultValue={initialData?.monthlyRevenue} className="w-full bg-slate-800/50 border-none px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:bg-slate-800 transition-all rounded-2xl placeholder:text-slate-700" placeholder="$ 10,000" />
                <p className="text-[10px] text-indigo-400 font-bold italic ml-1 leading-tight mt-1">* US달러($) 기준 작성 (Write in USD)</p>
              </div>

              {/* 피치덱 업로드 */}
              <div className="pt-6 border-t border-slate-800">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3">피치덱 자료 | Company Deck (PDF)</label>
                <div className="relative group overflow-hidden">
                  <input 
                    type="file" 
                    name="pitchDeckFile" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                  />
                  <div className={`bg-slate-800/80 rounded-3xl p-8 border-2 border-dashed transition-all flex flex-col items-center gap-3 ${selectedFileName ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 group-hover:border-indigo-500 group-hover:bg-slate-800'}`}>
                    {selectedFileName ? (
                      <>
                        <FileText size={24} className="text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-indigo-300 text-center break-all px-2">{selectedFileName}</span>
                        <span className="text-[8px] text-slate-500 uppercase">Selected</span>
                      </>
                    ) : (
                      <>
                        <Upload size={22} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">PDF Upload</span>
                        <p className="text-[9px] text-slate-500 text-center leading-tight whitespace-pre-line">
                          {`50MB 이하 PDF 파일만 가능\n(PDF Only, Max 50MB)`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {initialData?.pitchDeckUrl && !selectedFileName && (
                  <Link href={initialData.pitchDeckUrl} target="_blank" className="mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-[11px] shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-all">
                    <FileCheck size={14}/> 저장된 피치덱 확인 (View Current)
                  </Link>
                )}
              </div>

              {/* 연락처 이메일 */}
              <div className="pt-4">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-2">연락처 이메일 | Contact Email</label>
                <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3 border border-slate-700/50">
                  <Mail size={16} className="text-indigo-400" />
                  <input name="contactEmail" type="email" defaultValue={initialData?.contactEmail} className="bg-transparent text-xs font-bold text-white outline-none w-full" placeholder="official@company.com" />
                </div>
              </div>
            </div>
          </div>
          
          {/* 하단 안내 문구 박스 */}
          <div className="p-6 bg-white/50 backdrop-blur rounded-[32px] border border-slate-200 flex items-start gap-3 shadow-sm">
            <AlertCircle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-slate-500 leading-normal whitespace-pre-line">
              {`작성하신 내용은 바이어 매칭 시 기업을 소개하는 첫인상이 됩니다.\n신중하고 성실하게 작성해 주세요.\n(Your info is the first impression for buyer matching.)`}
            </p>
          </div>
        </aside>

      </div>
    </form>
  );
}