const MONTHS_LONG_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/** Formats "YYYY-MM" or "YYYY-MM-DD" → "Januari 2026" */
export function fmtMonthYear(val: string | null | undefined): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${MONTHS_LONG_ID[parseInt(m[2]) - 1]} ${m[1]}`;
  return val;
}

/** "YYYY-MM" → "YYYY-MM-01" for DB date column */
export function toDbDate(ym: string): string {
  return ym ? `${ym}-01` : ym;
}

/** "YYYY-MM-DD" → "YYYY-MM" for MonthYearPicker */
export function fromDbDate(d: string | null | undefined): string {
  if (!d) return "";
  return d.slice(0, 7); // "YYYY-MM"
}

/** Haversine formula — returns distance in meters */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Returns true if current time is within 3 hours before session start until session end */
export function isInClockInWindow(timeStart: string, timeEnd: string): boolean {
  const now = new Date();
  const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = toMinutes(timeStart);
  const endMin = toMinutes(timeEnd);
  return nowMin >= startMin - 180 && nowMin <= endMin;
}
