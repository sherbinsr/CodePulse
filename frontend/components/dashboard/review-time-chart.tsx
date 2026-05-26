"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DeveloperStat } from "@/types";

interface ReviewTimeChartProps {
  data: DeveloperStat[];
  limit?: number;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export function ReviewTimeChart({ data, limit = 8 }: ReviewTimeChartProps) {
  const chartData = data
    .filter((d) => d.avg_merge_hours != null)
    .slice(0, limit)
    .map((d) => ({
      name: d.login,
      hours: d.avg_merge_hours,
    }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Avg Merge Time by Developer</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} unit="h" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} width={80} />
          <Tooltip
            formatter={(v: number) =>
              v < 24 ? `${v.toFixed(1)}h` : `${(v / 24).toFixed(1)}d`
            }
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="hours" name="Avg merge time" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
