"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  applyMeetingAction, 
  handleMemberStatus, 
  transferMasterRole, 
  reRequestApprovalAction,
} from "./actions";
import { updateProfileAction } from "../profile/action";
import { respondLocationChange } from "../buyer/actions";
import { 
  MapPin, Search, Handshake, Ban, Phone, Mail, Check, X as XIcon, 
  Send, Download, Clock, FileText, Sparkles, ChevronRight, 
  Users, ShieldCheck, User as UserIcon, Save, AlertCircle, Building2
} from "lucide-react";
import * as XLSX from 'xlsx';

export default function SellerClient({ 
  user,
  confirmedMeetings = [], 
  pendingMeetings = [], 
  rejectedMeetings = [], 
  availableSlots = [], 
  sellerId,
  hasOnePager,
  pendingMembers = [],
  approvedMembers = []
}: any) {
  // --- [1] 모든 Hook은 반드시 최상단에 위치해야 합니다 ---
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('available');
  const [confirmedSort, setConfirmedSort] = useState("asc");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hook 규칙 준수: useMemo를 리턴문 위로 올림
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

  // --- [2] Hook 선언이 끝난 후 조기 리턴(Early Returns)을 처리합니다 ---

  if (!mounted) return null;
  if (!user) return <div className="p-10 text-center font-bold">사용자 정보를 찾을 수 없습니다.</div>;

  // [승인 대기 중 화면]
  if (user.approvalStatus === "PENDING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-left font-pretendard">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl text-center max-w-md border border-blue-100">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">가입 승인 대기 중</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {user.companyName}의 마스터 계정 승인이 필요합니다.<br/>승인 후 서비스를 이용하실 수 있습니다.
          </p>
          <button onClick={() => window.location.reload()} className="text-blue-600 font-bold text-sm underline">새로고침 (Refresh)</button>
        </div>
      </div>
    );
  }

  // [가입 거절 화면]
  if (user.approvalStatus === "REJECTED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-left font-pretendard">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl text-center max-w-md border border-rose-100">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">가입 승인 거절</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            죄송합니다. 회사 정보가 일치하지 않아 거절되었습니다.<br/>정보를 수정하여 다시 신청해 주세요.
          </p>
          <button 
            onClick={async () => { 
              setIsPending(true);
              await reRequestApprovalAction(); 
              window.location.reload(); 
            }}
            className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black text-lg shadow-xl"
          >
            승인 재신청 하기
          </button>
        </div>
      </div>
    );
  }

  // --- [3] 헬퍼 함수 정의 ---

  const formatMeetingTime = (date: Date) => {
    const d = new Date(date);
    const h24 = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const ampm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

  const downloadExcel = () => {
    if (confirmedMeetings.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }
    const excelData = confirmedMeetings.map((m: any) => ({
      "일자 (Date)": new Date(m.timeSlot.startTime).toLocaleDateString(),
      "시간 (Time)": formatMeetingTime(new Date(m.timeSlot.startTime)),
      "장소 (Location)": m.location || "미지정",
      "상대 업체명 (Buyer)": m.buyer?.companyName || "-",
      "담당자 (Name)": m.buyer?.name || "-",
      "연락처 (Phone)": m.buyer?.phone || "-",
      "이메일 (Email)": m.buyer?.email || "-",
      "나의 제안 (Proposal)": m.proposal || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Confirmed_Seller");
    XLSX.writeFile(workbook, `Seller_Meetings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const onApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirm("이 바이어에게 미팅을 신청하시겠습니까?")) return;
    setIsPending(true);
    try { 
      await applyMeetingAction(new FormData(e.currentTarget), sellerId); 
      alert("✅ 신청 완료!"); 
      setExpandedSection('pending');
    } finally { setIsPending(false); }
  };

  const handleLocationResponse = async (meetingId: number, action: "ACCEPT" | "REJECT") => {
    const msg = action === "ACCEPT" ? "수락하시겠습니까?" : "거절하시겠습니까?";
    if (!confirm(msg)) return;
    setIsPending(true);
    try {
      await respondLocationChange(meetingId, action);
      alert(action === "ACCEPT" ? "✅ 최종 변경되었습니다." : "거절되었습니다.");
    } finally { setIsPending(false); }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const res = await updateProfileAction(new FormData(e.currentTarget));
    setIsPending(false);
    if (res.success) alert("✅ 정보가 수정되었습니다.");
    else alert(res.error || "수정 실패");
  };

  // --- [4] 메인 렌더링 영역 ---

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20 text-left">
      <div className="absolute top-[-10%] left-[-5%] w-[90%] md:w-[45%] h-[40%] bg-emerald-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* 마스터 전용 멤버 관리 섹션 */}
        {user.isMaster && (
          <section className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl space-y-8 animate-in slide-in-from-top-4">
            <h3 className="text-xl font-black flex items-center gap-3"><ShieldCheck className="text-blue-400"/> 멤버 승인 및 관리 (Master Console)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">승인 대기 중 (PENDING REQUESTS)</p>
                {pendingMembers.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">새로운 요청이 없습니다.</p>
                ) : (
                  pendingMembers.map((m: any) => (
                    <div key={m.id} className="bg-white/5 p-5 rounded-3xl flex justify-between items-center border border-white/10">
                      <div>
                        <p className="font-bold text-sm">{m.name} <span className="text-blue-400">({m.jobTitle})</span></p>
                        <p className="text-[10px] text-slate-400">{m.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => { setIsPending(true); await handleMemberStatus(m.id, "APPROVED"); setIsPending(false); }} 
                          className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-500 transition-colors"
                        >승인</button>
                        <button 
                          onClick={async () => { setIsPending(true); await handleMemberStatus(m.id, "REJECTED"); setIsPending(false); }} 
                          className="px-4 py-2 bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all"
                        >거절</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">소속 멤버 및 마스터 권한 (APPROVED TEAM)</p>
                {approvedMembers.map((m: any) => (
                  <div key={m.id} className="bg-white/5 p-5 rounded-3xl flex justify-between items-center border border-white/10">
                    <div>
                      <p className="font-bold text-sm">{m.name} {m.id === user.id && <span className="text-blue-400 text-[10px] ml-1">(YOU)</span>}</p>
                      <p className="text-[10px] text-slate-400">{m.jobTitle}</p>
                    </div>
                    {m.id !== user.id && (
                      <button 
                        onClick={async () => { 
                          if(confirm(`${m.name}님에게 마스터 권한을 넘기시겠습니까? 본인은 마스터 권한이 해제됩니다.`)) {
                            setIsPending(true);
                            await transferMasterRole(m.id);
                            setIsPending(false);
                          }
                        }} 
                        className="px-3 py-1.5 border border-white/20 rounded-xl text-[9px] font-black hover:bg-white hover:text-black transition-all"
                      >마스터 위임</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 원페이저 작성 독려 배너 */}
        {!hasOnePager && (
          <Link href="/seller/one-pager" className="block group">
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 p-[1px] rounded-[30px] shadow-2xl transition-transform hover:scale-[1.01] active:scale-[0.99]">
              <div className="bg-white/95 backdrop-blur-xl rounded-[29px] p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                    <Sparkles size={28} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 leading-tight">투자자/바이어 매칭 확률을 3배 높이세요!</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1 italic tracking-tight uppercase tracking-[0.05em]">Complete your Company One-Pager to attract more partners.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-lg group-hover:bg-slate-900 transition-colors">
                  지금 바로 작성하기 <ChevronRight size={18}/>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* 상단 네비게이션 */}
        <header className="bg-white/90 backdrop-blur-2xl p-4 md:p-8 rounded-[35px] md:rounded-[45px] shadow-xl border border-white">
          <div className="grid grid-cols-3 md:flex md:justify-around gap-2 md:gap-8">
            {[
              { id: 'available', icon: <Search size={22}/>, label: '매칭 탐색', sub: '(SEARCH)', count: availableSlots.length },
              { id: 'pending', icon: <Clock size={22}/>, label: '신청 현황', sub: '(STATUS)', count: pendingMeetings.length },
              { id: 'confirmed', icon: <Handshake size={22}/>, label: '확정 일정', sub: '(LIST)', count: confirmedMeetings.length },
              { id: 'rejected', icon: <Ban size={22}/>, label: '거절 내역', sub: '(REJECTED)', count: rejectedMeetings.length },
              { id: 'profile', icon: <UserIcon size={22}/>, label: '내 프로필', sub: '(PROFILE)', count: null },
            ].map((item) => (
              <button key={item.id} onClick={() => setExpandedSection(item.id)} className={`flex flex-col items-center gap-1.5 p-2 transition-all duration-300 ${expandedSection === item.id ? 'scale-105' : ''}`}>
                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-slate-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>{item.icon}</div>
                <div className="text-center">
                    <span className={`text-[9px] md:text-sm font-black block leading-none ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'}`}>{item.label} {item.count !== null && `(${item.count})`}</span>
                    <span className="text-[6px] md:text-[9px] font-bold opacity-40 uppercase mt-0.5">{item.sub}</span>
                </div>
              </button>
            ))}
            <Link href="/seller/one-pager" className="flex flex-col items-center gap-1.5 p-2 group transition-all duration-300 hover:scale-105">
              <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors`}>
                <FileText size={22}/>
              </div>
              <div className="text-center">
                  <span className={`text-[9px] md:text-sm font-black block leading-none text-slate-500 group-hover:text-indigo-600`}>기업 소개 {hasOnePager ? "(관리)" : "(작성)"}</span>
                  <span className="text-[6px] md:text-[9px] font-bold opacity-40 uppercase mt-0.5">(ONE-PAGER)</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="min-h-[500px]">
          {/* 프로필 수정 섹션 */}
          {expandedSection === 'profile' && (
            <section className="bg-white p-8 md:p-12 rounded-[45px] shadow-xl border border-white animate-in fade-in duration-500 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-50 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                    <UserIcon size={32}/>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                       <h3 className="text-2xl font-black text-slate-800">[{user.companyName}] {user.name}</h3>
                       {user.isMaster ? (
                         <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-lg shadow-indigo-100"><ShieldCheck size={12}/> 마스터 (MASTER)</span>
                       ) : (
                         <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg flex items-center gap-1"><Users size={12}/> 조직원 (MEMBER)</span>
                       )}
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{user.jobTitle} | Account Settings</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1"><Building2 size={12}/> 회사명 (Company)</p>
                  <input name="companyName" defaultValue={user.companyName} disabled={!user.isMaster} className={`w-full p-4 rounded-2xl border text-sm font-bold transition-all ${user.isMaster ? 'bg-white border-slate-200 focus:border-indigo-500 outline-none' : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'}`} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1"><UserIcon size={12}/> 성함 (Name)</p>
                  <input name="name" defaultValue={user.name} required className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 outline-none rounded-2xl border text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1"><Phone size={12}/> 연락처 (Phone)</p>
                  <input name="phone" defaultValue={user.phone} required className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 outline-none rounded-2xl border text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1"><Check size={12}/> 직함 (Job Title)</p>
                  <input name="jobTitle" defaultValue={user.jobTitle} required className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 outline-none rounded-2xl border text-sm font-bold" />
                </div>
                <div className="col-span-2 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">관심 산업군 및 선호 파트너 (Interests)</p>
                  <textarea name="preferredPartners" defaultValue={user.preferredPartners} className="w-full p-6 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 outline-none rounded-3xl border h-32 text-sm font-bold resize-none" />
                </div>
                <button type="submit" disabled={isPending} className="col-span-2 py-6 bg-slate-900 text-white rounded-[30px] font-black text-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-2xl">
                  {isPending ? <Clock className="animate-spin" size={22}/> : <Save size={22}/>}
                  정보 저장하기 (Save Changes)
                </button>
              </form>
            </section>
          )}

          {/* 탐색 섹션 */}
          {expandedSection === 'available' && (
             <section className="animate-in fade-in slide-in-from-bottom-4 space-y-10 px-2">
               <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">신청 가능한 미팅<br/><span className="text-lg opacity-30 font-bold uppercase">(AVAILABLE)</span></h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {availableSlots.map((slot: any) => (
                   <div key={slot.id} className="bg-white p-8 md:p-10 rounded-[45px] shadow-xl border-2 border-white hover:shadow-2xl transition-all flex flex-col min-h-[550px]">
                     <div className="flex-grow space-y-6">
                       <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg uppercase">{slot.buyer?.userType}</span>
                       <h4 className="text-xl font-black text-slate-800 leading-tight">{slot.buyer?.companyName}</h4>
                       <div className="bg-slate-50 p-5 rounded-[25px] border border-slate-100 italic text-[11px] font-bold text-slate-500 leading-relaxed break-keep">
                         "{slot.buyer?.preferredPartners || "전분야 협업 가능"}"
                       </div>
                       <div className="pt-6 border-t border-slate-50 space-y-1">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">희망 일시</p>
                          <p className="text-sm font-black text-slate-700">{new Date(slot.startTime).toLocaleDateString()} {formatMeetingTime(new Date(slot.startTime))}</p>
                       </div>
                     </div>
                     <form onSubmit={onApply} className="mt-8 space-y-4">
                       <input type="hidden" name="slotId" value={slot.id} /><input type="hidden" name="buyerId" value={slot.buyerId} />
                       <textarea name="proposal" required placeholder="제안 내용을 입력하세요." className="w-full p-5 text-xs bg-slate-50 border-none rounded-[25px] h-24 outline-none resize-none shadow-inner" />
                       <button className="w-full bg-slate-900 text-white py-4 rounded-[25px] font-black text-sm hover:bg-blue-600 transition-all shadow-xl">미팅 신청하기</button>
                     </form>
                   </div>
                 ))}
               </div>
             </section>
          )}

          {/* 신청 현황 */}
          {expandedSection === 'pending' && (
             <section className="space-y-8 px-2 animate-in fade-in">
               <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">나의 신청 현황</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {pendingMeetings.map((m: any) => (
                   <div key={m.id} className="bg-white p-8 rounded-[40px] shadow-xl border border-white space-y-5">
                     <p className="font-black text-lg text-slate-800">{m.buyer?.companyName}</p>
                     <p className="text-xs text-slate-400 font-bold">🕒 {formatMeetingTime(new Date(m.timeSlot.startTime))}</p>
                     <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-xl inline-block animate-pulse">검토 중</div>
                   </div>
                 ))}
               </div>
             </section>
          )}

          {/* 확정 일정 */}
          {expandedSection === 'confirmed' && (
            <section className="space-y-10 px-2 animate-in fade-in">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">확정된 미팅 일정</h2>
                <button onClick={downloadExcel} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl"><Download size={14} className="inline mr-2"/> 엑셀 다운로드</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayConfirmed.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[45px] shadow-xl border-2 border-emerald-100 flex flex-col min-h-[400px]">
                    <div className="space-y-4">
                      <span className="px-4 py-2 rounded-2xl text-[10px] font-black bg-emerald-600 text-white">매칭완료</span>
                      <h3 className="text-xl font-black">{m.buyer?.companyName}</h3>
                      <p className="text-sm font-bold text-slate-600">📅 {new Date(m.timeSlot.startTime).toLocaleDateString()}</p>
                      <p className="text-sm font-bold text-slate-600">🕒 {formatMeetingTime(new Date(m.timeSlot.startTime))}</p>
                      <p className="text-sm font-bold text-slate-600">📍 {m.location || "미지정"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 거절 내역 */}
          {expandedSection === 'rejected' && (
            <section className="space-y-8 px-2 animate-in fade-in">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">거절 내역</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rejectedMeetings.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 text-left">
                    <p className="font-black text-base text-slate-400 line-through">{m.buyer?.companyName}</p>
                    <div className="bg-rose-50/20 p-5 rounded-[25px] text-[11px] text-slate-500 italic leading-relaxed min-h-[80px]">" {m.rejectionReason || "거절 사유 없음" } "</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}