"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

// 1. 유사 회사명 존재 여부 확인
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
        name: true, 
        role: true, // [추가됨] 기존 회사가 BUYER인지 SELLER인지 프론트에서 알기 위해 추가
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
  const name = formData.get("name") as string; 
  const companyName = formData.get("companyName") as string;
  const jobTitle = formData.get("jobTitle") as string; 
  const role = formData.get("role") as string; // "BUYER" 또는 "SELLER"
  const userType = formData.get("userType") as string;
  const userTypeDetail = formData.get("userTypeDetail") as string;
  const preferredPartners = formData.get("preferredPartners") as string;

  if (!email || !phone || !password || !name || !companyName) {
    return { error: "필수 정보를 모두 입력해주세요." };
  }

  try {
    // [추가됨] 1회사 1역할(Role) 강제 로직
    // 가입하려는 회사 이름이 이미 DB에 존재하는지 확인
    const existingCompanyRecord = await db.user.findFirst({
      where: { companyName: companyName },
      orderBy: { createdAt: 'asc' },
    });

    // 기존 회사가 존재하는데, 이번에 가입하려는 역할(role)과 다르다면 가입 차단
    if (existingCompanyRecord && existingCompanyRecord.role !== role) {
      const roleName = existingCompanyRecord.role === "BUYER" ? "투자자(BUYER)" : "스타트업(SELLER)";
      return { error: `[가입 불가] '${companyName}'은(는) 이미 ${roleName}로 등록된 회사입니다. 동일한 계정 유형으로만 가입 가능합니다.` };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 동일 회사 이름으로 먼저 가입한 '마스터' 유저가 있는지 확인
    const masterUser = await db.user.findFirst({
      where: { companyName: companyName, isMaster: true },
      orderBy: { createdAt: 'asc' },
      include: { onePager: true }
    });

    // 마스터가 없으면 내가 해당 회사의 첫 번째 가입자(Master 권한 부여 대상)가 됨
    const isFirstUser = !masterUser;

    let isMaster = false;
    let approvalStatus = "PENDING"; 

    if (role === "SELLER") {
      if (isFirstUser) {
        isMaster = true;
        approvalStatus = "APPROVED";
      } else {
        isMaster = false;
        approvalStatus = "PENDING"; 
      }
    } else if (role === "BUYER") {
      isMaster = isFirstUser; 
      approvalStatus = "PENDING"; 
    }

    // 유저 생성
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
        isMaster: isMaster,
        approvalStatus: approvalStatus
      }
    });

    // SELLER인 경우 원페이저 생성 로직
    if (role === "SELLER") {
      if (masterUser && masterUser.onePager) {
        await db.onePager.create({
          data: {
            userId: newUser.id,
            companyNameKr: masterUser.onePager.companyNameKr || "",
            companyNameEn: masterUser.onePager.companyNameEn || "",
            ceoName: masterUser.onePager.ceoName || "", 
            picName: name, 
            picTitle: jobTitle, 
            contactEmail: email, 
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