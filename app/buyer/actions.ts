// app/buyer/actions.ts (또는 해당 바이어 액션 파일)
"use server";

import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";
// 💡 [추가] 이메일 발송 함수 import (경로는 프로젝트 설정에 맞게 @/lib/email 로 통일하는 것을 권장)
import { sendMeetingConfirmationEmails } from "@/lib/email";

// 1. 예약 생성 (장소 포함)
export async function createSlotAction(formData: FormData, buyerId: number) {
  // ... (기존 코드 유지)
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const location = formData.get("location") as string;
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  const existing = await db.timeSlot.findFirst({
    where: {
      buyerId,
      startTime,
      status: { not: "CANCELED" },
    },
  });

  if (existing) {
    return { success: false, error: "이미 동일한 시간에 개설된 슬롯이 있습니다. 다른 시간을 선택해주세요." };
  }

  await db.timeSlot.create({ 
    data: { startTime, endTime, buyerId, description, location } 
  });
  revalidatePath("/buyer");
  return { success: true };
}

// 2. 예약 수정 (장소 수정 포함)
export async function updateSlotAction(slotId: number, formData: FormData) {
  // ... (기존 코드 유지)
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const location = formData.get("location") as string;
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  const currentSlot = await db.timeSlot.findUnique({ where: { id: slotId } });

  const existing = await db.timeSlot.findFirst({
    where: {
      buyerId: currentSlot?.buyerId,
      startTime,
      status: { not: "CANCELED" },
      id: { not: slotId },
    },
  });

  if (existing) {
    return { success: false, error: "이미 동일한 시간에 개설된 슬롯이 있습니다. 다른 시간을 선택해주세요." };
  }

  await db.timeSlot.update({
    where: { id: slotId },
    data: { startTime, endTime, description, location }
  });
  revalidatePath("/buyer");
  return { success: true };
}

// 3. 예약 취소 
export async function deleteSlotAction(slotId: number) {
  await db.meeting.updateMany({ 
    where: { timeSlotId: slotId },
    data: { status: "REJECTED", rejectionReason: "바이어/VC가 예약을 취소하였습니다." }
  });
  await db.timeSlot.update({ 
    where: { id: slotId },
    data: { status: "CANCELED" }
  });
  revalidatePath("/buyer");
  revalidatePath("/seller");
  return { success: true };
}

// 4. 수락 처리 시 최초 장소를 Meeting으로 복사 (🚨 여기에 이메일 발송 추가)
export async function handleStatusAction(meetingId: number, slotId: number, action: string, rejectionReason?: string) {
  if (action === "ACCEPT") {
    const slot = await db.timeSlot.findUnique({ where: { id: slotId } });
    
    // 💡 [수정] update 시 바이어, 셀러 정보와 슬롯(시간) 정보를 같이 가져오도록 include 추가
    const confirmedMeeting = await db.meeting.update({ 
      where: { id: meetingId }, 
      data: { status: "CONFIRMED", location: slot?.location },
      include: {
        buyer: true,
        seller: true,
        timeSlot: true,
      }
    });

    await db.meeting.updateMany({ 
      where: { timeSlotId: slotId, id: { not: meetingId } }, 
      data: { status: "REJECTED", rejectionReason: "타기업 매칭" } 
    });
    await db.timeSlot.update({ where: { id: slotId }, data: { status: "CLOSED" } });

// 💡 [추가] 이메일 발송 로직 실행
    if (confirmedMeeting.timeSlot?.startTime) {
      const meetingDateStr = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(confirmedMeeting.timeSlot.startTime);

      await sendMeetingConfirmationEmails({
        // 🚨 하드코딩 제거! 이제 진짜 회원 이메일로 갑니다.
        buyerEmail: confirmedMeeting.buyer?.email || "", 
        buyerName: confirmedMeeting.buyer?.companyName || confirmedMeeting.buyer?.name || "바이어",
        sellerEmail: confirmedMeeting.seller?.email || "", 
        sellerName: confirmedMeeting.seller?.companyName || confirmedMeeting.seller?.name || "셀러",
        meetingDate: meetingDateStr,
        // 💡 새로 추가된 데이터
        location: confirmedMeeting.location || confirmedMeeting.timeSlot.location || "미지정",
        startTimeIso: confirmedMeeting.timeSlot.startTime.toISOString(),
        endTimeIso: confirmedMeeting.timeSlot.endTime.toISOString(),
      });
    }

  } else {
    // 거절 시 기존 로직 유지
    await db.meeting.update({ where: { id: meetingId }, data: { status: "REJECTED", rejectionReason } });
  }
  revalidatePath("/buyer");
  revalidatePath("/seller");
}

// 5. 장소 변경 요청 (바이어가 셀러에게 제안)
export async function requestLocationChange(meetingId: number, newLocation: string) {
  // ... (기존 코드 유지)
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
  // ... (기존 코드 유지)
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