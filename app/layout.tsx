import "./style.css";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import LogoutButton from "../components/LogoutButton";
import { NextAuthProvider } from "../components/NextAuthProvider";
import { I18nProvider } from "../lib/i18n";
import LocaleSwitcher from "../components/LocaleSwitcher";
import { User, ShieldCheck } from "lucide-react";
import Link from "next/link";
import NavUserInfo from "../components/NavUserInfo"; 

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <html lang="ko">
      <body className="antialiased font-sans bg-[#f4f7fa]">
        <NextAuthProvider>
          <I18nProvider>
            {/* 상단 네비게이션 바 */}
            <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 sticky top-0 z-50 text-slate-900 w-full">
              <div className="max-w-7xl mx-auto px-4 h-full flex justify-between items-center gap-2">

                {/* 왼쪽 영역: 로고 + 배지 (shrink-0으로 로고가 찌그러지지 않게 함) */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0 overflow-hidden">
                  <Link 
                    href={session ? (user.role === "ADMIN" ? "/admin" : user.role === "BUYER" ? "/buyer" : "/seller") : "/"} 
                    className="font-black text-xl tracking-tighter hover:opacity-80 transition-all flex items-center shrink-0"
                  >
                    <span className="text-[#111827]">Biz</span>
                    <span className="text-[#2563eb]">Connect</span>
                  </Link>

                  {session && (
                    <div className="hidden xs:flex items-center shrink-0">
                      {user.role === "ADMIN" && (
                        <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg border border-rose-100 uppercase">Admin</span>
                      )}
                      {user.role === "BUYER" && (
                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase">Buyer</span>
                      )}
                      {user.role === "SELLER" && (
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase">Seller</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 오른쪽 영역: 언어설정 + 유저정보 + 로그아웃 (shrink-0으로 버튼들이 밀리지 않게 함) */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <LocaleSwitcher />

                  {session ? (
                    <>
                      {/* 유저 이름 (모바일에선 숨기고 싶다면 여기에 hidden sm:block 추가 가능) */}
                      <NavUserInfo user={user} />
                      
                      <div className="pl-2 border-l border-slate-200 h-6 flex items-center shrink-0">
                        <LogoutButton />
                      </div>
                    </>
                  ) : (
                    <Link href="/login" className="text-[12px] font-black text-white bg-[#111827] px-4 py-2 rounded-xl hover:bg-blue-600 transition-all shrink-0">
                      Login
                    </Link>
                  )}
                </div>

              </div>
            </nav>

            {/* 메인 콘텐츠 영역 */}
            <main className="min-h-screen">
              {children}
            </main>
          </I18nProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}