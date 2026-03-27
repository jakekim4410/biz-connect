"use server";

import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";

// 1. 예약 생성 (장소 포함)
export async function createSlotAction(formData: FormData, buyerId: number) {
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const location = formData.get("location") as string; // 추가
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  await db.timeSlot.create({ 
    data: { startTime, endTime, buyerId, description, location } 
  });
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

// 4. 수락 처리 시 최초 장소를 Meeting으로 복사
export async function handleStatusAction(meetingId: number, slotId: number, action: string, rejectionReason?: string) {
  if (action === "ACCEPT") {
    const slot = await db.timeSlot.findUnique({ where: { id: slotId } });
    await db.meeting.update({ 
      where: { id: meetingId }, 
      data: { status: "ACCEPTED", location: slot?.location } // 최초 장소 복사
    });
    await db.meeting.updateMany({ 
      where: { timeSlotId: slotId, id: { not: meetingId } }, 
      data: { status: "REJECTED", rejectionReason: "타 업체 확정" } 
    });
    await db.timeSlot.update({ where: { id: slotId }, data: { status: "CLOSED" } });
  } else {
    await db.meeting.update({ where: { id: meetingId }, data: { status: "REJECTED", rejectionReason } });
  }
  revalidatePath("/buyer");
  revalidatePath("/seller");
}

// 5. 장소 변경 요청 (바이어가 셀러에게 제안)
export async function requestLocationChange(meetingId: number, newLocation: string) {
  await db.meeting.update({
    where: { id: meetingId },
    data: { 
      pendingLocation: newLocation, 
      locationChangeStatus: "PENDING" 
    }
  });
  revalidatePath("/buyer");
  revalidatePath("/seller");
}

// 6. 장소 변경 응답 (셀러가 결정)
export async function respondLocationChange(meetingId: number, action: "ACCEPT" | "REJECT") {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (action === "ACCEPT") {
    await db.meeting.update({
      where: { id: meetingId },
      data: { 
        location: meeting?.pendingLocation, 
        pendingLocation: null, 
        locationChangeStatus: null 
      }
    });
  } else {
    await db.meeting.update({
      where: { id: meetingId },
      data: { pendingLocation: null, locationChangeStatus: "REJECTED" }
    });
  }
  revalidatePath("/buyer");
  revalidatePath("/seller");
}