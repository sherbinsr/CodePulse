"use client";
import { useState } from "react";
import Image from "next/image";
import { RefreshCw, ChevronDown } from "lucide-react";
import { triggerSync, getSyncStatus } from "@/lib/api";
import { toast } from "sonner";
import type { User, SyncStatus } from "@/types";

interface HeaderProps {
  title: string;
  org: string;
  user: User | null;
  syncStatus?: SyncStatus | null;
  onSyncComplete?: () => void;
}

export function Header({ title, org, user, syncStatus, onSyncComplete }: HeaderProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!org) return;
    setSyncing(true);
    try {
      await triggerSync(org);
      toast.info(`Syncing ${org}… this may take a minute.`);

      // Poll until done
      const poll = setInterval(async () => {
        const status = await getSyncStatus(org);
        if (status.status === "done") {
          clearInterval(poll);
          setSyncing(false);
          toast.success(`Sync complete — ${status.prs_synced} PRs indexed.`);
          onSyncComplete?.();
        } else if (status.status === "failed") {
          clearInterval(poll);
          setSyncing(false);
          toast.error(`Sync failed: ${status.error}`);
        }
      }, 3000);
    } catch {
      setSyncing(false);
      toast.error("Failed to start sync.");
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {syncStatus && syncStatus.status !== "never_synced" && (
          <p className="text-xs text-slate-400 mt-0.5">
            {syncStatus.status === "running" || syncStatus.status === "pending"
              ? "Syncing…"
              : `Last sync: ${syncStatus.prs_synced?.toLocaleString()} PRs from ${syncStatus.repos_synced} repos`}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {org && (
          <button
            onClick={handleSync}
            disabled={syncing || syncStatus?.status === "running"}
            title={syncing ? "Syncing…" : "Sync Now"}
            className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
        )}
        {user && (
          <div className="flex items-center gap-2">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.login}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {user.login[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-slate-700">{user.name || user.login}</span>
          </div>
        )}
      </div>
    </header>
  );
}
