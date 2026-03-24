"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. 현재 로그인한 사용자의 데이터 가져오기
export async function getUserData() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  
  return await db.user.findUnique({
    where: { id: Number((session.user as any).id) }
  });
}

// 2. 정보 수정 저장하기
export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false };

  const userId = Number((session.user as any).id);

  const data = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    jobTitle: formData.get("jobTitle") as string,
    companyName: formData.get("companyName") as string,
    userType: formData.get("userType") as string,
    userTypeDetail: formData.get("userTypeDetail") as string,
    preferredPartners: formData.get("preferredPartners") as string,
  };

  await db.user.update({
    where: { id: userId },
    data: data
  });

  revalidatePath("/profile");
  return { success: true };
}