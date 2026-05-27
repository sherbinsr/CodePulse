"use client";
import { useState } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
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

function SyncPill({ status }: { status: SyncStatus["status"] | undefined }) {
  if (!status || status === "never_synced") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        Never synced
      </span>
    );
  }
  if (status === "running" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Syncing…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Synced
    </span>
  );
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
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <SyncPill status={syncStatus?.status} />
      </div>

      <div className="flex items-center gap-3">
        {org && (
          <button
            onClick={handleSync}
            disabled={syncing || syncStatus?.status === "running" || syncStatus?.status === "pending"}
            title={syncing ? "Syncing…" : "Sync Now"}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
        )}
        {user && (
          <div className="flex items-center gap-2.5">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.login}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-slate-100"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
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
