// app/buyer/page.tsx
import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import BuyerClient from "./BuyerClient";

export default async function BuyerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") redirect("/login");
  const buyerId = Number((session.user as any).id);

  // 1. 내가 생성한 타임슬롯 및 신청 현황 (셀러 원페이저 포함)
  const mySlots = await db.timeSlot.findMany({
    where: { buyerId },
    include: { 
      meetings: { 
        include: { 
          seller: { include: { onePager: true } }, 
          timeSlot: true 
        } 
      } 
    },
    orderBy: { startTime: 'asc' }
  });

  // 2. 확정된 미팅 일정 (셀러 원페이저 포함)
  const confirmedMeetings = await db.meeting.findMany({
    where: { buyerId, status: "ACCEPTED" },
    include: { 
      seller: { include: { onePager: true } }, 
      timeSlot: true 
    },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  // 3. 플랫폼 내 모든 셀러 리스트 (탐색 대시보드용)
  const allSellers = await db.user.findMany({
    where: { role: "SELLER" },
    include: { onePager: true },
    orderBy: { companyName: 'asc' }
  });

  return (
    <BuyerClient 
      mySlots={mySlots} 
      confirmedMeetings={confirmedMeetings} 
      allSellers={allSellers}
      buyerId={buyerId} 
    />
  );
}