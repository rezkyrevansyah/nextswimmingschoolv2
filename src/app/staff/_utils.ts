export function fmtClockTime(val: string | null | undefined): string {
  if (!val) return "—";
  if (val.includes("T") || val.includes("-")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    }
  }
  return val.slice(0, 8);
}
