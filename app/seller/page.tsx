import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import SellerClient from "./SellerClient";

export default async function SellerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") redirect("/login");
  const sellerId = Number((session.user as any).id);

  // 1. 현재 유저 상세 정보 (isMaster, approvalStatus 확인용)
  const user = await db.user.findUnique({
    where: { id: sellerId },
    include: { onePager: true }
  });

  if (!user) redirect("/login");

  // 2. 확정된 미팅 (ACCEPTED)
  const confirmedMeetings = await db.meeting.findMany({
    where: { sellerId, status: "ACCEPTED" },
    include: { timeSlot: true, buyer: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  // 3. 신청 대기 중인 미팅 (PENDING)
  const pendingMeetings = await db.meeting.findMany({
    where: { sellerId, status: "PENDING" },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  // 4. 거절된 미팅 (REJECTED)
  const rejectedMeetings = await db.meeting.findMany({
    where: { sellerId, status: "REJECTED" },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  // 5. 신청 가능한 새로운 슬롯 (OPEN + 내가 신청 안 한 것)
  const availableSlots = await db.timeSlot.findMany({
    where: { status: "OPEN", NOT: { meetings: { some: { sellerId } } } },
    include: { buyer: true },
    orderBy: { startTime: 'asc' }
  });

  // 6. [마스터 전용] 멤버 데이터 조회
  let pendingMembers: any[] = [];
  let approvedMembers: any[] = [];

  if (user.isMaster) {
    pendingMembers = await db.user.findMany({
      where: { 
        companyName: user.companyName, 
        approvalStatus: "PENDING",
        id: { not: sellerId } 
      }
    });
    approvedMembers = await db.user.findMany({
      where: { 
        companyName: user.companyName, 
        approvalStatus: "APPROVED" 
      }
    });
  }

  return (
    <SellerClient 
      user={user}
      sellerId={sellerId}
      confirmedMeetings={confirmedMeetings} 
      pendingMeetings={pendingMeetings}
      rejectedMeetings={rejectedMeetings}
      availableSlots={availableSlots} 
      hasOnePager={!!user.onePager}
      pendingMembers={pendingMembers}
      approvedMembers={approvedMembers}
    />
  );
}