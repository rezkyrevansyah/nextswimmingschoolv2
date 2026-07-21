"use client";

import StarDisplay from "@/components/ui/StarDisplay";
import Btn from "@/components/ui/Btn";
import { useLocale } from "@/components/providers/LocaleProvider";

interface TestimonialItem {
  id: string;
  name: string;
  role: string | null;
  body_text: string;
  avatar_url: string | null;
  rating: number;
}

export default function Testimonials({ testimonials }: { testimonials: TestimonialItem[] }) {
  const { t } = useLocale();

  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-wide uppercase text-wave-600">
            {t("landing.testimonials.label")}
          </p>
          <h2 className="mt-2 font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {t("landing.testimonials.headline")}
          </h2>
          <p className="mt-3 text-ink-mute">{t("landing.testimonials.subtitle")}</p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((tst) => (
            <div key={tst.id} className="rounded-3xl border border-line bg-paper-tint p-6 flex flex-col">
              <StarDisplay stars={tst.rating} />
              <p className="mt-3 text-sm text-ink-soft flex-1">&ldquo;{tst.body_text}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ocean-100 overflow-hidden shrink-0 flex items-center justify-center text-ocean-700 font-bold text-sm">
                  {tst.avatar_url ? (
                    <img src={tst.avatar_url} alt={tst.name} className="w-full h-full object-cover" />
                  ) : (
                    tst.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink truncate">{tst.name}</div>
                  {tst.role && <div className="text-xs text-ink-mute truncate">{tst.role}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <p className="text-sm text-ink-mute">{t("landing.testimonials.ctaText")}</p>
          <Btn variant="primary" size="md" href="/register">{t("landing.testimonials.ctaButton")}</Btn>
        </div>
      </div>
    </section>
  );
}
