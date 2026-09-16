"use client";
import React, { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function parseHHmm(value: string): { hh: string; mm: string } | null {
  const m = /^(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return { hh: m[1], mm: m[2] };
}

function digitsToDisplay(digits: string): string {
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function clampDigits(digits: string): { hh: string; mm: string } {
  let hh = digits.slice(0, 2);
  let mm = digits.slice(2, 4);
  if (hh.length === 1) hh = hh.padStart(2, "0");
  if (mm.length === 1) mm = mm.padEnd(2, "0");
  const hhNum = Math.min(parseInt(hh || "0", 10), 23);
  const mmNum = Math.min(parseInt(mm || "0", 10), 59);
  return { hh: String(hhNum).padStart(2, "0"), mm: String(mmNum).padStart(2, "0") };
}

export default function TimePicker({ value, onChange, placeholder, className, disabled }: TimePickerProps) {
  const { t } = useLocale();
  const [digits, setDigits] = useState("");
  const [editing, setEditing] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsedProp = useMemo(() => parseHHmm(value), [value]);

  const displayValue = editing
    ? digitsToDisplay(digits)
    : parsedProp
      ? `${parsedProp.hh}:${parsedProp.mm}`
      : "";

  const commit = (raw: string) => {
    const { hh, mm } = clampDigits(raw);
    onChange(`${hh}:${mm}`);
    setDigits(`${hh}${mm}`);
  };

  const handleFocus = () => {
    setEditing(true);
    setTouched(false);
    setDigits(parsedProp ? `${parsedProp.hh}${parsedProp.mm}` : "");
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const applyDigits = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, 4);
    setTouched(true);
    if (next.length === 4) {
      commit(next);
    } else {
      setDigits(next);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyDigits(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    applyDigits(e.clipboardData.getData("text"));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      setTouched(true);
      setDigits(d => d.slice(0, -1));
    }
  };

  const handleBlur = () => {
    setEditing(false);
    if (touched && digits.length > 0) {
      commit(digits);
    }
    setTouched(false);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder || t("common.timePicker.placeholder")}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-white text-sm font-mono font-semibold tracking-wider text-center text-ink",
          "placeholder:text-ink-faint placeholder:font-sans placeholder:font-normal placeholder:tracking-normal",
          "focus:border-wave-400 focus:ring-2 focus:ring-wave-100 outline-none transition",
          disabled && "opacity-50 cursor-not-allowed bg-paper-tint",
        )}
      />
      <p className="text-[11px] text-ink-faint mt-1">{t("common.timePicker.hint")}</p>
    </div>
  );
}
