export function fmtMonthYear(val: string | null | undefined, monthsLong: string[]): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${monthsLong[parseInt(m[2]) - 1]} ${m[1]}`;
  return val;
}
export function toDbDate(ym: string): string { return ym ? `${ym}-01` : ym; }
export function fromDbDate(d: string | null | undefined): string { if (!d) return ""; return d.slice(0, 7); }
