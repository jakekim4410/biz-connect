"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
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
        setError("이메일 또는 비밀번호가 일치하지 않습니다.");
        setIsLoading(false);
      } else {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;
        if (role === "ADMIN") router.push("/admin");
        else if (role === "BUYER") router.push("/buyer");
        else if (role === "SELLER") router.push("/seller");
        else router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
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
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sign In</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 ml-2 uppercase">Email</p>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder="example@email.com"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 ml-2 uppercase">Password</p>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center animate-bounce">{error}</p>}

            <button
              type="submit" disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-3
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              <span>{isLoading ? "로그인 중..." : "로그인"}</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-bold">아직 계정이 없으신가요?</p>
            <Link href="/register" className="text-blue-600 text-xs font-black mt-2 inline-block hover:underline underline-offset-4">회원가입 하기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}