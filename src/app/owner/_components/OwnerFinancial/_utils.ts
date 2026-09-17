// Small date helpers for the Owner Financial screen's date-range filter.

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function startOfMonthISO(d: Date): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}
export function endOfMonthISO(d: Date): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
export function monthISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
