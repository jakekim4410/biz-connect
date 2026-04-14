// app/buyer/actions.ts
"use server";

import { db } from "../../lib/db"; // (또는 "@/lib/db")
import { revalidatePath } from "next/cache";
import { sendMeetingConfirmationEmails, sendApprovalCompletedEmail, sendJoinRejectedEmail } from "@/lib/email";
// 💡 [추가] 로그인 세션 확인을 위한 import
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Locale } from "@/lib/i18n";

const REJECTION_REASONS = {
  ko: {
    matchedOther: "타기업 매칭",
    cancelledByBuyer: "바이어/VC가 예약을 취소하였습니다.",
    defaultReason: "사유가 입력되지 않았습니다.",
  },
  en: {
    matchedOther: "Matched with another company",
    cancelledByBuyer: "The Buyer/VC has cancelled the reservation.",
    defaultReason: "No reason provided.",
  }
};

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
// [UPDATE] locale 파라미터 추가
export async function deleteSlotAction(slotId: number, locale: Locale = "ko") {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;
  const tReasons = REJECTION_REASONS[locale] || REJECTION_REASONS["ko"];
  
  await db.meeting.updateMany({ 
    where: { timeSlotId: slotId },
    data: { 
      status: "REJECTED", 
      rejectionReason: tReasons.cancelledByBuyer,
      picId: currentUserId
    }
  });
  await db.timeSlot.update({ 
    where: { id: slotId },
    data: { status: "CANCELED" }
  });
  revalidatePath("/buyer");
  revalidatePath("/seller");
  return { success: true };
}

