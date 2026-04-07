"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { forgotPasswordAction } from "./action";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const result = await forgotPasswordAction(email, locale);
    
    if (result.success) {
      setMessage({
        type: "success",
        text: locale === "ko" 
          ? "비밀번호 재설정 링크가 이메일로 발송되었습니다." 
          : "A password reset link has been sent to your email."
      });
    } else {
      setMessage({
        type: "error",
        text: result.error || (locale === "ko" ? "오류가 발생했습니다." : "An error occurred.")
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#f4f7fa] px-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[40px] shadow-2xl border border-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black mb-2">
              {locale === "ko" ? "비밀번호 찾기" : "Forgot Password"}
            </h1>
            <p className="text-slate-500 text-sm font-bold">
              {locale === "ko" ? "가입하신 이메일 주소를 입력해 주세요." : "Enter the email associated with your account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 ml-2 uppercase">
                {t.common.email}
              </label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="example@email.com"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold text-center ${message.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-3
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{isLoading ? t.common.loading : (locale === "ko" ? "인증 메일 보내기" : "Send Reset Link")}</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/login" className="text-slate-400 text-xs font-black hover:text-blue-600 transition-colors">
              {locale === "ko" ? "로그인 페이지로 돌아가기" : "Back to Login"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}