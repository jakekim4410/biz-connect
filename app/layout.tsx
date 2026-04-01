import "./style.css";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import LogoutButton from "../components/LogoutButton";
import { NextAuthProvider } from "../components/NextAuthProvider";
import { I18nProvider } from "../lib/i18n";
import LocaleSwitcher from "../components/LocaleSwitcher";
import { User, ShieldCheck } from "lucide-react";
import Link from "next/link";
import NavUserInfo from "../components/NavUserInfo"; // 새로 만든 컴포넌트 임포트

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
            <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 sticky top-0 z-50 text-slate-900">
              <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex justify-between items-center">

                <div className="flex items-center gap-4">
                  <Link href="/" className="font-black text-xl md:text-2xl tracking-tighter hover:opacity-80 transition-all flex items-center shrink-0">
                    <span className="text-[#111827]">Biz</span>
                    <span className="text-[#2563eb]">Connect</span>
                  </Link>

                  {session && (
                    <div className="flex items-center ml-2">
                      {user.role === "ADMIN" && (
                        <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg uppercase border border-rose-100 flex items-center gap-1 shadow-sm">
                          <ShieldCheck size={12}/> Admin
                        </span>
                      )}
                      {user.role === "BUYER" && (
                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase border border-indigo-100 flex items-center gap-1 shadow-sm">
                          <User size={12}/> Buyer
                        </span>
                      )}
                      {user.role === "SELLER" && (
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase border border-emerald-100 flex items-center gap-1 shadow-sm">
                          <User size={12}/> Seller
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <LocaleSwitcher />

                  {session ? (
                    <>
                      {/* 이 부분이 다국어에 대응되는 사용자 정보창입니다 */}
                      <NavUserInfo user={user} />
                      <div className="pl-3 md:pl-4 border-l border-slate-200 h-8 flex items-center">
                        <LogoutButton />
                      </div>
                    </>
                  ) : (
                    <Link href="/login" className="text-[12px] font-black text-white bg-[#111827] px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg">
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </nav>

            <main className="min-h-screen">
              {children}
            </main>
          </I18nProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}