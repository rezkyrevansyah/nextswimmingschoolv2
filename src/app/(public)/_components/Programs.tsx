"use client";

import BorderGlowCard from "@/components/BorderGlowCard";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

interface ProgramClass {
  id: string;
  name: string;
  description: string | null;
  class_type: string;
  photo_url: string | null;
}

export default function Programs({ programs }: { programs: ProgramClass[] }) {
  const { t } = useLocale();

  if (programs.length === 0) return null;

  return (
    <section id="programs" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-wide uppercase text-wave-600">
            {t("landing.programs.label")}
          </p>
          <h2 className="mt-2 font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {t("landing.programs.headline")}
          </h2>
          <p className="mt-3 text-ink-mute">{t("landing.programs.subtitle")}</p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((p) => (
            <BorderGlowCard key={p.id}>
              <div className="aspect-[4/3] bg-ocean-50">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="swim" className="w-10 h-10 text-ocean-200" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    p.class_type === "private" ? "bg-wave-50 text-wave-700" : "bg-ocean-50 text-ocean-700"
                  )}
                >
                  {p.class_type === "private" ? t("landing.programs.private") : t("landing.programs.regular")}
                </span>
                <h3 className="mt-3 font-display font-bold text-lg text-ink">{p.name}</h3>
                {p.description && (
                  <p className="mt-1.5 text-sm text-ink-mute line-clamp-2">{p.description}</p>
                )}
              </div>
            </BorderGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
