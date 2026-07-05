"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const YEARS_PER_PAGE = 12;

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
);

/** Parses "YYYY-MM" → { year, month (0-based) } or null */
function parseValue(value: string): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  return { year: y, month: m - 1 };
}

interface MonthYearPickerProps {
  value: string;           // "YYYY-MM" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

export default function MonthYearPicker({
  value,
  onChange,
  placeholder = "Pilih bulan & tahun",
  className,
  disabled,
  minYear = 1990,
  maxYear,
}: MonthYearPickerProps) {
  const now = new Date();
  const currentYear = maxYear ?? now.getFullYear();
  const parsed = useMemo(() => parseValue(value), [value]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"year" | "month">("year");
  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? currentYear);
  const [yearPage, setYearPage] = useState<number>(0);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const yearStart = currentYear - yearPage * YEARS_PER_PAGE - YEARS_PER_PAGE + 1;
  const yearEnd = currentYear - yearPage * YEARS_PER_PAGE;
  const yearsOnPage = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearEnd - i).filter(y => y >= minYear);
  const canGoNewer = yearPage > 0;
  const canGoOlder = yearStart - 1 >= minYear;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropH = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < dropH + 8) {
      setDropStyle({ position: "fixed", left: rect.left, width: Math.max(rect.width, 260), bottom: window.innerHeight - rect.top + 4, zIndex: 9999 });
    } else {
      setDropStyle({ position: "fixed", left: rect.left, width: Math.max(rect.width, 260), top: rect.bottom + 4, zIndex: 9999 });
    }
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    const selectedYear = parsed?.year ?? currentYear;
    const pageIndex = Math.floor((currentYear - selectedYear) / YEARS_PER_PAGE);
    setYearPage(pageIndex);
    setViewYear(parsed?.year ?? currentYear);
    setStep("year");
    setOpen(true);
  }, [disabled, parsed, currentYear]);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleYearSelect = (y: number) => { setViewYear(y); setStep("month"); };

  const handleMonthSelect = (m: number) => {
    const mm = String(m + 1).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  };

  const displayValue = parsed ? `${MONTHS_LONG[parsed.month]} ${parsed.year}` : "";

  const dropdownContent = (
    <div ref={dropRef} style={dropStyle} className="bg-white border border-line rounded-xl shadow-float overflow-hidden select-none">
      {step === "year" && (
        <div className="p-3 w-[260px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" disabled={!canGoOlder} onClick={() => setYearPage(p => p + 1)}
              className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft />
            </button>
            <span className="text-xs font-bold text-ink-mute uppercase tracking-widest">Pilih Tahun</span>
            <button type="button" disabled={!canGoNewer} onClick={() => setYearPage(p => p - 1)}
              className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {yearsOnPage.map(y => (
              <button key={y} type="button" onClick={() => handleYearSelect(y)}
                className={cn("py-2 rounded-lg text-sm font-semibold transition-colors",
                  parsed?.year === y ? "bg-ocean-600 text-white" : "text-ink hover:bg-ocean-50 hover:text-ocean-700")}>
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "month" && (
        <div className="p-3 w-[260px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setStep("year")}
              className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ink transition-colors">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => setStep("year")}
              className="text-sm font-bold text-ink hover:text-ocean-700 transition-colors">
              {viewYear}
            </button>
            <div className="w-7" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => (
              <button key={m} type="button" onClick={() => handleMonthSelect(i)}
                className={cn("py-2 rounded-lg text-sm font-semibold transition-colors",
                  parsed?.year === viewYear && parsed?.month === i ? "bg-ocean-600 text-white" : "text-ink hover:bg-ocean-50 hover:text-ocean-700")}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      <button ref={triggerRef} type="button" disabled={disabled} onClick={openPicker}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors bg-white border-line",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-ocean-400 cursor-pointer",
          open && "border-ocean-500 ring-2 ring-ocean-500/20",
          displayValue ? "text-ink" : "text-ink-faint",
        )}>
        <span>{displayValue || placeholder}</span>
        <svg viewBox="0 0 24 24" className={cn("w-4 h-4 text-ink-mute shrink-0 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {typeof window !== "undefined" && open && createPortal(dropdownContent, document.body)}
    </div>
  );
}
