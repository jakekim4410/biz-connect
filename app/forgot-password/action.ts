"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const newPassword = formData.get("newPassword") as string;

  // 1. 사용자 찾기 (이메일과 전화번호 동시 만족)
  const user = await db.user.findFirst({
    where: { email, phone }
  });

  if (!user) {
    throw new Error("입력하신 정보와 일치하는 계정이 없습니다.");
  }

  // 2. 새 비밀번호 암호화 후 업데이트
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword }
  });

  redirect("/login");
}