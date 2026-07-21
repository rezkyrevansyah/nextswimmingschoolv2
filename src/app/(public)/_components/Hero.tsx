"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Btn from "@/components/ui/Btn";
import TextType from "@/components/TextType";
import DotField from "@/components/DotField";
import { waLink } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function Hero({ waPhone, waMessage }: { waPhone: string | null; waMessage: string | null }) {
  const { t } = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !contentRef.current) return;

    const targets = contentRef.current.querySelectorAll("[data-hero-reveal]");
    gsap.set(targets, { y: 50, opacity: 0 });
    gsap.to(targets, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.08,
      ease: "power3.out",
    });
  }, []);

  return (
    <section className="relative overflow-hidden pt-56 pb-24 sm:pt-64 sm:pb-32">
      <div className="absolute inset-0 pointer-events-none">
        <DotField />
      </div>
      <div ref={contentRef} className="relative mx-auto max-w-3xl px-6 text-center">
        <div
          data-hero-reveal
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold text-ocean-700 shadow-card"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-wave-500" />
          Next Swimming School
        </div>

        <h1
          data-hero-reveal
          className="mt-6 font-display font-extrabold leading-tight text-ink text-4xl sm:text-5xl lg:text-6xl min-h-[2.4em] sm:min-h-[2.2em] flex items-center justify-center"
        >
          <TextType
            text={t("landing.hero.greeting")}
            as="span"
            className="text-ocean-600"
            typingSpeed={65}
            pauseDuration={3000}
            deletingSpeed={30}
            loop
            showCursor
            cursorCharacter="|"
            cursorClassName="text-wave-500"
          />
        </h1>

        <p data-hero-reveal className="mt-5 text-base sm:text-lg text-ink-mute">
          {t("landing.hero.subtitle")}
        </p>

        <div data-hero-reveal className="mt-8 flex items-center justify-center gap-3">
          <Btn variant="primary" size="lg" href={waLink(waMessage ?? "", waPhone)} target="_blank" rel="noreferrer">
            {t("landing.hero.cta")}
          </Btn>
          <Btn variant="outline" size="lg" href="#programs">
            {t("landing.nav.groups.programs.label")}
          </Btn>
        </div>
      </div>
    </section>
  );
}
