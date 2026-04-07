"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function resetPasswordAction(token: string, password: string, locale: string = "ko") {
  try {
    // 1. 토큰으로 유저 찾기 및 만료 확인
    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return { 
        success: false, 
        error: locale === "ko" 
          ? "유효하지 않거나 만료된 토큰입니다. 다시 시도해 주세요." 
          : "Invalid or expired token. Please try again." 
      };
    }

    // 2. 비번 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. 비번 업데이트 및 토큰 초기화 (Raw SQL 사용)
    try {
      await db.$executeRawUnsafe(
        `UPDATE "User" SET "password" = $1, "resetToken" = NULL, "resetTokenExpires" = NULL WHERE id = $2`,
        hashedPassword,
        user.id
      );
    } catch (e) {
      console.error("Password update failed via Raw SQL:", e);
      return { success: false, error: "Database error. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Reset password action error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
