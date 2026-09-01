import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return <MonoFontScope>{children}</MonoFontScope>;
}
