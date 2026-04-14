import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import SellerClient from "./SellerClient";
import { autoExpirePastMeetings } from "../api/meetings/expire/action";

export default async function SellerPage() {
  const session = await getServerSession(authOptions);
  
  // 세션이 없거나 권한이 없는 경우 즉시 로그인 페이지로 리다이렉트
  if (!session || !session.user || !["SELLER", "ADMIN"].includes((session.user as any).role)) {
    redirect("/login");
  }

  const sellerId = Number((session.user as any).id);
  if (isNaN(sellerId)) redirect("/login");

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

  // 2단계: 핵심 데이터 조회를 병렬로 실행
  const [
    allMeetingsRaw,
    availableSlots,
    mySellerSlotsRaw,
    teamMembersRaw,
    companyOnePager,
    allBuyers,
    sellerDirectRequestsRaw,
  ] = await Promise.all([
    // 셀러로서 연관된 미팅 (바이어 슬롯에 신청한 것 + 셀러 슬롯 확정 미팅)
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
    // 바이어가 개설한 슬롯 (셀러가 탐색/신청)
    db.timeSlot.findMany({
      where: {
        slotOwner: "BUYER",
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
    // 셀러가 개설한 슬롯 (내 슬롯 관리)
    db.timeSlot.findMany({
      where: user.isMaster
        ? { seller: { companyName: user.companyName }, slotOwner: "SELLER" }
        : { sellerId: sellerId, slotOwner: "SELLER" },
      include: {
        seller: true,
        meetings: {
          include: {
            buyer: true,
            timeSlot: true,
            pic: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    }),
    // 팀원 목록
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, id: { not: sellerId }, role: "SELLER" }
    }) : Promise.resolve([]),
    // 원페이저
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
    }),
    Promise.resolve([]),
    // 셀러에게 온 다이렉트 제안 (바이어가 셀러에게 보낸 DIRECT_REQUEST)
    db.meeting.findMany({
      where: {
        ...(user.isMaster ? {
          seller: { companyName: user.companyName }
        } : {
          sellerId: sellerId
        }),
        meetingType: "DIRECT_REQUEST",
        status: "PENDING",
      },
      include: {
        buyer: true,
        pic: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
  ]);

  // ✅ 데이터 가공 및 분류
  const confirmedMeetings = allMeetingsRaw
    .filter(m => ["ACCEPTED", "CONFIRMED"].includes(m.status))
    .sort((a, b) => {
      const timeA = a.timeSlot?.startTime ? new Date(a.timeSlot.startTime).getTime() : 0;
      const timeB = b.timeSlot?.startTime ? new Date(b.timeSlot.startTime).getTime() : 0;
      return timeA - timeB;
    });
  const pendingMeetings = allMeetingsRaw.filter(m => m.status === "PENDING" && m.meetingType !== "DIRECT_REQUEST");
  const rejectedMeetings = allMeetingsRaw.filter(m => ["REJECTED", "CANCELLED"].includes(m.status));

  const pendingMembers = teamMembersRaw.filter(m => m.approvalStatus === "PENDING");
  const approvedMembers = teamMembersRaw.filter(m => m.approvalStatus === "APPROVED");
  const rejectedTeamMembers = teamMembersRaw.filter(m => m.approvalStatus === "REJECTED");

  const companyHasOnePager = !!companyOnePager;

  const uniqueBuyers: any[] = [];

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
      mySellerSlots={mySellerSlotsRaw}
      allBuyers={uniqueBuyers}
      sellerDirectRequests={sellerDirectRequestsRaw}
    />
  );
}