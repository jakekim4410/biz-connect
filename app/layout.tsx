// app/layout.tsx (또는 RootLayout 파일)
import "./style.css"; 
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import LogoutButton from "../components/LogoutButton";
import { NextAuthProvider } from "../components/NextAuthProvider";
import { User, ShieldCheck } from "lucide-react"; // Settings 아이콘 삭제됨
import Link from "next/link";

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
          <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 sticky top-0 z-50 text-slate-900">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex justify-between items-center">
              
              <div className="flex items-center gap-4">
                <Link href="/" className="font-black text-xl md:text-2xl tracking-tighter hover:opacity-80 transition-all flex items-center shrink-0">
                  <span className="text-[#111827]">Biz</span>
                  <span className="text-[#2563eb]">Connect</span>
                </Link>
                
                {session && (
                  <div className="flex items-center">
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

              <div className="flex items-center gap-3 md:gap-5">
                {session ? (
                  <>
                    {/* 회사명 + 이름 노출 로직 */}
                    <div className="hidden sm:flex flex-col items-end leading-none">
                      <span className="text-xs font-black text-slate-800">
                        {/* 이전 답변에서 수정한 lib/auth.ts 덕분에 이제 companyName이 정상 출력됩니다 */}
                        <span className="text-indigo-600 mr-1">[{user.companyName}]</span>
                        {user.name}님
                      </span>
                    </div>

                    {/* 톱니바퀴 (프로필 수정) 버튼 삭제됨 */}

                    {/* 이름과 로그아웃 버튼 사이의 구분선 간격(pl-3 md:pl-4)을 조금 넓혀서 자연스럽게 조정했습니다 */}
                    <div className="pl-3 md:pl-4 border-l border-slate-200">
                      <LogoutButton />
                    </div>
                  </>
                ) : (
                  <Link href="/login" className="text-[12px] font-black text-white bg-[#111827] px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg">
                    로그인
                  </Link>
                )}
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