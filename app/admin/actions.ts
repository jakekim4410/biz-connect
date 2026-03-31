"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendMeetingConfirmationEmails } from "@/lib/email";

// --- 1. 유저 관련 액션 ---

export async function updateUserAdmin(id: number, data: any) {
  try {
    await db.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        role: data.role,
        isMaster: data.isMaster,
        approvalStatus: data.approvalStatus,
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Admin User Update Error:", error);
    return { success: false, error: "유저 정보 업데이트에 실패했습니다." };
  }
}

export async function approveUserQuickly(id: number) {
  try {
    await db.user.update({
      where: { id },
      data: { approvalStatus: "APPROVED" },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Quick Approval Error:", error);
    return { success: false, error: "승인 처리에 실패했습니다." };
  }
}

export async function deleteUser(userId: number) {
  try {
    await db.user.delete({ where: { id: userId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    console.error("Delete User Error:", e);
    return { success: false, error: "유저 삭제 실패" };
  }
}

// --- 2. 슬롯 관련 액션 ---

export async function updateTimeSlotLocation(slotId: number, location: string) {
  try {
    await db.timeSlot.update({
      where: { id: slotId },
      data: { location },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "슬롯 장소 수정 실패" };
  }
}

export async function deleteTimeSlot(slotId: number) {
  try {
    await db.timeSlot.delete({ where: { id: slotId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "슬롯 삭제 실패" };
  }
}

// --- 3. 매칭(미팅) 관련 액션 ---

export async function updateMeetingStatus(id: number, status: string) {
  try {
    const updatedMeeting = await db.meeting.update({
      where: { id },
      data: { status },
      include: {
        buyer: true,
        seller: true,
        timeSlot: true,
      },
    });

    // 관리자가 상태를 CONFIRMED로 바꾼 경우에만 이메일 발송
    if (status === "CONFIRMED" && updatedMeeting.timeSlot?.startTime) {
      const meetingDateStr = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(updatedMeeting.timeSlot.startTime);

      await sendMeetingConfirmationEmails({
        buyerEmail: updatedMeeting.buyer?.email || "",
        buyerName: updatedMeeting.buyer?.companyName || updatedMeeting.buyer?.name || "바이어",
        sellerEmail: updatedMeeting.seller?.email || "",
        sellerName: updatedMeeting.seller?.companyName || updatedMeeting.seller?.name || "셀러",
        meetingDate: meetingDateStr,
        location: updatedMeeting.location || updatedMeeting.timeSlot.location || "미지정",
        startTimeIso: updatedMeeting.timeSlot.startTime.toISOString(),
        endTimeIso: updatedMeeting.timeSlot.endTime.toISOString(),
      });
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "상태 변경 실패" };
  }
}

export async function updateMeetingLocation(meetingId: number, location: string) {
  try {
    await db.meeting.update({
      where: { id: meetingId },
      data: { location },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "미팅 장소 수정 실패" };
  }
}

export async function updateMeetingDateTime(slotId: number, dateStr: string, timeStr: string) {
  try {
    const newDateTime = new Date(`${dateStr}T${timeStr}:00`);

    await db.timeSlot.update({
      where: { id: slotId },
      data: {
        startTime: newDateTime,
        endTime: new Date(newDateTime.getTime() + 60 * 60 * 1000),
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    console.error("DateTime Update Error:", e);
    return { success: false, error: "시간 업데이트 실패" };
  }
}