// app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // 이미 로그인된 사용자는 자동으로 각자의 대시보드로 이동
  if (session) {
    if ((session.user as any).role === "BUYER") redirect("/buyer");
    if ((session.user as any).role === "SELLER") redirect("/seller");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
      {/* 배경 장식 요소 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
      </div>

      <main className="max-w-xl w-full text-center space-y-12">
        {/* 타이틀 섹션 */}
        <section className="space-y-4">
          <div className="inline-block px-4 py-1.5 mb-2 text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase bg-blue-50 rounded-full border border-blue-100">
            Smart Matching Engine
          </div>
          <h1 className="text-7xl font-black tracking-tighter text-slate-900">
            Biz<span className="text-blue-600 underline decoration-blue-200 underline-offset-8">Connect</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            최고의 비즈니스 파트너십을 연결합니다.
          </p>
        </section>

        {/* 액션 버튼 섹션 */}
        <section className="flex flex-col gap-4">
          <a 
            href="/login" 
            className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            로그인하여 시작하기
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] bg-slate-100 flex-1"></div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">New to BizConnect?</span>
            <div className="h-[1px] bg-slate-100 flex-1"></div>
          </div>

          <a 
            href="/register" 
            className="w-full bg-white text-slate-900 border-2 border-slate-100 py-5 rounded-[24px] font-black text-lg hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95"
          >
            회원가입
          </a>
        </section>

        {/* 푸터 섹션 */}
        <footer className="pt-12 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          © 2026 BizConnect Matching Platform. All rights reserved.
        </footer>
      </main>
    </div>
  );
}