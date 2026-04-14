"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendApprovalCompletedEmail, sendDirectRequestEmail, sendJoinRejectedEmail, sendMeetingConfirmationEmails } from "@/lib/email";
import { Locale } from "@/lib/i18n";

const SELLER_REJECTION_REASONS = {
  ko: {
    matchedOther: "타기업 매칭",
    cancelledBySeller: "셀러가 예약을 취소하였습니다.",
    defaultReason: "사유가 입력되지 않았습니다.",
  },
  en: {
    matchedOther: "Matched with another company",
    cancelledBySeller: "The seller has cancelled the reservation.",
    defaultReason: "No reason provided.",
  }
};

// 1. 미팅 신청 (일반 예약 & 다이렉트 제안 포함)
export async function applyMeetingAction(formData: FormData, sellerId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "로그인이 필요합니다." };

    let slotId = Number(formData.get("slotId"));
    let buyerId = Number(formData.get("buyerId"));
    const buyerCompanyName = formData.get("buyerCompanyName") as string;
    const proposal = formData.get("proposal") as string;
    const picIdStr = formData.get("picId") as string;
    const picId = picIdStr ? Number(picIdStr) : null;

    // 1. 바이어 정보 보정 (AI 검색 등에서 buyerId가 -1인 경우)
    if (buyerId === -1) {
      if (!buyerCompanyName) {
        return { error: "회사명 정보가 부족합니다." };
      }
      let buyer = await db.user.findFirst({
        where: { role: "BUYER", companyName: buyerCompanyName, isMaster: true }
      }) || await db.user.findFirst({
        where: { role: "BUYER", companyName: buyerCompanyName }
      });

      if (!buyer) {
        // 정규화 매칭 시도
        const allBuyers = await db.user.findMany({ where: { role: "BUYER" } });
        const { normalizeCompanyName } = await import("@/lib/matchUtils");
        const normalizedInput = normalizeCompanyName(buyerCompanyName);
        buyer = allBuyers.find(u => normalizeCompanyName(u.companyName) === normalizedInput) || null;
      }

      if (!buyer) {
        return { error: "해당 바이어를 찾을 수 없습니다." };
      }
      buyerId = buyer.id;
    }

    // 2. 다이렉트 미팅 제안 (slotId === -1)
    if (slotId === -1) {
      await db.meeting.create({
        data: {
          buyerId,
          sellerId,
          proposal,
          status: "PENDING",
          meetingType: "DIRECT_REQUEST",
          picId,
        }
      });

      // 알림 메일 전송
      const buyer = await db.user.findUnique({ where: { id: buyerId } });
      if (buyer) {
        sendDirectRequestEmail(
          buyer.email,
          buyer.companyName || buyer.name,
          (session?.user as any).name || "셀러 파트너",
          proposal,
          buyer.preferredLanguage || "ko"
        );
      }

      revalidatePath("/seller");
      return { success: true };
    }

    // 3. 일반 미팅 신청 (slotId > 0)
    const slot = await db.timeSlot.findUnique({
      where: { id: slotId },
      select: { startTime: true }
    });

    if (!slot) {
      return { error: "존재하지 않는 슬롯입니다." };
    }

    if (slot.startTime < new Date()) {
      return { error: "이미 활동 시간이 지난 슬롯입니다." };
    }

    await db.meeting.create({
      data: { 
        timeSlotId: slotId, 
        buyerId, 
        sellerId, 
        proposal, 
        status: "PENDING",
        meetingType: "REGULAR",
        picId
      }
    });

    revalidatePath("/seller");
    return { success: true };

  } catch (error) {
    console.error("미팅 신청 오류:", error);
    return { error: "미팅 신청 처리 중 오류가 발생했습니다." };
  }
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
    dataToUpdate.rejectionReason = reason || null; 
  } else if (status === "APPROVED") {
    dataToUpdate.rejectionReason = null; 
  }

  await db.user.update({
    where: { id: memberId },
    data: dataToUpdate
  });

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
  
  if (status === "APPROVED") {
    const member = await db.user.findUnique({ where: { id: memberId } });
    if (member) {
      await sendApprovalCompletedEmail(member.email, member.name, (member as any).preferredLanguage || "ko");
    }
  } else if (status === "REJECTED") {
    const member = await db.user.findUnique({ where: { id: memberId } });
    if (member && master) {
      await sendJoinRejectedEmail(
        member.email,
        member.name,
        master.name,
        master.companyName || "BizConnect",
        reason,
        (member as any).preferredLanguage || "ko"
      );
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

// 4. 거절된 유저 정보 수정 및 재신청
export async function reRequestApprovalAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };
  
  const userId = Number((session.user as any).id);

  const name = formData.get("name") as string;
  const jobTitle = formData.get("jobTitle") as string;
  const phone = formData.get("phone") as string;
  const companyName = formData.get("companyName") as string;
  const businessNumber = formData.get("businessNumber") as string; 
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
        businessNumber: businessNumber || null, 
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

// 6. 유사 회사명 존재 여부 확인 (재신청 폼에서 사용)
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

    const uniqueCompanies = Array.from(new Map(existingCompanies.map(item => [item.companyName, item])).values());
    return uniqueCompanies;
  } catch (e) {
    console.error("회사 검색 에러:", e);
    return[];
  }
}

