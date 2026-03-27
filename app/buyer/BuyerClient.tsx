"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  createSlotAction, handleStatusAction, deleteSlotAction, 
  updateSlotAction, requestLocationChange 
} from "./actions";
import { 
  MapPin, Edit3, Trash2, CheckCircle2, Clock, 
  Plus, X, Phone, Send, AlertCircle, Handshake, CalendarDays, Download, Mail
} from "lucide-react";
import * as XLSX from 'xlsx';

export default function BuyerClient({ mySlots, confirmedMeetings, buyerId }: any) {
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('pending');
  
  const [reservationFilter, setReservationFilter] = useState<'PENDING' | 'MATCHED' | 'ALL'>('PENDING');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // 필터링 로직
  const filteredReservations = useMemo(() => {
    if (!mySlots) return [];
    if (reservationFilter === 'ALL') return mySlots;
    if (reservationFilter === 'PENDING') return mySlots.filter((s: any) => s.status === 'OPEN');
    if (reservationFilter === 'MATCHED') return mySlots.filter((s: any) => s.status === 'CLOSED');
    return mySlots;
  }, [reservationFilter, mySlots]);

  const formatMeetingTime = (date: Date) => {
    if (!mounted) return "";
    const d = new Date(date);
    const h24 = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const ampm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

  // 엑셀 다운로드 (민감정보 제외)
  const downloadExcel = () => {
    if (!confirmedMeetings || confirmedMeetings.length === 0) {
      alert("다운로드할 데이터가 없습니다.\n(No data to download)");
      return;
    }
    const excelData = confirmedMeetings.map((m: any) => ({
      "일자 (Date)": new Date(m.timeSlot.startTime).toLocaleDateString(),
      "시간 (Time)": formatMeetingTime(new Date(m.timeSlot.startTime)),
      "장소 (Location)": m.location || "미지정",
      "상대 업체명 (Company)": m.seller?.companyName || "-",
      "담당자 성함 (Name)": m.seller?.name || "-",
      "연락처 (Phone)": m.seller?.phone || "-",
      "이메일 (Email)": m.seller?.email || "-",
      "제안 내용 (Proposal)": m.proposal || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Confirmed");
    XLSX.writeFile(workbook, `Confirmed_Meetings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 서버 액션 핸들러
  const onProposeLocation = async (meetingId: number, currentLoc: string) => {
    const newLoc = prompt("새로운 미팅 장소를 제안하세요\n(Suggest location):", currentLoc || "");
    if (!newLoc || newLoc === currentLoc) return;
    setIsPending(true);
    try {
      await requestLocationChange(meetingId, newLoc);
      alert("📩 장소 변경 요청 완료!\n(Request sent)");
    } finally { setIsPending(false); }
  };

  const onCreate = async (formData: FormData) => {
    if (!confirm("예약을 생성하시겠습니까?\n(Create reservation?)")) return;
    setIsPending(true);
    try {
      await createSlotAction(formData, buyerId);
      setExpandedSection('pending');
    } finally { setIsPending(false); }
  };

  const onUpdateSave = async (e: React.FormEvent<HTMLFormElement>, slotId: number) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await updateSlotAction(slotId, new FormData(e.currentTarget));
      setEditingId(null);
    } finally { setIsPending(false); }
  };

  const onDeleteSlot = async (slotId: number) => {
    if (!confirm("삭제하시겠습니까?\n(Delete?)")) return;
    setIsPending(true);
    try { await deleteSlotAction(slotId); }
    finally { setIsPending(false); }
  };

  const onStatusUpdate = async (meetingId: number, slotId: number, action: string, company: string) => {
    const msg = action === 'ACCEPT' ? '수락하시겠습니까?' : '거절하시겠습니까?';
    if (!confirm(`${company}와의 미팅을 ${msg}`)) return;
    setIsPending(true);
    try {
      await handleStatusAction(meetingId, slotId, action, action === "REJECT" ? rejectionReason : undefined);
    } finally { setIsPending(false); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20 text-left">
      <div className="absolute top-[-10%] left-[-5%] w-[90%] md:w-[45%] h-[40%] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* 상단 탭 메뉴 */}
        <header className="bg-white/90 backdrop-blur-2xl p-4 md:p-8 rounded-[35px] md:rounded-[45px] shadow-xl border border-white">
          <div className="grid grid-cols-2 md:flex md:justify-around gap-2 md:gap-8">
            {[
              { id: 'generator', icon: <Plus size={22}/>, label: '예약 생성', sub: '(CREATE)' },
              { id: 'pending', icon: <Clock size={22}/>, label: '예약 현황', sub: '(STATUS)', count: mySlots?.length || 0 },
              { id: 'confirmed', icon: <CheckCircle2 size={22}/>, label: '확정 일정', sub: '(LIST)', count: confirmedMeetings?.length || 0 },
              { id: 'rejected', icon: <X size={22}/>, label: '거절 내역', sub: '(REJECTED)' },
            ].map((item) => (
              <button key={item.id} onClick={() => setExpandedSection(item.id)} className={`flex flex-col items-center gap-1.5 p-2 transition-all duration-300 ${expandedSection === item.id ? 'scale-105' : ''}`}>
                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg ${expandedSection === item.id ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>{item.icon}</div>
                <div className="text-center">
                    <span className={`text-[10px] md:text-sm font-black block leading-none ${expandedSection === item.id ? 'text-blue-600' : 'text-slate-400'}`}>{item.label} {item.count !== undefined && `(${item.count})`}</span>
                    <span className="text-[7px] md:text-[9px] font-bold opacity-40 uppercase mt-0.5">{item.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-[500px]">
          {/* 1. 예약 생성 */}
          {expandedSection === 'generator' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 max-w-2xl mx-auto px-2">
              <div className="bg-white p-8 md:p-12 rounded-[45px] shadow-xl border border-white">
                <h2 className="text-2xl md:text-3xl font-black text-blue-600 mb-8 leading-tight">예약 생성<br/><span className="text-lg opacity-30 font-bold uppercase">(Meeting Generator)</span></h2>
                <form action={onCreate} className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 ml-1 uppercase">날짜 (DATE)</p>
                    <input name="date" type="date" required className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 ml-1 uppercase">시 (HOUR)</p>
                      <select name="hour" className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner outline-none">
                        {Array.from({length:24}).map((_,i)=> <option key={i} value={String(i).padStart(2,'0')}>{i}시</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 ml-1 uppercase">분 (MINUTE)</p>
                      <select name="minute" className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner outline-none">
                        <option value="00">00분</option><option value="30">30분</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 ml-1 uppercase">기본 미팅 장소 (LOCATION)</p>
                    <input name="location" required placeholder="예: 3층 대회의실" className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner outline-none" />
                  </div>
                  <button className="w-full h-16 bg-blue-600 text-white rounded-3xl font-black text-base hover:bg-blue-700 transition-all shadow-xl active:scale-95 mt-4">예약 생성하기 (CREATE NOW)</button>
                </form>
              </div>
            </section>
          )}

          {/* 2. 예약 현황 (Pending) */}
          {expandedSection === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-8 px-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">나의 예약 현황<br/><span className="text-lg opacity-30 font-bold uppercase">(MY RESERVATIONS)</span></h2>
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                    {['PENDING','MATCHED','ALL'].map((btn) => (
                        <button key={btn} onClick={() => setReservationFilter(btn as any)} className={`px-4 py-2.5 rounded-[15px] text-[10px] md:text-xs font-black transition-all ${reservationFilter === btn ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                          {btn === 'PENDING' ? '신청대기' : btn === 'MATCHED' ? '매칭완료' : '전체보기'}
                        </button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredReservations.map((slot: any) => {
                  const isEditing = editingId === slot.id;
                  const isMatched = slot.status === 'CLOSED';
                  const activeMeetings = slot.meetings.filter((m: any) => m.status === (isMatched ? "ACCEPTED" : "PENDING"));
                  const startDate = new Date(slot.startTime);

                  return (
                    <div key={slot.id} className={`bg-white p-8 rounded-[45px] shadow-xl border-2 transition-all flex flex-col min-h-[420px] ${isMatched ? 'border-indigo-100 bg-slate-50/30' : 'border-white hover:shadow-2xl'}`}>
                      {isEditing ? (
                        <form onSubmit={(e) => onUpdateSave(e, slot.id)} className="space-y-4 flex-grow text-left">
                           <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex justify-between items-center mb-4 text-[10px] font-black uppercase">
                             <span>수정 모드 (EDIT)</span>
                             <div className="flex gap-2">
                               <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl">저장</button>
                               <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-white text-slate-400 border border-slate-200 rounded-xl">취소</button>
                             </div>
                           </div>
                           <input name="date" type="date" defaultValue={startDate.toISOString().split('T')[0]} required className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold shadow-inner outline-none" />
                           <div className="grid grid-cols-2 gap-3">
                               <select name="hour" defaultValue={String(startDate.getHours()).padStart(2, '0')} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none shadow-inner">
                                   {Array.from({length:24}).map((_,i)=> <option key={i} value={String(i).padStart(2,'0')}>{i}시</option>)}
                               </select>
                               <select name="minute" defaultValue={String(startDate.getMinutes()).padStart(2, '0')} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none shadow-inner">
                                   <option value="00">00분</option><option value="30">30분</option>
                               </select>
                           </div>
                           <input name="location" defaultValue={slot.location} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold shadow-inner outline-none" />
                        </form>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-6 text-left">
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <p className={`text-[9px] font-black uppercase tracking-widest italic ${isMatched ? 'text-indigo-300' : 'text-blue-500'}`}>예약 일정 (SCHEDULE)</p>
                                <h3 className="text-xl font-black truncate leading-tight">{startDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</h3>
                                <div className={`mt-1 inline-block px-3 py-1 rounded-lg text-[13px] font-black ${isMatched ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>{formatMeetingTime(startDate)}</div>
                                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 italic truncate"><MapPin size={12} className="shrink-0"/> {slot.location || "장소 미지정 (TBD)"}</div>
                            </div>
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black ${isMatched ? 'bg-indigo-600 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600 animate-pulse'}`}>{isMatched ? '매칭완료' : '신청대기'}</span>
                                {!isMatched && slot.meetings.length === 0 && (
                                    <div className="flex gap-1.5 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <button onClick={() => setEditingId(slot.id)} className="w-8 h-8 flex items-center justify-center bg-white text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm border border-slate-100"><Edit3 size={14}/></button>
                                        <button onClick={() => onDeleteSlot(slot.id)} className="w-8 h-8 flex items-center justify-center bg-white text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-slate-100"><Trash2 size={14}/></button>
                                    </div>
                                )}
                            </div>
                          </div>
                          <div className="space-y-3 pt-6 border-t border-slate-50 flex-grow text-left">
                            {activeMeetings.length === 0 ? (
                              <div className="py-12 flex flex-col items-center justify-center gap-1 text-slate-300">
                                <Clock size={24} className="opacity-20 mb-1"/>
                                <p className="font-bold text-[11px] italic">신청자 없음 (NO APPLICANTS)</p>
                              </div>
                            ) : (
                              activeMeetings.map((m: any) => (
                                <div key={m.id} className="p-5 rounded-[30px] border border-slate-100 bg-slate-50/50 space-y-3 hover:border-blue-200 transition-colors">
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-black text-sm truncate text-slate-800">{m.seller.companyName}</p>
                                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{m.seller.name} 대표</p>
                                    </div>
                                    {!isMatched && (
                                      <div className="flex gap-1 shrink-0">
                                        <button onClick={() => onStatusUpdate(m.id, slot.id, "ACCEPT", m.seller.companyName)} className="flex flex-col items-center bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg">수락 <span className="text-[7px] font-bold opacity-70">(ACCEPT)</span></button>
                                        <button onClick={() => onStatusUpdate(m.id, slot.id, "REJECT", m.seller.companyName)} className="flex flex-col items-center bg-white text-rose-500 border border-rose-100 px-3 py-1.5 rounded-xl text-[10px] font-black">거절 <span className="text-[7px] font-bold opacity-70">(REJECT)</span></button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. 확정 일정 (Confirmed) - 예약 현황의 정돈된 스타일로 UX 수정 */}
          {expandedSection === 'confirmed' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-10 px-2 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">확정된 미팅 일정<br/><span className="text-lg opacity-30 font-bold uppercase">(CONFIRMED LIST)</span></h2>
                <button onClick={downloadExcel} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-[11px] font-black hover:bg-black transition-all shadow-xl active:scale-95">
                  <Download size={14}/> 엑셀 다운로드 (DOWNLOAD EXCEL)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {confirmedMeetings.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[45px] shadow-xl border-2 border-emerald-100 transition-all flex flex-col min-h-[420px] hover:shadow-2xl">
                    
                    {/* 상단: 일시 정보 (예약현황과 크기 및 배치 통일) */}
                    <div className="flex justify-between items-start mb-6 text-left">
                        <div className="space-y-1.5 min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest italic text-emerald-500">확정 일정 (CONFIRMED)</p>
                            <h3 className="text-xl font-black truncate leading-tight">
                                {new Date(m.timeSlot.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                            </h3>
                            <div className="mt-1 inline-block px-3 py-1 rounded-lg text-[13px] font-black bg-emerald-50 text-emerald-600">
                                {formatMeetingTime(new Date(m.timeSlot.startTime))}
                            </div>
                        </div>
                        <div className="shrink-0">
                            <span className="px-4 py-2 rounded-2xl text-[10px] font-black bg-emerald-600 text-white shadow-md">매칭완료</span>
                        </div>
                    </div>

                    {/* 중단: 장소 정보 (지나치게 큰 박스를 줄이고 가독성 확보) */}
                    <div className="mb-6 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 italic">
                                <MapPin size={12} className="shrink-0 text-blue-500"/> 미팅 장소 (LOCATION)
                            </div>
                            <button 
                                onClick={() => onProposeLocation(m.id, m.location)} 
                                className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <Edit3 size={10}/> 장소변경
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[25px] border border-slate-100">
                            <p className="text-sm font-black text-slate-800 break-all leading-snug">
                                {m.location || "장소 미지정 (TBD)"}
                            </p>
                            {m.locationChangeStatus === "PENDING" && (
                                <div className="mt-2 pt-2 border-t border-slate-200 flex items-start gap-2">
                                    <Send size={10} className="text-amber-500 mt-0.5 animate-pulse"/>
                                    <p className="text-[10px] font-bold text-amber-600 leading-tight">
                                        승인 대기중: <span className="italic">"{m.pendingLocation}"</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 하단: 상대 업체 및 연락처 (예약 현황의 업체 리스트 카드 스타일 적용) */}
                    <div className="mt-auto pt-6 border-t border-slate-50">
                        <div className="p-5 rounded-[30px] border border-slate-100 bg-slate-50/50 space-y-4">
                            <div>
                                <h4 className="font-black text-base truncate text-slate-800">{m.seller.companyName}</h4>
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{m.seller.name} <span className="opacity-50">대표 (REP)</span></p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2.5 text-slate-600 group">
                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                        <Phone size={13} className="text-emerald-500"/>
                                    </div>
                                    <span className="text-[13px] font-black tracking-tight">{m.seller.phone}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600 group">
                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                        <Mail size={13} className="text-blue-500"/>
                                    </div>
                                    <span className="text-[11px] font-black truncate">{m.seller.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. 거절 내역 (Rejected) */}
          {expandedSection === 'rejected' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-8 px-2 text-left">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">거절 내역<br/><span className="text-lg opacity-30 font-bold uppercase">(REJECTED HISTORY)</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mySlots?.flatMap((s: any) => s.meetings).filter((m: any) => m.status === "REJECTED").map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 hover:border-rose-100 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-base text-slate-400 line-through truncate">{m.seller.companyName}</p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 tracking-tighter">Rejected</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 text-right">
                        <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-rose-100 leading-none">거절됨</span>
                        <span className="text-[7px] font-bold text-rose-300 mt-1 uppercase">(REJ)</span>
                      </div>
                    </div>
                    <div className="bg-rose-50/20 p-5 rounded-[25px] border border-rose-50 text-[11px] text-slate-500 font-medium italic leading-relaxed min-h-[80px]">" {m.rejectionReason || "사유가 입력되지 않았습니다."} "</div>
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