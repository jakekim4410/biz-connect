"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUserData() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = Number((session.user as any).id);
  return await db.user.findUnique({
    where: { id: userId },
    include: { onePager: true },
  });
}

export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "로그인이 필요합니다." };

  const userId = Number((session.user as any).id);

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { isMaster: true, companyName: true, role: true, password: true },
  });
  if (!currentUser) return { success: false, error: "유저를 찾을 수 없습니다." };

  // ── 개인정보 (마스터/멤버 공통) ──
  const name        = formData.get("name") as string;
  const nameEn      = formData.get("nameEn") as string;
  const phone       = formData.get("phone") as string;
  const jobTitle    = formData.get("jobTitle") as string;
  const jobTitleEn  = formData.get("jobTitleEn") as string;
  const userType    = formData.get("userType") as string;
  const userTypeDetail = formData.get("userTypeDetail") as string | null;
  const preferredPartners = formData.get("preferredPartners") as string;
  const linkedinUrl = formData.get("linkedinUrl") as string;

  // ── 비밀번호 변경 (선택) ──
  const newPassword = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  let hashedPassword: string | undefined;
  if (newPassword && newPassword.length >= 8) {
    if (newPassword !== confirmPassword)
      return { success: false, error: "비밀번호가 일치하지 않습니다." };
    hashedPassword = await bcrypt.hash(newPassword, 12);
  }

  // ── 개인정보 업데이트 데이터 ──
  const personalData: any = {
    name,
    nameEn,
    phone,
    jobTitle,
    jobTitleEn,
    userType: userType === "기타" || userType === "Other"
      ? (userTypeDetail || userType)
      : userType,
    preferredPartners,
    linkedinUrl,
  };
  if (hashedPassword) personalData.password = hashedPassword;

  // ── 마스터 전용: 회사 공통정보 + onePager ──
  const isMasterOrAdmin =
    currentUser.role === "ADMIN" || currentUser.isMaster;

  try {
    if (isMasterOrAdmin) {
      // ── 회사 기본정보 (User 테이블) ──
      const newCompanyName   = formData.get("companyName") as string;
      const companyNameEn    = formData.get("companyNameEn") as string;
      const ceoNameKo        = formData.get("ceoNameKo") as string;
      const ceoNameEn        = formData.get("ceoNameEn") as string;
      const bizNumber        = formData.get("businessNumber") as string;
      const industrySector   = formData.get("industrySector") as string;
      const primaryTech      = formData.get("primaryTech") as string;
      const investmentStage  = formData.get("investmentStage") as string;
      const yearFounded      = formData.get("yearFounded") as string;

      // ── onePager 필드 ──
      const onePagerData = {
        companyNameKr:  newCompanyName,
        companyNameEn,
        ceoName:        ceoNameKo,
        ceoNameEn,
        picName:        formData.get("picName") as string,
        picNameEn:      formData.get("picNameEn") as string,
        picTitle:       formData.get("picTitle") as string,
        picTitleEn:     formData.get("picTitleEn") as string,
        productType:    formData.get("productType") as string,
        solutionSummary: formData.get("solutionSummary") as string,
        problem:        formData.get("problem") as string,
        solution:       formData.get("solution") as string,
        traction:       formData.get("traction") as string,
        bizModel:       formData.get("bizModel") as string,
        primaryTech,
        industrySector,
        yearFounded,
        investmentStage,
        monthlyRevenue: formData.get("monthlyRevenue") as string,
        pitchDeckUrl:   formData.get("pitchDeckUrl") as string,
        contactEmail:   formData.get("contactEmail") as string,
        linkedinUrl,
      };

      await db.$transaction(async (tx) => {
        // 동일 회사 소속 전원 companyName 동기화
        if (newCompanyName && newCompanyName !== currentUser.companyName) {
          await tx.user.updateMany({
            where: { companyName: currentUser.companyName },
            data: { companyName: newCompanyName },
          });
        }
        // 본인 개인+회사 정보 업데이트
        await tx.user.update({
          where: { id: userId },
          data: {
            ...personalData,
            companyName:   newCompanyName,
            companyNameEn,
            ceoNameKo,
            ceoNameEn,
            businessNumber: bizNumber,
            industrySector,
            primaryTech,
            investmentStage,
            yearFounded,
          },
        });
        // onePager upsert (없으면 생성, 있으면 수정)
        await tx.onePager.upsert({
          where:  { userId },
          update: onePagerData,
          create: { userId, ...onePagerData },
        });
      });
    } else {
      // 멤버: 개인정보만 수정
      await db.user.update({
        where: { id: userId },
        data: personalData,
      });
    }

    revalidatePath("/seller");
    revalidatePath("/buyer");
    return { success: true };
  } catch (e) {
    console.error("Profile Update Error:", e);
    return { success: false, error: "업데이트 중 오류가 발생했습니다." };
  }
}