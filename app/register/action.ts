"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function registerUserAction(formData: FormData) {
  // 1. 모든 데이터 추출
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const companyName = formData.get("companyName") as string;
  const jobTitle = formData.get("jobTitle") as string;
  const role = formData.get("role") as string;
  const userType = formData.get("userType") as string;
  const userTypeDetail = formData.get("userTypeDetail") as string;
  const preferredPartners = formData.get("preferredPartners") as string;

  // 2. 간단 유효성 검사
  if (!email || !phone || !password || !name) {
    return { error: "필수 정보를 모두 입력해주세요." };
  }

  try {
    // 3. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. DB 저장 (모든 필드 포함!)
    await db.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        companyName, 
        jobTitle, 
        phone, 
        role,
        userType, 
        userTypeDetail,
        preferredPartners
      }
    });
  } catch (e: any) {
    console.error("DB 저장 에러:", e);
    return { error: "이미 가입된 이메일이거나 데이터 저장 중 오류가 발생했습니다." };
  }

  // 성공 시 로그인 페이지로
  redirect("/login");
}