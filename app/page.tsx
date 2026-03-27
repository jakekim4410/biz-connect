"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && session) {
      const role = (session.user as any)?.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "BUYER") router.push("/buyer");
      else if (role === "SELLER") router.push("/seller");
    }
  }, [mounted, session, router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fcfdfe] font-sans relative overflow-x-hidden flex flex-col items-center justify-center py-10">
      {/* 배경 데코 */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center">
        <div className="text-center space-y-6 md:space-y-8 mb-12 w-full">
          <div className="inline-block px-3 py-1 border border-slate-200 rounded-full bg-white/50">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Professional Matching Platform</p>
          </div>
          
          {/* 🔹 중앙 로고: 모바일 최적화 크기 (text-5xl) */}
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none break-keep">
            <span className="text-[#111827]">Biz</span>
            <span className="text-[#2563eb]">Connect</span>
          </h1>
          
          <div className="max-w-2xl mx-auto space-y-4 px-2">
            <h2 className="text-xl md:text-3xl font-medium text-slate-700 tracking-tight break-keep">
              비즈니스의 본질은 <span className="font-black text-slate-900">연결</span>에 있습니다.
            </h2>
            <p className="text-slate-400 text-xs md:text-lg font-medium leading-relaxed break-keep">
              BizConnect는 복잡한 절차 없이 당신의 비즈니스 시간을 최적화합니다.
            </p>
          </div>
        </div>

        {/* 핵심 가치 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 w-full max-w-4xl mb-12 px-4">
            <div className="space-y-2 border-l-2 border-blue-600 pl-6">
                <p className="text-blue-600 font-black text-xs md:text-sm uppercase italic">Direct</p>
                <p className="text-slate-800 font-bold text-sm md:text-base">빠른 연결</p>
                <p className="text-slate-400 text-[11px]">중개 과정 없이 바이어에게 직접 미팅을 예약하세요.</p>
            </div>
            <div className="space-y-2 border-l-2 border-blue-600 pl-6">
                <p className="text-blue-600 font-black text-xs md:text-sm uppercase italic">Real-time</p>
                <p className="text-slate-800 font-bold text-sm md:text-base">실시간 현황 관리</p>
                <p className="text-slate-400 text-[11px]">모든 매칭 현황을 한눈에 파악하고 즉시 처리합니다.</p>
            </div>
            <div className="space-y-2 border-l-2 border-blue-600 pl-6">
                <p className="text-blue-600 font-black text-xs md:text-sm uppercase italic">Verified</p>
                <p className="text-slate-800 font-bold text-sm md:text-base">명확한 파트너 정보</p>
                <p className="text-slate-400 text-[11px]">상호간의 정보를 명확하게 파악하여 매칭 성공률을 높입니다.</p>
            </div>
        </div>

        {!session && (
          <div className="flex flex-col items-center gap-4 w-full max-w-[280px] md:max-w-xs">
            <Link href="/login" className="w-full py-4 bg-[#111827] text-white rounded-2xl font-black text-center hover:bg-blue-700 transition-all shadow-lg active:scale-95">로그인</Link>
            <Link href="/register" className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-center hover:border-blue-600 hover:text-blue-600 transition-all">회원가입</Link>
          </div>
        )}
      </div>

      <footer className="mt-12 opacity-40 text-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          &copy; 2026 BizConnect. Standard Business Platform.
        </p>
      </footer>
    </div>
  );
}