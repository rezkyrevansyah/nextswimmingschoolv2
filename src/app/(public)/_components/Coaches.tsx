"use client";

import dynamic from "next/dynamic";
import { useLocale } from "@/components/providers/LocaleProvider";

const CircularGallery = dynamic(() => import("@/components/CircularGallery"), { ssr: false });

interface CoachItem {
  id: string;
  name: string;
  photo_url: string | null;
}

export default function Coaches({ coaches }: { coaches: CoachItem[] }) {
  const { t } = useLocale();
  const withPhoto = coaches.filter((c) => c.photo_url);

  if (withPhoto.length === 0) return null;

  return (
    <section id="coaches" className="relative py-16 sm:py-24 bg-gradient-to-b from-ocean-700 to-ocean-900 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-xs font-semibold tracking-wide uppercase text-wave-200">
          {t("landing.coaches.label")}
        </p>
        <h2 className="mt-2 font-display font-extrabold text-3xl sm:text-4xl text-white">
          {t("landing.coaches.headline")}
        </h2>
        <p className="mt-3 text-white/70">{t("landing.coaches.subtitle")}</p>
      </div>
      <div className="mt-12 h-[400px] sm:h-[500px]">
        <CircularGallery
          items={withPhoto.map((c) => ({ image: c.photo_url!, text: c.name }))}
          bend={2}
          textColor="#E5F7FE"
          borderRadius={0.06}
          font="bold 22px 'Plus Jakarta Sans', sans-serif"
          scrollEase={0.04}
        />
      </div>
    </section>
  );
}
