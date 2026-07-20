"use client";

import LogoLoop from "@/components/LogoLoop";
import { useLocale } from "@/components/providers/LocaleProvider";

interface PartnerRow {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

export default function Partners({ partners }: { partners: PartnerRow[] }) {
  const { t } = useLocale();
  const logos = partners.filter((p) => p.logo_url);

  if (logos.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-paper-tint border-y border-line">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-xs font-semibold tracking-wide uppercase text-ink-mute">
          {t("landing.partners.label")}
        </p>
      </div>
      <div className="mt-8 relative h-16 overflow-hidden">
        <LogoLoop
          logos={logos.map((p) => ({ src: p.logo_url!, alt: p.name, title: p.name, href: p.website_url ?? undefined }))}
          speed={60}
          direction="left"
          logoHeight={40}
          gap={64}
          fadeOut
          ariaLabel={t("landing.partners.ariaLabel")}
        />
      </div>
    </section>
  );
}
