"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import { TrialButton } from "./TrialBooking";

interface NavLink {
  href: string;
  label: string;
}

interface LandingNavProps {
  links?: NavLink[];
}

const DEFAULT_LINKS: NavLink[] = [
  { href: "#why",        label: "Mengapa Kami" },
  { href: "#safety",     label: "Keamanan"     },
  { href: "#program",    label: "Program"      },
  { href: "#facilities", label: "Fasilitas"    },
  { href: "#coach",      label: "Coach"        },
  { href: "#faq",        label: "FAQ"          },
];

export default function LandingNav({ links = DEFAULT_LINKS }: LandingNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center gap-4">
        <a href="#home" className="flex items-center gap-2.5 shrink-0">
          <Logo size={36} />
          <span className="font-display font-extrabold text-[15px] leading-tight">
            <span className="text-ocean-700">NEXT</span>
            <br />
            <span className="text-wave-500 text-[10px] tracking-[.18em]">SWIMMING SCHOOL</span>
          </span>
        </a>

        <nav className="ml-6 hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3.5 py-2 text-sm font-semibold text-ink-soft hover:text-ocean-700 rounded-lg hover:bg-paper-tint"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold px-4 py-2 text-ink-soft hover:text-ocean-700">
          Login
        </Link>

        <div className="hidden sm:inline-flex">
          <TrialButton />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
          className="lg:hidden w-10 h-10 rounded-full hover:bg-paper-tint flex items-center justify-center"
        >
          <Icon name={open ? "close" : "menu"} className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-line bg-white">
          <div className="px-4 py-3 grid gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-soft hover:bg-paper-tint"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-soft hover:bg-paper-tint"
            >
              Login
            </Link>
            <div className="mt-2">
              <TrialButton fullWidth />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
