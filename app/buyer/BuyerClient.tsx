"use client";
import { useI18n } from "@/lib/i18n"; // i18n 훅 임포트
import { isCompanyMatch } from "@/lib/matchUtils";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  handleStatusAction, 
  requestLocationChange, 
  createSlotAction, 
  updateSlotAction,
  deleteSlotAction
} from "./actions";
import { updateProfileAction } from "../profile/action";
import { 
  MapPin, Clock, Plus, X, Phone, Download, Mail, FileText, 
  Building2, Target, Lightbulb, TrendingUp, Briefcase, Sparkles, Search, 
  BarChart3, ChevronRight, PieChart, UserCheck, Save, User as UserIcon, Calendar, Settings, Handshake, Globe, Award,
  CheckCircle2, AlertCircle, Info, Rocket, Bell, Check, XCircle, FileSearch, ArrowRight, Activity, Zap,
  Users, ShieldCheck, Edit2, Trash2, Inbox,
  LayoutList, LayoutGrid
} from "lucide-react";
import * as XLSX from 'xlsx';
import React from "react";

export default function BuyerClient({ mySlots = [], confirmedMeetings = [], allSellers = [], buyerId, user }: any) {
  // i18n 및 Router 설정
  const { t, locale } = useI18n();
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'directory';

  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [selectedOnePager, setSelectedOnePager] = useState<any>(null);
  
  const [reservationFilter, setReservationFilter] = useState<'PENDING' | 'MATCHED' | 'ALL'>('PENDING');
  const [confirmedFilter, setConfirmedFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL');
  const [reviewingMeeting, setReviewingMeeting] = useState<{ slot: any, meeting: any } | null>(null);
  const [editingSlot, setEditingSlot] = useState<any>(null); 

  const [confirmedViewMode, setConfirmedViewMode] = useState<'table' | 'card'>('table');
  const [reservationViewMode, setReservationViewMode] = useState<'table' | 'card'>('table');

  const [counts, setCounts] = useState({ sellers: 0, confirmed: 0, requests: 0 });
  const [alerts, setAlerts] = useState({ directory: false, confirmed: false, pending: false });

  const [editSelectedType, setEditSelectedType] = useState(
    ["VC", "AC", "바이어", "스타트업", "기타"].includes(user?.userType) ? user?.userType : (user?.userType ? "기타" : "VC")
  );
  const [editUserTypeDetail, setEditUserTypeDetail] = useState(
    !["VC", "AC", "바이어", "스타트업"].includes(user?.userType) && user?.userType ? user.userType : ""
  );
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  // AI 검색 state
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiIsFallback, setAiIsFallback] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setEditPhone(formatted);
  };

  const totalPendingRequests = useMemo(() => {
    return mySlots?.reduce((acc: number, slot: any) => {
      return acc + slot.meetings.filter((m: any) => m.status === 'PENDING').length;
    }, 0) || 0;
  }, [mySlots]);

  const todayString = useMemo(() => {
    const offset = new Date().getTimezoneOffset() * 60000;
    const dateOffset = new Date(Date.now() - offset);
    return dateOffset.toISOString().split("T")[0];
  }, []);

  const formatDateWithDay = (dateString: string) => {
    const d = new Date(dateString);
    const dateLocale = locale === "ko" ? 'ko-KR' : 'en-US';
    const datePart = d.toLocaleDateString(dateLocale, { year: 'numeric', month: 'numeric', day: 'numeric' });
    const dayPart = d.toLocaleDateString(dateLocale, { weekday: 'short' });
    return `${datePart} (${dayPart})`;
  };

  const formatTime24And12 = (dateString: string) => {
    const d = new Date(dateString);
    const dateLocale = locale === "ko" ? 'ko-KR' : 'en-US';
    const time24 = d.toLocaleTimeString(dateLocale, { hour12: false, hour: '2-digit', minute: '2-digit' });
    const time12 = d.toLocaleTimeString(dateLocale, { hour12: true, hour: '2-digit', minute: '2-digit' });
    return `${time24} (${time12})`;
  };

  useEffect(() => { 
    setMounted(true); 
    setCounts({
      sellers: allSellers?.length || 0,
      confirmed: confirmedMeetings?.length || 0,
      requests: mySlots?.reduce((acc: number, slot: any) => acc + (slot.meetings?.length || 0), 0) || 0
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const currentSellers = allSellers?.length || 0;
    const currentConfirmed = confirmedMeetings?.length || 0;
    const currentRequests = mySlots?.reduce((acc: number, slot: any) => acc + (slot.meetings?.length || 0), 0) || 0;
    setAlerts(prev => ({
      directory: prev.directory || currentSellers > counts.sellers,
      confirmed: prev.confirmed || currentConfirmed > counts.confirmed,
      pending: prev.pending || currentRequests > counts.requests
    }));
    setCounts({ sellers: currentSellers, confirmed: currentConfirmed, requests: currentRequests });
  }, [allSellers, confirmedMeetings, mySlots]);

  const handleTabClick = (id: string) => {
    setExpandedSection(id);
    if ((alerts as any)[id]) {
      setAlerts(prev => ({ ...prev, [id]: false }));
    }
  };

  const uniqueSellers = useMemo(() => {
    const map = new Map();
    allSellers.forEach((s: any) => {
      const compName = (s.companyName || s.onePager?.companyNameKr || s.id).trim().toLowerCase();
      if (!map.has(compName)) {
        map.set(compName, { ...s, members: [s] });
      } else {
        const existing = map.get(compName);
        existing.members.push(s);
      }
    });
    return Array.from(map.values());
  }, [allSellers]);

  const stats = useMemo(() => {
    const industries: any = {};
    const stages: any = {};
    uniqueSellers.forEach((s: any) => {
      const ind = s.onePager?.industrySector || "N/A";
      const stg = s.onePager?.investmentStage || "TBD";
      industries[ind] = (industries[ind] || 0) + 1;
      stages[stg] = (stages[stg] || 0) + 1;
    });
    return { industries, stages };
  }, [uniqueSellers]);

  const filteredSellers = useMemo(() => {
    return uniqueSellers.filter((s: any) => {
      const searchTarget = (
        (s.companyName || "") + 
        (s.onePager?.companyNameKr || "") + 
        (s.onePager?.companyNameEn || "") +
        (s.onePager?.productType || "") +
        (s.onePager?.industrySector || "")
      ).toLowerCase();
      const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
      const matchesIndustry = industryFilter === "ALL" || s.onePager?.industrySector === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [searchTerm, industryFilter, uniqueSellers]);

  const filteredReservations = useMemo(() => {
    if (!mySlots) return [];
    return reservationFilter === 'ALL' ? mySlots : 
           reservationFilter === 'PENDING' ? mySlots.filter((s: any) => s.status === 'OPEN') :
           mySlots.filter((s: any) => s.status === 'CLOSED');
  }, [reservationFilter, mySlots]);

  const displayConfirmedMeetings = useMemo(() => {
    if (!confirmedMeetings) return [];
    const now = new Date();
    const processed = confirmedMeetings.map((m: any) => ({
      ...m,
      isPast: new Date(m.timeSlot.startTime) < now
    })).filter((m: any) => {
      if (confirmedFilter === 'UPCOMING') return !m.isPast;
      if (confirmedFilter === 'PAST') return m.isPast;
      return true;
    });
    return processed.sort((a: any, b: any) => {
      const timeA = new Date(a.timeSlot.startTime).getTime();
      const timeB = new Date(b.timeSlot.startTime).getTime();
      return confirmedFilter === 'PAST' ? timeB - timeA : timeA - timeB;
    });
  }, [confirmedMeetings, confirmedFilter]);

  if (!mounted || !user) return null;

  const downloadSellerList = () => {
    const data = uniqueSellers.map((s: any) => ({
      "업체명 (Company Name KR)": s.companyName,
      "업체명 (Company Name EN)": s.onePager?.companyNameEn || "-",
      "산업분야 (Industry Sector)": s.onePager?.industrySector || "-",
      "투자단계 (Investment Stage)": s.onePager?.investmentStage || "-",
      "설립연도 (Year Founded)": s.onePager?.yearFounded || "-",
      "대표자 (CEO Name)": s.onePager?.ceoName || "-",
      "핵심기술 (Primary Tech)": s.onePager?.primaryTech || "-",
      "주요제품/서비스 (Product/Service)": s.onePager?.productType || "-",
      "솔루션 요약 (Solution Summary)": s.onePager?.solutionSummary || "-",
      "시장 문제점 (Problem)": s.onePager?.problem || "-",
      "해결 방안 (Solution)": s.onePager?.solution || "-",
      "성과 지표 (Traction)": s.onePager?.traction || "-",
      "비즈니스 모델 (Business Model)": s.onePager?.bizModel || "-",
      "등록 멤버 수 (Registered Members)": s.members.length,
      "담당자명 (PIC Name)": s.onePager?.picName || s.name || "-",
      "담당자 직함 (Job Title)": s.jobTitle || "-",
      "담당자 이메일 (Email)": s.onePager?.contactEmail || s.email || "-",
      "담당자 연락처 (Phone)": s.phone || "-",
      "홈페이지 (Website)": s.onePager?.websiteUrl || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company_Database");
    XLSX.writeFile(wb, `Company_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadConfirmedMeetings = () => {
    const data = confirmedMeetings.map((m: any) => {
      const meetingDate = new Date(m.timeSlot.startTime);
      return {
        "미팅 일자 (Meeting Date)": meetingDate.toLocaleDateString('ko-KR'),
        "미팅 시간 (Meeting Time)": meetingDate.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        "상태 (Status)": meetingDate < new Date() ? "종료됨 (Completed)" : "예정됨 (Upcoming)",
        "장소 (Location)": m.location || "미지정 (TBD)",
        "업체명 (Company Name)": m.seller.companyName,
        "담당자명 (PIC Name)": m.seller.name,
        "담당자 직함 (Job Title)": m.seller.jobTitle || "-",
        "담당자 이메일 (Email)": m.seller.email,
        "담당자 연락처 (Phone)": m.seller.phone || "-",
        "산업분야 (Industry Sector)": m.seller.onePager?.industrySector || "-",
        "투자단계 (Investment Stage)": m.seller.onePager?.investmentStage || "-",
        "주요제품/서비스 (Product/Service)": m.seller.onePager?.productType || "-",
        "솔루션 요약 (Solution Summary)": m.seller.onePager?.solutionSummary || "-",
        "홈페이지 (Website)": m.seller.onePager?.websiteUrl || "-"
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const wscols = [{wch:15},{wch:15},{wch:18},{wch:15},{wch:25},{wch:20},{wch:15},{wch:30},{wch:50},{wch:15},{wch:15},{wch:25},{wch:20},{wch:30}];
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, "Confirmed_Meetings");
    XLSX.writeFile(wb, `My_Confirmed_Meetings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const res = await updateProfileAction(new FormData(e.currentTarget));
    setIsPending(false);
    if (res.success) {
      alert(locale === "ko" ? "✅ 모든 정보가 성공적으로 업데이트되었습니다." : "✅ All profile info updated.");
      setEditPassword("");
      setEditConfirmPassword("");
    } else {
      alert(res.error || (locale === "ko" ? "수정 중 오류가 발생했습니다." : "Error occurred."));
    }
  };

  const onCreate = async (formData: FormData) => {
    const date = formData.get("date") as string;
    const hour = formData.get("hour") as string;
    const minute = formData.get("minute") as string;
    const selectedDateTime = new Date(`${date}T${hour}:${minute}:00`);
    if (selectedDateTime < new Date()) {
      alert(locale === "ko" ? "🚨 과거 시간으로는 슬롯을 생성할 수 없습니다. 현재 시간 이후를 선택해주세요." : "🚨 You cannot create slots in the past.");
      return;
    }
    if (!confirm(locale === "ko" ? "선택한 시간에 새로운 상담 슬롯을 생성하시겠습니까?" : "Create new slot?")) return;
    setIsPending(true);
    try { 
      const result = await createSlotAction(formData, buyerId);
      if (!result?.success) {
        alert(`🚨 ${result?.error || "슬롯 생성에 실패했습니다."}`);
        return;
      }
      handleTabClick('pending');
      alert(locale === "ko" ? "신규 슬롯이 생성되었습니다." : "Success!");
      router.refresh();
    } finally { setIsPending(false); }
  };

  const handleUpdateSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get("date") as string;
    const hour = formData.get("hour") as string;
    const minute = formData.get("minute") as string;
    const selectedDateTime = new Date(`${date}T${hour}:${minute}:00`);
    if (selectedDateTime < new Date()) {
      alert(locale === "ko" ? "🚨 과거 시간으로 수정할 수 없습니다." : "🚨 Cannot update to past time.");
      return;
    }
    if (!confirm(locale === "ko" ? "해당 예약을 수정하시겠습니까?" : "Update reservation?")) return;
    setIsPending(true);
    try {
      const result = await updateSlotAction(editingSlot.id, formData);
      if (!result?.success) {
        alert(`🚨 ${result?.error || "슬롯 수정에 실패했습니다."}`);
        return;
      }
      setEditingSlot(null);
      alert(locale === "ko" ? "예약이 성공적으로 수정되었습니다." : "Updated.");
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm(locale === "ko" ? "🚨 정말 이 예약을 취소하시겠습니까?\n대기 중인 신청 건이 있다면 모두 자동 거절 처리됩니다." : "Cancel reservation?")) return;
    setIsPending(true);
    try {
      await deleteSlotAction(slotId);
      alert(locale === "ko" ? "예약이 취소되었습니다." : "Cancelled.");
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

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
        body: JSON.stringify({ query: aiQuery, searchRole: "SELLER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Error.");
        return;
      }
      setAiResults(data.results || []);
      setAiIsFallback(data.isFallback || false);
    } catch (e) {
      setAiError("Network error.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveMatch = async (slot: any, meeting: any) => {
    if (!confirm(locale === "ko" ? `${meeting.seller.companyName} 기업의 ${meeting.seller.name}님과 미팅을 최종 확정하시겠습니까?` : "Confirm match?")) return;
    setIsPending(true);
    try {
      await handleStatusAction(Number(meeting.id), Number(slot.id), 'ACCEPT', '');
      setReviewingMeeting(null);
      router.refresh(); 
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  const handleRejectMatch = async (meeting: any) => {
    const defaultReason = locale === "ko" ? "현재 당사의 비즈니스 방향성과 맞지 않아 부득이하게 거절하게 되었습니다." : "Currently not matched.";
    const userReason = prompt(locale === "ko" ? "거절 사유를 입력해주세요." : "Reason?", defaultReason);
    if (userReason === null) return; 
    setIsPending(true);
    try {
      const slotId = reviewingMeeting?.slot?.id;
      await handleStatusAction(Number(meeting.id), Number(slotId), 'REJECT', userReason);
      setReviewingMeeting(null);
      router.refresh();
    } catch (error) {
      alert("Error.");
    } finally {
      setIsPending(false);
    }
  };

  // ─── 뷰 토글 컴포넌트 ───
  const ViewToggle = ({ mode, setMode }: { mode: 'table' | 'card', setMode: (m: 'table' | 'card') => void }) => (
    <div className="flex bg-slate-100 p-1 rounded-[14px] shadow-inner shrink-0">
      <button 
        onClick={() => setMode('table')} 
        title={locale === "ko" ? "테이블 뷰" : "Table View"} 
        className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] font-black transition-all ${mode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutList size={14}/> <span className="hidden sm:inline">{locale === "ko" ? "테이블" : "Table"}</span>
      </button>
      <button 
        onClick={() => setMode('card')} 
        title={locale === "ko" ? "카드 뷰" : "Card View"} 
        className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] font-black transition-all ${mode === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <LayoutGrid size={14}/> <span className="hidden sm:inline">{locale === "ko" ? "카드" : "Card"}</span>
      </button>
    </div>
  );

  const navItems = [
    { id: 'directory', label: t.buyer.nav.directory, sub: 'EXPLORE', icon: <Search size={22}/>, isAlert: alerts.directory, count: uniqueSellers.length },
    { id: 'pending', label: t.buyer.nav.pending, sub: 'STATUS', icon: <Clock size={22}/>, isAlert: alerts.pending, count: totalPendingRequests > 0 ? totalPendingRequests : null },
    { id: 'confirmed', label: t.buyer.nav.confirmed, sub: 'CONFIRMED', icon: <Handshake size={22}/>, isAlert: alerts.confirmed, count: confirmedMeetings.length },
    { id: 'generator', label: t.buyer.nav.generator, sub: 'CREATE', icon: <Plus size={22}/>, isAlert: false, count: null },
    { id: 'analytics', label: t.buyer.nav.analytics, sub: 'INSIGHT', icon: <BarChart3 size={22}/>, isAlert: false, count: null },
    { id: 'profile', label: t.buyer.nav.profile, sub: 'PROFILE', icon: <Settings size={22}/>, isAlert: false, count: null },
  ];

  const aiAvgScore = aiResults.length > 0
    ? Math.round(aiResults.reduce((s: number, r: any) => s + (r.matchScore ?? 0), 0) / aiResults.length)
    : 0;

  return (
    <div className={`w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-10 pb-20 font-pretendard text-[#121926] text-left relative ${isPending ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>

      {/* ── 대기 중 알림 배너 ── */}
      {totalPendingRequests > 0 && expandedSection !== 'pending' && (
        <div className="bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-10 shadow-xl border border-indigo-50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 group transition-all duration-500 hover:shadow-2xl w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-12">
            <div className="w-full md:w-[65%] space-y-4 md:space-y-5">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 shrink-0 shadow-inner">
                  <Activity size={20} className="animate-pulse" />
                </div>
                <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight leading-tight">
                  {locale === "ko" ? (
                    <>새로운 미팅 요청이 <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{totalPendingRequests}건</span> 대기 중입니다.</>
                  ) : (
                    <><span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{totalPendingRequests}</span> meeting requests are pending review.</>
                  )}
                </h3>
              </div>
              <p className="text-[13px] md:text-[15px] text-slate-500 font-bold leading-relaxed break-keep">
                {locale === "ko" ? "유망한 기업들이 바이어님과의 미팅을 기다리고 있습니다. 상대 기업의 원페이저를 검토하고, 최적의 파트너를 선택해주세요." : "Promising companies are waiting to meet you. Review their one-pagers and select the best partner for your business."}
              </p>
            </div>
            <button onClick={() => setExpandedSection('pending')} className="w-full md:w-[35%] shrink-0">
              <div className="bg-slate-900 text-white p-5 md:p-6 rounded-[20px] md:rounded-[24px] flex flex-col items-center justify-center gap-3 hover:bg-indigo-600 transition-all duration-300 shadow-xl hover:shadow-indigo-200/50 hover:-translate-y-1">
                <FileSearch size={28} className="text-indigo-300 mb-1" />
                <span className="font-black text-base md:text-lg">{t.buyer.pending.reviewBtn}</span>
                <span className="text-[11px] md:text-xs text-indigo-200 font-bold flex items-center gap-1">{locale === "ko" ? "예약 관리로 이동" : "Go to Reservations"} <ArrowRight size={12} /></span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── 네비게이션 헤더 ── */}
      <header className="bg-white/90 backdrop-blur-2xl p-3 md:p-6 rounded-[24px] md:rounded-[40px] shadow-lg md:shadow-xl border border-white sticky top-4 z-40 w-full">
        <div className="flex flex-row md:flex-wrap md:justify-center gap-2 md:gap-12 overflow-x-auto snap-x hide-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`relative flex flex-col items-center gap-1.5 p-2 md:p-3 transition-all duration-300 snap-center min-w-[70px] md:min-w-[90px] ${expandedSection === item.id ? 'scale-105 md:scale-110' : ''}`}
            >
              {item.isAlert && (
                <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse z-10 shadow-sm"></span>
              )}
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-2xl flex items-center justify-center shadow-md transition-colors ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-slate-300' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>
                {item.icon}
              </div>
              <div className="text-center mt-1">
                <span className={`text-[10px] md:text-[13px] font-black block leading-none ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {item.label}
                  {item.count !== null && <span className="text-indigo-500 ml-0.5"> ({item.count})</span>}
                </span>
                {locale === 'ko' && (
                  <span className="text-[9px] md:text-[10px] font-bold opacity-40 uppercase mt-1 block">{item.sub}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="min-h-[600px]">

        {/* ── [A] 셀러 탐색 (모바일 카드 가독성 개선) ── */}
        {expandedSection === 'directory' && (
          <section className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">

            {/* 헤더 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.buyer.directory.title}</h2>
                {locale === 'ko' && (
                  <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">({filteredSellers.length} {t.buyer.directory.companiesFound})</p>
                )}
              </div>
              <button onClick={downloadSellerList} className="w-full md:w-auto bg-slate-900 text-white px-5 py-3.5 rounded-[16px] md:rounded-2xl text-[12px] font-black shadow-md md:shadow-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors">
                <Download size={16}/> {t.buyer.directory.downloadBtn}
              </button>
            </div>

            {/* 검색 모드 토글 */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setAiSearchMode(false)}
                className={`px-4 py-2.5 rounded-[12px] text-xs font-black transition-all ${!aiSearchMode ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              >
                {t.buyer.directory.keywordSearch}
              </button>
              <button
                onClick={() => setAiSearchMode(true)}
                className={`px-4 py-2.5 rounded-[12px] text-xs font-black transition-all flex items-center gap-1.5 ${aiSearchMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              >
                <Sparkles size={13}/> {t.buyer.directory.aiSearch}
              </button>
            </div>

            {/* 검색창 */}
            {!aiSearchMode ? (
              <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[30px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.buyer.directory.searchPlaceholder}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[18px] text-sm font-bold outline-none transition-all"
                  />
                </div>
                <select
                  value={industryFilter}
                  onChange={e => setIndustryFilter(e.target.value)}
                  className="w-full md:w-64 px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-[18px] text-sm font-bold text-slate-600 outline-none appearance-none transition-all cursor-pointer"
                >
                  <option value="ALL">{t.buyer.directory.allIndustries}</option>
                  {Object.keys(stats.industries).map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
            ) : (
              <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[30px] shadow-sm border border-indigo-100 flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Sparkles className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" size={18}/>
                    <input
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                      placeholder={t.buyer.directory.aiPlaceholder}
                      className="w-full pl-12 pr-5 py-4 bg-indigo-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[18px] text-sm font-bold outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handleAiSearch}
                    disabled={aiLoading || !aiQuery.trim()}
                    className="px-5 md:px-6 py-4 bg-indigo-600 text-white rounded-[18px] font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-200"
                  >
                    {aiLoading ? <Clock className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                    <span className="hidden md:inline">{aiLoading ? t.buyer.directory.analyzing : t.buyer.directory.aiSearchBtn}</span>
                  </button>
                </div>
                <p className="text-[11px] text-indigo-400 font-bold pl-1">{t.buyer.directory.aiHint}</p>
              </div>
            )}

            {/* AI 로딩 UI */}
            {aiSearchMode && aiLoading && (
              <div className="bg-white rounded-[24px] p-10 flex flex-col items-center gap-5 border border-indigo-100 shadow-sm">
                <div className="relative">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Sparkles size={28} className="text-indigo-500 animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-slate-700">{t.buyer.directory.analyzing}</p>
                  <p className="text-xs text-slate-400 font-bold">{locale === 'ko' ? 'DB 데이터 + 웹 검색을 종합하고 있어요' : 'Combining database & web search insights'}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {["DB 분석", "웹 검색", "매칭 스코어 계산"].map((step, i) => (
                    <span key={step} className="px-3 py-1.5 bg-indigo-50 text-indigo-400 text-[10px] font-black rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 셀러 리스트 (반응형: 모바일 카드, 데스크탑 테이블) */}
            <div className="space-y-4">
              
              {/* [모바일] 카드 뷰: md 미만 노출 */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredSellers.map((seller: any) => (
                  <div 
                    key={seller.id}
                    onClick={() => setSelectedOnePager({ ...seller.onePager, user: seller, members: seller.members })}
                    className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm active:bg-indigo-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0"><Building2 size={20}/></div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-800 truncate">{seller.companyName}</h4>
                          {locale === 'ko' && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate block mt-0.5">{seller.onePager?.companyNameEn || "N/A"}</span>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black whitespace-nowrap">{seller.onePager?.investmentStage || "TBD"}</span>
                    </div>
                    <div className="mb-4">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black whitespace-nowrap">{seller.onePager?.industrySector || "미지정"}</span>
                      <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-2 italic leading-relaxed">
                        {seller.onePager?.solutionSummary ? `"${seller.onePager.solutionSummary}"` : t.buyer.directory.noResults}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                      <div className="text-[10px] font-bold text-slate-400">
                        {locale === "ko" ? "대표" : "CEO"}: {seller.onePager?.ceoName || "-"}
                        {seller.members.length > 1 && <span className="text-indigo-500 ml-2 font-black">+{seller.members.length-1} Team</span>}
                      </div>
                      <div className="text-indigo-600 font-black text-[11px] flex items-center gap-1">
                        {locale === "ko" ? "상세보기" : "Details"} <ChevronRight size={14}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* [데스크탑] 테이블 뷰: md 이상 노출 */}
              <div className="hidden md:block bg-white rounded-[24px] md:rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "회사명" : "Company Name"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "산업 분야" : "Industry Sector"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "투자 단계" : "Investment Stage"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{locale === "ko" ? "솔루션 요약" : "Solution Summary"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">{locale === "ko" ? "멤버/대표" : "PIC/CEO"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSellers.map((seller: any) => (
                        <tr
                          key={seller.id}
                          onClick={() => setSelectedOnePager({ ...seller.onePager, user: seller, members: seller.members })}
                          className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 md:px-6 py-5">
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-[12px] flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Building2 size={20}/>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-sm text-slate-800 truncate">{seller.companyName}</h4>
                                {locale === 'ko' && (
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate block mt-0.5">{seller.onePager?.companyNameEn || "N/A"}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 md:px-6 py-5">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-black whitespace-nowrap">{seller.onePager?.industrySector || "미지정"}</span>
                          </td>
                          <td className="px-5 md:px-6 py-5">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-black whitespace-nowrap">{seller.onePager?.investmentStage || "미정"}</span>
                          </td>
                          <td className="px-5 md:px-6 py-5 max-w-[280px]">
                            <p className="text-xs text-slate-500 font-medium truncate italic">
                              {seller.onePager?.solutionSummary ? `"${seller.onePager.solutionSummary}"` : t.buyer.directory.noResults}
                            </p>
                          </td>
                          <td className="px-5 md:px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400">{locale === "ko" ? "대표" : "CEO"}: {seller.onePager?.ceoName || "-"}</p>
                                {seller.members.length > 1 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 mt-1">
                                    <UserIcon size={10}/> {locale === "ko" ? "멤버" : "Team"} {seller.members.length}명
                                  </span>
                                )}
                              </div>
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0">
                                <ChevronRight size={16}/>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredSellers.length === 0 && (
                <div className="bg-white rounded-[24px] py-16 text-center border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-bold">{t.buyer.directory.noResults}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── [B] 확정 일정 ── */}
        {expandedSection === 'confirmed' && (
          <section className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.buyer.confirmed.title}</h2>
                {locale === 'ko' && (
                  <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(CONFIRMED SCHEDULE)</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-[16px] shadow-inner">
                  {[{id:'ALL',label:t.buyer.confirmed.all},{id:'UPCOMING',label:t.buyer.confirmed.upcoming},{id:'PAST',label:t.buyer.confirmed.past}].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setConfirmedFilter(f.id as any)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-[12px] text-[11px] font-black transition-all ${confirmedFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <ViewToggle mode={confirmedViewMode} setMode={setConfirmedViewMode} />
                  <button
                    onClick={downloadConfirmedMeetings}
                    className="flex-1 sm:flex-none bg-slate-900 text-white px-5 py-2.5 rounded-[14px] text-[11px] font-black shadow-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={14}/> {t.buyer.confirmed.downloadBtn}
                  </button>
                </div>
              </div>
            </div>

            {displayConfirmedMeetings.length === 0 ? (
              <div className="bg-white p-12 md:p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4"><Calendar size={40}/></div>
                <p className="text-slate-500 font-bold text-sm md:text-base">{t.buyer.confirmed.noMeetings}</p>
              </div>
            ) : confirmedViewMode === 'table' ? (
              <div className="bg-white rounded-[24px] md:rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "상태" : "Status"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "미팅 일자" : "Meeting Date"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "시간" : "Time"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "장소" : "Location"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "파트너사" : "Partner Company"}</th>
                        <th className="px-5 md:px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "담당자" : "PIC"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayConfirmedMeetings.map((m: any) => (
                        <tr key={m.id} className={`transition-colors ${m.isPast ? 'opacity-60 hover:opacity-80' : 'hover:bg-emerald-50/40'}`}>
                          <td className="px-5 md:px-6 py-4">
                            {m.isPast
                              ? <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black whitespace-nowrap"><CheckCircle2 size={11}/> {t.buyer.confirmed.completed}</span>
                              : <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black whitespace-nowrap"><CheckCircle2 size={11}/> {t.buyer.confirmed.confirmed}</span>
                            }
                          </td>
                          <td className="px-5 md:px-6 py-4"><span className="text-sm font-black text-slate-700 whitespace-nowrap">{formatDateWithDay(m.timeSlot.startTime)}</span></td>
                          <td className="px-5 md:px-6 py-4"><span className="text-sm font-bold text-indigo-600 whitespace-nowrap">{formatTime24And12(m.timeSlot.startTime)}</span></td>
                          <td className="px-5 md:px-6 py-4"><span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap"><MapPin size={13} className="text-slate-400 shrink-0"/>{m.location || t.buyer.confirmed.location}</span></td>
                          <td className="px-5 md:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-[10px] flex items-center justify-center text-slate-400 shrink-0"><Building2 size={16}/></div>
                              <div>
                                <p className="font-black text-sm text-slate-800 whitespace-nowrap">{m.seller.companyName}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{m.seller.onePager?.industrySector || "-"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 md:px-6 py-4">
                            <p className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1"><UserIcon size={12} className="text-slate-400"/>{m.seller.name}{m.seller.jobTitle ? <span className="text-slate-400 ml-1">({m.seller.jobTitle})</span> : ''}</p>
                            <p className="text-[10px] font-bold text-indigo-400 mt-0.5">{m.seller.email}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
                {displayConfirmedMeetings.map((m: any) => (
                  <div key={m.id} className={`p-6 md:p-8 rounded-[30px] md:rounded-[40px] border-2 shadow-lg hover:shadow-xl transition-all relative overflow-hidden flex flex-col ${m.isPast ? 'bg-slate-50/50 border-slate-200' : 'bg-white border-emerald-100'}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] -z-10 ${m.isPast ? 'bg-slate-100' : 'bg-emerald-50'}`}></div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        {m.isPast
                          ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm mb-3"><CheckCircle2 size={12}/> {t.buyer.confirmed.completed}</span>
                          : <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm shadow-emerald-200 mb-3"><CheckCircle2 size={12}/> {t.buyer.confirmed.confirmed}</span>
                        }
                        <h3 className={`text-xl md:text-2xl font-black ${m.isPast ? 'text-slate-500' : 'text-slate-800'}`}>{formatDateWithDay(m.timeSlot.startTime)}</h3>
                        <p className={`text-lg md:text-xl font-bold mt-1 ${m.isPast ? 'text-slate-400' : 'text-indigo-600'}`}>{formatTime24And12(m.timeSlot.startTime)}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl shadow-sm border flex items-center justify-center ${m.isPast ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-100 text-emerald-500'}`}><MapPin size={24}/></div>
                    </div>
                    <div className={`mt-auto p-5 rounded-[24px] border space-y-4 ${m.isPast ? 'bg-white border-slate-100 opacity-80' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Partner Company & Rep</p>
                        <p className={`font-black text-lg ${m.isPast ? 'text-slate-600' : 'text-slate-800'}`}>{m.seller.companyName}</p>
                        <p className={`text-xs font-bold mt-1.5 flex items-center gap-1.5 ${m.isPast ? 'text-slate-500' : 'text-indigo-600'}`}><UserIcon size={14}/> {m.seller.name} {m.seller.jobTitle ? `(${m.seller.jobTitle})` : ''}</p>
                      </div>
                      <div className="border-t border-slate-200/60 pt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meeting Location</p>
                        <p className={`text-sm font-bold ${m.isPast ? 'text-slate-500' : 'text-slate-700'}`}>{m.location || t.buyer.confirmed.location}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── [C] 예약 관리 ── */}
        {expandedSection === 'pending' && (
          <section className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.buyer.pending.title}</h2>
                {locale === 'ko' && (
                  <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(RESERVATION MANAGEMENT)</p>
                )}
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-[16px] shadow-inner flex-1 md:flex-none">
                  {['PENDING','MATCHED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setReservationFilter(f as any)}
                      className={`flex-1 md:flex-none px-5 py-2.5 rounded-[12px] text-xs font-black transition-all ${reservationFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {f === 'PENDING' ? t.buyer.pending.pendingFilter : t.buyer.pending.matchedFilter}
                    </button>
                  ))}
                </div>
                <ViewToggle mode={reservationViewMode} setMode={setReservationViewMode} />
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="p-12 md:p-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                <Info size={40} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">{t.buyer.pending.noReservations}</p>
              </div>
            ) : reservationViewMode === 'table' ? (
              <div className="bg-white rounded-[24px] md:rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "상태" : "Status"}</th>
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "미팅 일자" : "Meeting Date"}</th>
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "시간" : "Time"}</th>
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "장소" : "Loc"}</th>
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "신청 기업" : "Company"}</th>
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{locale === "ko" ? "담당자" : "PIC"}</th>
                        <th className="px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">{t.buyer.pending.reviewBtn}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map((slot: any) => {
                        const activeRequests = slot.meetings.filter((m: any) => m.status !== 'REJECTED');
                        if (activeRequests.length === 0) {
                          return (
                            <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${slot.status === 'CLOSED' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {slot.status === 'CLOSED' ? 'MATCHED' : 'OPEN'}
                                </span>
                              </td>
                              <td className="px-5 py-4"><span className="text-sm font-black text-slate-700 whitespace-nowrap">{formatDateWithDay(slot.startTime)}</span></td>
                              <td className="px-5 py-4"><span className="text-sm font-bold text-indigo-600 whitespace-nowrap flex items-center gap-1.5"><Clock size={13} className="text-indigo-400"/>{formatTime24And12(slot.startTime)}</span></td>
                              <td className="px-5 py-4"><span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap"><MapPin size={13} className="text-slate-400 shrink-0"/>{slot.location}</span></td>
                              <td colSpan={2} className="px-5 py-4"><span className="text-xs text-slate-400 font-bold flex items-center gap-1.5"><Inbox size={13}/> {t.buyer.pending.noRequests}</span></td>
                              <td className="px-5 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => setEditingSlot(slot)} title={t.buyer.profile.title} className="p-1.5 text-slate-400 bg-white border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14}/></button>
                                  <button onClick={() => handleDeleteSlot(slot.id)} title={t.common.cancel} className="p-1.5 text-slate-400 bg-white border border-slate-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return activeRequests.map((m: any, mIdx: number) => {
                          const isFirst = mIdx === 0;
                          const isLast = mIdx === activeRequests.length - 1;
                          const isConfirmed = m.status === 'CONFIRMED';
                          const isPendingStatus = m.status === 'PENDING';
                          return (
                            <tr key={`${slot.id}-${m.id}`} className={`transition-colors group ${isConfirmed ? 'bg-emerald-50/40 hover:bg-emerald-50' : isPendingStatus ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-50/50'} ${!isLast ? 'border-b border-dashed border-slate-100' : 'border-b border-slate-200'}`}>
                              {isFirst && (
                                <>
                                  <td rowSpan={activeRequests.length} className="px-5 py-4 align-middle border-r border-slate-100">
                                    <div className="flex flex-col gap-2">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${slot.status === 'CLOSED' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{slot.status === 'CLOSED' ? 'MATCHED' : 'OPEN'}</span>
                                      {activeRequests.length > 1 && <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap"><Users size={9}/> {activeRequests.length}{locale === "ko" ? "건 신청" : " requests"}</span>}
                                    </div>
                                  </td>
                                  <td rowSpan={activeRequests.length} className="px-5 py-4 align-middle border-r border-slate-100"><span className="text-sm font-black text-slate-700 whitespace-nowrap">{formatDateWithDay(slot.startTime)}</span></td>
                                  <td rowSpan={activeRequests.length} className="px-5 py-4 align-middle border-r border-slate-100"><span className="text-sm font-bold text-indigo-600 whitespace-nowrap flex items-center gap-1.5"><Clock size={13} className="text-indigo-400"/>{formatTime24And12(slot.startTime)}</span></td>
                                  <td rowSpan={activeRequests.length} className="px-5 py-4 align-middle border-r border-slate-100">
                                    <div className="flex flex-col gap-2">
                                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap"><MapPin size={13} className="text-slate-400 shrink-0"/>{slot.location}</span>
                                      {slot.status === 'OPEN' && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <button onClick={() => setEditingSlot(slot)} className="p-1 text-slate-400 bg-white border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-md transition-all"><Edit2 size={12}/></button>
                                          <button onClick={() => handleDeleteSlot(slot.id)} className="p-1 text-slate-400 bg-white border border-slate-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={12}/></button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 border ${isConfirmed ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><Building2 size={15}/></div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-black text-sm text-slate-800 whitespace-nowrap">{m.seller.companyName}</p>
                                      {isConfirmed && <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md whitespace-nowrap"><CheckCircle2 size={9}/> {locale === "ko" ? "확정" : "Done"}</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">{m.seller.onePager?.industrySector || '산업 미지정'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-slate-700 whitespace-nowrap flex items-center gap-1.5"><UserIcon size={11} className="text-slate-400 shrink-0"/>{m.seller.name}{m.seller.jobTitle && <span className="text-[10px] font-bold text-slate-400">({m.seller.jobTitle})</span>}</p>
                                  {m.seller.email && <p className="text-[10px] font-bold text-indigo-400 pl-[19px] whitespace-nowrap">{m.seller.email}</p>}
                                  {m.seller.phone && <p className="text-[10px] font-bold text-slate-400 pl-[19px] whitespace-nowrap flex items-center gap-1"><Phone size={9}/>{m.seller.phone}</p>}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {isConfirmed
                                  ? <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 whitespace-nowrap"><CheckCircle2 size={12}/> {locale === "ko" ? "매칭 확정" : "Matched"}</span>
                                  : slot.status !== 'CLOSED'
                                    ? <button onClick={() => setReviewingMeeting({ slot, meeting: m })} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-[10px] hover:bg-indigo-600 transition-colors whitespace-nowrap shadow-sm hover:shadow-indigo-200 flex items-center gap-1.5 mx-auto"><FileSearch size={12}/> {t.buyer.pending.reviewBtn}</button>
                                    : <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">—</span>
                                }
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
                {filteredReservations.map((slot: any) => (
                  <div key={slot.id} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-indigo-200">
                    <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                      <div className="flex flex-col gap-2.5">
                        <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${slot.status === 'CLOSED' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          {slot.status === 'CLOSED' ? 'MATCHED' : 'OPEN'}
                        </span>
                        <div>
                          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{formatDateWithDay(slot.startTime)}</h3>
                          <div className="flex items-center gap-2 mt-1.5"><Clock size={16} className="text-indigo-400"/><span className="text-sm md:text-base font-bold text-slate-600">{formatTime24And12(slot.startTime)}</span></div>
                          <div className="flex items-center gap-2 mt-1"><MapPin size={16} className="text-slate-400"/><span className="text-xs md:text-sm font-semibold text-slate-500">{slot.location}</span></div>
                        </div>
                      </div>
                      {slot.status === 'OPEN' && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditingSlot(slot)} className="p-2.5 text-slate-400 bg-white border border-slate-200 shadow-sm hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteSlot(slot.id)} className="p-2.5 text-slate-400 bg-white border border-slate-200 shadow-sm hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </div>
                    <div className="p-5 md:p-6 bg-white flex-1 flex flex-col gap-4">
                      <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5"><Users size={14}/> {t.buyer.pending.pendingFilter}</p>
                      {slot.meetings.filter((m: any) => m.status !== 'REJECTED').length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><Inbox size={20}/></div>
                          <p className="text-xs text-slate-400 font-bold">{t.buyer.pending.noRequests}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {slot.meetings.map((m: any) => {
                            if (m.status === 'REJECTED') return null;
                            return (
                              <div key={m.id} className="p-4 bg-white border border-slate-200 rounded-[16px] hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100"><Building2 size={18}/></div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-black text-slate-800 text-sm truncate">{m.seller.companyName}</span>
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md whitespace-nowrap">{m.seller.onePager?.industrySector || "산업 미지정"}</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1 truncate"><UserIcon size={12}/> {m.seller.name} {m.seller.jobTitle ? `(${m.seller.jobTitle})` : ''}</p>
                                  </div>
                                </div>
                                {slot.status !== 'CLOSED' && <button onClick={() => setReviewingMeeting({ slot, meeting: m })} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-xs font-black rounded-[12px] hover:bg-indigo-600 transition-colors shrink-0">{t.buyer.pending.detailReview}</button>}
                                {slot.status === 'CLOSED' && m.status === 'CONFIRMED' && <span className="text-xs font-black text-emerald-500 flex items-center justify-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100"><CheckCircle2 size={14}/> {locale === "ko" ? "매칭 확정" : "Matched"}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── [D] 슬롯 생성 ── */}
        {expandedSection === 'generator' && (
          <section className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
            <div className="bg-white p-8 md:p-12 rounded-[40px] md:rounded-[50px] shadow-2xl border border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-bl-full -z-10"></div>
              <div className="text-center mb-8 md:mb-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 text-white rounded-[24px] md:rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200"><Plus size={32}/></div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900">{t.buyer.generator.title}</h2>
                <p className="text-sm text-slate-400 font-bold mt-2 leading-relaxed">{t.buyer.generator.subtitle}</p>
              </div>
              <form action={onCreate} className="space-y-5 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1">{t.buyer.generator.dateLabel}</label>
                  <input name="date" type="date" required min={todayString} className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none transition-all cursor-pointer"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1">{t.buyer.generator.hourLabel}</label>
                    <select name="hour" className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none appearance-none transition-all cursor-pointer">
                      {Array.from({length:24}).map((_,i) => <option key={i} value={String(i).padStart(2,'0')}>{i}{locale === "ko" ? "시" : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1">{t.buyer.generator.minuteLabel}</label>
                    <select name="minute" className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none appearance-none transition-all cursor-pointer">
                      <option value="00">00{locale === "ko" ? "분" : ""}</option><option value="30">30{locale === "ko" ? "분" : ""}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1">{t.buyer.generator.locationLabel}</label>
                  <input name="location" required placeholder={t.buyer.generator.locationPlaceholder} className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[20px] text-sm font-bold outline-none transition-all"/>
                </div>
                <button disabled={isPending} className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[25px] font-black text-base md:text-lg shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2">
                  {isPending ? <Clock className="animate-spin" size={20}/> : <Plus size={20}/>}
                  {isPending ? t.buyer.generator.creating : t.buyer.generator.submitBtn}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ── [E] 분석 정보 ── */}
        {expandedSection === 'analytics' && (
          <section className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
            <div className="border-b border-slate-200/50 pb-4 md:border-none md:pb-0">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">{t.buyer.analytics.title}</h2>
              {locale === 'ko' && (
                <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">(MARKET INSIGHTS)</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-white p-8 md:p-10 rounded-[30px] md:rounded-[45px] shadow-lg border border-slate-100">
                <div className="flex items-center gap-4 mb-8 md:mb-10">
                  <div className="p-3.5 md:p-4 bg-indigo-50 text-indigo-600 rounded-[18px] md:rounded-2xl shadow-sm"><PieChart size={28}/></div>
                  <h3 className="font-black text-lg md:text-xl text-slate-800">{t.buyer.analytics.industryTitle}</h3>
                </div>
                <div className="space-y-6 md:space-y-7">
                  {Object.entries(stats.industries).map(([name, count]: any) => (
                    <div key={name} className="space-y-2.5">
                      <div className="flex justify-between text-[11px] md:text-xs font-black">
                        <span className="text-slate-600">{name}</span>
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{count}{locale === "ko" ? "개사" : " cos"} ({((count/uniqueSellers.length)*100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{width:`${(count/uniqueSellers.length)*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-8 md:p-10 rounded-[30px] md:rounded-[45px] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-[100px] pointer-events-none"></div>
                <div className="flex items-center gap-4 mb-8 md:mb-10 relative z-10">
                  <div className="p-3.5 md:p-4 bg-white/10 text-indigo-300 rounded-[18px] md:rounded-2xl shadow-sm backdrop-blur-md"><TrendingUp size={28}/></div>
                  <h3 className="font-black text-lg md:text-xl">{t.buyer.analytics.stageTitle}</h3>
                </div>
                <div className="space-y-6 md:space-y-7 relative z-10">
                  {Object.entries(stats.stages).map(([name, count]: any) => (
                    <div key={name} className="space-y-2.5">
                      <div className="flex justify-between text-[11px] md:text-xs font-black">
                        <span className="text-slate-300">{name}</span>
                        <span className="text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md">{count}{locale === "ko" ? "개사" : " cos"}</span>
                      </div>
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all duration-1000" style={{width:`${(count/uniqueSellers.length)*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── [F] 정보 수정 ── */}
        {expandedSection === 'profile' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 px-1 md:px-0">
            <div className="bg-white p-5 md:p-12 rounded-[30px] md:rounded-[45px] shadow-xl border border-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10 border-b border-slate-100 pb-6 md:pb-8">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 bg-slate-900 rounded-[18px] md:rounded-3xl flex items-center justify-center text-white shadow-xl"><UserIcon size={28}/></div>
                  <div className="overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                      <h3 className="text-lg md:text-2xl font-black text-slate-800 truncate">[{user.companyName}] {user.name}{locale === "ko" ? " 님" : ""}</h3>
                      {user.isMaster
                        ? <span className="w-fit px-2.5 py-1 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black rounded-md flex items-center gap-1 shadow-md shadow-indigo-100"><ShieldCheck size={12}/> MASTER</span>
                        : <span className="w-fit px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] md:text-[10px] font-black rounded-md flex items-center gap-1"><Users size={12}/> MEMBER</span>
                      }
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-widest truncate">{user.jobTitle} | Account Settings</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleProfileUpdate} className="flex flex-col md:grid md:grid-cols-2 gap-5 md:gap-8">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Building2 size={12}/> {t.buyer.profile.companyLabel}</p>
                    {!user.isMaster && <span className="text-[9px] text-rose-400 font-bold">{t.buyer.profile.masterOnly}</span>}
                  </div>
                  <input name="companyName" defaultValue={user.companyName} disabled={!user.isMaster} className={`w-full p-3.5 md:p-4 rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${user.isMaster ? 'bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none' : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'}`}/>
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Mail size={12}/> {t.buyer.profile.emailFixed}</p>
                  <input name="email" defaultValue={user.email} disabled className="w-full p-3.5 md:p-4 rounded-[16px] md:rounded-2xl border text-sm font-bold bg-slate-100 border-transparent text-slate-400 cursor-not-allowed"/>
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserIcon size={12}/> {t.buyer.profile.nameLabel}</p>
                  <input name="name" defaultValue={user.name} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone size={12}/> {t.buyer.profile.phoneLabel}</p>
                  <input name="phone" value={editPhone} onChange={handlePhoneChange} maxLength={13} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                </div>
                <div className="flex flex-col space-y-2 md:col-span-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Check size={12}/> {t.buyer.profile.jobTitleLabel}</p>
                  <input name="jobTitle" defaultValue={user.jobTitle} required className="w-full p-3.5 md:p-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.buyer.profile.newPassword}</p>
                  <input name="password" type="password" placeholder="8+ characters" value={editPassword} onChange={e => setEditPassword(e.target.value)} className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${editPassword.length > 0 && editPassword.length < 8 ? 'border-rose-400 focus:border-rose-500' : 'border-transparent focus:bg-white focus:border-indigo-500'}`}/>
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.buyer.profile.confirmPassword}</p>
                  <input name="confirmPassword" type="password" placeholder="Re-enter password" value={editConfirmPassword} onChange={e => setEditConfirmPassword(e.target.value)} className={`w-full p-3.5 md:p-4 bg-slate-50 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all ${editConfirmPassword && editPassword !== editConfirmPassword ? 'border-rose-500 bg-rose-50' : 'border-transparent focus:bg-white focus:border-indigo-500'}`}/>
                </div>
                <div className="flex flex-col space-y-3 md:col-span-2 pt-4 border-t border-slate-100">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Target size={12}/> {t.buyer.profile.userTypeLabel}</p>
                  <div className="flex gap-2 flex-wrap">
                    {["VC","AC", locale === "ko" ? "바이어" : "Buyer", locale === "ko" ? "스타트업" : "Startup", locale === "ko" ? "기타" : "Other"].map((v) => (
                      <label key={v} className={`flex-1 min-w-[72px] text-center p-3 md:p-4 rounded-[16px] cursor-pointer text-xs md:text-sm font-black transition-all border ${editSelectedType === v ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"}`}>
                        <input type="radio" name="userType" value={v} className="hidden" checked={editSelectedType === v} onChange={(e) => setEditSelectedType(e.target.value)}/>
                        {v}
                      </label>
                    ))}
                  </div>
                  {editSelectedType === (locale === "ko" ? "기타" : "Other") && (
                    <input name="userTypeDetail" type="text" placeholder={t.register.userTypeOtherPlaceholder} required value={editUserTypeDetail} onChange={(e) => setEditUserTypeDetail(e.target.value)} className="w-full p-4 mt-2 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[16px] md:rounded-2xl border text-sm md:text-base font-bold transition-all"/>
                  )}
                </div>
                <div className="flex flex-col space-y-2 md:col-span-2">
                  <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Lightbulb size={12}/> {t.buyer.profile.preferredLabel}</p>
                  <textarea name="preferredPartners" defaultValue={user.preferredPartners} placeholder={t.register.preferredPartnersPlaceholder} className="w-full p-4 md:p-5 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 outline-none rounded-[20px] md:rounded-3xl border h-28 md:h-32 text-sm md:text-base font-bold resize-none leading-relaxed transition-all"/>
                </div>
                <button type="submit" disabled={isPending || (editPassword.length > 0 && editPassword !== editConfirmPassword) || (editPassword.length > 0 && editPassword.length < 8)} className="w-full md:col-span-2 py-4 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[30px] font-black text-base md:text-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl mt-2 disabled:opacity-50 disabled:hover:bg-slate-900">
                  {isPending ? <Clock className="animate-spin" size={20}/> : <Save size={20}/>}
                  {t.buyer.profile.saveBtn}
                </button>
              </form>
            </div>
          </section>
        )}

      </main>

      {/* ── 예약 수정 모달 ── */}
      {editingSlot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20">
            <div className="bg-indigo-600 px-6 md:px-8 py-5 md:py-6 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-black flex items-center gap-2"><Edit2 size={20}/> {locale === "ko" ? "예약 일정/장소 수정" : "Edit Slot"}</h3>
                <p className="text-[11px] text-indigo-200 font-bold mt-1 tracking-widest uppercase">Edit Reservation Slot</p>
              </div>
              <button onClick={() => setEditingSlot(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={20}/></button>
            </div>
            <div className="p-6 md:p-8">
              <form onSubmit={handleUpdateSlot} className="space-y-5">
                {(() => {
                  const d = new Date(editingSlot.startTime);
                  const offset = d.getTimezoneOffset() * 60000;
                  const defaultDate = new Date(d.getTime() - offset).toISOString().split('T')[0];
                  const defaultHour = String(d.getHours()).padStart(2, '0');
                  const defaultMinute = String(d.getMinutes()).padStart(2, '0');
                  const hasRequests = editingSlot.meetings?.filter((m: any) => m.status !== 'REJECTED').length > 0;
                  return (
                    <>
                      {hasRequests && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-sm text-amber-700 flex gap-2.5 items-start leading-relaxed shadow-sm">
                          <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                          <p>{locale === "ko" ? "미팅 신청 기업이 있어 장소만 변경 가능합니다." : "Only location can be modified because there are pending requests."}</p>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.buyer.generator.dateLabel}</label>
                        <input name="date" type="date" required defaultValue={defaultDate} min={todayString} readOnly={hasRequests} className={`w-full p-4 rounded-[16px] text-sm font-bold outline-none transition-all ${hasRequests ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed focus:ring-0' : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer'}`}/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.buyer.generator.hourLabel}</label>
                          <select name="hour" defaultValue={defaultHour} disabled={hasRequests} className={`w-full p-4 rounded-[16px] text-sm font-bold outline-none appearance-none transition-all ${hasRequests ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 cursor-pointer'}`}>
                            {Array.from({length:24}).map((_,i) => <option key={i} value={String(i).padStart(2,'0')}>{i}{locale === "ko" ? "시" : ""}</option>)}
                          </select>
                          {hasRequests && <input type="hidden" name="hour" value={defaultHour}/>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.buyer.generator.minuteLabel}</label>
                          <select name="minute" defaultValue={defaultMinute} disabled={hasRequests} className={`w-full p-4 rounded-[16px] text-sm font-bold outline-none appearance-none transition-all ${hasRequests ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 cursor-pointer'}`}>
                            <option value="00">00{locale === "ko" ? "분" : ""}</option><option value="30">30{locale === "ko" ? "분" : ""}</option>
                          </select>
                          {hasRequests && <input type="hidden" name="minute" value={defaultMinute}/>}
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1">{t.buyer.generator.locationLabel}</label>
                        <input name="location" required defaultValue={editingSlot.location} placeholder="장소 혹은 온라인 여부" className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-[16px] text-sm font-bold outline-none transition-all"/>
                      </div>
                      <button disabled={isPending} className="w-full py-4 bg-slate-900 text-white rounded-[16px] font-black text-base hover:bg-indigo-600 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2">
                        {isPending ? t.common.loading : <><Save size={18}/> {locale === "ko" ? "수정 완료" : "Update Changes"}</>}
                      </button>
                    </>
                  );
                })()}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── 매칭 검토 모달 ── */}
      {reviewingMeeting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20">
            <div className="bg-slate-900 px-6 md:px-8 py-5 md:py-6 flex justify-between items-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-black flex items-center gap-2"><Search size={20} className="text-indigo-400"/> {t.buyer.pending.reviewBtn}</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{locale === 'ko' ? '미팅 요청 검토' : 'Review Meeting Request'}</p>
              </div>
              <button onClick={() => setReviewingMeeting(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={20}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-5 md:space-y-6">
              <div className="bg-slate-50 rounded-[24px] md:rounded-[25px] p-5 md:p-6 border border-slate-100 flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-[16px] shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0"><Building2 size={24}/></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h4 className="text-lg font-black text-slate-900">{reviewingMeeting.meeting.seller.companyName}</h4>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md flex items-center gap-1 border border-indigo-100"><UserIcon size={12}/> {reviewingMeeting.meeting.seller.name}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md">{reviewingMeeting.meeting.seller.onePager?.industrySector || "-"}</span>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed italic">"{reviewingMeeting.meeting.seller.onePager?.solutionSummary || t.buyer.directory.noResults}"</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const s = reviewingMeeting.meeting.seller;
                  setSelectedOnePager({ ...s.onePager, user: s, members: s.members || [s] });
                }}
                className="w-full py-4 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-[20px] flex justify-center items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
              >
                <FileSearch size={18}/> {locale === "ko" ? "기업 상세 프로필 확인 (One-Pager)" : "View Detailed One-Pager"}
              </button>
              <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold p-4 rounded-2xl flex items-start gap-2 leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500"/>
                <p>{locale === "ko" ? "승인 시 동일 슬롯 대기 중인 다른 기업들은 '타기업 매칭' 사유로 자동 거절됩니다." : "Approving this will automatically reject others in the same slot."}</p>
              </div>
            </div>
            <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => handleRejectMatch(reviewingMeeting.meeting)} disabled={isPending} className="flex-1 py-4 bg-white text-rose-500 border border-slate-200 font-black rounded-[20px] flex justify-center items-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-50 shadow-sm">
                <XCircle size={18}/> {t.seller.team.rejectBtn}
              </button>
              <button onClick={() => handleApproveMatch(reviewingMeeting.slot, reviewingMeeting.meeting)} disabled={isPending} className="flex-[1.5] py-4 bg-emerald-500 text-white font-black rounded-[20px] shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {isPending ? t.common.loading : <><Check size={18}/> {locale === "ko" ? "매칭 확정" : "Confirm Match"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 원페이저 모달 ── */}
      {selectedOnePager && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-5xl max-h-[98vh] md:max-h-[94vh] overflow-y-auto rounded-[30px] md:rounded-[50px] shadow-2xl relative scrollbar-hide border border-white/20">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center z-20">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-indigo-600 text-white rounded-[14px] md:rounded-2xl shadow-lg shadow-indigo-100"><Award size={24} className="md:w-7 md:h-7"/></div>
                <div className="text-left">
                  <h3 className="text-lg md:text-2xl font-black text-slate-900 leading-none">Business One-Pager</h3>
                  <p className="text-[9px] md:text-xs font-black text-indigo-500 uppercase mt-1 md:mt-1.5 tracking-widest">{locale === 'ko' ? '상세 정보 조회' : 'Detail View'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOnePager(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all group"><X size={20} className="md:w-6 md:h-6 group-active:scale-90"/></button>
            </div>
            <div className="p-6 md:p-12 space-y-10 md:space-y-12 text-left bg-slate-50/50">
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 border-b border-slate-200/60 pb-10 md:pb-12">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 rounded-[24px] md:rounded-[40px] flex items-center justify-center text-white shrink-0 shadow-2xl"><Building2 size={48} className="md:w-16 md:h-16"/></div>
                <div className="space-y-4 md:space-y-5 flex-1">
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">{selectedOnePager.companyNameKr || selectedOnePager.user?.companyName}</h2>
                    <p className="text-sm md:text-lg font-black text-slate-400 uppercase tracking-tighter">{selectedOnePager.companyNameEn || "N/A"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 md:px-5 py-1.5 md:py-2 bg-indigo-600 text-white rounded-full text-[11px] md:text-xs font-black shadow-lg shadow-indigo-200">{selectedOnePager.industrySector}</span>
                    <span className="px-4 md:px-5 py-1.5 md:py-2 bg-slate-900 text-white rounded-full text-[11px] font-black shadow-lg shadow-slate-200">{selectedOnePager.investmentStage}</span>
                    <span className="px-4 md:px-5 py-1.5 md:py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black">{locale === "ko" ? "설립" : "Founded"}: {selectedOnePager.yearFounded || "-"}년</span>
                    {selectedOnePager.ceoName && <span className="px-4 md:px-5 py-1.5 md:py-2 bg-amber-50 text-amber-600 rounded-full text-[11px] font-black">{locale === "ko" ? "대표" : "CEO"}: {selectedOnePager.ceoName}</span>}
                  </div>
                  {selectedOnePager.websiteUrl && (
                    <a href={selectedOnePager.websiteUrl} target="_blank" className="inline-flex items-center gap-1.5 text-indigo-500 font-bold hover:text-indigo-700 hover:underline text-xs md:text-sm bg-indigo-50 px-3 py-1.5 rounded-lg w-fit transition-colors">
                      <Globe size={14}/> {selectedOnePager.websiteUrl}
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 md:gap-x-12 gap-y-8 md:gap-y-10">
                <div className="space-y-8 md:space-y-10">
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-indigo-600 font-black text-xs md:text-sm uppercase tracking-widest border-b border-indigo-50 pb-3"><Sparkles size={18}/> {locale === "ko" ? "주요 제품 및 서비스" : "Key Product"}</h5>
                    <p className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{selectedOnePager.productType}</p>
                    <div className="bg-indigo-50/50 p-5 md:p-6 rounded-[20px] text-slate-600 text-sm leading-relaxed font-bold">{selectedOnePager.solutionSummary}</div>
                  </section>
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-rose-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-rose-50 pb-3"><Target size={18}/> {locale === "ko" ? "마켓 문제점" : "Problem"}</h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.problem || t.buyer.directory.noResults}</p>
                  </section>
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-emerald-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-emerald-50 pb-3"><TrendingUp size={18}/> {locale === "ko" ? "성과 및 지표" : "Traction"}</h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.traction || t.buyer.directory.noResults}</p>
                  </section>
                </div>
                <div className="space-y-8 md:space-y-10">
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-amber-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-amber-50 pb-3"><Lightbulb size={18}/> {locale === "ko" ? "해결 방안" : "Solution"}</h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.solution || t.buyer.directory.noResults}</p>
                  </section>
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-blue-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-blue-50 pb-3"><Briefcase size={18}/> {locale === "ko" ? "비즈니스 모델" : "Biz Model"}</h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.bizModel || t.buyer.directory.noResults}</p>
                  </section>
                  <div className="p-6 md:p-8 bg-slate-900 rounded-[30px] text-white space-y-6 shadow-2xl relative overflow-hidden group/card">
                    <Rocket size={100} className="absolute -bottom-6 -right-6 text-white/5 -rotate-12 transition-transform group-hover/card:scale-110 duration-700"/>
                    <h5 className="text-[10px] md:text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-4"><Mail size={16}/> Business Contacts</h5>
                    <div className="space-y-6 relative z-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedOnePager.members?.map((member: any, idx: number) => (
                        <div key={idx} className={`${idx > 0 ? 'pt-6 border-t border-white/10' : ''} space-y-3.5`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="px-2.5 py-1 bg-white/10 rounded-md text-[9px] md:text-[10px] font-black tracking-wider uppercase">Member {idx + 1}</span>
                            <span className="font-black text-indigo-300 text-[11px] md:text-xs bg-indigo-500/20 px-2 py-0.5 rounded">{member.onePager?.primaryTech || "Sales"}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="opacity-50 text-[10px] md:text-xs font-bold">{locale === "ko" ? "이름 / 직함" : "Name / Title"}</span>
                            <span className="font-black text-sm md:text-base">{member.onePager?.picName || member.name} <span className="text-xs text-indigo-200 ml-1">{member.onePager?.picTitle ? `(${member.onePager?.picTitle})` : ''}</span></span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="opacity-50 text-[10px] md:text-xs font-bold">{locale === "ko" ? "이메일" : "Email"}</span>
                            <span className="font-black text-xs md:text-sm text-indigo-300 underline decoration-indigo-500/50 underline-offset-4">{member.onePager?.contactEmail || member.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-8 md:pt-12 flex flex-col sm:flex-row gap-3 md:gap-4">
                {selectedOnePager.pitchDeckUrl && (
                  <a href={selectedOnePager.pitchDeckUrl} target="_blank" className="flex-[2] flex items-center justify-center gap-2 bg-slate-900 text-white py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-sm md:text-base shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98]">
                    <FileText size={20}/> Pitch Deck (PDF) {locale === "ko" ? "다운로드" : "Download"}
                  </a>
                )}
                <button onClick={() => setSelectedOnePager(null)} className="flex-1 py-4 md:py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-[20px] md:rounded-[24px] font-black text-sm md:text-base hover:bg-slate-50 transition-all shadow-sm">{locale === "ko" ? "닫기" : "Close"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 스크롤바 CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}