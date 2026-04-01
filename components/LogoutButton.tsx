"use client";

import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const { t } = useI18n();

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-2 text-[12px] font-black text-slate-500 hover:text-rose-600 transition-all group px-2 py-1.5 rounded-lg hover:bg-rose-50"
    >
      <LogOut size={15} className="group-hover:translate-x-0.5 transition-transform" />
      <span>{t.common.logout}</span>
    </button>
  );
}