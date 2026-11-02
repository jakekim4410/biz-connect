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

    // Check user 71, 79, 81
    const users = await db.user.findMany({
      where: { id: { in: [71, 78, 79, 81] } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyName: true,
        companyNameEn: true,
        approvalStatus: true
      }
    });

    // Check availableSlots query for seller 71 and seller 79
    const getAvailableSlotsForSeller = async (sellerId: number) => {
      return await db.timeSlot.findMany({
        where: {
          slotOwner: "BUYER",
          status: "OPEN",
          startTime: { gt: now },
          NOT: { meetings: { some: { sellerId } } }
        },
        include: {
          buyer: true,
          meetings: { include: { seller: true } }
        },
        orderBy: { startTime: 'asc' }
      });
    };

    const slotsFor71 = await getAvailableSlotsForSeller(71);
    const slotsFor79 = await getAvailableSlotsForSeller(79);

    // Grouping simulation (like in SellerClient.tsx)
    const groupByCompany = (slots: any[]) => {
      const map = new Map<string, any[]>();
      for (const slot of slots) {
        const key = slot.buyer?.companyName || "unknown";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(slot);
      }
      return Array.from(map.entries()).map(([companyName, s]) => ({
        companyName,
        buyerName: s[0]?.buyer?.name,
        buyerEmail: s[0]?.buyer?.email,
        buyerId: s[0]?.buyer?.id,
        count: s.length,
        slotIds: s.map((x: any) => x.id)
      }));
    };

    return NextResponse.json({
      success: true,
      users,
      seller71: {
        totalAvailable: slotsFor71.length,
        groups: groupByCompany(slotsFor71)
      },
      seller79: {
        totalAvailable: slotsFor79.length,
        groups: groupByCompany(slotsFor79)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
