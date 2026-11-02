import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-admin-secret");
    if (authHeader !== "bizconnect_admin_upload_key_2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. User 81 정보
    const user81 = await db.user.findUnique({
      where: { id: 81 },
      include: { timeSlots: true }
    });

    // 2. 슬롯 76, 77 정보
    const slots7677 = await db.timeSlot.findMany({
      where: { id: { in: [76, 77] } },
      include: {
        buyer: true,
        seller: true,
        meetings: {
          include: { seller: true }
        }
      }
    });

    // 3. 최근 생성된 TimeSlots (id >= 70)
    const recentSlots = await db.timeSlot.findMany({
      where: { id: { gte: 70 } },
      include: {
        buyer: true,
        meetings: true
      },
      orderBy: { id: "asc" }
    });

    // 4. 셀러 관점에서 availableSlots 쿼리 실행
    const availableSlotsQuery = await db.timeSlot.findMany({
      where: {
        slotOwner: "BUYER",
        status: "OPEN",
        startTime: { gt: now }
      },
      include: {
        buyer: true,
        meetings: { include: { seller: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    // 5. 셀러 목록 (간단히 상위 5명)
    const sellers = await db.user.findMany({
      where: { role: "SELLER" },
      select: { id: true, email: true, companyName: true, approvalStatus: true },
      take: 5
    });

    return NextResponse.json({
      success: true,
      serverTime: now.toISOString(),
      user81,
      slots7677,
      recentSlotsCount: recentSlots.length,
      recentSlots: recentSlots.map(s => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        status: s.status,
        slotOwner: s.slotOwner,
        buyerId: s.buyerId,
        buyerCompanyName: s.buyer?.companyName,
        buyerApprovalStatus: s.buyer?.approvalStatus,
        meetingsCount: s.meetings.length
      })),
      availableSlotsTotal: availableSlotsQuery.length,
      availableSlotIds: availableSlotsQuery.map(s => s.id),
      sellers
    });
  } catch (err: any) {
    console.error("Debug slots error:", err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
