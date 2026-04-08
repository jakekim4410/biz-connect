"use client";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { 
  deleteUser, 
  updateUserAdmin, 
  deleteTimeSlot, 
  updateTimeSlotLocation,
  updateMeetingStatus,
  updateMeetingLocation,
  updateMeetingDateTime,
  approveUserQuickly
} from "./actions"; 
import { 
  Trash2, MapPin, Save, X, Edit2, Search, RotateCcw, 
  ShieldCheck, Users, Calendar, Clock, CheckCircle2, Ban, 
  Check, Download, BarChart3, Handshake, PieChart, Activity, Building2, Target, Zap,
  FileSearch, Award, Globe, Sparkles, TrendingUp, Lightbulb, Briefcase, FileText,
  Mail, Phone, User as UserIcon
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminClient({ stats, users, timeSlots, meetings }: any) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOnePager, setSelectedOnePager] = useState<any>(null); // 원페이저 모달 상태

  // 필터 상태
  const [filterUser, setFilterUser] = useState("");
  const [slotSubFilter, setSlotSubFilter] = useState("ALL");
  const [slotDateFilter, setSlotDateFilter] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterSeller, setFilterSeller] = useState("");
  const [matchStatusFilter, setMatchStatusFilter] = useState("ALL");

  useEffect(() => setMounted(true), []);

  const formatDate = (date: any) => date ? new Date(date).toISOString().split('T')[0] : "";
  const formatTime = (date: any) => date ? new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "";

  // 통계 계산 (Dashboard 시각화용)
  const analytics = useMemo(() => {
    const roles = { ADMIN: 0, BUYER: 0, SELLER: 0 };
    const statuses = { APPROVED: 0, PENDING: 0, REJECTED: 0 };
    
    users.forEach((u: any) => {
      if (u.role in roles) roles[u.role as keyof typeof roles]++;
      if (u.approvalStatus in statuses) statuses[u.approvalStatus as keyof typeof statuses]++;
    });

    const slotStats = { OPEN: 0, MATCHED: 0 };
    timeSlots.forEach((s: any) => {
      if (s.status === "OPEN") slotStats.OPEN++;
      else slotStats.MATCHED++;
    });

    const meetingStats = { PENDING: 0, ACCEPTED: 0, CONFIRMED: 0, REJECTED: 0, CANCELLED: 0 };
    meetings.forEach((m: any) => {
      if (m.status in meetingStats) meetingStats[m.status as keyof typeof meetingStats]++;
    });

    return { roles, statuses, slotStats, meetingStats };
  }, [users, timeSlots, meetings]);

  const filteredUsers = useMemo(() => users.filter((u: any) => 
    u.name.toLowerCase().includes(filterUser.toLowerCase()) || 
    (u.companyName && u.companyName.toLowerCase().includes(filterUser.toLowerCase()))
  ), [users, filterUser]);

  const filteredSlots = useMemo(() => timeSlots.filter((s: any) => {
    const d = formatDate(s.startTime);
    return (slotDateFilter === "" || d === slotDateFilter) && (slotSubFilter === "ALL" || (slotSubFilter === "OPEN" ? s.status === "OPEN" : s.status !== "OPEN"));
  }), [timeSlots, slotSubFilter, slotDateFilter]);

  const filteredMeetings = useMemo(() => meetings.filter((m: any) => {
    const d = formatDate(m.timeSlot?.startTime);
    const dateMatch = filterDate === "" || d === filterDate;
    const buyerMatch = !filterBuyer || m.buyer?.companyName?.includes(filterBuyer);
    const sellerMatch = !filterSeller || m.seller?.companyName?.includes(filterSeller);
    
    let statusMatch = true;
    if (matchStatusFilter === "PENDING") statusMatch = m.status === "PENDING";
    if (matchStatusFilter === "CONFIRMED") statusMatch = m.status === "ACCEPTED" || m.status === "CONFIRMED";
    if (matchStatusFilter === "REJECTED") statusMatch = m.status === "REJECTED" || m.status === "CANCELLED";

    return dateMatch && buyerMatch && sellerMatch && statusMatch;
  }), [meetings, filterDate, filterBuyer, filterSeller, matchStatusFilter]);

  // --- 엑셀 다운로드 함수들 (한영 병기 및 URL 추가) ---
  const downloadUsersExcel = () => {
    const data = filteredUsers.map((u: any) => ({
      "가입일 (Joined Date)": new Date(u.createdAt).toLocaleDateString(),
      "회사명 (Company Name)": u.companyName || "-",
      "이름 (Name)": u.name,
      "연락처 (Contact)": u.phone || "-",
      "이메일 (Email)": u.email,
      "직함 (Job Title)": u.jobTitle || "-",
      "계정 유형 (Role)": u.role,
      "승인 상태 (Status)": u.approvalStatus,
      "권한 (Permission)": u.isMaster ? "MASTER" : "MEMBER",
      "피치덱 링크 (Pitch Deck URL)": u.onePager?.pitchDeckUrl || "미등록",
      "웹사이트 (Website URL)": u.onePager?.websiteUrl || "미등록"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users_DB");
    XLSX.writeFile(wb, `Admin_Users_${formatDate(new Date())}.xlsx`);
  };

  const downloadSlotsExcel = () => {
    const data = filteredSlots.map((s: any) => ({
      "날짜 (Date)": formatDate(s.startTime),
      "시간 (Time)": formatTime(s.startTime),
      "바이어 생성자 (Host Company)": s.buyer?.companyName || "N/A",
      "바이어 담당자 (Host Name)": s.buyer?.name || "-",
      "지정 장소 (Location)": s.location || "미지정",
      "슬롯 상태 (Status)": s.status === "OPEN" ? "신청 가능 (OPEN)" : "매칭 완료 (MATCHED)"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Slots_DB");
    XLSX.writeFile(wb, `Admin_Slots_${formatDate(new Date())}.xlsx`);
  };

  const downloadMeetingsExcel = () => {
    const data = filteredMeetings.map((m: any) => ({
      "미팅 일자 (Meeting Date)": formatDate(m.timeSlot?.startTime),
      "미팅 시간 (Meeting Time)": formatTime(m.timeSlot?.startTime),
      "셀러/신청자 (Seller Company)": m.seller?.companyName || "-",
      "바이어/수락자 (Buyer Company)": m.buyer?.companyName || "-",
      "확정 장소 (Location)": m.location || m.timeSlot?.location || "미지정",
      "미팅 상태 (Status)": m.status,
      "셀러 피치덱 링크 (Seller Pitch Deck URL)": m.seller?.onePager?.pitchDeckUrl || "미등록"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Meetings_DB");
    XLSX.writeFile(wb, `Admin_Meetings_${formatDate(new Date())}.xlsx`);
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item, tempDate: formatDate(item.timeSlot?.startTime), tempTime: formatTime(item.timeSlot?.startTime) });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUserUpdate = async (id: number) => {
    setIsProcessing(true);
    const res = await updateUserAdmin(id, editForm);
    setIsProcessing(false);
    if (res.success) { setEditingId(null); alert("회원 정보가 성공적으로 수정되었습니다."); }
    else alert(res.error);
  };

  const handleQuickApprove = async (id: number) => {
    if (!confirm("이 유저를 즉시 승인하시겠습니까?")) return;
    setIsProcessing(true);
    const res = await approveUserQuickly(id);
    setIsProcessing(false);
    if (res.success) alert("승인 처리가 완료되었습니다.");
    else alert("처리에 실패했습니다.");
  };

  const handleMeetingUpdate = async (id: number) => {
    try {
      await Promise.all([
        updateMeetingLocation(id, editForm.location || ""),
        updateMeetingStatus(id, editForm.status),
        updateMeetingDateTime(editForm.timeSlotId, editForm.tempDate, editForm.tempTime)
      ]);
      setEditingId(null);
      alert("매칭 정보가 수정되었습니다.");
    } catch (error) {
      alert("수정 처리 중 오류가 발생했습니다.");
    }
  };

  const handleViewOnePager = (u: any) => {
    if (!u.onePager) {
      alert("해당 스타트업(SELLER)은 아직 원페이저 프로필을 등록하지 않았습니다.");
      return;
    }
    setSelectedOnePager({ ...u.onePager, user: u });
  };

  if (!mounted) return null;

const navItems = [
  { id: 'dashboard', label: '대시보드', sub: 'ANALYTICS', icon: <BarChart3 size={22}/> },
  { id: 'users', label: '회원 관리', sub: 'USERS', icon: <Users size={22}/>, alert: analytics.statuses.PENDING > 0 },
  { id: 'reservations', label: '슬롯 관리', sub: 'SLOTS', icon: <Calendar size={22}/> },
  { id: 'matches', label: '매칭 관리', sub: 'MEETINGS', icon: <Handshake size={22}/> },
];

  const getRoleBadge = (role: string) => {
    switch(role) {
      case "BUYER": return "bg-blue-100 text-blue-700 border-blue-200";
      case "SELLER": return "bg-orange-100 text-orange-600 border-orange-200";
      case "ADMIN": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case "BUYER": return "BUYER (바이어)";
      case "SELLER": return "SELLER (스타트업)";
      case "ADMIN": return "ADMIN (관리자)";
      default: return role;
    }
  };

  return (
    <div className={`space-y-6 md:space-y-10 pb-20 font-pretendard text-[#121926] text-left relative ${isProcessing ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
      
      {/* --- 네비게이션 --- */}
      {/* --- 네비게이션 --- */}
      <header className="bg-white/90 backdrop-blur-2xl p-2 md:p-6 rounded-[24px] md:rounded-[48px] shadow-2xl shadow-slate-200 border border-white/50 sticky top-4 z-40 mx-1 md:mx-0">
        <div className="flex flex-row md:flex-wrap md:justify-around gap-2 md:gap-4 overflow-x-auto snap-x hide-scrollbar">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id); cancelEditing(); }} 
              className={`relative flex flex-col items-center gap-1.5 p-3 md:p-4 transition-all duration-300 snap-center min-w-[80px] md:min-w-[100px] group`}
            >
              {item.alert && (
                <span className="absolute top-2 right-4 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse z-10 shadow-sm"></span>
              )}
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center transition-all duration-300 ${activeTab === item.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-110' : 'bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-white group-hover:shadow-md'}`}>
                {item.icon}
              </div>
              <div className="text-center mt-2">
                <span className={`text-[11px] md:text-[14px] font-black block leading-none tracking-tight ${activeTab === item.id ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.label}
                </span>
                <span className="text-[9px] md:text-[10px] font-black opacity-40 uppercase mt-1 block tracking-widest">{item.sub}</span>
              </div>
              {activeTab === item.id && (
                <div className="absolute -bottom-1 w-6 h-1 bg-slate-900 rounded-full animate-in fade-in slide-in-from-bottom-2"></div>
              )}
            </button>
          ))}

          <Link
            href="/admin/ai-search"
            className="flex flex-col items-center gap-1.5 p-3 md:p-4 transition-all duration-300 snap-center min-w-[80px] md:min-w-[100px] group"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center bg-indigo-50 text-indigo-500 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-xl transition-all">
              <Sparkles size={22}/>
            </div>
            <div className="text-center mt-2">
              <span className="text-[11px] md:text-[14px] font-black block leading-none tracking-tight text-slate-400 group-hover:text-indigo-600">
                AI 검색
              </span>
              <span className="text-[9px] md:text-[10px] font-black opacity-40 uppercase mt-1 block tracking-widest">AI SEARCH</span>
            </div>
          </Link>
        </div>
      </header>

      {/* --- 메인 콘텐츠 영역 --- */}
      <main className="min-h-[700px]">
        
        {/* [1] 대시보드 탭 */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 md:space-y-12 px-1 md:px-0">
            {/* 고밀도 요약 카드 섹션 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              <button onClick={() => { setActiveTab("users"); setFilterUser(""); }} className="bg-white border-slate-100 text-left p-6 md:p-9 rounded-[32px] md:rounded-[40px] border shadow-sm group hover:shadow-2xl hover:border-blue-200 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={120} className="text-blue-500"/></div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users size={24}/>
                </div>
                <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">총 가입 유저</p>
                <div className="flex items-end gap-2 mt-4">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 leading-none">{stats.userCount}</p>
                  <p className="text-xs md:text-sm font-bold text-slate-400 pb-1">TOTAL USERS</p>
                </div>
              </button>

              <button onClick={() => { setActiveTab("reservations"); setSlotSubFilter("ALL"); }} className="bg-white border-slate-100 text-left p-6 md:p-9 rounded-[32px] md:rounded-[40px] border shadow-sm group hover:shadow-2xl hover:border-indigo-200 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity"><Calendar size={120} className="text-indigo-500"/></div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Calendar size={24}/>
                </div>
                <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">생성된 슬롯</p>
                <div className="flex items-end gap-2 mt-4">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 leading-none">{stats.slotCount}</p>
                  <p className="text-xs md:text-sm font-bold text-slate-400 pb-1">TOTAL SLOTS</p>
                </div>
              </button>

              <button onClick={() => { setActiveTab("matches"); setMatchStatusFilter("CONFIRMED"); }} className="bg-white border-slate-100 text-left p-6 md:p-9 rounded-[32px] md:rounded-[40px] border shadow-sm group hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 size={120} className="text-emerald-500"/></div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle2 size={24}/>
                </div>
                <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">확정 매칭 건수</p>
                <div className="flex items-end gap-2 mt-4">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 leading-none">{stats.activeMatches}</p>
                  <p className="text-xs md:text-sm font-bold text-slate-400 pb-1">CONFIRMED</p>
                </div>
              </button>

              <button onClick={() => { setActiveTab("matches"); setMatchStatusFilter("PENDING"); }} className="bg-white border-slate-100 text-left p-6 md:p-9 rounded-[32px] md:rounded-[40px] border shadow-sm group hover:shadow-2xl hover:border-amber-200 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={120} className="text-amber-500"/></div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Clock size={24}/>
                </div>
                <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">검토중인 매칭</p>
                <div className="flex items-end gap-2 mt-4">
                  <p className="text-4xl md:text-5xl font-black text-slate-900 leading-none">{stats.pendingMatches}</p>
                  <p className="text-xs md:text-sm font-bold text-slate-400 pb-1">PENDING</p>
                </div>
              </button>
            </div>

            {/* 시각화 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              <div className="bg-white p-8 md:p-12 rounded-[40px] md:rounded-[56px] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-50"><PieChart size={28}/></div>
                  <div>
                    <h3 className="font-black text-xl md:text-2xl text-slate-900 leading-none">플랫폼 유저 분포</h3>
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-1.5">User Roles Distribution</p>
                  </div>
                </div>
                <div className="space-y-8">
                  {[
                    { name: 'SELLER (스타트업)', count: analytics.roles.SELLER, color: 'bg-indigo-600', sub: 'STARTUPS' },
                    { name: 'BUYER (바이어)', count: analytics.roles.BUYER, color: 'bg-slate-900', sub: 'INVESTORS/PARTNERS' },
                    { name: 'ADMIN (관리자)', count: analytics.roles.ADMIN, color: 'bg-slate-300', sub: 'SYSTEM OPERATORS' }
                  ].map((role) => (
                    <div key={role.name} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="min-w-0">
                          <span className="text-[11px] md:text-xs font-black text-slate-600 block">{role.name}</span>
                          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight">{role.sub}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl md:text-2xl font-black text-slate-900">{role.count}</span>
                          <span className="text-xs font-black text-slate-400 ml-1">({( (role.count / stats.userCount) * 100 || 0 ).toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-3 md:h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className={`h-full ${role.color} rounded-full transition-all duration-1000 ease-out`} style={{width: `${(role.count/stats.userCount)*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-8 md:p-12 rounded-[40px] md:rounded-[56px] text-white shadow-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-5 rounded-bl-[200px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="flex items-center gap-5 mb-10 relative z-10">
                  <div className="w-12 h-12 bg-white/10 text-emerald-400 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-xl"><Activity size={28}/></div>
                  <div>
                    <h3 className="font-black text-xl md:text-2xl leading-none">회원 승인 현황</h3>
                    <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mt-1.5">User Approval Pipeline</p>
                  </div>
                </div>
                <div className="space-y-8 relative z-10">
                  {[
                    { name: 'APPROVED (승인 완료)', count: analytics.statuses.APPROVED, color: 'bg-emerald-400', pct: (analytics.statuses.APPROVED/stats.userCount)*100 },
                    { name: 'PENDING (승인 대기)', count: analytics.statuses.PENDING, color: 'bg-amber-400', pct: (analytics.statuses.PENDING/stats.userCount)*100 },
                    { name: 'REJECTED (거절됨)', count: analytics.statuses.REJECTED, color: 'bg-rose-500', pct: (analytics.statuses.REJECTED/stats.userCount)*100 }
                  ].map((status) => (
                    <div key={status.name} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] md:text-xs font-black text-slate-300">{status.name}</span>
                        <div className="text-right">
                          <span className="text-xl md:text-2xl font-black">{status.count}</span>
                          <span className="text-xs font-black text-slate-500 ml-1">MEMBERS</span>
                        </div>
                      </div>
                      <div className="w-full h-3 md:h-4 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${status.color} rounded-full transition-all duration-1000 ease-out`} style={{width: `${status.pct}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center relative z-10">
                   <div>
                     <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">실시간 매칭 성사율</p>
                     <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">{( (stats.activeMatches / stats.slotCount) * 100 || 0 ).toFixed(1)}%</p>
                   </div>
                   <div className="flex -space-x-2">
                     {[...Array(5)].map((_,i) => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">?</div>)}
                   </div>
                </div>
              </div>
            </div>

            {/* 고차원 파이프라인 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
               <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-100 group">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white"><Target size={24}/></div>
                  <h3 className="font-black text-lg md:text-xl text-slate-900 tracking-tight">상담 슬롯 예약 지표</h3>
                </div>
                <div className="space-y-8">
                  {[
                    { name: 'MATCHED (매칭 완료)', count: analytics.slotStats.MATCHED, color: 'bg-blue-600', total: stats.slotCount },
                    { name: 'OPEN (신청 대기 중)', count: analytics.slotStats.OPEN, color: 'bg-slate-200', total: stats.slotCount }
                  ].map((stat) => (
                    <div key={stat.name} className="space-y-3">
                      <div className="flex justify-between items-end text-[11px] md:text-xs font-black">
                        <span className="text-slate-500 uppercase tracking-widest">{stat.name}</span>
                        <div className="text-right">
                          <span className="text-slate-900 text-lg md:text-xl font-black">{stat.count}</span>
                          <span className="text-slate-400 ml-1">/ {stat.total}</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                        <div className={`h-full ${stat.color} rounded-full transition-all duration-1000`} style={{width: `${(stat.count/stat.total)*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-100 group">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-amber-600 group-hover:text-white"><Zap size={24}/></div>
                  <h3 className="font-black text-lg md:text-xl text-slate-900 tracking-tight">미팅 라이프사이클 분배</h3>
                </div>
                <div className="space-y-7">
                  {[
                    { name: '검토 (PENDING)', count: analytics.meetingStats.PENDING, color: 'bg-amber-400' },
                    { name: '승인 (ACCEPTED/CONFIRMED)', count: analytics.meetingStats.ACCEPTED + analytics.meetingStats.CONFIRMED, color: 'bg-indigo-600' },
                    { name: '종결 (REJECTED/CANCELLED)', count: analytics.meetingStats.REJECTED + analytics.meetingStats.CANCELLED, color: 'bg-slate-200' }
                  ].map((stat) => (
                    <div key={stat.name} className="space-y-2.5">
                      <div className="flex justify-between items-end text-[11px] md:text-xs font-black">
                        <span className="text-slate-500 uppercase tracking-widest">{stat.name}</span>
                        <span className="text-slate-900 text-base md:text-lg font-black">{stat.count} <span className="text-xs text-slate-400 font-bold ml-0.5">REQ</span></span>
                      </div>
                      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className={`h-full ${stat.color} rounded-full transition-all duration-1000`} style={{width: `${(stat.count/meetings.length)*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2] 회원 관리 탭 */}
        {activeTab === "users" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 md:space-y-8 px-1 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/50 pb-6 md:border-none md:pb-8">
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">가입 회원 관리</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-widest">User Directory</span>
                  <span className="text-sm text-slate-400 font-bold tracking-tight">/ {filteredUsers.length} MEMBERS FOUND</span>
                </div>
              </div>
              <button 
                onClick={downloadUsersExcel} 
                className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl text-[13px] font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all active:scale-95"
              >
                <Download size={18}/> 유저 DB 다운로드 (EXCEL)
              </button>
            </div>

            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden">
              <div className="p-5 md:p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input 
                    type="text" 
                    placeholder="이름 또는 회사명 검색..." 
                    value={filterUser} 
                    onChange={(e) => setFilterUser(e.target.value)} 
                    className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm" 
                  />
                </div>
                {analytics.statuses.PENDING > 0 && (
                   <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 animate-pulse">
                     <Clock size={14}/>
                     <span className="text-[11px] font-black">승인 대기 중: {analytics.statuses.PENDING}명</span>
                   </div>
                )}
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="p-6 pl-8">회사 및 담당자 정보</th>
                      <th className="p-6">권한 등급</th>
                      <th className="p-6">승인 상태</th>
                      <th className="p-6">계정 유형</th>
                      <th className="p-6 pr-8 text-right">관측 및 제어</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u: any) => {
                      const isEditing = editingId === u.id;
                      return (
                        <tr key={u.id} className={`transition-all duration-200 group ${isEditing ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'}`}>
                          <td className="p-6 pl-8">
                            {isEditing ? (
                              <div className="flex flex-col gap-3 max-w-xs">
                                <input className="w-full border border-indigo-200 px-4 py-3 text-sm rounded-xl bg-white font-black outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm" value={editForm.companyName || ""} onChange={e => setEditForm({...editForm, companyName: e.target.value})} placeholder="회사명" />
                                <input className="w-full border border-indigo-200 px-4 py-3 text-sm rounded-xl bg-white font-bold outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm" value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="이름" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${u.role === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-100'}`}>
                                  {u.role === 'ADMIN' ? <ShieldCheck size={24}/> : <Building2 size={24}/>}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[150px]">{u.companyName || "No Company"}</div>
                                    {u.isMaster && <span className="bg-indigo-50 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">HQ</span>}
                                  </div>
                                  <div className="font-black text-slate-900 text-[15px] truncate mt-0.5">{u.name}</div>
                                  <div className="text-[11px] text-slate-400 font-bold truncate mt-1 flex items-center gap-2 uppercase tracking-tight">
                                     <Mail size={10} className="shrink-0"/> {u.email}
                                     <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                     <Phone size={10} className="shrink-0"/> {u.phone || "N/A"}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            {isEditing ? (
                              <select value={String(editForm.isMaster)} onChange={e => setEditForm({...editForm, isMaster: e.target.value === "true"})} className="w-full min-w-[140px] p-3 border border-indigo-200 rounded-xl text-xs font-black bg-white outline-none focus:ring-4 focus:ring-indigo-50 cursor-pointer shadow-sm">
                                <option value="true">MASTER (전권자)</option>
                                <option value="false">MEMBER (멤버)</option>
                              </select>
                            ) : (
                               u.role === 'ADMIN' ? (
                                 <span className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-black shadow-sm border border-purple-100 uppercase tracking-widest"><ShieldCheck size={12}/> SYSTEM ADMIN</span>
                               ) : u.isMaster ? (
                                 <span className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black shadow-sm border border-indigo-100 uppercase tracking-widest"><ShieldCheck size={12}/> MASTER PRO</span>
                               ) : (
                                 <span className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black border border-slate-100 uppercase tracking-widest"><Users size={12}/> MEMBER</span>
                               )
                            )}
                          </td>
                          <td className="p-6">
                            {isEditing ? (
                              <select value={editForm.approvalStatus} onChange={e => setEditForm({...editForm, approvalStatus: e.target.value})} className="w-full min-w-[140px] p-3 border border-indigo-200 rounded-xl text-xs font-black bg-white outline-none focus:ring-4 focus:ring-indigo-50 cursor-pointer shadow-sm">
                                <option value="APPROVED">APPROVED (승인)</option>
                                <option value="PENDING">PENDING (대기)</option>
                                <option value="REJECTED">REJECTED (거절)</option>
                              </select>
                            ) : (
                              <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black shadow-sm border ${
                                u.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                u.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' : 'bg-rose-50 text-rose-600 border-rose-100'
                              } uppercase tracking-widest`}>
                                {u.approvalStatus === 'APPROVED' ? <CheckCircle2 size={13}/> : u.approvalStatus === 'PENDING' ? <Clock size={13}/> : <Ban size={13}/>}
                                {u.approvalStatus}
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                            {isEditing ? (
                              <select 
                                value={editForm.role} 
                                onChange={(e) => setEditForm({...editForm, role: e.target.value})} 
                                className={`w-full min-w-[140px] text-[10px] font-black px-4 py-3 rounded-xl transition-all outline-none appearance-none cursor-pointer border shadow-sm ${getRoleBadge(editForm.role)}`}
                              >
                                <option value="BUYER">BUYER (바이어)</option>
                                <option value="SELLER">SELLER (스타트업)</option>
                                <option value="ADMIN">ADMIN (관리자)</option>
                              </select>
                            ) : (
                              <span className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${getRoleBadge(u.role)} shadow-sm`}>
                                {getRoleLabel(u.role)}
                              </span>
                            )}
                          </td>
                          <td className="p-6 pr-8 text-right">
                            <div className="flex justify-end items-center gap-2.5">
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleUserUpdate(u.id)} className="p-3 text-white bg-slate-900 rounded-xl shadow-lg hover:bg-indigo-600 transition-all active:scale-95"><Save size={18}/></button>
                                  <button onClick={cancelEditing} className="p-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><X size={18}/></button>
                                </>
                              ) : (
                                <>
                                  {u.approvalStatus === "PENDING" && (
                                    <button onClick={() => handleQuickApprove(u.id)} className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">
                                      <Check size={16}/> 즉시 승인
                                    </button>
                                  )}
                                  
                                  {u.role === "SELLER" && (
                                    <button onClick={() => handleViewOnePager(u)} className="p-3 text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 rounded-xl border border-indigo-100 hover:border-indigo-600 transition-all shadow-sm" title="원페이저 상세 보기">
                                      <FileSearch size={18}/>
                                    </button>
                                  )}

                                  <button onClick={() => startEditing(u)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-all" title="회원 정보 수정">
                                    <Edit2 size={18}/>
                                  </button>
                                  <button onClick={() => confirm("회원 계정을 영구 삭제하시겠습니까?") && deleteUser(u.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="계정 완전 삭제">
                                    <Trash2 size={18}/>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* [3] 슬롯 관리 탭 */}
        {activeTab === "reservations" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 md:space-y-8 px-1 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/50 pb-6 md:border-none md:pb-8">
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">상담 슬롯 관리</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-widest">Global Slots</span>
                  <span className="text-sm text-slate-400 font-bold tracking-tight">/ {filteredSlots.length} ACTIVE SLOTS</span>
                </div>
              </div>
              <button 
                onClick={downloadSlotsExcel} 
                className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl text-[13px] font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all active:scale-95"
              >
                <Download size={18}/> 슬롯 데이터 다운로드 (EXCEL)
              </button>
            </div>

            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden">
              <div className="p-5 md:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-5 items-center justify-between">
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                  {["ALL", "OPEN", "MATCHED"].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setSlotSubFilter(f)} 
                      className={`px-6 py-2.5 rounded-xl text-[12px] font-black transition-all ${slotSubFilter === f ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                    >
                      {f === "ALL" ? "전체 보기" : f === "OPEN" ? "신청 대기" : "매칭 완료"}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={16}/>
                  <input 
                    type="date" 
                    value={slotDateFilter} 
                    onChange={(e) => setSlotDateFilter(e.target.value)} 
                    className="pl-10 pr-4 py-3 text-sm font-black border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-white transition-all shadow-sm" 
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="p-6 pl-8">상담 일시 (Schedule)</th>
                      <th className="p-6">바이어 기업 (Host Company)</th>
                      <th className="p-6">지정 장소 (Location)</th>
                      <th className="p-6 text-center">상태 (Status)</th>
                      <th className="p-6 pr-8 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSlots.map((s: any) => (
                      <tr key={s.id} className="hover:bg-indigo-50/40 transition-all duration-200 group">
                        <td className="p-6 pl-8">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{formatDate(s.startTime)}</div>
                          <div className="text-xl md:text-2xl font-black text-indigo-600 mt-1.5 tracking-tight">{formatTime(s.startTime)}</div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">B</div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-[15px] truncate">{s.buyer?.companyName}</p>
                              <p className="text-[11px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
                                <UserIcon size={12}/> {s.buyer?.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2.5 max-w-[240px] bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-indigo-200 transition-all">
                            <MapPin size={16} className="text-rose-500 shrink-0" />
                            <input 
                              type="text" 
                              placeholder="장소 지정..." 
                              defaultValue={s.location || ""} 
                              onBlur={(e) => updateTimeSlotLocation(s.id, e.target.value)} 
                              className="text-xs font-bold text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-300" 
                            />
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${s.status === 'OPEN' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-indigo-600 text-white border-indigo-700'}`}>
                            {s.status === 'OPEN' ? 'Available' : 'Matched'}
                          </span>
                        </td>
                        <td className="p-6 pr-8 text-right">
                          <button 
                            onClick={() => confirm("이 슬롯을 영구 삭제하시겠습니까?") && deleteTimeSlot(s.id)} 
                            className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                          >
                            <Trash2 size={20}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* [4] 매칭 관리 탭 */}
        {activeTab === "matches" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 md:space-y-8 px-1 md:px-0">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/50 pb-6 md:border-none md:pb-8">
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">미팅 매칭 관리</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-widest">Meeting Logic</span>
                  <span className="text-sm text-slate-400 font-bold tracking-tight">/ {filteredMeetings.length} MATCHES RECORDED</span>
                </div>
              </div>
              <button 
                onClick={downloadMeetingsExcel} 
                className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl text-[13px] font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all"
              >
                <Download size={18}/> 매칭 통합 데이터 다운로드 (EXCEL)
              </button>
            </div>

            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden">
              <div className="p-5 md:p-8 bg-slate-50/50 border-b border-slate-100 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  {["ALL", "PENDING", "CONFIRMED", "REJECTED"].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setMatchStatusFilter(f)} 
                      className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all ${matchStatusFilter === f ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-white text-slate-400 border border-slate-100 hover:text-slate-600 hover:border-slate-300"}`}
                    >
                      {f === "ALL" ? "전체 목록" : f === "PENDING" ? "검토중" : f === "CONFIRMED" ? "승인·확정" : "거절·취소"}
                    </button>
                  ))}
                  <button onClick={() => {setFilterDate(""); setFilterBuyer(""); setFilterSeller(""); setMatchStatusFilter("ALL");}} className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-white text-rose-500 rounded-xl text-[11px] font-black border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                    <RotateCcw size={14}/> 초기화
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" placeholder="바이어 검색..." value={filterBuyer} onChange={(e) => setFilterBuyer(e.target.value)} className="w-full pl-10 pr-4 py-3.5 text-xs font-black border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-white shadow-sm" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" placeholder="셀러 검색..." value={filterSeller} onChange={(e) => setFilterSeller(e.target.value)} className="w-full pl-10 pr-4 py-3.5 text-xs font-black border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-white shadow-sm" />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={16}/>
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full pl-10 pr-4 py-3.5 text-xs font-black border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-white shadow-sm text-slate-600" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="p-6 pl-8">미팅 스케줄</th>
                      <th className="p-6">참여 기업 (S / B)</th>
                      <th className="p-6">확정 장소</th>
                      <th className="p-6 text-center">프로세스 상태</th>
                      <th className="p-6 pr-8 text-right">제어</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredMeetings.map((m: any) => {
                      const isEditing = editingId === m.id;
                      const status = isEditing ? editForm.status : m.status;
                      return (
                        <tr key={m.id} className={`transition-all duration-200 group ${isEditing ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'}`}>
                          <td className="p-6 pl-8">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 max-w-[150px]">
                                <input type="date" className="border border-indigo-200 px-3 py-2 text-xs font-black rounded-xl bg-white outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm" value={editForm.tempDate} onChange={e => setEditForm({...editForm, tempDate: e.target.value})} />
                                <input type="time" className="border border-indigo-200 px-3 py-2 text-xs font-black rounded-xl bg-white outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm" value={editForm.tempTime} onChange={e => setEditForm({...editForm, tempTime: e.target.value})} />
                              </div>
                            ) : (
                              <div className="min-w-[100px]">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{formatDate(m.timeSlot?.startTime)}</div>
                                <div className="text-lg md:text-xl font-black text-indigo-600 mt-1.5 tracking-tight">{formatTime(m.timeSlot?.startTime)}</div>
                              </div>
                            )}
                          </td>
                          <td className="p-6 py-8 space-y-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black flex items-center justify-center shrink-0 border border-orange-100">S</span> 
                              <span className="text-sm font-black text-slate-900 truncate max-w-[180px]">{m.seller?.companyName || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black flex items-center justify-center shrink-0 border border-blue-100">B</span> 
                              <span className="text-sm font-black text-slate-700 truncate max-w-[180px]">{m.buyer?.companyName || "N/A"}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            {isEditing ? (
                              <input className="border border-indigo-200 px-4 py-3 text-xs font-black w-full max-w-[200px] rounded-xl bg-white outline-none focus:ring-4 focus:ring-indigo-500 shadow-lg" value={editForm.location || ""} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="확정 장소 입력..." />
                            ) : (
                              <div className="text-xs font-black text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 inline-flex items-center gap-2 group-hover:bg-white group-hover:border-indigo-100 transition-colors shadow-sm">
                                <MapPin size={14} className="text-indigo-500"/> 
                                {m.location || m.timeSlot?.location || "TBA"}
                              </div>
                            )}
                          </td>
                          <td className="p-6 text-center">
                            <div className="relative inline-block w-full max-w-[180px]">
                              <select 
                                disabled={!isEditing}
                                value={status} 
                                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                className={`w-full text-[10px] font-black px-4 py-3 rounded-xl transition-all outline-none appearance-none shadow-sm border ${
                                  isEditing ? 'border-indigo-600 bg-white text-slate-900 shadow-xl cursor-pointer' : 'border-transparent bg-slate-50 text-slate-500 cursor-default'
                                } ${
                                  !isEditing && (status === 'ACCEPTED' || status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                  status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                  status === 'REJECTED' ? 'bg-slate-100 text-slate-400' : 
                                  'bg-amber-50 text-amber-600 animate-pulse border-amber-200')
                                } uppercase tracking-widest`}
                              >
                                <option value="PENDING">PENDING (대기)</option>
                                <option value="ACCEPTED">ACCEPTED (승인)</option>
                                <option value="CONFIRMED">CONFIRMED (확정)</option>
                                <option value="REJECTED">REJECTED (거절)</option>
                                <option value="CANCELLED">CANCELLED (취소)</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-6 pr-8 text-right">
                            <div className="flex justify-end gap-2.5">
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleMeetingUpdate(m.id)} className="p-3 text-white bg-slate-900 rounded-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95"><Save size={18}/></button>
                                  <button onClick={cancelEditing} className="p-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><X size={18}/></button>
                                </>
                              ) : (
                                <button onClick={() => startEditing(m)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-all" title="매칭 정보 수정">
                                  <Edit2 size={18}/>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- 원페이저 상세 모달 (Admin 뷰어) --- */}
      {selectedOnePager && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in zoom-in-95 text-left">
          <div className="bg-white w-full max-w-5xl max-h-[98vh] md:max-h-[94vh] overflow-y-auto rounded-[30px] md:rounded-[50px] shadow-2xl relative scrollbar-hide border border-white/20">
            
            <div className="sticky top-0 bg-white/90 backdrop-blur-md px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center z-20">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-indigo-600 text-white rounded-[14px] md:rounded-2xl shadow-lg shadow-indigo-100">
                  <Award size={24} className="md:w-7 md:h-7"/>
                </div>
                <div className="text-left">
                  <h3 className="text-lg md:text-2xl font-black text-slate-900 leading-none">Business One-Pager (Admin View)</h3>
                  <p className="text-[9px] md:text-xs font-black text-indigo-500 uppercase mt-1 md:mt-1.5 tracking-widest">Detail Information View</p>
                </div>
              </div>
              <button onClick={() => setSelectedOnePager(null)} className="p-2 md:p-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all group">
                <X size={20} className="md:w-6 md:h-6 group-active:scale-90"/>
              </button>
            </div>

            <div className="p-6 md:p-12 space-y-10 md:space-y-12 text-left bg-slate-50/50">
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 border-b border-slate-200/60 pb-10 md:pb-12">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 rounded-[24px] md:rounded-[40px] flex items-center justify-center text-white shrink-0 shadow-2xl">
                  <Building2 size={48} className="md:w-16 md:h-16"/>
                </div>
                <div className="space-y-4 md:space-y-5 flex-1">
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">{selectedOnePager.companyNameKr || selectedOnePager.user?.companyName}</h2>
                    <p className="text-sm md:text-lg font-black text-slate-400 uppercase tracking-tighter">{selectedOnePager.companyNameEn || "N/A"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 md:px-5 py-1.5 md:py-2 bg-indigo-600 text-white rounded-full text-[11px] md:text-xs font-black shadow-lg shadow-indigo-200">{selectedOnePager.industrySector}</span>
                    <span className="px-4 md:px-5 py-1.5 md:py-2 bg-slate-900 text-white rounded-full text-[11px] md:text-xs font-black shadow-lg shadow-slate-200">{selectedOnePager.investmentStage}</span>
                    <span className="px-4 md:px-5 py-1.5 md:py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] md:text-xs font-black">설립연도: {selectedOnePager.yearFounded || "-"}년</span>
                    {selectedOnePager.ceoName && <span className="px-4 md:px-5 py-1.5 md:py-2 bg-amber-50 text-amber-600 rounded-full text-[11px] md:text-xs font-black">대표: {selectedOnePager.ceoName}</span>}
                  </div>
                  {selectedOnePager.websiteUrl && (
                    <a href={selectedOnePager.websiteUrl} target="_blank" className="inline-flex items-center gap-1.5 text-indigo-500 font-bold hover:text-indigo-700 hover:underline text-xs md:text-sm bg-indigo-50 px-3 py-1.5 rounded-lg w-fit transition-colors">
                      <Globe size={14}/> {selectedOnePager.websiteUrl}
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-10">
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-indigo-600 font-black text-xs md:text-sm uppercase tracking-widest border-b border-indigo-50 pb-3">
                      <Sparkles size={18}/> 주요 제품 및 서비스
                    </h5>
                    <p className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{selectedOnePager.productType}</p>
                    <div className="bg-indigo-50/50 p-5 md:p-6 rounded-[20px] text-slate-600 text-sm leading-relaxed font-bold">
                      {selectedOnePager.solutionSummary}
                    </div>
                  </section>

                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-rose-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-rose-50 pb-3">
                      <Target size={18}/> 마켓 문제점 (Problem)
                    </h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.problem || "등록된 상세 정보가 없습니다."}</p>
                  </section>
                </div>

                <div className="space-y-10">
                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-emerald-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-emerald-50 pb-3">
                      <TrendingUp size={18}/> 성과 및 지표 (Traction)
                    </h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.traction || "등록된 상세 정보가 없습니다."}</p>
                  </section>

                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-amber-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-amber-50 pb-3">
                      <Lightbulb size={18}/> 해결 방안 (Solution)
                    </h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.solution || "등록된 상세 정보가 없습니다."}</p>
                  </section>

                  <section className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100 space-y-4">
                    <h5 className="flex items-center gap-2 text-blue-500 font-black text-xs md:text-sm uppercase tracking-widest border-b border-blue-50 pb-3">
                      <Briefcase size={18}/> 비즈니스 모델 (Biz Model)
                    </h5>
                    <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedOnePager.bizModel || "등록된 상세 정보가 없습니다."}</p>
                  </section>
                </div>
              </div>

              <div className="pt-8 md:pt-12 flex flex-col sm:flex-row gap-3 md:gap-4">
                {selectedOnePager.pitchDeckUrl && (
                  <a href={selectedOnePager.pitchDeckUrl} target="_blank" className="flex-[2] flex items-center justify-center gap-2 bg-slate-900 text-white py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-sm md:text-base shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98]">
                    <FileText size={20}/> Pitch Deck (PDF) 다운로드
                  </a>
                )}
                <button onClick={() => setSelectedOnePager(null)} className="flex-1 py-4 md:py-5 bg-white border-2 border-slate-200 text-slate-600 rounded-[20px] md:rounded-[24px] font-black text-sm md:text-base hover:bg-slate-50 transition-all shadow-sm">
                  닫기
                </button>
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