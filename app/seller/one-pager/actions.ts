"use server"

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

// ─── 서버 액션 내부에서 locale을 읽어 에러 메시지를 이원화 ───
async function getLocale(): Promise<"ko" | "en"> {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value;
    return locale === "en" ? "en" : "ko";
  } catch {
    return "ko";
  }
}

const ERROR_MSG = {
  ko: {
    noPermission: "권한이 없습니다.",
    userNotFound: "유저 정보를 찾을 수 없습니다.",
    uploadFail: "파일 업로드 실패: ",
    dbError: "데이터베이스 저장 중 오류가 발생했습니다.",
  },
  en: {
    noPermission: "You do not have permission.",
    userNotFound: "User information not found.",
    uploadFail: "File upload failed: ",
    dbError: "An error occurred while saving to the database.",
  },
} as const;

export async function saveOnePager(formData: FormData) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const msg = ERROR_MSG[locale];

  if (!session?.user || (session.user as any).role !== "SELLER") {
    return { error: msg.noPermission };
  }

  const userId = Number((session.user as any).id);
  const file = formData.get("pitchDeckFile") as File;
  let pitchDeckUrl = formData.get("pitchDeckUrl") as string;

  // 1. 파일 업로드 로직
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const safeName = file.name
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const filename = `${userId}_${Date.now()}_${safeName || 'pitchdeck'}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pitchdecks')
      .upload(filename, file, { upsert: true });

    if (uploadError) {
      console.error("파일 업로드 에러:", uploadError.message);
      return { error: msg.uploadFail + uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage.from('pitchdecks').getPublicUrl(filename);
    pitchDeckUrl = publicUrl;
  }

  // 현재 유저의 회사 정보를 먼저 가져옵니다.
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { companyName: true }
  });

  if (!currentUser) return { error: msg.userNotFound };

  // 2. 데이터 분류
  // A. 모든 회사 동료가 공유할 '비즈니스 정보'
  const sharedBusinessData = {
    companyNameKr:   (formData.get("companyNameKr")   as string) || "",
    companyNameEn:   (formData.get("companyNameEn")   as string) || "",
    ceoName:         (formData.get("ceoName")         as string) || "",
    ceoNameEn:       (formData.get("ceoNameEn")       as string) || "",
    productType:     (formData.get("productType")     as string) || "",
    solutionSummary: (formData.get("solutionSummary") as string) || "",
    problem:         (formData.get("problem")         as string) || "",
    solution:        (formData.get("solution")        as string) || "",
    traction:        (formData.get("traction")        as string) || "",
    bizModel:        (formData.get("bizModel")        as string) || "",
    primaryTech:     (formData.get("primaryTech")     as string) || "",
    industrySector:  (formData.get("industrySector")  as string) || "",
    yearFounded:     (formData.get("yearFounded")     as string) || "",
    investmentStage: (formData.get("investmentStage") as string) || "",
    monthlyRevenue:  (formData.get("monthlyRevenue")  as string) || "",
    pitchDeckUrl:    pitchDeckUrl || "",
  };

  // B. 가입자 본인만 가질 '개인 담당자 정보'
  const personalPicData = {
    picName:      (formData.get("picName")      as string) || "",
    picNameEn:    (formData.get("picNameEn")    as string) || "",   // ✅ 추가
    picTitle:     (formData.get("picTitle")     as string) || "",
    picTitleEn:   (formData.get("picTitleEn")   as string) || "",   // ✅ 추가
    contactEmail: (formData.get("contactEmail") as string) || "",
  };

  try {
    // 1. 본인의 원페이저를 먼저 업데이트 또는 생성합니다. (개인정보 포함)
    await db.onePager.upsert({
      where: { userId },
      update: { ...sharedBusinessData, ...personalPicData },
      create: { ...sharedBusinessData, ...personalPicData, userId },
    });

    // 2. 동일한 회사명을 가진 모든 유저의 ID를 찾습니다.
    const companyMembers = await db.user.findMany({
      where: { companyName: currentUser.companyName },
      select: { id: true }
    });

    const memberIds = companyMembers.map(m => m.id).filter(id => id !== userId);

    // 3. 동일 회사의 다른 멤버들의 원페이저도 비즈니스 정보만 동일하게 업데이트합니다.
    if (memberIds.length > 0) {
      await db.onePager.updateMany({
        where: { userId: { in: memberIds } },
        data: sharedBusinessData,
      });
    }

    revalidatePath("/seller/one-pager");
    revalidatePath("/seller");
    return { success: true };
  } catch (error) {
    console.error("DB 저장 오류:", error);
    return { error: msg.dbError };
  }
}