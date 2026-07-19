"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

// Generate time options: 04:00 – 22:45, step 15 min
const TIME_OPTIONS: string[] = [];
for (let h = 4; h <= 22; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 22 && m > 0) break;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function TimePicker({ value, onChange, placeholder, className, disabled }: TimePickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropHeight = 208;

    if (spaceBelow < dropHeight + 8) {
      setDropStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + 4,
        zIndex: 9999,
      });
    } else {
      setDropStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: rect.bottom + 4,
        zIndex: 9999,
      });
    }
  }, []);

  // Update position on open, scroll, resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected into view after dropdown appears
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector("[data-selected]") as HTMLElement | null;
    if (selected) selected.scrollIntoView({ block: "center" });
  }, [open]);

  const handleSelect = (t: string) => {
    onChange(t);
    setOpen(false);
  };

  const dropdown = open ? (
    <ul
      ref={listRef}
      style={dropStyle}
      className="bg-white border border-line rounded-xl shadow-float overflow-y-auto max-h-52 py-1"
    >
      {TIME_OPTIONS.map(t => (
        <li key={t}>
          <button
            type="button"
            data-selected={t === value ? true : undefined}
            onClick={() => handleSelect(t)}
            className={cn(
              "w-full text-left px-4 py-2 text-sm font-mono font-semibold transition-colors",
              t === value
                ? "bg-ocean-600 text-white"
                : "text-ink hover:bg-ocean-50 hover:text-ocean-700"
            )}
          >
            {t}
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors",
          "bg-white border-line text-ink",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-ocean-400 cursor-pointer",
          open && "border-ocean-500 ring-2 ring-ocean-500/20",
          !value && "text-ink-faint",
        )}
      >
        <span className="font-mono font-semibold tracking-wider">
          {value || placeholder || t("common.timePicker.placeholder")}
        </span>
        <svg viewBox="0 0 24 24" className={cn("w-4 h-4 text-ink-mute transition-transform shrink-0", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
