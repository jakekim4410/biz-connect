"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function LandingPage() {
  const { data: session } = useSession();
  const { locale, setLocale, isInitialized, t } = useI18n();
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

  if (!mounted || !isInitialized) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fcfdfe] font-sans relative overflow-x-hidden flex flex-col items-center justify-center py-10 md:py-16">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center">
        
        {/* 상단 배지 */}
        <div className="inline-block px-3 py-1 border border-slate-200 rounded-full bg-white/50 mb-8">
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Professional Matching Platform</p>
        </div>
        
        {/* 메인 로고 */}
        <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none mb-10">
          <span className="text-[#111827]">Biz</span>
          <span className="text-[#2563eb]">Connect</span>
        </h1>

        {/* 🔹 중앙 언어 선택 섹션 (상시 노출) */}
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Choose Language</p>
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setLocale("ko")}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
                locale === "ko" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>🇰🇷</span> 한국어
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
                locale === "en" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>🌐</span> English
            </button>
          </div>
        </div>
        
        {/* 슬로건 및 설명 (선택된 언어에 따라 실시간 변화) */}
        <div className="max-w-2xl mx-auto space-y-4 mb-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="text-2xl md:text-4xl font-medium text-slate-700 tracking-tight break-keep">
            {locale === 'ko' ? (
              <>비즈니스의 본질은 <span className="font-black text-slate-900">연결</span>에 있습니다.</>
            ) : (
              <>The essence of business is in <span className="font-black text-slate-900">Connection</span>.</>
            )}
          </h2>
          <p className="text-slate-400 text-sm md:text-xl font-medium leading-relaxed break-keep">
            {locale === 'ko' 
              ? "BizConnect는 복잡한 절차 없이 당신의 비즈니스 시간을 최적화합니다."
              : "BizConnect optimizes your business time without complex procedures."}
          </p>
        </div>

        {/* 핵심 가치 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 w-full max-w-4xl mb-16 px-4 text-left">
            <div className="space-y-2 border-l-2 border-blue-600 pl-6 group hover:bg-blue-50/50 transition-all p-2 rounded-r-lg">
                <p className="text-blue-600 font-black text-[10px] md:text-xs uppercase italic">Direct</p>
                <p className="text-slate-800 font-bold text-sm md:text-base">{locale === 'ko' ? "빠른 연결" : "Fast Connection"}</p>
                <p className="text-slate-400 text-[11px] leading-snug">
                  {locale === 'ko' ? "중개 과정 없이 바이어에게 직접 미팅을 예약하세요." : "Book meetings directly with buyers without intermediaries."}
                </p>
            </div>
            <div className="space-y-2 border-l-2 border-blue-600 pl-6 group hover:bg-blue-50/50 transition-all p-2 rounded-r-lg">
                <p className="text-blue-600 font-black text-[10px] md:text-xs uppercase italic">Real-time</p>
                <p className="text-slate-800 font-bold text-sm md:text-base">{locale === 'ko' ? "실시간 현황 관리" : "Real-time Management"}</p>
                <p className="text-slate-400 text-[11px] leading-snug">
                  {locale === 'ko' ? "모든 매칭 현황을 한눈에 파악하고 즉시 처리합니다." : "Track and process all matching statuses at a glance."}
                </p>
            </div>
            <div className="space-y-2 border-l-2 border-blue-600 pl-6 group hover:bg-blue-50/50 transition-all p-2 rounded-r-lg">
                <p className="text-blue-600 font-black text-[10px] md:text-xs uppercase italic">Verified</p>
                <p className="text-slate-800 font-bold text-sm md:text-base">{locale === 'ko' ? "명확한 파트너 정보" : "Verified Partner Info"}</p>
                <p className="text-slate-400 text-[11px] leading-snug">
                  {locale === 'ko' ? "상호간의 정보를 명확하게 파악하여 매칭 성공률을 높입니다." : "Improve matching success by clearly identifying partner info."}
                </p>
            </div>
        </div>

        {/* 하단 액션 버튼 */}
        {!session && (
          <div className="flex flex-col items-center gap-4 w-full max-w-[280px] md:max-w-xs">
            <Link href="/login" className="w-full py-4 bg-[#111827] text-white rounded-2xl font-black text-center hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-lg">
              {t.common.login}
            </Link>
            <Link href="/register" className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-center hover:border-blue-600 hover:text-blue-600 transition-all text-lg">
              {t.common.register}
            </Link>
          </div>
        )}
      </div>

      <footer className="mt-20 opacity-40 text-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          &copy; 2026 BizConnect. Standard Business Platform.
        </p>
      </footer>
    </div>
  );
}