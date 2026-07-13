"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { TrialButton } from "./TrialBooking";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number>(0);

  return (
    <>
      <div className="mt-10 space-y-3">
        {items.map((f, i) => {
          const isOpen = open === i;
          const buttonId = `faq-trigger-${f.id}`;
          const panelId = `faq-panel-${f.id}`;
          return (
            <div
              key={f.id}
              className={`rounded-2xl border transition-all duration-300 ${isOpen ? "border-ocean-200 bg-ocean-50/40 shadow-card" : "border-line bg-white"}`}
            >
              <h3>
                <button
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
                >
                  <span className="font-display font-bold text-ink text-base lg:text-lg">{f.question}</span>
                  <span
                    aria-hidden
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen ? "bg-ocean-600 text-white rotate-45" : "bg-paper-tint text-ink-soft"
                    }`}
                  >
                    <Icon name="plus" className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className="grid transition-[grid-template-rows,opacity] duration-350 ease-in-out"
                style={{
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 text-ink-mute leading-relaxed">
                    {f.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <TrialButton size="lg" />
      </div>
    </>
  );
}
