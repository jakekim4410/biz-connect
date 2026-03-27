"use client";

import { useState, useMemo, useEffect } from "react";
import { applyMeetingAction } from "./actions";
import { respondLocationChange } from "../buyer/actions";
import { 
  MapPin, Search, ClipboardList, Handshake, Ban, 
  Phone, Mail, CalendarDays, Check, X as XIcon, Send, Download, Clock
} from "lucide-react";
import * as XLSX from 'xlsx';

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
  const [confirmedSort, setConfirmedSort] = useState("asc");

  useEffect(() => { setMounted(true); }, []);

  const formatMeetingTime = (date: Date) => {
    if (!mounted) return "";
    const d = new Date(date);
    const h24 = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const ampm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${h24}:${min} (${ampm})`;
  };

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

  // 엑셀 다운로드 기능
  const downloadExcel = () => {
    if (!confirmedMeetings || confirmedMeetings.length === 0) {
      alert("다운로드할 데이터가 없습니다.\n(No data to download)");
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
    if (!confirm("이 바이어에게 미팅을 신청하시겠습니까?\n(Do you want to apply for this meeting?)")) return;
    setIsPending(true);
    try { 
      await applyMeetingAction(new FormData(e.currentTarget), sellerId); 
      alert("✅ 신청 완료!\n(APPLICATION COMPLETE)"); 
      setExpandedSection('pending');
    } finally { setIsPending(false); }
  };

  const handleLocationResponse = async (meetingId: number, action: "ACCEPT" | "REJECT") => {
    const msg = action === "ACCEPT" ? "수락하시겠습니까? (ACCEPT?)" : "거절하시겠습니까? (REJECT?)";
    if (!confirm(msg)) return;
    setIsPending(true);
    try {
      await respondLocationChange(meetingId, action);
      alert(action === "ACCEPT" ? "✅ 최종 변경되었습니다. (CHANGED)" : "거절되었습니다. (REJECTED)");
    } finally { setIsPending(false); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-sans text-slate-900 pb-20 text-left">
      <div className="absolute top-[-10%] left-[-5%] w-[90%] md:w-[45%] h-[40%] bg-emerald-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`relative z-10 p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
        
        {/* 상단 네비게이션 */}
        <header className="bg-white/90 backdrop-blur-2xl p-4 md:p-8 rounded-[35px] md:rounded-[45px] shadow-xl border border-white">
          <div className="grid grid-cols-2 md:flex md:justify-around gap-2 md:gap-8">
            {[
              { id: 'available', icon: <Search size={22}/>, label: '매칭 탐색', sub: '(SEARCH)', count: availableSlots?.length || 0 },
              { id: 'pending', icon: <Clock size={22}/>, label: '신청 현황', sub: '(STATUS)', count: pendingMeetings?.length || 0 },
              { id: 'confirmed', icon: <Handshake size={22}/>, label: '확정 일정', sub: '(LIST)', count: confirmedMeetings?.length || 0 },
              { id: 'rejected', icon: <Ban size={22}/>, label: '거절 내역', sub: '(REJECTED)', count: rejectedMeetings?.length || 0 },
            ].map((item) => (
              <button key={item.id} onClick={() => setExpandedSection(item.id)} className={`flex flex-col items-center gap-1.5 p-2 transition-all duration-300 ${expandedSection === item.id ? 'scale-105' : ''}`}>
                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg ${expandedSection === item.id ? 'bg-slate-900 text-white shadow-slate-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>{item.icon}</div>
                <div className="text-center">
                    <span className={`text-[10px] md:text-sm font-black block leading-none ${expandedSection === item.id ? 'text-slate-900' : 'text-slate-400'}`}>{item.label} ({item.count})</span>
                    <span className="text-[7px] md:text-[9px] font-bold opacity-40 uppercase mt-0.5">{item.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-[500px]">
          {/* 1. 탐색 섹션 */}
          {expandedSection === 'available' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-10 px-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">신청 가능한 미팅<br/><span className="text-lg opacity-30 font-bold uppercase">(AVAILABLE MEETINGS)</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {availableSlots.map((slot: any) => (
                  <div key={slot.id} className="bg-white p-8 md:p-10 rounded-[45px] shadow-xl border-2 border-white hover:shadow-2xl transition-all flex flex-col min-h-[580px] text-left">
                    <div className="flex-grow space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg uppercase">{slot.buyer?.userType}</span>
                        <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black">신청가능</div>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-black text-slate-800 break-all leading-tight">{slot.buyer?.companyName}</h4>
                        <div className="mt-4 bg-slate-50 p-5 rounded-[25px] border border-slate-100 italic text-[11px] font-bold text-slate-500 leading-relaxed break-keep">
                          "{slot.buyer?.preferredPartners || "전분야 협업 가능"}"
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-50 space-y-3">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-indigo-400 italic tracking-widest">희망 일시 (TIME)</p>
                            <p className="text-sm font-black text-slate-700">{new Date(slot.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
                            <div className="inline-block px-3 py-1 rounded-lg text-[13px] font-black bg-indigo-50 text-indigo-600">{formatMeetingTime(new Date(slot.startTime))}</div>
                         </div>
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 italic">
                            <MapPin size={12} className="shrink-0"/> 장소: {slot.location || "미지정 (TBD)"}
                         </div>
                      </div>
                    </div>

                    <form onSubmit={onApply} className="mt-8 space-y-4">
                      <input type="hidden" name="slotId" value={slot.id} />
                      <input type="hidden" name="buyerId" value={slot.buyerId} />
                      <textarea name="proposal" required placeholder="제안 내용을 입력하세요. (PROPOSAL)" className="w-full p-5 text-xs bg-slate-50 border-none rounded-[25px] h-24 shadow-inner outline-none resize-none leading-relaxed" />
                      <button className="w-full bg-slate-900 text-white py-4 rounded-[25px] font-black text-sm hover:bg-blue-600 transition-all shadow-xl active:scale-95">미팅 신청하기 (APPLY)</button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. 신청 현황 섹션 */}
          {expandedSection === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-8 px-2">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">나의 신청 현황<br/><span className="text-lg opacity-30 font-bold uppercase">(APPLICATION STATUS)</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingMeetings.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-white shadow-xl space-y-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase block mb-1">{m.buyer?.userType}</span>
                        <p className="font-black text-lg text-slate-800 truncate">{m.buyer?.companyName}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">🕒 {formatMeetingTime(new Date(m.timeSlot.startTime))}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-xl animate-pulse">검토 중</span>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-[25px] text-[11px] text-slate-500 italic border border-slate-100 min-h-[80px]">
                        <p className="line-clamp-4">" {m.proposal} "</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. 확정 일정 섹션 (UX 업그레이드) */}
          {expandedSection === 'confirmed' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-10 px-2 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">확정된 미팅 일정<br/><span className="text-lg opacity-30 font-bold uppercase">(CONFIRMED LIST)</span></h2>
                  <div className="mt-4 flex gap-2">
                    <select value={confirmedSort} onChange={(e) => setConfirmedSort(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 outline-none shadow-sm">
                        <option value="asc">날짜순 ASC</option>
                        <option value="desc">최신순 DESC</option>
                    </select>
                  </div>
                </div>
                <button onClick={downloadExcel} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-[11px] font-black hover:bg-black transition-all shadow-xl active:scale-95">
                  <Download size={14}/> 엑셀 다운로드 (DOWNLOAD EXCEL)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayConfirmed.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[45px] shadow-xl border-2 border-emerald-100 transition-all flex flex-col min-h-[450px] hover:shadow-2xl">
                    
                    {/* 상단: 일시 */}
                    <div className="flex justify-between items-start mb-6">
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

                    {/* 중단: 장소 정보 및 장소변경 요청 수락/거절 UI */}
                    <div className="mb-6 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 italic">
                            <MapPin size={12} className="shrink-0 text-blue-500"/> 미팅 장소 (LOCATION)
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[25px] border border-slate-100">
                            <p className="text-sm font-black text-slate-800 break-all leading-snug">
                                {m.location || "장소 미지정 (TBD)"}
                            </p>
                            
                            {/* 바이어의 장소 변경 요청이 있을 경우 */}
                            {m.locationChangeStatus === "PENDING" && (
                                <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                                    <div className="flex items-start gap-2">
                                        <Send size={12} className="text-amber-500 mt-0.5 animate-pulse"/>
                                        <p className="text-[10px] font-bold text-amber-600 leading-tight">
                                            바이어 제안 장소: <span className="italic font-black">"{m.pendingLocation}"</span>
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleLocationResponse(m.id, "ACCEPT")} className="py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black shadow-sm">변경 수락</button>
                                        <button onClick={() => handleLocationResponse(m.id, "REJECT")} className="py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-[10px] font-black shadow-sm">거절</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 하단: 바이어 정보 */}
                    <div className="mt-auto pt-6 border-t border-slate-50">
                        <div className="p-5 rounded-[30px] border border-slate-100 bg-slate-50/50 space-y-4">
                            <div>
                                <h4 className="font-black text-base truncate text-slate-800">{m.buyer?.companyName}</h4>
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{m.buyer?.name} <span className="opacity-50">{m.buyer?.jobTitle || "담당자"}</span></p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                        <Phone size={13} className="text-emerald-500"/>
                                    </div>
                                    <span className="text-[13px] font-black tracking-tight">{m.buyer?.phone}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                        <Mail size={13} className="text-blue-500"/>
                                    </div>
                                    <span className="text-[11px] font-black truncate">{m.buyer?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. 거절 내역 섹션 */}
          {expandedSection === 'rejected' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 space-y-8 px-2 text-left">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">거절 내역<br/><span className="text-lg opacity-30 font-bold uppercase">(REJECTED HISTORY)</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rejectedMeetings.map((m: any) => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 hover:border-rose-100 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-base text-slate-400 line-through truncate">{m.buyer?.companyName}</p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 tracking-tighter">Rejected</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-rose-100 leading-none">거절됨</span>
                      </div>
                    </div>
                    <div className="bg-rose-50/20 p-5 rounded-[25px] border border-rose-50 text-[11px] text-slate-500 font-medium italic leading-relaxed min-h-[80px]">
                       " {m.rejectionReason || "거절 사유가 입력되지 않았습니다."} "
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