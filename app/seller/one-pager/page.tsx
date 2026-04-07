import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OnePagerForm from "./OnePagerForm";

export default async function OnePagerPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "SELLER") redirect("/login");

  const userId = Number((session.user as any).id);

  // 로그인된 User 정보와 본인 OnePager를 가져옴
  const userData = await db.user.findUnique({
    where: { id: userId },
    include: { onePager: true },
  });

  if (!userData) redirect("/login");

  // 같은 회사에서 가장 최근에 저장된 원페이저 (비즈니스 데이터 기준)
  const latestCompanyOnePager = await db.onePager.findFirst({
    where: { user: { companyName: userData.companyName } },
    orderBy: { updatedAt: "desc" },
  });

  // 비즈니스 데이터: 회사 내 최신 원페이저 우선 → 본인 원페이저 → User 프로필 순
  const biz = latestCompanyOnePager ?? userData.onePager;
  // PIC(담당자) 데이터: 항상 본인 원페이저 or 본인 프로필
  const pic = userData.onePager;

  const existingData = {
    companyNameKr:   biz?.companyNameKr   || userData.companyName     || "",
    companyNameEn:   biz?.companyNameEn   || userData.companyNameEn   || "",
    ceoName:         biz?.ceoName         || userData.ceoNameKo       || "",
    ceoNameEn:       biz?.ceoNameEn       || userData.ceoNameEn       || "",
    picName:         pic?.picName         || userData.name            || "",
    picNameEn:       pic?.picNameEn       || userData.nameEn          || "",
    picTitle:        pic?.picTitle        || userData.jobTitle        || "",
    picTitleEn:      pic?.picTitleEn      || userData.jobTitleEn      || "",
    contactEmail:    pic?.contactEmail    || userData.email           || "",
    primaryTech:     biz?.primaryTech     || userData.primaryTech     || "",
    industrySector:  biz?.industrySector  || userData.industrySector  || "",
    yearFounded:     biz?.yearFounded     || userData.yearFounded     || "",
    investmentStage: biz?.investmentStage || userData.investmentStage || "",
    linkedinUrl:     biz?.linkedinUrl     || userData.linkedinUrl     || "",
    productType:     biz?.productType     || "",
    solutionSummary: biz?.solutionSummary || "",
    problem:         biz?.problem         || "",
    solution:        biz?.solution        || "",
    traction:        biz?.traction        || "",
    bizModel:        biz?.bizModel        || "",
    monthlyRevenue:  biz?.monthlyRevenue  || "",
    pitchDeckUrl:    biz?.pitchDeckUrl    || "",
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-left">
      <h1 className="max-w-7xl mx-auto text-2xl font-black mb-6"></h1>
      <OnePagerForm initialData={existingData} />
    </div>
  );
}