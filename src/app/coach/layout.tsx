import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";

export default function CoachLayout({ children }: { children: ReactNode }) {
  return <MonoFontScope>{children}</MonoFontScope>;
}
