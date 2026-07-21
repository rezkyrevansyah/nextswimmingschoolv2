"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function Faq({ items, waPhone }: { items: FaqItem[]; waPhone: string | null }) {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section id="faq" className="py-16 sm:py-24 bg-paper-tint">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-wide uppercase text-wave-600">
            {t("landing.faq.label")}
          </p>
          <h2 className="mt-2 font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {t("landing.faq.headline")}
          </h2>
          <p className="mt-3 text-ink-mute">{t("landing.faq.subtitle")}</p>
        </div>

        <div className="mt-10 space-y-3">
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="rounded-2xl bg-white border border-line overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="font-display font-semibold text-ink">{item.question}</span>
                  <Icon name="chevronD" className={`w-4 h-4 text-ink-mute shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-ink-mute leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {waPhone && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
            <p className="text-sm text-ink-mute">{t("landing.faq.ctaText")}</p>
            <Btn variant="wa" size="md" icon="whatsapp" href={waLink(t("landing.faq.ctaMessage"), waPhone)} target="_blank" rel="noreferrer">
              {t("landing.faq.ctaButton")}
            </Btn>
          </div>
        )}
      </div>
    </section>
  );
}
