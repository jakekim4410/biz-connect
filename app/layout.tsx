import "./style.css"; 
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import LogoutButton from "../components/LogoutButton";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ko">
      {/* font-sans를 통해 style.css에 정의된 Pretendard 서체를 기본으로 사용합니다 */}
      <body className="antialiased font-sans bg-[#f4f7fa]">
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-3 md:p-4 sticky top-0 z-50 text-slate-900">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0">
            
            {/* --- 로고 영역 (모바일에서 좌측 상단 고정) --- */}
            <div className="flex justify-between items-center w-full md:w-auto">
              <a href="/" className="text-blue-600 font-black text-xl md:text-2xl tracking-tighter hover:opacity-80 transition-all">
                BizConnect
              </a>
              
              {/* 모바일 대시보드 숏컷 태그 (모바일에서만 보임) */}
              <div className="flex md:hidden items-center gap-2">
                {session && (session.user as any).role === "BUYER" && (
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">BUYER</span>
                )}
                {session && (session.user as any).role === "SELLER" && (
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">SELLER</span>
                )}
              </div>
            </div>

            {/* --- 메뉴 및 사용자 정보 영역 (모바일에서는 로고 아래 배치되어 겹침 방지) --- */}
            <div className="flex justify-between md:justify-end items-center w-full md:w-auto gap-4 md:gap-8 border-t md:border-none pt-2 md:pt-0">
              
              {/* 대시보드 링크 */}
              <div className="flex gap-4 items-center">
                {session && (session.user as any).role === "BUYER" && (
                  <a href="/buyer" className="text-xs md:text-sm font-bold text-slate-500 hover:text-blue-600 transition-all">바이어 대시보드</a>
                )}
                {session && (session.user as any).role === "SELLER" && (
                  <a href="/seller" className="text-xs md:text-sm font-bold text-slate-500 hover:text-blue-600 transition-all">셀러 대시보드</a>
                )}
              </div>

              {/* 유저 로그인 정보 및 로그아웃 */}
              <div className="flex items-center gap-3">
                {session ? (
                  <div className="flex items-center gap-3 text-[11px] md:text-sm">
                    <span className="font-bold text-slate-700 truncate max-w-[80px] md:max-w-none">
                      <span className="text-blue-600 hidden md:inline text-[8px] mr-1">●</span>
                      {session.user?.name}님
                    </span>
                    <LogoutButton />
                  </div>
                ) : (
                  <a href="/login" className="text-xs md:text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                    로그인
                  </a>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* 메인 컨텐츠 영역 */}
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}