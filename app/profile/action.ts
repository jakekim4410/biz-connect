"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * 1. 현재 로그인한 유저의 정보를 가져오는 함수
 */
export async function getUserData() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const userId = Number((session.user as any).id);
  
  return await db.user.findUnique({
    where: { id: userId },
  });
}

/**
 * 2. 프로필 정보 수정 액션
 * ADMIN 또는 Master 권한 확인 후 회사명 변경 및 조직원 동기화 수행
 */
export async function updateProfileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "로그인이 필요합니다." };

  const userId = Number((session.user as any).id);

  // 1. 현재 유저 정보 확인 (권한 및 기존 회사명 체크용)
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { isMaster: true, companyName: true, role: true }
  });

  if (!currentUser) return { success: false, error: "유저를 찾을 수 없습니다." };

  // 2. 데이터 추출
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const jobTitle = formData.get("jobTitle") as string;
  const preferredPartners = formData.get("preferredPartners") as string;
  const newCompanyName = formData.get("companyName") as string;

  // 공통 수정 데이터 (회사명 제외)
  const updateData: any = { 
    name, 
    phone, 
    jobTitle, 
    preferredPartners 
  };

  try {
    // [권한별 회사명 수정 로직]
    // A. 전체 관리자(ADMIN) 또는 마스터(isMaster)인 경우에만 회사명 변경 가능
    if ((currentUser.role === "ADMIN" || currentUser.isMaster) && newCompanyName && newCompanyName !== currentUser.companyName) {
      
      // 트랜잭션: 해당 회사명을 가진 모든 유저의 회사명을 일괄 변경하고 본인의 정보도 업데이트
      await db.$transaction([
        db.user.updateMany({
          where: { companyName: currentUser.companyName },
          data: { companyName: newCompanyName }
        }),
        db.user.update({
          where: { id: userId },
          data: { ...updateData, companyName: newCompanyName }
        })
      ]);
    } else {
      // B. 일반 조직원(MEMBER)이거나 회사명 변경이 없는 경우 본인 정보만 수정 (회사명은 기존 유지)
      await db.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    // 캐시 갱신 (변경사항 즉시 반영)
    revalidatePath("/seller");
    revalidatePath("/buyer");
    revalidatePath("/profile");
    
    return { success: true };
  } catch (e) {
    console.error("Profile Update Error:", e);
    return { success: false, error: "업데이트 중 오류가 발생했습니다." };
  }
}