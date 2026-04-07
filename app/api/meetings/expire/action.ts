"use server";
import { db } from "@/lib/db";

/**
 * 지난 일정 미팅 자동 폐기 (서버 액션)
 * - PENDING 상태인 미팅 중 timeSlot.startTime이 현재 시간보다 이전인 것을 자동으로 REJECTED 처리
 * - 바이어: "지난 일정으로 자동 처리되었습니다" 메시지와 함께 거절
 * - 셀러: "일정이 지난 미팅으로 자동 거절 처리되었습니다" 메시지와 함께 거절
 */
export async function autoExpirePastMeetings() {
  try {
    const now = new Date();

    // PENDING 상태이면서 timeSlot이 이미 지난 미팅을 모두 조회
    const expiredMeetings = await db.meeting.findMany({
      where: {
        status: "PENDING",
        timeSlot: {
          startTime: { lt: now }
        }
      },
      select: { id: true }
    });

    if (expiredMeetings.length === 0) return { expired: 0 };

    const expiredIds = expiredMeetings.map(m => m.id);

    // 일괄 REJECTED 처리
    await db.meeting.updateMany({
      where: { id: { in: expiredIds } },
      data: {
        status: "REJECTED",
        rejectionReason: "EXPIRED_SCHEDULE", // 코드로 구분, 클라이언트에서 메시지 표시
      }
    });

    return { expired: expiredIds.length };
  } catch (e) {
    console.error("[autoExpirePastMeetings] Error:", e);
    return { expired: 0 };
  }
}
