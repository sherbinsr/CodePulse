"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { MonthlyTrend } from "@/types";

interface PRTrendChartProps {
  data: MonthlyTrend[];
}

export function PRTrendChart({ data }: PRTrendChartProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Monthly PR Trends</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="mergedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Area type="monotone" dataKey="total_prs" name="Total PRs" stroke="#6366f1" fill="url(#totalGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="merged_prs" name="Merged" stroke="#22c55e" fill="url(#mergedGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
