"use server";

import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";

// 1. 예약 생성
export async function createSlotAction(formData: FormData, buyerId: number) {
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  await db.timeSlot.create({ data: { startTime, endTime, buyerId, description } });
  revalidatePath("/buyer");
}

// 2. 예약 수정
export async function updateSlotAction(slotId: number, formData: FormData) {
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  await db.timeSlot.update({
    where: { id: slotId },
    data: { startTime, endTime, description }
  });
  revalidatePath("/buyer");
}

// 3. 예약 취소
export async function deleteSlotAction(slotId: number) {
  await db.timeSlot.delete({ where: { id: slotId } });
  revalidatePath("/buyer");
}

// 4. 수락/거절 처리 (하나의 함수로 통합)
export async function handleStatusAction(
  meetingId: number, 
  slotId: number, 
  action: string, 
  rejectionReason?: string 
) {
  if (action === "ACCEPT") {
    // 수락 처리
    await db.meeting.update({ where: { id: meetingId }, data: { status: "ACCEPTED" } });
    
    // 타 업체 자동 거절
    await db.meeting.updateMany({ 
      where: { timeSlotId: slotId, id: { not: meetingId } }, 
      data: { status: "REJECTED", rejectionReason: "다른 미팅이 확정되었습니다." } 
    });
    
    // 슬롯 마감
    await db.timeSlot.update({ where: { id: slotId }, data: { status: "CLOSED" } });
  } else {
    // 거절 처리 및 사유 입력
    await db.meeting.update({ 
      where: { id: meetingId }, 
      data: { 
        status: "REJECTED", 
        rejectionReason: rejectionReason || "사유가 입력되지 않았습니다." 
      } 
    });
  }
  revalidatePath("/buyer");
}