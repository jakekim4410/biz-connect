"use client";

import { useState, useEffect } from "react";
import { registerUserAction, checkExistingCompanyAction, checkExistingBusinessNumberAction, checkExistingEmailAction } from "./action";
import { useI18n } from "@/lib/i18n";

// ─── [추가] 산업 카테고리 정의 (원페이저와 연동용) ───
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

// ─── 국가코드 목록 ───
const COUNTRY_CODES = [
  { code: "+82",  flag: "🇰🇷", iso: "KR", name: "한국",           nameEn: "South Korea",      hasBizNum: true,  bizFormat: "000-00-00000",          bizLength: 10, bizLabel: "사업자등록번호" },
  { code: "+1",   flag: "🇺🇸", iso: "US", name: "미국/캐나다",     nameEn: "USA/Canada",       hasBizNum: true,  bizFormat: "XX-XXXXXXX",             bizLength: 9,  bizLabel: "EIN" },
  { code: "+44",  flag: "🇬🇧", iso: "GB", name: "영국",           nameEn: "United Kingdom",   hasBizNum: true,  bizFormat: "XXXXXXXXX",              bizLength: 9,  bizLabel: "Company Number" },
  { code: "+81",  flag: "🇯🇵", iso: "JP", name: "일본",           nameEn: "Japan",            hasBizNum: true,  bizFormat: "0000000000000",          bizLength: 13, bizLabel: "法人番号" },
  { code: "+86",  flag: "🇨🇳", iso: "CN", name: "중국",           nameEn: "China",            hasBizNum: true,  bizFormat: "000000000000000000",     bizLength: 18, bizLabel: "统一社会信用代码" },
  { code: "+852", flag: "🇭🇰", iso: "HK", name: "홍콩",           nameEn: "Hong Kong",        hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+886", flag: "🇹🇼", iso: "TW", name: "대만",           nameEn: "Taiwan",           hasBizNum: true,  bizFormat: "00000000",               bizLength: 8,  bizLabel: "統一編號" },
  { code: "+65",  flag: "🇸🇬", iso: "SG", name: "싱가포르",       nameEn: "Singapore",        hasBizNum: true,  bizFormat: "XXXXXXXXXX",             bizLength: 10, bizLabel: "UEN" },
  { code: "+60",  flag: "🇲🇾", iso: "MY", name: "말레이시아",     nameEn: "Malaysia",         hasBizNum: true,  bizFormat: "XXXXXXXXXX",             bizLength: 10, bizLabel: "SSM Registration" },
  { code: "+66",  flag: "🇹🇭", iso: "TH", name: "태국",           nameEn: "Thailand",         hasBizNum: true,  bizFormat: "0000000000000",          bizLength: 13, bizLabel: "Tax ID" },
  { code: "+84",  flag: "🇻🇳", iso: "VN", name: "베트남",         nameEn: "Vietnam",          hasBizNum: true,  bizFormat: "0000000000",             bizLength: 10, bizLabel: "Mã số thuế" },
  { code: "+62",  flag: "🇮🇩", iso: "ID", name: "인도네시아",     nameEn: "Indonesia",        hasBizNum: true,  bizFormat: "00.000.000.0-000.000",   bizLength: 15, bizLabel: "NPWP" },
  { code: "+63",  flag: "🇵🇭", iso: "PH", name: "필리핀",         nameEn: "Philippines",      hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+91",  flag: "🇮🇳", iso: "IN", name: "인도",           nameEn: "India",            hasBizNum: true,  bizFormat: "XXXXXXXXXXXXXX",         bizLength: 14, bizLabel: "GSTIN" },
  { code: "+92",  flag: "🇵🇰", iso: "PK", name: "파키스탄",       nameEn: "Pakistan",         hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+880", flag: "🇧🇩", iso: "BD", name: "방글라데시",     nameEn: "Bangladesh",       hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+94",  flag: "🇱🇰", iso: "LK", name: "스리랑카",       nameEn: "Sri Lanka",        hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+49",  flag: "🇩🇪", iso: "DE", name: "독일",           nameEn: "Germany",          hasBizNum: true,  bizFormat: "DE000000000",            bizLength: 11, bizLabel: "USt-IdNr." },
  { code: "+33",  flag: "🇫🇷", iso: "FR", name: "프랑스",         nameEn: "France",           hasBizNum: true,  bizFormat: "XXXXXX000000000",        bizLength: 14, bizLabel: "SIRET" },
  { code: "+39",  flag: "🇮🇹", iso: "IT", name: "이탈리아",       nameEn: "Italy",            hasBizNum: true,  bizFormat: "00000000000",            bizLength: 11, bizLabel: "Codice Fiscale" },
  { code: "+34",  flag: "🇪🇸", iso: "ES", name: "스페인",         nameEn: "Spain",            hasBizNum: true,  bizFormat: "X00000000",              bizLength: 9,  bizLabel: "NIF/CIF" },
  { code: "+31",  flag: "🇳🇱", iso: "NL", name: "네덜란드",       nameEn: "Netherlands",      hasBizNum: true,  bizFormat: "000000000B00",           bizLength: 12, bizLabel: "BTW-nummer" },
  { code: "+32",  flag: "🇧🇪", iso: "BE", name: "벨기에",         nameEn: "Belgium",          hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+41",  flag: "🇨🇭", iso: "CH", name: "스위스",         nameEn: "Switzerland",      hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+46",  flag: "🇸🇪", iso: "SE", name: "스웨덴",         nameEn: "Sweden",           hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+47",  flag: "🇳🇴", iso: "NO", name: "노르웨이",       nameEn: "Norway",           hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+45",  flag: "🇩🇰", iso: "DK", name: "덴마크",         nameEn: "Denmark",          hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+358", flag: "🇫🇮", iso: "FI", name: "핀란드",         nameEn: "Finland",          hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+48",  flag: "🇵🇱", iso: "PL", name: "폴란드",         nameEn: "Poland",           hasBizNum: true,  bizFormat: "0000000000",             bizLength: 10, bizLabel: "NIP" },
  { code: "+7",   flag: "🇷🇺", iso: "RU", name: "러시아",         nameEn: "Russia",           hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+380", flag: "🇺🇦", iso: "UA", name: "우크라이나",     nameEn: "Ukraine",          hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+90",  flag: "🇹🇷", iso: "TR", name: "터키",           nameEn: "Turkey",           hasBizNum: true,  bizFormat: "0000000000",             bizLength: 10, bizLabel: "Vergi No" },
  { code: "+971", flag: "🇦🇪", iso: "AE", name: "UAE",            nameEn: "UAE",              hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+966", flag: "🇸🇦", iso: "SA", name: "사우디아라비아", nameEn: "Saudi Arabia",     hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+972", flag: "🇮🇱", iso: "IL", name: "이스라엘",       nameEn: "Israel",           hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+20",  flag: "🇪🇬", iso: "EG", name: "이집트",         nameEn: "Egypt",            hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+27",  flag: "🇿🇦", iso: "ZA", name: "남아프리카",     nameEn: "South Africa",     hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+234", flag: "🇳🇬", iso: "NG", name: "나이지리아",     nameEn: "Nigeria",          hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+254", flag: "🇰🇪", iso: "KE", name: "케냐",           nameEn: "Kenya",            hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+55",  flag: "🇧🇷", iso: "BR", name: "브라질",         nameEn: "Brazil",           hasBizNum: true,  bizFormat: "00.000.000/0000-00",     bizLength: 14, bizLabel: "CNPJ" },
  { code: "+52",  flag: "🇲🇽", iso: "MX", name: "멕시코",         nameEn: "Mexico",           hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+54",  flag: "🇦🇷", iso: "AR", name: "아르헨티나",     nameEn: "Argentina",        hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+56",  flag: "🇨🇱", iso: "CL", name: "칠레",           nameEn: "Chile",            hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+57",  flag: "🇨🇴", iso: "CO", name: "콜롬비아",       nameEn: "Colombia",         hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
  { code: "+61",  flag: "🇦🇺", iso: "AU", name: "호주",           nameEn: "Australia",        hasBizNum: true,  bizFormat: "000000000",              bizLength: 9,  bizLabel: "ABN" },
  { code: "+64",  flag: "🇳🇿", iso: "NZ", name: "뉴질랜드",       nameEn: "New Zealand",      hasBizNum: false, bizFormat: "",                       bizLength: 0,  bizLabel: "" },
];

// ─── 회원 유형 목록 (ko/en) ───
const USER_TYPES = {
  ko: ["VC", "AC", "바이어", "스타트업", "기타"],
  en: ["VC", "AC", "Buyer", "Startup", "Other"],
};

// ─── 개인정보 처리방침 콘텐츠 (ko/en) ───
const PRIVACY_CONTENT = {
  ko: {
    title: "개인정보 처리방침",
    subtitle: "Privacy Policy",
    effectiveDate: "본 방침은 2025년 1월 1일부터 시행됩니다.",
    agreeBtn: "동의하고 닫기",
    closeBtn: "닫기",
    sections: [
      { title: "1. 수집하는 개인정보 항목", body: "BizConnect는 회원가입 및 서비스 제공을 위해 아래의 개인정보를 수집합니다.", items: ["필수항목: 이메일, 비밀번호, 성명(한/영문), 회사명(한/영문), 대표자명, 직함, 전화번호", "선택항목: 관심 산업군, 선호 파트너, LinkedIn URL", "자동수집: 접속 IP, 서비스 이용 기록"] },
      { title: "2. 개인정보의 수집 및 이용 목적", items: ["회원 식별 및 서비스 제공", "비즈니스 매칭 및 미팅 주선", "서비스 관련 공지 및 안내 발송", "부정 이용 방지 및 서비스 품질 개선"] },
      { title: "3. 개인정보의 보유 및 이용 기간", body: "회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.", items: ["계약 또는 청약철회 기록: 5년 (전자상거래법)", "접속 로그 기록: 3개월 (통신비밀보호법)"] },
      { title: "4. 개인정보의 제3자 제공", body: "수집된 개인정보는 원칙적으로 제3자에게 제공하지 않습니다.", items: ["이용자가 사전에 동의한 경우", "법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우"] },
      { title: "5. 개인정보 처리의 위탁", items: ["Supabase Inc. — 데이터베이스 및 스토리지 운영", "Resend Inc. — 이메일 발송 서비스", "Amazon Web Services — 클라우드 인프라"] },
      { title: "6. 정보주체의 권리", body: "이용자는 언제든지 아래 권리를 행사할 수 있습니다.", items: ["개인정보 열람 요청", "개인정보 정정·삭제 요청", "개인정보 처리 정지 요청", "동의 철회 (회원 탈퇴)"] },
      { title: "7. 개인정보 보호책임자", items: ["서비스명: 비즈커넥트 (BizConnect)", "문의처: 서비스 내 관리자 이메일"] },
    ],
  },
  en: {
    title: "Privacy Policy",
    subtitle: "개인정보 처리방침",
    effectiveDate: "This policy is effective from January 1, 2025.",
    agreeBtn: "Agree & Close",
    closeBtn: "Close",
    sections: [
      { title: "1. Personal Information Collected", body: "BizConnect collects the following personal information for membership registration and service provision.", items: ["Required: Email, password, name (Korean/English), company name (Korean/English), CEO name, job title, phone number", "Optional: Industries of interest, preferred partners, LinkedIn URL", "Auto-collected: IP address, service usage logs"] },
      { title: "2. Purpose of Collection and Use", items: ["Member identification and service provision", "Business matching and meeting arrangement", "Service notices and announcements", "Fraud prevention and service improvement"] },
      { title: "3. Retention Period", body: "Data is retained until membership termination and immediately destroyed thereafter.", items: ["Contract or withdrawal records: 5 years (E-Commerce Act)", "Access logs: 3 months (Communications Privacy Act)"] },
      { title: "4. Disclosure to Third Parties", body: "Personal information is not provided to third parties in principle, except in the following cases.", items: ["When the user has given prior consent", "When required by law or by investigative authorities following legal procedures"] },
      { title: "5. Data Processing Consignment", items: ["Supabase Inc. — Database and storage operations", "Resend Inc. — Email delivery service", "Amazon Web Services — Cloud infrastructure"] },
      { title: "6. Rights of Data Subjects", body: "Users may exercise the following rights at any time.", items: ["Request access to personal information", "Request correction or deletion", "Request suspension of processing", "Withdraw consent (account deletion)"] },
      { title: "7. Privacy Officer", items: ["Service: BizConnect", "Contact: Admin email within the service"] },
    ],
  },
};

// ─── 국가별 전화번호 유효성 규칙 ───
// hintKo: 한국(+82) 선택 시 표시, hintEn: 해외 국가 선택 시 표시
const PHONE_RULES: Record<string, { min: number; max: number; hintKo: string; hintEn: string }> = {
  "+82":  { min: 9,  max: 11, hintKo: "010-1234-5678 (9~11자리)",       hintEn: "010-1234-5678 (9–11 digits)" },
  "+1":   { min: 10, max: 10, hintKo: "2025551234 (10자리)",             hintEn: "2025551234 (10 digits)" },
  "+44":  { min: 10, max: 11, hintKo: "07911 123456 (10~11자리)",        hintEn: "07911 123456 (10–11 digits)" },
  "+81":  { min: 10, max: 11, hintKo: "090-1234-5678 (10~11자리)",       hintEn: "090-1234-5678 (10–11 digits)" },
  "+86":  { min: 11, max: 11, hintKo: "138 1234 5678 (11자리)",          hintEn: "138 1234 5678 (11 digits)" },
  "+852": { min: 8,  max: 8,  hintKo: "9123 4567 (8자리)",               hintEn: "9123 4567 (8 digits)" },
  "+886": { min: 9,  max: 10, hintKo: "0912 345 678 (9~10자리)",         hintEn: "0912 345 678 (9–10 digits)" },
  "+65":  { min: 8,  max: 8,  hintKo: "9123 4567 (8자리)",               hintEn: "9123 4567 (8 digits)" },
  "+60":  { min: 9,  max: 11, hintKo: "012-345 6789 (9~11자리)",         hintEn: "012-345 6789 (9–11 digits)" },
  "+66":  { min: 9,  max: 10, hintKo: "081 234 5678 (9~10자리)",         hintEn: "081 234 5678 (9–10 digits)" },
  "+84":  { min: 9,  max: 10, hintKo: "091 234 5678 (9~10자리)",         hintEn: "091 234 5678 (9–10 digits)" },
  "+62":  { min: 9,  max: 13, hintKo: "0812 3456 7890 (9~13자리)",       hintEn: "0812 3456 7890 (9–13 digits)" },
  "+63":  { min: 10, max: 10, hintKo: "0917 123 4567 (10자리)",          hintEn: "0917 123 4567 (10 digits)" },
  "+91":  { min: 10, max: 10, hintKo: "98765 43210 (10자리)",            hintEn: "98765 43210 (10 digits)" },
  "+49":  { min: 10, max: 12, hintKo: "015123456789 (10~12자리)",        hintEn: "015123456789 (10–12 digits)" },
  "+33":  { min: 9,  max: 10, hintKo: "06 12 34 56 78 (9~10자리)",       hintEn: "06 12 34 56 78 (9–10 digits)" },
  "+39":  { min: 9,  max: 11, hintKo: "333 123 4567 (9~11자리)",         hintEn: "333 123 4567 (9–11 digits)" },
  "+34":  { min: 9,  max: 9,  hintKo: "612 345 678 (9자리)",             hintEn: "612 345 678 (9 digits)" },
  "+55":  { min: 10, max: 11, hintKo: "11 91234-5678 (10~11자리)",       hintEn: "11 91234-5678 (10–11 digits)" },
  "+61":  { min: 9,  max: 9,  hintKo: "0412 345 678 (9자리)",            hintEn: "0412 345 678 (9 digits)" },
  "+7":   { min: 10, max: 10, hintKo: "912 345-67-89 (10자리)",          hintEn: "912 345-67-89 (10 digits)" },
  "+90":  { min: 10, max: 10, hintKo: "0532 123 4567 (10자리)",          hintEn: "0532 123 4567 (10 digits)" },
  "+971": { min: 9,  max: 9,  hintKo: "050 123 4567 (9자리)",            hintEn: "050 123 4567 (9 digits)" },
  "+966": { min: 9,  max: 9,  hintKo: "050 123 4567 (9자리)",            hintEn: "050 123 4567 (9 digits)" },
  "+20":  { min: 10, max: 11, hintKo: "010 1234 5678 (10~11자리)",       hintEn: "010 1234 5678 (10–11 digits)" },
  "+27":  { min: 9,  max: 9,  hintKo: "071 123 4567 (9자리)",            hintEn: "071 123 4567 (9 digits)" },
};
const DEFAULT_PHONE_RULE = { min: 6, max: 15, hintKo: "6~15자리 숫자", hintEn: "6–15 digits" };

// isKorean: 국가코드가 +82(한국)인지 여부 — locale이 아닌 선택 국가 기준
function getPhoneRule(code: string, isKorean: boolean) {
  const rule = PHONE_RULES[code] ?? DEFAULT_PHONE_RULE;
  return { ...rule, hint: isKorean ? rule.hintKo : rule.hintEn };
}

function isoToTwemojiUrl(iso: string): string {
  const base = 0x1F1E6 - 65;
  const cp1 = (iso.charCodeAt(0) + base).toString(16);
  const cp2 = (iso.charCodeAt(1) + base).toString(16);
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp1}-${cp2}.svg`;
}
function CountryFlag({ iso }: { iso: string }) {
  return (
    <img
      src={isoToTwemojiUrl(iso)}
      alt={iso}
      width={24}
      height={18}
      className="shrink-0 rounded-sm"
      style={{ minWidth: 24, objectFit: "cover" }}
    />
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-base shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-slate-700">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const r = t.register;
  const privacy = PRIVACY_CONTENT[locale] ?? PRIVACY_CONTENT.ko;

  const userTypes = USER_TYPES[locale] ?? USER_TYPES.ko;

  const [role, setRole] = useState("BUYER");
  const [isRoleLocked, setIsRoleLocked] = useState(false);

  // 이메일
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "available" | "duplicate" | "invalid">("idle");

  // 전화번호
  const [countryCode, setCountryCode] = useState("+82");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  // 기본 정보
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ─── 이름: 한글/영문 분리 ───
  const [name, setName] = useState("");         
  const [nameEn, setNameEn] = useState("");     

  // ─── 직함: 한글/영문 분리 ───
  const [jobTitle, setJobTitle] = useState("");   
  const [jobTitleEn, setJobTitleEn] = useState(""); 

  const [companyName, setCompanyName] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [ceoNameKo, setCeoNameKo] = useState("");
  const [ceoNameEn, setCeoNameEn] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");

  // ─── [추가] 원페이저 연동 비즈니스 필드 상태 ───
  const [industrySector, setIndustrySector] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [primaryTech, setPrimaryTech] = useState("");
  const [investmentStage, setInvestmentStage] = useState("");
  const [yearFounded, setYearFounded] = useState("");

  const [selectedType, setSelectedType] = useState("VC");
  const [userTypeDetail, setUserTypeDetail] = useState("");
  const [preferredPartners, setPreferredPartners] = useState("");

  // ─── LinkedIn URL ───
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [privacyConsent, setPrivacyConsent] = useState(false);

  // UI 상태
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [similarCompanies, setSimilarCompanies] = useState<any[]>([]);
  const [isSameCompanyConfirmed, setIsSameCompanyConfirmed] = useState(false);
  const [isMasterFlow, setIsMasterFlow] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [companyChecked, setCompanyChecked] = useState(false);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];
  const getCountryName = (c: typeof COUNTRY_CODES[0]) => locale === "en" ? c.nameEn : c.name;

  // ─── 국가 코드가 한국(+82)인지 여부 ───
  const isKorean = countryCode === "+82";
  
  const industries = isKorean ? INDUSTRY_CATEGORIES_KO : INDUSTRY_CATEGORIES_EN;
  const othersValue = isKorean ? "기타 (Others)" : "Others";

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.includes(countrySearchQuery) ||
    c.nameEn.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    c.iso.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    c.code.includes(countrySearchQuery)
  );

  // 이메일 중복 확인
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!email.length) { setEmailStatus("idle"); return; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) { setEmailStatus("invalid"); return; }
      setEmailStatus("loading");
      const isDuplicate = await checkExistingEmailAction(email);
      setEmailStatus(isDuplicate ? "duplicate" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // 사업자등록번호 자동 연동
  useEffect(() => {
    const check = async () => {
      const minLen = selectedCountry.bizLength;
      const rawLen = businessNumber.replace(/[^0-9a-zA-Z]/g, "").length;
      if (minLen > 0 && rawLen >= minLen) {
        const existing = await checkExistingBusinessNumberAction(businessNumber);
        if (existing) {
          setCompanyName(existing.companyName);
          setIsSameCompanyConfirmed(true);
          setIsMasterFlow(false);
          if (existing.role) { setRole(existing.role); setIsRoleLocked(true); }
        }
      }
    };
    check();
  }, [businessNumber]);

  // 회사명 유사 검색
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (companyName.length >= 2 && !isSameCompanyConfirmed) {
        const results = await checkExistingCompanyAction(companyName);
        setSimilarCompanies(results);
        const isNew = results.length === 0 && companyName.length >= 2;
        setIsMasterFlow(isNew);
        setCompanyChecked(true);
      } else {
        setSimilarCompanies([]);
        setIsMasterFlow(false);
        setCompanyChecked(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [companyName, isSameCompanyConfirmed]);

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setBusinessNumber("");
    setShowCountrySearch(false);
    setCountrySearchQuery("");
    const digits = phoneLocal.replace(/[^0-9]/g, "");
    const rule = getPhoneRule(code, code === "+82");
    setPhoneStatus(digits.length === 0 ? "idle" : digits.length >= rule.min && digits.length <= rule.max ? "valid" : "invalid");

    // 국가 변경 시 이름/직함 필드 초기화 (입력값 혼재 방지)
    setName("");
    setNameEn("");
    setJobTitle("");
    setJobTitleEn("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9\-\s]/g, "");
    setPhoneLocal(val);
    const digits = val.replace(/[^0-9]/g, "");
    const rule = getPhoneRule(countryCode, isKorean);
    if (digits.length === 0) setPhoneStatus("idle");
    else if (digits.length >= rule.min && digits.length <= rule.max) setPhoneStatus("valid");
    else setPhoneStatus("invalid");
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (countryCode === "+82") {
      const value = e.target.value.replace(/[^0-9]/g, "");
      let formatted = value;
      if (value.length <= 3) formatted = value;
      else if (value.length <= 5) formatted = `${value.slice(0,3)}-${value.slice(3)}`;
      else formatted = `${value.slice(0,3)}-${value.slice(3,5)}-${value.slice(5,10)}`;
      setBusinessNumber(formatted);
    } else {
      setBusinessNumber(e.target.value);
    }
  };

  const isPasswordMatch = password === confirmPassword && password !== "";
  const isPasswordValid = password.length >= 8;
  const fullPhone = `${countryCode}-${phoneLocal}`;
  const bizNumRequired = role === "SELLER" && selectedCountry.hasBizNum;

  const canSubmit =
    isPasswordMatch &&
    isPasswordValid &&
    !isPending &&
    emailStatus === "available" &&
    phoneStatus === "valid" &&
    privacyConsent &&
    (!bizNumRequired || businessNumber.length >= 1);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900 font-sans">

      {/* ─── 국가코드 선택 드롭다운 모달 ─── */}
      {showCountrySearch && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => { setShowCountrySearch(false); setCountrySearchQuery(""); }}
        >
          <div
            className="bg-white w-full sm:w-96 rounded-t-[30px] sm:rounded-[30px] max-h-[70vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <p className="text-xs font-black text-slate-500 text-center mb-3">
                {locale === "ko" ? "국가 선택" : "Select Country"}
              </p>
              <input
                type="text"
                placeholder={locale === "ko" ? "국가명 또는 코드 검색..." : "Search country or code..."}
                value={countrySearchQuery}
                onChange={e => setCountrySearchQuery(e.target.value)}
                autoFocus
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div className="overflow-y-auto">
              {filteredCountries.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountryChange(c.code)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50 transition-colors text-left ${countryCode === c.code ? 'bg-blue-50' : ''}`}
                >
                  <CountryFlag iso={c.iso} />
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-sm text-slate-800">{c.iso}</span>
                    <span className="ml-1.5 text-sm text-slate-500">{getCountryName(c)}</span>
                    {c.hasBizNum && (
                      <span className="ml-2 text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        {c.bizLabel}
                      </span>
                    )}
                  </div>
                  <span className="font-black text-slate-500 text-sm shrink-0">{c.code}</span>
                  {countryCode === c.code && (
                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 개인정보 처리방침 모달 ─── */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white w-full sm:w-auto sm:max-w-lg rounded-t-[30px] sm:rounded-[30px] max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <h2 className="text-lg font-black text-slate-800">{privacy.title}</h2>
              <p className="text-[10px] text-slate-400 mt-1">{privacy.subtitle}</p>
            </div>
            <div className="overflow-y-auto p-5 sm:p-6 text-xs text-slate-600 space-y-4 leading-relaxed">
              {privacy.sections.map((section, i) => (
                <section key={i}>
                  <h3 className="font-black text-slate-800 mb-2">{section.title}</h3>
                  {section.body && <p className="mb-2">{section.body}</p>}
                  <ul className="space-y-1 pl-4 list-disc">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                {privacy.effectiveDate}
              </p>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => { setPrivacyConsent(true); setShowPrivacyModal(false); }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-colors"
              >
                {privacy.agreeBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
              >
                {privacy.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (emailStatus !== "available") { setError(r.emailInvalid); return; }
          if (!privacyConsent) { setError(r.privacyConsentLabel); return; }

          // ─── [수정됨] SELLER(셀러) 일 경우 원페이저 필수값 제출 방어 로직 추가 ───
          if (role === "SELLER") {
            const finalInd = industrySector === othersValue ? customIndustry : industrySector;
            if (!finalInd) { setError(locale === "ko" ? "산업 분야를 선택해주세요." : "Please select an industry sector."); return; }
            if (!primaryTech) { setError(locale === "ko" ? "주요 기술을 입력해주세요." : "Please enter your primary tech."); return; }
            if (!investmentStage) { setError(locale === "ko" ? "투자 단계를 입력해주세요." : "Please enter your investment stage."); return; }
            if (!yearFounded) { setError(locale === "ko" ? "설립 연도를 입력해주세요." : "Please enter the year founded."); return; }
          }

          setError(""); setIsPending(true);

          const formData = new FormData(e.currentTarget);
          formData.set("phone", fullPhone);
          formData.set("nameEn", nameEn);
          formData.set("privacyConsent", String(privacyConsent));
          formData.set("isMasterFlow", String(isMasterFlow));
          formData.set("jobTitleEn", jobTitleEn);
          formData.set("linkedinUrl", linkedinUrl);

          // ─── [수정됨] 비즈니스 정보 전송 (원페이저용) ───
          const finalIndustry = industrySector === othersValue ? customIndustry : industrySector;
          formData.set("industrySector", finalIndustry);
          formData.set("primaryTech", primaryTech);
          formData.set("investmentStage", investmentStage);
          formData.set("yearFounded", yearFounded);

          // 해외 사용자: 한글 필드에 영문값 복사
          if (!isKorean) {
            formData.set("name", name);       
            formData.set("jobTitle", jobTitle); 
          }

          if (isMasterFlow) {
            formData.set("companyNameEn", companyNameEn);
            formData.set("ceoNameKo", ceoNameKo);
            formData.set("ceoNameEn", ceoNameEn);
          }
          if (isRoleLocked) {
            formData.set("role", role);
            formData.set("businessNumber", businessNumber);
          }

          const result = await registerUserAction(formData);
          if (result?.error) {
            setError(result.error); setIsPending(false);
          } else if (result?.success) {
            alert(result.role === "BUYER" && result.approvalStatus === "PENDING" ? r.successBuyer : r.successGeneral);
            window.location.href = "/login";
          }
        }}
        className="bg-white p-4 sm:p-10 md:p-12 rounded-[30px] sm:rounded-[40px] shadow-2xl w-full max-w-2xl space-y-0 border border-slate-100"
      >
        {/* ─── 헤더 ─── */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tighter">{r.title}</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-[0.2em]">{r.subtitle}</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2 mb-5">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="flex justify-end mb-4">
          <p className="text-[10px] font-bold text-slate-400">
            <span className="text-rose-500">*</span> {r.requiredNote}
          </p>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 1 — 계정 & 인증 정보
        ══════════════════════════════════════════ */}
        <div className="bg-slate-50 rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 mb-4 sm:mb-5">
          <SectionHeader
            icon="🔐"
            title={locale === "ko" ? "계정 정보" : "Account Info"}
            subtitle={locale === "ko" ? "로그인에 사용되는 이메일과 비밀번호" : "Email and password for login"}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

            {/* 계정 유형 */}
            <div className="col-span-1 sm:col-span-2">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {r.roleLabel} <span className="text-rose-500">*</span>
              </label>
              <select
                name="role" value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isRoleLocked}
                className={`w-full px-4 py-3 sm:p-4 rounded-2xl border font-bold outline-none transition-all text-sm sm:text-base ${isRoleLocked ? 'bg-white text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200 focus:border-blue-500'}`}
              >
                <option value="BUYER">{r.roleBuyer}</option>
                <option value="SELLER">{r.roleSeller}</option>
              </select>
              {isRoleLocked && <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">{r.roleLocked}</p>}
            </div>

            {/* 이메일 */}
            <div className="col-span-1">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {r.emailLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                name="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className={`w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border focus:bg-white transition-colors focus:outline-none text-sm sm:text-base ${
                  emailStatus === "duplicate" || emailStatus === "invalid" ? 'border-rose-500' :
                  emailStatus === "available" ? 'border-emerald-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {emailStatus === "invalid"   && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">{r.emailInvalid}</p>}
              {emailStatus === "duplicate" && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">{r.emailDuplicate}</p>}
              {emailStatus === "available" && <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">{r.emailAvailable}</p>}
              {emailStatus === "loading"   && <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-2">{r.emailChecking}</p>}
            </div>

            {/* 전화번호 */}
            <div className="col-span-1">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {r.phoneLabel} <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCountrySearch(true)}
                  className="flex items-center gap-1.5 px-3 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 transition-colors shrink-0 min-w-[80px]"
                >
                  <CountryFlag iso={selectedCountry.iso} />
                  <span className="font-bold text-sm text-slate-700">{selectedCountry.code}</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder={getPhoneRule(countryCode, isKorean).hint.split(" (")[0]}
                  required
                  value={phoneLocal}
                  onChange={handlePhoneChange}
                  className={`flex-1 px-4 py-3 sm:p-4 bg-white rounded-2xl border outline-none focus:bg-white transition-colors text-sm sm:text-base min-w-0 ${
                    phoneStatus === "invalid" ? "border-rose-500" :
                    phoneStatus === "valid"   ? "border-emerald-500" :
                    "border-slate-200 focus:border-blue-500"
                  }`}
                />
              </div>
              {phoneStatus === "idle"    && <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-2">{getPhoneRule(countryCode, isKorean).hint}</p>}
              {phoneStatus === "invalid" && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">⚠ {isKorean ? `${getPhoneRule(countryCode, isKorean).hint} 형식으로 입력해주세요` : `Please enter a valid number: ${getPhoneRule(countryCode, isKorean).hint}`}</p>}
              {phoneStatus === "valid"   && <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">✓ {isKorean ? "유효한 전화번호입니다" : "Valid phone number"}</p>}
            </div>

            {/* 비밀번호 */}
            <div className="col-span-1">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {r.passwordLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                name="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className={`w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border focus:bg-white transition-colors focus:outline-none text-sm sm:text-base ${
                  password.length > 0 && !isPasswordValid ? 'border-rose-500' :
                  isPasswordValid ? 'border-emerald-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {!password.length            && <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-2">{r.passwordHint}</p>}
              {password.length > 0 && !isPasswordValid && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">{r.passwordTooShort}</p>}
              {isPasswordValid              && <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">{r.passwordValid}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div className="col-span-1">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {r.confirmPasswordLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                name="confirmPassword" type="password" required value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                className={`w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border focus:bg-white transition-colors focus:outline-none text-sm sm:text-base ${
                  confirmPassword.length > 0 && !isPasswordMatch ? 'border-rose-500' :
                  confirmPassword.length > 0 && isPasswordMatch ? 'border-emerald-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {confirmPassword.length > 0 && isPasswordMatch  && <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">{r.confirmPasswordMatch}</p>}
              {confirmPassword.length > 0 && !isPasswordMatch && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">{r.confirmPasswordMismatch}</p>}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 2 — 회사 정보
        ══════════════════════════════════════════ */}
        <div className="bg-blue-50/60 rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 mb-4 sm:mb-5 border border-blue-100/80">
          <SectionHeader
            icon="🏢"
            title={locale === "ko" ? "회사 정보" : "Company Info"}
            subtitle={locale === "ko" ? "소속 회사 정보를 입력해주세요" : "Enter your company details"}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

            {isKorean ? (
              <>
                {/* 회사명 (한글) */}
                <div className="col-span-1 relative">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {r.companyLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="companyName" required value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setIsSameCompanyConfirmed(false);
                      setIsRoleLocked(false);
                      setIsMasterFlow(false);
                      setCompanyChecked(false);
                    }}
                    placeholder={r.companyPlaceholder}
                    className={`w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border focus:bg-white transition-colors focus:outline-none text-sm sm:text-base ${
                      isSameCompanyConfirmed ? 'border-emerald-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {isSameCompanyConfirmed && (
                    <p className="text-[10px] text-emerald-600 font-black mt-1.5 ml-2">{r.companyConfirmed}</p>
                  )}
                  {/* 유사 회사 드롭다운 */}
                  {similarCompanies.length > 0 && !isSameCompanyConfirmed && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-3">
                      <p className="text-xs font-black text-slate-500">{r.similarCompaniesTitle}</p>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                        {similarCompanies.map((comp) => (
                          <button
                            key={comp.companyName} type="button"
                            onClick={() => {
                              setCompanyName(comp.companyName);
                              setCompanyNameEn(comp.companyNameEn || "");
                              setIsSameCompanyConfirmed(true);
                              setIsMasterFlow(false);
                              setSimilarCompanies([]);
                              setCompanyChecked(true);
                              if (comp.role) { setRole(comp.role); setIsRoleLocked(true); }
                              if (comp.businessNumber) setBusinessNumber(comp.businessNumber);
                            }}
                            className="flex justify-between items-center p-3 hover:bg-blue-50 rounded-2xl border border-slate-100 transition-all text-left group"
                          >
                            <div className="min-w-0 flex-1 mr-2">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <span className="font-black text-sm text-slate-800 group-hover:text-blue-700">{comp.companyName}</span>
                                {comp.companyNameEn && (
                                  <span className="font-bold text-xs text-slate-500">({comp.companyNameEn})</span>
                                )}
                                {comp.businessNumber && (
                                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{comp.businessNumber}</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">
                                {locale === "ko" ? "마스터" : "Master"}:{" "}
                                <span className="font-bold text-slate-600">{comp.name}</span>
                                {comp.nameEn && <span> ({comp.nameEn})</span>}
                                <span className="ml-2 font-bold text-blue-500">{comp.role === "BUYER" ? r.investor : r.startup}</span>
                              </p>
                            </div>
                            <span className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-xl shrink-0">{r.selectButton}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 영문 회사명 */}
                <div className="col-span-1">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {r.companyNameEnLabel} {isMasterFlow && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    value={companyNameEn}
                    onChange={(e) => setCompanyNameEn(e.target.value)}
                    placeholder={locale === "ko" ? "영문 회사명" : "Company Name (English)"}
                    required={isMasterFlow}
                    disabled={isSameCompanyConfirmed}
                    className={`w-full px-4 py-3 sm:p-4 rounded-2xl border outline-none transition-colors text-sm sm:text-base ${
                      isSameCompanyConfirmed
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : 'bg-white border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>
              </>
            ) : (
              /* 해외 국가: 영문 단일 입력 */
              <div className="col-span-1 sm:col-span-2 relative">
                <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                  {locale === "ko" ? "회사명 (영문)" : "Company Name"} <span className="text-rose-500">*</span>
                </label>
                <input
                  name="companyName" required value={companyName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompanyName(v);
                    setCompanyNameEn(v);
                    setIsSameCompanyConfirmed(false);
                    setIsRoleLocked(false);
                    setIsMasterFlow(false);
                    setCompanyChecked(false);
                  }}
                  placeholder="Enter company name in English"
                  className={`w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border focus:bg-white transition-colors focus:outline-none text-sm sm:text-base ${
                    isSameCompanyConfirmed ? 'border-emerald-500' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">
                  {locale === "ko"
                    ? `${selectedCountry.flag} ${selectedCountry.nameEn} 선택됨 — 영문으로 입력해주세요`
                    : `${selectedCountry.flag} ${selectedCountry.nameEn} selected — please enter in English`}
                </p>
                {isSameCompanyConfirmed && (
                  <p className="text-[10px] text-emerald-600 font-black mt-1 ml-2">{r.companyConfirmed}</p>
                )}
                {/* 유사 회사 드롭다운 (해외도 동일) */}
                {similarCompanies.length > 0 && !isSameCompanyConfirmed && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-slate-500">{r.similarCompaniesTitle}</p>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {similarCompanies.map((comp) => (
                        <button
                          key={comp.companyName} type="button"
                          onClick={() => {
                            setCompanyName(comp.companyName);
                            setCompanyNameEn(comp.companyNameEn || comp.companyName);
                            setIsSameCompanyConfirmed(true);
                            setIsMasterFlow(false);
                            setSimilarCompanies([]);
                            setCompanyChecked(true);
                            if (comp.role) { setRole(comp.role); setIsRoleLocked(true); }
                            if (comp.businessNumber) setBusinessNumber(comp.businessNumber);
                          }}
                          className="flex justify-between items-center p-3 hover:bg-blue-50 rounded-2xl border border-slate-100 transition-all text-left group"
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <span className="font-black text-sm text-slate-800 group-hover:text-blue-700">{comp.companyName}</span>
                            {comp.companyNameEn && <span className="ml-1.5 text-xs text-slate-400">({comp.companyNameEn})</span>}
                          </div>
                          <span className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-xl shrink-0">{r.selectButton}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 사업자등록번호 */}
            <div className="col-span-1 sm:col-span-2">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {selectedCountry.hasBizNum ? (selectedCountry.bizLabel || r.bizNumberLabel) : r.bizNumberLabel}
                {" "}{bizNumRequired && <span className="text-rose-500">*</span>}
                {!selectedCountry.hasBizNum && (
                  <span className="ml-1 font-bold text-slate-300 normal-case">
                    ({locale === "ko" ? `${selectedCountry.name}에서는 해당 없음` : `Not applicable for ${selectedCountry.nameEn}`})
                  </span>
                )}
              </label>
              <input
                name="businessNumber"
                placeholder={
                  selectedCountry.hasBizNum
                    ? (selectedCountry.bizFormat || (locale === "ko" ? "등록번호 입력" : "Enter registration number"))
                    : (locale === "ko" ? "해당 국가는 사업자번호 불필요" : "Not required for this country")
                }
                maxLength={selectedCountry.hasBizNum ? (selectedCountry.bizLength + 5) : 0}
                required={bizNumRequired}
                value={businessNumber}
                onChange={handleBusinessNumberChange}
                disabled={isRoleLocked || !selectedCountry.hasBizNum}
                className={`w-full px-4 py-3 sm:p-4 rounded-2xl border outline-none transition-all text-sm sm:text-base ${
                  isRoleLocked || !selectedCountry.hasBizNum
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                    : 'bg-white border-slate-200 focus:bg-white focus:border-blue-500'
                }`}
              />
              {isRoleLocked && businessNumber && (
                <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">{r.bizNumberLocked}</p>
              )}
              {!isRoleLocked && selectedCountry.hasBizNum && role === "SELLER" && (
                <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">{r.bizNumberHint}</p>
              )}
            </div>

            {/* 마스터 전용 필드 */}
            {isMasterFlow && (
              <>
                <div className="col-span-1 sm:col-span-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-lg shrink-0">👑</span>
                    <div>
                      <p className="text-xs font-black text-amber-700">{r.masterBadgeTitle}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">{r.masterBadgeDesc}</p>
                    </div>
                  </div>
                </div>

                {isKorean ? (
                  <>
                    <div className="col-span-1">
                      <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                        {r.ceoNameKoLabel} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        value={ceoNameKo} onChange={(e) => setCeoNameKo(e.target.value)}
                        placeholder={locale === "ko" ? "대표자 한글명" : "CEO Name (Korean)"}
                        required
                        className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none focus:bg-white transition-colors text-sm sm:text-base"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                        {r.ceoNameEnLabel} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        value={ceoNameEn} onChange={(e) => setCeoNameEn(e.target.value)}
                        placeholder={locale === "ko" ? "대표자 영문명" : "CEO Name (English)"}
                        required
                        className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none focus:bg-white transition-colors text-sm sm:text-base"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                      {r.ceoNameEnLabel} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={ceoNameEn} onChange={(e) => { setCeoNameEn(e.target.value); setCeoNameKo(e.target.value); }}
                      placeholder="CEO / Representative Name"
                      required
                      className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none focus:bg-white transition-colors text-sm sm:text-base"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 3 — 개인 정보
        ══════════════════════════════════════════ */}
        <div className="bg-slate-50 rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 mb-4 sm:mb-5">
          <SectionHeader
            icon="👤"
            title={locale === "ko" ? "개인 정보" : "Personal Info"}
            subtitle={locale === "ko" ? "담당자 본인 정보를 입력해주세요" : "Enter your personal details"}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

            {isKorean ? (
              <>
                {/* 한국: 성함(한글) + 영문 이름 분리 */}
                <div className="col-span-1">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {r.nameLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="name" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={r.namePlaceholder}
                    className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-colors text-sm sm:text-base"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {r.nameEnLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={nameEn} onChange={(e) => setNameEn(e.target.value)}
                    placeholder={locale === "ko" ? "영문 이름" : "Full Name (English)"}
                    required
                    className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-colors text-sm sm:text-base"
                  />
                </div>

                {/* 한국: 직함(한글) + 영문 직함 분리 */}
                <div className="col-span-1">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {r.jobTitleLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="jobTitle" required value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={r.jobTitlePlaceholder}
                    className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-colors text-sm sm:text-base"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {r.jobTitleEnLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={jobTitleEn} onChange={(e) => setJobTitleEn(e.target.value)}
                    placeholder={locale === "ko" ? "영문 직함" : "Job Title (English)"}
                    required
                    className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-colors text-sm sm:text-base"
                  />
                </div>
              </>
            ) : (
              <>
                {/* 해외: 영문 이름 단일 입력 */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {locale === "ko" ? "성함 (영문)" : "Full Name"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="name" required value={name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setName(v);
                      setNameEn(v); 
                    }}
                    placeholder="Enter your full name in English"
                    className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-colors text-sm sm:text-base"
                  />
                  <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">
                    {locale === "ko"
                      ? `${selectedCountry.flag} ${selectedCountry.nameEn} 선택됨 — 영문으로 입력해주세요`
                      : `${selectedCountry.flag} ${selectedCountry.nameEn} selected — please enter in English`}
                  </p>
                </div>

                {/* 해외: 영문 직함 단일 입력 */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                    {locale === "ko" ? "직함 (영문)" : "Job Title"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="jobTitle" required value={jobTitle}
                    onChange={(e) => {
                      const v = e.target.value;
                      setJobTitle(v);
                      setJobTitleEn(v); 
                    }}
                    placeholder={locale === "ko" ? "예: Manager, CEO, Director" : "e.g. Manager, CEO, Director"}
                    className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition-colors text-sm sm:text-base"
                  />
                </div>
              </>
            )}

            {/* ─── LinkedIn URL 최적화 UI (공통) ─── */}
            <div className="col-span-1 sm:col-span-2 mt-2 sm:mt-0">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {locale === "ko" ? "LinkedIn 프로필" : "LinkedIn Profile"}
                <span className="ml-1.5 text-[10px] font-bold text-slate-300 normal-case">
                  ({locale === "ko" ? "선택" : "Optional"})
                </span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 sm:left-4 flex items-center justify-center w-6 h-6 bg-[#0A66C2] rounded text-white font-bold text-[13px] pointer-events-none shadow-sm z-10">
                  in
                </div>
                {/* [수정됨] pl-14 sm:pl-16 으로 좌측 여백을 충분히 늘려 텍스트가 아이콘과 절대 겹치지 않게 함 */}
                <input
                  name="linkedinUrl" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/yourprofile"
                  className="w-full pl-14 sm:pl-16 pr-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none transition-colors text-sm sm:text-base relative z-0"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mt-2 ml-1.5 break-keep leading-snug">
                {locale === "ko" 
                  ? "LinkedIn 프로필 URL을 입력하시면 비즈니스 매칭 시 활용됩니다." 
                  : "Your LinkedIn profile URL will be used for business matching."}
              </p>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 4 — 비즈니스 및 추가 정보 (원페이저 연동)
        ══════════════════════════════════════════ */}
        <div className="bg-slate-50 rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 mb-4 sm:mb-5">
          <SectionHeader
            icon="✨"
            title={locale === "ko" ? "비즈니스 및 추가 정보" : "Business & Additional Info"}
            subtitle={
              role === "SELLER"
                ? (locale === "ko" ? "원페이저 자동 완성을 위한 필수 비즈니스 정보입니다" : "Required business info to auto-fill your One-Pager")
                : (locale === "ko" ? "매칭을 위한 보조 정보를 입력해주세요" : "Optional info for matching")
            }
          />
          
          <div className="mb-6">
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-2">
              {r.userTypeLabel} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {userTypes.map((v) => (
                <label
                  key={v}
                  className={`text-center py-3 px-2 sm:px-5 border rounded-2xl cursor-pointer text-xs sm:text-sm font-black transition-all ${selectedType === v ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  <input
                    type="radio" name="userType" value={v}
                    className="hidden" checked={selectedType === v}
                    onChange={(e) => setSelectedType(e.target.value)}
                  />
                  {v}
                </label>
              ))}
            </div>
            {(selectedType === "기타" || selectedType === "Other") && (
              <input
                name="userTypeDetail" type="text"
                placeholder={r.userTypeOtherPlaceholder}
                required value={userTypeDetail}
                onChange={(e) => setUserTypeDetail(e.target.value)}
                className="w-full px-4 py-3 sm:p-4 mt-3 bg-white border border-slate-200 rounded-2xl text-sm sm:text-base focus:outline-blue-500 focus:bg-white transition-colors"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 pt-6 border-t border-slate-200">
            <div className="col-span-1 sm:col-span-2">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {locale === "ko" ? "산업 분야 (Industry Sector)" : "Industry Sector"}
                {role === "SELLER" && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <select 
                  required={role === "SELLER"}
                  value={industrySector} 
                  onChange={(e) => setIndustrySector(e.target.value)} 
                  className="w-full px-4 py-3 sm:p-4 pr-10 bg-white rounded-2xl border border-slate-200 outline-none focus:border-blue-500 text-sm sm:text-base appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-slate-400">Select Category</option>
                  {industries.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {industrySector === othersValue && (
                <input 
                  type="text" placeholder={locale === "ko" ? "직접 입력해주세요" : "Enter custom industry"}
                  required={role === "SELLER"}
                  value={customIndustry} onChange={(e) => setCustomIndustry(e.target.value)}
                  className="w-full mt-2 px-4 py-3 sm:p-4 bg-white border border-blue-200 rounded-2xl focus:border-blue-500 outline-none text-sm sm:text-base animate-in fade-in slide-in-from-top-1" 
                />
              )}
            </div>

            <div className="col-span-1">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {locale === "ko" ? "주요 기술 (Primary Tech)" : "Primary Tech"}
                {role === "SELLER" && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <input 
                required={role === "SELLER"}
                value={primaryTech} onChange={(e) => setPrimaryTech(e.target.value)}
                placeholder="e.g. AI, Robotics"
                className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm sm:text-base" 
              />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {locale === "ko" ? "투자 단계 (Investment Stage)" : "Stage"}
                {role === "SELLER" && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <input 
                required={role === "SELLER"}
                value={investmentStage} onChange={(e) => setInvestmentStage(e.target.value)}
                placeholder="e.g. Seed, Series A"
                className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm sm:text-base" 
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
                {locale === "ko" ? "설립 연도 (Year Founded)" : "Year"}
                {role === "SELLER" && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <input 
                required={role === "SELLER"}
                value={yearFounded} onChange={(e) => setYearFounded(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full px-4 py-3 sm:p-4 bg-white rounded-2xl border border-slate-200 focus:border-blue-500 outline-none text-sm sm:text-base" 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase ml-1 block mb-1.5">
              {r.preferredPartnersLabel}
            </label>
            <textarea
              name="preferredPartners" value={preferredPartners}
              onChange={(e) => setPreferredPartners(e.target.value)}
              placeholder={r.preferredPartnersPlaceholder}
              className="w-full p-4 sm:p-5 bg-white rounded-[24px] border border-slate-200 h-28 sm:h-32 text-sm sm:text-base outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* ─── 개인정보 동의 ─── */}
        <div className="pt-2 sm:pt-4 pb-2 px-1">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setPrivacyConsent(!privacyConsent)}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                privacyConsent ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
              }`}
            >
              {privacyConsent && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-black text-slate-700">
                {r.privacyConsentLabel} <span className="text-rose-500">*</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {r.privacyConsentDesc}{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-blue-500 font-black underline hover:text-blue-700"
                >
                  {locale === "ko" ? "전문 보기" : "View full policy"}
                </button>
              </p>
            </div>
          </label>
        </div>

        {/* ─── 제출 버튼 ─── */}
        <button
          type="submit" disabled={!canSubmit}
          className={`w-full py-4 sm:py-5 rounded-[24px] sm:rounded-[30px] font-black text-lg sm:text-xl shadow-2xl transition-all mt-4 ${canSubmit ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
        >
          {isPending ? t.common.loading : r.submitButton}
        </button>
      </form>
    </div>
  );
}