"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- 유저 관련 액션 ---
export async function updateUserAdmin(id: number, data: any) {
  try {
    await db.user.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        phone: data.phone,
        role: data.role
      }
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "유저 정보 수정 실패" };
  }
}

export async function deleteUser(userId: number) {
  try {
    await db.user.delete({ where: { id: userId } });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "유저 삭제 실패" };
  }
}

// --- 슬롯 관련 액션 ---
export async function updateTimeSlotLocation(slotId: number, location: string) {
  try {
    await db.timeSlot.update({
      where: { id: slotId },
      data: { location }
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

// --- 매칭(미팅) 관련 액션 ---
export async function updateMeetingStatus(id: number, status: string) {
  try {
    await db.meeting.update({
      where: { id },
      data: { status }
    });
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
    // 날짜와 시간을 합쳐서 새로운 Date 객체 생성
    const newDateTime = new Date(`${dateStr}T${timeStr}:00`);
    
    await db.timeSlot.update({
      where: { id: slotId },
      data: { 
        startTime: newDateTime,
        endTime: new Date(newDateTime.getTime() + 60 * 60 * 1000) // 기본 1시간 뒤로 설정
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: "시간 업데이트 실패" };
  }
}