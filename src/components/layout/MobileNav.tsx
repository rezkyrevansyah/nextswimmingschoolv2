"use client";
import React from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/ui/Icon";
import type { NavItem } from "./Sidebar";

interface MobileNavProps {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
}

export default function MobileNav({ items, active, onSelect }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-line shadow-[0_-4px_24px_-4px_rgba(10,37,64,.08)] pb-[max(env(safe-area-inset-bottom,0px),6px)]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => it.id && onSelect(it.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[54px] text-[10px] font-bold tracking-tight transition-transform active:scale-95",
                isActive ? "text-ocean-700 font-extrabold" : "text-ink-mute hover:text-ink-soft"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                  isActive ? "bg-ocean-50" : "bg-transparent"
                )}
              >
                {it.icon && (
                  <Icon
                    name={it.icon}
                    className={cn("w-5 h-5 transition-colors", isActive ? "text-ocean-600" : "text-ink-mute")}
                  />
                )}
                {it.badge ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {it.badge}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-full text-center leading-tight">
                {it.short || it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
