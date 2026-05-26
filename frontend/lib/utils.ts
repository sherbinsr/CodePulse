import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function stateColor(state: string): string {
  switch (state) {
    case "MERGED": return "text-purple-600 bg-purple-50";
    case "OPEN":   return "text-green-600 bg-green-50";
    case "CLOSED": return "text-red-600 bg-red-50";
    default:       return "text-gray-600 bg-gray-50";
  }
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
