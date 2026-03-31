import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/");
  }

  // 매칭 상태 카운트 구하기
  const [userCount, slotCount, activeMatches, pendingMatches] = await Promise.all([
    db.user.count(),
    db.timeSlot.count(),
    db.meeting.count({ where: { status: { in: ["ACCEPTED", "CONFIRMED"] } } }),
    db.meeting.count({ where: { status: "PENDING" } }),
  ]);

  // 유저 정보 가져올 때 onePager 정보 포함
  const users = await db.user.findMany({ 
    include: { onePager: true },
    orderBy: { createdAt: "desc" } 
  });

  const timeSlots = await db.timeSlot.findMany({
    include: { buyer: true },
    orderBy: { startTime: "desc" },
  });

  // 미팅 정보 가져올 때 상대 셀러의 onePager 정보도 포함 (엑셀 출력용)
  const meetings = await db.meeting.findMany({
    include: { 
      buyer: true, 
      seller: { include: { onePager: true } }, 
      timeSlot: true 
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f7fa] font-pretendard text-[#121926]">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[150%] md:w-[45%] h-[40%] bg-indigo-300/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[100%] md:w-[40%] h-[50%] bg-blue-300/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12 text-center md:text-left">
          <div className="inline-block bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase mb-3 shadow-sm border border-indigo-200">
            System Administrator
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Admin Console
          </h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base font-bold">비즈커넥트 마스터 통합 관리 시스템</p>
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