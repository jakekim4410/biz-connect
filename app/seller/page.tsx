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

  const confirmedMeetings = await db.meeting.findMany({
    where: { sellerId, status: { in: ["ACCEPTED", "CONFIRMED"] } },
    include: { timeSlot: true, buyer: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  const pendingMeetings = await db.meeting.findMany({
    where: { sellerId, status: "PENDING" },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  const rejectedMeetings = await db.meeting.findMany({
    where: { sellerId, status: { in: ["REJECTED", "CANCELLED"] } },
    include: { timeSlot: true, buyer: true },
    orderBy: { createdAt: 'desc' }
  });

  const availableSlots = await db.timeSlot.findMany({
    where: { status: "OPEN", NOT: { meetings: { some: { sellerId } } } },
    include: { 
      buyer: true,
      meetings: { include: { seller: true } }
    },
    orderBy: { startTime: 'asc' }
  });

  let pendingMembers: any[] = [];
  let approvedMembers: any[] = [];
  let rejectedTeamMembers: any[] = []; // 👇 추가됨

  if (user.isMaster) {
    pendingMembers = await db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "PENDING", id: { not: sellerId } }
    });
    approvedMembers = await db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "APPROVED" }
    });
    // 👇 마스터일 때 거절된 맴버 리스트 가져오기
    rejectedTeamMembers = await db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "REJECTED" }
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
      rejectedTeamMembers={rejectedTeamMembers} // 👇 클라이언트로 전달
    />
  );
}