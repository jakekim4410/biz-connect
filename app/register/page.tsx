"use client";

import { useState, useEffect } from "react";
import { registerUserAction, checkExistingCompanyAction, checkExistingBusinessNumberAction, checkExistingEmailAction } from "./action";

export default function RegisterPage() {
  const [role, setRole] = useState("BUYER");
  const[isRoleLocked, setIsRoleLocked] = useState(false);

  const [email, setEmail] = useState("");
  // 이메일 유효성 및 중복 확인 상태 관리
  const[emailStatus, setEmailStatus] = useState<"idle" | "loading" | "available" | "duplicate" | "invalid">("idle");
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(""); 
  const [jobTitle, setJobTitle] = useState("");
  const[companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState(""); 
  const[selectedType, setSelectedType] = useState("VC");
  const [userTypeDetail, setUserTypeDetail] = useState("");
  const [preferredPartners, setPreferredPartners] = useState("");
  
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const[similarCompanies, setSimilarCompanies] = useState<any[]>([]);
  const [isSameCompanyConfirmed, setIsSameCompanyConfirmed] = useState(false);

  // 이메일 중복 및 형식 자동 확인
  useEffect(() => {
    const checkEmailTimer = setTimeout(async () => {
      if (email.length === 0) {
        setEmailStatus("idle");
        return;
      }
      // 간단한 이메일 형식 정규식 검사
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailStatus("invalid");
        return;
      }

      setEmailStatus("loading");
      const isDuplicate = await checkExistingEmailAction(email);
      
      if (isDuplicate) {
        setEmailStatus("duplicate");
      } else {
        setEmailStatus("available");
      }
    }, 500); // 0.5초 디바운스 적용

    return () => clearTimeout(checkEmailTimer);
  }, [email]);


  // 전화번호 포맷팅
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 7) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    setPhone(formatted);
  };

  // 사업자등록번호 포맷팅 (000-00-00000)
  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;
    if (value.length <= 3) formatted = value;
    else if (value.length <= 5) formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    else formatted = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`;
    setBusinessNumber(formatted);
  };

  // 사업자등록번호 입력 시 자동 검증 및 연동
  useEffect(() => {
    const checkBizNum = async () => {
      if (businessNumber.length === 12) {
        const existing = await checkExistingBusinessNumberAction(businessNumber);
        if (existing) {
          setCompanyName(existing.companyName); 
          setIsSameCompanyConfirmed(true);
          
          if (existing.role) {
            setRole(existing.role);
            setIsRoleLocked(true);
          }
        }
      }
    };
    checkBizNum();
  }, [businessNumber]);

  // 회사명 검색 (기존)
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
          
          // 이메일이 사용 가능 상태가 아니라면 제출 차단
          if (emailStatus !== "available") {
            setError("유효한 이메일을 입력해주세요.");
            return;
          }

          setError("");
          setIsPending(true);
          const formData = new FormData(e.currentTarget);
          
          if (isRoleLocked) {
            formData.set("role", role);
            // 👇 추가됨: 사업자등록번호가 disabled 상태이면 폼 데이터에 안 담기므로 수동으로 세팅
            formData.set("businessNumber", businessNumber);
          }

          const result = await registerUserAction(formData);
          if (result?.error) {
            setError(result.error);
            setIsPending(false);
          } else if (result?.success) {
            if (result.role === "BUYER" && result.approvalStatus === "PENDING") {
              alert("바이어 계정 가입이 완료되었습니다.\n관리자(어드민)의 최종 승인 후 정상적으로 서비스를 이용하실 수 있습니다.");
            } else {
              alert("회원가입이 성공적으로 완료되었습니다.");
            }
            window.location.href = "/login"; 
          }
        }} 
        className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-2xl space-y-6 border border-slate-100"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-blue-600 tracking-tighter">BizConnect 가입</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-[0.2em]">Personal Account Registration</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2 animate-in slide-in-from-top-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="flex justify-end">
          <p className="text-[10px] font-bold text-slate-400">
            <span className="text-rose-500">*</span> 표시는 필수 입력 항목입니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          
          <div className="col-span-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              계정 유형 <span className="text-rose-500">*</span>
            </label>
            <select 
              name="role" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isRoleLocked}
              className={`w-full p-4 rounded-2xl border font-bold outline-none transition-all ${isRoleLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
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

          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              이메일 주소 <span className="text-rose-500">*</span>
            </label>
            <input 
              name="email" 
              type="email" 
              placeholder="이메일 주소" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:bg-white transition-colors focus:outline-none ${
                emailStatus === "duplicate" || emailStatus === "invalid" ? 'border-rose-500 focus:border-rose-500' :
                emailStatus === "available" ? 'border-emerald-500 focus:border-emerald-500' : 'border-slate-200 focus:border-blue-500'
              }`} 
            />
            {emailStatus === "invalid" && (
              <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">유효한 이메일 형식을 입력해주세요.</p>
            )}
            {emailStatus === "duplicate" && (
              <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">이미 가입된 이메일입니다.</p>
            )}
            {emailStatus === "available" && (
              <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">✓ 사용 가능한 이메일입니다.</p>
            )}
            {emailStatus === "loading" && (
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-2">확인 중...</p>
            )}
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              전화번호 <span className="text-rose-500">*</span>
            </label>
            <input name="phone" type="text" placeholder="전화번호" maxLength={13} required value={phone} onChange={handlePhoneChange} className="w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500 focus:bg-white transition-colors" />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              비밀번호 <span className="text-rose-500">*</span>
            </label>
            <input 
              name="password" 
              type="password" 
              placeholder="비밀번호 (8자 이상)" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:bg-white transition-colors focus:outline-none ${
                password.length > 0 && !isPasswordValid ? 'border-rose-500 focus:border-rose-500' : 
                isPasswordValid ? 'border-emerald-500 focus:border-emerald-500' : 'border-slate-200 focus:border-blue-500'
              }`} 
            />
            {password.length === 0 && (
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-2">8글자 이상으로 작성하세요.</p>
            )}
            {password.length > 0 && !isPasswordValid && (
              <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">비밀번호가 너무 짧습니다. (8자 이상)</p>
            )}
            {isPasswordValid && (
              <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">✓ 8글자 이상으로 안전합니다.</p>
            )}
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              비밀번호 확인 <span className="text-rose-500">*</span>
            </label>
            <input 
              name="confirmPassword" 
              type="password" 
              placeholder="비밀번호 한 번 더 입력" 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:bg-white transition-colors focus:outline-none ${
                confirmPassword.length > 0 && !isPasswordMatch ? 'border-rose-500 focus:border-rose-500' : 
                confirmPassword.length > 0 && isPasswordMatch ? 'border-emerald-500 focus:border-emerald-500' : 'border-slate-200 focus:border-blue-500'
              }`} 
            />
            {confirmPassword.length > 0 && isPasswordMatch && (
              <p className="text-[10px] text-emerald-500 font-bold mt-1.5 ml-2">✓ 비밀번호가 일치합니다.</p>
            )}
            {confirmPassword.length > 0 && !isPasswordMatch && (
              <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-2">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <div className="col-span-2 relative mt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              회사명 (Company) <span className="text-rose-500">*</span>
            </label>
            <input 
              name="companyName" 
              placeholder="회사명을 입력하세요" 
              required 
              value={companyName} 
              onChange={(e) => {
                setCompanyName(e.target.value);
                setIsSameCompanyConfirmed(false);
                setIsRoleLocked(false);
              }} 
              className={`w-full p-4 bg-slate-50 rounded-2xl border focus:bg-white transition-colors focus:outline-none ${
                isSameCompanyConfirmed ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 focus:border-blue-500'
              }`} 
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
                        
                        if (comp.role) {
                          setRole(comp.role);
                          setIsRoleLocked(true);
                        }
                        
                        if (comp.businessNumber) {
                          setBusinessNumber(comp.businessNumber);
                        }
                      }}
                      className="flex justify-between items-center p-4 hover:bg-blue-50 rounded-2xl border border-slate-50 transition-all text-left group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm text-slate-800 group-hover:text-blue-700">{comp.companyName}</span>
                          {comp.businessNumber && (
                            <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {comp.businessNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          기존 가입자 확인용: {comp.name}님
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

          <div className="col-span-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              사업자등록번호 {role === "SELLER" && <span className="text-rose-500">*</span>}
            </label>
            {/* 👇 추가됨: 기존 회사가 선택되어 isRoleLocked가 true면 사업자번호 입력칸을 비활성화 */}
            <input
              name="businessNumber"
              placeholder="000-00-00000 (숫자만 입력)"
              maxLength={12}
              required={role === "SELLER"} 
              value={businessNumber}
              onChange={handleBusinessNumberChange}
              disabled={isRoleLocked}
              className={`w-full p-4 rounded-2xl border outline-none transition-all ${
                isRoleLocked 
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 font-bold' 
                  : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500'
              }`}
            />
            {/* 👇 추가됨: 잠금 안내 메시지 표시 */}
            {isRoleLocked && businessNumber ? (
              <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">
                🔒 선택하신 회사의 사업자등록번호로 고정되었습니다.
              </p>
            ) : role === "SELLER" && (
              <p className="text-[10px] text-blue-500 font-bold mt-1.5 ml-2">
                💡 정확한 회사 분류를 위해 사업자번호 입력이 필수입니다.
              </p>
            )}
          </div>

          <div className="col-span-2 md:col-span-1 mt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              가입자 성함 (Full Name) <span className="text-rose-500">*</span>
            </label>
            <input name="name" placeholder="실명을 입력하세요" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none focus:bg-white focus:border-blue-500 transition-colors" />
          </div>

          <div className="col-span-2 md:col-span-1 mt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
              직함 (Job Title) <span className="text-rose-500">*</span>
            </label>
            <input name="jobTitle" placeholder="예: 팀장, 대표, 매니저" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none focus:bg-white focus:border-blue-500 transition-colors" />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest block mb-1">
            회원 유형 <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {["VC", "AC", "바이어", "스타트업", "기타"].map((v) => (
              <label key={v} className={`flex-1 min-w-[80px] text-center p-3.5 border rounded-2xl cursor-pointer text-xs font-black transition-all ${selectedType === v ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"}`}>
                <input type="radio" name="userType" value={v} className="hidden" checked={selectedType === v} onChange={(e) => setSelectedType(e.target.value)} />
                {v}
              </label>
            ))}
          </div>
          {selectedType === "기타" && (
            <input name="userTypeDetail" type="text" placeholder="상세 유형 입력" required value={userTypeDetail} onChange={(e) => setUserTypeDetail(e.target.value)} className="w-full p-4 mt-2 bg-slate-50 border rounded-2xl text-sm focus:outline-blue-500 focus:bg-white transition-colors" />
          )}
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">
            관심 파트너 및 산업군
          </label>
          <textarea name="preferredPartners" placeholder="관심 산업군 및 선호하는 파트너를 적어주세요. (선택)" value={preferredPartners} onChange={(e) => setPreferredPartners(e.target.value)} className="w-full p-5 bg-slate-50 rounded-[30px] border h-24 text-sm outline-none focus:bg-white focus:border-blue-500 transition-colors" />
        </div>

        {/* 이메일 상태가 available일 때만 가입 버튼 활성화 */}
        <button 
          type="submit"
          disabled={!isPasswordMatch || !isPasswordValid || isPending || (role === "SELLER" && businessNumber.length !== 12) || emailStatus !== "available"}
          className={`w-full py-6 rounded-[30px] font-black text-xl shadow-2xl transition-all ${(isPasswordMatch && isPasswordValid && !isPending && (role !== "SELLER" || businessNumber.length === 12) && emailStatus === "available") ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
        >
          {isPending ? "가입 처리 중..." : "BizConnect 시작하기"}
        </button>
      </form>
    </div>
  );
}