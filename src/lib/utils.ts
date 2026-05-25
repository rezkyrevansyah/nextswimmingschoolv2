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

/** Build WhatsApp deep link */
export const waLink = (text = ""): string =>
  `https://wa.me/62${WA_NUMBER.replace(/^0/, "")}?text=${encodeURIComponent(text)}`;

/** Merge class names (minimal, no extra dep needed) */
export const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(" ");
