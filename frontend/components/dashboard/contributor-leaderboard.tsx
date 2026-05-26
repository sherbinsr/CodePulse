"use client";
import Image from "next/image";
import type { DeveloperStat } from "@/types";
import { formatHours } from "@/lib/utils";

interface ContributorLeaderboardProps {
  data: DeveloperStat[];
  limit?: number;
}

export function ContributorLeaderboard({ data, limit = 10 }: ContributorLeaderboardProps) {
  const top = data.slice(0, limit);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Contributor Leaderboard</h3>
      <div className="space-y-3">
        {top.map((dev, idx) => (
          <div key={dev.login} className="flex items-center gap-3">
            <span className="text-slate-400 text-xs font-mono w-5 text-right">{idx + 1}</span>
            {dev.avatar_url ? (
              <Image src={dev.avatar_url} alt={dev.login} width={28} height={28} className="rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                {dev.login[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800 truncate">{dev.login}</span>
                <span className="text-sm font-bold text-slate-900 ml-2">{dev.total_prs} PRs</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${dev.merge_rate}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{dev.merge_rate}% merged</span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 w-14">
              <div>{dev.reviews_given} reviews</div>
              <div>{formatHours(dev.avg_merge_hours)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
