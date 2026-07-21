"use client";

import BorderGlowCard from "@/components/BorderGlowCard";
import Icon from "@/components/ui/Icon";
import { useLocale } from "@/components/providers/LocaleProvider";

interface WhyNextItem {
  id: string;
  icon: string;
  title: string;
  description: string | null;
}

export default function WhyNext({ items }: { items: WhyNextItem[] }) {
  const { t } = useLocale();

  if (items.length === 0) return null;

  return (
    <section id="why-next" className="py-16 sm:py-24 bg-paper-tint">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-wide uppercase text-wave-600">
            {t("landing.whyNext.label")}
          </p>
          <h2 className="mt-2 font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {t("landing.whyNext.headline")}
          </h2>
          <p className="mt-3 text-ink-mute">{t("landing.whyNext.subtitle")}</p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <BorderGlowCard key={item.id}>
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-ocean-50 flex items-center justify-center">
                  <Icon name={item.icon} className="w-6 h-6 text-ocean-600" />
                </div>
                <h3 className="mt-4 font-display font-bold text-lg text-ink">{item.title}</h3>
                {item.description && (
                  <p className="mt-1.5 text-sm text-ink-mute line-clamp-3">{item.description}</p>
                )}
              </div>
            </BorderGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
