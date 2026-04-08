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

  // 1단계: 기본 사용자 정보 및 기만료 미팅 처리를 병렬로 실행 (속도 향상)
  const [user] = await Promise.all([
    db.user.findUnique({
      where: { id: sellerId },
      include: { onePager: true }
    }),
    autoExpirePastMeetings()
  ]);

  if (!user) redirect("/login");

  // 2단계: 핵심 데이터 조회를 병렬로 실행 (커넥션 풀 효율적 사용)
  const [
    allMeetingsRaw,
    availableSlots,
    teamMembersRaw,
    companyOnePager
  ] = await Promise.all([
    db.meeting.findMany({
      where: { 
        status: { in: ["ACCEPTED", "CONFIRMED", "PENDING", "REJECTED", "CANCELLED"] },
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
      where: { companyName: user.companyName, id: { not: sellerId }, role: "SELLER" }
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

  // ✅ 데이터 가공 및 분류 (메모리 내 처리)
  const confirmedMeetings = allMeetingsRaw
    .filter(m => ["ACCEPTED", "CONFIRMED"].includes(m.status))
    .sort((a, b) => {
      const timeA = a.timeSlot?.startTime ? new Date(a.timeSlot.startTime).getTime() : 0;
      const timeB = b.timeSlot?.startTime ? new Date(b.timeSlot.startTime).getTime() : 0;
      return timeA - timeB;
    });
  const pendingMeetings = allMeetingsRaw.filter(m => m.status === "PENDING");
  const rejectedMeetings = allMeetingsRaw.filter(m => ["REJECTED", "CANCELLED"].includes(m.status));

  const pendingMembers = teamMembersRaw.filter(m => m.approvalStatus === "PENDING");
  const approvedMembers = teamMembersRaw.filter(m => m.approvalStatus === "APPROVED");
  const rejectedTeamMembers = teamMembersRaw.filter(m => m.approvalStatus === "REJECTED");

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