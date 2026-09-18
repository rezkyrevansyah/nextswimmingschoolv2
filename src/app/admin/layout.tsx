import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";
import { GoogleTranslate } from "@/components/GoogleTranslate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <MonoFontScope>
      <GoogleTranslate />
      {children}
    </MonoFontScope>
  );
}
