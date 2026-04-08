"use client"

import { saveOnePager } from "./actions";
import { useState, useRef, useEffect } from "react";
import { 
  Upload, FileCheck, Loader2, ChevronLeft, ChevronDown, Sparkles, 
  Target, Lightbulb, TrendingUp, Briefcase, Mail, Building2, AlertCircle, FileText,
  Check
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// ─── 산업 카테고리: 한국어 / 영어 분리 ───
const INDUSTRY_CATEGORIES_KO = [
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
  "기타 (Others)",
];

const INDUSTRY_CATEGORIES_EN = [
  "AI & Big Data",
  "Fintech",
  "Bio & Healthcare",
  "E-commerce & Logistics",
  "Edtech",
  "Mobility & Autonomous Driving",
  "Proptech & Real Estate",
  "SaaS & B2B Solutions",
  "ESG & Cleantech",
  "Robotics & Deeptech",
  "Content & Entertainment",
  "Others",
];

// ─── 원페이저 전용 번역 텍스트 ───
const OP_TEXT = {
  ko: {
    pageTitle: "기업 소개 원페이저 관리",
    pageSubtitle: "Professional One-Pager Editor",
    cancel: "취소",
    cancelSub: "(Cancel)",
    save: "저장 및 게시",
    saveSub: "(Publish)",
    companyInfoTitle: "기업 및 담당자 정보",
    companyInfoSub: "(Company & PIC)",
    
    // 회사명
    companyNameKr: "회사명 (국문) | Company Name",
    companyNameKrPlaceholder: "예: 주식회사 비즈커넥트",
    companyNameEn: "회사명 (영문) | English Name",
    companyNameEnPlaceholder: "e.g., BizConnect Inc.",
    
    // 대표자
    ceoName: "대표자 성함 (국문) | CEO Name",
    ceoNamePlaceholder: "예: 홍길동",
    ceoNameEn: "대표자 성함 (영문) | CEO Name (English)",
    ceoNameEnPlaceholder: "e.g. Gildong Hong",
    
    // 담당자
    picName: "담당자 이름 (국문) | PIC Name",
    picNamePlaceholder: "예: 김철수",
    picNameEn: "담당자 이름 (영문) | PIC Name (English)",
    picNameEnPlaceholder: "e.g. Chulsoo Kim",
    picTitle: "담당자 직함 | Title",
    picTitlePlaceholder: "예: 팀장 (Manager)",
    picTitleEn: "담당자 직함 (영문) | Title (English)",
    picTitleEnPlaceholder: "e.g. Team Lead, Director",

    productType: "제품 및 서비스 유형 | Product Type",
    productTypePlaceholder: "예: K-뷰티 수출 전문 솔루션 (K-Beauty Export Solution)",
    solutionSummary: "솔루션 요약 | Solution Summary",
    solutionSummaryPlaceholder: "회사의 가치를 한 문장으로 정의해 주세요. 바이어가 5초 내에 핵심 가치를 이해할 수 있어야 합니다.\nDefine your value in a single sentence.",
    problem: "마켓 문제점 | Market Problem",
    problemGuide: "시장의 어떤 비효율성이나 페인포인트를 해결하려 하나요? 수치나 사례를 곁들이세요.",
    solution: "해결 방안 | Our Solution",
    solutionGuide: "우리만의 독보적인 해결 방식과 기술적 혁신 요소를 기술하세요.",
    traction: "성과 및 지표 | Traction",
    tractionGuide: "현재까지의 매출액, 주요 고객사 등 성과를 정량적으로 보여주세요.",
    bizModel: "비즈니스 모델 | Biz Model",
    bizModelGuide: "수익 창출 방식과 향후 시장 확장 계획을 설명하세요.",
    quickInfo: "핵심 지표 요약 | Quick Info",
    primaryTech: "주요 기술 | Primary Tech",
    primaryTechPlaceholder: "e.g. AI, Robotics",
    industrySector: "산업 분야 | Industry Sector",
    industryPlaceholder: "카테고리를 선택해주세요",
    industryCustomPlaceholder: "직접 입력 (e.g. Space Tech)",
    yearFounded: "설립 연도 | Year",
    yearFoundedPlaceholder: "e.g. 2024",
    investmentStage: "투자 단계 | Stage",
    investmentStagePlaceholder: "e.g. Seed",
    monthlyRevenue: "월 매출 규모 | Monthly Rev.",
    monthlyRevenuePlaceholder: "$ 10,000",
    monthlyRevenueNote: "* US달러($) 기준 (USD Only)",
    pitchDeck: "피치덱 자료 | Company Deck",
    pitchDeckUpload: "PDF Upload",
    pitchDeckNote: "50MB 이하 PDF 파일만 가능\n(Max 50MB)",
    pitchDeckView: "저장된 파일 보기 (View Current)",
    contactEmail: "연락처 이메일 | Contact Email",
    contactEmailPlaceholder: "official@company.com",
    notice: "작성하신 내용은 바이어 매칭 시 기업을 소개하는 첫인상이 됩니다. 신중하고 성실하게 작성해 주세요.",
    noticeSub: "(Your info is the first impression for buyer matching.)",
    successMsg: "✨ 원페이저가 성공적으로 저장되었습니다!",
    othersValue: "기타 (Others)",
  },
  en: {
    pageTitle: "Company One-Pager Editor",
    pageSubtitle: "Professional One-Pager Editor",
    cancel: "Cancel",
    cancelSub: "",
    save: "Save & Publish",
    saveSub: "",
    companyInfoTitle: "Company & Contact Info",
    companyInfoSub: "",
    
    // 회사명
    companyNameKr: "Company Name (Korean)",
    companyNameKrPlaceholder: "e.g. BizConnect Co., Ltd.",
    companyNameEn: "Company Name (English)",
    companyNameEnPlaceholder: "e.g., BizConnect Inc.",
    
    // 대표자
    ceoName: "CEO Name (Korean)",
    ceoNamePlaceholder: "e.g. 홍길동",
    ceoNameEn: "CEO Name",
    ceoNameEnPlaceholder: "e.g. Gildong Hong",
    
    // 담당자
    picName: "Contact Person (Korean)",
    picNamePlaceholder: "e.g. 김철수",
    picNameEn: "Contact Person Name",
    picNameEnPlaceholder: "e.g. Chulsoo Kim",
    picTitle: "Contact Person Title",
    picTitlePlaceholder: "e.g. Director, Manager",
    picTitleEn: "Contact Person Title (English)",
    picTitleEnPlaceholder: "e.g. Team Lead, Director",

    productType: "Product & Service Type",
    productTypePlaceholder: "e.g. K-Beauty Export Solution",
    solutionSummary: "Solution Summary",
    solutionSummaryPlaceholder: "Define your company's value in a single sentence. Buyers should understand your core value within 5 seconds.",
    problem: "Market Problem",
    problemGuide: "What inefficiency or pain point does your product solve? Include data or examples.",
    solution: "Our Solution",
    solutionGuide: "Describe your unique approach and the technological innovation behind it.",
    traction: "Traction & Metrics",
    tractionGuide: "Show quantifiable results: revenue, key clients, growth metrics.",
    bizModel: "Business Model",
    bizModelGuide: "Explain how you generate revenue and your market expansion plan.",
    quickInfo: "Quick Info",
    primaryTech: "Primary Technology",
    primaryTechPlaceholder: "e.g. AI, Robotics",
    industrySector: "Industry Sector",
    industryPlaceholder: "Select a category",
    industryCustomPlaceholder: "Enter custom sector (e.g. Space Tech)",
    yearFounded: "Founded",
    yearFoundedPlaceholder: "e.g. 2024",
    investmentStage: "Stage",
    investmentStagePlaceholder: "e.g. Seed",
    monthlyRevenue: "Monthly Revenue",
    monthlyRevenuePlaceholder: "$ 10,000",
    monthlyRevenueNote: "* USD only",
    pitchDeck: "Company Pitch Deck",
    pitchDeckUpload: "PDF Upload",
    pitchDeckNote: "PDF files only, max 50MB",
    pitchDeckView: "View Current File",
    contactEmail: "Contact Email",
    contactEmailPlaceholder: "official@company.com",
    notice: "This information is the first impression buyers see during matching. Please fill it out carefully and thoroughly.",
    noticeSub: "",
    successMsg: "✨ One-pager saved successfully!",
    othersValue: "Others",
  },
} as const;

// ─── 온라인 사용성 강화: FloatingInput 컴포넌트 ───
// 입력값이 있거나 포커스 시 label이 위로 float, 완료 시 체크 아이콘 표시
interface FloatingInputProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  type?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
}

