"use client";
import AiSearchResultCard from "@/components/AiSearchResultCard";
import { useI18n } from "@/lib/i18n";
import { isCompanyMatch } from "@/lib/matchUtils";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  applyMeetingAction, 
  handleMemberStatus, 
  transferMasterRole, 
  reRequestApprovalAction,
  checkExistingCompanyAction,
  checkExistingBusinessNumberAction
} from "./actions";
import { updateProfileAction } from "../profile/action";
import { respondLocationChange } from "../buyer/actions";
import { 
  MapPin, Search, Handshake, Ban, Phone, Mail, Check, X as XIcon, 
  Send, Download, Clock, FileText, Sparkles, ChevronRight, 
  Users, ShieldCheck, User as UserIcon, Save, AlertCircle, Building2,
  Trophy, ArrowRight, AlertTriangle, TrendingUp, Target,
  XCircle, Calendar, Info, CheckCircle2, Globe
} from "lucide-react";
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// [1] 거절 화면 및 정보 수정 폼 컴포넌트
// ---------------------------------------------------------------------------

function RejectedScreen({ user }: { user: any }) {
  const { t, locale } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  
  const [selectedType, setSelectedType] = useState(user?.userType || "스타트업");
  const [userTypeDetail, setUserTypeDetail] = useState(user?.userTypeDetail || "");

  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [businessNumber, setBusinessNumber] = useState(user?.businessNumber || "");
  const [similarCompanies, setSimilarCompanies] = useState<any[]>([]);
  const [isSameCompanyConfirmed, setIsSameCompanyConfirmed] = useState(true); 
  const [isRoleLocked, setIsRoleLocked] = useState(user?.businessNumber ? true : false); 
  const [phone, setPhone] = useState(user?.phone || "");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setPhone(formatted);
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 5) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`;
    setBusinessNumber(formatted);
  };

  useEffect(() => {
    const checkBizNum = async () => {
      if (businessNumber.length === 12) {
        const existing = await checkExistingBusinessNumberAction(businessNumber);
        if (existing) {
          setCompanyName(existing.companyName); 
          setIsSameCompanyConfirmed(true);
          setIsRoleLocked(true);
        }
      }
    };
    checkBizNum();
  }, [businessNumber]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (companyName.length >= 2 && !isSameCompanyConfirmed) {
        const results = await checkExistingCompanyAction(companyName);
        setSimilarCompanies(results);
      } else {
        setSimilarCompanies([]);
      }
    }, 500);
    return () => clearTimeout(searchTimer);
  }, [companyName, isSameCompanyConfirmed]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("businessNumber", businessNumber); 

    const result = await reRequestApprovalAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    } else {
      window.location.reload();
    }
  };

  if (isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-6 text-left font-pretendard">
        <form 
          onSubmit={handleSubmit}
          className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl w-full max-w-2xl space-y-6 border border-slate-100 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="text-center mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800">{locale === "ko" ? "가입 정보 수정 및 재신청" : "Edit Info & Re-apply"}</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-2 font-bold">{locale === "ko" ? "거절 사유를 확인하고 정보를 올바르게 수정한 뒤 다시 제출해주세요." : "Please correct information and resubmit after checking reason."}</p>
          </div>

          {error && <p className="bg-rose-50 text-rose-500 p-4 rounded-xl text-sm font-bold text-center border border-rose-100">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2 md:col-span-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "회사명 (Company Name)" : "Company Name"}
              </label>
              <input 
                name="companyName" 
                placeholder={locale === "ko" ? "회사명을 입력하세요" : "Enter company name"} 
                required 
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setIsSameCompanyConfirmed(false);
                  setIsRoleLocked(false);
                }}
                className={`w-full p-4 rounded-2xl border transition-colors focus:outline-none font-bold text-sm md:text-base ${
                  isSameCompanyConfirmed ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900' : 'bg-slate-50 border-transparent focus:bg-white focus:border-blue-500'
                }`}
              />
              {similarCompanies.length > 0 && !isSameCompanyConfirmed && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
                  <p className="text-xs font-black text-slate-500">
                    {locale === "ko" ? "이미 등록된 유사한 회사가 있습니다. 소속 회사를 선택해 주세요." : "Similar company already exists. Please select yours."}
                  </p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {similarCompanies.map((comp) => (
                      <button
                        key={comp.companyName}
                        type="button"
                        onClick={() => {
                          setCompanyName(comp.companyName); 
                          setIsSameCompanyConfirmed(true);
                          setSimilarCompanies([]);
                          setIsRoleLocked(true);
                          if (comp.businessNumber) {
                            setBusinessNumber(comp.businessNumber);
                          }
                        }}
                        className="flex justify-between items-center p-4 hover:bg-blue-50 rounded-2xl border border-slate-50 transition-all text-left group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-sm text-slate-800 group-hover:text-blue-700">{comp.companyName}</span>
                            {comp.businessNumber && (
                              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {comp.businessNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {locale === "ko" ? "기존 가입자 확인용:" : "Registered user:"} {comp.name}
                            <span className="ml-2 font-bold text-blue-500">{comp.role === "BUYER" ? (locale === "ko" ? "[투자자]" : "[Investor]") : (locale === "ko" ? "[스타트업]" : "[Startup]")}</span>
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">{locale === "ko" ? "선택" : "Select"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isSameCompanyConfirmed && (
                <p className="text-[10px] text-emerald-600 font-black mt-1.5 ml-2">✓ {locale === "ko" ? "기존 등록된 회사입니다. 비즈니스 정보가 자동 연계됩니다." : "Registered company. Linked automatically."}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "사업자등록번호 (Business Number)" : "Business Number"}
              </label>
              <input
                name="businessNumber"
                placeholder="000-00-00000"
                maxLength={12}
                required={user?.role === "SELLER"}
                value={businessNumber}
                onChange={handleBusinessNumberChange}
                disabled={isRoleLocked}
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-bold text-sm md:text-base ${
                  isRoleLocked 
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' 
                    : 'bg-slate-50 border-transparent focus:bg-white focus:border-blue-500'
                }`}
              />
              {isRoleLocked && businessNumber && (
                <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">
                  🔒 {locale === "ko" ? "선택하신 회사의 사업자등록번호로 고정되었습니다." : "Locked to the selected company's business number."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "가입자 성함 (Full Name)" : "Full Name"}
              </label>
              <input name="name" defaultValue={user.name} required className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-blue-500 outline-none font-bold transition-all text-sm md:text-base" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "직함 (Job Title)" : "Job Title"}
              </label>
              <input name="jobTitle" defaultValue={user.jobTitle} required className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-blue-500 outline-none font-bold transition-all text-sm md:text-base" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "전화번호 (Phone)" : "Phone"}
              </label>
              <input name="phone" value={phone} onChange={handlePhoneChange} maxLength={13} required className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-blue-500 outline-none font-bold transition-all text-sm md:text-base" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "기업 분류 (User Type)" : "User Type"}
              </label>
              <div className="flex gap-2 flex-wrap mt-1">
                {["VC", "AC", "바이어", "스타트업", "기타"].map((v) => (
                  <label key={v} className={`flex-1 min-w-[70px] text-center p-3 border rounded-[16px] cursor-pointer text-xs font-black transition-all ${selectedType === v ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"}`}>
                    <input type="radio" name="userType" value={v} className="hidden" checked={selectedType === v} onChange={(e) => setSelectedType(e.target.value)} />
                    {v}
                  </label>
                ))}
              </div>
              {selectedType === "기타" && (
                <input name="userTypeDetail" type="text" placeholder={locale === "ko" ? "상세 유형 입력" : "Enter type detail"} value={userTypeDetail} onChange={(e) => setUserTypeDetail(e.target.value)} className="w-full p-4 mt-2 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none rounded-[16px] text-sm font-bold transition-all" />
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "관심 파트너 및 산업군 (Interests)" : "Interests"}
              </label>
              <textarea name="preferredPartners" defaultValue={user.preferredPartners} placeholder={locale === "ko" ? "선호하는 파트너를 기재해주세요." : "Please describe preferred partners."} className="w-full p-5 bg-slate-50 rounded-[20px] border border-transparent focus:bg-white focus:border-blue-500 outline-none resize-none h-28 font-bold transition-all" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="w-full md:w-1/3 py-4 rounded-[20px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              {locale === "ko" ? "취소" : "Cancel"}
            </button>
            <button 
              type="submit"
              disabled={isPending}
              className="w-full md:w-2/3 py-4 rounded-[20px] font-black text-white bg-slate-900 hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? <Clock className="animate-spin" size={20}/> : <Send size={20}/>}
              {isPending ? (locale === "ko" ? "재신청 처리 중..." : "Processing...") : (locale === "ko" ? "수정 완료 및 재신청 제출" : "Update & Resubmit")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-6 text-left font-pretendard">
      <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-md border border-rose-100 animate-in fade-in zoom-in-95 w-full text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">{locale === "ko" ? "가입 승인 거절" : "Application Rejected"}</h2>
        <p className="text-slate-500 text-xs md:text-sm font-bold mb-8">
          {locale === "ko" ? "죄송합니다. 마스터에 의해 가입이 반려되었습니다." : "Sorry, your application was rejected by the master."}
        </p>
        
        <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl mb-8 text-left">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle size={14}/> {locale === "ko" ? "반려 사유 (Reason)" : "Rejection Reason"}</p>
          <p className="text-[13px] md:text-sm font-bold text-rose-700 leading-relaxed italic break-keep">
            "{user.rejectionReason || (locale === "ko" ? "마스터에 의해 가입이 거절 되었습니다." : "Rejected by master.")}"
          </p>
        </div>

        <button 
          onClick={() => setIsEditing(true)}
          className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-[20px] md:rounded-[25px] font-black text-base md:text-lg shadow-xl hover:bg-black transition-all"
        >
          {locale === "ko" ? "정보 수정하여 재신청하기" : "Edit Info & Re-apply"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// [2] 메인 SellerClient 컴포넌트
// ---------------------------------------------------------------------------
export default function SellerClient({ 
  user,
  confirmedMeetings = [], 
  pendingMeetings = [], 
  rejectedMeetings = [], 
  availableSlots = [], 
  sellerId,
  hasOnePager,
  pendingMembers = [],
  approvedMembers = [],
  rejectedTeamMembers = [] 
}: any) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";

  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('available');
  const [confirmedSort, setConfirmedSort] = useState("asc");
  const [applyingSlot, setApplyingSlot] = useState<any>(null);

  // ── 프로필 편집 state ──
  const [editSelectedType, setEditSelectedType] = useState(
    ["VC", "AC", "바이어", "스타트업", "기타"].includes(user?.userType)
      ? user?.userType
      : (user?.userType ? "기타" : "스타트업")
  );
  const [editUserTypeDetail, setEditUserTypeDetail] = useState(
    !["VC", "AC", "바이어", "스타트업"].includes(user?.userType) && user?.userType
      ? user.userType
      : ""
  );
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  const handleSellerPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setEditPhone(formatted);
  };

  const [seenCounts, setSeenCounts] = useState({
    available: 0,
    confirmed: 0,
    rejected: 0,
  });

  // AI 검색 state
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiIsFallback, setAiIsFallback] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    setAiError(null);
    setAiIsFallback(false);
    setAiSearched(true);
    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery, searchRole: "BUYER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || (isEn ? "An error occurred during search." : "검색 중 오류가 발생했습니다."));
        return;
      }
      setAiResults(data.results || []);
      setAiIsFallback(data.isFallback || false);
    } catch (e) {
      setAiError(isEn ? "Network error. Please try again." : "네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setAiLoading(false);
    }
  };

  const aiAvgScore = aiResults.length > 0
    ? Math.round(aiResults.reduce((s: number, r: any) => s + (r.matchScore ?? 0), 0) / aiResults.length)
    : 0;

  const sortedApprovedMembers = useMemo(() => {
    if (!approvedMembers) return [];
    return [...approvedMembers].sort((a: any, b: any) => {
      const isMasterA = a.id === user?.id;
      const isMasterB = b.id === user?.id;
      if (isMasterA && !isMasterB) return -1;
      if (!isMasterA && isMasterB) return 1;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
  }, [approvedMembers, user?.id]);

  const isOnePagerCompleted = useMemo(() => {
    if (!hasOnePager) return false;
    if (typeof hasOnePager === 'object') {
      return Boolean(
        hasOnePager.primaryTech || 
        hasOnePager.solutionSummary || 
        hasOnePager.industrySector ||
        hasOnePager.ceoName ||
        hasOnePager.productType
      );
    }
    return true; 
  }, [hasOnePager]);

  useEffect(() => {
    if (!user?.id) return;
    setMounted(true);
    setSeenCounts({
      available: parseInt(localStorage.getItem(`seen_available_${user.id}`) || '0', 10),
      confirmed: parseInt(localStorage.getItem(`seen_confirmed_${user.id}`) || '0', 10),
      rejected: parseInt(localStorage.getItem(`seen_rejected_${user.id}`) || '0', 10),
    });
  }, [user?.id]);

  useEffect(() => {
    if (!mounted || !user?.id) return;
    const syncSeenCount = (key: keyof typeof seenCounts, currentLength: number) => {
      setSeenCounts((prev) => {
        if (prev[key] !== currentLength) {
          localStorage.setItem(`seen_${key}_${user.id}`, currentLength.toString());
          return { ...prev, [key]: currentLength };
        }
        return prev;
      });
    };
    if (expandedSection === 'available') syncSeenCount('available', availableSlots.length);
    if (expandedSection === 'confirmed') syncSeenCount('confirmed', confirmedMeetings.length);
    if (expandedSection === 'rejected') syncSeenCount('rejected', rejectedMeetings.length);
  }, [expandedSection, availableSlots.length, confirmedMeetings.length, rejectedMeetings.length, mounted, user?.id]);

  const displayConfirmed = useMemo(() => {
    if (!confirmedMeetings) return [];
    let list = [...confirmedMeetings];
    list.sort((a: any, b: any) => {
      const timeA = new Date(a.timeSlot.startTime).getTime();
      const timeB = new Date(b.timeSlot.startTime).getTime();
      return confirmedSort === "asc" ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [confirmedSort, confirmedMeetings]);

  const formatDateWithDay = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    const dLocale = isEn ? 'en-US' : 'ko-KR';
    const datePart = d.toLocaleDateString(dLocale, { year: 'numeric', month: 'numeric', day: 'numeric' });
    const dayPart = d.toLocaleDateString(dLocale, { weekday: 'short' });
    return `${datePart} (${dayPart})`;
  };

  const formatTime24And12 = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    const dLocale = isEn ? 'en-US' : 'ko-KR';
    const time24 = d.toLocaleTimeString(dLocale, { hour12: false, hour: '2-digit', minute: '2-digit' });
    const time12 = d.toLocaleTimeString(dLocale, { hour12: true, hour: '2-digit', minute: '2-digit' });
    return `${time24} (${time12})`;
  };

  // ── 헬퍼: buyer/member 표시 이름 (영문 환경이면 영문 우선) ──
  const displayCompanyName = (entity: any) => {
    if (!entity) return "-";
    return (isEn && entity.companyNameEn) ? entity.companyNameEn : (entity.companyName || "-");
  };

  const displayName = (entity: any) => {
    if (!entity) return "-";
    return (isEn && entity.nameEn) ? entity.nameEn : (entity.name || "-");
  };

  const displayJobTitle = (entity: any) => {
    if (!entity) return "";
    return (isEn && entity.jobTitleEn) ? entity.jobTitleEn : (entity.jobTitle || "");
  };

  // ── 헬퍼: 현재 사용자 본인의 회사명/이름/직함 표시 ──
  const myDisplayCompanyName = (isEn && user?.companyNameEn) ? user.companyNameEn : (user?.companyName || "");
  const myDisplayName = (isEn && user?.nameEn) ? user.nameEn : (user?.name || "");
  const myDisplayJobTitle = (isEn && user?.jobTitleEn) ? user.jobTitleEn : (user?.jobTitle || "");

  if (!mounted) return null;
  if (!user) return <div className="p-10 text-center font-bold">{isEn ? "Loading user info..." : "사용자 정보를 불러오는 중입니다..."}</div>;

  if (user.approvalStatus === "REJECTED") return <RejectedScreen user={user} />;

  if (user.approvalStatus === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-6 text-left font-pretendard">
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl text-center max-w-md border border-blue-100 w-full">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 md:w-10 md:h-10 animate-spin-slow" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4">{isEn ? "Awaiting Approval" : "가입 승인 대기 중"}</h2>
          <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-8">
            {myDisplayCompanyName}{isEn ? " master account approval required." : "의 마스터 계정 승인이 필요합니다."}<br/>
            {isEn ? "You can use the service after approval." : "승인 후 서비스를 이용하실 수 있습니다."}
          </p>
          <button onClick={() => window.location.reload()} className="text-blue-600 font-bold text-sm underline">
            {isEn ? "Refresh" : "새로고침 (Refresh)"}
          </button>
        </div>
      </div>
    );
  }

  const formatMeetingTime = (date: Date) => {
    const d = new Date(date);
    const h24 = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const dLocale = isEn ? 'en-US' : 'ko-KR';
    const ampm = d.toLocaleTimeString(dLocale, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

  const downloadExcel = () => {
    if (confirmedMeetings.length === 0) {
      alert(isEn ? "No data to download." : "다운로드할 데이터가 없습니다.");
      return;
    }
    const excelData = confirmedMeetings.map((m: any) => ({
      "Date": new Date(m.timeSlot.startTime).toLocaleDateString(),
      "Time": formatMeetingTime(new Date(m.timeSlot.startTime)),
      "Location": m.location || (isEn ? "TBD" : "미지정"),
      "Buyer": displayCompanyName(m.buyer),
      "Contact": displayName(m.buyer),
      "Phone": m.buyer?.phone || "-",
      "Email": m.buyer?.email || "-",
      "Proposal": m.proposal || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Confirmed_Seller");
    XLSX.writeFile(workbook, `Seller_Meetings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const onApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const alertMsg = isEn
      ? "One-Pager is empty. Buyers may reject because of lack of info. Continue?"
      : "원페이저가 작성되지 않았습니다. 바이어가 기업 정보를 확인할 수 없어 거절될 확률이 높습니다. 그래도 신청하시겠습니까?";
    const confirmMsg = isEn
      ? "Would you like to apply for a meeting with this buyer?"
      : "이 바이어에게 미팅을 신청하시겠습니까?";
    
    if (!isOnePagerCompleted) {
      if (!confirm(alertMsg)) return;
    } else {
      if (!confirm(confirmMsg)) return;
    }
    
    setIsPending(true);
    try { 
      await applyMeetingAction(new FormData(e.currentTarget), sellerId); 
      alert(isEn ? "✅ Application Complete!" : "✅ 신청 완료!"); 
      setApplyingSlot(null); 
      setExpandedSection('pending');
    } catch(err) {
      alert(isEn ? "Error occurred during application." : "신청 중 오류가 발생했습니다.");
    } finally { 
      setIsPending(false); 
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editPassword.length > 0 && editPassword.length < 8) {
      alert(isEn ? "Password must be at least 8 characters." : "비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (editPassword && editPassword !== editConfirmPassword) {
      alert(isEn ? "Passwords do not match." : "비밀번호가 일치하지 않습니다.");
      return;
    }
    setIsPending(true);
    const res = await updateProfileAction(new FormData(e.currentTarget));
    setIsPending(false);
    if (res.success) {
      alert(isEn ? "✅ Profile updated." : "✅ 정보가 수정되었습니다.");
      setEditPassword("");
      setEditConfirmPassword("");
    } else {
      alert(res.error || "Update failed");
    }
  };

  const navItems: any[] = [
    { 
      id: 'available', icon: <Search size={22}/>, label: t.seller.nav.available, sub: 'SEARCH', 
      count: availableSlots.length, isAlert: availableSlots.length > seenCounts.available 
    },
    { 
      id: 'pending', icon: <Clock size={22}/>, label: t.seller.nav.pending, sub: 'STATUS', 
      count: pendingMeetings.length 
    },
    { 
      id: 'confirmed', icon: <Handshake size={22}/>, label: t.seller.nav.confirmed, sub: 'LIST', 
      count: confirmedMeetings.length, isAlert: confirmedMeetings.length > seenCounts.confirmed 
    },
    { 
      id: 'rejected', icon: <Ban size={22}/>, label: t.seller.nav.rejected, sub: 'REJECTED', 
      count: rejectedMeetings.length, isAlert: rejectedMeetings.length > seenCounts.rejected 
    },
  ];

  if (user.isMaster) {
    navItems.push({ 
      id: 'team', icon: <ShieldCheck size={22}/>, label: t.seller.nav.team, sub: 'TEAM', 
      count: pendingMembers.length > 0 ? pendingMembers.length : null,
      isAlert: pendingMembers.length > 0 
    });
  }

  navItems.push({ id: 'profile', icon: <UserIcon size={22}/>, label: t.seller.nav.profile, sub: 'PROFILE', count: null });

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20 text-left">
      <div className="absolute top-[-10%] left-[-5%] w-[150%] md:w-[45%] h-[40%] bg-emerald-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-6 md:space-y-10 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {user.isMaster && pendingMembers.length > 0 && expandedSection !== 'team' && (
          <div className="bg-indigo-600 text-white px-5 py-4 md:px-6 md:py-4 rounded-[24px] shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4 w-full">
             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="bg-white/20 p-2.5 rounded-full shrink-0"><Users size={18} className="text-white" /></div>
                <span className="font-bold text-xs md:text-sm leading-snug">
                  {isEn
                    ? <>Members awaiting approval <span className="text-indigo-200 font-black">{pendingMembers.length}</span></>
                    : <>조직 합류 대기 팀원 <span className="text-indigo-200 font-black">{pendingMembers.length}명</span></>
                  }
                </span>
             </div>
             <button 
               onClick={() => setExpandedSection('team')} 
               className="w-full md:w-auto bg-white text-indigo-600 px-5 py-3 md:py-2.5 rounded-[16px] text-[13px] font-black hover:bg-indigo-50 transition-colors shadow-sm"
             >
               {isEn ? "Review & Approve" : "검토 및 승인하기"}
             </button>
          </div>
        )}

        {!isOnePagerCompleted && (
          <div className="bg-white rounded-[30px] md:rounded-[40px] p-6 md:p-10 shadow-xl border border-blue-50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 group transition-all duration-500 hover:shadow-2xl hover:border-blue-100 w-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-50/50 rounded-full blur-2xl -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12">
              <div className="w-full md:w-[65%] space-y-5 md:space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 shrink-0 shadow-inner">
                    <Trophy size={22} className="animate-bounce" style={{ animationDuration: '2s' }} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    {t.seller.onePager.bannerTitle} <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">3.5{isEn ? "x" : "배"}</span> {t.seller.onePager.bannerSuffix}
                  </h3>
                </div>
                
                <div className="space-y-2.5 bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between text-xs md:text-sm font-black text-slate-600">
                    <span className="flex items-center gap-1.5"><Target size={14}/> {isEn ? "Profile Setup Status" : "프로필 셋업 현황"}</span>
                    <span className="text-indigo-600">50% {isEn ? "Done" : "완료"}</span>
                  </div>
                  <div className="w-full h-3 md:h-3.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="w-1/2 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] md:text-[11px] font-bold text-slate-400 uppercase pt-1">
                    <span>1. {isEn ? "Sign up (Done)" : "회원가입 (완료)"}</span>
                    <span className="text-indigo-500">2. {isEn ? "One-Pager [Save & Post] pending" : "원페이저 [저장 및 게시] 완료 대기중"}</span>
                  </div>
                </div>

                <p className="text-[13px] md:text-[15px] text-slate-500 font-bold leading-relaxed break-keep">
                  {isEn 
                    ? "Buyers and VCs review the One-Pager before accepting a meeting. Appeal your core KPI, team, and vision attractively to confirm meetings faster than others."
                    : "바이어와 VC는 미팅을 수락하기 전, 반드시 기업의 원페이저(One-Pager)를 검토합니다. 핵심 KPI, 팀 소개, 비전을 매력적으로 어필하고 다른 기업들보다 먼저 미팅을 확정지으세요."
                  }
                </p>
              </div>

              <Link href="/seller/one-pager" className="w-full md:w-[35%] shrink-0">
                <div className="bg-slate-900 text-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] flex flex-col items-center justify-center gap-3 hover:bg-indigo-600 transition-all duration-300 shadow-xl hover:shadow-indigo-200/50 hover:-translate-y-1">
                  <Sparkles size={28} className="text-indigo-300 mb-1" />
                  <span className="font-black text-base md:text-lg">{isEn ? "Create My One-Pager" : "내 원페이저 작성하기"}</span>
                  <span className="text-[11px] md:text-xs text-indigo-200 font-bold flex items-center gap-1">{isEn ? "About 3 mins" : "약 3분 소요"} <ArrowRight size={12} /></span>
                </div>
              </Link>
            </div>
          </div>
        )}

        <header className="bg-white/90 backdrop-blur-2xl p-3 md:p-6 rounded-[24px] md:rounded-[40px] shadow-lg md:shadow-xl border border-white w-full">
          <div className="flex flex-row md:flex-wrap md:justify-center gap-2 md:gap-12 overflow-x-auto snap-x hide-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => setExpandedSection(item.id)} 
                className={`relative flex flex-col items-center gap-1.5 p-2 md:p-3 transition-all duration-300 snap-center min-w-[70px] md:min-w-0 ${expandedSection === item.id ? 'scale-105 md:scale-110' : ''}`}
              >
                {item.isAlert && (
                  <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse z-10 shadow-sm"></span>
                )}
                
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-2xl flex items-center justify-center shadow-md transition-colors ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-slate-300' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  {item.icon}
                </div>
                <div className="text-center mt-1">
                    <span className={`text-[10px] md:text-sm font-black block leading-none ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'}`}>{item.label} {item.count !== null && `(${item.count})`}</span>
                    <span className="text-[8px] md:text-[9px] font-bold opacity-40 uppercase mt-1 block">{item.sub}</span>
                </div>
              </button>
            ))}
            
            <div className="w-[1px] bg-slate-100 hidden md:block mx-1"></div>

            <Link href="/seller/one-pager" className="flex flex-col items-center gap-1.5 p-2 md:p-3 group transition-all duration-300 snap-center min-w-[70px] md:min-w-0 hover:scale-105">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-2xl flex items-center justify-center shadow-md ${!isOnePagerCompleted ? 'bg-rose-50 text-rose-500 animate-pulse border border-rose-200' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'} transition-colors`}>
                <FileText size={22}/>
              </div>
              <div className="text-center mt-1">
                  <span className={`text-[10px] md:text-sm font-black block leading-tight ${!isOnePagerCompleted ? 'text-rose-500' : 'text-slate-500 group-hover:text-indigo-600'}`}>
                    {t.seller.nav.onePager}<br/>
                    {!isOnePagerCompleted ? t.seller.nav.onePagerNeeded : t.seller.nav.onePagerManage}
                  </span>
                  <span className="text-[8px] md:text-[9px] font-bold opacity-40 uppercase mt-1 block">(ONE-PAGER)</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="min-h-[500px]">

          {/* ── [프로필 수정] ── */}
          {expandedSection === 'profile' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
              <div className="bg-white p-5 md:p-12 rounded-[30px] md:rounded-[45px] shadow-xl border border-white">

                {/* 헤더 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10 border-b border-slate-100 pb-6 md:pb-8">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 bg-slate-900 rounded-[18px] md:rounded-3xl flex items-center justify-center text-white shadow-xl">
                      <UserIcon size={28}/>
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        {/* 영문 환경: 영문 회사명 + 영문 이름 / 한글 환경: 한글 회사명 + 한글 이름 */}
                        <h3 className="text-lg md:text-2xl font-black text-slate-800 truncate">
                          [{myDisplayCompanyName}] {myDisplayName}{isEn ? "" : " 님"}
                        </h3>
                        {user.isMaster
                          ? <span className="w-fit px-2.5 py-1 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black rounded-md flex items-center gap-1 shadow-md shadow-indigo-100"><ShieldCheck size={12}/> MASTER</span>
                          : <span className="w-fit px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] md:text-[10px] font-black rounded-md flex items-center gap-1"><Users size={12}/> MEMBER</span>
                        }
                      </div>
                      <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-widest truncate">
                        {myDisplayJobTitle} | Account Settings
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-10">

                  {/* ── 개인정보 (마스터/멤버 공통) ── */}
                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <UserIcon size={14}/> {isEn ? "Personal Info" : "개인 정보"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

                      {/* 이메일 (고정) */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <Mail size={12}/> {isEn ? "Email" : "로그인 이메일"}
                          <span className="text-rose-400 font-bold">*{isEn ? "Read Only" : "수정불가"}</span>
                        </p>
                        <input defaultValue={user.email} disabled
                          className="w-full p-3.5 md:p-4 rounded-[16px] md:rounded-2xl border text-sm font-bold bg-slate-100 border-transparent text-slate-400 cursor-not-allowed"/>
                        <input type="hidden" name="email" value={user.email}/>
                      </div>

                      {/* 성함 (한글) */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <UserIcon size={12}/> {isEn ? "Full Name (KR)" : "성함 (한글)"}
                        </p>
                        <input name="name" defaultValue={user.name} required
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                      </div>

                      {/* 영문 이름 */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <UserIcon size={12}/> {isEn ? "Full Name (EN)" : "영문 이름"}
                        </p>
                        <input name="nameEn" defaultValue={user.nameEn}
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                      </div>

                      {/* 연락처 */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Phone size={12}/> {isEn ? "Phone" : "연락처"}
                        </p>
                        <input name="phone" value={editPhone} onChange={handleSellerPhoneChange}
                          maxLength={13} required
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                      </div>

                      {/* 직함 (한글) */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Check size={12}/> {isEn ? "Job Title (KR)" : "직함 (한글)"}
                        </p>
                        <input name="jobTitle" defaultValue={user.jobTitle} required
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                      </div>

                      {/* 직함 (영문) */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Check size={12}/> {isEn ? "Job Title (EN)" : "직함 (영문)"}
                        </p>
                        <input name="jobTitleEn" defaultValue={user.jobTitleEn}
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                      </div>

                      {/* 새 비밀번호 */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          {isEn ? "New Password" : "새 비밀번호"}
                        </p>
                        <input name="password" type="password" placeholder="8+ characters"
                          value={editPassword} onChange={e => setEditPassword(e.target.value)}
                          className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${
                            editPassword.length > 0 && editPassword.length < 8
                              ? 'border-rose-400 focus:border-rose-500'
                              : 'border-transparent focus:bg-white focus:border-indigo-500'
                          }`}/>
                      </div>

                      {/* 비밀번호 확인 */}
                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          {isEn ? "Confirm Password" : "비밀번호 확인"}
                        </p>
                        <input name="confirmPassword" type="password" placeholder="Re-enter password"
                          value={editConfirmPassword} onChange={e => setEditConfirmPassword(e.target.value)}
                          className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${
                            editConfirmPassword && editPassword !== editConfirmPassword
                              ? 'border-rose-500 bg-rose-50'
                              : 'border-transparent focus:bg-white focus:border-indigo-500'
                          }`}/>
                      </div>

                      {/* LinkedIn */}
                      <div className="flex flex-col space-y-2 md:col-span-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Globe size={12}/> LinkedIn
                        </p>
                        <input name="linkedinUrl" defaultValue={user.linkedinUrl}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                      </div>

                      {/* 관심 파트너 */}
                      <div className="flex flex-col space-y-2 md:col-span-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <Handshake size={12}/> {isEn ? "Preferred Partners & Industries" : "관심 파트너 및 산업군"}
                          {!user.isMaster && (
                            <span className="text-rose-400 font-bold">*{isEn ? "Master Only" : "마스터 전용"}</span>
                          )}
                        </p>
                        <textarea name="preferredPartners" defaultValue={user.preferredPartners || ""}
                          readOnly={!user.isMaster}
                          placeholder={isEn ? "Preferred partner conditions or industries" : "선호하는 파트너 조건이나 산업군"}
                          className={`w-full p-4 md:p-5 rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all resize-none h-24 ${
                            user.isMaster
                              ? 'bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none'
                              : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed outline-none'
                          }`}/>
                      </div>

                      {/* 회원 유형 */}
                      <div className="flex flex-col space-y-3 md:col-span-2 pt-2 border-t border-slate-100">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <Target size={12}/> {isEn ? "User Type" : "기업 분류"}
                          {!user.isMaster && (
                            <span className="text-rose-400 font-bold">*{isEn ? "Master Only" : "마스터 전용"}</span>
                          )}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {["VC", "AC",
                            isEn ? "Buyer" : "바이어",
                            isEn ? "Startup" : "스타트업",
                            isEn ? "Other" : "기타"
                          ].map((v) => (
                            <label key={v} className={`flex-1 min-w-[60px] text-center p-3 md:p-4 rounded-[16px] cursor-pointer text-xs md:text-sm font-black transition-all border ${
                              !user.isMaster ? "opacity-50 cursor-not-allowed" : ""
                            } ${
                              editSelectedType === v
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                                : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                            }`}>
                              <input type="radio" name="userType" value={v} className="hidden"
                                checked={editSelectedType === v}
                                onChange={(e) => { if (user.isMaster) setEditSelectedType(e.target.value); }}
                                disabled={!user.isMaster}/>
                              {v}
                            </label>
                          ))}
                        </div>
                        {(editSelectedType === "기타" || editSelectedType === "Other") && (
                          <input name="userTypeDetail" type="text"
                            placeholder={isEn ? "Enter type detail" : "상세 유형 입력"}
                            required value={editUserTypeDetail}
                            onChange={(e) => { if (user.isMaster) setEditUserTypeDetail(e.target.value); }}
                            readOnly={!user.isMaster}
                            className={`w-full p-4 mt-2 rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${
                              user.isMaster
                                ? 'bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none'
                                : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed outline-none'
                            }`}/>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── 마스터 전용: 회사 공통 정보 ── */}
                  {user.isMaster && (
                    <div>
                      <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-indigo-50 pb-3">
                        <Building2 size={14}/> {isEn ? "Company Info — Master Only" : "회사 공통 정보 (마스터 전용)"}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

                        {/* 회사명 한글 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Company (KR)" : "회사명 (한글)"}
                          </p>
                          <input name="companyName" defaultValue={user.companyName} required
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 회사명 영문 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Company (EN)" : "회사명 (영문)"}
                          </p>
                          <input name="companyNameEn" defaultValue={user.companyNameEn}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 대표자 한글 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "CEO (KR)" : "대표자 (한글)"}
                          </p>
                          <input name="ceoNameKo" defaultValue={user.ceoNameKo}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 대표자 영문 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "CEO (EN)" : "대표자 (영문)"}
                          </p>
                          <input name="ceoNameEn" defaultValue={user.ceoNameEn}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 산업 분야 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Industry Sector" : "산업 분야"}
                          </p>
                          <input name="industrySector"
                            defaultValue={user.industrySector || user.onePager?.industrySector}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 설립연도 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Year Founded" : "설립연도"}
                          </p>
                          <input name="yearFounded"
                            defaultValue={user.yearFounded || user.onePager?.yearFounded}
                            placeholder="e.g. 2020"
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 투자 단계 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Investment Stage" : "투자 단계"}
                          </p>
                          <input name="investmentStage"
                            defaultValue={user.investmentStage || user.onePager?.investmentStage}
                            placeholder="e.g. Series A"
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 핵심 기술 */}
                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Primary Tech" : "핵심 기술"}
                          </p>
                          <input name="primaryTech"
                            defaultValue={user.primaryTech || user.onePager?.primaryTech}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>

                        {/* 사업자등록번호 */}
                        <div className="flex flex-col space-y-2 md:col-span-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Business Number" : "사업자등록번호"}
                          </p>
                          <input name="businessNumber" defaultValue={user.businessNumber || ""}
                            placeholder="000-00-00000"
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all"/>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 저장 버튼 */}
                  <button
                    type="submit"
                    disabled={
                      isPending ||
                      (editPassword.length > 0 && editPassword !== editConfirmPassword) ||
                      (editPassword.length > 0 && editPassword.length < 8)
                    }
                    className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[30px] font-black text-base md:text-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl mt-2 disabled:opacity-50 disabled:hover:bg-slate-900"
                  >
                    {isPending ? <Clock className="animate-spin" size={20}/> : <Save size={20}/>}
                    {t.seller.profile.saveBtn}
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* ── [팀 관리] ── */}
          {expandedSection === 'team' && user.isMaster && (
            <section className="bg-white p-5 md:p-12 rounded-[30px] md:rounded-[45px] shadow-xl border border-white animate-in fade-in duration-500 text-left w-full">
              <div className="flex flex-col mb-8 md:mb-10 border-b border-slate-50 pb-6 md:pb-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3 flex-wrap">
                  <ShieldCheck className="text-indigo-600" size={28}/>
                  {t.seller.team.title}
                  <span className="px-2 md:px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] md:text-[10px] font-black rounded-md md:rounded-lg">Master Console</span>
                </h3>
                <p className="text-xs md:text-sm font-bold text-slate-400 mt-2 ml-1 leading-relaxed break-keep">
                  {isEn ? "Approve or reject members requesting to join the organization." : "조직에 합류를 요청한 멤버를 승인하거나, 반려하여 수정을 요청할 수 있습니다."}
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                  
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16}/> {t.seller.team.pendingTitle} <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md">{pendingMembers.length}</span>
                    </p>
                  </div>
                  
                  {pendingMembers.length === 0 ? (
                    <div className="bg-slate-50 rounded-[20px] md:rounded-[30px] p-8 md:p-10 text-center border border-slate-100 border-dashed">
                      <p className="text-xs md:text-sm font-bold text-slate-400">{t.seller.team.noPending}</p>
                    </div>
                  ) : (
                    pendingMembers.map((m: any) => (
                      <div key={m.id} className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[25px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto overflow-hidden">
                          <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-base md:text-lg">
                            {(displayName(m)).charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* 팀원 이름: 영문 환경에서 영문 이름 우선 */}
                            <p className="font-black text-sm text-slate-800 truncate">
                              {displayName(m)} <span className="text-indigo-500 ml-1 text-xs">({displayJobTitle(m)})</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            onClick={async () => { 
                              const reason = window.prompt(isEn ? "Please enter the rejection reason. (Optional)" : "거절 사유를 입력해주세요. (선택사항)");
                              if (reason !== null) {
                                setIsPending(true); 
                                await handleMemberStatus(m.id, "REJECTED", reason); 
                                setIsPending(false); 
                              }
                            }} 
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all"
                          >{t.seller.team.rejectBtn}</button>
                          
                          <button 
                            onClick={async () => { setIsPending(true); await handleMemberStatus(m.id, "APPROVED"); setIsPending(false); }} 
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition-colors shadow-md"
                          >{t.seller.team.approveBtn}</button>
                        </div>
                      </div>
                    ))
                  )}

                  {rejectedTeamMembers.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4 md:mb-6">
                        <p className="text-[11px] md:text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                          <Ban size={16}/> {t.seller.team.rejectedTitle} <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md">{rejectedTeamMembers.length}</span>
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        {rejectedTeamMembers.map((m: any) => (
                          <div key={m.id} className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[25px] flex flex-col justify-between gap-3 border border-rose-100 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 font-black text-base md:text-lg">
                                {(displayName(m)).charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-sm text-slate-800 flex items-center flex-wrap gap-1">
                                  <span className="truncate max-w-[120px] md:max-w-full">{displayName(m)}</span>
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{m.email}</p>
                              </div>
                            </div>
                            <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100/50">
                               <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">{t.seller.team.rejectionReason}</p>
                               <p className="text-[11px] font-bold text-rose-600 italic">"{m.rejectionReason || (isEn ? "No reason" : "사유 없음")}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Users size={16}/> {t.seller.team.membersTitle} <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{approvedMembers.length}</span>
                    </p>
                  </div>

                  {sortedApprovedMembers.map((m: any) => (
                    <div key={m.id} className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[25px] flex items-center justify-between gap-3 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center font-black text-base md:text-lg ${m.id === user.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {(displayName(m)).charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm text-slate-800 flex items-center flex-wrap gap-1">
                            <span className="truncate max-w-[120px] md:max-w-full">{displayName(m)}</span>
                            {m.id === user.id && <span className="text-indigo-500 text-[9px] md:text-[10px] font-black uppercase bg-indigo-50 px-1.5 py-0.5 rounded-md">(YOU)</span>}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{displayJobTitle(m)}</p>
                        </div>
                      </div>
                      
                      {m.id !== user.id && (
                        <button 
                          onClick={async () => { 
                            if(confirm(isEn
                              ? `[Warning] Transfer master role to ${displayName(m)}?\nYou will be demoted to a regular member.`
                              : `[주의] ${displayName(m)}님에게 마스터 권한을 넘기시겠습니까?\n권한을 위임하면 본인은 일반 조직원으로 강등됩니다.`
                            )) {
                              setIsPending(true);
                              await transferMasterRole(m.id);
                              setIsPending(false);
                            }
                          }} 
                          className="shrink-0 px-3 md:px-4 py-2 border border-slate-200 text-slate-500 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                        >{t.seller.team.transferBtn}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── [A] 매칭 탐색 (AVAILABLE) ── */}
          {expandedSection === 'available' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-6 md:space-y-10 px-1 md:px-2">
              
              {!isOnePagerCompleted && availableSlots.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-100 rounded-[20px] md:rounded-[24px] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shadow-sm">
                  <div className="bg-white p-3 rounded-full shrink-0 shadow-sm border border-rose-100 hidden md:block">
                    <AlertTriangle className="text-rose-500" size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm md:text-base font-black text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="text-rose-500 md:hidden shrink-0" size={18} />
                      {isEn ? "Wait! Please complete the One-Pager before applying." : "잠깐! 미팅을 신청하기 전에 원페이저를 꼭 작성해주세요."}
                    </p>
                    <p className="text-xs md:text-sm font-bold text-rose-700 mt-1.5 leading-relaxed break-keep">
                      {isEn ? "Without company info, rejection risk is very high. Don't miss the chance." : "바이어 측에 제공될 기업 정보가 없어, 신청하더라도 검토 없이 거절될 확률이 매우 높습니다. 소중한 매칭 기회를 놓치지 마세요."}
                    </p>
                  </div>
                  <Link href="/seller/one-pager" className="w-full md:w-auto whitespace-nowrap px-6 py-3.5 bg-rose-500 text-white text-sm font-black rounded-[16px] hover:bg-rose-600 transition-colors shadow-md text-center">
                    {isEn ? "Fill out now" : "지금 작성하기"}
                  </Link>
                </div>
              )}

              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                {t.seller.available.title} <span className="text-sm text-slate-400 font-bold uppercase ml-2 tracking-widest">(AVAILABLE)</span>
              </h2>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAiSearchMode(false)}
                  className={`px-4 py-2 rounded-[12px] text-xs font-black transition-all ${!aiSearchMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                >
                  {t.seller.available.viewAll}
                </button>
                <button
                  onClick={() => setAiSearchMode(true)}
                  className={`px-4 py-2 rounded-[12px] text-xs font-black transition-all flex items-center gap-1.5 ${aiSearchMode ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                >
                  <Sparkles size={13}/> {t.seller.available.aiSearch}
                </button>
              </div>

              {aiSearchMode && (
                <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[30px] shadow-sm border border-emerald-100 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Sparkles className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400" size={18}/>
                      <input
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                        placeholder={t.seller.available.aiPlaceholder}
                        className="w-full pl-12 pr-5 py-4 bg-emerald-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-[18px] text-sm font-bold outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={handleAiSearch}
                      disabled={aiLoading || !aiQuery.trim()}
                      className="px-6 py-4 bg-emerald-600 text-white rounded-[18px] font-black text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-200"
                    >
                      {aiLoading ? <Clock className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                      <span className="hidden md:inline">{aiLoading ? (isEn ? "Analyzing..." : "분석 중...") : t.seller.available.aiSearch}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-500 font-bold pl-1">{t.seller.available.aiHint}</p>
                </div>
              )}

              {aiSearchMode && aiLoading && (
                <div className="bg-white rounded-[24px] p-10 flex flex-col items-center gap-5 border border-emerald-100 shadow-sm">
                  <div className="relative">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                      <Sparkles size={28} className="text-emerald-500 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-200 border-t-emerald-500 animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-black text-slate-700">
                      {isEn ? "AI is analyzing the best matches..." : "AI가 최적의 바이어/VC를 분석 중입니다..."}
                    </p>
                    <p className="text-xs text-slate-400 font-bold">
                      {isEn ? "Synthesizing DB data + Web search" : "DB 데이터 + 웹 검색을 종합하고 있어요"}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {(isEn
                      ? ["DB Analysis", "Web Search", "Calculating Match Score"]
                      : ["DB 분석", "웹 검색", "매칭 스코어 계산"]
                    ).map((step, i) => (
                      <span key={step} className="px-3 py-1.5 bg-emerald-50 text-emerald-400 text-[10px] font-black rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiSearchMode && !aiLoading && aiSearched && (
                <AiSearchResultCard
                  results={aiResults}
                  query={aiQuery}
                  isFallback={aiIsFallback}
                  error={aiError}
                  locale={locale}
                  isMatched={(companyName) =>
                    availableSlots.some((slot: any) =>
                      isCompanyMatch(slot.buyer?.companyName || "", companyName)
                    )
                  }
                  onViewOnePager={(companyName) => {
                    const matched = availableSlots.find((slot: any) =>
                      isCompanyMatch(slot.buyer?.companyName || "", companyName)
                    );
                    if (matched) setApplyingSlot(matched);
                  }}
                  onePagerLabel={t.seller.available.applyBtn}
                />
              )}

              {!aiSearchMode && (
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {isEn ? "Buyer" : "바이어 (Buyer)"}
                          </th>
                          <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Interests" : "선호 파트너 (Interests)"}
                          </th>
                          <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {isEn ? "Date & Time" : "희망 일시 (Date & Time)"}
                          </th>
                          <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {isEn ? "Location" : "장소 (Location)"}
                          </th>
                          <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">
                            {isEn ? "Action" : "상태 / 액션"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableSlots.map((slot: any) => {
                          const colleagueMeeting = slot.meetings?.find((m: any) => 
                            m.seller?.companyName === user.companyName && m.sellerId !== user.id
                          );
                          return (
                            <tr key={slot.id} className="hover:bg-blue-50/50 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-[12px] flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Building2 size={20}/>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {/* 영문 환경: 영문 회사명 우선 */}
                                      <h4 className="font-black text-sm text-slate-800 truncate">
                                        {displayCompanyName(slot.buyer)}
                                      </h4>
                                      <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md font-bold">{slot.buyer?.userType}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 truncate">
                                      <UserIcon size={10} className="inline mr-1" />
                                      {/* 영문 환경: 영문 이름/직함 우선 */}
                                      {displayName(slot.buyer)}{displayJobTitle(slot.buyer) ? ` (${displayJobTitle(slot.buyer)})` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 max-w-[280px]">
                                <p className="text-xs text-slate-500 font-medium truncate italic">
                                  "{slot.buyer?.preferredPartners || (isEn ? "Open to all industries" : "전분야 협업 가능")}"
                                </p>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-xs font-black text-slate-700">{formatDateWithDay(slot.startTime)}</p>
                                <p className="text-[11px] font-bold text-slate-500 mt-1">{formatTime24And12(slot.startTime)}</p>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-1.5">
                                  <MapPin size={14} className="text-rose-400 shrink-0"/>
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                                    {slot.location || (isEn ? "TBD" : "미지정 (운영팀 안내 예정)")}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex flex-col items-end gap-2.5">
                                  {colleagueMeeting && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                                      <Users size={12}/> {t.seller.available.duplicateWarning}
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => setApplyingSlot(slot)} 
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
                                  >
                                    <Send size={12}/> {t.seller.available.applyBtn}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {availableSlots.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold text-sm bg-slate-50/50">
                              {t.seller.available.noSlots}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── [B] 신청 현황 (PENDING) ── */}
          {expandedSection === 'pending' && (
             <section className="space-y-6 md:space-y-10 px-1 md:px-2 animate-in fade-in slide-in-from-bottom-4">
               <div>
                 <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.seller.pending.title}</h2>
                 <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(PENDING STATUS)</p>
               </div>
               
               {pendingMeetings.length === 0 ? (
                 <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center max-w-4xl mx-auto">
                   <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                     <Clock size={32}/>
                   </div>
                   <p className="text-slate-500 font-bold text-sm md:text-base">{t.seller.pending.noPending}</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                   {pendingMeetings.map((m: any) => (
                     <div key={m.id} className="bg-white rounded-[24px] border border-blue-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                       <div className="p-5 border-b border-blue-50 bg-blue-50/30 flex justify-between items-start">
                         <div className="flex items-start gap-3 min-w-0">
                           <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                             <Building2 size={20}/>
                           </div>
                           <div className="min-w-0">
                             {/* 영문 환경: 영문 회사명 우선 */}
                             <h4 className="font-black text-slate-800 text-base md:text-lg truncate">
                               {displayCompanyName(m.buyer)}
                             </h4>
                             <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                               <UserIcon size={12}/> {displayName(m.buyer) || "-"}
                             </p>
                           </div>
                         </div>
                         <span className="px-2.5 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ml-2 animate-pulse">
                           {t.seller.pending.reviewing}
                         </span>
                       </div>
                       
                       <div className="p-5 flex-1 flex flex-col gap-4">
                         <div className="space-y-1.5">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                             <Calendar size={12}/> {isEn ? "Applied Schedule" : "신청 일정"}
                           </p>
                           <p className="text-sm font-bold text-slate-700">{formatDateWithDay(m.timeSlot?.startTime)}</p>
                           <p className="text-xs font-bold text-slate-500">{formatTime24And12(m.timeSlot?.startTime)}</p>
                         </div>
                         <div className="mt-auto pt-4 border-t border-slate-100">
                           <div className="bg-slate-50 text-slate-600 text-[11px] font-semibold p-4 rounded-[16px] leading-relaxed border border-slate-100">
                             {t.seller.pending.statusInfo}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </section>
          )}

          {/* ── [C] 확정 일정 (CONFIRMED) ── */}
          {expandedSection === 'confirmed' && (
            <section className="space-y-6 md:space-y-10 px-1 md:px-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.seller.confirmed.title}</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(CONFIRMED MEETINGS)</p>
                </div>
                <button onClick={downloadExcel} className="w-full md:w-auto bg-slate-900 text-white px-5 py-3 md:px-6 md:py-3.5 rounded-[16px] md:rounded-2xl text-[12px] md:text-xs font-black shadow-md md:shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors">
                  <Download size={16} /> {t.seller.confirmed.downloadBtn}
                </button>
              </div>

              {displayConfirmed.length === 0 ? (
                <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center max-w-4xl mx-auto">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Handshake size={32}/>
                  </div>
                  <p className="text-slate-500 font-bold text-sm md:text-base">{t.seller.confirmed.noConfirmed}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayConfirmed.map((m: any) => (
                    <div key={m.id} className="bg-white rounded-[24px] border-2 border-emerald-100 shadow-lg overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all">
                      <div className="p-6 border-b border-emerald-50 flex justify-between items-start">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <Building2 size={24}/>
                          </div>
                          <div className="min-w-0">
                            {/* 영문 환경: 영문 회사명 우선 */}
                            <h4 className="font-black text-slate-800 text-lg md:text-xl truncate">
                              {displayCompanyName(m.buyer)}
                            </h4>
                            <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1 truncate">
                              <UserIcon size={12}/> {displayName(m.buyer)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col gap-5 bg-gradient-to-b from-transparent to-emerald-50/30">
                        <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-sm shadow-emerald-200 flex items-center gap-1.5 w-fit">
                          <CheckCircle2 size={14}/> {t.seller.confirmed.matchConfirmed}
                        </span>

                        <div className="space-y-2 bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Calendar size={16} className="text-emerald-500" />
                            <span className="text-sm font-bold">{formatDateWithDay(m.timeSlot.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock size={16} className="text-emerald-500" />
                            <span className="text-sm font-bold">{formatTime24And12(m.timeSlot.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700 pt-2 mt-2 border-t border-slate-100">
                            <MapPin size={16} className="text-rose-400" />
                            <span className="text-sm font-bold">{m.location || (isEn ? "TBD" : "미지정 (운영팀 안내 예정)")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── [D] 거절 내역 (REJECTED) ── */}
          {expandedSection === 'rejected' && (
            <section className="space-y-6 md:space-y-10 px-1 md:px-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.seller.rejected.title}</h2>
                <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(REJECTED MEETINGS)</p>
              </div>

              {rejectedMeetings.length === 0 ? (
                <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center max-w-4xl mx-auto">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <XCircle size={32}/>
                  </div>
                  <p className="text-slate-500 font-bold text-sm md:text-base">{t.seller.rejected.noRejected}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {rejectedMeetings.map((m: any) => (
                    <div key={m.id} className="bg-white rounded-[24px] border border-rose-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                      <div className="p-5 border-b border-rose-50 bg-rose-50/30 flex justify-between items-start">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                            <Building2 size={20}/>
                          </div>
                          <div className="min-w-0">
                            {/* 영문 환경: 영문 회사명 우선 */}
                            <h4 className="font-black text-slate-800 text-base md:text-lg truncate">
                              {displayCompanyName(m.buyer)}
                            </h4>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">REJECTED</span>
                      </div>
                      
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12}/> {isEn ? "Schedule" : "일정"}
                          </p>
                          <p className="text-sm font-bold text-slate-700">{formatDateWithDay(m.timeSlot?.startTime)}</p>
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-100">
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <AlertCircle size={12}/> {t.seller.rejected.reason}
                          </p>
                          <div className="bg-rose-50/50 text-rose-700 text-[13px] font-semibold p-4 rounded-[16px] leading-relaxed italic border border-rose-100/50 break-keep">
                            "{m.rejectionReason || t.seller.rejected.noReason}"
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </main>
      </div>

      {/* ── 미팅 신청 모달 ── */}
      {applyingSlot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <h3 className="text-xl font-black flex items-center gap-2"><Send size={20} className="text-blue-400"/> {t.seller.applyModal.title}</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-widest uppercase">Apply for Meeting</p>
              </div>
              <button onClick={() => setApplyingSlot(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors relative z-10">
                <XIcon size={20}/>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-slate-50 rounded-[25px] p-6 border border-slate-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-[16px] shadow-sm border border-slate-100 flex items-center justify-center text-blue-500 shrink-0">
                  <Building2 size={24}/>
                </div>
                <div>
                  {/* 영문 환경: 영문 회사명 우선 */}
                  <h4 className="text-lg font-black text-slate-900 mb-1">
                    {displayCompanyName(applyingSlot.buyer)}
                  </h4>
                  <p className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-flex">{applyingSlot.buyer?.userType}</p>
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <p className="text-sm font-bold text-slate-700">{formatDateWithDay(applyingSlot.startTime)}</p>
                    <p className="text-xs font-bold text-slate-500">{formatTime24And12(applyingSlot.startTime)}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={onApply} className="space-y-4">
                <input type="hidden" name="slotId" value={applyingSlot.id} />
                <input type="hidden" name="buyerId" value={applyingSlot.buyerId} />
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-blue-500 uppercase tracking-widest ml-1">{t.seller.applyModal.proposalLabel}</label>
                  <textarea 
                    name="proposal" 
                    required 
                    placeholder={t.seller.applyModal.proposalPlaceholder} 
                    className="w-full p-5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-[20px] h-32 outline-none resize-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all" 
                  />
                </div>

                <button disabled={isPending} className="w-full py-4 bg-blue-600 text-white font-black text-base rounded-[20px] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-2">
                  {isPending ? <Clock className="animate-spin" size={20}/> : <Send size={20}/>}
                  {isPending ? t.seller.applyModal.submitting : t.seller.applyModal.submitBtn}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}} />
    </div>
  );
}