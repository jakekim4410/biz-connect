"use client";
import { useI18n } from "@/lib/i18n";

export default function NavUserInfo({ user }: any) {
  const { locale } = useI18n();
  return (
    <div className="hidden sm:flex flex-col items-end leading-none">
      <span className="text-xs font-black text-slate-800">
        <span className="text-indigo-600 mr-1">[{user.companyName}]</span>
        {user.name}{locale === "ko" ? "님" : ""}
      </span>
    </div>
  );
}