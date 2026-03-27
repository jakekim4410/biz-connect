import { db } from "../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import BuyerClient from "./BuyerClient";

export default async function BuyerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") redirect("/login");
  const buyerId = Number((session.user as any).id);

  const mySlots = await db.timeSlot.findMany({
    where: { buyerId },
    include: { 
      meetings: { 
        include: { 
          seller: true, 
          timeSlot: true // ⬅️ 이 줄이 추가되어야 'startTime'을 읽을 수 있습니다.
        } 
      } 
    },
    orderBy: { startTime: 'asc' }
  });

  const confirmedMeetings = await db.meeting.findMany({
    where: { buyerId, status: "ACCEPTED" },
    include: { seller: true, timeSlot: true },
    orderBy: { timeSlot: { startTime: 'asc' } }
  });

  return (
    <BuyerClient 
      mySlots={mySlots} 
      confirmedMeetings={confirmedMeetings} 
      buyerId={buyerId} 
    />
  );
}