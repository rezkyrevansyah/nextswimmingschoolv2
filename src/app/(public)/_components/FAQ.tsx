"use client";
import { useState } from "react";
import { FAQS } from "@/lib/data";
import { waLink } from "@/lib/utils";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";

export default function FAQ() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="bg-white">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">FAQ</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Pertanyaan yang sering ditanyakan.
          </h2>
          <p className="text-ink-mute mt-4">Tidak menemukan jawaban? Chat admin kami langsung.</p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div
              key={f.q}
              className={`rounded-2xl border ${open === i ? "border-ocean-200 bg-ocean-50/40 shadow-card" : "border-line bg-white"}`}
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-display font-bold text-ink text-base lg:text-lg">{f.q}</span>
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${
                    open === i ? "bg-ocean-600 text-white rotate-45" : "bg-paper-tint text-ink-soft"
                  }`}
                >
                  <Icon name="plus" className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-ink-mute leading-relaxed anim-in">{f.a}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href={waLink("Halo, saya ingin tanya hal lain seputar program renang.")} target="_blank" rel="noreferrer">
            <Btn variant="primary" icon="whatsapp" size="lg">Tanya admin via WhatsApp</Btn>
          </a>
        </div>
      </div>
    </section>
  );
}
