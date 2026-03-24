// app/login/page.tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/"); // 일단 메인으로, 이후 역할별 리다이렉트 가능
      router.refresh();
    } else {
      alert("로그인 정보가 올바르지 않습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md space-y-4">
        <h1 className="text-3xl font-black text-blue-600 mb-6 text-center tracking-tight">BizConnect 로그인</h1>
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-slate-50 rounded-2xl border text-slate-900" />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-slate-50 rounded-2xl border text-slate-900" />
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 transition-all">로그인</button>
        <p className="text-center text-sm text-slate-400">계정이 없으신가요? <a href="/register" className="text-blue-500 font-bold">회원가입</a></p>
        <a href="/forgot-password" title="비밀번호 찾기" className="text-xs text-slate-400 ml-2">비밀번호를 잊으셨나요?</a>
      </form>
    </div>
  );
}