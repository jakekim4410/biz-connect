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
    const { action } = body;

    if (action === "update-yang-meet-links") {
      const buyerId = 73;

      const linksToUpdate = [
        { startTime: "2026-11-05T21:00:00.000Z", location: "https://meet.google.com/cvz-pzzp-rdw" },
        { startTime: "2026-11-05T22:00:00.000Z", location: "https://meet.google.com/jsj-hngj-rcp" },
        { startTime: "2026-11-12T21:00:00.000Z", location: "https://meet.google.com/mmc-vfoi-wcr" },
        { startTime: "2026-11-12T22:00:00.000Z", location: "https://meet.google.com/wjm-athb-sof" },
        { startTime: "2026-11-19T21:00:00.000Z", location: "https://meet.google.com/eyj-rysk-ozi" },
        { startTime: "2026-11-19T22:00:00.000Z", location: "https://meet.google.com/wgp-siqg-mot" },
      ];

      const results = [];

      for (const item of linksToUpdate) {
        const updateResult = await db.timeSlot.updateMany({
          where: {
            buyerId,
            startTime: new Date(item.startTime),
          },
          data: {
            location: item.location,
          },
        });

        results.push({
          startTime: item.startTime,
          location: item.location,
          count: updateResult.count,
        });
      }

      // 연결된 미팅이 있는 경우 location 동기화
      const updatedSlots = await db.timeSlot.findMany({
        where: { buyerId },
        include: { meetings: true },
        orderBy: { startTime: "asc" },
      });

      for (const s of updatedSlots) {
        if (s.meetings && s.meetings.length > 0 && s.location) {
          await db.meeting.updateMany({
            where: { timeSlotId: s.id },
            data: { location: s.location },
          });
        }
      }

      return NextResponse.json({
        success: true,
        updatedLinks: results,
        allSlots: updatedSlots.map(s => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          location: s.location,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Manage slots error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
