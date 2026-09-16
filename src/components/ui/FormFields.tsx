"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/ui/Icon";

// ── Field wrapper ─────────────────────────────────────────────────────────────
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-danger-500 mt-1 block">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-faint mt-1 block">{hint}</span>
      ) : null}
    </label>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={cn(
      "w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-white text-sm placeholder:text-ink-faint",
      "focus:border-wave-400 focus:ring-2 focus:ring-wave-100 outline-none transition",
      className
    )}
  />
));
Input.displayName = "Input";

// ── Password input (with show/hide toggle) ───────────────────────────────────
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors"
      >
        <Icon name={show ? "eye-off" : "eye"} className="w-4 h-4" />
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

// ── Select ────────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    {...props}
    className={cn(
      "w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-white text-sm",
      "focus:border-wave-400 focus:ring-2 focus:ring-wave-100 outline-none transition",
      "appearance-none bg-no-repeat bg-right pr-10",
      className
    )}
    style={{
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23577496' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>")`,
      backgroundPosition: "right 12px center",
      backgroundSize: "14px",
      ...props.style,
    }}
  >
    {children}
  </select>
));
Select.displayName = "Select";

// ── Textarea ──────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    {...props}
    className={cn(
      "w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm placeholder:text-ink-faint",
      "focus:border-wave-400 focus:ring-2 focus:ring-wave-100 outline-none transition resize-none",
      className
    )}
  />
));
Textarea.displayName = "Textarea";

// ── Section label ─────────────────────────────────────────────────────────────
interface SectionLabelProps {
  children: React.ReactNode;
  sub?: string;
  className?: string;
}

/** Compact heading for grouping fields within a form (e.g. a multi-part modal). */
export function SectionLabel({ children, sub, className }: SectionLabelProps) {
  return (
    <div className={cn("pt-4 mt-1 border-t border-line first:pt-0 first:mt-0 first:border-0", className)}>
      <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{children}</div>
      {sub && <p className="text-xs text-ink-mute mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Switch ────────────────────────────────────────────────────────────────────
interface SwitchProps {
  checked?: boolean;
  onChange?: (val: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className="inline-flex items-center gap-2 group"
    >
      <span className={cn("w-10 h-6 rounded-full p-0.5 transition", checked ? "bg-ocean-600" : "bg-line-strong")}>
        <span className={cn("block w-5 h-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "")} />
      </span>
      {label && <span className="text-sm text-ink-soft">{label}</span>}
    </button>
  );
}