function FloatingInput({
  name,
  defaultValue = "",
  placeholder = "",
  label,
  type = "text",
  className = "",
  inputClassName = "",
  required = false,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value.length > 0;
  const isFloated = focused || hasValue;
  const showCheck = !focused && hasValue && touched;

  return (
    <div className={`relative group ${className}`}>
      {/* Floating Label */}
      <label
        onClick={() => inputRef.current?.focus()}
        className={`
          absolute left-4 font-black uppercase tracking-widest pointer-events-none
          transition-all duration-200 ease-out z-10 whitespace-nowrap truncate max-w-[calc(100%-2rem)]
          ${isFloated
            ? "top-2 text-[9px] text-indigo-500"
            : "top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
          }
        `}
      >
        {label}
      </label>

      <input
        ref={inputRef}
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (value.length > 0) setTouched(true); }}
        placeholder={isFloated ? placeholder : ""}
        className={`
          w-full bg-slate-50 border px-4 pb-3 rounded-[16px] md:rounded-2xl
          text-sm font-bold text-slate-800 outline-none
          transition-all duration-200
          ${isFloated ? "pt-6" : "pt-4"}
          ${focused
            ? "bg-white ring-2 ring-indigo-100 border-indigo-500 shadow-sm shadow-indigo-50"
            : hasValue
              ? "border-slate-200 bg-white"
              : "border-slate-100"
          }
          ${inputClassName}
        `}
      />

      {/* 완료 체크 아이콘 */}
      {showCheck && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center animate-in fade-in zoom-in-75 duration-200">
          <Check size={11} className="text-emerald-600 stroke-[3]" />
        </div>
      )}
    </div>
  );
}

