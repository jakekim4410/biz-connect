import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import SellerClient from "./SellerClient";

export default async function SellerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") redirect("/login");
  const sellerId = Number((session.user as any).id);

  // 1. 확정된 미팅 (ACCEPTED)
  const confirmedMeetings = await db.meeting.findMany({
    where: { sellerId, status: "ACCEPTED" },
    include: { timeSlot: true, buyer: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  // 2. 신청 대기 중인 미팅 (PENDING)
  const pendingMeetings = await db.meeting.findMany({
    where: { sellerId, status: "PENDING" },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  // 3. 거절된 미팅 (REJECTED)
  const rejectedMeetings = await db.meeting.findMany({
    where: { sellerId, status: "REJECTED" },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  // 4. 신청 가능한 새로운 슬롯 (OPEN + 내가 신청 안 한 것)
  const availableSlots = await db.timeSlot.findMany({
    where: { status: "OPEN", NOT: { meetings: { some: { sellerId } } } },
    include: { buyer: true },
    orderBy: { startTime: 'asc' }
  });

  return (
    <SellerClient 
      confirmedMeetings={confirmedMeetings} 
      pendingMeetings={pendingMeetings}
      rejectedMeetings={rejectedMeetings}
      availableSlots={availableSlots} 
      sellerId={sellerId} 
    />
  );
}