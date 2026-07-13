import { WA_NUMBER } from "./data";

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