// ─── 온라인 사용성 강화: FloatingTextarea 컴포넌트 ───
interface FloatingTextareaProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
  textareaClassName?: string;
}

function FloatingTextarea({
  name,
  defaultValue = "",
  placeholder = "",
  label,
  minHeight = "min-h-[120px]",
  className = "",
  textareaClassName = "",
}: FloatingTextareaProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const hasValue = value.length > 0;
  const showCheck = !focused && hasValue && touched;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-start sm:items-center gap-2">
          <div className="w-1.5 h-4 md:h-5 bg-indigo-500 rounded-full shrink-0 mt-0.5 sm:mt-0"></div>
          <span className="leading-tight break-keep">{label}</span>
        </h3>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (value.length > 0) setTouched(true); }}
          className={`
            w-full ${minHeight} bg-slate-50 border p-5 md:p-6 rounded-[20px] md:rounded-3xl
            text-sm leading-relaxed text-slate-700 outline-none resize-none
            placeholder:text-slate-400 font-bold whitespace-pre-line
            transition-all duration-200
            ${focused
              ? "bg-white ring-2 ring-indigo-100 border-indigo-500 shadow-sm"
              : hasValue
                ? "border-slate-200 bg-white"
                : "border-slate-100"
            }
            ${textareaClassName}
          `}
          placeholder={placeholder}
        />
        {showCheck && (
          <div className="absolute right-4 top-4 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center animate-in fade-in zoom-in-75 duration-200">
            <Check size={11} className="text-emerald-600 stroke-[3]" />
          </div>
        )}
        {/* 글자 수 카운터 (100자 이상 입력 시 표시) */}
        {focused && value.length > 50 && (
          <div className="absolute right-4 bottom-3 text-[10px] font-bold text-slate-400 animate-in fade-in duration-200">
            {value.length}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 다크 배경용 FloatingInput (사이드바) ───
interface DarkFloatingInputProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  type?: string;
  className?: string;
  required?: boolean;
  note?: string;
}

function DarkFloatingInput({
  name,
  defaultValue = "",
  placeholder = "",
  label,
  type = "text",
  className = "",
  required = false,
  note,
}: DarkFloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);

  const hasValue = value.length > 0;
  const isFloated = focused || hasValue;
  const showCheck = !focused && hasValue && touched;

  return (
    <div className={`space-y-0 ${className}`}>
      <div className="relative group">
        <label
          className={`
            absolute left-4 font-black uppercase tracking-widest pointer-events-none
            transition-all duration-200 ease-out z-10 whitespace-nowrap truncate max-w-[calc(100%-2rem)]
            ${isFloated
              ? "top-2 text-[9px] text-indigo-400"
              : "top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
            }
          `}
        >
          {label}
        </label>
        <input
          name={name}
          type={type}
          value={value}
          required={required}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (value.length > 0) setTouched(true); }}
          placeholder={isFloated ? placeholder : ""}
          className={`
            w-full bg-slate-800/80 border px-4 pb-3 text-xs font-bold text-white
            outline-none transition-all duration-200 rounded-2xl
            ${isFloated ? "pt-6" : "pt-4"}
            ${focused
              ? "border-indigo-500 bg-slate-700/80 ring-1 ring-indigo-500/30"
              : hasValue
                ? "border-slate-600 bg-slate-800/60"
                : "border-slate-700"
            }
            placeholder:text-slate-600
          `}
        />
        {showCheck && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center animate-in fade-in zoom-in-75 duration-200">
            <Check size={11} className="text-emerald-400 stroke-[3]" />
          </div>
        )}
      </div>
      {note && <p className="text-[9px] md:text-[10px] text-indigo-400 font-bold ml-1 mt-1.5">{note}</p>}
    </div>
  );
}

