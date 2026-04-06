import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import BuyerClient from "./BuyerClient";

export default async function BuyerPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== "BUYER") {
    redirect("/login");
  }

  const buyerId = Number((session.user as any).id);

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

  const confirmedMeetings = await db.meeting.findMany({
    where: { 
      buyerId, 
      status: { in: ["ACCEPTED", "CONFIRMED"] } 
    },
    include: { 
      seller: { include: { onePager: true } }, 
      timeSlot: true 
    },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

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
      allSellers={allSellers}
      buyerId={buyerId}
      // ✅ BuyerClient에 팀 관련 props 전달
      pendingMembers={pendingMembers}
      approvedMembers={approvedMembers}
      rejectedTeamMembers={rejectedTeamMembers}
    />
  );
}