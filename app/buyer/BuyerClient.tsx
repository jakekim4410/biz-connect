"use client";

import { useState, useEffect, useMemo } from "react";
import { createSlotAction, handleStatusAction, deleteSlotAction, updateSlotAction } from "./actions";

export default function BuyerClient({ mySlots, confirmedMeetings, buyerId }: any) {
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('pending');
  
  const [reservationFilter, setReservationFilter] = useState<'PENDING' | 'MATCHED' | 'ALL'>('PENDING');

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const filteredReservations = useMemo(() => {
    if (reservationFilter === 'ALL') return mySlots;
    if (reservationFilter === 'PENDING') return mySlots.filter((s: any) => s.status === 'OPEN');
    if (reservationFilter === 'MATCHED') return mySlots.filter((s: any) => s.status === 'CLOSED');
    return mySlots;
  }, [reservationFilter, mySlots]);

  const formatMeetingTime = (date: Date) => {
    if (!mounted) return "";
    const h24 = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

  const onCreate = async (formData: FormData) => {
    if (!confirm("새로운 미팅 예약을 생성하시겠습니까?")) return;
    setIsPending(true);
    try {
      await createSlotAction(formData, buyerId);
      alert("✅ 예약이 성공적으로 생성되었습니다.");
      setExpandedSection('pending');
      setReservationFilter('PENDING');
    } finally { setIsPending(false); }
  };

  const onUpdateSave = async (e: React.FormEvent<HTMLFormElement>, slotId: number) => {
    e.preventDefault();
    if (!confirm("변경사항을 저장하시겠습니까?")) return;
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateSlotAction(slotId, formData);
      alert("✅ 예약 내용이 수정되었습니다.");
      setEditingId(null);
    } finally { setIsPending(false); }
  };

  const onDeleteSlot = async (slotId: number) => {
    if (!confirm("이 예약을 삭제하시겠습니까?\n삭제 후에는 복구가 불가능합니다.")) return;
    setIsPending(true);
    try {
      await deleteSlotAction(slotId);
      alert("🗑️ 예약이 삭제되었습니다.");
    } catch (e: any) { alert(e.message || "❌ 오류 발생"); }
    finally { setIsPending(false); }
  };

  const onStatusUpdate = async (meetingId: number, slotId: number, action: string, company: string) => {
    const msg = action === "ACCEPT" ? `[${company}]의 미팅을 확정하시겠습니까?` : "미팅 신청을 거절하시겠습니까?";
    if (!confirm(msg)) return;
    setIsPending(true);
    try {
      await handleStatusAction(meetingId, slotId, action, action === "REJECT" ? rejectionReason : undefined);
      alert(action === "ACCEPT" ? "🎉 매칭 완료!" : "거절 완료.");
      setRejectingId(null); setRejectionReason("");
    } finally { setIsPending(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20">
      <div className="absolute top-[-10%] left-[-5%] w-[90%] md:w-[45%] h-[40%] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* --- 상단 요약 바 --- */}
        <header className="bg-white/80 backdrop-blur-2xl p-5 md:p-10 rounded-[35px] md:rounded-[45px] shadow-xl border border-white">
          <div className="grid grid-cols-2 md:flex md:justify-around gap-4 md:gap-8">
            {[
              { id: 'generator', icon: '➕', label: '예약 생성', en: 'Create' },
              { id: 'pending', icon: '🕒', label: '예약 현황', count: mySlots.length, en: 'My Reservations' },
              { id: 'confirmed', icon: '✅', label: '확정 리스트', count: confirmedMeetings.length, en: 'Confirmed' },
              { id: 'rejected', icon: '🚫', label: '거절 내역', en: 'Rejected' },
            ].map((item) => (
              <button key={item.id} onClick={() => setExpandedSection(item.id)} className={`flex flex-col items-center justify-center gap-2 p-3 md:p-0 rounded-[25px] transition-all duration-300 ${expandedSection === item.id ? 'bg-blue-50 md:bg-transparent scale-105' : ''}`}>
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[22px] flex items-center justify-center text-xl md:text-2xl shadow-lg ${expandedSection === item.id ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-400'}`}>{item.icon}</div>
                <div className="text-center">
                  <span className={`text-[11px] md:text-sm font-black block ${expandedSection === item.id ? 'text-blue-600' : 'text-slate-400'}`}>{item.label} {item.count !== undefined && `(${item.count})`}</span>
                  <span className="hidden md:block text-[9px] font-bold text-slate-300 uppercase mt-0.5">{item.en}</span>
                </div>
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-[400px]">
          {expandedSection === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">나의 예약 현황 <span className="text-indigo-500 italic md:ml-1">Reservations</span></h2>
                  <p className="text-slate-400 font-bold text-xs md:text-sm">생성한 예약 리스트를 수정하거나 삭제할 수 있습니다.</p>
                </div>

                <div className="flex bg-white p-1.5 rounded-[20px] shadow-sm border border-slate-100">
                    {[{id:'PENDING',label:'신청대기'},{id:'MATCHED',label:'매칭완료'},{id:'ALL',label:'전체보기'}].map((btn) => (
                        <button key={btn.id} onClick={() => setReservationFilter(btn.id as any)} className={`px-5 py-2.5 rounded-[15px] text-xs font-black transition-all ${reservationFilter === btn.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{btn.label}</button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredReservations.map((slot: any) => {
                  const isEditing = editingId === slot.id;
                  const isMatched = slot.status === 'CLOSED';
                  const activeMeetings = slot.meetings.filter((m: any) => m.status === (isMatched ? "ACCEPTED" : "PENDING"));
                  const startDate = new Date(slot.startTime);

                  return (
                    <div key={slot.id} className={`bg-white p-6 md:p-8 rounded-[40px] md:rounded-[50px] shadow-xl border-2 transition-all flex flex-col min-h-[420px] ${isMatched ? 'border-indigo-100 bg-slate-50/30' : 'border-white hover:shadow-2xl'}`}>
                      {isEditing ? (
                        /* --- 🛠 예약 수정 모드 (UI 개선) --- */
                        <form onSubmit={(e) => onUpdateSave(e, slot.id)} className="space-y-5 flex-grow">
                           <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                             <div className="flex items-center gap-2">
                               <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                               <span className="text-blue-700 font-black text-xs">정보 수정 중</span>
                             </div>
                             <div className="flex gap-2">
                               <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-blue-100">저장</button>
                               <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 bg-white text-slate-400 border border-slate-200 rounded-xl text-[10px] font-black">취소</button>
                             </div>
                           </div>
                           <div className="space-y-3">
                               <div className="space-y-1">
                                   <p className="text-[10px] font-black text-slate-400 ml-1">DATE</p>
                                   <input name="date" type="date" defaultValue={startDate.toISOString().split('T')[0]} required className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner" />
                               </div>
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="space-y-1">
                                       <p className="text-[10px] font-black text-slate-400 ml-1">HOUR</p>
                                       <select name="hour" defaultValue={String(startDate.getHours()).padStart(2, '0')} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner">
                                           {Array.from({length:24}).map((_,i)=> <option key={i} value={String(i).padStart(2,'0')}>{i}시</option>)}
                                       </select>
                                   </div>
                                   <div className="space-y-1">
                                       <p className="text-[10px] font-black text-slate-400 ml-1">MINUTE</p>
                                       <select name="minute" defaultValue={String(startDate.getMinutes()).padStart(2, '0')} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner">
                                           <option value="00">00분</option><option value="30">30분</option>
                                       </select>
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <p className="text-[10px] font-black text-slate-400 ml-1">REMARKS</p>
                                   <input name="description" defaultValue={slot.description} placeholder="참고사항 수정" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-medium shadow-inner" />
                               </div>
                           </div>
                        </form>
                      ) : (
                        /* --- 👀 예약 보기 모드 --- */
                        <>
                          <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1.5">
                                <p className={`text-[10px] font-black uppercase tracking-widest italic ${isMatched ? 'text-indigo-300' : 'text-blue-500'}`}>Reserved Schedule</p>
                                <h3 className={`text-xl font-black break-keep ${isMatched ? 'text-slate-400' : 'text-slate-800'}`}>
                                    {mounted && startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                                </h3>
                                <div className={`mt-1 inline-block px-3 py-1 rounded-lg text-sm font-black ${isMatched ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {mounted && formatMeetingTime(startDate)}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black ${isMatched ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-emerald-50 text-emerald-600 animate-pulse'}`}>
                                    {isMatched ? '매칭완료' : '신청대기'}
                                </span>
                                
                                {/* 💡 예약 수정/삭제 버튼 가시성 강화 */}
                                {!isMatched && slot.meetings.length === 0 && (
                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => setEditingId(slot.id)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <span>✏️</span> 예약 수정
                                        </button>
                                        <button 
                                            onClick={() => onDeleteSlot(slot.id)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <span>🗑️</span> 예약 삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t border-slate-50 flex-grow">
                            {activeMeetings.length === 0 ? (
                              <p className="py-10 text-center text-slate-300 font-bold text-[11px] italic">아직 신청자가 없습니다.</p>
                            ) : (
                              activeMeetings.map((m: any) => (
                                <div key={m.id} className={`p-5 rounded-[30px] border space-y-4 ${isMatched ? 'bg-indigo-50/20 border-indigo-50' : 'bg-slate-50/50 border-slate-100'}`}>
                                  <div className="flex justify-between items-center">
                                    <div className="max-w-[65%]">
                                      <p className={`font-black text-sm truncate ${isMatched ? 'text-indigo-900' : 'text-slate-800'}`}>{m.seller.companyName}</p>
                                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{m.seller.name} 대표</p>
                                    </div>
                                    {!isMatched && (
                                      <div className="flex gap-2">
                                        <button onClick={() => onStatusUpdate(m.id, slot.id, "ACCEPT", m.seller.companyName)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">수락</button>
                                        <button onClick={() => setRejectingId(m.id)} className="bg-white text-rose-500 border border-rose-100 px-4 py-2 rounded-xl text-[10px] font-black">거절</button>
                                      </div>
                                    )}
                                  </div>
                                  {rejectingId === m.id && (
                                    <div className="p-4 bg-white rounded-[25px] border border-rose-100 animate-in fade-in duration-200 space-y-3 shadow-inner">
                                      <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="거절 사유 입력" className="w-full p-3 text-[10px] bg-slate-50 border-none rounded-xl outline-none resize-none" rows={2}/>
                                      <div className="flex justify-end gap-2"><button onClick={() => setRejectingId(null)} className="text-[10px] font-bold text-slate-400 px-2">취소</button><button onClick={() => onStatusUpdate(m.id, slot.id, "REJECT", m.seller.companyName)} className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black">확정</button></div>
                                    </div>
                                  )}
                                  {isMatched && (
                                      <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-100/50">
                                          <p className="text-[11px] text-indigo-700/80 italic font-medium leading-relaxed">"{m.proposal}"</p>
                                          <div className="mt-3 pt-3 border-t border-indigo-100/50 flex flex-col gap-1">
                                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Contact Info</p>
                                              <p className="text-[11px] font-bold text-indigo-600">📞 {m.seller.phone}</p>
                                          </div>
                                      </div>
                                  )}
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

          {/* ... 나머지 섹션 (generator, confirmed, rejected) - 기존 로직 유지 ... */}
          {expandedSection === 'generator' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 max-w-4xl mx-auto">
              <div className="bg-white p-8 md:p-12 rounded-[50px] shadow-xl border border-white">
                <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-blue-600 mb-8">Meeting Generator</h2>
                <form action={onCreate} className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-1.5"><p className="text-[10px] font-black text-slate-400 ml-1">DATE</p><input name="date" type="date" required className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner" /></div>
                  <div className="grid grid-cols-2 md:contents gap-4"><div className="space-y-1.5"><p className="text-[10px] font-black text-slate-400 ml-1">HOUR</p><select name="hour" className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner">{Array.from({length:24}).map((_,i)=> <option key={i} value={String(i).padStart(2,'0')}>{i}시</option>)}</select></div><div className="space-y-1.5"><p className="text-[10px] font-black text-slate-400 ml-1">MINUTE</p><select name="minute" className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold shadow-inner"><option value="00">00분</option><option value="30">30분</option></select></div></div>
                  <div className="flex items-end"><button className="w-full h-14 md:h-[62px] bg-blue-600 text-white rounded-3xl font-black text-sm md:text-base hover:bg-blue-700 transition-all shadow-xl active:scale-95">예약 생성</button></div>
                  <div className="md:col-span-4 space-y-1.5"><p className="text-[10px] font-black text-slate-400 ml-1">REMARKS</p><input name="description" placeholder="미팅 참고사항을 입력하세요." className="w-full p-5 bg-slate-50 border-none rounded-3xl text-xs font-medium shadow-inner" /></div>
                </form>
              </div>
            </section>
          )}

          {expandedSection === 'confirmed' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 px-2 tracking-tight">확정된 미팅</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {confirmedMeetings.map((m: any) => (
                  <div key={m.id} className="bg-slate-900 text-white p-10 rounded-[55px] shadow-2xl relative border border-slate-800 overflow-hidden group h-full">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-5xl group-hover:scale-110 transition-all duration-700">🤝</div>
                    <div className="space-y-6 relative z-10">
                        <div className="space-y-1">
                            <p className="text-emerald-400 text-[10px] font-black uppercase italic">Confirmed</p>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tight">{mounted && formatMeetingTime(new Date(m.timeSlot.startTime))}</h3>
                            <p className="text-slate-500 text-xs">{mounted && new Date(m.timeSlot.startTime).toLocaleDateString()}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-800">
                            <h4 className="text-xl md:text-2xl font-black truncate">{m.seller.companyName}</h4>
                            <p className="text-slate-400 text-xs mt-1">{m.seller.name} 대표</p>
                            <p className="text-slate-500 text-[11px] mt-4 font-bold">📞 {m.seller.phone}</p>
                        </div>
                    </div>
                  </div>
                ))}
                {confirmedMeetings.length === 0 && <div className="col-span-full py-32 text-center text-slate-300 font-black italic border-2 border-dashed border-slate-200 rounded-[50px]">확정된 미팅 일정이 없습니다.</div>}
              </div>
            </section>
          )}

          {expandedSection === 'rejected' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 px-2 tracking-tight">거절 내역</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mySlots.flatMap((s: any) => s.meetings).filter((m: any) => m.status === "REJECTED").map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 hover:border-rose-100 transition-all group">
                    <div className="flex justify-between items-start">
                      <p className="font-black text-base text-slate-400 line-through truncate max-w-[70%]">{m.seller.companyName}</p>
                      <span className="bg-rose-50 text-rose-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase border border-rose-100">Rejected</span>
                    </div>
                    <div className="bg-rose-50/20 p-5 rounded-[25px] border border-rose-50 text-xs text-slate-500 italic">"{m.rejectionReason || "사유 미입력"}"</div>
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