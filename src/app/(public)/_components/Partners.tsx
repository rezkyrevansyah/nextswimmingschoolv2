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
  const valid = partners.filter((p) => p.logo_url || p.name);

  if (valid.length === 0) return null;

  const items = valid.map((p) =>
    p.logo_url
      ? { src: p.logo_url, alt: p.name, title: p.name, href: p.website_url ?? undefined }
      : {
          node: (
            <span className="inline-flex items-center rounded-full border border-ocean-200 bg-ocean-50 px-4 py-2 text-sm font-bold text-ocean-700 whitespace-nowrap">
              {p.name}
            </span>
          ),
          title: p.name,
          href: p.website_url ?? undefined,
        }
  );

  return (
    <section className="py-16 sm:py-20 bg-paper-tint border-y border-line">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-xs font-semibold tracking-wide uppercase text-ink-mute">
          {t("landing.partners.label")}
        </p>
      </div>
      <div className="mt-8 relative h-16 overflow-hidden">
        <LogoLoop
          logos={items}
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
