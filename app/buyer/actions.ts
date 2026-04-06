// app/buyer/actions.ts
"use server";

import { db } from "../../lib/db"; // (또는 "@/lib/db")
import { revalidatePath } from "next/cache";
import { sendMeetingConfirmationEmails } from "@/lib/email";
// 💡 [추가] 로그인 세션 확인을 위한 import
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 1. 예약 생성 (장소 포함)
export async function createSlotAction(formData: FormData, buyerId: number) {
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

// 4. 수락 처리 시 최초 장소를 Meeting으로 복사 (이메일 발송 포함)
export async function handleStatusAction(meetingId: number, slotId: number, action: string, rejectionReason?: string) {
  if (action === "ACCEPT") {
    const slot = await db.timeSlot.findUnique({ where: { id: slotId } });
    
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

    if (confirmedMeeting.timeSlot?.startTime) {
      const meetingDateStr = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(confirmedMeeting.timeSlot.startTime);

      await sendMeetingConfirmationEmails({
        buyerEmail: confirmedMeeting.buyer?.email || "", 
        buyerName: confirmedMeeting.buyer?.companyName || confirmedMeeting.buyer?.name || "바이어",
        sellerEmail: confirmedMeeting.seller?.email || "", 
        sellerName: confirmedMeeting.seller?.companyName || confirmedMeeting.seller?.name || "셀러",
        meetingDate: meetingDateStr,
        location: confirmedMeeting.location || confirmedMeeting.timeSlot.location || "미지정",
        startTimeIso: confirmedMeeting.timeSlot.startTime.toISOString(),
        endTimeIso: confirmedMeeting.timeSlot.endTime.toISOString(),
      });
    }

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

// ==========================================
// 💡 아래부터 바이어용으로 추가된 멤버 관리 로직입니다.
// ==========================================

// 7. 멤버 승인/거절 처리 (바이어 마스터 전용)
export async function handleMemberStatus(memberId: number, status: "APPROVED" | "REJECTED", reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };
  
  const masterId = Number((session.user as any).id);
  const master = await db.user.findUnique({ where: { id: masterId } });

  if (!master?.isMaster) return { error: "권한이 없습니다." };

  const dataToUpdate: any = { approvalStatus: status };
  if (status === "REJECTED") {
    dataToUpdate.rejectionReason = reason || null; 
  } else if (status === "APPROVED") {
    dataToUpdate.rejectionReason = null; 
  }

  await db.user.update({
    where: { id: memberId },
    data: dataToUpdate
  });

  // 💡 바이어는 원페이저(OnePager)를 작성하지 않으므로, 셀러에 있던 원페이저 동기화 로직은 삭제했습니다.
  
  revalidatePath("/buyer"); // 💡 경로를 /buyer로 변경
  return { success: true };
}

// 8. 바이어 마스터 권한 위임
export async function transferMasterRole(newMasterId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };
  
  const currentUserId = Number((session.user as any).id);

  try {
    await db.$transaction([
      db.user.update({ where: { id: currentUserId }, data: { isMaster: false } }),
      db.user.update({ where: { id: newMasterId }, data: { isMaster: true, approvalStatus: "APPROVED" } })
    ]);
    
    revalidatePath("/buyer"); // 💡 경로를 /buyer로 변경
    return { success: true };
  } catch (e) {
    return { error: "권한 위임 중 오류 발생" };
  }
}