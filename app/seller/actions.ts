"use server";

import { db } from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// 1. 미팅 신청
export async function applyMeetingAction(formData: FormData, sellerId: number) {
  const slotId = Number(formData.get("slotId"));
  const buyerId = Number(formData.get("buyerId"));
  const proposal = formData.get("proposal") as string;

  await db.meeting.create({
    data: { 
      timeSlotId: slotId, 
      buyerId, 
      sellerId, 
      proposal, 
      status: "PENDING" 
    }
  });

  revalidatePath("/seller");
}

// 2. 멤버 승인/거절 처리 (마스터 전용)
export async function handleMemberStatus(memberId: number, status: "APPROVED" | "REJECTED", reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };
  
  const masterId = Number((session.user as any).id);
  const master = await db.user.findUnique({ where: { id: masterId } });

  if (!master?.isMaster) return { error: "권한이 없습니다." };

  const dataToUpdate: any = { approvalStatus: status };
  if (status === "REJECTED") {
    dataToUpdate.rejectionReason = reason || null; // 거절 사유 저장
  } else if (status === "APPROVED") {
    dataToUpdate.rejectionReason = null; // 승인 시 거절 사유 초기화
  }

  await db.user.update({
    where: { id: memberId },
    data: dataToUpdate
  });

  // 승인 시 마스터의 비즈니스 정보를 멤버에게 동기화
  if (status === "APPROVED") {
    const masterOP = await db.onePager.findUnique({ where: { userId: masterId } });
    if (masterOP) {
      const member = await db.user.findUnique({ where: { id: memberId } });
      const { id, userId, picName, picTitle, contactEmail, ...bizData } = masterOP;
      
      await db.onePager.upsert({
        where: { userId: memberId },
        update: { ...bizData },
        create: { 
          ...bizData, 
          userId: memberId, 
          picName: member!.name, 
          picTitle: member!.jobTitle, 
          contactEmail: member!.email 
        }
      });
    }
  }
  
  revalidatePath("/seller");
  return { success: true };
}

// 3. 마스터 권한 위임
export async function transferMasterRole(newMasterId: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };
  
  const currentUserId = Number((session.user as any).id);

  try {
    await db.$transaction([
      db.user.update({ where: { id: currentUserId }, data: { isMaster: false } }),
      db.user.update({ where: { id: newMasterId }, data: { isMaster: true, approvalStatus: "APPROVED" } })
    ]);
    
    revalidatePath("/seller");
    return { success: true };
  } catch (e) {
    return { error: "권한 위임 중 오류 발생" };
  }
}

// 4. 거절된 유저 정보 수정 및 재신청 (👇 사업자등록번호 업데이트 추가)
export async function reRequestApprovalAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };
  
  const userId = Number((session.user as any).id);

  const name = formData.get("name") as string;
  const jobTitle = formData.get("jobTitle") as string;
  const phone = formData.get("phone") as string;
  const companyName = formData.get("companyName") as string;
  const businessNumber = formData.get("businessNumber") as string; // 👈 추가됨
  const userType = formData.get("userType") as string;
  const userTypeDetail = formData.get("userTypeDetail") as string;
  const preferredPartners = formData.get("preferredPartners") as string;

  if (!name || !jobTitle || !phone || !companyName) {
    return { error: "필수 정보를 모두 입력해주세요." };
  }
  
  try {
    await db.user.update({
      where: { id: userId },
      data: { 
        name,
        jobTitle,
        phone,
        companyName,
        businessNumber: businessNumber || null, // 👈 추가됨
        userType,
        userTypeDetail,
        preferredPartners,
        approvalStatus: "PENDING",
        rejectionReason: null 
      }
    });
    
    revalidatePath("/seller");
    return { success: true };
  } catch (error) {
    console.error("재신청 오류:", error);
    return { error: "정보 수정 및 재신청 처리 중 오류가 발생했습니다." };
  }
}

// 5. 원페이저 저장 및 전사 동기화
export async function saveOnePager(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SELLER") return { error: "권한이 없습니다." };

  const userId = Number((session.user as any).id);
  const file = formData.get("pitchDeckFile") as File;
  let pitchDeckUrl = formData.get("pitchDeckUrl") as string;

  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const safeName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/\s/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const filename = `${userId}_${Date.now()}_${safeName || 'pitchdeck'}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('pitchdecks').upload(filename, file, { upsert: true });
    if (uploadError) return { error: "파일 업로드 실패" };
    
    const { data: { publicUrl } } = supabase.storage.from('pitchdecks').getPublicUrl(filename);
    pitchDeckUrl = publicUrl;
  }

  const currentUser = await db.user.findUnique({ where: { id: userId }, select: { companyName: true } });
  
  const sharedBusinessData = {
    companyNameKr: (formData.get("companyNameKr") as string) || "",
    companyNameEn: (formData.get("companyNameEn") as string) || "",
    ceoName: (formData.get("ceoName") as string) || "",
    productType: (formData.get("productType") as string) || "",
    solutionSummary: (formData.get("solutionSummary") as string) || "",
    problem: (formData.get("problem") as string) || "",
    solution: (formData.get("solution") as string) || "",
    traction: (formData.get("traction") as string) || "",
    bizModel: (formData.get("bizModel") as string) || "",
    primaryTech: (formData.get("primaryTech") as string) || "",
    industrySector: (formData.get("industrySector") as string) || "",
    yearFounded: (formData.get("yearFounded") as string) || "",
    investmentStage: (formData.get("investmentStage") as string) || "",
    monthlyRevenue: (formData.get("monthlyRevenue") as string) || "",
    pitchDeckUrl: pitchDeckUrl || "",
  };

  const personalPicData = {
    picName: (formData.get("picName") as string) || "",
    picTitle: (formData.get("picTitle") as string) || "",
    contactEmail: (formData.get("contactEmail") as string) || "",
  };

  try {
    await db.onePager.upsert({
      where: { userId },
      update: { ...sharedBusinessData, ...personalPicData },
      create: { ...sharedBusinessData, ...personalPicData, userId },
    });

    const companyMembers = await db.user.findMany({
      where: { companyName: currentUser!.companyName, approvalStatus: "APPROVED" },
      select: { id: true }
    });

    const memberIds = companyMembers.map(m => m.id).filter(id => id !== userId);
    
    if (memberIds.length > 0) {
      await db.onePager.updateMany({
        where: { userId: { in: memberIds } },
        data: sharedBusinessData
      });
    }

    revalidatePath("/seller");
    return { success: true };
  } catch (error) {
    return { error: "저장 중 오류 발생" };
  }
}

// 👇 [추가됨] 6. 유사 회사명 존재 여부 확인 (재신청 폼에서 사용)
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
        businessNumber: true,
      },
    });

    // 중복 회사명 제거
    const uniqueCompanies = Array.from(new Map(existingCompanies.map(item => [item.companyName, item])).values());
    return uniqueCompanies;
  } catch (e) {
    console.error("회사 검색 에러:", e);
    return[];
  }
}

// 👇 [추가됨] 7. 사업자등록번호로 동일 회사 존재 여부 확인 (재신청 폼에서 사용)
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