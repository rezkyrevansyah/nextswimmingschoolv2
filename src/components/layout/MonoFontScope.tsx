import type { ReactNode } from "react";
import { jetbrainsMono } from "@/lib/fonts";

/**
 * Scopes the JetBrains Mono CSS variable to a subtree via a
 * `display: contents` wrapper (no layout/box-model effect on children).
 * Used by the authenticated panel layouts so the public landing/login/
 * register routes don't load a font family they never render.
 */
export default function MonoFontScope({ children }: { children: ReactNode }) {
  return (
    <div className={jetbrainsMono.variable} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
