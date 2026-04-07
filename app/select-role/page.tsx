import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SelectRoleClient from "./SelectRoleClient";

export default async function SelectRolePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const name = session.user?.name ?? "";

  // ADMIN이 아니면 각자 역할 페이지로 보냄
  if (role === "BUYER") redirect("/buyer");
  if (role === "SELLER") redirect("/seller");
  if (role !== "ADMIN") redirect("/");

  return <SelectRoleClient name={name} />;
}
