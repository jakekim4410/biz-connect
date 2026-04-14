import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import BuyerClient from "./BuyerClient";
import { autoExpirePastMeetings } from "../api/meetings/expire/action";

export default async function BuyerPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["BUYER", "ADMIN"].includes((session.user as any).role)) {
    redirect("/login");
  }

  const buyerId = Number((session.user as any).id);
  const companyName = (session.user as any).companyName;
  const now = new Date();

  // 1단계: 기본 사용자 정보 및 기만료 미팅 처리를 병렬로 실행
  const [user, companyMaster] = await Promise.all([
    db.user.findUnique({ where: { id: buyerId } }),
    db.user.findFirst({ where: { companyName, isMaster: true } }),
    autoExpirePastMeetings()
  ]);

  if (!user) redirect("/login");

  const masterId = companyMaster?.id || buyerId;

  // 2단계: 핵심 데이터 조회를 병렬로 실행
  const [
    mySlots,
    allMeetingsRaw,
    directRequestsRaw,
    allSellers,
    teamMembersRaw,
    availableSellerSlots,
  ] = await Promise.all([
    // 바이어가 개설한 슬롯
    db.timeSlot.findMany({
      where: user.isMaster
        ? { buyer: { companyName: user.companyName }, slotOwner: "BUYER" }
        : { buyerId: buyerId, slotOwner: "BUYER" },
      include: {
        buyer: true,
        meetings: {
          include: {
            seller: { include: { onePager: true } },
            timeSlot: true,
            pic: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    }),
    // 바이어의 모든 확정/거절 미팅
    db.meeting.findMany({
      where: {
        status: { in: ["ACCEPTED", "CONFIRMED", "REJECTED", "CANCELLED"] },
        ...(user.isMaster ? {
          buyer: { companyName: user.companyName }
        } : {
          OR: [
            { picId: buyerId },
            { timeSlot: { buyerId: buyerId } },
            { buyerId: buyerId }
          ]
        })
      },
      include: {
        seller: { include: { onePager: true } },
        timeSlot: true,
        pic: true
      },
      orderBy: { timeSlot: { startTime: 'asc' } }
    }),
    // 바이어에게 온 다이렉트 요청 (셀러가 보낸 것)
    db.meeting.findMany({
      where: {
        buyerId: masterId,
        meetingType: "DIRECT_REQUEST",
        status: "PENDING",
        ...(user.isMaster ? {} : { picId: buyerId })
      },
      include: {
        pic: true,
        seller: { include: { onePager: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // 셀러 디렉토리
    db.user.findMany({
      where: { role: "SELLER", approvalStatus: "APPROVED" },
      include: { onePager: true },
      orderBy: { companyName: 'asc' }
    }),
    // 팀원 목록
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, id: { not: buyerId }, role: "BUYER" }
    }) : Promise.resolve([]),
    // 셀러가 개설한 슬롯 (바이어가 신청 가능)
    db.timeSlot.findMany({
      where: {
        slotOwner: "SELLER",
        status: "OPEN",
        startTime: { gt: now },
        NOT: { meetings: { some: { buyerId } } }
      },
      include: {
        seller: { include: { onePager: true } },
        meetings: { include: { buyer: true } }
      },
      orderBy: { startTime: 'asc' }
    }),
  ]);

  // ✅ 데이터 가공 및 분류
  const confirmedMeetings = allMeetingsRaw.filter(m => ["ACCEPTED", "CONFIRMED"].includes(m.status));
  const rejectedMeetings = allMeetingsRaw.filter(m => ["REJECTED", "CANCELLED"].includes(m.status));

  const pendingMembers = teamMembersRaw.filter(m => m.approvalStatus === "PENDING");
  const approvedMembers = teamMembersRaw.filter(m => m.approvalStatus === "APPROVED");
  const rejectedTeamMembers = teamMembersRaw.filter(m => m.approvalStatus === "REJECTED");

  // ✅ [N+1 문제 해결] 각 제안의 셀러 회사 멤버들을 하나의 쿼리로 일괄 조회
  const sellerCompanyNames = Array.from(new Set(directRequestsRaw.map(req => req.seller.companyName)));

  const allSellerMembers = sellerCompanyNames.length > 0 ? await db.user.findMany({
    where: {
      companyName: { in: sellerCompanyNames },
      approvalStatus: "APPROVED",
      role: "SELLER"
    },
    include: { onePager: true }
  }) : [];

  // ✅ 제안 정보와 멤버 정보 매핑
  const directRequests = directRequestsRaw.map((req) => {
    const companyMembers = allSellerMembers.filter(m => m.companyName === req.seller.companyName);
    return {
      ...req,
      seller: { ...req.seller, members: companyMembers }
    };
  });

  return (
    <BuyerClient
      user={user}
      mySlots={mySlots}
      confirmedMeetings={confirmedMeetings}
      directRequests={directRequests}
      rejectedMeetings={rejectedMeetings}
      allSellers={allSellers}
      buyerId={buyerId}
      pendingMembers={pendingMembers}
      approvedMembers={approvedMembers}
      rejectedTeamMembers={rejectedTeamMembers}
      availableSellerSlots={availableSellerSlots}
    />
  );
}