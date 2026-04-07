"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", { email, password, redirect: false });

      if (res?.error) {
        if (res.error === "UserNotFound") setError(t.login.errorUserNotFound);
        else if (res.error === "IncorrectPassword") setError(t.login.errorIncorrectPassword);
        else if (res.error === "PendingApproval") setError(t.login.errorPending);
        else if (res.error === "RejectedAccount") setError(t.login.errorRejected);
        else setError(t.login.errorGeneral);
        setIsLoading(false);
      } else {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;

        if (role === "ADMIN") router.push("/select-role");
        else if (role === "BUYER") router.push("/buyer");
        else if (role === "SELLER") router.push("/seller");
        else router.push("/");

        router.refresh();
      }
    } catch (err) {
      setError(t.login.errorGeneral);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#f4f7fa] font-sans relative overflow-hidden px-4">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[40px] shadow-2xl shadow-blue-900/5 border border-white">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">
              <span className="text-[#111827]">Biz</span>
              <span className="text-[#2563eb]">Connect</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
              {t.login.title}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 ml-2 uppercase">
                {t.common.email}
              </p>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder={t.login.emailPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 ml-2 uppercase">
                {t.common.password}
              </p>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder={t.login.passwordPlaceholder}
              />
              <div className="flex justify-end pr-2">
                <Link 
                  href="/forgot-password" 
                  className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {t.register.forgotPasswordLink}
                </Link>
              </div>
            </div>

            {error && (
              <p className="text-rose-500 text-xs font-bold text-center animate-bounce">
                {error}
              </p>
            )}

            <button
              type="submit" disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-3
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{isLoading ? t.login.loadingButton : t.login.submitButton}</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-bold">{t.login.noAccount}</p>
            <Link href="/register" className="text-blue-600 text-xs font-black mt-2 inline-block hover:underline underline-offset-4">
              {t.login.registerLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}