// 7. 사업자등록번호로 동일 회사 존재 여부 확인 (재신청 폼에서 사용)
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

// ==========================================
// 셀러 슬롯 관리 액션들
// ==========================================

// S1. 셀러 슬롯 생성
export async function createSellerSlotAction(formData: FormData, sellerId: number) {
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const location = formData.get("location") as string;
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  const existing = await db.timeSlot.findFirst({
    where: {
      sellerId,
      startTime,
      status: { not: "CANCELED" },
    },
  });

  if (existing) {
    return { success: false, error: "이미 동일한 시간에 개설된 슬롯이 있습니다. 다른 시간을 선택해주세요." };
  }

  await db.timeSlot.create({
    data: { startTime, endTime, sellerId, description, location, slotOwner: "SELLER" }
  });
  revalidatePath("/seller");
  return { success: true };
}

// S2. 셀러 슬롯 수정
export async function updateSellerSlotAction(slotId: number, formData: FormData) {
  const date = formData.get("date") as string;
  const hour = formData.get("hour") as string;
  const minute = formData.get("minute") as string;
  const location = formData.get("location") as string;
  const description = formData.get("description") as string;

  const startTime = new Date(`${date}T${hour}:${minute}:00`);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  const currentSlot = await db.timeSlot.findUnique({ where: { id: slotId } });

  const existing = await db.timeSlot.findFirst({
    where: {
      sellerId: currentSlot?.sellerId,
      startTime,
      status: { not: "CANCELED" },
      id: { not: slotId },
    },
  });

  if (existing) {
    return { success: false, error: "이미 동일한 시간에 개설된 슬롯이 있습니다. 다른 시간을 선택해주세요." };
  }

  await db.timeSlot.update({
    where: { id: slotId },
    data: { startTime, endTime, description, location }
  });
  revalidatePath("/seller");
  return { success: true };
}

// S3. 셀러 슬롯 취소
export async function deleteSellerSlotAction(slotId: number, locale: Locale = "ko") {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;
  const tReasons = SELLER_REJECTION_REASONS[locale] || SELLER_REJECTION_REASONS["ko"];

  await db.meeting.updateMany({
    where: { timeSlotId: slotId },
    data: {
      status: "REJECTED",
      rejectionReason: tReasons.cancelledBySeller,
      picId: currentUserId
    }
  });
  await db.timeSlot.update({
    where: { id: slotId },
    data: { status: "CANCELED" }
  });
  revalidatePath("/seller");
  revalidatePath("/buyer");
  return { success: true };
}

