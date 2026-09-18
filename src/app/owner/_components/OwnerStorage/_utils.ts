// Pure formatters and constants for the Owner "System Storage" screen.

export function fmtBytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " KB";
  return n + " B";
}

export function fmtRelTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// Stable color per category (keyed by prefix, not array position) so the
// stacked bar and the legend below it always agree on which color means
// which category, regardless of sort order or which categories are empty.
const CATEGORY_COLOR_MAP: Record<string, string> = {
  avatars:     "bg-ocean-500",
  logos:       "bg-wave-500",
  classes:     "bg-ok-500",
  signatures:  "bg-manual-500",
  landing:     "bg-sub-500",
  attendances: "bg-warn-500",
  payments:    "bg-suspend-500",
  certs:       "bg-danger-500",
};
const EMPTY_COLOR = "bg-archive-500/30";
export function categoryColor(prefix: string): string {
  return CATEGORY_COLOR_MAP[prefix] ?? EMPTY_COLOR;
}

export const BACKUP_CATEGORIES = [
  { key: "avatars",     label: "Profile Avatars"     },
  { key: "logos",       label: "Center Logos"        },
  { key: "classes",     label: "Class Photos"        },
  { key: "payments",    label: "Payment Proofs"      },
  { key: "certs",       label: "Coach Certificates"  },
  { key: "attendances", label: "Attendance Selfies"  },
];

export const BACKUP_PAGE_SIZE = 20;
export const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1 GB (Supabase Free Tier)
