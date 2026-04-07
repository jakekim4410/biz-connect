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

  // 지난 일정 미팅 자동 폐기 (페이지 로드 시마다 실행)
  await autoExpirePastMeetings();

  const user = await db.user.findUnique({
    where: { id: buyerId }
  });

  if (!user) {
    redirect("/login");
  }

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

  // ✅ 회사의 마스터 유저 ID 찾기 (모든 회람의 기준)
  const companyMaster = await db.user.findFirst({
    where: { companyName: user.companyName, isMaster: true }
  });
  const masterId = companyMaster?.id || buyerId;

  // ✅ 확정된 미동 조회 (마스터 전체 회람 + 내 담당 미팅)
  const confirmedMeetings = await db.meeting.findMany({
    where: { 
      status: { in: ["ACCEPTED", "CONFIRMED"] },
      OR: [
        { buyerId: masterId }, // 회사 마스터 ID가 바이어인 경우 (기본)
        { picId: buyerId }      // 현재 유저가 담당자(PIC)로 지정된 경우
      ]
    },
    include: { 
      seller: { include: { onePager: true } }, 
      timeSlot: true 
    },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  const directRequestsRaw = await db.meeting.findMany({
    where: {
      buyerId: masterId,
      meetingType: "DIRECT_REQUEST",
      status: "PENDING",
      // 마스터는 전체 관람, 일반 멤버는 본인에게 배정된 것만 관람
      ...(user.isMaster ? {} : { picId: buyerId })
    },
    include: {
      pic: true,
      seller: { 
        include: { 
          onePager: true 
        } 
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // ✅ 각 제안의 셀러 회사에 속한 모든 멤버(승인된 유저) 가져오기
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
      seller: {
        ...req.seller,
        members: companyMembers
      }
    };
  }));

  const allSellers = await db.user.findMany({
    where: { 
      role: "SELLER", 
      approvalStatus: "APPROVED" 
    },
    include: { onePager: true },
    orderBy: { companyName: 'asc' }
  });

  // ✅ 셀러 페이지와 동일하게 팀 관련 쿼리 추가
  let pendingMembers: any[] = [];
  let approvedMembers: any[] = [];
  let rejectedTeamMembers: any[] = [];

  if (user.isMaster) {
    pendingMembers = await db.user.findMany({
      where: { 
        companyName: user.companyName, 
        approvalStatus: "PENDING", 
        id: { not: buyerId } 
      }
    });
    approvedMembers = await db.user.findMany({
      where: { 
        companyName: user.companyName, 
        approvalStatus: "APPROVED" 
      }
    });
    rejectedTeamMembers = await db.user.findMany({
      where: { 
        companyName: user.companyName, 
        approvalStatus: "REJECTED" 
      }
    });
  }

  return (
    <BuyerClient 
      user={user} 
      mySlots={mySlots} 
      confirmedMeetings={confirmedMeetings} 
      directRequests={directRequests}
      allSellers={allSellers}
      buyerId={buyerId}
      // ✅ BuyerClient에 팀 관련 props 전달
      pendingMembers={pendingMembers}
      approvedMembers={approvedMembers}
      rejectedTeamMembers={rejectedTeamMembers}
    />
  );
}