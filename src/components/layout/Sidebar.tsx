"use client";
import React from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/ui/Icon";

export interface NavItem {
  id?: string;
  label?: string;
  short?: string;
  icon?: string;
  badge?: number | string;
  section?: string;
}

interface SidebarProps {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  brand?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function Sidebar({ items, active, onSelect, brand, footer, className }: SidebarProps) {
  return (
    <aside className={cn("hidden lg:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 bg-white border-r border-line", className)}>
      {brand && <div className="border-b border-line">{brand}</div>}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 no-scrollbar">
        {items.map((it, i) =>
          it.section ? (
            <div key={`sec-${i}`} className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest font-bold text-ink-faint">
              {it.section}
            </div>
          ) : (
            <button
              key={it.id}
              onClick={() => it.id && onSelect(it.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 h-[38px] rounded-[10px] text-sm transition group cursor-pointer",
                active === it.id
                  ? "bg-ocean-50 text-ocean-700 font-semibold"
                  : "text-ink-soft hover:bg-paper-tint font-medium"
              )}
            >
              {it.icon && (
                <Icon
                  name={it.icon}
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    active === it.id ? "text-ocean-600" : "text-ink-mute group-hover:text-ink-soft"
                  )}
                  strokeWidth={1.8}
                />
              )}
              <span className="flex-1 text-left truncate">{it.label}</span>
              {it.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-500 text-white shrink-0">
                  {it.badge}
                </span>
              )}
            </button>
          )
        )}
      </nav>
      {footer && <div className="border-t border-line p-3 shrink-0">{footer}</div>}
    </aside>
  );
}
