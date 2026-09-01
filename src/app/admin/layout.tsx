import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <MonoFontScope>{children}</MonoFontScope>;
}
