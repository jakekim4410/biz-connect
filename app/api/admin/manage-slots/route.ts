import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-admin-secret");
    if (authHeader !== "bizconnect_admin_upload_key_2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Yang Jichung (savejcy@gmail.com)
    const buyer = await db.user.findFirst({
      where: {
        OR: [
          { email: "savejcy@gmail.com" },
          { id: 73 }
        ]
      }
    });

    if (!buyer) {
      return NextResponse.json({ error: "Buyer Yang Jichung not found" }, { status: 404 });
    }

    const buyerId = buyer.id;

    const targets = [
      {
        startTime: "2026-11-26T21:00:00.000Z",
        endTime: "2026-11-26T22:00:00.000Z",
        location: "https://meet.google.com/ige-tixf-nca",
      },
      {
        startTime: "2026-11-26T22:00:00.000Z",
        endTime: "2026-11-26T23:00:00.000Z",
        location: "https://meet.google.com/saq-kddc-spe",
      },
      {
        startTime: "2026-12-03T21:00:00.000Z",
        endTime: "2026-12-03T22:00:00.000Z",
        location: "https://meet.google.com/wbd-ofgw-wru",
      },
      {
        startTime: "2026-12-03T22:00:00.000Z",
        endTime: "2026-12-03T23:00:00.000Z",
        location: "https://meet.google.com/mes-jxrv-fxh",
      },
    ];

    const results = [];

    for (const item of targets) {
      const sDate = new Date(item.startTime);
      const eDate = new Date(item.endTime);

      const existing = await db.timeSlot.findFirst({
        where: {
          buyerId,
          startTime: sDate,
        },
      });

      if (existing) {
        const updated = await db.timeSlot.update({
          where: { id: existing.id },
          data: {
            location: item.location,
            status: "OPEN",
            slotOwner: "BUYER",
            description: "온라인 미팅 (Google Meet)",
          },
        });

        // Sync attached meetings
        await db.meeting.updateMany({
          where: { timeSlotId: existing.id },
          data: { location: item.location },
        });

        results.push({
          action: "updated",
          slotId: updated.id,
          startTime: updated.startTime.toISOString(),
          location: updated.location,
        });
      } else {
        const created = await db.timeSlot.create({
          data: {
            buyerId,
            startTime: sDate,
            endTime: eDate,
            location: item.location,
            status: "OPEN",
            slotOwner: "BUYER",
            description: "온라인 미팅 (Google Meet)",
          },
        });

        results.push({
          action: "created",
          slotId: created.id,
          startTime: created.startTime.toISOString(),
          location: created.location,
        });
      }
    }

    // Query all slots for Yang Jichung to return overview
    const allSlots = await db.timeSlot.findMany({
      where: { buyerId },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        slotOwner: true,
      },
    });

    return NextResponse.json({
      success: true,
      buyer: {
        id: buyer.id,
        name: buyer.name,
        companyName: buyer.companyName,
        email: buyer.email,
      },
      updatedTargets: results,
      allSlotsCount: allSlots.length,
      allSlots: allSlots.map((s) => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        location: s.location,
        status: s.status,
      })),
    });
  } catch (err: any) {
    console.error("Manage slots error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
