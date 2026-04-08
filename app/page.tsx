import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingClient from "./LandingClient";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    const role = (session.user as any)?.role;
    if (role === "ADMIN") redirect("/admin");
    if (role === "BUYER") redirect("/buyer");
    if (role === "SELLER") redirect("/seller");
  }

  return <LandingClient />;
}