// ── Helpers (AdminMember only) ───────────────────────────────────────────────

export function parseImportDate(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, mo, y] = dmyMatch;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return undefined;
}

export function normalizeGender(raw: unknown): "male" | "female" | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (["l", "laki", "laki-laki", "male", "m"].includes(s)) return "male";
  if (["p", "perempuan", "female", "f", "wanita"].includes(s)) return "female";
  return undefined;
}

export function normalizeMemberType(raw: unknown): "reguler" | "private" | "school_affiliate" | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (["reguler", "regular"].includes(s)) return "reguler";
  if (["private"].includes(s)) return "private";
  if (["afiliasi_sekolah", "afiliasi", "school_affiliate", "sekolah"].includes(s)) return "school_affiliate";
  return undefined;
}

export const IMPORT_DAY_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export function normalizeDayName(raw: string): string | undefined {
  const s = raw.trim().toLowerCase();
  return IMPORT_DAY_OPTS.find(d => d.toLowerCase() === s);
}

export function normalizeImportTime(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return undefined;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh > 23 || mm > 59) return undefined;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

export function genderLabel(t: (key: string) => string, g: string | null | undefined): string | null {
  return g === "male" ? t("admin.approvement.genderMale") : g === "female" ? t("admin.approvement.genderFemale") : null;
}
