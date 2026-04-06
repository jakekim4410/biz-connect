// app/admin/ai-search/page.tsx
import { db } from "@/lib/db";
import AiSearchClient from "./AiSearchClient";

export default async function AiSearchPage() {
  // 승인된 모든 회원사의 회사명 목록 (한글 + 영문 모두)
  const users = await db.user.findMany({
    where: { approvalStatus: "APPROVED" },
    select: { companyName: true, companyNameEn: true },
  });

  const registeredCompanyNames = [
    ...new Set([
      ...users.map((u) => u.companyName).filter(Boolean),
      ...users.map((u) => u.companyNameEn).filter(Boolean),
    ]),
  ];

  return <AiSearchClient registeredCompanyNames={registeredCompanyNames} />;
}