export async function handleStatusAction(meetingId: number, slotId: number, action: string, rejectionReason?: string, locale: Locale = "ko") {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;
  const tReasons = REJECTION_REASONS[locale] || REJECTION_REASONS["ko"];

  if (action === "ACCEPT") {
    const slot = await db.timeSlot.findUnique({ where: { id: slotId } });
    
    const confirmedMeeting = await db.meeting.update({ 
      where: { id: meetingId }, 
      data: { 
        status: "CONFIRMED", 
        location: slot?.location,
        picId: currentUserId // 담당자 지정
      },
      include: {
        buyer: true,
        seller: true,
        timeSlot: true,
      }
    });

    await db.meeting.updateMany({ 
      where: { timeSlotId: slotId, id: { not: meetingId } }, 
      data: { 
        status: "REJECTED", 
        rejectionReason: tReasons.matchedOther,
        picId: currentUserId // 다른 건들을 거절한 주체도 본인으로 기록
      } 
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
    await db.meeting.update({ 
      where: { id: meetingId }, 
      data: { 
        status: "REJECTED", 
        rejectionReason: rejectionReason || tReasons.defaultReason,
        picId: currentUserId
      } 
    });
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
  
  if (status === "APPROVED") {
    const member = await db.user.findUnique({ where: { id: memberId } });
    if (member) {
      await sendApprovalCompletedEmail(member.email, member.name, (member as any).preferredLanguage || "ko");
    }
  } else if (status === "REJECTED") {
    const member = await db.user.findUnique({ where: { id: memberId } });
    if (member && master) {
      await sendJoinRejectedEmail(
        member.email, 
        member.name, 
        master.name, 
        master.companyName || "BizConnect", 
        reason, 
        (member as any).preferredLanguage || "ko"
      );
    }
  }
  
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

// 9. 다이렉트 제안 미팅 수락 및 슬롯 매핑
// [UPDATE] locale 파라미터 추가
export async function acceptDirectMeetingAction(meetingId: number, slotId: number, locale: Locale = "ko") {
  const tReasons = REJECTION_REASONS[locale] || REJECTION_REASONS["ko"];
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };

  try {
    const currentUserId = Number((session.user as any).id);
    // 1. 데이터 베이스 업데이트 (트랜잭션)
    const [confirmedMeeting] = await db.$transaction([
      // 미팅 상태 확정 및 슬롯 매핑
      db.meeting.update({
        where: { id: meetingId },
        data: {
          timeSlotId: slotId,
          picId: currentUserId, // 👈 현재 수락한 사람을 담당자로 지정
          status: "CONFIRMED", // 미팅 상태 확정
          rewardStatus: "PENDING_REWARD" // 향후 베네핏 관련 예비 필드
        },
        include: {
          buyer: true,
          seller: true,
          timeSlot: true,
        }
      }),
      // 해당 슬롯에 신청했던 다른 대기중인 미팅들 자동 거절
      db.meeting.updateMany({ 
        where: { timeSlotId: slotId, id: { not: meetingId } }, 
        data: { status: "REJECTED", rejectionReason: tReasons.matchedOther } 
      }),
      // 슬롯 상태 폐쇄 (CLOSED)
      db.timeSlot.update({ 
        where: { id: slotId }, 
        data: { status: "CLOSED" } 
      })
    ]);

    // 2. 매칭 확정 이메일 발송
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

    revalidatePath("/buyer");
    revalidatePath("/seller");
    return { success: true };
  } catch (e) {
    console.error("Direct meeting acceptance error:", e);
    return { error: "수락 처리 중 오류가 발생했습니다." };
  }
}

// 10. 다이렉트 제안 미팅 거절 (전용 액션)
export async function rejectDirectMeetingAction(meetingId: number, reason?: string, locale: Locale = "ko") {
  const tReasons = REJECTION_REASONS[locale] || REJECTION_REASONS["ko"];
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };

  try {
    const currentUserId = Number((session.user as any).id);
    await db.meeting.update({
      where: { id: meetingId },
      data: { 
        status: "REJECTED", 
        rejectionReason: reason || tReasons.defaultReason,
        picId: currentUserId
      }
    });

    revalidatePath("/buyer");
    revalidatePath("/seller");
    return { success: true };
  } catch (e) {
    console.error("Direct meeting rejection error:", e);
    return { error: "거절 처리 중 오류가 발생했습니다." };
  }
}

// ==========================================
// 바이어가 셀러 슬롯에 신청하는 액션
// ==========================================

// B-S1. 바이어가 셀러 슬롯에 미팅 신청
export async function applyToSellerSlotAction(formData: FormData, buyerId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "로그인이 필요합니다." };

    const slotId = Number(formData.get("slotId"));
    const sellerId = Number(formData.get("sellerId"));
    const proposal = formData.get("proposal") as string;

    if (!slotId || slotId === -1) {
      // 다이렉트 제안 (슬롯 없이)
      await db.meeting.create({
        data: {
          buyerId,
          sellerId,
          proposal,
          status: "PENDING",
          meetingType: "DIRECT_REQUEST",
        }
      });
      revalidatePath("/buyer");
      revalidatePath("/seller");
      return { success: true };
    }

    const slot = await db.timeSlot.findUnique({
      where: { id: slotId },
      select: { startTime: true, status: true }
    });

    if (!slot) return { error: "존재하지 않는 슬롯입니다." };
    if (slot.status !== "OPEN") return { error: "이미 마감된 슬롯입니다." };
    if (slot.startTime < new Date()) return { error: "이미 시간이 지난 슬롯입니다." };

    // 중복 신청 방지
    const existing = await db.meeting.findFirst({
      where: { timeSlotId: slotId, buyerId, status: { not: "REJECTED" } }
    });
    if (existing) return { error: "이미 신청한 슬롯입니다." };

    await db.meeting.create({
      data: {
        timeSlotId: slotId,
        buyerId,
        sellerId,
        proposal,
        status: "PENDING",
        meetingType: "REGULAR",
      }
    });

    revalidatePath("/buyer");
    revalidatePath("/seller");
    return { success: true };
  } catch (error) {
    console.error("셀러 슬롯 신청 오류:", error);
    return { error: "미팅 신청 처리 중 오류가 발생했습니다." };
  }
}

// B-S2. 바이어가 셀러에게 다이렉트 제안 (슬롯 없이)
export async function sendDirectMeetingToSellerAction(formData: FormData, buyerId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "로그인이 필요합니다." };

    const sellerId = Number(formData.get("sellerId"));
    const proposal = formData.get("proposal") as string;

    await db.meeting.create({
      data: {
        buyerId,
        sellerId,
        proposal,
        status: "PENDING",
        meetingType: "DIRECT_REQUEST",
      }
    });

    revalidatePath("/buyer");
    revalidatePath("/seller");
    return { success: true };
  } catch (error) {
    console.error("다이렉트 제안 오류:", error);
    return { error: "다이렉트 제안 처리 중 오류가 발생했습니다." };
  }
}