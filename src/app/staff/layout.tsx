import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <MonoFontScope>{children}</MonoFontScope>;
}
