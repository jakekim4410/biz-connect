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

  // ✅ 슬롯 조회 (마스터는 전체, 멤버는 본인 것만)
  const mySlots = await db.timeSlot.findMany({
    where: user.isMaster 
      ? { buyer: { companyName: user.companyName } }
      : { buyerId: buyerId },
    include: { 
      buyer: true, // 생성자 정보 표시용
      meetings: { 
        include: { 
          seller: { include: { onePager: true } }, 
          timeSlot: true,
          pic: true
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

  // ✅ 확정된 미동 조회 (마스터: 회사 전체 / 멤버: 본인 담당 또는 본인 슬롯 건)
  const confirmedMeetings = await db.meeting.findMany({
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

  // ✅ 거절된 미팅 내역 조회 (마스터: 회사 전체 / 멤버: 본인 담당 거절 건)
  const rejectedMeetings = await db.meeting.findMany({
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
      rejectedMeetings={rejectedMeetings}
      allSellers={allSellers}
      buyerId={buyerId}
      // ✅ BuyerClient에 팀 관련 props 전달
      pendingMembers={pendingMembers}
      approvedMembers={approvedMembers}
      rejectedTeamMembers={rejectedTeamMembers}
    />
  );
}