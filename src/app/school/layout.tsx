import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";

export default function SchoolLayout({ children }: { children: ReactNode }) {
  return <MonoFontScope>{children}</MonoFontScope>;
}
