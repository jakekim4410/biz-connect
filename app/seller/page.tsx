import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import SellerClient from "./SellerClient";

export default async function SellerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") redirect("/login");
  const sellerId = Number((session.user as any).id);

  const user = await db.user.findUnique({
    where: { id: sellerId },
    include: { onePager: true }
  });

  if (!user) redirect("/login");

  // 확정된 미팅
  const confirmedMeetings = await db.meeting.findMany({
    where: { 
      sellerId, 
      status: { in: ["ACCEPTED", "CONFIRMED"] } 
    },
    include: { timeSlot: true, buyer: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  // 신청 대기 중인 미팅 (PENDING)
  const pendingMeetings = await db.meeting.findMany({
    where: { sellerId, status: "PENDING" },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  // 거절/취소된 미팅
  const rejectedMeetings = await db.meeting.findMany({
    where: { 
      sellerId, 
      status: { in: ["REJECTED", "CANCELLED"] } 
    },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  /**
   * [핵심 수정] 신청 가능한 새로운 슬롯 조회 시,
   * 이미 해당 슬롯에 신청한 다른 유저들의 정보를 포함(include)하여 가져옵니다.
   * 클라이언트에서 내 소속(companyName)과 비교하기 위함입니다.
   */
  const availableSlots = await db.timeSlot.findMany({
    where: { status: "OPEN", NOT: { meetings: { some: { sellerId } } } },
    include: { 
      buyer: true,
      meetings: {
        include: { seller: true } // 해당 슬롯에 신청한 다른 셀러 정보 포함
      }
    },
    orderBy: { startTime: 'asc' }
  });

  // [마스터 전용] 멤버 데이터 조회
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