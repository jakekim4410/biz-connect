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

  // 1단계: 기본 사용자 정보 및 기만료 미팅 처리를 병렬로 실행
  const [user, companyMaster] = await Promise.all([
    db.user.findUnique({ where: { id: buyerId } }),
    db.user.findFirst({ where: { companyName, isMaster: true } }),
    autoExpirePastMeetings()
  ]);

  if (!user) redirect("/login");

  const masterId = companyMaster?.id || buyerId;

  // 2단계: 나머지 모든 데이터 조회를 병렬로 실행
  const [
    mySlots,
    confirmedMeetings,
    directRequestsRaw,
    allSellers,
    rejectedMeetings,
    pendingMembers,
    approvedMembers,
    rejectedTeamMembers
  ] = await Promise.all([
    db.timeSlot.findMany({
      where: user.isMaster 
        ? { buyer: { companyName: user.companyName } }
        : { buyerId: buyerId },
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
    db.meeting.findMany({
      where: { 
        status: { in: ["ACCEPTED", "CONFIRMED"] },
        ...(user.isMaster ? {
          buyer: { companyName: user.companyName }
        } : {
          OR: [
            { picId: buyerId },
            { timeSlot: { buyerId: buyerId } }
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
    db.user.findMany({
      where: { role: "SELLER", approvalStatus: "APPROVED" },
      include: { onePager: true },
      orderBy: { companyName: 'asc' }
    }),
    db.meeting.findMany({
      where: { 
        status: { in: ["REJECTED", "CANCELLED"] },
        ...(user.isMaster ? {
          buyer: { companyName: user.companyName }
        } : {
          OR: [
            { picId: buyerId },
            { timeSlot: { buyerId: buyerId } }
          ]
        })
      },
      include: { 
        seller: { include: { onePager: true } }, 
        timeSlot: true,
        pic: true 
      },
      orderBy: { createdAt: 'desc' }
    }),
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "PENDING", id: { not: buyerId } }
    }) : Promise.resolve([]),
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "APPROVED" }
    }) : Promise.resolve([]),
    user.isMaster ? db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "REJECTED" }
    }) : Promise.resolve([])
  ]);

  // ✅ 각 제안의 셀러 회사에 속한 모든 멤버 가져오기 (이건 결과에 기반하므로 뒤에 유지)
  const directRequests = await Promise.all(directRequestsRaw.map(async (req) => {
    const companyMembers = await db.user.findMany({
      where: { 
        companyName: req.seller.companyName,
        approvalStatus: "APPROVED"
      },
      include: { onePager: true }
    });
    return {
      ...req,
      seller: { ...req.seller, members: companyMembers }
    };
  }));

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
    />
  );
}