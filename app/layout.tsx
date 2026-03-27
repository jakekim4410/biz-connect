import "./style.css"; 
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import LogoutButton from "../components/LogoutButton";
import { NextAuthProvider } from "../components/NextAuthProvider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ko">
      <body className="antialiased font-sans bg-[#f4f7fa]">
        <NextAuthProvider>
          {/* 🔹 상단 헤더: 모든 페이지 공통 적용 */}
          <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 sticky top-0 z-50 text-slate-900">
            <div className="max-w-6xl mx-auto px-4 h-full flex justify-between items-center">
              
              {/* 로고 및 뱃지 영역 */}
              <div className="flex items-center gap-2 md:gap-3">
                <a href="/" className="font-black text-xl md:text-2xl tracking-tighter hover:opacity-80 transition-all flex items-center shrink-0">
                  <span className="text-[#111827]">Biz</span>
                  <span className="text-[#2563eb]">Connect</span>
                </a>
                
                {/* 🔹 모바일/PC 모두 보이는 뱃지 (hidden 제거) */}
                {session && (session.user as any).role === "BUYER" && (
                  <span className="text-[8px] md:text-[10px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md uppercase border border-blue-100 shrink-0">Buyer</span>
                )}
                {session && (session.user as any).role === "SELLER" && (
                  <span className="text-[8px] md:text-[10px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md uppercase border border-emerald-100 shrink-0">Seller</span>
                )}
              </div>

              {/* 메뉴 및 사용자 정보 */}
              <div className="flex items-center gap-3 md:gap-6">
                {/* 대시보드 링크 (모바일에서는 아이콘이나 텍스트 크기 조절 권장, 여기서는 텍스트 유지) */}
                {session && (
                  <div className="hidden xs:flex gap-3">
                    {(session.user as any).role === "BUYER" ? (
                      <a href="/buyer" className="text-[10px] md:text-sm font-bold text-slate-500 hover:text-blue-600">바이어 대시보드</a>
                    ) : (
                      <a href="/seller" className="text-[10px] md:text-sm font-bold text-slate-500 hover:text-blue-600">셀러 대시보드</a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {session ? (
                    <div className="flex items-center gap-2 text-[11px] md:text-sm">
                      <span className="font-bold text-slate-700 hidden sm:inline">
                        {session.user?.name}님
                      </span>
                      <LogoutButton />
                    </div>
                  ) : (
                    <a href="/login" className="text-[11px] md:text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                      로그인
                    </a>
                  )}
                </div>
              </div>
            </div>
          </nav>

          <main className="min-h-screen">
            {children}
          </main>
        </NextAuthProvider>
      </body>
    </html>
  );
}