"use client";

import { useState, useEffect, useMemo } from "react";
import { handleStatusAction, requestLocationChange, deleteSlotAction, createSlotAction, updateSlotAction } from "./actions";
import { 
  MapPin, Edit3, Trash2, CheckCircle2, Clock, Plus, X, Phone, Send, AlertCircle, 
  Handshake, Download, Mail, FileText, Building2, User, Target, Lightbulb, 
  TrendingUp, Briefcase, Sparkles, Search, BarChart3, ChevronRight, Globe, 
  PieChart, ChevronDown, UserCheck, Users, ShieldCheck, Ban 
} from "lucide-react";
import * as XLSX from 'xlsx';
import Link from "next/link";

export default function BuyerClient({ mySlots, confirmedMeetings, allSellers, buyerId, user }: any) {
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 메뉴 순서에 맞춰 초기 섹션을 'generator'로 설정
  const [expandedSection, setExpandedSection] = useState<string | null>('generator');
  
  // 상태 관리
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [selectedOnePager, setSelectedOnePager] = useState<any>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [reservationFilter, setReservationFilter] = useState<'PENDING' | 'MATCHED' | 'ALL'>('PENDING');
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // [보안 로직] 관리자 승인 여부 체크
  if (!mounted) return null;
  if (!user) return null;

  // 1. 관리자 승인 대기 화면
  if (user.approvalStatus === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-pretendard">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl text-center max-w-md border border-indigo-100">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">관리자 승인 대기 중</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            바이어(투자자) 계정은 운영팀의 승인이 필요합니다.<br/>
            셀러 정보 보호를 위한 절차이오니 양해 부탁드립니다.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-400">
            승인 문의: admin@example.com
          </div>
        </div>
      </div>
    );
  }

  // 2. 가입 거절 화면
  if (user.approvalStatus === "REJECTED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-pretendard">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl text-center max-w-md border border-rose-100">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">가입 승인 반려</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            신청하신 바이어 계정이 반려되었습니다.<br/>자격 증빙이 부족하거나 정보가 올바르지 않습니다.
          </p>
          <Link href="/logout" className="py-4 px-8 bg-slate-900 text-white rounded-2xl font-bold inline-block">다른 계정으로 가입</Link>
        </div>
      </div>
    );
  }

  // --- 원페이저 열람 핸들러 (미등록 시 알람) ---
  const handleViewOnePager = (seller: any) => {
    if (!seller.onePager) {
      alert(`[알림] ${seller.companyName} 업체는 아직 원페이저를 등록하지 않았습니다.\n(Notice: This company has not registered a one-pager yet.)`);
      return;
    }
    setSelectedOnePager({ ...seller.onePager, user: seller });
  };

  const formatMeetingTime = (date: Date) => {
    if (!mounted) return "";
    const d = new Date(date);
    const h24 = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const ampm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

  // --- 엑셀 다운로드 로직 ---
  const downloadSellerList = () => {
    const data = allSellers.map((s: any) => {
      const op = s.onePager || {};
      return {
        "업체명 (Company Name)": s.companyName || "-",
        "국문 업체명 (Company Name KR)": op.companyNameKr || "-",
        "영문 업체명 (Company Name EN)": op.companyNameEn || "-",
        "산업 분야 (Industry Sector)": op.industrySector || "-",
        "제품/서비스 유형 (Product/Service Type)": op.productType || "-",
        "대표자명 (CEO Name)": op.ceoName || "-",
        "담당자명 (PIC Name)": op.picName || s.name || "-",
        "담당자 직함 (PIC Title)": op.picTitle || s.jobTitle || "-",
        "이메일 (Email)": op.contactEmail || s.email || "-",
        "연락처 (Phone)": s.phone || "-",
        "핵심 기술 (Primary Tech)": op.primaryTech || "-",
        "설립 연도 (Year Founded)": op.yearFounded || "-",
        "투자 단계 (Investment Stage)": op.investmentStage || "-",
        "월 매출 규모 (Monthly Revenue)": op.monthlyRevenue || "-",
        "솔루션 요약 (Solution Summary)": op.solutionSummary || "-",
        "시장 문제점 (Market Problem)": op.problem || "-",
        "해결 방안 (Our Solution)": op.solution || "-",
        "성과 지표 (Traction)": op.traction || "-",
        "비즈니스 모델 (Business Model)": op.bizModel || "-",
        "피치덱 링크 (Pitch Deck URL)": op.pitchDeckUrl || "-",
        "선호 파트너 (Preferred Partners)": s.preferredPartners || "-",
        "사용자 유형 (User Type)": s.userType || "-",
        "상세 유형 (User Detail)": s.userTypeDetail || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      {wch: 25}, {wch: 30}, {wch: 30}, {wch: 25}, {wch: 30}, 
      {wch: 15}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 20},
      {wch: 25}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 50},
      {wch: 50}, {wch: 50}, {wch: 50}, {wch: 50}, {wch: 35},
      {wch: 30}, {wch: 15}, {wch: 15}
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seller_Directory");
    XLSX.writeFile(wb, `Seller_Directory_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowDownloadMenu(false);
  };

  const downloadConfirmedMeetings = () => {
    const data = confirmedMeetings.map((m: any) => {
      const s = m.seller || {};
      const op = s.onePager || {};
      return {
        "미팅 일자 (Date)": new Date(m.timeSlot.startTime).toLocaleDateString(),
        "미팅 시간 (Time)": new Date(m.timeSlot.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        "확정 장소 (Location)": m.location || "미지정",
        "참여 업체 (Company Name)": s.companyName || "-",
        "산업 분야 (Industry)": op.industrySector || "-",
        "대표자 (CEO)": op.ceoName || "-",
        "담당자 (PIC)": `${op.picName || s.name} ${op.picTitle || ""}`,
        "연락처 (Phone)": s.phone || "-",
        "이메일 (Email)": op.contactEmail || s.email || "-",
        "제품/서비스 유형 (Product Type)": op.productType || "-",
        "솔루션 요약 (Solution Summary)": op.solutionSummary || "-",
        "핵심 기술 (Primary Tech)": op.primaryTech || "-",
        "투자 단계 (Investment Stage)": op.investmentStage || "-",
        "성과 지표 (Traction)": op.traction || "-",
        "비즈니스 모델 (Business Model)": op.bizModel || "-",
        "피치덱 링크 (Pitch Deck URL)": op.pitchDeckUrl || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Confirmed_Matches");
    XLSX.writeFile(wb, `Confirmed_Meetings_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowDownloadMenu(false);
  };

  // --- 필터링 및 통계 ---
  const filteredReservations = useMemo(() => {
    if (!mySlots) return [];
    const list = reservationFilter === 'ALL' ? mySlots : 
                 reservationFilter === 'PENDING' ? mySlots.filter((s: any) => s.status === 'OPEN') :
                 mySlots.filter((s: any) => s.status === 'CLOSED');
    return list;
  }, [reservationFilter, mySlots]);

  const filteredSellers = useMemo(() => {
    return allSellers.filter((s: any) => {
      const searchTarget = (s.companyName + (s.onePager?.companyNameEn || "")).toLowerCase();
      const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
      const matchesIndustry = industryFilter === "ALL" || s.onePager?.industrySector === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [searchTerm, industryFilter, allSellers]);

  const stats = useMemo(() => {
    const industries: any = {};
    const stages: any = {};
    allSellers.forEach((s: any) => {
      const ind = s.onePager?.industrySector || "N/A";
      const stg = s.onePager?.investmentStage || "TBD";
      industries[ind] = (industries[ind] || 0) + 1;
      stages[stg] = (stages[stg] || 0) + 1;
    });
    return { industries, stages };
  }, [allSellers]);

  // --- 서버 액션 핸들러 ---
  const onCreate = async (formData: FormData) => {
    if (!confirm("예약을 생성하시겠습니까?")) return;
    setIsPending(true);
    try { await createSlotAction(formData, buyerId); setExpandedSection('pending'); } finally { setIsPending(false); }
  };

  const onStatusUpdate = async (meetingId: number, slotId: number, action: string, company: string) => {
    const msg = action === 'ACCEPT' ? '수락하시겠습니까?' : '거절하시겠습니까?';
    if (!confirm(`${company}와의 미팅을 ${msg}`)) return;
    setIsPending(true);
    try { await handleStatusAction(meetingId, slotId, action, action === "REJECT" ? rejectionReason : undefined); } finally { setIsPending(false); }
  };

  const onProposeLocation = async (meetingId: number, currentLoc: string) => {
    const newLoc = prompt("새로운 미팅 장소를 제안하세요:", currentLoc || "");
    if (!newLoc || newLoc === currentLoc) return;
    setIsPending(true);
    try { await requestLocationChange(meetingId, newLoc); alert("📩 장소 변경 요청 완료"); } finally { setIsPending(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-pretendard text-slate-900 pb-20 text-left">
      
      {/* 📄 [MODAL] 원페이저 팝업 */}
      {selectedOnePager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 text-left">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[40px] shadow-2xl relative border border-white/20">
            <button onClick={() => setSelectedOnePager(null)} className="absolute top-6 right-6 p-3 bg-slate-100 hover:bg-slate-200 rounded-full z-10 transition-all shadow-sm"><X size={20}/></button>
            <div className="p-8 md:p-16 space-y-12">
              <div className="border-b border-slate-100 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"><Building2 size={28}/></div>
                      <div className="min-w-0">
                        <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{selectedOnePager.companyNameKr || selectedOnePager.user?.companyName}</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedOnePager.companyNameEn || "Business Partner"}</p>
                      </div>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-indigo-500 italic tracking-tight">{selectedOnePager.productType || "등록된 제품 유형이 없습니다."}</p>
                  </div>
                  {selectedOnePager.pitchDeckUrl && (
                    <a href={selectedOnePager.pitchDeckUrl} target="_blank" className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shrink-0"><FileText size={20}/> PDF DECK DOWNLOAD</a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-8">
                   <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2"><User size={12}/> {selectedOnePager.ceoName || '-'} CEO</div>
                   <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2"><Globe size={12}/> {selectedOnePager.industrySector || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12 text-left">
                  <section className="bg-indigo-50/40 p-8 rounded-[35px] border border-indigo-100">
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Solution Summary | 요약</h4>
                    <p className="text-lg font-medium text-slate-700 leading-relaxed whitespace-pre-line">{selectedOnePager.solutionSummary}</p>
                  </section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {[
                      { id: 'problem', label: '마켓 문제점 | Market Problem', icon: <Target className="text-rose-500" /> },
                      { id: 'solution', label: '해결 방안 | Our Solution', icon: <Lightbulb className="text-amber-500" /> },
                      { id: 'traction', label: '성과 지표 | Traction', icon: <TrendingUp className="text-emerald-500" /> },
                      { id: 'bizModel', label: '비즈니스 모델 | Biz Model', icon: <Briefcase className="text-indigo-500" /> },
                    ].map(item => (
                      <div key={item.id} className="space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100"><div className="p-2 bg-slate-50 rounded-lg">{item.icon}</div><span className="text-[13px] font-black text-slate-800 uppercase tracking-widest">{item.label}</span></div>
                        <p className="text-[13px] text-slate-500 leading-relaxed whitespace-pre-line">{selectedOnePager[item.id] || "No data provided."}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <aside className="space-y-8 text-left">
                  <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-8 flex items-center gap-2 relative z-10"><Sparkles size={14}/> Key Metrics</h4>
                    <div className="space-y-7 relative z-10">
                       {[
                         { k: 'Primary Tech | 기술', v: selectedOnePager.primaryTech },
                         { k: 'Founded | 설립연도', v: selectedOnePager.yearFounded },
                         { k: 'Investment | 단계', v: selectedOnePager.investmentStage },
                         { k: 'Monthly Rev | 매출', v: selectedOnePager.monthlyRevenue },
                       ].map(info => (
                         <div key={info.k}><p className="text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">{info.k}</p><p className="text-sm font-bold text-slate-100">{info.v || '-'}</p></div>
                       ))}
                    </div>
                  </div>
                  <div className="p-8 bg-white border border-slate-100 rounded-[35px] shadow-sm space-y-5">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">PIC 정보 | 담당자</p>
                     <div><p className="text-base font-black text-slate-800">{selectedOnePager.picName || "미등록"}</p><p className="text-xs text-slate-400 font-bold mt-0.5">{selectedOnePager.picTitle || "-"}</p><div className="mt-4 pt-4 border-t border-slate-50 text-xs font-medium text-indigo-600 flex items-center gap-2"><Mail size={14}/> {selectedOnePager.contactEmail || '-'}</div></div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- GLOBAL HEADER --- */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <nav className="flex items-center gap-2 md:gap-6 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'generator', label: '예약 생성', en: 'Create Slot', icon: <Plus size={18}/> },
              { id: 'confirmed', label: '확정 일정', en: 'Confirmed', icon: <Handshake size={18}/> },
              { id: 'pending', label: '나의 예약', en: 'My Status', icon: <Clock size={18}/> },
              { id: 'directory', label: '셀러 탐색', en: 'Explore', icon: <Search size={18}/> },
              { id: 'analytics', label: '데이터 분석', en: 'Analytics', icon: <BarChart3 size={18}/> },
            ].map(item => (
              <button key={item.id} onClick={() => setExpandedSection(item.id)} className={`flex items-center gap-2.5 px-4 md:px-5 py-2.5 rounded-[18px] transition-all shrink-0 ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                {item.icon}
                <div className="text-left leading-none">
                  <p className="text-[11px] font-black">{item.label}</p>
                  <p className="text-[8px] font-bold uppercase opacity-40 mt-0.5">{item.en}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* EXCEL DOWNLOAD MENU */}
          <div className="relative shrink-0">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="flex items-center gap-2 bg-white border border-slate-200 px-4 md:px-6 py-3 rounded-2xl text-[11px] font-black text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"><Download size={14}/> <span className="hidden sm:inline">DATA EXPORT</span> <ChevronDown size={12} className={`transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} /></button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-200">
                <button onClick={downloadSellerList} className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl text-left transition-colors group"><div className="p-2 bg-slate-100 rounded-xl group-hover:bg-white"><Users size={16} className="text-slate-500" /></div><div><p className="text-xs font-black text-slate-800">전체 셀러 DB (Full)</p><p className="text-[9px] text-slate-400 font-bold uppercase">All OnePager Details</p></div></button>
                <button onClick={downloadConfirmedMeetings} className="w-full flex items-center gap-3 p-4 hover:bg-emerald-50 rounded-2xl text-left transition-colors group border-t border-slate-50"><div className="p-2 bg-slate-100 rounded-xl group-hover:bg-white"><UserCheck size={16} className="text-slate-500" /></div><div><p className="text-xs font-black text-slate-800">확정 미팅 내역</p><p className="text-[9px] text-slate-400 font-bold uppercase">Matching Info & Biz Details</p></div></button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10">
        
        {/* --- 1. 예약 생성 (Generator) --- */}
        {expandedSection === 'generator' && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="bg-white p-10 md:p-14 rounded-[50px] shadow-2xl border-2 border-white relative overflow-hidden">
              <h2 className="text-3xl font-black text-indigo-600 mb-10 leading-tight">신규 미팅 예약 생성<br/><span className="text-lg opacity-30 font-bold uppercase">(Create New Time Slot)</span></h2>
              <form action={onCreate} className="space-y-8 text-left">
                <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">날짜 (DATE)</p><input name="date" type="date" required className="w-full p-5 bg-slate-50 border-none rounded-[25px] text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-400 outline-none transition-all" /></div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">시 (HOUR)</p><select name="hour" className="w-full p-5 bg-slate-50 border-none rounded-[25px] text-sm font-bold shadow-inner outline-none">{Array.from({length:24}).map((_,i)=> <option key={i} value={String(i).padStart(2,'0')}>{i}시</option>)}</select></div>
                  <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">분 (MIN)</p><select name="minute" className="w-full p-5 bg-slate-50 border-none rounded-[25px] text-sm font-bold shadow-inner outline-none"><option value="00">00분</option><option value="30">30분</option></select></div>
                </div>
                <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">장소 (LOCATION)</p><input name="location" required placeholder="예: 비즈니스 라운지 B홀" className="w-full p-5 bg-slate-50 border-none rounded-[25px] text-sm font-bold shadow-inner outline-none focus:bg-white transition-all" /></div>
                <button className="w-full h-20 bg-indigo-600 text-white rounded-[30px] font-black text-lg hover:bg-slate-900 transition-all shadow-xl active:scale-95 mt-6">미팅 예약 생성하기</button>
              </form>
            </div>
          </section>
        )}

        {/* --- 2. 확정 일정 (Confirmed) --- */}
        {expandedSection === 'confirmed' && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 space-y-10 text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">확정된 미팅 일정<br/><span className="text-lg text-slate-300 font-bold uppercase">(Confirmed Schedule)</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {confirmedMeetings.map((m: any) => (
                <div key={m.id} className="bg-white p-8 rounded-[45px] shadow-xl border-2 border-emerald-100 flex flex-col min-h-[480px] hover:shadow-2xl transition-all">
                  <div className="flex justify-between items-start mb-8 text-left">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">CONFIRMED MATCH</p>
                      <h3 className="text-xl font-black text-slate-800 leading-tight truncate">{new Date(m.timeSlot.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</h3>
                      <div className="mt-2 inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-sm">{formatMeetingTime(new Date(m.timeSlot.startTime))}</div>
                    </div>
                    <button onClick={() => handleViewOnePager(m.seller)} className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-[22px] transition-all shadow-inner border border-slate-100 shrink-0"><FileText size={22}/></button>
                  </div>
                  <div className="p-7 bg-slate-50 rounded-[35px] border border-slate-100 space-y-6 mt-auto text-left">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <div className="min-w-0 flex-1 text-left">
                          <h4 className="font-black text-base text-slate-800 truncate">{m.seller.companyName}</h4>
                          <p className="text-[11px] text-indigo-500 font-black mt-1 uppercase tracking-tighter">Participant 담당자</p>
                          <p className="text-[13px] font-black text-slate-600 mt-1">{m.seller.onePager?.picName || m.seller.name} <span className="opacity-40">{m.seller.onePager?.picTitle || "대표"}</span></p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0"><UserCheck size={18} className="text-emerald-500"/></div>
                      </div>
                      <div className="space-y-3 text-left">
                        <div className="flex items-center gap-3 text-[12px] font-bold text-slate-600"><div className="p-1.5 bg-white rounded-lg shadow-sm"><Phone size={14} className="text-emerald-500"/></div> {m.seller.phone}</div>
                        <div className="flex items-center gap-3 text-[12px] font-bold text-slate-600 truncate"><div className="p-1.5 bg-white rounded-lg shadow-sm"><Mail size={14} className="text-blue-500"/></div> {m.seller.email}</div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3 text-[12px] font-bold text-slate-600"><div className="p-1.5 bg-white rounded-lg shadow-sm"><MapPin size={14} className="text-rose-500"/></div> {m.location || '미지정'}</div>
                          <button onClick={()=>onProposeLocation(m.id, m.location)} className="text-[10px] font-black text-blue-500 hover:underline">장소변경</button>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- 3. 예약 현황 (Pending) --- */}
        {expandedSection === 'pending' && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 space-y-10 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">나의 예약 현황<br/><span className="text-lg text-slate-300 font-bold uppercase">(Meeting Status)</span></h2>
              <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                {['PENDING','MATCHED','ALL'].map((btn) => ( 
                  <button key={btn} onClick={() => setReservationFilter(btn as any)} className={`px-5 py-3 rounded-xl text-[11px] font-black transition-all ${reservationFilter === btn ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}> 
                    {btn === 'PENDING' ? '신청 대기' : btn === 'MATCHED' ? '매칭 완료' : '전체 보기'} 
                  </button> 
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredReservations.map((slot: any) => (
                <div key={slot.id} className={`bg-white p-8 rounded-[45px] shadow-xl border-2 flex flex-col min-h-[440px] ${slot.status === 'CLOSED' ? 'border-indigo-100 bg-slate-50/20' : 'border-white'}`}>
                  <div className="flex justify-between items-start mb-8 text-left">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase text-indigo-500 italic tracking-widest">SCHEDULE</p>
                      <h3 className="text-xl font-black">{new Date(slot.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</h3>
                      <div className="mt-2 inline-block px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-black text-sm">{formatMeetingTime(new Date(slot.startTime))}</div>
                    </div>
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black ${slot.status === 'CLOSED' ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'bg-emerald-50 text-emerald-600 animate-pulse'}`}>{slot.status === 'CLOSED' ? '매칭완료' : '신청대기'}</span>
                  </div>
                  <div className="space-y-4 pt-6 border-t border-slate-50 flex-grow text-left">
                    {slot.meetings.filter((m:any)=>m.status!=='REJECTED').length === 0 ? <p className="py-14 text-center text-slate-300 italic text-xs">신청자가 없습니다.</p> : 
                      slot.meetings.filter((m:any)=>m.status!=='REJECTED').map((m: any) => (
                        <div key={m.id} className="p-5 rounded-[30px] border border-slate-100 bg-white shadow-sm space-y-4 text-left">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-[15px] text-slate-800 truncate">{m.seller.companyName}</p>
                              <button onClick={() => handleViewOnePager(m.seller)} className="text-[10px] font-black text-indigo-500 mt-1 flex items-center gap-1.5 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md"><FileText size={10}/> 상세 프로필 보기</button>
                            </div>
                          </div>
                          {slot.status !== 'CLOSED' && ( 
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => onStatusUpdate(m.id, slot.id, "ACCEPT", m.seller.companyName)} className="bg-indigo-600 text-white py-2.5 rounded-2xl text-[11px] font-black shadow-lg">수락(Accept)</button>
                              <button onClick={() => onStatusUpdate(m.id, slot.id, "REJECT", m.seller.companyName)} className="bg-white text-rose-500 border border-rose-100 py-2.5 rounded-2xl text-[11px] font-black">거절(Reject)</button>
                            </div> 
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- 4. 셀러 탐색 디렉토리 --- */}
        {expandedSection === 'directory' && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 space-y-10 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
               <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">셀러 탐색 디렉토리<br/><span className="text-lg text-slate-300 font-bold uppercase">(Seller Discovery)</span></h2>
               <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                 <div className="relative flex-1 sm:w-80"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="회사명 검색..." className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-[22px] text-xs font-bold outline-none focus:ring-2 ring-indigo-100 transition-all shadow-sm"/></div>
                 <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="px-6 py-4 bg-white border border-slate-200 rounded-[22px] text-xs font-black text-slate-600 outline-none shadow-sm cursor-pointer hover:bg-slate-50"><option value="ALL">전체 산업 분야</option>{Object.keys(stats.industries).map(ind => <option key={ind} value={ind}>{ind}</option>)}</select>
               </div>
            </div>
            
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">업체 (Company)</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">산업 (Industry)</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">인력 정보 (PIC)</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">제품/서비스 (Product)</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-center">One-Pager</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSellers.map((seller: any) => (
                      <tr key={seller.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0"><Building2 size={20}/></div>
                            <div><p className="font-black text-sm text-slate-800">{seller.companyName}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{seller.onePager?.companyNameEn || "N/A"}</p></div>
                          </div>
                        </td>
                        <td className="px-8 py-6"><span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{seller.onePager?.industrySector || "N/A"}</span></td>
                        <td className="px-8 py-6">
                          <div className="space-y-1 text-left"><p className="text-xs font-bold text-slate-700">{seller.onePager?.ceoName || "-"} (CEO)</p><p className="text-[11px] text-slate-400 font-medium">{seller.onePager?.picName || seller.name} {seller.onePager?.picTitle}</p></div>
                        </td>
                        <td className="px-8 py-6 text-left"><p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-[200px]">{seller.onePager?.productType || "미등록"}</p></td>
                        <td className="px-8 py-6 text-center"><button onClick={() => handleViewOnePager(seller)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">프로필 보기 <ChevronRight size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredSellers.length === 0 && ( <div className="py-20 text-center text-slate-300 italic text-xs">검색 결과가 없습니다.</div> )}
            </div>
          </section>
        )}

        {/* --- 5. 셀러 데이터 분석 --- */}
        {expandedSection === 'analytics' && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 space-y-12 text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">셀러 데이터 분석 인사이트<br/><span className="text-lg text-slate-300 font-bold uppercase">(Seller Portfolio Insights)</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-100 space-y-8 text-left">
                 <div className="flex items-center gap-3 border-b border-slate-50 pb-6"><PieChart className="text-indigo-500" size={24}/><div><h3 className="text-base font-black text-slate-800">산업 분야 분포</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Industry Distribution)</p></div></div>
                 <div className="space-y-6">{Object.entries(stats.industries).map(([name, count]: any) => { const percent = Math.round((count / allSellers.length) * 100); return ( <div key={name} className="space-y-2.5 group text-left"><div className="flex justify-between text-[12px] font-bold text-slate-600 uppercase tracking-tighter"><span>{name}</span><span className="text-indigo-500">{count}개사 ({percent}%)</span></div><div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div></div></div> ) })}</div>
               </div>
               <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-100 space-y-8 text-left">
                 <div className="flex items-center gap-3 border-b border-slate-50 pb-6"><BarChart3 className="text-emerald-500" size={24}/><div><h3 className="text-base font-black text-slate-800">투자 단계 현황</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Investment Stages)</p></div></div>
                 <div className="flex items-end justify-around h-64 pt-6 gap-4">{Object.entries(stats.stages).map(([name, count]: any) => { const height = (count / allSellers.length) * 100; return ( <div key={name} className="flex flex-col items-center gap-4 w-full group relative"><span className="text-[11px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{count}</span><div className="w-full max-w-[45px] bg-emerald-50 border border-emerald-100 rounded-t-[20px] transition-all duration-1000 group-hover:bg-emerald-500 relative shadow-sm" style={{ height: `${Math.max(height, 5)}%` }}></div><span className="text-[10px] font-black text-slate-500 truncate w-full text-center uppercase tracking-tighter">{name}</span></div> ) })}</div>
               </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}