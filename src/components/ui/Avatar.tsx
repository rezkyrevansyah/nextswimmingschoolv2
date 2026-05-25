import React from "react";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-wave-100 text-wave-700",
  "bg-ocean-100 text-ocean-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  ring?: boolean;
  className?: string;
}

export default function Avatar({ name = "?", src, size = 36, ring = false, className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const idx = (name.charCodeAt(0) || 0) % PALETTE.length;

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full text-xs font-bold shrink-0",
        PALETTE[idx],
        ring && "ring-2 ring-white shadow-sm",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
