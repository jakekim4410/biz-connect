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
          seller: { 
            include: { 
              onePager: true 
            } 
          }, 
          timeSlot: true 
        } 
      } 
    },
    orderBy: { 
      startTime: 'asc' 
    }
  });

  /**
   * [핵심 수정] 확정된 미팅 일정 조회
   * - 기존: status: "ACCEPTED"
   * - 변경: status: { in: ["ACCEPTED", "CONFIRMED"] }
   * => 승인(ACCEPTED)된 것과 최종 확정(CONFIRMED)된 미팅 모두 불러옵니다.
   */
  const confirmedMeetings = await db.meeting.findMany({
    where: { 
      buyerId, 
      status: { in: ["ACCEPTED", "CONFIRMED"] } 
    },
    include: { 
      seller: { 
        include: { 
          onePager: true 
        } 
      }, 
      timeSlot: true 
    },
    orderBy: { 
      timeSlot: { 
        startTime: 'asc' 
      } 
    }
  });

  const allSellers = await db.user.findMany({
    where: { 
      role: "SELLER", 
      approvalStatus: "APPROVED" 
    },
    include: { 
      onePager: true 
    },
    orderBy: { 
      companyName: 'asc' 
    }
  });

  return (
    <BuyerClient 
      user={user} 
      mySlots={mySlots} 
      confirmedMeetings={confirmedMeetings} 
      allSellers={allSellers}
      buyerId={buyerId} 
    />
  );
}