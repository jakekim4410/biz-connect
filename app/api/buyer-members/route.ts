import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/matchUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get('buyerId');
  const companyName = searchParams.get('companyName');

  try {
    if (buyerId && Number(buyerId) !== -1) {
      // 1. buyerId가 명확한 경우: 해당 유저의 회사명을 찾고 그 회사의 모든 APPROVED 멤버를 반환
      const user = await db.user.findUnique({
        where: { id: Number(buyerId) },
        select: { companyName: true }
      });

      if (!user) {
        return NextResponse.json({ members: [] });
      }

      const members = await db.user.findMany({
        where: {
          companyName: user.companyName,
          role: "BUYER",
          approvalStatus: "APPROVED"
        },
        select: {
          id: true,
          name: true,
          nameEn: true,
          jobTitle: true,
          jobTitleEn: true,
          companyName: true,
          isMaster: true,
          linkedinUrl: true,
          phone: true,
          email: true,
        },
        orderBy: [{ isMaster: 'desc' }, { createdAt: 'asc' }]
      });

      return NextResponse.json({ members });
    } else if (companyName) {
      // 2. companyName만 있는 경우 (AI 검색 등): 정규화된 이름으로 매칭 시도
      const normalizedQuery = normalizeCompanyName(companyName);
      
      // DB의 모든 BUYER 유저를 가져와서 필터링 (데이터가 아주 많지 않다면 효율적)
      const allBuyers = await db.user.findMany({
        where: { 
          role: "BUYER",
          approvalStatus: "APPROVED"
        },
        select: {
          id: true,
          name: true,
          nameEn: true,
          jobTitle: true,
          jobTitleEn: true,
          companyName: true,
          isMaster: true,
          linkedinUrl: true,
          phone: true,
          email: true,
        },
        orderBy: [{ isMaster: 'desc' }, { createdAt: 'asc' }]
      });

      const matchedMembers = allBuyers.filter(u => 
        normalizeCompanyName(u.companyName).includes(normalizedQuery) || 
        normalizedQuery.includes(normalizeCompanyName(u.companyName))
      );

      // 만약 일치하는 회사가 여러 개라면? (가장 잘 맞는 첫 번째 회사 멤버들만 반환하도록 그룹화)
      if (matchedMembers.length > 0) {
          const firstCompanyName = matchedMembers[0].companyName;
          const finalMembers = matchedMembers.filter(m => m.companyName === firstCompanyName);
          return NextResponse.json({ members: finalMembers });
      }

      return NextResponse.json({ members: [] });
    }

    return NextResponse.json({ members: [] });
  } catch (error) {
    console.error("Failed to fetch buyer members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
