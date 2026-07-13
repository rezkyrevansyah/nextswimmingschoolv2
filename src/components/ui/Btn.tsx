"use client";
import React from "react";
import { cn } from "@/lib/utils";
import Icon from "./Icon";

type BtnVariant = "primary" | "accent" | "ghost" | "outline" | "soft" | "danger" | "wa";
type BtnSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<BtnSize, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 min-h-[44px] rounded-xl gap-2",
  lg: "text-base px-5 py-3 min-h-[44px] rounded-xl gap-2",
};

const VARIANT_CLASSES: Record<BtnVariant, string> = {
  primary: "bg-ocean-600 text-white hover:bg-ocean-700 shadow-sm shadow-ocean-600/20",
  accent: "bg-wave-500 text-white hover:bg-wave-600 shadow-sm shadow-wave-500/30",
  ghost: "text-ink-soft hover:bg-paper-tint",
  outline: "border border-line text-ink-soft hover:bg-paper-tint hover:border-line-strong",
  soft: "bg-ocean-50 text-ocean-700 hover:bg-ocean-100",
  danger: "bg-danger-500 text-white hover:bg-danger-600",
  wa: "bg-[#25D366] text-white hover:bg-[#1FB855]",
};

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: string;
  href?: string;
}

export default function Btn({ variant = "primary", size = "md", icon, children, className, href, target, rel, type, ...rest }: BtnProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-semibold transition-colors",
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className
  );

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={classes} {...rest}>
        {icon && <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2.2} />}
        {children}
      </a>
    );
  }

  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {icon && <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2.2} />}
      {children}
    </button>
  );
}
