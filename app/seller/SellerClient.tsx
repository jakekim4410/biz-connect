"use client";

import { useState, useMemo, useEffect } from "react";
import { applyMeetingAction } from "./actions";

export default function SellerClient({ 
  confirmedMeetings, 
  pendingMeetings, 
  rejectedMeetings, 
  availableSlots, 
  sellerId 
}: any) {
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('available');
  
  // --- 필터 및 정렬 상태 관리 ---
  const [selectedFilter, setSelectedFilter] = useState("전체보기"); // 신청 가능 목록 필터
  const [confirmedFilter, setConfirmedFilter] = useState("전체보기"); // 확정 일정 필터
  const [confirmedSort, setConfirmedSort] = useState("asc"); // 확정 일정 정렬 (asc: 날짜순, desc: 최신순)

  useEffect(() => { setMounted(true); }, []);

  // 24시간제 우선 표기 (오전/오후 병기)
  const formatMeetingTime = (date: Date) => {
    if (!mounted) return "";
    const h24 = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

  // 1. 신청 가능 목록용 데이터 가공
  const filterOptions = useMemo(() => {
    if (!availableSlots) return ["전체보기"];
    const types = availableSlots.map((s: any) => s.buyer?.userType).filter(Boolean);
    return ["전체보기", ...Array.from(new Set(types))];
  }, [availableSlots]);

  const filteredSlots = useMemo(() => {
    if (!availableSlots) return [];
    return selectedFilter === "전체보기" ? availableSlots : availableSlots.filter((s: any) => s.buyer?.userType === selectedFilter);
  }, [selectedFilter, availableSlots]);

  // 2. 확정 일정용 데이터 가공 (필터 + 정렬)
  const confirmedFilterOptions = useMemo(() => {
    if (!confirmedMeetings) return ["전체보기"];
    const types = confirmedMeetings.map((m: any) => m.buyer?.userType).filter(Boolean);
    return ["전체보기", ...Array.from(new Set(types))];
  }, [confirmedMeetings]);

  const displayConfirmed = useMemo(() => {
    if (!confirmedMeetings) return [];
    let list = confirmedFilter === "전체보기" ? [...confirmedMeetings] : confirmedMeetings.filter((m: any) => m.buyer?.userType === confirmedFilter);
    list.sort((a: any, b: any) => {
      const timeA = new Date(a.timeSlot.startTime).getTime();
      const timeB = new Date(b.timeSlot.startTime).getTime();
      return confirmedSort === "asc" ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [confirmedFilter, confirmedSort, confirmedMeetings]);

  const onApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!confirm("이 바이어에게 미팅을 신청하시겠습니까?")) return;
    setIsPending(true);
    try { 
      await applyMeetingAction(formData, sellerId); 
      alert("✅ 신청이 완료되었습니다!"); 
      setExpandedSection('pending');
    } finally { setIsPending(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20">
      
      {/* --- 트렌디한 메쉬 배경 --- */}
      <div className="absolute top-[-10%] left-[-5%] w-[90%] md:w-[45%] h-[40%] bg-emerald-100/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[0%] right-[-5%] w-[80%] md:w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none"></div>

      <div className={`relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* --- 상단: 요약 메뉴 바 (2x2 그리드) --- */}
        <header className="bg-white/80 backdrop-blur-2xl p-5 md:p-10 rounded-[35px] md:rounded-[45px] shadow-xl border border-white">
          <div className="grid grid-cols-2 md:flex md:justify-around gap-4 md:gap-8">
            {[
              { id: 'available', icon: '🔍', label: '매칭 탐색', en: 'Discover' },
              { id: 'pending', icon: '📋', label: '신청 현황', count: pendingMeetings?.length, en: 'Pending' },
              { id: 'confirmed', icon: '🤝', label: '확정 일정', count: confirmedMeetings?.length, en: 'Confirmed' },
              { id: 'rejected', icon: '🚫', label: '거절 내역', count: rejectedMeetings?.length, en: 'Rejected' },
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => setExpandedSection(item.id)} 
                className={`flex flex-col items-center justify-center gap-2 p-3 md:p-0 rounded-[25px] transition-all duration-300 ${expandedSection === item.id ? 'bg-emerald-50 md:bg-transparent scale-105' : ''}`}
              >
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[22px] flex items-center justify-center text-xl md:text-2xl shadow-lg ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-slate-300' : 'bg-white text-slate-400'}`}>
                  {item.icon}
                </div>
                <div className="text-center">
                  <span className={`text-[11px] md:text-sm font-black block ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'}`}>
                    {item.label} {item.count !== undefined && `(${item.count})`}
                  </span>
                  <span className="hidden md:block text-[9px] font-bold text-slate-300 uppercase mt-0.5">{item.en}</span>
                </div>
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-[500px]">
          
          {/* 1. 신청 가능한 미팅 (Discover) */}
          {expandedSection === 'available' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div className="space-y-1 text-left">
                    <h2 className="text-3xl font-black tracking-tight text-slate-800">
                        신청 가능한 미팅 <span className="text-slate-300 italic font-normal text-xl md:text-2xl ml-1 uppercase tracking-tight">Discover</span>
                    </h2>
                    <p className="text-slate-400 font-bold text-xs md:text-sm">현재 비즈니스 파트너를 찾고 있는 바이어 목록입니다.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                  {filterOptions.map(opt => (
                    <button key={opt} onClick={() => setSelectedFilter(opt)} className={`px-5 py-2.5 rounded-full text-[10px] md:text-xs font-black transition-all border shadow-sm ${selectedFilter === opt ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-white hover:bg-slate-50'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredSlots.map((slot: any) => (
                  <div key={slot.id} className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[40px] md:rounded-[50px] shadow-xl border border-white flex flex-col justify-between min-h-[580px] h-auto transition-all hover:shadow-2xl group overflow-hidden">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase shrink-0">{slot.buyer?.userType}</span>
                        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black animate-pulse shrink-0">MATCH</div>
                      </div>
                      <h4 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors break-all line-clamp-2">{slot.buyer?.companyName}</h4>
                      
                      <div className="bg-slate-50/50 p-5 rounded-[30px] border border-slate-100 shadow-inner">
                        <p className="text-[10px] font-black text-slate-300 uppercase mb-2 italic">Preference</p>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic break-keep overflow-y-auto max-h-24 custom-scrollbar">
                          "{slot.buyer?.preferredPartners || "전분야 협업 가능"}"
                        </p>
                      </div>

                      <div className="pt-6 border-t border-slate-50 space-y-1">
                        <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Schedule</p>
                        <p className="text-sm font-black text-slate-700">📅 {mounted && new Date(slot.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
                        <p className="text-indigo-600 font-black text-base">{mounted && formatMeetingTime(new Date(slot.startTime))}</p>
                      </div>
                    </div>

                    <form onSubmit={onApply} className="mt-8 space-y-4">
                      <input type="hidden" name="slotId" value={slot.id} />
                      <input type="hidden" name="buyerId" value={slot.buyerId} />
                      <textarea name="proposal" required placeholder="매칭 확률을 높일 제안 내용을 입력하세요." className="w-full p-5 text-xs bg-slate-50 border-none rounded-[25px] h-28 shadow-inner focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                      <button className="w-full bg-slate-900 text-white py-4 rounded-[25px] font-black text-sm hover:bg-blue-600 transition-all shadow-xl active:scale-95">신청하기</button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. 신청 현황 (Pending) */}
          {expandedSection === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-8">
              <div className="px-4 text-left">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">신청 현황 <span className="text-blue-600 italic font-normal text-xl ml-1 uppercase">Pending</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingMeetings.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-white shadow-xl flex flex-col gap-6 min-h-[280px] h-auto">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 text-left min-w-0">
                        <span className="text-[10px] font-black text-blue-500 uppercase">{m.buyer?.userType}</span>
                        <p className="font-black text-lg text-slate-800 truncate">{m.buyer?.companyName}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase italic">🕒 {mounted && formatMeetingTime(new Date(m.timeSlot.startTime))}</p>
                      </div>
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-2 rounded-2xl animate-pulse shrink-0">REVIEWING</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-[11px] text-slate-500 italic border border-slate-100 text-left overflow-hidden">
                        <span className="block text-[9px] font-black text-slate-300 mb-1">MY PROPOSAL:</span>
                        <p className="line-clamp-4 break-words">"{m.proposal}"</p>
                    </div>
                  </div>
                ))}
                {pendingMeetings.length === 0 && <p className="col-span-full py-32 text-center text-slate-300 font-black italic border-2 border-dashed border-slate-100 rounded-[50px]">대기 중인 신청이 없습니다.</p>}
              </div>
            </section>
          )}

          {/* 3. 확정된 일정 (Confirmed) */}
          {expandedSection === 'confirmed' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div className="text-left">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">확정된 일정 <span className="text-emerald-500 italic font-normal text-xl ml-1 uppercase">Confirmed</span></h2>
                </div>
                {/* 확정 일정 필터 및 정렬 바 */}
                <div className="flex flex-wrap gap-3 justify-end w-full md:w-auto items-center">
                   <select 
                     value={confirmedSort} 
                     onChange={(e) => setConfirmedSort(e.target.value)}
                     className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 outline-none shadow-sm"
                   >
                     <option value="asc">날짜순 (과거부터)</option>
                     <option value="desc">최신순 (가까운일정)</option>
                   </select>
                   <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>
                   {confirmedFilterOptions.map(opt => (
                    <button key={opt} onClick={() => setConfirmedFilter(opt)} className={`px-4 py-2 rounded-full text-[10px] font-black transition-all border shadow-sm ${confirmedFilter === opt ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-100'}`}>{opt}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayConfirmed.map((m: any) => (
                  <div key={m.id} className="bg-slate-900 text-white p-8 md:p-12 rounded-[45px] shadow-2xl relative border border-slate-800 overflow-hidden group text-left min-h-[400px] h-auto flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-5xl group-hover:scale-110 transition-all duration-700">🤝</div>
                    <div className="space-y-8 relative z-10 flex-grow">
                        <div className="space-y-1">
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest italic">Schedule</p>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tight">{mounted && formatMeetingTime(new Date(m.timeSlot.startTime))}</h3>
                            <p className="text-slate-500 text-xs font-bold">{mounted && new Date(m.timeSlot.startTime).toLocaleDateString('ko-KR', {dateStyle: 'full'})}</p>
                        </div>
                        <div className="pt-8 border-t border-slate-800 space-y-4">
                            <div className="min-w-0">
                                <p className="text-blue-400 text-[10px] font-black uppercase mb-1">{m.buyer?.userType}</p>
                                <h4 className="text-xl md:text-2xl font-black truncate">{m.buyer?.companyName}</h4>
                                <p className="text-slate-400 text-sm font-medium mt-1">{m.buyer?.name} · {m.buyer?.jobTitle}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-3xl space-y-1">
                                <p className="text-xs text-slate-300 font-bold">📞 {m.buyer?.phone}</p>
                                <p className="text-[11px] text-slate-500 font-medium italic">✉️ {m.buyer?.email}</p>
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. 거절된 내역 (Rejected) */}
          {expandedSection === 'rejected' && (
            <section className="animate-in fade-in slide-in-from-bottom-6 space-y-8">
              <div className="px-4 text-left">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">거절된 내역 <span className="text-rose-500 italic font-normal text-xl ml-1 uppercase">Rejected</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedMeetings.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl flex flex-col gap-4 hover:border-rose-100 transition-all text-left min-h-[220px] h-auto">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 min-w-0">
                        <p className="font-black text-lg text-slate-800 line-through decoration-rose-200 truncate">{m.buyer?.companyName}</p>
                        <p className="text-[10px] text-slate-400 font-black italic uppercase tracking-tighter">🕒 {mounted && formatMeetingTime(new Date(m.timeSlot.startTime))}</p>
                      </div>
                      <span className="bg-rose-50 text-rose-500 text-[9px] font-black px-4 py-1.5 rounded-full uppercase border border-rose-100 shrink-0">Rejected</span>
                    </div>
                    <div className="bg-rose-50/20 p-5 rounded-[25px] border border-rose-50 text-[12px] text-slate-500 font-medium italic leading-relaxed overflow-hidden">
                       <span className="block text-[9px] font-black text-rose-400 mb-1 not-italic tracking-wider uppercase">Buyer's Reason</span>
                       <p className="break-words">"{m.rejectionReason || "거절 사유가 입력되지 않았습니다."}"</p>
                    </div>
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