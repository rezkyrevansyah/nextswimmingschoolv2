import { WA_NUMBER, SCHOOL_EMAIL } from "./data";

/** Format angka ke Rupiah: Rp1.234.567 */
export const fmtIDR = (n: number): string =>
  "Rp" + (n || 0).toLocaleString("id-ID");

/** Format tanggal pendek: 12 Agt 2024 */
export const fmtDate = (d: string | Date): string =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Format tanggal panjang: Senin, 12 Agustus 2024 */
export const fmtDateLong = (d: string | Date): string =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Format jam: 14:48 */
export const fmtTime = (d: string | Date): string =>
  new Date(d).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Build WhatsApp deep link. If phone is provided, links to that number; otherwise defaults to admin WA. */
export const waLink = (text = "", phone?: string | null): string => {
  const num = phone ? phone.replace(/^0/, "").replace(/\D/g, "") : WA_NUMBER.replace(/^0/, "");
  return `https://wa.me/62${num}?text=${encodeURIComponent(text)}`;
};

/** Build a mailto: link. If email is provided (and non-empty), addresses that email; otherwise defaults to the school's contact email. */
export const mailtoLink = (subject: string, body = "", email?: string | null): string => {
  const to = email || SCHOOL_EMAIL;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Return a date as a YYYY-MM-DD string using the browser/server's LOCAL
 * calendar date — unlike `date.toISOString().slice(0, 10)`, which reads the
 * UTC date and is wrong for roughly 7 hours a day in WIB (UTC+7): a session
 * happening "today" locally can land on UTC "yesterday" or "tomorrow"
 * depending on the time of day, breaking session_date lookups (holidays,
 * attendance, clock-in windows) right around local midnight.
 */
export const toLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Merge class names (minimal, no extra dep needed) */
export const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(" ");

/**
 * Return a percentage clamped between 0 and 100 for progress bars.
 */
export const clampPercent = (value: number, max: number): number => {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
};

/** Mask a reviewer's name to protect anonymity: "Andi Saputra" -> "A***" */
export function maskMemberName(fullName?: string | null): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "Member***";
  return `${trimmed.charAt(0).toUpperCase()}***`;
}

/**
 * Count text metrics for rapor notes validation.
 * - chars: raw character count
 * - words: whitespace-separated tokens (ignores empty strings)
 * - sentences: segments ending with . ! ? (trailing punctuation counted)
 * - hasNewline: true if text contains any line break
 */
export function countTextStats(text: string): {
  chars: number;
  words: number;
  sentences: number;
  hasNewline: boolean;
} {
  const trimmed = text.trim();
  const chars = text.length;
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  const sentences = trimmed === "" ? 0 : (trimmed.match(/[^.!?]*[.!?]+/g) ?? []).length || 1;
  const hasNewline = /\n/.test(text);
  return { chars, words, sentences, hasNewline };
}

/**
 * Parse swim time string (e.g. "32.41" or "1:12.20") into seconds numeric & clean formatted display
 */
export function parseSwimTime(input: string): { seconds: number | null; formatted: string } {
  const trimmed = input.trim();
  if (!trimmed) return { seconds: null, formatted: "" };
  
  // Format MM:SS.ms (e.g. 1:12.20)
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    const totalSecs = Math.round((mins * 60 + secs) * 100) / 100;
    return {
      seconds: totalSecs,
      formatted: `${mins}:${secs < 10 ? "0" : ""}${secs.toFixed(2)}`,
    };
  }

  // Format SS.ms (e.g. 32.41)
  const secs = parseFloat(trimmed);
  if (isNaN(secs)) return { seconds: null, formatted: trimmed };
  return {
    seconds: Math.round(secs * 100) / 100,
    formatted: `${secs.toFixed(2)}s`,
  };
}

