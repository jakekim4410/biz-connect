"use server";

import { db } from "@/lib/db";
import { sendForgotPasswordEmail } from "@/lib/email";
import crypto from "crypto";

export async function forgotPasswordAction(email: string, locale: string = "ko") {
  try {
    // 1. 유저 존재 여부 확인
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 보안상 유저가 없어도 성공 메시지를 보낼 수도 있지만, 여기서는 명확성을 위해 에러 처리
      return { success: false, error: locale === "ko" ? "가입되지 않은 이메일입니다." : "Email not found." };
    }

    // 2. 토큰 생성 (보안상 랜덤 문자열)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1시간 후 만료

    // 3. 토큰 정보를 DB에 저장 (Prisma Client 락 대비 Raw SQL 사용)
    try {
      await db.$executeRawUnsafe(
        `UPDATE "User" SET "resetToken" = $1, "resetTokenExpires" = $2 WHERE id = $3`,
        token,
        expires,
        user.id
      );
    } catch (e) {
      console.error("Token save failed via Raw SQL:", e);
      // 만약 Raw SQL도 실패한다면 (예: 필드명이 다름), 에러 리턴
      return { success: false, error: "System synchronization error. Please try again later." };
    }

    // 4. 이메일 발송
    const resetLink = `${process.env.NEXTAUTH_URL || "https://biz-connect-two.vercel.app"}/reset-password?token=${token}`;
    await sendForgotPasswordEmail(user.email, user.name, resetLink, locale);

    return { success: true };
  } catch (error) {
    console.error("Forgot password action error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}