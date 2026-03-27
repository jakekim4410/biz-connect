import { getServerSession } from "next-auth/next"; // 서버 세션용 함수
import { authOptions } from "@/lib/auth"; // auth 대신 authOptions 불러오기
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  // Next-Auth v4 방식의 세션 체크
  const session = await getServerSession(authOptions);

  // 1. 보안 접근 제어: 세션이 없거나 role이 ADMIN이 아니면 메인으로 튕김
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/");
  }

  // 2. 데이터 Fetching
  const [userCount, slotCount, activeMatches, pendingMatches] = await Promise.all([
    db.user.count(),
    db.timeSlot.count(),
    db.meeting.count({ where: { status: "ACCEPTED" } }),
    db.meeting.count({ where: { status: "PENDING" } }),
  ]);

  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  const timeSlots = await db.timeSlot.findMany({
    include: { buyer: true },
    orderBy: { startTime: "desc" },
  });
  const meetings = await db.meeting.findMany({
    include: { buyer: true, seller: true, timeSlot: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#F8F9FD] relative overflow-hidden font-pretendard">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-blue-100/30 blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-100/30 blur-[120px]" />
      </div>

      <div className="relative z-10 p-6 lg:p-12 max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Admin Console</h1>
          <p className="text-slate-500 mt-2 font-medium">비즈커넥트 통합 관리 시스템</p>
        </header>

        <AdminClient 
          stats={{ userCount, slotCount, activeMatches, pendingMatches }}
          users={users} 
          timeSlots={timeSlots} 
          meetings={meetings} 
        />
      </div>
    </div>
  );
}