// ─── 다크 배경용 FloatingTextarea (사이드바 섹션 내 textarea는 없지만 확장 가능하도록 유지) ───

export default function OnePagerForm({ initialData }: { initialData?: any }) {
  const { locale } = useI18n();
  const tx = OP_TEXT[locale] ?? OP_TEXT.ko;
  const isKo = locale === "ko";

  const INDUSTRY_CATEGORIES = isKo ? INDUSTRY_CATEGORIES_KO : INDUSTRY_CATEGORIES_EN;

  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const router = useRouter();

  // ─── 데이터 매핑 (서버에서 받은 스키마 구조와 1:1 매칭) ───
  const d_companyKr = initialData?.companyNameKr || "";
  const d_companyEn = initialData?.companyNameEn || "";

  const d_ceoName = initialData?.ceoName || "";
  const d_ceoNameEn = initialData?.ceoNameEn || "";

  const d_picName = initialData?.picName || "";
  const d_picNameEn = initialData?.picNameEn || "";
  const d_picTitle = initialData?.picTitle || "";
  const d_picTitleEn = initialData?.picTitleEn || "";

  const d_email = initialData?.contactEmail || "";
  const d_tech = initialData?.primaryTech || "";
  const d_stage = initialData?.investmentStage || "";
  const d_year = initialData?.yearFounded || "";

  // 산업 분야 로직
  const existingIndustry = initialData?.industrySector || "";
  const isExistingCustom =
    existingIndustry &&
    !INDUSTRY_CATEGORIES_KO.includes(existingIndustry) &&
    !INDUSTRY_CATEGORIES_EN.includes(existingIndustry);

  const [selectedIndustry, setSelectedIndustry] = useState(
    isExistingCustom ? tx.othersValue : existingIndustry || ""
  );
  const [customIndustry, setCustomIndustry] = useState(
    isExistingCustom ? existingIndustry : ""
  );

  // ─── 섹션별 textarea 상태 (비즈니스 4단 그리드) ───
  const [sectionFocus, setSectionFocus] = useState<string | null>(null);
  const [sectionValues, setSectionValues] = useState({
    problem: initialData?.problem || "",
    solution: initialData?.solution || "",
    traction: initialData?.traction || "",
    bizModel: initialData?.bizModel || "",
  });
  const [sectionTouched, setSectionTouched] = useState({
    problem: false,
    solution: false,
    traction: false,
    bizModel: false,
  });

  const sectionRefs = {
    problem: useRef<HTMLTextAreaElement>(null),
    solution: useRef<HTMLTextAreaElement>(null),
    traction: useRef<HTMLTextAreaElement>(null),
    bizModel: useRef<HTMLTextAreaElement>(null),
  };

  // 섹션 textarea 자동 높이
  useEffect(() => {
    Object.entries(sectionRefs).forEach(([key, ref]) => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [sectionValues]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert(isKo ? "PDF 파일만 업로드 가능합니다. (PDF Only)" : "Only PDF files are allowed.");
        e.target.value = "";
        setSelectedFileName(null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(isKo ? "파일 용량은 50MB를 초과할 수 없습니다. (Max 50MB)" : "File size must not exceed 50MB.");
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
      alert(tx.successMsg);
      router.push("/seller");
    } else {
      alert(res.error);
    }
  };

  const isOthersSelected = selectedIndustry === tx.othersValue || selectedIndustry === "기타 (Others)" || selectedIndustry === "Others";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-24 font-pretendard text-left space-y-6 md:space-y-8">

      {/* ─── 헤더 ─── */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-8 shadow-lg border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <Link href="/seller" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 shrink-0 active:scale-95">
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight break-keep">
              {tx.pageTitle}
            </h1>
            <p className="text-[10px] md:text-xs font-black text-slate-400 mt-1 uppercase tracking-widest leading-tight">
              {tx.pageSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto shrink-0">
          <Link href="/seller" className="flex-1 md:flex-none px-4 py-3.5 rounded-[16px] md:rounded-2xl bg-white border-2 border-slate-100 text-slate-500 font-black text-xs md:text-sm hover:bg-slate-50 active:scale-95 transition-all text-center">
            {tx.cancel}{tx.cancelSub && <span className="font-bold opacity-70 hidden sm:inline"> {tx.cancelSub}</span>}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-[16px] md:rounded-2xl bg-slate-900 text-white font-black text-xs md:text-sm hover:bg-indigo-600 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {tx.save}{tx.saveSub && <span className="font-bold opacity-70 hidden sm:inline"> {tx.saveSub}</span>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">

        {/* ─── 왼쪽 메인 (8열) ─── */}
        <div className="xl:col-span-8 space-y-6 md:space-y-8">

          {/* ─── 기업 및 담당자 정보 ─── */}
          <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100 space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 mb-2 border-b border-slate-50 pb-4">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500"><Building2 size={20} /></div>
              <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                {tx.companyInfoTitle}
                {tx.companyInfoSub && (
                  <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest hidden sm:inline-block ml-1">
                    {tx.companyInfoSub}
                  </span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
              
              {/* 국문 회사명 (한국어 유저만 표시) */}
              {isKo && (
                <FloatingInput
                  name="companyNameKr"
                  defaultValue={d_companyKr}
                  placeholder={tx.companyNameKrPlaceholder}
                  label={tx.companyNameKr}
                />
              )}

              {/* 영문 회사명 (외국인은 꽉 차게, 한국인은 절반) */}
              <FloatingInput
                name="companyNameEn"
                defaultValue={d_companyEn}
                placeholder={tx.companyNameEnPlaceholder}
                label={tx.companyNameEn}
                className={!isKo ? "sm:col-span-2" : ""}
              />

              {/* 국문 대표자명 (한국어 유저만) — User 아이콘 제거 */}
              {isKo && (
                <FloatingInput
                  name="ceoName"
                  defaultValue={d_ceoName}
                  placeholder={tx.ceoNamePlaceholder}
                  label={tx.ceoName}
                />
              )}

              {/* 영문 대표자명 — User 아이콘 제거 */}
              <FloatingInput
                name="ceoNameEn"
                defaultValue={d_ceoNameEn}
                placeholder={tx.ceoNameEnPlaceholder}
                label={tx.ceoNameEn}
                className={!isKo ? "sm:col-span-2" : ""}
              />

              {/* 국문 담당자명 (한국어 유저만) */}
              {isKo && (
                <FloatingInput
                  name="picName"
                  defaultValue={d_picName}
                  placeholder={tx.picNamePlaceholder}
                  label={tx.picName}
                />
              )}

              {/* 영문 담당자명 (외국인은 꽉 차게) */}
              <FloatingInput
                name="picNameEn"
                defaultValue={d_picNameEn}
                placeholder={tx.picNameEnPlaceholder}
                label={tx.picNameEn}
                className={!isKo ? "sm:col-span-2" : ""}
              />

              {/* 국문 담당자 직함 (한국어 유저만) */}
              {isKo && (
                <FloatingInput
                  name="picTitle"
                  defaultValue={d_picTitle}
                  placeholder={tx.picTitlePlaceholder}
                  label={tx.picTitle}
                />
              )}

              {/* 영문 담당자 직함 (외국인은 꽉 차게) */}
              <FloatingInput
                name="picTitleEn"
                defaultValue={d_picTitleEn}
                placeholder={tx.picTitleEnPlaceholder}
                label={tx.picTitleEn}
                className={!isKo ? "sm:col-span-2" : ""}
              />

            </div>

            {/* 제품 및 서비스 유형 */}
            <div className="pt-4 md:pt-6 border-t border-slate-100 mt-6">
              <FloatingInput
                name="productType"
                defaultValue={initialData?.productType || ""}
                placeholder={tx.productTypePlaceholder}
                label={tx.productType}
                className="w-full"
              />
            </div>
          </div>

          {/* 솔루션 요약 */}
          <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-slate-100">
            <FloatingTextarea
              name="solutionSummary"
              defaultValue={initialData?.solutionSummary || ""}
              placeholder={tx.solutionSummaryPlaceholder}
              label={tx.solutionSummary}
              minHeight="min-h-[100px] md:min-h-[120px]"
            />
          </div>

          {/* 비즈니스 상세 4단 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {[
              { id: "problem",  label: tx.problem,  icon: <Target className="text-rose-500" size={18}/>,   guide: tx.problemGuide },
              { id: "solution", label: tx.solution, icon: <Lightbulb className="text-amber-500" size={18}/>, guide: tx.solutionGuide },
              { id: "traction", label: tx.traction, icon: <TrendingUp className="text-emerald-500" size={18}/>, guide: tx.tractionGuide },
              { id: "bizModel", label: tx.bizModel, icon: <Briefcase className="text-indigo-500" size={18}/>, guide: tx.bizModelGuide },
            ].map((section) => {
              const sId = section.id as keyof typeof sectionValues;
              const isFocused = sectionFocus === section.id;
              const hasVal = sectionValues[sId].length > 0;
              const showDoneCheck = !isFocused && hasVal && sectionTouched[sId];
              return (
                <div
                  key={section.id}
                  className={`bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border transition-all hover:shadow-md ${
                    isFocused ? "border-indigo-200 shadow-md ring-2 ring-indigo-50" : hasVal ? "border-slate-200" : "border-slate-100 hover:border-indigo-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-4 border-b border-slate-50 pb-3">
                    <div className={`p-2.5 rounded-xl transition-transform border border-slate-100 ${isFocused ? "scale-105 bg-indigo-50" : "bg-slate-50"}`}>{section.icon}</div>
                    <h4 className="text-xs md:text-sm font-black text-slate-800 leading-tight flex-1">{section.label}</h4>
                    {showDoneCheck && (
                      <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center animate-in fade-in zoom-in-75 duration-200 shrink-0">
                        <Check size={11} className="text-emerald-600 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <textarea
                      ref={sectionRefs[sId]}
                      name={section.id}
                      value={sectionValues[sId]}
                      onChange={(e) => setSectionValues(prev => ({ ...prev, [sId]: e.target.value }))}
                      onFocus={() => setSectionFocus(section.id)}
                      onBlur={() => {
                        setSectionFocus(null);
                        if (sectionValues[sId].length > 0) setSectionTouched(prev => ({ ...prev, [sId]: true }));
                      }}
                      className="w-full min-h-[140px] md:min-h-[160px] text-xs md:text-sm font-medium leading-relaxed text-slate-600 outline-none resize-none focus:text-slate-900 transition-colors placeholder:text-slate-300 whitespace-pre-line bg-transparent"
                      placeholder={section.guide}
                    />
                    {isFocused && sectionValues[sId].length > 50 && (
                      <div className="absolute right-0 bottom-0 text-[10px] font-bold text-slate-300 animate-in fade-in duration-200">
                        {sectionValues[sId].length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 오른쪽 사이드바 (4열) ─── */}
        <aside className="xl:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-slate-900 text-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-xl relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>

            <h3 className="text-xs md:text-sm font-black tracking-tight mb-6 md:mb-8 border-b border-slate-800 pb-4 flex items-center gap-2 relative z-10">
              <Sparkles size={16} className="text-indigo-400" />
              {tx.quickInfo}
            </h3>

            <div className="space-y-5 md:space-y-6 relative z-10">

              {/* 주요 기술 */}
              <DarkFloatingInput
                name="primaryTech"
                defaultValue={d_tech}
                placeholder={tx.primaryTechPlaceholder}
                label={tx.primaryTech}
              />

              {/* 산업 분야 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{tx.industrySector}</label>
                <div className="relative">
                  <select
                    value={selectedIndustry}
                    onChange={(e) => {
                      setSelectedIndustry(e.target.value);
                      if (e.target.value !== tx.othersValue) setCustomIndustry("");
                    }}
                    required
                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 px-4 py-3.5 pr-10 text-xs font-bold text-white outline-none transition-all rounded-2xl appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-500">{tx.industryPlaceholder}</option>
                    {INDUSTRY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>

                {isOthersSelected && (
                  <input
                    type="text"
                    required
                    placeholder={tx.industryCustomPlaceholder}
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="w-full mt-2 bg-slate-800/80 border border-indigo-500/50 px-4 py-3.5 text-xs font-bold text-white outline-none transition-all rounded-2xl animate-in fade-in slide-in-from-top-2 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  />
                )}
                <input
                  type="hidden"
                  name="industrySector"
                  value={isOthersSelected ? customIndustry : selectedIndustry}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DarkFloatingInput
                  name="yearFounded"
                  defaultValue={d_year}
                  placeholder={tx.yearFoundedPlaceholder}
                  label={tx.yearFounded}
                />
                <DarkFloatingInput
                  name="investmentStage"
                  defaultValue={d_stage}
                  placeholder={tx.investmentStagePlaceholder}
                  label={tx.investmentStage}
                />
              </div>

              <DarkFloatingInput
                name="monthlyRevenue"
                defaultValue={initialData?.monthlyRevenue || ""}
                placeholder={tx.monthlyRevenuePlaceholder}
                label={tx.monthlyRevenue}
                note={tx.monthlyRevenueNote}
              />

              {/* 피치덱 업로드 */}
              <div className="pt-6 border-t border-slate-800">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">{tx.pitchDeck}</label>
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
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-300 uppercase">{tx.pitchDeckUpload}</span>
                        <p className="text-[9px] md:text-[10px] text-slate-500 text-center leading-tight whitespace-pre-line mt-1">{tx.pitchDeckNote}</p>
                      </>
                    )}
                  </div>
                </div>
                {initialData?.pitchDeckUrl && !selectedFileName && (
                  <Link href={initialData.pitchDeckUrl} target="_blank" className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-500 active:scale-95 transition-all border border-indigo-500">
                    <FileCheck size={14} /> {tx.pitchDeckView}
                  </Link>
                )}
              </div>

              {/* 연락처 이메일 */}
              <div className="pt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{tx.contactEmail}</label>
                <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center gap-3 border border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
                  <Mail size={16} className="text-indigo-400 shrink-0" />
                  <input
                    name="contactEmail"
                    type="email"
                    defaultValue={d_email}
                    className="bg-transparent text-xs font-bold text-white outline-none w-full min-w-0"
                    placeholder={tx.contactEmailPlaceholder}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="p-5 md:p-6 bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 flex items-start gap-3 shadow-sm w-full">
            <AlertCircle size={18} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed break-keep">
              {tx.notice}
              {tx.noticeSub && (
                <>{" "}<br className="hidden sm:block" />{tx.noticeSub}</>
              )}
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}