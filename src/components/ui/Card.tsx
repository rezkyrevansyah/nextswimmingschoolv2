import React from "react";
import { cn } from "@/lib/utils";
import Icon from "./Icon";

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ className, children, padded = true, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "bg-white rounded-2xl border border-line shadow-card",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
interface SectionTitleProps {
  children: React.ReactNode;
  sub?: string;
  action?: React.ReactNode;
}

export function SectionTitle({ children, sub, action }: SectionTitleProps) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="font-display font-bold text-xl text-ink leading-tight">{children}</h2>
        {sub && <p className="text-sm text-ink-mute mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
type StatTone = "ocean" | "wave" | "ok" | "warn" | "danger";

const TONE_CLASSES: Record<StatTone, string> = {
  ocean:  "bg-ocean-50 text-ocean-700",
  wave:   "bg-wave-50 text-wave-600",
  ok:     "bg-ok-50 text-ok-600",
  warn:   "bg-warn-50 text-warn-600",
  danger: "bg-danger-50 text-danger-500",
};

interface StatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  tone?: StatTone;
  className?: string;
}

export function Stat({ label, value, sub, icon, tone = "ocean", className }: StatProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] uppercase tracking-wide text-ink-mute font-semibold">{label}</div>
          <div className="font-display font-bold text-3xl text-ink mt-1.5 leading-none">{value}</div>
          {sub && <div className="text-xs text-ink-mute mt-2">{sub}</div>}
        </div>
        {icon && (
          <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center", TONE_CLASSES[tone])}>
            <Icon name={icon} className="w-5 h-5" />
          </span>
        )}
      </div>
    </Card>
  );
}
