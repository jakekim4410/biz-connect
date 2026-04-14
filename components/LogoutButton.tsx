"use client";
import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const { t } = useI18n();

  return (
    <button
      onClick={async () => {
        await signOut({ callbackUrl: "/" });
      }}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
    >
      <LogOut size={16} />
      <span className="text-[12px] font-bold whitespace-nowrap">{t.common.logout}</span>
    </button>
  );
}