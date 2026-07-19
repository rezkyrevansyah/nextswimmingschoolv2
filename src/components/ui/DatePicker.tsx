"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

const YEARS_PER_PAGE = 12;

function parseValue(value: string): { year: number; month: number; day: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

interface DatePickerProps {
  value: string;           // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

type Step = "year" | "month" | "day";

export default function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  minYear = 1940,
  maxYear,
}: DatePickerProps) {
  const { t, tArray } = useLocale();
  const MONTHS = tArray("common.months.short");
  const MONTHS_LONG = tArray("common.months.long");
  const DAYS_SHORT = tArray("common.days.short");
  const now = new Date();
  const currentYear = maxYear ?? now.getFullYear();
  const parsed = useMemo(() => parseValue(value), [value]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("year");
  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? currentYear - 20);
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? 0);
  const [yearPage, setYearPage] = useState<number>(0);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Position ────────────────────────────────────────────────────────────────
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropW = Math.max(rect.width, 280);
    const dropH = 320;
    const idealLeft = rect.left + rect.width / 2 - dropW / 2;
    const clampedLeft = Math.max(8, Math.min(idealLeft, window.innerWidth - dropW - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < dropH + 8) {
      setDropStyle({ position: "fixed", left: clampedLeft, width: dropW, bottom: window.innerHeight - rect.top + 4, zIndex: 9999 });
    } else {
      setDropStyle({ position: "fixed", left: clampedLeft, width: dropW, top: rect.bottom + 4, zIndex: 9999 });
    }
  }, []);

  // ── Open / close effects ────────────────────────────────────────────────────
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
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    // Use setTimeout so the click that opened the picker doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Year page ───────────────────────────────────────────────────────────────
  const yearStart = currentYear - yearPage * YEARS_PER_PAGE - YEARS_PER_PAGE + 1;
  const yearEnd = currentYear - yearPage * YEARS_PER_PAGE;
  const yearsOnPage = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearEnd - i)
    .filter(y => y >= minYear)
    .reverse(); // oldest first, newest last
  const canGoNewer = yearPage > 0;
  const canGoOlder = yearStart - 1 >= minYear;

  // ── Day grid ────────────────────────────────────────────────────────────────
  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const dayGrid: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (dayGrid.length % 7 !== 0) dayGrid.push(null);

  // ── Display ─────────────────────────────────────────────────────────────────
  const displayValue = parsed
    ? `${String(parsed.day).padStart(2, "0")} ${MONTHS[parsed.month]} ${parsed.year}`
    : "";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const togglePicker = () => {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    // Initialise view to selected value or sensible default
    const selectedYear = parsed?.year ?? currentYear - 20;
    setYearPage(Math.floor((currentYear - selectedYear) / YEARS_PER_PAGE));
    setViewYear(selectedYear);
    setViewMonth(parsed?.month ?? 0);
    setStep("year");
    setOpen(true);
  };

  const handleYearSelect = (y: number) => { setViewYear(y); setStep("month"); };
  const handleMonthSelect = (m: number) => { setViewMonth(m); setStep("day"); };
  const handleDaySelect = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  // ── Dropdown ─────────────────────────────────────────────────────────────────
  const dropdownContent = (
    <div
      ref={dropRef}
      style={dropStyle}
      className="bg-white border border-line rounded-xl shadow-float overflow-hidden select-none"
    >
      {/* YEAR */}
      {step === "year" && (
        <div className="p-3 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" disabled={!canGoOlder} onClick={() => setYearPage(p => p + 1)}
              className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft />
            </button>
            <span className="text-xs font-bold text-ink-mute uppercase tracking-widest">{t("common.datePicker.chooseYear")}</span>
            <button type="button" disabled={!canGoNewer} onClick={() => setYearPage(p => p - 1)}
              className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {yearsOnPage.map(y => (
              <button key={y} type="button" onClick={() => handleYearSelect(y)}
                className={cn("py-2 rounded-lg text-sm font-semibold text-center transition-colors",
                  parsed?.year === y ? "bg-ocean-600 text-white" : "text-ink hover:bg-ocean-50 hover:text-ocean-700")}>
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MONTH */}
      {step === "month" && (
        <div className="p-3 w-[280px]">
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
                className={cn("py-2 rounded-lg text-sm font-semibold text-center transition-colors",
                  parsed?.year === viewYear && parsed?.month === i ? "bg-ocean-600 text-white" : "text-ink hover:bg-ocean-50 hover:text-ocean-700")}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DAY */}
      {step === "day" && (
        <div className="p-3 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setStep("month")}
              className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ink transition-colors">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => setStep("month")}
              className="text-sm font-bold text-ink hover:text-ocean-700 transition-colors">
              {MONTHS_LONG[viewMonth]} {viewYear}
            </button>
            <div className="w-7" />
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-ink-mute py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {dayGrid.map((d, i) =>
              d === null ? <div key={`e-${i}`} /> : (
                <button key={d} type="button" onClick={() => handleDaySelect(d)}
                  className={cn("h-8 w-full rounded-lg text-sm font-semibold text-center transition-colors",
                    parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === d
                      ? "bg-ocean-600 text-white"
                      : "text-ink hover:bg-ocean-50 hover:text-ocean-700")}>
                  {d}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={togglePicker}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors bg-white border-line",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-ocean-400 cursor-pointer",
          open && "border-ocean-500 ring-2 ring-ocean-500/20",
          displayValue ? "text-ink" : "text-ink-faint",
        )}
      >
        <span>{displayValue || placeholder || t("common.datePicker.placeholder")}</span>
        <svg viewBox="0 0 24 24" className={cn("w-4 h-4 text-ink-mute shrink-0 transition-transform", open && "rotate-180")}
          fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {typeof window !== "undefined" && open && createPortal(dropdownContent, document.body)}
    </div>
  );
}
