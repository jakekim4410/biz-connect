"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  deleteUser, 
  updateUserAdmin, 
  deleteTimeSlot, 
  updateTimeSlotLocation,
  updateMeetingStatus,
  updateMeetingLocation,
  updateMeetingDateTime
} from "./actions"; 
import { 
  Trash2, MapPin, Save, X, Edit2, Search, RotateCcw, 
  ShieldCheck, Users, User, Calendar, Clock, CheckCircle2, AlertCircle, Ban, Sparkles
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminClient({ stats, users, timeSlots, meetings }: any) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // 필터 상태
  const [filterUser, setFilterUser] = useState("");
  const [slotSubFilter, setSlotSubFilter] = useState("ALL");
  const [slotDateFilter, setSlotDateFilter] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterSeller, setFilterSeller] = useState("");

  useEffect(() => setMounted(true), []);

  const formatDate = (date: any) => date ? new Date(date).toISOString().split('T')[0] : "";
  const formatTime = (date: any) => date ? new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "";

  const startEditing = (item: any) => {
    setEditingId(item.id);
    if (activeTab === "matches") {
      setEditForm({ 
        ...item, 
        tempDate: formatDate(item.timeSlot?.startTime),
        tempTime: formatTime(item.timeSlot?.startTime)
      });
    } else {
      setEditForm({ ...item });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUserUpdate = async (id: number) => {
    const res = await updateUserAdmin(id, editForm);
    if (res.success) { setEditingId(null); alert("회원 권한 및 정보가 수정되었습니다."); }
    else alert(res.error);
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

  const filteredUsers = useMemo(() => users.filter((u: any) => 
    u.name.toLowerCase().includes(filterUser.toLowerCase()) || 
    u.companyName.toLowerCase().includes(filterUser.toLowerCase())
  ), [users, filterUser]);

  const filteredSlots = useMemo(() => timeSlots.filter((s: any) => {
    const d = formatDate(s.startTime);
    return (slotDateFilter === "" || d === slotDateFilter) && (slotSubFilter === "ALL" || (slotSubFilter === "OPEN" ? s.status === "OPEN" : s.status !== "OPEN"));
  }), [timeSlots, slotSubFilter, slotDateFilter]);

  const filteredMeetings = useMemo(() => meetings.filter((m: any) => {
    const d = formatDate(m.timeSlot?.startTime);
    return (filterDate === "" || d === filterDate) && (m.buyer?.companyName.includes(filterBuyer)) && (m.seller?.companyName.includes(filterSeller));
  }), [meetings, filterDate, filterBuyer, filterSeller]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-20 font-pretendard">
      {/* 1. 요약 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "총 가입자", val: stats.userCount, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "전체 슬롯", val: stats.slotCount, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "매칭 완료", val: stats.activeMatches, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "검토중", val: stats.pendingMatches, color: "text-orange-500", bg: "bg-orange-50" },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} p-6 rounded-3xl border border-white shadow-sm`}>
            <p className="text-slate-500 text-xs font-bold uppercase">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* 2. 상단 네비게이션 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <nav className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full md:w-fit">
          {["users", "reservations", "matches"].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); cancelEditing(); }} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"}`}>
              {tab === "users" ? "회원 관리" : tab === "reservations" ? "슬롯 관리" : "매칭 관리"}
            </button>
          ))}
        </nav>
      </div>

      {/* 3. 메인 테이블 영역 */}
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden min-h-[600px]">
        
        {/* --- 회원 관리 (마스터/멤버 구분 추가됨) --- */}
        {activeTab === "users" && (
          <div className="animate-in fade-in duration-500">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="이름 또는 회사명 검색..." value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="p-2.5 text-sm border rounded-xl w-72 outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b">
                  <tr>
                    <th className="p-5">회사 및 성함</th>
                    <th className="p-5">조직 권한</th>
                    <th className="p-5">승인 상태</th>
                    <th className="p-5">계정 유형</th>
                    <th className="p-5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u: any) => {
                    const isEditing = editingId === u.id;
                    return (
                      <tr key={u.id} className={`transition-colors ${isEditing ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-5">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input className="border px-3 py-1.5 text-sm rounded-lg bg-white font-bold" value={editForm.companyName} onChange={e => setEditForm({...editForm, companyName: e.target.value})} placeholder="회사명" />
                              <input className="border px-3 py-1.5 text-sm rounded-lg bg-white" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="이름" />
                            </div>
                          ) : (
                            <div className="text-left">
                              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5">{u.companyName}</div>
                              <div className="font-bold text-slate-900 text-base">{u.name}</div>
                              <div className="text-[11px] text-slate-400 font-medium">{u.phone} • {u.email}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-5">
                          {isEditing ? (
                            <select value={String(editForm.isMaster)} onChange={e => setEditForm({...editForm, isMaster: e.target.value === "true"})} className="p-2 border rounded-xl text-xs font-bold bg-white">
                              <option value="true">MASTER (관리권한)</option>
                              <option value="false">MEMBER (조직원)</option>
                            </select>
                          ) : (
                            u.role === 'ADMIN' ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black shadow-sm w-fit border border-rose-100"><ShieldCheck size={12}/> SYSTEM ADMIN</span>
                            ) : u.isMaster ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black shadow-sm w-fit border border-indigo-100"><ShieldCheck size={12}/> MASTER</span>
                            ) : (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black w-fit border border-slate-100"><Users size={12}/> MEMBER</span>
                            )
                          )}
                        </td>
                        <td className="p-5">
                          {isEditing ? (
                            <select value={editForm.approvalStatus} onChange={e => setEditForm({...editForm, approvalStatus: e.target.value})} className="p-2 border rounded-xl text-xs font-bold bg-white">
                              <option value="APPROVED">APPROVED (승인)</option>
                              <option value="PENDING">PENDING (대기)</option>
                              <option value="REJECTED">REJECTED (거절)</option>
                            </select>
                          ) : (
                            <span className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black w-fit ${
                              u.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                              u.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-rose-50 text-rose-500'
                            }`}>
                              {u.approvalStatus === 'APPROVED' ? <CheckCircle2 size={12}/> : u.approvalStatus === 'PENDING' ? <Clock size={12}/> : <Ban size={12}/>}
                              {u.approvalStatus}
                            </span>
                          )}
                        </td>
                        <td className="p-5">
                          <select 
                            disabled={!isEditing} 
                            value={isEditing ? editForm.role : u.role} 
                            onChange={(e) => setEditForm({...editForm, role: e.target.value})} 
                            className={`text-[10px] font-black px-3 py-2 rounded-xl border-none ring-1 transition-all ${isEditing ? 'ring-blue-500 bg-white text-slate-900' : 'ring-transparent opacity-100 cursor-default'} ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'BUYER' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}
                          >
                            <option value="BUYER">BUYER (바이어)</option><option value="SELLER">SELLER (스타트업)</option><option value="ADMIN">ADMIN (관리자)</option>
                          </select>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <><button onClick={() => handleUserUpdate(u.id)} className="p-2 text-emerald-600 bg-white border border-emerald-100 rounded-xl shadow-sm"><Save size={20}/></button><button onClick={cancelEditing} className="p-2 text-slate-400 bg-white border border-slate-100 rounded-xl shadow-sm"><X size={20}/></button></>
                            ) : (
                              <><button onClick={() => startEditing(u)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={18}/></button><button onClick={() => confirm("회원 계정을 영구 삭제하시겠습니까?") && deleteUser(u.id)} className="p-2 text-slate-200 hover:text-red-600"><Trash2 size={20}/></button></>
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
        )}

        {/* --- 슬롯 관리 --- */}
        {activeTab === "reservations" && (
          <div className="animate-in fade-in duration-500">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                {["ALL", "OPEN", "MATCHED"].map(f => (
                  <button key={f} onClick={() => setSlotSubFilter(f)} className={`px-4 py-1.5 rounded-xl text-xs font-bold border ${slotSubFilter === f ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-500"}`}>{f}</button>
                ))}
              </div>
              <input type="date" value={slotDateFilter} onChange={(e) => setSlotDateFilter(e.target.value)} className="p-2 text-xs border rounded-xl outline-none focus:ring-2 ring-indigo-100" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase border-b">
                  <tr><th className="p-5">일시</th><th className="p-5">바이어</th><th className="p-5">장소 설정</th><th className="p-5 text-center">상태</th><th className="p-5 text-right">삭제</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSlots.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold"><div className="text-slate-700">{formatDate(s.startTime)}</div><div className="text-indigo-600 font-black">{formatTime(s.startTime)}</div></td>
                      <td className="p-5 font-bold">{s.buyer?.companyName} <span className="text-slate-400 font-normal ml-1">({s.buyer?.name})</span></td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 max-w-[200px]"><MapPin size={14} className="text-rose-400" /><input type="text" placeholder="장소 지정" defaultValue={s.location || ""} onBlur={(e) => updateTimeSlotLocation(s.id, e.target.value)} className="text-xs border-b border-slate-100 hover:border-blue-400 focus:border-blue-600 outline-none w-full bg-transparent py-1 transition-all" /></div>
                      </td>
                      <td className="p-5 text-center"><span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black ${s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-100 text-slate-400'}`}>{s.status}</span></td>
                      <td className="p-5 text-right"><button onClick={() => confirm("슬롯을 삭제하시겠습니까?") && deleteTimeSlot(s.id)} className="text-slate-200 hover:text-red-600 p-2 transition-colors"><Trash2 size={18}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 매칭 관리 --- */}
        {activeTab === "matches" && (
          <div className="animate-in fade-in duration-500">
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-center text-left">
              <input type="text" placeholder="바이어 회사명" value={filterBuyer} onChange={(e) => setFilterBuyer(e.target.value)} className="p-2.5 text-xs border rounded-xl outline-none" />
              <input type="text" placeholder="셀러 회사명" value={filterSeller} onChange={(e) => setFilterSeller(e.target.value)} className="p-2.5 text-xs border rounded-xl outline-none" />
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="p-2.5 text-xs border rounded-xl outline-none" />
              <button onClick={() => {setFilterDate(""); setFilterBuyer(""); setFilterSeller("");}} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"><RotateCcw size={14} className="inline mr-1"/> 초기화</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase border-b">
                  <tr><th className="p-5">일시 수정</th><th className="p-5">참여사 (S / B)</th><th className="p-5">최종 장소</th><th className="p-5 text-center">상태 제어</th><th className="p-5 text-right">관리</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMeetings.map((m: any) => {
                    const isEditing = editingId === m.id;
                    const status = isEditing ? editForm.status : m.status;
                    return (
                      <tr key={m.id} className={`transition-colors ${isEditing ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-5">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input type="date" className="border px-2 py-1 text-xs rounded bg-white shadow-inner outline-none" value={editForm.tempDate} onChange={e => setEditForm({...editForm, tempDate: e.target.value})} />
                              <input type="time" className="border px-2 py-1 text-xs rounded bg-white shadow-inner outline-none" value={editForm.tempTime} onChange={e => setEditForm({...editForm, tempTime: e.target.value})} />
                            </div>
                          ) : (
                            <div><div className="font-bold text-slate-700">{formatDate(m.timeSlot?.startTime)}</div><div className="text-indigo-600 font-black">{formatTime(m.timeSlot?.startTime)}</div></div>
                          )}
                        </td>
                        <td className="p-5 space-y-1 text-left">
                          <div className="text-xs font-bold flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-500 text-white text-[9px] flex items-center justify-center">S</span> {m.seller?.companyName}</div>
                          <div className="text-xs font-bold flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-orange-500 text-white text-[9px] flex items-center justify-center">B</span> {m.buyer?.companyName}</div>
                        </td>
                        <td className="p-5">
                          {isEditing ? (
                            <input className="border px-3 py-2 text-xs w-full rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={editForm.location || ""} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="확정 장소 입력" />
                          ) : (
                            <div className="text-xs text-slate-500">{m.location || "장소 미지정"}</div>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          <select 
                            disabled={!isEditing}
                            value={status} 
                            onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                            className={`text-[11px] font-black px-4 py-2 rounded-xl border-none ring-1 transition-all outline-none appearance-none ${
                              isEditing ? 'ring-blue-500 bg-white text-slate-900 shadow-md' : 'ring-transparent cursor-default'
                            } ${
                              status === 'ACCEPTED' ? (isEditing ? 'text-slate-900' : 'bg-emerald-500 text-white shadow-sm') : 
                              status === 'CANCELLED' ? (isEditing ? 'text-slate-900' : 'bg-red-500 text-white') : 
                              status === 'REJECTED' ? (isEditing ? 'text-slate-900' : 'bg-slate-400 text-white') : 
                              (isEditing ? 'text-slate-900' : 'bg-amber-400 text-white animate-pulse')
                            }`}
                          >
                            <option value="PENDING">PENDING (검토)</option>
                            <option value="ACCEPTED">ACCEPTED (승인)</option>
                            <option value="REJECTED">REJECTED (거절)</option>
                            <option value="CANCELLED">CANCELLED (취소)</option>
                          </select>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <><button onClick={() => handleMeetingUpdate(m.id)} className="p-2 text-emerald-600 bg-white border border-emerald-200 rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"><Save size={18}/></button><button onClick={cancelEditing} className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"><X size={18}/></button></>
                            ) : (
                              <button onClick={() => startEditing(m)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={18}/></button>
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
        )}
      </div>
    </div>
  );
}