// S4. 셀러가 바이어 신청 승인/거절
export async function handleSellerSlotStatusAction(
  meetingId: number,
  slotId: number,
  action: string,
  rejectionReason?: string,
  locale: Locale = "ko"
) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? Number((session.user as any).id) : null;
  const tReasons = SELLER_REJECTION_REASONS[locale] || SELLER_REJECTION_REASONS["ko"];

  if (action === "ACCEPT") {
    const slot = await db.timeSlot.findUnique({ where: { id: slotId } });

    const confirmedMeeting = await db.meeting.update({
      where: { id: meetingId },
      data: {
        status: "CONFIRMED",
        location: slot?.location,
        picId: currentUserId
      },
      include: {
        buyer: true,
        seller: true,
        timeSlot: true,
      }
    });

    await db.meeting.updateMany({
      where: { timeSlotId: slotId, id: { not: meetingId } },
      data: {
        status: "REJECTED",
        rejectionReason: tReasons.matchedOther,
        picId: currentUserId
      }
    });
    await db.timeSlot.update({ where: { id: slotId }, data: { status: "CLOSED" } });

    if (confirmedMeeting.timeSlot?.startTime) {
      const meetingDateStr = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(confirmedMeeting.timeSlot.startTime);

      await sendMeetingConfirmationEmails({
        buyerEmail: confirmedMeeting.buyer?.email || "",
        buyerName: confirmedMeeting.buyer?.companyName || confirmedMeeting.buyer?.name || "바이어",
        sellerEmail: confirmedMeeting.seller?.email || "",
        sellerName: confirmedMeeting.seller?.companyName || confirmedMeeting.seller?.name || "셀러",
        meetingDate: meetingDateStr,
        location: confirmedMeeting.location || confirmedMeeting.timeSlot.location || "미지정",
        startTimeIso: confirmedMeeting.timeSlot.startTime.toISOString(),
        endTimeIso: confirmedMeeting.timeSlot.endTime.toISOString(),
      });
    }
  } else {
    await db.meeting.update({
      where: { id: meetingId },
      data: {
        status: "REJECTED",
        rejectionReason: rejectionReason || tReasons.defaultReason,
        picId: currentUserId
      }
    });
  }
  revalidatePath("/seller");
  revalidatePath("/buyer");
}

// S5. 셀러가 받은 다이렉트 제안 수락 (슬롯 매핑)
export async function acceptDirectMeetingAsSellerAction(meetingId: number, slotId: number, locale: Locale = "ko") {
  const tReasons = SELLER_REJECTION_REASONS[locale] || SELLER_REJECTION_REASONS["ko"];
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };

  try {
    const currentUserId = Number((session.user as any).id);
    const [confirmedMeeting] = await db.$transaction([
      db.meeting.update({
        where: { id: meetingId },
        data: {
          timeSlotId: slotId,
          picId: currentUserId,
          status: "CONFIRMED",
          rewardStatus: "PENDING_REWARD"
        },
        include: {
          buyer: true,
          seller: true,
          timeSlot: true,
        }
      }),
      db.meeting.updateMany({
        where: { timeSlotId: slotId, id: { not: meetingId } },
        data: { status: "REJECTED", rejectionReason: tReasons.matchedOther }
      }),
      db.timeSlot.update({
        where: { id: slotId },
        data: { status: "CLOSED" }
      })
    ]);

    if (confirmedMeeting.timeSlot?.startTime) {
      const meetingDateStr = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(confirmedMeeting.timeSlot.startTime);

      await sendMeetingConfirmationEmails({
        buyerEmail: confirmedMeeting.buyer?.email || "",
        buyerName: confirmedMeeting.buyer?.companyName || confirmedMeeting.buyer?.name || "바이어",
        sellerEmail: confirmedMeeting.seller?.email || "",
        sellerName: confirmedMeeting.seller?.companyName || confirmedMeeting.seller?.name || "셀러",
        meetingDate: meetingDateStr,
        location: confirmedMeeting.location || confirmedMeeting.timeSlot?.location || "미지정",
        startTimeIso: confirmedMeeting.timeSlot.startTime.toISOString(),
        endTimeIso: confirmedMeeting.timeSlot.endTime.toISOString(),
      });
    }

    revalidatePath("/seller");
    revalidatePath("/buyer");
    return { success: true };
  } catch (e) {
    console.error("Direct meeting acceptance error (seller):", e);
    return { error: "수락 처리 중 오류가 발생했습니다." };
  }
}

