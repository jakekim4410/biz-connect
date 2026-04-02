"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// 1. 유사 회사명 존재 여부 확인 — 마스터 이름(한글/영문) + 회사 영문명 포함
export async function checkExistingCompanyAction(companyName: string) {
  if (!companyName || companyName.length < 2) return [];
  try {
    const existingCompanies = await db.user.findMany({
      where: {
        companyName: { contains: companyName, mode: 'insensitive' },
        isMaster: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        companyName: true,
        companyNameEn: true,
        name: true,
        nameEn: true,
        role: true,
        onePager: true,
        businessNumber: true,
      },
    });
    return Array.from(new Map(existingCompanies.map(item => [item.companyName, item])).values());
  } catch (e) {
    console.error("회사 검색 에러:", e);
    return [];
  }
}

// 2. 사업자등록번호로 동일 회사 존재 여부 확인
export async function checkExistingBusinessNumberAction(businessNumber: string) {
  if (!businessNumber || businessNumber.length < 5) return null;
  try {
    return await db.user.findFirst({
      where: { businessNumber },
      orderBy: { createdAt: 'asc' },
      select: { companyName: true, name: true, role: true },
    });
  } catch (e) {
    console.error("사업자 검색 에러:", e);
    return null;
  }
}

// 3. 이메일 중복 확인
export async function checkExistingEmailAction(email: string) {
  if (!email) return false;
  try {
    const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
    return !!existingUser;
  } catch (e) {
    console.error("이메일 중복 확인 에러:", e);
    return false;
  }
}

