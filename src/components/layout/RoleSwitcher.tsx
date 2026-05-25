"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Icon from "@/components/ui/Icon";

const ROLES = [
  { id: "/",        label: "Landing Publik",  icon: "home"     },
  { id: "/login",   label: "Login / Register",icon: "user"     },
  { id: "/owner",   label: "Owner Panel",     icon: "shield"   },
  { id: "/admin",   label: "Admin Cabang",    icon: "settings" },
  { id: "/coach",   label: "Coach Page",      icon: "swim"     },
  { id: "/member",  label: "Member Page",     icon: "users"    },
  { id: "/school",  label: "School Page",     icon: "school"   },
];

interface RoleSwitcherProps {
  currentPath: string;
}

export default function RoleSwitcher({ currentPath }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const current = ROLES.find((r) => r.id === currentPath) ?? ROLES[0];

  return (
    <div className="fixed right-3 bottom-20 lg:bottom-4 z-[80]">
      {open && (
        <div className="mb-2 bg-white rounded-2xl border border-line shadow-lift p-2 w-64 anim-in">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-ink-faint">
            Mode demo
          </div>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => { router.push(r.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold",
                currentPath === r.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"
              )}
            >
              <Icon name={r.icon} className="w-4 h-4" />
              {r.label}
            </button>
          ))}
          <div className="px-3 py-2 text-[10px] text-ink-faint border-t border-line mt-1">
            Prototype — semua data dummy. Implementasi Next.js + Supabase mengikuti PRD.
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="shadow-float bg-ocean-700 text-white rounded-full pl-3 pr-4 py-2.5 flex items-center gap-2 font-bold text-sm hover:bg-ocean-800"
      >
        <span className="w-7 h-7 bg-wave-500/30 rounded-full flex items-center justify-center">
          <Icon name={open ? "close" : "swim"} className="w-3.5 h-3.5" strokeWidth={2.3} />
        </span>
        Demo · {current.label}
      </button>
    </div>
  );
}
