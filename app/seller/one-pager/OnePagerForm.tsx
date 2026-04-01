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
    // ✨ 핵심: 전체 레이아웃을 max-w-[1200px]로 묶고 모바일 여백 최적화
    <form onSubmit={handleSubmit} className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-24 font-pretendard text-left space-y-6 md:space-y-8">
      
      {/* ✨ 변경: 답답했던 Sticky를 제거하고 깔끔한 Island 형태의 헤더 카드로 변경 */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-8 shadow-lg border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <Link href="/seller" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 shrink-0">
            <ChevronLeft size={20} />
          </Link>
<div className="min-w-0 flex-1">
            {/* ✨ 변경: 폰트 크기를 살짝 줄이고, 단어 단위로 끊어지도록 break-keep 추가 */}
            <h1 className="text-lg sm:text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight break-keep">
              기업 소개 원페이저 관리
            </h1>
            <p className="text-[10px] md:text-xs font-black text-slate-400 mt-1 uppercase tracking-widest leading-tight">
              Professional One-Pager Editor
            </p>
          </div>
        </div>
        
        {/* 모바일에서도 버튼 텍스트가 깨지지 않도록 구조 최적화 */}
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto shrink-0">
          <Link href="/seller" className="flex-1 md:flex-none px-4 py-3.5 rounded-[16px] md:rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-black text-xs md:text-sm hover:bg-slate-50 transition-all text-center">
            취소 <span className="font-bold opacity-70 hidden sm:inline">(Cancel)</span>
          </Link>
          <button 
            type="submit" 
            disabled={loading} 
            className="flex-[2] md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-[16px] md:rounded-2xl bg-slate-900 text-white font-black text-xs md:text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
            저장 및 게시 <span className="font-bold opacity-70 hidden sm:inline">(Publish)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
        
        {/* 2. 왼쪽 메인 섹션 (8열) */}
        <div className="xl:col-span-8 space-y-6 md:space-y-8">
          
          {/* 2-1. 기업 및 담당자 상세 정보 */}
          <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100 space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 mb-2 border-b border-slate-50 pb-4">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500"><Building2 size={20} /></div>
              <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">기업 및 담당자 정보 <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest hidden sm:inline-block ml-1">(Company & PIC)</span></h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-2 w-full">
                <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">회사명 (국문) | Company Name</label>
                <input name="companyNameKr" defaultValue={initialData?.companyNameKr} placeholder="예: 주식회사 비즈커넥트" className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 md:p-4 rounded-[16px] md:rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
              </div>
              <div className="space-y-2 w-full">
                <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">회사명 (영문) | English Name</label>
                <input name="companyNameEn" defaultValue={initialData?.companyNameEn} placeholder="e.g., BizConnect Inc." className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 md:p-4 rounded-[16px] md:rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
              </div>
              <div className="space-y-2 w-full sm:col-span-2">
                <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">대표자 성함 | CEO Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input name="ceoName" defaultValue={initialData?.ceoName} placeholder="성함을 입력하세요 (Gildong Hong)" className="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3.5 md:p-4 rounded-[16px] md:rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
                </div>
              </div>
              {/* ✨ 모바일에서 라벨이 너무 길어 깨지는 현상을 방지하기 위해 라벨 이름 단축 */}
              <div className="space-y-2 w-full">
                <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">담당자 이름 (Name)</label>
                <input name="picName" defaultValue={initialData?.picName} placeholder="담당자 성함" className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 md:p-4 rounded-[16px] md:rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
              </div>
              <div className="space-y-2 w-full">
                <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">담당자 직함 (Title)</label>
                <input name="picTitle" defaultValue={initialData?.picTitle} placeholder="담당자 직함" className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 md:p-4 rounded-[16px] md:rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
              </div>
            </div>

            <div className="pt-4 md:pt-6 border-t border-slate-100 mt-6">
              <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">제품 및 서비스 유형 | Product Type</label>
              <input name="productType" defaultValue={initialData?.productType} className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 md:p-4 rounded-[16px] md:rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all" placeholder="예: K-뷰티 수출 전문 솔루션 (K-Beauty Export Solution)" />
            </div>
          </div>

          {/* 2-2. 솔루션 요약 */}
          <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100">
            {/* ✨ 변경: 줄바꿈 시 막대기가 찌그러지지 않도록 아이콘 위치 고정(shrink-0) 및 텍스트 break-keep 처리 */}
            <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-start sm:items-center gap-2">
              <div className="w-1.5 h-4 md:h-5 bg-indigo-500 rounded-full shrink-0 mt-0.5 sm:mt-0"></div> 
              <span className="leading-tight break-keep">솔루션 요약 | Solution Summary</span>
            </h3>
            <textarea 
              name="solutionSummary" 
              defaultValue={initialData?.solutionSummary} 
              className="w-full min-h-[100px] md:min-h-[120px] bg-slate-50 border border-slate-100 p-5 md:p-6 rounded-[20px] md:rounded-3xl text-sm leading-relaxed text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400 font-bold whitespace-pre-line" 
              placeholder={`회사의 가치를 한 문장으로 정의해 주세요. 바이어가 5초 내에 핵심 가치를 이해할 수 있어야 합니다.\nDefine your value in a single sentence.`} 
            />
          </div>

          {/* 2-3. 전문 비즈니스 상세 (4단 그리드) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {[
              { 
                id: "problem", 
                label: "마켓 문제점 | Market Problem", 
                icon: <Target className="text-rose-500" size={18}/>, 
                guide: `시장의 어떤 비효율성이나 페인포인트를 해결하려 하나요? 수치나 사례를 곁들이세요.` 
              },
              { 
                id: "solution", 
                label: "해결 방안 | Our Solution", 
                icon: <Lightbulb className="text-amber-500" size={18}/>, 
                guide: `우리만의 독보적인 해결 방식과 기술적 혁신 요소를 기술하세요.` 
              },
              { 
                id: "traction", 
                label: "성과 및 지표 | Traction", 
                icon: <TrendingUp className="text-emerald-500" size={18}/>, 
                guide: `현재까지의 매출액, 주요 고객사 등 성과를 정량적으로 보여주세요.` 
              },
              { 
                id: "bizModel", 
                label: "비즈니스 모델 | Biz Model", 
                icon: <Briefcase className="text-indigo-500" size={18}/>, 
                guide: `수익 창출 방식과 향후 시장 확장 계획을 설명하세요.` 
              }
            ].map((section) => (
              <div key={section.id} className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-slate-100 group transition-all hover:border-indigo-100 hover:shadow-md">
                <div className="flex items-center gap-2.5 mb-4 border-b border-slate-50 pb-3">
                   <div className="p-2.5 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform border border-slate-100">{section.icon}</div>
                   <h4 className="text-xs md:text-sm font-black text-slate-800 leading-tight">{section.label}</h4>
                </div>
                <textarea 
                  name={section.id} 
                  defaultValue={initialData?.[section.id]} 
                  className="w-full min-h-[140px] md:min-h-[160px] text-xs md:text-sm font-medium leading-relaxed text-slate-600 outline-none resize-none focus:text-slate-900 transition-colors placeholder:text-slate-300 whitespace-pre-line bg-transparent" 
                  placeholder={section.guide}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3. 오른쪽 사이드바 (4열) */}
        <aside className="xl:col-span-4 space-y-6 md:space-y-8">
          
          {/* 다크 카드: 핵심 지표 정보 */}
          <div className="bg-slate-900 text-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-xl relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <h3 className="text-xs md:text-sm font-black tracking-tight mb-6 md:mb-8 border-b border-slate-800 pb-4 flex items-center gap-2 relative z-10">
              <Sparkles size={16} className="text-indigo-400"/>
              핵심 지표 요약 | Quick Info
            </h3>
            
            <div className="space-y-5 md:space-y-6 relative z-10">
              
              {/* 주요 기술 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">주요 기술 | Primary Tech</label>
                <input name="primaryTech" defaultValue={initialData?.primaryTech} className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 px-4 py-3.5 text-xs font-bold text-white outline-none transition-all rounded-2xl placeholder:text-slate-600" placeholder="e.g. AI, Robotics" />
              </div>

              {/* 산업 분야 드롭다운 + 커스텀 입력 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">산업 분야 | Industry Sector</label>
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
                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 px-4 py-3.5 pr-10 text-xs font-bold text-white outline-none transition-all rounded-2xl appearance-none cursor-pointer"
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

                {selectedIndustry === "기타 (Others)" && (
                  <input
                    type="text"
                    required
                    placeholder="직접 입력 (e.g. Space Tech)"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="w-full mt-2 bg-slate-800/80 border border-indigo-500/50 px-4 py-3.5 text-xs font-bold text-white outline-none transition-all rounded-2xl animate-in fade-in slide-in-from-top-2 placeholder:text-slate-600"
                  />
                )}
                <input type="hidden" name="industrySector" value={selectedIndustry === "기타 (Others)" ? customIndustry : selectedIndustry} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 설립 연도 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">설립 연도 | Year</label>
                  <input name="yearFounded" defaultValue={initialData?.yearFounded} className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 px-4 py-3.5 text-xs font-bold text-white outline-none transition-all rounded-2xl placeholder:text-slate-600" placeholder="e.g. 2024" />
                </div>

                {/* 투자 단계 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">투자 단계 | Stage</label>
                  <input name="investmentStage" defaultValue={initialData?.investmentStage} className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 px-4 py-3.5 text-xs font-bold text-white outline-none transition-all rounded-2xl placeholder:text-slate-600" placeholder="e.g. Seed" />
                </div>
              </div>

              {/* 월 매출 규모 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">월 매출 규모 | Monthly Rev.</label>
                <input name="monthlyRevenue" defaultValue={initialData?.monthlyRevenue} className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 px-4 py-3.5 text-xs font-bold text-white outline-none transition-all rounded-2xl placeholder:text-slate-600" placeholder="$ 10,000" />
                <p className="text-[9px] md:text-[10px] text-indigo-400 font-bold ml-1 mt-1.5">* US달러($) 기준 (USD Only)</p>
              </div>

              {/* 피치덱 업로드 */}
              <div className="pt-6 border-t border-slate-800">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">피치덱 자료 | Company Deck</label>
                <div className="relative group overflow-hidden">
                  <input 
                    type="file" 
                    name="pitchDeckFile" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full" 
                  />
                  <div className={`bg-slate-800/50 rounded-3xl p-6 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${selectedFileName ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 group-hover:border-indigo-400 group-hover:bg-slate-800'}`}>
                    {selectedFileName ? (
                      <>
                        <FileText size={24} className="text-indigo-400 animate-pulse" />
                        <span className="text-[11px] md:text-xs font-bold text-indigo-300 text-center break-all px-2">{selectedFileName}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Selected</span>
                      </>
                    ) : (
                      <>
                        <Upload size={22} className="text-slate-400" />
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-300 uppercase">PDF Upload</span>
                        <p className="text-[9px] md:text-[10px] text-slate-500 text-center leading-tight whitespace-pre-line mt-1">
                          {`50MB 이하 PDF 파일만 가능\n(Max 50MB)`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {initialData?.pitchDeckUrl && !selectedFileName && (
                  <Link href={initialData.pitchDeckUrl} target="_blank" className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-500 transition-all border border-indigo-500">
                    <FileCheck size={14}/> 저장된 파일 보기 (View Current)
                  </Link>
                )}
              </div>

              {/* 연락처 이메일 */}
              <div className="pt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">연락처 이메일 | Contact Email</label>
                <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center gap-3 border border-slate-700">
                  <Mail size={16} className="text-indigo-400 shrink-0" />
                  <input name="contactEmail" type="email" defaultValue={initialData?.contactEmail} className="bg-transparent text-xs font-bold text-white outline-none w-full min-w-0" placeholder="official@company.com" />
                </div>
              </div>
            </div>
          </div>
          
          {/* 하단 안내 문구 박스 */}
          <div className="p-5 md:p-6 bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 flex items-start gap-3 shadow-sm w-full">
            <AlertCircle size={18} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed break-keep">
              작성하신 내용은 바이어 매칭 시 기업을 소개하는 첫인상이 됩니다. 신중하고 성실하게 작성해 주세요. <br className="hidden sm:block"/>(Your info is the first impression for buyer matching.)
            </p>
          </div>
        </aside>

      </div>
    </form>
  );
}