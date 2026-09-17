// Small cross-screen helpers for the Owner panel (not domain logic, not UI).
// Helpers used only by a single component stay in that component's file.

export function parsePeriodToMonth(period: string): string {
  const trimmed = period.trim();
  const directMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (directMatch) return trimmed;

  const months: Record<string, string> = {
    januari: "01", january: "01", jan: "01",
    februari: "02", february: "02", feb: "02",
    maret: "03", march: "03", mar: "03",
    april: "04", apr: "04",
    mei: "05", may: "05",
    juni: "06", june: "06", jun: "06",
    juli: "07", july: "07", jul: "07",
    agustus: "08", august: "08", aug: "08",
    september: "09", sep: "09", sept: "09",
    oktober: "10", october: "10", okt: "10", oct: "10",
    november: "11", nov: "11",
    desember: "12", december: "12", des: "12", dec: "12",
  };

  const lower = trimmed.toLowerCase();
  for (const [name, mm] of Object.entries(months)) {
    if (lower.includes(name)) {
      const yearMatch = lower.match(/\b(20\d\d)\b/);
      const yyyy = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      return `${yyyy}-${mm}`;
    }
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