// S6. 셀러가 새로운 슬롯을 생성하며 다이렉트 제안 수락
export async function acceptDirectMeetingWithNewSlotAction(
  meetingId: number,
  slotData: {
    startTime: Date;
    endTime: Date;
    location: string;
    description?: string;
  },
  locale: Locale = "ko"
) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };

  try {
    const currentUserId = Number((session.user as any).id);
    
    // 트랜잭션으로 슬롯 생성 + 미팅 업데이트
    const [newSlot, confirmedMeeting] = await db.$transaction(async (tx) => {
      // 1. 슬롯 생성
      const slot = await tx.timeSlot.create({
        data: {
          sellerId: currentUserId,
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          location: slotData.location,
          description: slotData.description || "",
          status: "CLOSED", // 생성과 동시에 확정용이므로 CLOSED
          slotOwner: "SELLER",
        }
      });

      // 2. 미팅 업데이트
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          timeSlotId: slot.id,
          picId: currentUserId,
          status: "CONFIRMED",
          rewardStatus: "PENDING_REWARD"
        },
        include: {
          buyer: true,
          seller: true,
          timeSlot: true,
        }
      });

      return [slot, meeting];
    });

    if (confirmedMeeting.timeSlot?.startTime) {
      const meetingDateStr = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(confirmedMeeting.timeSlot.startTime);

      await sendMeetingConfirmationEmails({
        buyerEmail: confirmedMeeting.buyer?.email || "",
        buyerName: confirmedMeeting.buyer?.companyName || confirmedMeeting.buyer?.name || "바이어",
        sellerEmail: confirmedMeeting.seller?.email || "",
        sellerName: confirmedMeeting.seller?.companyName || confirmedMeeting.seller?.name || "셀러",
        meetingDate: meetingDateStr,
        location: confirmedMeeting.location || confirmedMeeting.timeSlot?.location || "미지정",
        startTimeIso: confirmedMeeting.timeSlot.startTime.toISOString(),
        endTimeIso: confirmedMeeting.timeSlot.endTime.toISOString(),
      });
    }

    revalidatePath("/seller");
    revalidatePath("/buyer");
    return { success: true };
  } catch (e) {
    console.error("Direct meeting acceptance with new slot error (seller):", e);
    return { error: "처리 중 오류가 발생했습니다." };
  }
}

// S6. 셀러가 받은 다이렉트 제안 거절
export async function rejectDirectMeetingAsSellerAction(meetingId: number, reason?: string, locale: Locale = "ko") {
  const tReasons = SELLER_REJECTION_REASONS[locale] || SELLER_REJECTION_REASONS["ko"];
  const session = await getServerSession(authOptions);
  if (!session) return { error: "로그인이 필요합니다." };

  try {
    const currentUserId = Number((session.user as any).id);
    await db.meeting.update({
      where: { id: meetingId },
      data: {
        status: "REJECTED",
        rejectionReason: reason || tReasons.defaultReason,
        picId: currentUserId
      }
    });
    revalidatePath("/seller");
    revalidatePath("/buyer");
    return { success: true };
  } catch (e) {
    console.error("Direct meeting rejection error (seller):", e);
    return { error: "거절 처리 중 오류가 발생했습니다." };
  }
}