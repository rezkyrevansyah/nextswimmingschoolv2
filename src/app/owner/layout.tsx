import type { ReactNode } from "react";
import MonoFontScope from "@/components/layout/MonoFontScope";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <MonoFontScope>{children}</MonoFontScope>;
}