// 4. 회원가입 처리
export async function registerUserAction(formData: FormData) {
  const email             = formData.get("email") as string;
  const phone             = formData.get("phone") as string;
  const password          = formData.get("password") as string;
  const name              = formData.get("name") as string;
  const nameEn            = formData.get("nameEn") as string || "";
  let   companyName       = formData.get("companyName") as string;
  const companyNameEn     = formData.get("companyNameEn") as string || "";
  const ceoNameKo         = formData.get("ceoNameKo") as string || "";
  const ceoNameEn         = formData.get("ceoNameEn") as string || "";
  const jobTitle          = formData.get("jobTitle") as string;
  const jobTitleEn        = formData.get("jobTitleEn") as string || "";   // ✅ 추가
  const role              = formData.get("role") as string;
  const userType          = formData.get("userType") as string;
  const userTypeDetail    = formData.get("userTypeDetail") as string;
  const preferredPartners = formData.get("preferredPartners") as string;
  const businessNumber    = formData.get("businessNumber") as string;
  const privacyConsent    = formData.get("privacyConsent") === "true";
  const isMasterFlow      = formData.get("isMasterFlow") === "true";

  // SELLER 전용 필드
  const industrySector    = formData.get("industrySector") as string || "";
  const primaryTech       = formData.get("primaryTech") as string || "";
  const investmentStage   = formData.get("investmentStage") as string || "";
  const yearFounded       = formData.get("yearFounded") as string || "";
  const linkedinUrl       = formData.get("linkedinUrl") as string || "";

  // 필수값 검사
  if (!email || !phone || !password || !name || !companyName) {
    return { error: "필수 정보를 모두 입력해주세요." };
  }
  if (!privacyConsent) {
    return { error: "개인정보 처리방침에 동의해주세요." };
  }
  if (role === "SELLER" && businessNumber === "" && formData.get("bizNumRequired") === "true") {
    return { error: "스타트업(SELLER)은 사업자등록번호를 반드시 입력해야 합니다." };
  }

  try {
    // 사업자번호로 기존 회사 조회
    let existingCompanyRecord = null;
    if (role === "SELLER" && businessNumber) {
      existingCompanyRecord = await db.user.findFirst({
        where: { businessNumber },
        orderBy: { createdAt: 'asc' },
      });
      if (existingCompanyRecord) companyName = existingCompanyRecord.companyName;
    }

    // 회사명으로 기존 회사 조회
    if (!existingCompanyRecord) {
      existingCompanyRecord = await db.user.findFirst({
        where: { companyName },
        orderBy: { createdAt: 'asc' },
      });
    }

    // 역할 충돌 검사
    if (existingCompanyRecord && existingCompanyRecord.role !== role) {
      const roleName = existingCompanyRecord.role === "BUYER" ? "투자자(BUYER)" : "스타트업(SELLER)";
      return { error: `[가입 불가] '${companyName}'은(는) 이미 ${roleName}로 등록된 회사입니다.` };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 마스터 유저 조회
    const masterUser = await db.user.findFirst({
      where: { companyName, isMaster: true },
      orderBy: { createdAt: 'asc' },
      include: { onePager: true },
    });
    const isFirstUser = !masterUser;

    // isMaster / approvalStatus 결정
    let isMaster = false;
    let approvalStatus = "PENDING";
    if (role === "SELLER") {
      isMaster = isFirstUser;
      approvalStatus = isFirstUser ? "APPROVED" : "PENDING";
    } else if (role === "BUYER") {
      isMaster = isFirstUser;
      approvalStatus = "PENDING";
    }

    // 회사 정보: 마스터면 직접 입력값, 멤버면 마스터 데이터 상속
    const finalCompanyNameEn = isMasterFlow ? companyNameEn : (masterUser?.companyNameEn ?? "");
    const finalCeoNameKo     = isMasterFlow ? ceoNameKo     : (masterUser?.ceoNameKo ?? "");
    const finalCeoNameEn     = isMasterFlow ? ceoNameEn     : (masterUser?.ceoNameEn ?? "");

    // 유저 생성
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        nameEn,
        companyName,
        companyNameEn: finalCompanyNameEn,
        ceoNameKo: finalCeoNameKo,
        ceoNameEn: finalCeoNameEn,
        businessNumber: businessNumber || null,
        jobTitle,
        jobTitleEn,        // ✅ 추가
        phone,
        privacyConsent,
        role,
        userType,
        userTypeDetail,
        preferredPartners,
        isMaster,
        approvalStatus,
        industrySector,
        primaryTech,
        investmentStage,
        yearFounded,
        linkedinUrl,
      },
    });

    // SELLER OnePager 자동 생성
    if (role === "SELLER") {
      if (masterUser?.onePager) {
        // 기존 마스터의 OnePager 데이터를 복사해서 신규 멤버 OnePager 생성
        await db.onePager.create({
          data: {
            userId:          newUser.id,
            companyNameKr:   masterUser.onePager.companyNameKr   || "",
            companyNameEn:   masterUser.onePager.companyNameEn   || finalCompanyNameEn,
            ceoName:         masterUser.onePager.ceoName         || finalCeoNameKo,
            ceoNameEn:       masterUser.onePager.ceoNameEn       || finalCeoNameEn,
            picName:         name,
            picNameEn:       nameEn,
            picTitle:        jobTitle,
            picTitleEn:      jobTitleEn,   // ✅ 추가
            contactEmail:    email,
            productType:     masterUser.onePager.productType     || "",
            solutionSummary: masterUser.onePager.solutionSummary || "",
            problem:         masterUser.onePager.problem         || "",
            solution:        masterUser.onePager.solution        || "",
            traction:        masterUser.onePager.traction        || "",
            bizModel:        masterUser.onePager.bizModel        || "",
            primaryTech:     masterUser.onePager.primaryTech     || "",
            industrySector:  masterUser.onePager.industrySector  || "",
            yearFounded:     masterUser.onePager.yearFounded     || "",
            investmentStage: masterUser.onePager.investmentStage || "",
            monthlyRevenue:  masterUser.onePager.monthlyRevenue  || "",
            pitchDeckUrl:    masterUser.onePager.pitchDeckUrl    || "",
          },
        });
      } else {
        // 마스터 최초 가입 시 — 회원가입 입력값으로 OnePager 초기화
        await db.onePager.create({
          data: {
            userId:         newUser.id,
            companyNameKr:  companyName,
            companyNameEn:  finalCompanyNameEn,
            ceoName:        finalCeoNameKo,
            ceoNameEn:      finalCeoNameEn,
            picName:        name,
            picNameEn:      nameEn,
            picTitle:       jobTitle,
            picTitleEn:     jobTitleEn,   // ✅ 추가
            contactEmail:   email,
            industrySector,
            primaryTech,
            investmentStage,
            yearFounded,
            linkedinUrl,
          },
        });
      }
    }

    return { success: true, role: newUser.role, approvalStatus: newUser.approvalStatus };

  } catch (e: any) {
    console.error("DB 저장 에러:", e);
    if (e.code === 'P2002') return { error: "이미 가입된 이메일입니다." };
    return { error: "데이터 저장 중 오류가 발생했습니다." };
  }
}