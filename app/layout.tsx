import "./globals.css";
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
      <body className="antialiased">
        <nav className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 font-sans text-slate-900">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            {/* 왼쪽 메뉴 */}
            <div className="flex gap-6 font-bold text-slate-600 items-center">
              <a href="/" className="text-blue-600 font-black text-xl mr-2">
                BizConnect
              </a>
              {session && (session.user as any).role === "BUYER" && (
                <a href="/buyer" className="hover:text-blue-600 transition">바이어대시보드</a>
              )}
              {session && (session.user as any).role === "SELLER" && (
                <a href="/seller" className="hover:text-blue-600 transition">셀러대시보드</a>
              )}
            </div>

            {/* 오른쪽 사용자 정보 및 버튼 */}
            <div className="flex items-center">
              {session ? (
                <div className="flex items-center gap-4 text-sm font-sans">
                  <span className="font-bold text-slate-700 underline underline-offset-4 decoration-blue-200">
                    {session.user?.name}님
                  </span>
                  <a
                    href="/profile"
                    className="text-slate-500 hover:text-blue-600 font-medium transition"
                  >
                    정보수정
                  </a>
                  <LogoutButton />
                </div>
              ) : (
                <a
                  href="/login"
                  className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition"
                >
                  로그인
                </a>
              )}
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}