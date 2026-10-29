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

/**
 * 대용량(최대 50MB) 피치덱 파일을 브라우저에서 Supabase Storage로 직접 업로드할 수 있도록
 * 사전 서명된 업로드 URL(Signed Upload URL)을 발급합니다.
 * Next.js Server Action의 1MB 제한 및 서버리스 타임아웃/페이로드 한도를 우회합니다.
 */
export async function getPitchDeckUploadUrl(originalFilename: string) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const msg = ERROR_MSG[locale];

  if (!session?.user || (session.user as any).role !== "SELLER") {
    return { success: false, error: msg.noPermission };
  }

  const userId = Number((session.user as any).id);
  const isPdf = originalFilename.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { 
      success: false, 
      error: locale === "ko" ? "PDF 파일만 업로드 가능합니다." : "Only PDF files are allowed." 
    };
  }

  const lastDotIndex = originalFilename.lastIndexOf(".");
  const baseName = lastDotIndex !== -1 ? originalFilename.substring(0, lastDotIndex) : originalFilename;
  const safeName = baseName
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const filename = `${userId}_${Date.now()}_${safeName || "pitchdeck"}.pdf`;

  try {
    const { data, error } = await supabase.storage
      .from("pitchdecks")
      .createSignedUploadUrl(filename, { upsert: true });

    if (error || !data) {
      console.error("Signed URL 생성 에러:", error?.message);
      return { success: false, error: msg.uploadFail + (error?.message || "Failed to create upload URL") };
    }

    const { data: { publicUrl } } = supabase.storage.from("pitchdecks").getPublicUrl(filename);

    return {
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: filename,
      publicUrl,
    };
  } catch (err: any) {
    console.error("Signed URL 예외 발생:", err);
    return { success: false, error: msg.uploadFail + (err?.message || "Storage error") };
  }
}

export async function saveOnePager(formData: FormData) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const msg = ERROR_MSG[locale];

  if (!session?.user || (session.user as any).role !== "SELLER") {
    return { error: msg.noPermission };
  }

  const userId = Number((session.user as any).id);
  const file = formData.get("pitchDeckFile") as File | null;
  let pitchDeckUrl = (formData.get("pitchDeckUrl") as string) || "";

  // 1. 파일 업로드 로직 (클라이언트에서 직접 업로드되지 않고 파일이 넘어온 경우의 Fallback)
  if (file && typeof file !== "string" && file.size > 0) {
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type.includes("pdf"));
    if (!isPdf) {
      return { error: locale === "ko" ? "PDF 파일만 업로드 가능합니다." : "Only PDF files are allowed." };
    }

    const lastDotIndex = file.name.lastIndexOf(".");
    const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
    const safeName = baseName
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    const filename = `${userId}_${Date.now()}_${safeName || "pitchdeck"}.pdf`;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pitchdecks")
        .upload(filename, buffer, { 
          contentType: "application/pdf",
          upsert: true 
        });

      if (uploadError) {
        console.error("파일 업로드 에러:", uploadError.message);
        return { error: msg.uploadFail + uploadError.message };
      }

      const { data: { publicUrl } } = supabase.storage.from("pitchdecks").getPublicUrl(filename);
      pitchDeckUrl = publicUrl;
    } catch (uploadException: any) {
      console.error("서버 업로드 예외:", uploadException);
      return { error: msg.uploadFail + (uploadException?.message || "") };
    }
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
    picNameEn:    (formData.get("picNameEn")    as string) || "",
    picTitle:     (formData.get("picTitle")     as string) || "",
    picTitleEn:   (formData.get("picTitleEn")   as string) || "",
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

    const memberIds = companyMembers.map((m: any) => m.id).filter((id: any) => id !== userId);

    // 3. 동일 회사의 다른 멤버들의 원페이저를 upsert (없으면 생성, 있으면 업데이트)
    //    이렇게 해야 원페이저가 없던 멤버도 배너가 사라진다.
    for (const memberId of memberIds) {
      await db.onePager.upsert({
        where: { userId: memberId },
        update: sharedBusinessData,
        create: {
          ...sharedBusinessData,
          userId: memberId,
          picName: "",
          picNameEn: "",
          picTitle: "",
          picTitleEn: "",
          contactEmail: "",
        },
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
