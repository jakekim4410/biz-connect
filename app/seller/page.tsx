import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import SellerClient from "./SellerClient";
import { autoExpirePastMeetings } from "../api/meetings/expire/action";

export default async function SellerPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["SELLER", "ADMIN"].includes((session.user as any).role)) redirect("/login");
  const sellerId = Number((session.user as any).id);
  const now = new Date();

  // 1단계: 기본 사용자 정보 및 기만료 미팅 처리를 병렬로 실행
  const [user] = await Promise.all([
    db.user.findUnique({
      where: { id: sellerId },
      include: { onePager: true }
    }),
    autoExpirePastMeetings()
  ]);

  if (!user) redirect("/login");

  // 2단계: 나머지 모든 데이터 조회를 병렬로 실행
  const [
    confirmedMeetings,
    pendingMeetings,
    rejectedMeetings,
    availableSlots,
    pendingMembers,
    approvedMembers,
    rejectedTeamMembers,
    companyOnePager
  ] = await Promise.all([
    db.meeting.findMany({
      where: { 
        status: { in: ["ACCEPTED", "CONFIRMED"] },
        ...(user.isMaster ? {
          seller: { companyName: user.companyName }
        } : {
          sellerId: sellerId
        })
      },
      include: { timeSlot: true, buyer: true, pic: true },
      orderBy: { timeSlot: { startTime: 'asc' } }
    }),
    db.meeting.findMany({
      where: { 
        status: "PENDING",
        ...(user.isMaster ? {
          seller: { companyName: user.companyName }
        } : {
          sellerId: sellerId
        })
      },
      include: { timeSlot: true, buyer: true, pic: true },
      orderBy: { createdAt: 'desc' }
    }),
    db.meeting.findMany({
      where: { 
        status: { in: ["REJECTED", "CANCELLED"] },
        ...(user.isMaster ? {
          seller: { companyName: user.companyName }
        } : {
          sellerId: sellerId
        })
      },
      include: { timeSlot: true, buyer: true, pic: true },
      orderBy: { createdAt: 'desc' }
    }),
    db.timeSlot.findMany({
      where: { 
        status: "OPEN", 
        startTime: { gt: now },
        NOT: { meetings: { some: { sellerId } } } 
      },
      include: { 
        buyer: true,
        meetings: { include: { seller: true } }
      },
      orderBy: { startTime: 'asc' }
    }),
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "PENDING", id: { not: sellerId } }
    }) : Promise.resolve([]),
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "APPROVED" }
    }) : Promise.resolve([]),
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "REJECTED" }
    }) : Promise.resolve([]),
    db.onePager.findFirst({
      where: { 
        user: { companyName: user.companyName },
        OR: [
          { primaryTech: { not: "" } },
          { solutionSummary: { not: "" } },
          { industrySector: { not: "" } },
          { ceoName: { not: "" } },
          { productType: { not: "" } }
        ]
      },
      orderBy: { updatedAt: "desc" },
    })
  ]);

  const companyHasOnePager = !!companyOnePager;

  return (
    <SellerClient 
      user={user}
      sellerId={sellerId}
      confirmedMeetings={confirmedMeetings} 
      pendingMeetings={pendingMeetings}
      rejectedMeetings={rejectedMeetings}
      availableSlots={availableSlots} 
      hasOnePager={companyHasOnePager}
      pendingMembers={pendingMembers}
      approvedMembers={approvedMembers}
      rejectedTeamMembers={rejectedTeamMembers}
    />
  );
}