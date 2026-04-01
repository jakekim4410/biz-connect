import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AiSearchClient from "./AiSearchClient";

export default async function AdminAiSearchPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/");
  }

  return <AiSearchClient />;
}