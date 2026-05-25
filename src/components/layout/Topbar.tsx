"use client";
import React from "react";
import Icon from "@/components/ui/Icon";

interface TopbarProps {
  title: string;
  sub?: string;
  search?: string;
  right?: React.ReactNode;
  onMenu?: () => void;
}

export default function Topbar({ title, sub, search, right, onMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-line">
      <div className="flex items-center gap-3 px-4 lg:px-7 h-16">
        <button
          onClick={onMenu}
          className="lg:hidden w-10 h-10 rounded-full hover:bg-paper-tint flex items-center justify-center text-ink-soft"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-base lg:text-lg text-ink leading-tight truncate">{title}</h1>
          {sub && <p className="text-xs text-ink-mute truncate">{sub}</p>}
        </div>
        {search && (
          <div className="hidden md:flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 w-72">
            <Icon name="search" className="w-4 h-4 text-ink-faint" />
            <input
              type="search"
              placeholder={search}
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-faint"
            />
            <kbd className="hidden lg:inline text-[10px] font-mono text-ink-faint px-1.5 py-0.5 bg-white border border-line rounded">
              ⌘K
            </kbd>
          </div>
        )}
        {right}
      </div>
    </header>
  );
}
