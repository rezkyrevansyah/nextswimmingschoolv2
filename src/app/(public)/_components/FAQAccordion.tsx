"use client";
import { useState } from "react";
import { waLink } from "@/lib/utils";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export default function FAQAccordion({ items, waPhone }: { items: FAQItem[]; waPhone?: string }) {
  const [open, setOpen] = useState<number>(0);

  return (
    <>
      <div className="mt-10 space-y-3">
        {items.map((f, i) => (
          <div
            key={f.id}
            className={`rounded-2xl border transition-all duration-300 ${open === i ? "border-ocean-200 bg-ocean-50/40 shadow-card" : "border-line bg-white"}`}
          >
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
            >
              <span className="font-display font-bold text-ink text-base lg:text-lg">{f.question}</span>
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  open === i ? "bg-ocean-600 text-white rotate-45" : "bg-paper-tint text-ink-soft"
                }`}
              >
                <Icon name="plus" className="w-4 h-4" strokeWidth={2.5} />
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows,opacity] duration-350 ease-in-out"
              style={{
                gridTemplateRows: open === i ? "1fr" : "0fr",
                opacity: open === i ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-ink-mute leading-relaxed">
                  {f.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <a href={waLink("Halo, saya ingin tanya hal lain seputar program renang.", waPhone)} target="_blank" rel="noreferrer">
          <Btn variant="primary" icon="whatsapp" size="lg">Tanya admin via WhatsApp</Btn>
        </a>
      </div>
    </>
  );
}
