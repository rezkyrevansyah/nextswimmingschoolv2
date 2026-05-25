import React from "react";
import { cn } from "@/lib/utils";

interface PlaceholderProps {
  label?: string;
  ratio?: string;
  className?: string;
}

export default function Placeholder({ label = "image", ratio = "16/9", className }: PlaceholderProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl border border-line", className)}
      style={{ aspectRatio: ratio }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(135deg,#EAF4FB 0 12px,#DAEAF5 12px 24px)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10px] tracking-widest uppercase text-ocean-600/70 bg-white/80 px-2 py-1 rounded">
          {label}
        </span>
      </div>
    </div>
  );
}
