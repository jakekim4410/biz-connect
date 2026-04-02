import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OnePagerForm from "./OnePagerForm";

export default async function OnePagerPage() {
  const session = await getServerSession(authOptions);

  // 세션이 없거나 SELLER가 아니면 로그인 페이지로 리다이렉트
  if (!session || (session.user as any).role !== "SELLER") redirect("/login");

  const userId = Number((session.user as any).id);

  // 1. 로그인된 User 정보와 OnePager 정보를 동시에 Fetching
  const userData = await db.user.findUnique({
    where: { id: userId },
    include: { onePager: true },
  });

  if (!userData) redirect("/login");

  // 2. OnePager가 존재하더라도 핵심 필드가 비어 있으면 User 테이블 값으로 보완
  //    (가입 시 자동 생성된 OnePager가 빈 값인 경우를 커버)
  const op = userData.onePager;

  const existingData = {
    companyNameKr:  op?.companyNameKr   || userData.companyName     || "",
    companyNameEn:  op?.companyNameEn   || userData.companyNameEn   || "",
    ceoName:        op?.ceoName         || userData.ceoNameKo       || "",
    ceoNameEn:      op?.ceoNameEn       || userData.ceoNameEn       || "",
    picName:        op?.picName         || userData.name            || "",
    picNameEn:      op?.picNameEn       || userData.nameEn          || "",
    picTitle:       op?.picTitle        || userData.jobTitle        || "",
    picTitleEn: op?.picTitleEn || userData.jobTitleEn || "",
    contactEmail:   op?.contactEmail    || userData.email           || "",
    primaryTech:    op?.primaryTech     || userData.primaryTech     || "",
    industrySector: op?.industrySector  || userData.industrySector  || "",
    yearFounded:    op?.yearFounded     || userData.yearFounded     || "",
    investmentStage:op?.investmentStage || userData.investmentStage || "",
    linkedinUrl:    op?.linkedinUrl     || userData.linkedinUrl     || "",
    productType:    op?.productType     || "",
    solutionSummary:op?.solutionSummary || "",
    problem:        op?.problem         || "",
    solution:       op?.solution        || "",
    traction:       op?.traction        || "",
    bizModel:       op?.bizModel        || "",
    monthlyRevenue: op?.monthlyRevenue  || "",
    pitchDeckUrl:   op?.pitchDeckUrl    || "",
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-left">
      <h1 className="max-w-7xl mx-auto text-2xl font-black mb-6"></h1>
      <OnePagerForm initialData={existingData} />
    </div>
  );
}