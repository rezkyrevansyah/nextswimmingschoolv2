import { en } from "./locales/en";
import { id } from "./locales/id";

export type Locale = "en" | "id";
export type Dictionary = typeof en;

/** `id` is declared as `Dictionary` (via each leaf file's `typeof ...En` annotation) so a
 * missing/mismatched key between locales fails `tsc`, not just at runtime. */
export const dictionaries: Record<Locale, Dictionary> = { en, id };

export const DEFAULT_LOCALE: Locale = "en";

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/** Resolve a dot-path translation key for the given locale, falling back to `en`,
 * then to the raw key itself — never throws, never renders blank. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const fromLocale = getPath(dictionaries[locale], key);
  if (typeof fromLocale === "string") return interpolate(fromLocale, vars);

  const fromEnglish = getPath(dictionaries.en, key);
  if (typeof fromEnglish === "string") return interpolate(fromEnglish, vars);

  return key;
}

/** Same resolution order as `translate`, for dictionary entries that are string arrays
 * (e.g. month/day names) rather than a single string. */
export function translateArray(locale: Locale, key: string): string[] {
  const fromLocale = getPath(dictionaries[locale], key);
  if (Array.isArray(fromLocale)) return fromLocale as string[];

  const fromEnglish = getPath(dictionaries.en, key);
  if (Array.isArray(fromEnglish)) return fromEnglish as string[];

  return [];
}
