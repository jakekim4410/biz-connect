"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { resetPasswordAction } from "./action";
import Link from "next/link";

function ResetPasswordForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center p-8 bg-rose-50 rounded-3xl border border-rose-200">
        <p className="text-rose-500 font-black mb-4">
          {locale === "ko" ? "유효하지 않은 접근입니다." : "Invalid access."}
        </p>
        <Link href="/login" className="text-sm font-bold text-slate-500 underline">
          {locale === "ko" ? "로그인으로 돌아가기" : "Back to Login"}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(locale === "ko" ? "비밀번호는 8자 이상이어야 합니다." : "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError(locale === "ko" ? "비밀번호가 일치하지 않습니다." : "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await resetPasswordAction(token, password, locale);
    
    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } else {
      setError(result.error || "An error occurred.");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-emerald-50 rounded-3xl border border-emerald-200">
        <p className="text-emerald-600 font-black mb-2">
          {locale === "ko" ? "비밀번호가 성공적으로 변경되었습니다!" : "Password successfully reset!"}
        </p>
        <p className="text-xs text-slate-500 font-bold">
          {locale === "ko" ? "잠시 후 로그인 페이지로 이동합니다..." : "Redirecting to login page..."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black mb-2">
          {locale === "ko" ? "새 비밀번호 설정" : "Reset Password"}
        </h1>
        <p className="text-slate-500 text-sm font-bold">
          {locale === "ko" ? "새로 사용할 비밀번호를 입력해 주세요." : "Enter your new password below."}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 ml-2 uppercase">
            {t.common.password}
          </label>
          <input
            type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 ml-2 uppercase">
            {t.register.confirmPasswordLabel}
          </label>
          <input
            type="password" required value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-500 text-xs font-bold text-center rounded-2xl">
          {error}
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
        <span>{isLoading ? t.common.loading : (locale === "ko" ? "비밀번호 변경하기" : "Update Password")}</span>
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#f4f7fa] px-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[40px] shadow-2xl border border-white">
          <Suspense fallback={<div className="text-center font-bold text-slate-400">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
