"use client";

import { useState, useEffect } from "react";
import { registerUserAction, checkExistingCompanyAction } from "./action";

export default function RegisterPage() {
  // [추가됨] 계정 유형(role)을 상태로 관리하여 동적으로 제어
  const [role, setRole] = useState("BUYER");
  const [isRoleLocked, setIsRoleLocked] = useState(false); // 역할이 기존 회사에 의해 고정되었는지 여부

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

  const [similarCompanies, setSimilarCompanies] = useState<any[]>([]);
  const [isSameCompanyConfirmed, setIsSameCompanyConfirmed] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setPhone(formatted);
  };

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (companyName.length >= 2 && !isSameCompanyConfirmed) {
        const results = await checkExistingCompanyAction(companyName);
        setSimilarCompanies(results);
      } else {
        setSimilarCompanies([]);
      }
    }, 500);
    return () => clearTimeout(searchTimer);
  }, [companyName, isSameCompanyConfirmed]);

  const isPasswordMatch = password === confirmPassword && password !== "";
  const isPasswordValid = password.length >= 8;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setIsPending(true);
          const formData = new FormData(e.currentTarget);
          
          // [추가됨] select disabled 일 경우 FormData에 값이 안담기므로 수동으로 추가
          if (isRoleLocked) {
            formData.set("role", role);
          }

          const result = await registerUserAction(formData);
          if (result?.error) {
            setError(result.error);
            setIsPending(false);
          }
        }} 
        className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-2xl space-y-6 border border-slate-100"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-600 tracking-tighter">BizConnect 가입</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-[0.2em]">Personal Account Registration</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          
          {/* [수정됨] 계정 유형 셀렉트 - 고정 상태 UI 피드백 반영 */}
          <div className="col-span-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">계정 유형</label>
            <select 
              name="role" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isRoleLocked}
              className={`w-full p-4 rounded-2xl border mt-1 font-bold outline-none transition-all ${isRoleLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200'}`}
            >
              <option value="BUYER">투자자 (VC, AC, BUYER)</option>
              <option value="SELLER">스타트업 (STARTUP)</option>
            </select>
            {isRoleLocked && (
              <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">
                🔒 선택하신 회사의 전용 계정 유형으로 고정되었습니다.
              </p>
            )}
          </div>

          <input name="email" type="email" placeholder="이메일 주소" required value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-2 md:col-span-1 p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500" />
          <input name="phone" type="text" placeholder="전화번호" maxLength={13} required value={phone} onChange={handlePhoneChange} className="col-span-2 md:col-span-1 p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500" />

          <div className="col-span-2 md:col-span-1">
            <input name="password" type="password" placeholder="비밀번호 (8자 이상)" required value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500 ${password.length > 0 && !isPasswordValid ? 'border-rose-500' : ''}`} />
          </div>

          <div className="col-span-2 md:col-span-1">
            <input name="confirmPassword" type="password" placeholder="비밀번호 확인" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500 ${!isPasswordMatch && confirmPassword ? 'border-rose-500' : ''}`} />
          </div>

          {/* 회사명 섹션 */}
          <div className="col-span-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회사명 (Company)</label>
            <input 
              name="companyName" 
              placeholder="회사명을 입력하세요" 
              required 
              value={companyName} 
              onChange={(e) => {
                setCompanyName(e.target.value);
                setIsSameCompanyConfirmed(false);
                setIsRoleLocked(false); // [추가됨] 회사명을 수정하면 역할 고정 해제
              }} 
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500 ${isSameCompanyConfirmed ? 'border-emerald-500 bg-emerald-50/30' : ''}`} 
            />
            
            {similarCompanies.length > 0 && !isSameCompanyConfirmed && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
                <p className="text-xs font-black text-slate-500">이미 등록된 유사한 회사가 있습니다. 소속 회사를 선택해 주세요.</p>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2">
                  {similarCompanies.map((comp) => (
                    <button
                      key={comp.companyName}
                      type="button"
                      onClick={() => {
                        setCompanyName(comp.companyName); 
                        setIsSameCompanyConfirmed(true);
                        setSimilarCompanies([]);
                        
                        // [추가됨] 기존 회사를 선택하면 해당 회사의 역할(role)로 자동 설정하고 변경 불가 처리
                        if (comp.role) {
                          setRole(comp.role);
                          setIsRoleLocked(true);
                        }
                      }}
                      className="flex justify-between items-center p-4 hover:bg-blue-50 rounded-2xl border border-slate-50 transition-all text-left group"
                    >
                      <div className="min-w-0">
                        <span className="font-black text-sm text-slate-800 block group-hover:text-blue-700">{comp.companyName}</span>
                        <p className="text-[10px] text-slate-400">
                          기존 가입자 확인용: {comp.name}님
                          {/* [추가됨] UI 표시 (투자자/스타트업) */}
                          <span className="ml-2 font-bold text-blue-500">{comp.role === "BUYER" ? "[투자자]" : "[스타트업]"}</span>
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">선택</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isSameCompanyConfirmed && (
              <p className="text-[10px] text-emerald-600 font-black mt-1.5 ml-2">✓ 기존 등록된 회사입니다. 비즈니스 정보가 자동 연계됩니다.</p>
            )}
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">가입자 성함 (Full Name)</label>
            <input name="name" placeholder="실명을 입력하세요" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none focus:ring-2 ring-blue-500/20" />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">직함 (Job Title)</label>
            <input name="jobTitle" placeholder="예: 팀장, 대표, 매니저" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none focus:ring-2 ring-blue-500/20" />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">회원 유형</label>
          <div className="flex gap-2 flex-wrap">
            {["VC", "AC", "바이어", "스타트업", "기타"].map((v) => (
              <label key={v} className={`flex-1 min-w-[80px] text-center p-3.5 border rounded-2xl cursor-pointer text-xs font-black transition-all ${selectedType === v ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" : "bg-white text-slate-400 border-slate-100"}`}>
                <input type="radio" name="userType" value={v} className="hidden" checked={selectedType === v} onChange={(e) => setSelectedType(e.target.value)} />
                {v}
              </label>
            ))}
          </div>
          {selectedType === "기타" && (
            <input name="userTypeDetail" type="text" placeholder="상세 유형 입력" required value={userTypeDetail} onChange={(e) => setUserTypeDetail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" />
          )}
        </div>

        <textarea name="preferredPartners" placeholder="관심 산업군 및 선호하는 파트너를 적어주세요." value={preferredPartners} onChange={(e) => setPreferredPartners(e.target.value)} className="w-full p-5 bg-slate-50 rounded-[30px] border h-24 text-sm outline-none" />

        <button 
          type="submit"
          disabled={!isPasswordMatch || !isPasswordValid || isPending}
          className={`w-full py-6 rounded-[30px] font-black text-xl shadow-2xl transition-all ${isPasswordMatch && isPasswordValid && !isPending ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
        >
          {isPending ? "가입 처리 중..." : "BizConnect 시작하기"}
        </button>
      </form>
    </div>
  );
}