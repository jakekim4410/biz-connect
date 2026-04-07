"use client";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

interface Props {
  name: string;
}

type DashboardType = "admin" | "buyer" | "seller";

const dashboards: {
  key: DashboardType;
  icon: string;
  href: string;
  gradient: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  glow: string;
}[] = [
  {
    key: "admin",
    icon: "⚙️",
    href: "/admin",
    gradient: "from-violet-600 via-indigo-600 to-blue-600",
    border: "border-indigo-400/30",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-700",
    glow: "shadow-indigo-500/20",
  },
  {
    key: "buyer",
    icon: "🏢",
    href: "/buyer",
    gradient: "from-blue-600 via-cyan-500 to-teal-500",
    border: "border-cyan-400/30",
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-700",
    glow: "shadow-cyan-500/20",
  },
  {
    key: "seller",
    icon: "🚀",
    href: "/seller",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    border: "border-rose-400/30",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    glow: "shadow-rose-500/20",
  },
];

export default function SelectRoleClient({ name }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [hoveredKey, setHoveredKey] = useState<DashboardType | null>(null);
  const [loadingKey, setLoadingKey] = useState<DashboardType | null>(null);

  const handleSelect = (key: DashboardType, href: string) => {
    setLoadingKey(key);
    router.push(href);
  };

  const sr = (t as any).selectRole;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#f4f7fa] font-sans relative overflow-hidden px-4 py-12">
      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-violet-200/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-blue-200/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-rose-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Admin badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-black tracking-widest uppercase px-4 py-2 rounded-full mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block" />
            {sr?.greeting ?? "어드민으로 로그인되었습니다"}
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-3">
            <span className="text-[#111827]">Biz</span>
            <span className="text-[#2563eb]">Connect</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-semibold">
            {sr?.subtitle ?? "접근할 대시보드 유형을 선택해주세요."}
          </p>
          {name && (
            <p className="text-slate-400 text-xs mt-1 font-medium">
              👋 {name}
            </p>
          )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {dashboards.map(({ key, icon, href, gradient, border, badgeBg, badgeText, glow }) => {
            const titleKey = `${key}Title` as const;
            const descKey = `${key}Desc` as const;
            const isHovered = hoveredKey === key;
            const isLoading = loadingKey === key;

            return (
              <button
                key={key}
                onClick={() => handleSelect(key, href)}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                disabled={!!loadingKey}
                className={`
                  relative group text-left rounded-[28px] p-0 border overflow-hidden
                  transition-all duration-300 ease-out
                  ${border}
                  ${isHovered ? `scale-[1.03] shadow-2xl ${glow}` : "scale-100 shadow-lg shadow-slate-200/60"}
                  ${isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                  bg-white/80 backdrop-blur-xl
                `}
                style={{ outline: "none" }}
              >
                {/* Top gradient bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />

                <div className="p-6">
                  {/* Icon circle */}
                  <div
                    className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4
                      bg-gradient-to-br ${gradient} shadow-md
                      transition-transform duration-300
                      ${isHovered ? "scale-110 rotate-3" : "scale-100 rotate-0"}
                    `}
                  >
                    {isLoading ? (
                      <svg
                        className="animate-spin h-6 w-6 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <span>{icon}</span>
                    )}
                  </div>

                  {/* Badge */}
                  <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-3 ${badgeBg} ${badgeText}`}>
                    {key.toUpperCase()}
                  </span>

                  {/* Title */}
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug mb-1">
                    {sr?.[titleKey] ?? key}
                  </h2>

                  {/* Description */}
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                    {sr?.[descKey] ?? ""}
                  </p>

                  {/* Arrow */}
                  <div
                    className={`
                      mt-5 flex items-center gap-1 text-xs font-black
                      transition-all duration-300
                      ${isHovered ? "translate-x-1 opacity-100" : "opacity-60"}
                      bg-gradient-to-r ${gradient} bg-clip-text text-transparent
                    `}
                  >
                    {sr?.goBtn ?? "이동하기"}
                    <svg className="w-3.5 h-3.5 stroke-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-center text-slate-400 text-[11px] font-bold mt-10 tracking-wider uppercase">
          BizConnect Admin Access — All Dashboards Available
        </p>
      </div>
    </div>
  );
}
