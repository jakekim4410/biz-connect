"use client";

import { useState } from "react";
import { registerUserAction } from "./action";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedType, setSelectedType] = useState("VC");
  const [userTypeDetail, setUserTypeDetail] = useState("");
  const [preferredPartners, setPreferredPartners] = useState("");
  
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setPhone(formatted);
  };

  const isPasswordMatch = password === confirmPassword && password !== "";
  const isPasswordValid = password.length >= 8; // 8자 기준

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setIsPending(true);
          const formData = new FormData(e.currentTarget);
          const result = await registerUserAction(formData);
          if (result?.error) {
            setError(result.error);
            setIsPending(false);
          }
        }} 
        className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-2xl space-y-6 border border-slate-100"
      >
        <h1 className="text-3xl font-black text-blue-600 mb-8 text-center tracking-tighter">BizConnect 가입</h1>
        
        {/* 에러 박스 - 코드가 아닌 한글 메시지만 노출 */}
        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">계정 유형</label>
            <select name="role" className="w-full p-4 bg-slate-50 rounded-2xl border mt-1 font-bold">
              <option value="BUYER">투자자 (VC, AC, BUYER)</option>
              <option value="SELLER">스타트업</option>
            </select>
          </div>

          <input name="email" type="email" placeholder="이메일 주소" required value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-2 md:col-span-1 p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500" />
          
          <input name="phone" type="text" placeholder="전화번호 (010-0000-0000)" maxLength={13} required value={phone} onChange={handlePhoneChange} className="col-span-2 md:col-span-1 p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500" />

          {/* 비밀번호 입력 - 가이드 추가 */}
          <div className="col-span-2 md:col-span-1">
            <input 
              name="password" type="password" placeholder="비밀번호 (8자 이상)" required 
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500 ${password.length > 0 && !isPasswordValid ? 'border-rose-500' : ''}`} 
            />
            <p className={`text-[10px] mt-1 ml-2 font-bold ${isPasswordValid ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isPasswordValid ? "✓ 보안 강도가 적정합니다." : "* 최소 8자 이상 입력하세요."}
            </p>
          </div>

          <div className="col-span-2 md:col-span-1">
            <input 
              name="confirmPassword" type="password" placeholder="비밀번호 확인" required 
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500 ${!isPasswordMatch && confirmPassword ? 'border-rose-500' : ''}`} 
            />
            {confirmPassword && (
              <p className={`text-[10px] mt-1 ml-2 font-bold ${isPasswordMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPasswordMatch ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
              </p>
            )}
          </div>

          <input name="name" placeholder="성함" required value={name} onChange={(e) => setName(e.target.value)} className="p-4 bg-slate-50 rounded-2xl border" />
          <input name="jobTitle" placeholder="직함" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="p-4 bg-slate-50 rounded-2xl border" />
          <input name="companyName" placeholder="회사명" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="col-span-2 p-4 bg-slate-50 rounded-2xl border" />
        </div>

        <div className="space-y-3 pt-4 border-t">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">회원 유형</label>
          <div className="flex gap-2 flex-wrap">
            {["VC", "AC", "바이어", "스타트업", "기타"].map((v) => (
              <label key={v} className={`flex-1 min-w-[80px] text-center p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all ${selectedType === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"}`}>
                <input type="radio" name="userType" value={v} className="hidden" checked={selectedType === v} onChange={(e) => setSelectedType(e.target.value)} />
                {v}
              </label>
            ))}
          </div>
          {selectedType === "기타" && (
            <input name="userTypeDetail" type="text" placeholder="유형을 직접 입력하세요 (예 : 공공가관, 언론사 등)" required value={userTypeDetail} onChange={(e) => setUserTypeDetail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" />
          )}
        </div>

        <textarea name="preferredPartners" placeholder="선호하는 미팅 상대 및 관심 산업군" value={preferredPartners} onChange={(e) => setPreferredPartners(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border h-24 text-sm" />

        <button 
          type="submit"
          disabled={!isPasswordMatch || !isPasswordValid || isPending}
          className={`w-full py-5 rounded-3xl font-black text-xl shadow-xl transition-all ${isPasswordMatch && isPasswordValid && !isPending ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          {isPending ? "가입 처리 중..." : "회원가입 완료"}
        </button>
      </form>
    </div>
  );
}