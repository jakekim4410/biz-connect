"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

// 1. 유사 회사명 존재 여부 확인 (최초 가입자 정보는 '확인용'으로만 제공)
export async function checkExistingCompanyAction(companyName: string) {
  if (!companyName || companyName.length < 2) return [];

  try {
    const existingCompanies = await db.user.findMany({
      where: {
        companyName: {
          contains: companyName,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        companyName: true,
        name: true, // "OOO님이 가입한 회사가 맞나요?" 확인용
        onePager: true, 
      },
    });

    // 중복 회사명 제거 (가장 먼저 가입한 사람 기준)
    const uniqueCompanies = Array.from(new Map(existingCompanies.map(item => [item.companyName, item])).values());
    return uniqueCompanies;
  } catch (e) {
    console.error("회사 검색 에러:", e);
    return [];
  }
}

// 2. 회원가입 처리
export async function registerUserAction(formData: FormData) {
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string; // 가입자가 직접 입력한 이름
  const companyName = formData.get("companyName") as string;
  const jobTitle = formData.get("jobTitle") as string; // 가입자가 직접 입력한 직함
  const role = formData.get("role") as string;
  const userType = formData.get("userType") as string;
  const userTypeDetail = formData.get("userTypeDetail") as string;
  const preferredPartners = formData.get("preferredPartners") as string;

  if (!email || !phone || !password || !name || !companyName) {
    return { error: "필수 정보를 모두 입력해주세요." };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // [수정 반영] 동일 회사 이름으로 먼저 가입한 '마스터' 유저가 있는지 확인
    const masterUser = await db.user.findFirst({
      where: { companyName: companyName, isMaster: true },
      orderBy: { createdAt: 'asc' },
      include: { onePager: true }
    });

    // 마스터가 없으면 내가 첫 번째 가입자(Master)가 됨
    const isFirstUser = !masterUser;

    // 유저 생성 (승인 시스템 필드 추가)
    const newUser = await db.user.create({
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
        preferredPartners,
        // [추가 로직] 첫 가입자만 마스터 권한 및 즉시 승인, 나머지는 PENDING
        isMaster: isFirstUser,
        approvalStatus: isFirstUser ? "APPROVED" : "PENDING"
      }
    });

    // SELLER인 경우 원페이저 생성 로직
    if (role === "SELLER") {
      // 기존 마스터 유저와 그 마스터의 원페이저 정보가 있다면 상속(복사)
      if (masterUser && masterUser.onePager) {
        // [핵심] 사업 정보는 복사하되, 담당자 정보(PIC)는 신규 가입자 본인의 정보로 저장
        await db.onePager.create({
          data: {
            userId: newUser.id,
            companyNameKr: masterUser.onePager.companyNameKr || "",
            companyNameEn: masterUser.onePager.companyNameEn || "",
            ceoName: masterUser.onePager.ceoName || "", 
            picName: name, // 신규 가입자 본인 이름
            picTitle: jobTitle, // 신규 가입자 본인 직함
            contactEmail: email, // 신규 가입자 본인 계정
            productType: masterUser.onePager.productType || "",
            solutionSummary: masterUser.onePager.solutionSummary || "",
            problem: masterUser.onePager.problem || "",
            solution: masterUser.onePager.solution || "",
            traction: masterUser.onePager.traction || "",
            bizModel: masterUser.onePager.bizModel || "",
            primaryTech: masterUser.onePager.primaryTech || "",
            industrySector: masterUser.onePager.industrySector || "",
            yearFounded: masterUser.onePager.yearFounded || "",
            investmentStage: masterUser.onePager.investmentStage || "",
            monthlyRevenue: masterUser.onePager.monthlyRevenue || "",
            pitchDeckUrl: masterUser.onePager.pitchDeckUrl || "",
          }
        });
      } else {
        // 이 회사의 최초 가입자인 경우 (혹은 마스터의 원페이저가 없는 경우) 본인 정보로 생성
        await db.onePager.create({
          data: {
            userId: newUser.id,
            picName: name,
            picTitle: jobTitle,
            contactEmail: email,
          }
        });
      }
    }
  } catch (e: any) {
    console.error("DB 저장 에러:", e);
    return { error: "이미 가입된 이메일이거나 데이터 저장 중 오류가 발생했습니다." };
  }

  redirect("/login");
}