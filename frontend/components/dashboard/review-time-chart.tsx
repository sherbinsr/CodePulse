"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DeveloperStat } from "@/types";

interface ReviewTimeChartProps {
  data: DeveloperStat[];
  limit?: number;
}

const COLORS = ["#6366f1", "#7c3aed", "#8b5cf6", "#a78bfa", "#6d28d9", "#818cf8", "#9333ea", "#c084fc"];

interface TooltipPayloadEntry {
  value: number;
  fill: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const v: number = payload[0].value;
  const display = v < 24 ? `${v.toFixed(1)}h` : `${(v / 24).toFixed(1)}d`;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: payload[0].fill }} />
        <span className="text-slate-500 dark:text-slate-400">Avg merge time:</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">{display}</span>
      </div>
    </div>
  );
}

export function ReviewTimeChart({ data, limit = 8 }: ReviewTimeChartProps) {
  const chartData = data
    .filter((d) => d.avg_merge_hours != null)
    .slice(0, limit)
    .map((d) => ({
      name: d.login,
      hours: d.avg_merge_hours,
    }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-5">Avg Merge Time by Developer</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            unit="h"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#475569" }}
            width={80}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="hours" name="Avg merge time" radius={[0, 6, 6, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
