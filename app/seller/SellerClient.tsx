"use client";
import AiSearchResultCard from "@/components/AiSearchResultCard";
import { useI18n, industryOptions, regionOptions } from "@/lib/i18n";
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
  XCircle, Calendar, Info, CheckCircle2, Globe, MessageCircle,
  ChevronDown, ChevronUp, UserCheck, Crown, Link as LinkIcon, Lock, RefreshCw
} from "lucide-react";
import * as XLSX from 'xlsx';
import MeetingChat from "@/components/MeetingChat";

// ---------------------------------------------------------------------------
// [1] 거절 화면 및 정보 수정 재신청 컴포넌트
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
            <h2 className="text-2xl md:text-3xl font-black text-slate-800">{locale === "ko" ? "가입정보 수정 및 재신청" : "Edit Info & Re-apply"}</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-2 font-bold">{locale === "ko" ? "거절 사유를 확인하고 정보를 바르게 수정한 후 다시 제출해주세요." : "Please correct information and resubmit after checking reason."}</p>
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
                className={`w-full p-4 rounded-2xl border transition-colors focus:outline-none font-bold text-sm md:text-base ${isSameCompanyConfirmed ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900' : 'bg-slate-50 border-transparent focus:bg-white focus:border-blue-500'}`}
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
                            {locale === "ko" ? "기존 가입자 이름:" : "Registered user:"} {comp.name}
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
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-bold text-sm md:text-base ${isRoleLocked
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
                {locale === "ko" ? "가입자 이름 (Full Name)" : "Full Name"}
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
                <input name="userTypeDetail" type="text" placeholder={locale === "ko" ? "세부 유형 입력" : "Enter type detail"} value={userTypeDetail} onChange={(e) => setUserTypeDetail(e.target.value)} className="w-full p-4 mt-2 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none rounded-[16px] text-sm font-bold transition-all" />
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                {locale === "ko" ? "관심 파트너 및 업종 (Interests)" : "Interests"}
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
              {isPending ? <Clock className="animate-spin" size={20} /> : <Send size={20} />}
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
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle size={14} /> {locale === "ko" ? "반려 사유 (Reason)" : "Rejection Reason"}</p>
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
// PicSelector 컴포넌트
// ---------------------------------------------------------------------------
interface PicSelectorProps {
  buyerMembers: any[];
  selectedPicId: string | null;
  onSelect: (id: string | null) => void;
  isEn: boolean;
  masterUser?: any;
  disabled?: boolean;
}

function PicSelector({ buyerMembers, selectedPicId, onSelect, isEn, masterUser, disabled }: PicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedMember = selectedPicId
    ? buyerMembers.find((m) => m.id === selectedPicId)
    : null;

  const displayName = (m: any) => (isEn && m?.nameEn) ? m.nameEn : (m?.name || "-");
  const displayJobTitle = (m: any) => (isEn && m?.jobTitleEn) ? m.jobTitleEn : (m?.jobTitle || "");

  if (!buyerMembers || buyerMembers.length === 0) return null;

  return (
    <div className="space-y-2 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <label className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 leading-none min-w-0">
          <UserCheck size={14} className="shrink-0" />
          <span className="truncate">{isEn ? "Contact Person" : "담당자 선택"}</span>
          <span className="text-slate-400 font-bold normal-case text-[10px] shrink-0">
            {isEn ? "(Optional)" : "(선택)"}
          </span>
        </label>
        {disabled && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50 self-start sm:self-auto shrink-0 shadow-sm">
            <Lock size={10} className="shrink-0" />
            <span className="text-[9px] font-black tracking-tight leading-none uppercase">
              {isEn ? "Locked" : "자동 배정/고정됨"}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className={`w-full flex items-start justify-between gap-4 px-6 py-7 md:py-8 rounded-[30px] border-2 transition-all text-left shadow-sm hover:shadow-md ${disabled ? "bg-slate-50 border-slate-100 cursor-not-allowed" :
            selectedMember ? "bg-white border-blue-500 shadow-xl shadow-blue-50 text-slate-900" :
              "bg-white border-slate-100 text-slate-500 hover:border-blue-300"
          }`}
      >
        {selectedMember ? (
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-lg shadow-blue-200">
              {displayName(selectedMember).charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <p className="font-black text-[15px] text-slate-800 leading-normal break-keep">
                  {displayName(selectedMember)}
                </p>
                {selectedMember.isMaster && <Crown size={14} className="text-amber-500 shrink-0 mt-0.5" />}
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed break-keep">{displayJobTitle(selectedMember)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
              <UserIcon size={20} className="text-slate-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[15px] font-black block text-slate-700 leading-normal break-keep">
                {isEn ? "Auto-assign to Master" : "마스터에게 자동 배정"}
              </span>
              <p className="text-[11px] text-slate-400 font-bold mt-1 leading-relaxed break-keep">
                {isEn ? "Default representative" : "특정 담당자가 지정되지 않음"}
              </p>
            </div>
          </div>
        )}
        {!disabled && (
          <div className={`mt-1 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 bg-blue-50 text-blue-600" : "text-slate-400"}`}>
            <ChevronDown size={20} />
          </div>
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ring-4 ring-slate-900/5">
          <button
            type="button"
            onClick={() => { onSelect(null); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-6 py-5 hover:bg-slate-50 transition-colors border-b border-slate-100 ${!selectedPicId ? "bg-slate-50" : ""}`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <UserIcon size={18} className="text-slate-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-black text-[14px] text-slate-700">
                {isEn ? "Auto-assign to Master" : "마스터에게 자동 배정"}
              </p>
              {masterUser && (
                <p className="text-[10px] font-bold text-slate-400">
                  {isEn ? "Current master: " : "현재 마스터: "}
                  {(isEn && masterUser.nameEn) ? masterUser.nameEn : masterUser.name}
                </p>
              )}
            </div>
            {!selectedPicId && <Check size={16} className="text-blue-600 shrink-0" />}
          </button>

          <div className="max-h-80 overflow-y-auto custom-scrollbar bg-slate-50/50 p-2 space-y-2">
            {buyerMembers.map((m: any) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onSelect(m.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-5 rounded-2xl transition-all group relative border-2 ${selectedPicId === m.id
                    ? "bg-white border-blue-500 shadow-md ring-4 ring-blue-500/5"
                    : "bg-transparent border-transparent hover:bg-white hover:border-slate-100 hover:shadow-sm"
                  }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${m.isMaster ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  }`}>
                  {displayName(m).charAt(0)}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-black text-[14px] leading-snug ${selectedPicId === m.id ? "text-blue-600" : "text-slate-800"}`}>
                      {displayName(m)}
                    </p>
                    {m.isMaster && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        <Crown size={8} /> MASTER
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 leading-snug">{displayJobTitle(m)}</p>
                </div>
                {selectedPicId === m.id && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] font-bold text-slate-400 ml-1 leading-relaxed opacity-80">
        {isEn
          ? "If a specific time slot is chosen, the PIC is fixed to the schedule owner."
          : "특정 일정을 선택하면 해당 슬롯의 개설자로 담당자가 자동 고정됩니다."
        }
      </p>

      {selectedPicId && (
        <input type="hidden" name="picId" value={selectedPicId} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 그룹된 슬롯 카드 컴포넌트 (회사 단위)
// ---------------------------------------------------------------------------
interface GroupedSlotCardProps {
  companyName: string;
  slots: any[];
  user: any;
  isEn: boolean;
  onApply: (slot: any) => void;
  displayCompanyName: (entity: any) => string;
  displayName: (entity: any) => string;
  displayJobTitle: (entity: any) => string;
  formatDateWithDay: (dateString: string) => string;
  formatTime24And12: (dateString: string) => string;
  t: any;
}

function GroupedSlotCard({
  companyName,
  slots,
  user,
  isEn,
  onApply,
  displayCompanyName,
  displayName,
  displayJobTitle,
  formatDateWithDay,
  formatTime24And12,
  t,
}: GroupedSlotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const representativeSlot = slots[0];
  const buyer = representativeSlot?.buyer;

  const hasColleagueMeeting = slots.some((slot: any) =>
    slot.meetings?.some((m: any) => m.seller?.companyName === user.companyName && m.sellerId !== user.id)
  );

  return (
    <div className={`bg-white rounded-[24px] border transition-all duration-300 overflow-hidden ${isExpanded ? "border-blue-200 shadow-lg shadow-blue-50" : "border-slate-100 shadow-sm hover:border-blue-100 hover:shadow-md"}`}>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="p-5 md:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 transition-colors ${isExpanded ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              <Building2 size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-base text-slate-800 truncate">
                  {displayCompanyName(buyer)}
                </h4>
                <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md font-bold shrink-0">
                  {buyer?.userType}
                </span>
                {hasColleagueMeeting && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 shrink-0">
                    <Users size={10} /> {t.seller.available.duplicateWarning}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-bold mt-1 truncate flex items-center gap-1">
                <UserIcon size={10} className="shrink-0" />
                {displayName(buyer)}{displayJobTitle(buyer) ? ` · ${displayJobTitle(buyer)}` : ""}
              </p>
              {buyer?.preferredPartners && (
                <p className="text-[11px] text-slate-500 font-medium mt-1 truncate italic">
                  "{buyer.preferredPartners}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-[14px] shrink-0 transition-colors ${isExpanded ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}>
              <span className="text-lg font-black leading-none">{slots.length}</span>
              <span className="text-[9px] font-black uppercase">{isEn ? "slots" : "슬롯"}</span>
            </div>
            <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
              <ChevronDown size={18} className="text-slate-400" />
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Calendar size={11} />
              {isEn ? "Available Time Slots" : "신청 가능한 시간대"}
            </p>
            {slots.map((slot: any, idx: number) => {
              const slotColleagueMeeting = slot.meetings?.find((m: any) =>
                m.seller?.companyName === user.companyName && m.sellerId !== user.id
              );
              return (
                <div
                  key={slot.id}
                  className="bg-white rounded-[18px] border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-700">
                        {formatDateWithDay(slot.startTime)}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        {formatTime24And12(slot.startTime)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-rose-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500 truncate">
                          {slot.location || (isEn ? "TBD" : "행사장 내 안내 예정")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {slotColleagueMeeting && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 flex items-center gap-1">
                        <Users size={10} /> {isEn ? "Colleague applied" : "동료 신청"}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onApply(slot)}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Send size={11} />
                      <span className="whitespace-nowrap">{t.seller.available.applyBtn}</span>
                    </button>
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

// ---------------------------------------------------------------------------
// 메인 SellerClient 컴포넌트
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
  const [processingMemberId, setProcessingMemberId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('available');
  const [confirmedSort, setConfirmedSort] = useState("asc");
  const [applyingSlot, setApplyingSlot] = useState<any>(null);
  const [applyingSlots, setApplyingSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const [isPicLocked, setIsPicLocked] = useState(false);
  const [selectedPicId, setSelectedPicId] = useState<string | null>(null);
  const [buyerMembers, setBuyerMembers] = useState<any[]>([]);
  const [buyerMembersLoading, setBuyerMembersLoading] = useState(false);

  const handleOpenApplyModal = (slot: any) => {
    const companyName = slot.buyer?.companyName || "";
    const matchedSlots = availableSlots.filter((s: any) =>
      isCompanyMatch(s.buyer?.companyName || "", companyName)
    );

    const directRequestSlot = {
      id: -1,
      startTime: null,
      location: "TBD",
      buyerId: -1,
      buyer: { companyName, userType: "BUYER" }
    };

    if (matchedSlots.length > 0) {
      setApplyingSlots([...matchedSlots, directRequestSlot]);
      setApplyingSlot(slot);
      setSelectedSlotId(slot.id);
      if (slot.id !== -1) {
        setSelectedPicId(slot.buyerId);
        setIsPicLocked(true);
      } else {
        setSelectedPicId(null);
        setIsPicLocked(false);
      }
    } else {
      setApplyingSlots([directRequestSlot]);
      setApplyingSlot(directRequestSlot);
      setSelectedSlotId(-1);
      setSelectedPicId(null);
      setIsPicLocked(false);
    }
  };

  const [groupedView, setGroupedView] = useState(true);

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
  const [frozenNewRejectedCount, setFrozenNewRejectedCount] = useState(0);
  const [selectedChatMeeting, setSelectedChatMeeting] = useState<any>(null);
  const [unreadMeetings, setUnreadMeetings] = useState<number[]>([]);

  // ─── 핵심 알림 로직: API 응답 + localStorage lastRead 비교 ───────────────
  // MeetingChat이 열리면 localStorage.setItem(`lastRead_${userId}_${id}`, Date.now())을 저장함
  // 여기서는 상대방 메시지의 timestamp > lastRead 이면 unread로 판정
  const checkNewMessages = async () => {
    try {
      const res = await fetch('/api/meetings/new-messages');
      if (res.ok) {
        const data = await res.json();
        const meetings: { meetingId: number; lastMessageAt: number }[] = data.meetings || [];

        const unreadIds = meetings
          .filter(item => {
            const lastRead = parseInt(
              localStorage.getItem(`lastRead_${user?.id}_${item.meetingId}`) || '0',
              10
            );
            // 상대방 메시지 시간이 마지막 읽은 시간보다 나중이면 unread
            return item.lastMessageAt > lastRead;
          })
          .map(item => item.meetingId);

        setUnreadMeetings(unreadIds);
      }
    } catch (error) {
      console.error("Failed to check new messages:", error);
    }
  };

  useEffect(() => {
    checkNewMessages();
    const interval = setInterval(checkNewMessages, 10000); // 10초마다 폴링
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // MeetingChat에서 메시지 읽음 처리 시 즉시 알림 갱신
    const handleMessagesRead = () => checkNewMessages();
    const handleUnreadUpdate = () => checkNewMessages();
    window.addEventListener('messagesRead', handleMessagesRead);
    window.addEventListener('unreadUpdate', handleUnreadUpdate);
    return () => {
      window.removeEventListener('messagesRead', handleMessagesRead);
      window.removeEventListener('unreadUpdate', handleUnreadUpdate);
    };
  }, []);

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

  const groupedSlots = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const slot of availableSlots) {
      const key = slot.buyer?.companyName || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    for (const [key, slots] of map.entries()) {
      map.set(key, slots.sort((a: any, b: any) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ));
    }
    return Array.from(map.entries()).map(([companyName, slots]) => ({
      companyName,
      slots,
    }));
  }, [availableSlots]);

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
    if (expandedSection === 'rejected') {
      setFrozenNewRejectedCount((prev) => {
        if (prev === 0 && rejectedMeetings.length > seenCounts.rejected) {
          return rejectedMeetings.length - seenCounts.rejected;
        }
        return prev;
      });
      syncSeenCount('rejected', rejectedMeetings.length);
    } else {
      setFrozenNewRejectedCount(0);
    }
  }, [expandedSection, availableSlots.length, confirmedMeetings.length, rejectedMeetings.length, mounted, user?.id]);

  useEffect(() => {
    if (!applyingSlot) {
      setSelectedPicId(null);
      setBuyerMembers([]);
      return;
    }
    const buyerId = applyingSlot.buyerId || applyingSlot.buyer?.id;
    const companyName = applyingSlot.buyer?.companyName;

    const membersFromSlot = applyingSlot.buyer?.companyMembers;
    if (membersFromSlot && Array.isArray(membersFromSlot)) {
      setBuyerMembers(membersFromSlot);
      return;
    }

    setBuyerMembersLoading(true);
    const query = (buyerId && buyerId !== -1) ? `buyerId=${buyerId}` : `companyName=${encodeURIComponent(companyName || "")}`;
    fetch(`/api/buyer-members?${query}`)
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((data) => {
        setBuyerMembers(data.members || []);
      })
      .catch(() => setBuyerMembers([]))
      .finally(() => setBuyerMembersLoading(false));
  }, [applyingSlot]);

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
          <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4">{isEn ? "Awaiting Approval" : "가입 승인 대기중"}</h2>
          <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-8">
            {myDisplayCompanyName}{isEn ? " master account approval required." : "의 마스터 계정 승인이 필요합니다."}<br />
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
      "Location": m.location || (isEn ? "TBD" : "미정"),
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
      : "원페이퍼가 작성되지 않았습니다. 바이어가 기업 정보를 확인할 수 없어 거절할 확률이 높습니다. 그래도 신청하시겠습니까?";
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
      const formData = new FormData(e.currentTarget);
      if (selectedPicId) {
        formData.set("picId", selectedPicId);
      }
      await applyMeetingAction(formData, sellerId);
      alert(isEn ? "✓ Application Complete!" : "✓ 신청 완료!");
      setApplyingSlot(null);
      setSelectedPicId(null);
      setExpandedSection('pending');
    } catch (err) {
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
      alert(isEn ? "✓ Profile updated." : "✓ 정보가 수정되었습니다.");
      setEditPassword("");
      setEditConfirmPassword("");
    } else {
      alert(res.error || "Update failed");
    }
  };

  // ─── 네비게이션 아이템 ────────────────────────────────────────────────────
  // ── 각 섹션별 unread 카운트 계산 (LinkedIn/Slack 스타일 숫자 배지)
  const unreadCounts = {
    available: availableSlots.filter((s: any) => s.meetings?.some((m: any) => unreadMeetings.includes(m.id))).length
      + Math.max(0, availableSlots.length - seenCounts.available),
    pending: pendingMeetings.filter((m: any) => unreadMeetings.includes(m.id)).length,
    confirmed: confirmedMeetings.filter((m: any) => unreadMeetings.includes(m.id)).length
      + Math.max(0, confirmedMeetings.length - seenCounts.confirmed),
    rejected: Math.max(0, rejectedMeetings.length - seenCounts.rejected),
  };

  const navItems: any[] = [
    {
      id: 'available', icon: <Search size={22} />, label: t.seller.nav.available, sub: 'SEARCH',
      count: availableSlots.length,
      alertCount: unreadCounts.available > 0 ? (unreadCounts.available > 99 ? '99+' : String(unreadCounts.available)) : null,
    },
    {
      id: 'pending', icon: <Clock size={22} />, label: t.seller.nav.pending, sub: 'STATUS',
      count: pendingMeetings.length,
      alertCount: unreadCounts.pending > 0 ? (unreadCounts.pending > 99 ? '99+' : String(unreadCounts.pending)) : null,
    },
    {
      id: 'confirmed', icon: <Handshake size={22} />, label: t.seller.nav.confirmed, sub: 'LIST',
      count: confirmedMeetings.length,
      alertCount: unreadCounts.confirmed > 0 ? (unreadCounts.confirmed > 99 ? '99+' : String(unreadCounts.confirmed)) : null,
    },
    {
      id: 'rejected', icon: <Ban size={22} />, label: t.seller.nav.rejected, sub: 'REJECTED',
      count: rejectedMeetings.length,
      alertCount: unreadCounts.rejected > 0 ? (unreadCounts.rejected > 99 ? '99+' : String(unreadCounts.rejected)) : null,
    },
  ];

  if (user.isMaster) {
    navItems.push({
      id: 'team', icon: <ShieldCheck size={22} />, label: t.seller.nav.team, sub: 'TEAM',
      count: pendingMembers.length > 0 ? pendingMembers.length : null,
      alertCount: pendingMembers.length > 0 ? String(pendingMembers.length) : null,
    });
  }

  navItems.push({ id: 'profile', icon: <UserIcon size={22} />, label: t.seller.nav.profile, sub: 'PROFILE', count: null });

  const buyerMasterUser = buyerMembers.find((m: any) => m.isMaster);

  // ─── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20 text-left">
      <style jsx global>{`
        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
      `}</style>

      <div className="absolute top-[-10%] left-[-5%] w-[150%] md:w-[45%] h-[40%] bg-emerald-200/20 rounded-full blur-[120px] pointer-events-none" />

      <div className={`relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-6 md:space-y-10 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>

        {/* ─ 팀 승인 대기 배너 ─ */}
        {user.isMaster && pendingMembers.length > 0 && expandedSection !== 'team' && (
          <div className="bg-indigo-600 text-white px-5 py-4 md:px-6 md:py-4 rounded-[24px] shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4 w-full">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-white/20 p-2.5 rounded-full shrink-0"><Users size={18} className="text-white" /></div>
              <span className="font-bold text-xs md:text-sm leading-snug">
                {isEn
                  ? <>Members awaiting approval <span className="text-indigo-200 font-black">{pendingMembers.length}</span></>
                  : <>조직 가입 대기 인원 <span className="text-indigo-200 font-black">{pendingMembers.length}명</span></>
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

        {/* ─ 원페이퍼 작성 유도 배너 ─ */}
        {!isOnePagerCompleted && (
          <div className="bg-white rounded-[30px] md:rounded-[40px] p-6 md:p-10 shadow-xl border border-blue-50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 group transition-all duration-500 hover:shadow-2xl hover:border-blue-100 w-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-50/50 rounded-full blur-2xl -z-10 transform -translate-x-1/2 translate-y-1/2" />

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
                    <span className="flex items-center gap-1.5"><Target size={14} /> {isEn ? "Profile Setup Status" : "프로필 설정 현황"}</span>
                    <span className="text-indigo-600">50% {isEn ? "Done" : "완료"}</span>
                  </div>
                  <div className="w-full h-3 md:h-3.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="w-1/2 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] md:text-[11px] font-bold text-slate-400 uppercase pt-1">
                    <span>1. {isEn ? "Sign up (Done)" : "회원가입 (완료)"}</span>
                    <span className="text-indigo-500">2. {isEn ? "One-Pager [Save & Post] pending" : "원페이퍼 [저장 및 게시] 완료 대기중"}</span>
                  </div>
                </div>

                <p className="text-[13px] md:text-[15px] text-slate-500 font-bold leading-relaxed break-keep">
                  {isEn
                    ? "Buyers and VCs review the One-Pager before accepting a meeting. Appeal your core KPI, team, and vision attractively to confirm meetings faster than others."
                    : "바이어와 VC는 미팅을 수락하기 전 반드시 기업의 원페이퍼(One-Pager)를 검토합니다. 핵심 KPI, 팀 소개, 비전을 매력적으로 어필하고 다른 기업보다 먼저 미팅을 확정지으세요."
                  }
                </p>
              </div>

              <Link href="/seller/one-pager" className="w-full md:w-[35%] shrink-0">
                <div className="bg-slate-900 text-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] flex flex-col items-center justify-center gap-3 hover:bg-indigo-600 transition-all duration-300 shadow-xl hover:shadow-indigo-200/50 hover:-translate-y-1">
                  <Sparkles size={28} className="text-indigo-300 mb-1" />
                  <span className="font-black text-base md:text-lg">{isEn ? "Create My One-Pager" : "✨ 원페이퍼 작성하기"}</span>
                  <span className="text-[11px] md:text-xs text-indigo-200 font-bold flex items-center gap-1">{isEn ? "About 3 mins" : "약 3분 소요"} <ArrowRight size={12} /></span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ─ 네비게이션 헤더 ─ */}
        <header className="bg-white/90 backdrop-blur-2xl p-3 md:p-6 rounded-[24px] md:rounded-[40px] shadow-lg md:shadow-xl border border-white w-full">
          <div className="flex flex-row md:flex-wrap md:justify-center gap-2 md:gap-12 py-2 overflow-x-auto snap-x hide-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setExpandedSection(item.id)}
                className={`relative flex flex-col items-center gap-1.5 p-2 md:p-3 transition-all duration-300 snap-center min-w-[70px] md:min-w-0 ${expandedSection === item.id ? 'scale-105 md:scale-110' : ''}`}
              >
                <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-2xl flex items-center justify-center shadow-md transition-colors ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-slate-300' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  {/* ── 숫자 카운트 알림 배지 ── */}
                  {item.alertCount && (
                    <span className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-rose-500 text-white border-2 border-white animate-bounce z-10 shadow-md font-black leading-none ${
                      item.alertCount.length > 1 ? 'h-5 min-w-[20px] px-1 text-[8px]' : 'h-5 w-5 text-[10px]'
                    }`}>
                      {item.alertCount}
                    </span>
                  )}
                  {item.icon}
                </div>
                <div className="text-center mt-1">
                  <span className={`text-[10px] md:text-sm font-black block leading-none ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'}`}>{item.label} {item.count !== null && `(${item.count})`}</span>
                  <span className="text-[8px] md:text-[9px] font-bold opacity-40 uppercase mt-1 block">{item.sub}</span>
                </div>
              </button>
            ))}

            <div className="w-[1px] bg-slate-100 hidden md:block mx-1" />

            <Link href="/seller/one-pager" className="flex flex-col items-center gap-1.5 p-2 md:p-3 group transition-all duration-300 snap-center min-w-[70px] md:min-w-0 hover:scale-105">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-2xl flex items-center justify-center shadow-md ${!isOnePagerCompleted ? 'bg-rose-50 text-rose-500 animate-pulse border border-rose-200' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'} transition-colors`}>
                <FileText size={22} />
              </div>
              <div className="text-center mt-1">
                <span className={`text-[10px] md:text-sm font-black block leading-tight ${!isOnePagerCompleted ? 'text-rose-500' : 'text-slate-500 group-hover:text-indigo-600'}`}>
                  {t.seller.nav.onePager}<br />
                  {!isOnePagerCompleted ? t.seller.nav.onePagerNeeded : t.seller.nav.onePagerManage}
                </span>
                <span className="text-[8px] md:text-[9px] font-bold opacity-40 uppercase mt-1 block">(ONE-PAGER)</span>
              </div>
            </Link>
          </div>
        </header>

        {/* ─ 메인 콘텐츠 영역 ─ */}
        <main className="min-h-[500px]">

          {/* ── [프로필 설정] 섹션 ── */}
          {expandedSection === 'profile' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
              <div className="bg-white p-5 md:p-12 rounded-[30px] md:rounded-[45px] shadow-xl border border-white">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10 border-b border-slate-100 pb-6 md:pb-8">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 bg-slate-900 rounded-[18px] md:rounded-3xl flex items-center justify-center text-white shadow-xl">
                      <UserIcon size={28} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <h3 className="text-lg md:text-2xl font-black text-slate-800 truncate">
                          [{myDisplayCompanyName}] {myDisplayName}{isEn ? "" : " 님"}
                        </h3>
                        {user.isMaster
                          ? <span className="w-fit px-2.5 py-1 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black rounded-md flex items-center gap-1 shadow-md shadow-indigo-100"><ShieldCheck size={12} /> MASTER</span>
                          : <span className="w-fit px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] md:text-[10px] font-black rounded-md flex items-center gap-1"><Users size={12} /> MEMBER</span>
                        }
                      </div>
                      <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-widest truncate">
                        {myDisplayJobTitle} | Account Settings
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-10">

                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <UserIcon size={14} /> {isEn ? "Personal Info" : "개인 정보"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <Mail size={12} /> {isEn ? "Email" : "로그인 이메일"}
                          <span className="text-rose-400 font-bold">*{isEn ? "Read Only" : "수정불가"}</span>
                        </p>
                        <input defaultValue={user.email} disabled
                          className="w-full p-3.5 md:p-4 rounded-[16px] md:rounded-2xl border text-sm font-bold bg-slate-100 border-transparent text-slate-400 cursor-not-allowed" />
                        <input type="hidden" name="email" value={user.email} />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <UserIcon size={12} /> {isEn ? "Full Name (KR)" : "이름 (국문)"}
                        </p>
                        <input name="name" defaultValue={user.name} required
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <UserIcon size={12} /> {isEn ? "Full Name (EN)" : "영문 이름"}
                        </p>
                        <input name="nameEn" defaultValue={user.nameEn}
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Phone size={12} /> {isEn ? "Phone" : "연락처"}
                        </p>
                        <input name="phone" value={editPhone} onChange={handleSellerPhoneChange}
                          maxLength={13} required
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Check size={12} /> {isEn ? "Job Title (KR)" : "직함 (국문)"}
                        </p>
                        <input name="jobTitle" defaultValue={user.jobTitle} required
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Check size={12} /> {isEn ? "Job Title (EN)" : "직함 (영문)"}
                        </p>
                        <input name="jobTitleEn" defaultValue={user.jobTitleEn}
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          {isEn ? "New Password" : "새 비밀번호"}
                        </p>
                        <input name="password" type="password" placeholder="8+ characters"
                          value={editPassword} onChange={e => setEditPassword(e.target.value)}
                          className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${editPassword.length > 0 && editPassword.length < 8
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-transparent focus:bg-white focus:border-indigo-500'
                            }`} />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          {isEn ? "Confirm Password" : "비밀번호 확인"}
                        </p>
                        <input name="confirmPassword" type="password" placeholder="Re-enter password"
                          value={editConfirmPassword} onChange={e => setEditConfirmPassword(e.target.value)}
                          className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${editConfirmPassword && editPassword !== editConfirmPassword
                            ? 'border-rose-500 bg-rose-50'
                            : 'border-transparent focus:bg-white focus:border-indigo-500'
                            }`} />
                      </div>

                      <div className="flex flex-col space-y-2 md:col-span-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Globe size={12} /> LinkedIn
                        </p>
                        <input name="linkedinUrl" defaultValue={user.linkedinUrl}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all" />
                      </div>

                      <div className="flex flex-col space-y-2 md:col-span-2">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <Handshake size={12} /> {isEn ? "Preferred Partners & Industries" : "관심 파트너 및 업종"}
                          {!user.isMaster && (
                            <span className="text-rose-400 font-bold">*{isEn ? "Master Only" : "마스터 전용"}</span>
                          )}
                        </p>
                        <textarea name="preferredPartners" defaultValue={user.preferredPartners || ""}
                          readOnly={!user.isMaster}
                          placeholder={isEn ? "Preferred partner conditions or industries" : "선호하는 파트너 조건이나 업종"}
                          className={`w-full p-4 md:p-5 rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all resize-none h-24 ${user.isMaster
                            ? 'bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none'
                            : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed outline-none'
                            }`} />
                      </div>

                      <div className="flex flex-col space-y-3 md:col-span-2 pt-2 border-t border-slate-100">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                          <Target size={12} /> {isEn ? "User Type" : "기업 분류"}
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
                            <label key={v} className={`flex-1 min-w-[60px] text-center p-3 md:p-4 rounded-[16px] cursor-pointer text-xs md:text-sm font-black transition-all border ${!user.isMaster ? "opacity-50 cursor-not-allowed" : ""
                              } ${editSelectedType === v
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                                : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                              }`}>
                              <input type="radio" name="userType" value={v} className="hidden"
                                checked={editSelectedType === v}
                                onChange={(e) => { if (user.isMaster) setEditSelectedType(e.target.value); }}
                                disabled={!user.isMaster} />
                              {v}
                            </label>
                          ))}
                        </div>
                        {(editSelectedType === "기타" || editSelectedType === "Other") && (
                          <input name="userTypeDetail" type="text"
                            placeholder={isEn ? "Enter type detail" : "세부 유형 입력"}
                            required value={editUserTypeDetail}
                            onChange={(e) => { if (user.isMaster) setEditUserTypeDetail(e.target.value); }}
                            readOnly={!user.isMaster}
                            className={`w-full p-4 mt-2 rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${user.isMaster
                              ? 'bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none'
                              : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed outline-none'
                              }`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {user.isMaster && (
                    <div>
                      <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-indigo-50 pb-3">
                        <Building2 size={14} /> {isEn ? "Company Info — Master Only" : "회사 공통 정보 (마스터 전용)"}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Company (KR)" : "회사명 (국문)"}
                          </p>
                          <input name="companyName" defaultValue={user.companyName} required
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Company (EN)" : "회사명 (영문)"}
                          </p>
                          <input name="companyNameEn" defaultValue={user.companyNameEn}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "CEO (KR)" : "대표자 (국문)"}
                          </p>
                          <input name="ceoNameKo" defaultValue={user.ceoNameKo}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "CEO (EN)" : "대표자 (영문)"}
                          </p>
                          <input name="ceoNameEn" defaultValue={user.ceoNameEn}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Industry Sector" : "업종 분야"}
                          </p>
                          <div className="relative group">
                            <select
                              name="industrySector"
                              defaultValue={user.industrySector || user.onePager?.industrySector || ""}
                              className="w-full p-3.5 md:p-4 pr-12 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-[16px] text-sm font-bold transition-all appearance-none cursor-pointer text-slate-700 hover:border-indigo-300">
                              <option value="" disabled>{isEn ? "Select industry" : "산업 분야 선택"}</option>
                              {industryOptions.map(opt => (
                                <option key={opt.ko} value={opt.ko}>{isEn ? opt.en : opt.ko}</option>
                              ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Year Founded" : "설립연도"}
                          </p>
                          <input name="yearFounded"
                            defaultValue={user.yearFounded || user.onePager?.yearFounded}
                            placeholder="e.g. 2020"
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Investment Stage" : "투자 단계"}
                          </p>
                          <input name="investmentStage"
                            defaultValue={user.investmentStage || user.onePager?.investmentStage}
                            placeholder="e.g. Series A"
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Primary Tech" : "핵심 기술"}
                          </p>
                          <input name="primaryTech"
                            defaultValue={user.primaryTech || user.onePager?.primaryTech}
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Primary Activity Region" : "기본 활동 권역"}
                          </p>
                          <div className="relative group">
                            <select
                              name="primaryRegion"
                              defaultValue={user.primaryRegion || ""}
                              className="w-full p-3.5 md:p-4 pr-12 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-[16px] text-sm font-bold transition-all appearance-none cursor-pointer text-slate-700 hover:border-indigo-300">
                              <option value="" disabled>{isEn ? "Select region" : "권역 선택"}</option>
                              {regionOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{isEn ? opt.en : opt.ko}</option>
                              ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Secondary Activity Region" : "추가 활동 권역"}
                          </p>
                          <div className="relative group">
                            <select
                              name="secondaryRegion"
                              defaultValue={user.secondaryRegion || ""}
                              className="w-full p-3.5 md:p-4 pr-12 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none rounded-[16px] text-sm font-bold transition-all appearance-none cursor-pointer text-slate-700 hover:border-indigo-300">
                              <option value="">{isEn ? "None" : "추가 권역 없음"}</option>
                              {regionOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{isEn ? opt.en : opt.ko}</option>
                              ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 md:col-span-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {isEn ? "Business Number" : "사업자등록번호"}
                          </p>
                          <input name="businessNumber" defaultValue={user.businessNumber || ""}
                            placeholder="000-00-00000"
                            className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] border text-sm font-bold transition-all" />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      isPending ||
                      (editPassword.length > 0 && editPassword !== editConfirmPassword) ||
                      (editPassword.length > 0 && editPassword.length < 8)
                    }
                    className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[30px] font-black text-base md:text-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl mt-2 disabled:opacity-50 disabled:hover:bg-slate-900"
                  >
                    {isPending ? <Clock className="animate-spin" size={20} /> : <Save size={20} />}
                    {t.seller.profile.saveBtn}
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* ── [팀 관리] 섹션 ── */}
          {expandedSection === 'team' && user.isMaster && (
            <section className="bg-white p-5 md:p-12 rounded-[30px] md:rounded-[45px] shadow-xl border border-white animate-in fade-in duration-500 text-left w-full">
              <div className="flex flex-col mb-8 md:mb-10 border-b border-slate-50 pb-6 md:pb-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3 flex-wrap">
                  <ShieldCheck className="text-indigo-600" size={28} />
                  {t.seller.team.title}
                  <span className="px-2 md:px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] md:text-[10px] font-black rounded-md md:rounded-lg">Master Console</span>
                </h3>
                <p className="text-xs md:text-sm font-bold text-slate-400 mt-2 ml-1 leading-relaxed break-keep">
                  {isEn ? "Approve or reject members requesting to join the organization." : "조직에 가입을 신청한 멤버를 승인하거나, 반려하여 접근을 제한할 수 있습니다."}
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">

                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <p className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} /> {t.seller.team.pendingTitle} <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md">{pendingMembers.length}</span>
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
                            <p className="font-black text-sm text-slate-800 truncate">
                              {displayName(m)} <span className="text-indigo-500 ml-1 text-xs">({displayJobTitle(m)})</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            disabled={processingMemberId !== null}
                            onClick={async () => {
                              const reason = window.prompt(isEn ? "Please enter the rejection reason. (Optional)" : "거절 사유를 입력해주세요. (선택사항)");
                              if (reason !== null) {
                                setProcessingMemberId(m.id);
                                await handleMemberStatus(m.id, "REJECTED", reason);
                                setProcessingMemberId(null);
                              }
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            {processingMemberId === m.id ? (isEn ? "Processing..." : "처리중") : t.seller.team.rejectBtn}
                          </button>

                          <button
                            disabled={processingMemberId !== null}
                            onClick={async () => { 
                              setProcessingMemberId(m.id); 
                              await handleMemberStatus(m.id, "APPROVED"); 
                              setProcessingMemberId(null); 
                            }}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            {processingMemberId === m.id && <RefreshCw size={14} className="animate-spin" />}
                            {processingMemberId === m.id ? (isEn ? "Processing..." : "승인 중...") : t.seller.team.approveBtn}
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {rejectedTeamMembers.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4 md:mb-6">
                        <p className="text-[11px] md:text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                          <Ban size={16} /> {t.seller.team.rejectedTitle} <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md">{rejectedTeamMembers.length}</span>
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
                      <Users size={16} /> {t.seller.team.membersTitle} <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{approvedMembers.length}</span>
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
                            if (confirm(isEn
                              ? `[Warning] Transfer master role to ${displayName(m)}?\nYou will be demoted to a regular member.`
                              : `[주의] ${displayName(m)}에게 마스터 권한을 이관하겠습니까?\n권한을 이임하면 본인은 일반 조직원으로 강등됩니다.`
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

          {/* ── [A] 매칭 검색 (AVAILABLE) 섹션 ── */}
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
                      {isEn ? "Wait! Please complete the One-Pager before applying." : "잠깐! 미팅을 신청하기 전에 원페이퍼를 먼저 작성해주세요."}
                    </p>
                    <p className="text-xs md:text-sm font-bold text-rose-700 mt-1.5 leading-relaxed break-keep">
                      {isEn ? "Without company info, rejection risk is very high. Don't miss the chance." : "바이어 측에 공유할 기업 정보가 없어, 신청하더라도 검토 없이 거절될 확률이 매우 높습니다. 소중한 매칭 기회를 놓치지 마세요."}
                    </p>
                  </div>
                  <Link href="/seller/one-pager" className="w-full md:w-auto whitespace-nowrap px-6 py-3.5 bg-rose-500 text-white text-sm font-black rounded-[16px] hover:bg-rose-600 transition-colors shadow-md text-center">
                    {isEn ? "Fill out now" : "지금 작성하기"}
                  </Link>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                    {t.seller.available.title}
                    <span className="text-sm text-slate-400 font-bold uppercase ml-2 tracking-widest">(AVAILABLE)</span>
                  </h2>
                  {!aiSearchMode && (
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      {isEn
                        ? `${groupedSlots.length} companies · ${availableSlots.length} total slots`
                        : `${groupedSlots.length}개 기업 · 총 ${availableSlots.length}개 슬롯`
                      }
                    </p>
                  )}
                </div>

                {!aiSearchMode && (
                  <div className="flex items-center gap-2 bg-white rounded-[14px] p-1 border border-slate-100 shadow-sm self-start md:self-auto">
                    <button
                      onClick={() => setGroupedView(true)}
                      className={`px-4 py-2 rounded-[10px] text-xs font-black transition-all flex items-center gap-1.5 ${groupedView ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Building2 size={13} />
                      {isEn ? "By Company" : "회사별"}
                    </button>
                    <button
                      onClick={() => setGroupedView(false)}
                      className={`px-4 py-2 rounded-[10px] text-xs font-black transition-all flex items-center gap-1.5 ${!groupedView ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <FileText size={13} />
                      {isEn ? "Table" : "목록"}
                    </button>
                  </div>
                )}
              </div>

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
                  <Sparkles size={13} /> {t.seller.available.aiSearch}
                </button>
              </div>

              {aiSearchMode && (
                <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[30px] shadow-sm border border-emerald-100 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Sparkles className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
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
                      {aiLoading ? <Clock className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      <span className="hidden md:inline">{aiLoading ? (isEn ? "Analyzing..." : "분석 중..") : t.seller.available.aiSearch}</span>
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
                  isMatched={(companyName) => true}
                  onViewOnePager={(companyName) => {
                    const dummySlot = { buyer: { companyName } };
                    handleOpenApplyModal(dummySlot);
                  }}
                  onePagerLabel={t.seller.available.applyBtn}
                />
              )}

              {/* 그룹뷰 */}
              {!aiSearchMode && groupedView && (
                <div className="space-y-4">
                  {groupedSlots.length === 0 ? (
                    <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-500 font-bold text-sm md:text-base">{t.seller.available.noSlots}</p>
                    </div>
                  ) : (
                    groupedSlots.map(({ companyName: cName, slots }) => (
                      <GroupedSlotCard
                        key={cName}
                        companyName={cName}
                        slots={slots}
                        user={user}
                        isEn={isEn}
                        onApply={handleOpenApplyModal}
                        displayCompanyName={displayCompanyName}
                        displayName={displayName}
                        displayJobTitle={displayJobTitle}
                        formatDateWithDay={formatDateWithDay}
                        formatTime24And12={formatTime24And12}
                        t={t}
                      />
                    ))
                  )}
                </div>
              )}

              {/* 테이블뷰 */}
              {!aiSearchMode && !groupedView && (
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
                          <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[120px]">
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
                                    <Building2 size={20} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-sm text-slate-800 truncate">
                                        {displayCompanyName(slot.buyer)}
                                      </h4>
                                      <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md font-bold">{slot.buyer?.userType}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 truncate">
                                      <UserIcon size={10} className="inline mr-1" />
                                      {displayName(slot.buyer)}{displayJobTitle(slot.buyer) ? ` (${displayJobTitle(slot.buyer)})` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 max-w-[280px]">
                                <p className="text-xs text-slate-500 font-medium truncate italic">
                                  "{slot.buyer?.preferredPartners || (isEn ? "Open to all industries" : "전 분야 가능")}"
                                </p>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-xs font-black text-slate-700">{formatDateWithDay(slot.startTime)}</p>
                                <p className="text-[11px] font-bold text-slate-500 mt-1">{formatTime24And12(slot.startTime)}</p>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-1.5">
                                  <MapPin size={14} className="text-rose-400 shrink-0" />
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                                    {slot.location || (isEn ? "TBD" : "미정 (행사장 내 안내 예정)")}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right min-w-[120px]">
                                <div className="flex flex-col items-end gap-2.5">
                                  {colleagueMeeting && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                                      <Users size={12} /> {t.seller.available.duplicateWarning}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleOpenApplyModal(slot)}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                  >
                                    <Send size={12} />
                                    <span className="whitespace-nowrap">{t.seller.available.applyBtn}</span>
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

          {/* ── [B] 신청 현황 (PENDING) 섹션 ── */}
          {expandedSection === 'pending' && (
            <section className="space-y-6 md:space-y-10 px-1 md:px-2 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.seller.pending.title}</h2>
                <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(PENDING STATUS)</p>
              </div>

              {pendingMeetings.length === 0 ? (
                <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center max-w-4xl mx-auto">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Clock size={32} />
                  </div>
                  <p className="text-slate-500 font-bold text-sm md:text-base">{t.seller.pending.noPending}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pendingMeetings.map((m: any) => (
                    <div key={m.id} className="bg-white rounded-[24px] border border-blue-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                      {/* 카드 헤더 */}
                      <div className="p-5 border-b border-blue-50 bg-blue-50/30 flex justify-between items-start">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                            <Building2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-base md:text-lg truncate">
                              {displayCompanyName(m.buyer)}
                            </h4>
                            <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                              <UserIcon size={12} /> {m.pic ? ((isEn && m.pic.nameEn) ? m.pic.nameEn : m.pic.name) : (displayName(m.buyer) || "-")}
                              {m.pic && <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md border border-blue-100 ml-1 font-black">PIC</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2.5 shrink-0 ml-2">
                          {/* ── 숫자 카운트 채팅 알림 배지 (LinkedIn 메시지 버튼 스타일) ── */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedChatMeeting(m); }}
                            className={`relative px-3 h-9 rounded-xl shadow-sm border transition-colors flex items-center justify-center shrink-0 gap-1.5 ${unreadMeetings.includes(m.id) ? 'bg-rose-500 border-rose-600 text-white animate-[pulse_2s_infinite] shadow-rose-200' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                          >
                            <MessageCircle size={18} />
                            {unreadMeetings.includes(m.id) && (
                              <span className="text-[10px] font-black">{isEn ? 'New Message' : '새 메시지'}</span>
                            )}
                          </button>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                              {t.seller.pending.reviewing}
                            </span>
                            {m.meetingType === "DIRECT_REQUEST" && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-amber-200">
                                DIRECT PROPOSE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col gap-4">
                        {/* ── 신청 메시지 (Proposal) — LinkedIn InMail / Upwork 스타일: 메시지 우선 배치 ── */}
                        {m.proposal && (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 p-4 rounded-2xl border border-blue-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                              <FileText size={12} /> {isEn ? "My Proposal" : "보낸 제안 메시지"}
                            </p>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3">
                              &ldquo;{m.proposal}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* ── 일정 정보 ── */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} /> {isEn ? "Applied Schedule" : "신청 일정"}
                          </p>
                          {m.timeSlot?.status === "TBD" ? (
                            <p className="text-sm font-bold text-slate-700">{isEn ? "TBD (To be determined)" : "미정 (추후 협의)"}</p>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-slate-700">{formatDateWithDay(m.timeSlot?.startTime)}</p>
                              <p className="text-xs font-bold text-slate-500">{formatTime24And12(m.timeSlot?.startTime)}</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="px-5 pb-5 mt-auto">
                        <div className="bg-slate-50 text-slate-600 text-[11px] font-semibold p-4 rounded-[16px] leading-relaxed border border-slate-100">
                          {t.seller.pending.statusInfo}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── [C] 확정 일정 (CONFIRMED) 섹션 ── */}
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
                    <Handshake size={32} />
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
                            <Building2 size={24} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-lg md:text-xl truncate">
                              {displayCompanyName(m.buyer)}
                            </h4>
                            <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1 truncate">
                              <UserIcon size={12} /> {m.pic ? ((isEn && m.pic.nameEn) ? m.pic.nameEn : m.pic.name) : (displayName(m.buyer) || "-")}
                              {m.pic && <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-100 ml-1">PIC</span>}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col gap-5 bg-gradient-to-b from-transparent to-emerald-50/30">
                        <div className="flex justify-between items-center w-full">
                          <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-sm shadow-emerald-200 flex items-center gap-1.5 w-fit">
                            <CheckCircle2 size={14} /> {t.seller.confirmed.matchConfirmed}
                          </span>
                          {/* ── 숫자 카운트 채팅 알림 배지 (LinkedIn 스타일) ── */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedChatMeeting(m); }}
                            className={`relative px-3 h-10 rounded-2xl shadow-sm border transition-colors flex items-center justify-center shrink-0 gap-1.5 ${unreadMeetings.includes(m.id) ? 'bg-rose-500 border-rose-600 text-white shadow-rose-200 animate-[pulse_2s_infinite]' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                          >
                            <MessageCircle size={20} />
                            {unreadMeetings.includes(m.id) && (
                              <span className="text-[11px] font-black">{isEn ? 'New Message' : '새 메시지'}</span>
                            )}
                          </button>
                        </div>

                        <div className="space-y-2 bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm">
                          {m.timeSlot?.status === "TBD" ? (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Calendar size={16} className="text-emerald-500" />
                              <span className="text-sm font-bold">{isEn ? "TBD (To be determined)" : "일정 미정 (추후 시간 협의)"}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-slate-700">
                                <Calendar size={16} className="text-emerald-500" />
                                <span className="text-sm font-bold">{formatDateWithDay(m.timeSlot.startTime)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-700">
                                <Clock size={16} className="text-emerald-500" />
                                <span className="text-sm font-bold">{formatTime24And12(m.timeSlot.startTime)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex items-center gap-2 text-slate-700 pt-2 mt-2 border-t border-slate-100">
                            <MapPin size={16} className="text-rose-400" />
                            <span className="text-sm font-bold">{m.location || (isEn ? "TBD" : "미정 (행사장 내 안내 예정)")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── [D] 거절 이력 (REJECTED) 섹션 ── */}
          {expandedSection === 'rejected' && (
            <section className="space-y-6 md:space-y-10 px-1 md:px-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.seller.rejected.title}</h2>
                <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(REJECTED MEETINGS)</p>
              </div>

              {rejectedMeetings.length === 0 ? (
                <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center max-w-4xl mx-auto">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <XCircle size={32} />
                  </div>
                  <p className="text-slate-500 font-bold text-sm md:text-base">{t.seller.rejected.noRejected}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {rejectedMeetings.map((m: any, idx: number) => {
                    const isExpired = m.rejectionReason === 'EXPIRED_SCHEDULE';
                    const isNewRejected = idx >= rejectedMeetings.length - frozenNewRejectedCount;
                    const rejectionText = isExpired
                      ? (isEn ? 'Automatically rejected — meeting time has passed.' : '일정이 지나 자동 처리된 미팅입니다.')
                      : (m.rejectionReason || t.seller.rejected.noReason);

                    return (
                    <div key={m.id} className={`bg-white rounded-[24px] border shadow-sm overflow-hidden flex flex-col transition-all ${isExpired ? 'border-amber-200' : 'border-rose-100'} ${isNewRejected ? 'ring-2 ring-rose-400 ring-offset-2 hover:shadow-lg' : 'hover:shadow-md'}`}>
                      <div className={`p-5 border-b flex justify-between items-start ${isExpired ? 'bg-amber-50/40 border-amber-50' : 'bg-rose-50/30 border-rose-50'}`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-10 h-10 bg-white rounded-xl shadow-sm border flex items-center justify-center shrink-0 ${isExpired ? 'border-amber-200 text-amber-500' : 'border-rose-100 text-rose-500'}`}>
                            <Building2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-base md:text-lg truncate">
                              {displayCompanyName(m.buyer)}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                              <UserIcon size={10} /> {m.pic ? ((isEn && m.pic.nameEn) ? m.pic.nameEn : m.pic.name) : (displayName(m.buyer) || "-")}
                              {m.pic && <span className="text-[9px] font-black bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-100 ml-1 uppercase">PIC</span>}
                            </p>
                          </div>
                        </div>
                        {isExpired ? (
                          <div className="flex items-center gap-2 ml-2">
                            {isNewRejected && (
                              <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse shadow-md shadow-amber-200 shrink-0">NEW</span>
                            )}
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1">
                              <Clock size={10}/> EXPIRED
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 ml-2">
                            {isNewRejected && (
                              <span className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse shadow-md shadow-rose-200 shrink-0">NEW</span>
                            )}
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0">REJECTED</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} /> {isEn ? "Schedule" : "일정"}
                          </p>
                          {m.timeSlot?.status === "TBD" ? (
                            <p className="text-sm font-bold text-slate-700">{isEn ? "TBD" : "미정"}</p>
                          ) : (
                            <p className="text-sm font-bold text-slate-700">{formatDateWithDay(m.timeSlot?.startTime)}</p>
                          )}
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-100">
                          <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 ${isExpired ? 'text-amber-500' : 'text-rose-400'}`}>
                            <AlertCircle size={12} /> {t.seller.rejected.reason}
                          </p>
                          <div className={`text-[13px] font-semibold p-4 rounded-[16px] leading-relaxed italic border break-keep ${
                            isExpired
                              ? 'bg-amber-50/50 text-amber-700 border-amber-100/50'
                              : 'bg-rose-50/50 text-rose-700 border-rose-100/50'
                          }`}>
                            "{rejectionText}"
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </main>{/* ← </main> 정상 닫힘 */}
      </div>{/* ← relative z-10 wrapper 정상 닫힘 */}

      {/* ── 미팅 신청 모달 (PIC 선택 포함) ── */}
      {applyingSlot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20 max-h-[90vh]">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 md:px-8 py-6 md:py-8 flex justify-between items-center text-white relative overflow-hidden shrink-0">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0 shadow-lg">
                    <Send size={24} className="text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-black tracking-tight leading-tight truncate">{t.seller.applyModal.title}</h3>
                    <p className="text-[9px] md:text-[10px] text-blue-300 font-black tracking-[0.2em] uppercase mt-1 opacity-70">New Meeting Request</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setApplyingSlot(null); setSelectedPicId(null); }}
                className="ml-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all relative z-10 border border-white/10 hover:scale-105 active:scale-95 shrink-0"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-7 overflow-y-auto overflow-x-hidden custom-scrollbar">
              {/* 바이어 정보 카드 */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-md border border-slate-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Building2 size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[19px] font-black text-slate-900 mb-1 truncate tracking-tight">
                      {displayCompanyName(applyingSlot.buyer)}
                    </h4>
                    <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-flex border border-blue-100/50 whitespace-nowrap shrink-0 uppercase tracking-wider">{applyingSlot.buyer?.userType || "BUYER"}</p>
                  </div>
                </div>

                {applyingSlots.length > 1 ? (
                  <div className="mt-2 space-y-2.5">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Calendar size={13} /> <span className="whitespace-nowrap">{isEn ? "Select a slot" : "일정 선택"}</span>
                    </p>
                    <div className="flex flex-col gap-3 pb-8">
                      {applyingSlots.map((slot) => (
                        <label
                          key={slot.id}
                          className={`flex items-start gap-4 p-5 md:p-6 rounded-[32px] border-2 transition-all cursor-pointer relative group overflow-hidden ${selectedSlotId === slot.id
                              ? "bg-blue-50/40 border-blue-600 shadow-xl shadow-blue-100/30"
                              : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"
                            }`}
                        >
                          <div className="mt-[3px] flex items-center justify-center shrink-0">
                            <input
                              type="radio"
                              name="slotSelect"
                              checked={selectedSlotId === slot.id}
                              onChange={() => {
                                setSelectedSlotId(slot.id);
                                setApplyingSlot(slot);
                                if (slot.id !== -1) {
                                  setSelectedPicId(slot.buyerId);
                                  setIsPicLocked(true);
                                } else {
                                  setSelectedPicId(null);
                                  setIsPicLocked(false);
                                }
                              }}
                              className="peer absolute w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${selectedSlotId === slot.id ? "border-blue-600 bg-blue-600 scale-110" : "border-slate-200 bg-white group-hover:border-slate-300"
                              }`}>
                              {selectedSlotId === slot.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1.5">
                              <p className={`text-[14px] md:text-[15px] font-black leading-snug tracking-tight ${selectedSlotId === slot.id ? "text-slate-900" : "text-slate-700"}`}>
                                {slot.startTime ? formatDateWithDay(slot.startTime) : (isEn ? "Flexible Timing" : "다이렉트 미팅 (시간 협의)")}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                                  <Clock size={12} className="text-slate-300" />
                                  {slot.startTime ? formatTime24And12(slot.startTime) : (isEn ? "Open schedule" : "일정 추후 결정")}
                                </p>
                                {slot.id !== -1 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100/30 min-w-0">
                                    <MapPin size={10} className="shrink-0" />
                                    <span className="truncate">{slot.location || (isEn ? "TBD" : "미정")}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <p className="text-sm font-bold text-slate-700">
                      {applyingSlot.startTime ? formatDateWithDay(applyingSlot.startTime) : (isEn ? "TBD (Time to be determined)" : "미정 (추후 시간 협의)")}
                    </p>
                    {applyingSlot.startTime && (
                      <p className="text-xs font-bold text-slate-500">{formatTime24And12(applyingSlot.startTime)}</p>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={onApply} className="space-y-5">
                <input type="hidden" name="slotId" value={selectedSlotId || -1} />
                <input type="hidden" name="buyerId" value={applyingSlot.buyerId || applyingSlot.buyer?.id || -1} />
                <input type="hidden" name="buyerCompanyName" value={applyingSlot.buyer?.companyName || ""} />
                <input type="hidden" name="picId" value={selectedPicId || ""} />

                <div className="bg-blue-50/50 rounded-[20px] p-5 border border-blue-100">
                  {buyerMembersLoading ? (
                    <div className="flex items-center gap-3 py-2">
                      <Clock className="animate-spin text-blue-400" size={16} />
                      <span className="text-sm font-bold text-slate-400">
                        {isEn ? "Loading team members..." : "담당자 목록 불러오는 중.."}
                      </span>
                    </div>
                  ) : (
                    <PicSelector
                      buyerMembers={buyerMembers}
                      selectedPicId={selectedPicId}
                      onSelect={setSelectedPicId}
                      isEn={isEn}
                      masterUser={buyerMasterUser}
                      disabled={isPicLocked}
                    />
                  )}
                  {buyerMembers.length === 0 && !buyerMembersLoading && (
                    <div className="flex items-center gap-2.5 py-1">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <UserIcon size={14} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-600">
                          {isEn ? "Auto-assign to Master" : "마스터에게 자동 배정"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {isEn ? "No team member info available." : "담당자 정보를 불러올 수 없습니다."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

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
                  {isPending ? <Clock className="animate-spin" size={20} /> : <Send size={20} />}
                  {isPending ? t.seller.applyModal.submitting : t.seller.applyModal.submitBtn}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Meeting Chat Modal ── */}
      {selectedChatMeeting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedChatMeeting(null)} />
          <div className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-[450px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <MessageCircle className="text-indigo-500" size={24} />
                {isEn ? "Meeting Chat" : "미팅방"}
              </h3>
              <button onClick={() => setSelectedChatMeeting(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors active:scale-95">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-6 bg-white">
              <MeetingChat meetingId={selectedChatMeeting.id} currentUser={user} isEn={isEn} meeting={selectedChatMeeting} />
            </div>
          </div>
        </div>
      )}

      {/* 스크롤바 CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}} />

    </div>
  );
}