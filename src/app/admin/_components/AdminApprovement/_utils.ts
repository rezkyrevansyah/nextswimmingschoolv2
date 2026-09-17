export const PAGE_SIZE = 10;

export function fmtMonthYear(val: string | null | undefined, monthsLong: string[]): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${monthsLong[parseInt(m[2]) - 1]} ${m[1]}`;
  return val;
}

// ── Pagination helpers ──────────────────────────────────────────────────────
export function paginate(total: number, current: number, onChange: (p: number) => void) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safe = Math.min(current, totalPages - 1);
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (safe > 2) pages.push("…");
    for (let i = Math.max(1, safe - 1); i <= Math.min(totalPages - 2, safe + 1); i++) pages.push(i);
    if (safe < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
  }
  return { totalPages, safe, pages };
}
