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

  // 지난 일정 미팅 자동 폐기 (페이지 로드 시마다 실행)
  await autoExpirePastMeetings();

  const user = await db.user.findUnique({
    where: { id: sellerId },
    include: { onePager: true }
  });

  if (!user) redirect("/login");

  const confirmedMeetings = await db.meeting.findMany({
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
  });

  const pendingMeetings = await db.meeting.findMany({
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
  });

  const rejectedMeetings = await db.meeting.findMany({
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
  let rejectedTeamMembers: any[] = [];

  if (user.isMaster) {
    pendingMembers = await db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "PENDING", id: { not: sellerId } }
    });
    approvedMembers = await db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "APPROVED" }
    });
    rejectedTeamMembers = await db.user.findMany({
      where: { companyName: user.companyName, approvalStatus: "REJECTED" }
    });
  }

  // 같은 회사의 누구라도 실질적인 내용이 담긴 원페이저를 작성했으면 배너를 숨긴다
  const companyOnePager = await db.onePager.findFirst({
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
  });
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