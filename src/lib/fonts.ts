import { JetBrains_Mono } from "next/font/google";

/**
 * Loaded only by the authenticated panel layouts (owner/admin/coach/student/
 * school/staff) that actually render monospace text (codes, IDs, rapor
 * tables) — kept out of the root layout so the public landing/login/register
 * routes don't pay for a font family they never use.
 */
export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
