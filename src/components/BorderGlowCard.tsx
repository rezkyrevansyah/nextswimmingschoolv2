"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BorderGlowCardProps {
  children: ReactNode;
  className?: string;
}

export default function BorderGlowCard({ children, className }: BorderGlowCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-3xl bg-white p-[1px] shadow-card transition-shadow duration-300 hover:shadow-float",
        className
      )}
    >
      <div
        className="absolute inset-0 rounded-3xl opacity-40 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(at 15% 10%, rgba(14,79,143,0.55) 0px, transparent 55%), " +
            "radial-gradient(at 85% 30%, rgba(22,176,232,0.45) 0px, transparent 55%), " +
            "radial-gradient(at 50% 90%, rgba(22,163,74,0.35) 0px, transparent 55%)",
        }}
      />
      <div className="relative rounded-[calc(1.5rem-1px)] bg-white h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
