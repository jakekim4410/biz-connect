import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-admin-secret");
    if (authHeader !== "bizconnect_admin_upload_key_2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, buyerEmail, targetUserId } = body;

    // 양지청 바이어 찾기
    const buyer = await db.user.findFirst({
      where: targetUserId 
        ? { id: Number(targetUserId) } 
        : { email: buyerEmail || "savejcy@gmail.com" },
    });

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    const buyerId = buyer.id;

    if (action === "recreate-yang-slots") {
      // 1. 기존 슬롯 조회
      const existingSlots = await db.timeSlot.findMany({
        where: { buyerId },
        include: { meetings: true },
      });

      const existingSlotIds = existingSlots.map(s => s.id);

      // 연결된 미팅들 정리
      if (existingSlotIds.length > 0) {
        await db.meeting.deleteMany({
          where: { timeSlotId: { in: existingSlotIds } },
        });

        // 기존 슬롯 삭제
        await db.timeSlot.deleteMany({
          where: { id: { in: existingSlotIds } },
        });
      }

      // 2. 2026-11-05 ~ 2026-12-31 매주 목요일 슬롯 생성
      // 21:00~22:00, 22:00~23:00 (온라인, 링크 추후 공유 __TBA__)
      const thursdays = [
        "2026-11-05",
        "2026-11-12",
        "2026-11-19",
        "2026-11-26",
        "2026-12-03",
        "2026-12-10",
        "2026-12-17",
        "2026-12-24",
        "2026-12-31",
      ];

      const newSlotsData: any[] = [];

      for (const dateStr of thursdays) {
        // 슬롯 1: 21:00 ~ 22:00
        newSlotsData.push({
          buyerId,
          startTime: new Date(`${dateStr}T21:00:00.000Z`),
          endTime: new Date(`${dateStr}T22:00:00.000Z`),
          location: "__TBA__",
          slotOwner: "BUYER",
          status: "OPEN",
          description: "온라인 미팅 (화상회의 링크는 확정 후 추후 공유 예정)",
        });

        // 슬롯 2: 22:00 ~ 23:00
        newSlotsData.push({
          buyerId,
          startTime: new Date(`${dateStr}T22:00:00.000Z`),
          endTime: new Date(`${dateStr}T23:00:00.000Z`),
          location: "__TBA__",
          slotOwner: "BUYER",
          status: "OPEN",
          description: "온라인 미팅 (화상회의 링크는 확정 후 추후 공유 예정)",
        });
      }

      await db.timeSlot.createMany({
        data: newSlotsData,
      });

      // 생성된 슬롯 다시 조회
      const createdSlots = await db.timeSlot.findMany({
        where: { buyerId },
        orderBy: { startTime: "asc" },
      });

      return NextResponse.json({
        success: true,
        buyer: {
          id: buyer.id,
          name: buyer.name,
          company: buyer.companyName,
          email: buyer.email,
        },
        deletedCount: existingSlotIds.length,
        createdCount: createdSlots.length,
        slots: createdSlots.map(s => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          location: s.location,
          status: s.status,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Manage slots error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
