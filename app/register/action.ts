"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// 1. 유사 회사명 존재 여부 확인
export async function checkExistingCompanyAction(companyName: string) {
  if (!companyName || companyName.length < 2) return[];

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
        role: true, 
        onePager: true, 
        businessNumber: true, 
      },
    });

    const uniqueCompanies = Array.from(new Map(existingCompanies.map(item => [item.companyName, item])).values());
    return uniqueCompanies;
  } catch (e) {
    console.error("회사 검색 에러:", e);
    return[];
  }
}

// 2. 사업자등록번호로 동일 회사 존재 여부 확인
export async function checkExistingBusinessNumberAction(businessNumber: string) {
  if (!businessNumber || businessNumber.length < 10) return null;

  try {
    const existingCompany = await db.user.findFirst({
      where: { businessNumber: businessNumber },
      orderBy: { createdAt: 'asc' },
      select: {
        companyName: true,
        name: true,
        role: true,
      },
    });
    return existingCompany;
  } catch (e) {
    console.error("사업자 검색 에러:", e);
    return null;
  }
}

// 3. 이메일 중복 존재 여부 확인
export async function checkExistingEmailAction(email: string) {
  if (!email) return false;

  try {
    const existingUser = await db.user.findUnique({
      where: { email: email },
      select: { id: true }
    });
    return !!existingUser; 
  } catch (e) {
    console.error("이메일 중복 확인 에러:", e);
    return false;
  }
}

// 4. 회원가입 처리
export async function registerUserAction(formData: FormData) {
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string; 
  let companyName = formData.get("companyName") as string; 
  const jobTitle = formData.get("jobTitle") as string; 
  const role = formData.get("role") as string; 
  const userType = formData.get("userType") as string;
  const userTypeDetail = formData.get("userTypeDetail") as string;
  const preferredPartners = formData.get("preferredPartners") as string;
  const businessNumber = formData.get("businessNumber") as string;

  if (!email || !phone || !password || !name || !companyName) {
    return { error: "필수 정보를 모두 입력해주세요." };
  }

  if (role === "SELLER" && !businessNumber) {
    return { error: "스타트업(SELLER)은 사업자등록번호를 반드시 입력해야 합니다." };
  }

  try {
    let existingCompanyRecord = null;

    if (role === "SELLER" && businessNumber) {
      existingCompanyRecord = await db.user.findFirst({
        where: { businessNumber: businessNumber },
        orderBy: { createdAt: 'asc' },
      });

      if (existingCompanyRecord) {
        companyName = existingCompanyRecord.companyName;
      }
    }

    if (!existingCompanyRecord) {
      existingCompanyRecord = await db.user.findFirst({
        where: { companyName: companyName },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (existingCompanyRecord && existingCompanyRecord.role !== role) {
      const roleName = existingCompanyRecord.role === "BUYER" ? "투자자(BUYER)" : "스타트업(SELLER)";
      return { error: `[가입 불가] '${companyName}'은(는) 이미 ${roleName}로 등록된 회사입니다. 동일한 계정 유형으로만 가입 가능합니다.` };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const masterUser = await db.user.findFirst({
      where: { companyName: companyName, isMaster: true },
      orderBy: { createdAt: 'asc' },
      include: { onePager: true }
    });

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

    const newUser = await db.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        companyName, 
        businessNumber: businessNumber || null,
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

    return { success: true, role: newUser.role, approvalStatus: newUser.approvalStatus };

  } catch (e: any) {
    console.error("DB 저장 에러:", e);
    if (e.code === 'P2002') {
      return { error: "이미 가입된 이메일입니다." };
    }
    return { error: "데이터 저장 중 오류가 발생했습니다." };
  }
}