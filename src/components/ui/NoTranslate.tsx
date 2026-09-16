import type { ReactNode, ElementType } from "react";
import { cn } from "@/lib/utils";

interface NoTranslateProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

/**
 * Excludes database-sourced text (names, addresses, notes, descriptions, etc.)
 * from Google Translate, which otherwise rewrites every visible text node it
 * finds — including real data that must stay exactly as entered.
 */
export function NoTranslate({ children, as: Tag = "span", className }: NoTranslateProps) {
  return (
    <Tag translate="no" className={cn("notranslate", className)}>
      {children}
    </Tag>
  );
}
