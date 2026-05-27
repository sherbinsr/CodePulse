"use client";
import Image from "next/image";
import type { DeveloperStat } from "@/types";
import { formatHours } from "@/lib/utils";

interface ContributorLeaderboardProps {
  data: DeveloperStat[];
  limit?: number;
}

const rankStyles: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-amber-100",   text: "text-amber-700",   label: "1" },
  2: { bg: "bg-slate-200",   text: "text-slate-600",   label: "2" },
  3: { bg: "bg-orange-100",  text: "text-orange-700",  label: "3" },
};

function RankBadge({ rank }: { rank: number }) {
  const style = rankStyles[rank] ?? { bg: "bg-slate-100", text: "text-slate-500", label: String(rank) };
  return (
    <span
      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

export function ContributorLeaderboard({ data, limit = 10 }: ContributorLeaderboardProps) {
  const top = data.slice(0, limit);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-slate-800 mb-5">Contributor Leaderboard</h3>
      <div className="divide-y divide-slate-100">
        {top.map((dev, idx) => {
          const rank = idx + 1;
          return (
            <div key={dev.login} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <RankBadge rank={rank} />

              {dev.avatar_url ? (
                <Image
                  src={dev.avatar_url}
                  alt={dev.login}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  {dev.login[0].toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800 truncate">{dev.login}</span>
                  <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-900">{dev.total_prs} PRs</span>
                    <span className="text-xs text-slate-400">{dev.reviews_given} reviews</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(dev.merge_rate, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap w-20 text-right">
                    {dev.merge_rate}% merged
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
