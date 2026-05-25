import React from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active:         "bg-ok-50 text-ok-600 ring-ok-500/30",
  present:        "bg-ok-50 text-ok-600 ring-ok-500/30",
  paid:           "bg-ok-50 text-ok-600 ring-ok-500/30",
  approved:       "bg-ok-50 text-ok-600 ring-ok-500/30",
  pending:        "bg-warn-50 text-warn-600 ring-warn-500/30",
  unpaid:         "bg-warn-50 text-warn-600 ring-warn-500/30",
  suspend:        "bg-suspend-50 text-suspend-600 ring-suspend-500/30",
  suspended:      "bg-suspend-50 text-suspend-600 ring-suspend-500/30",
  archived:       "bg-archive-50 text-archive-600 ring-archive-500/30",
  inactive:       "bg-archive-50 text-archive-600 ring-archive-500/30",
  rejected:       "bg-danger-50 text-danger-600 ring-danger-500/30",
  absent:         "bg-danger-50 text-danger-500 ring-danger-500/30",
  holiday:        "bg-archive-50 text-archive-600 ring-archive-500/40 border border-dashed border-archive-500/40",
  substitute:     "bg-sub-50 text-sub-600 ring-sub-500/30",
  manual:         "bg-manual-50 text-manual-600 ring-manual-500/30",
  excused:        "bg-warn-50 text-warn-600 ring-warn-500/30",
  sick:           "bg-warn-50 text-warn-600 ring-warn-500/30",
  free:           "bg-paper-deep text-ink-mute ring-line",
  school_covered: "bg-paper-deep text-ink-soft ring-line",
};

interface StatusProps {
  kind?: string;
  children?: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export default function Status({ kind = "active", children, dot = true, className }: StatusProps) {
  const style = STATUS_STYLES[kind] ?? STATUS_STYLES.active;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ring-inset",
        style,
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children ?? kind}
    </span>
  );
}
