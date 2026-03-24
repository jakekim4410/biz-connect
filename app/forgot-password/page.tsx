"use client";

import { useState } from "react";
import { resetPasswordAction } from "./action";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length <= 3) setPhone(value);
    else if (value.length <= 7) setPhone(`${value.slice(0, 3)}-${value.slice(3)}`);
    else setPhone(`${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
      <form action={resetPasswordAction} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800">비밀번호 재설정</h1>
          <p className="text-xs text-slate-400 font-bold">가입 시 등록한 이메일과 전화번호를 입력하세요.</p>
        </div>

        <div className="space-y-3">
          <input name="email" type="email" placeholder="가입한 이메일" required className="w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500" />
          <input 
            name="phone" 
            type="text" 
            value={phone}
            onChange={handlePhoneChange}
            placeholder="가입한 전화번호 (010-0000-0000)" 
            maxLength={13}
            required 
            className="w-full p-4 bg-slate-50 rounded-2xl border focus:outline-blue-500" 
          />
        </div>

        <div className="pt-4 border-t">
          <label className="text-[10px] font-black text-blue-500 ml-1 uppercase tracking-widest">New Password</label>
          <input name="newPassword" type="password" placeholder="새로운 비밀번호" required className="w-full p-4 bg-slate-50 rounded-2xl border mt-1 focus:outline-blue-500" />
        </div>

        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black shadow-xl hover:bg-blue-600 transition-all">
          비밀번호 변경하기
        </button>
        
        <p className="text-center"><a href="/login" className="text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors">로그인으로 돌아가기</a></p>
      </form>
    </div>
  );
}