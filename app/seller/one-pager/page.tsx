import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OnePagerForm from "./OnePagerForm";

export default async function OnePagerPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") redirect("/login");

  const userId = Number((session.user as any).id);
  const existingData = await db.onePager.findUnique({ where: { userId } });

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-left">
      <h1 className="max-w-7xl mx-auto text-2xl font-black mb-6"></h1>
      <OnePagerForm initialData={existingData} />
    </div>
  );
}