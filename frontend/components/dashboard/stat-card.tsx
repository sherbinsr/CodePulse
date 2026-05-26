import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4", className)}>
      <div className="bg-indigo-50 rounded-lg p-2.5">
        <Icon className="h-5 w-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
