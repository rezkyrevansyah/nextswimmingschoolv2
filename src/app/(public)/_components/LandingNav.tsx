"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";

const NAV_LINKS = [
  { id: "home",    label: "Beranda"      },
  { id: "program", label: "Program"      },
  { id: "coach",   label: "Coach"        },
  { id: "why",     label: "Mengapa Kami" },
  { id: "faq",     label: "FAQ"          },
];

export default function LandingNav() {
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
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
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

        <a
          href={waLink("Halo Admin Next Swimming School, saya ingin konsultasi program renang.")}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex"
        >
          <Btn variant="primary" icon="whatsapp">Konsultasi Sekarang</Btn>
        </a>

        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden w-10 h-10 rounded-full hover:bg-paper-tint flex items-center justify-center"
        >
          <Icon name={open ? "close" : "menu"} className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-line bg-white">
          <div className="px-4 py-3 grid gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
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
            <a href={waLink()} target="_blank" rel="noreferrer" className="mt-2">
              <Btn variant="primary" icon="whatsapp" className="w-full">Konsultasi via WhatsApp</Btn>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
