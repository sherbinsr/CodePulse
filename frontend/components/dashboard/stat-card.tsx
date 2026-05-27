import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ColorKey = "indigo" | "emerald" | "amber" | "violet" | "blue" | "cyan" | "purple" | "rose";

const colorMap: Record<ColorKey, { bg: string; text: string; ring: string }> = {
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "ring-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-100" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-100" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-100" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-600",    ring: "ring-cyan-100" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-600",  ring: "ring-purple-100" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-100" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  color?: ColorKey;
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, color = "indigo", className }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 flex items-start gap-4", className)}>
      <div className={cn("rounded-xl p-2.5 ring-1", colors.bg, colors.ring)}>
        <Icon className={cn("h-5 w-5", colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
