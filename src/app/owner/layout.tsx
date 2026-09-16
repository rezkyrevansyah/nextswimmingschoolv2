import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";
import { GoogleTranslate } from "@/components/GoogleTranslate";
import { LocaleProvider } from "@/components/providers/LocaleProvider";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <MonoFontScope>
      <GoogleTranslate />
      {/* Owner panel's hardcoded UI strings are pinned to English so Google
          Translate (not the cross-panel i18n locale) is the single source
          of truth for translation here. */}
      <LocaleProvider forcedLocale="en">{children}</LocaleProvider>
    </MonoFontScope>
  );
}
