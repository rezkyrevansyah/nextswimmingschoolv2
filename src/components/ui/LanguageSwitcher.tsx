"use client";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className={`inline-flex items-center p-0.5 rounded-full bg-paper-tint border border-line ${className ?? ""}`}>
      {(["en", "id"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors ${
            locale === l ? "bg-ocean-600 text-white" : "text-ink-mute hover:text-ink"
          }`}
        >
          {t(`common.languageSwitcher.${l}`)}
        </button>
      ))}
    </div>
  );
}
