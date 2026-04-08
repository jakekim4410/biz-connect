"use client";

import { useState, useEffect } from "react";
import { updateProfileAction, getUserData } from "./action";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [userTypeDetail, setUserTypeDetail] = useState("");
  const [preferredPartners, setPreferredPartners] = useState("");
  const [email, setEmail] = useState(""); // 이메일은 수정 불가용

  const [message, setMessage] = useState("");

  // 1. 기존 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      const user = await getUserData();
      if (user) {
        setName(user.name || "");
        setPhone(user.phone || "");
        setJobTitle(user.jobTitle || "");
        setCompanyName(user.companyName || "");
        setSelectedType(user.userType || "VC");
        setUserTypeDetail(user.userTypeDetail || "");
        setPreferredPartners(user.preferredPartners || "");
        setEmail(user.email || "");
      }
    }
    loadData();
  }, []);

  // 전화번호 자동 하이픈
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setPhone(formatted);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-slate-900 font-sans">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-2xl space-y-6 border border-slate-100">
        <h1 className="text-3xl font-black text-blue-600 mb-8 text-center tracking-tighter">회원 정보 수정</h1>
        
        {message && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-bold border border-emerald-100 text-center animate-pulse">
            {message}
          </div>
        )}

        <form action={async (formData) => {
          const res = await updateProfileAction(formData);
          if (res.success) {
            setMessage("✅ 정보가 성공적으로 업데이트되었습니다!");
            setTimeout(() => setMessage(""), 3000);
          }
        }} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">이메일 (변경 불가)</label>
              <input value={email} disabled className="w-full p-4 bg-slate-50 rounded-2xl border text-slate-400 cursor-not-allowed mt-1" />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">성함</label>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-4 bg-white rounded-2xl border focus:outline-blue-500 mt-1" />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">연락처</label>
              <input name="phone" value={phone} onChange={handlePhoneChange} maxLength={13} required className="w-full p-4 bg-white rounded-2xl border focus:outline-blue-500 mt-1" />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">직함</label>
              <input name="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required className="w-full p-4 bg-white rounded-2xl border focus:outline-blue-500 mt-1" />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회사명</label>
              <input name="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="w-full p-4 bg-white rounded-2xl border focus:outline-blue-500 mt-1" />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">회원 유형</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { val: "VC", label: "VC" },
                { val: "AC", label: "AC" },
                { val: "바이어", label: "Buyer" },
                { val: "스타트업", label: "Startup" },
                { val: "기타", label: "Other" }
              ].map((opt) => (
                <label 
                  key={opt.val} 
                  className={`flex-1 min-w-[80px] text-center px-1 py-3 border rounded-xl cursor-pointer text-xs font-bold transition-all whitespace-nowrap break-keep shrink-0
                    ${selectedType === opt.val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"}`}
                >
                  <input type="radio" name="userType" value={opt.val} className="hidden" checked={selectedType === opt.val} onChange={(e) => setSelectedType(e.target.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
            {selectedType === "기타" && (
              <input 
                name="userTypeDetail" type="text" placeholder="유형을 직접 입력하세요" required 
                value={userTypeDetail} onChange={(e) => setUserTypeDetail(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-blue-200 rounded-2xl text-sm" 
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">선호하는 미팅 상대</label>
            <textarea 
              name="preferredPartners" value={preferredPartners} onChange={(e) => setPreferredPartners(e.target.value)}
              className="w-full p-4 bg-white rounded-2xl border h-24 text-sm focus:outline-blue-500" 
            />
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-600 transition-all active:scale-95">
            정보 업데이트
          </button>
        </form>
      </div>
    </div>
  );
}