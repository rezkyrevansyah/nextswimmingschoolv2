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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-[0_-4px_20px_-8px_rgba(10,37,64,.08)] pb-[env(safe-area-inset-bottom,0)]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => it.id && onSelect(it.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide",
              active === it.id ? "text-ocean-600" : "text-ink-mute"
            )}
          >
            {it.icon && (
              <Icon
                name={it.icon}
                className={cn("w-5 h-5", active === it.id ? "text-ocean-600" : "text-ink-mute")}
              />
            )}
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
