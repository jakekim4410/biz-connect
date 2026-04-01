"use client";
import { useI18n } from "@/lib/i18n";

export default function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
      <button
        onClick={() => setLocale("ko")}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
          locale === "ko"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        KO
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
          locale === "en"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        EN
      </button>
    </div>
  );
}