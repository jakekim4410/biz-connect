"use server";

import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";

export async function applyMeetingAction(formData: FormData, sellerId: number) {
  const slotId = Number(formData.get("slotId"));
  const buyerId = Number(formData.get("buyerId"));
  const proposal = formData.get("proposal") as string;

  await db.meeting.create({
    data: { 
      timeSlotId: slotId, 
      buyerId, 
      sellerId, 
      proposal, 
      status: "PENDING" 
    }
  });

  revalidatePath("/seller");
}