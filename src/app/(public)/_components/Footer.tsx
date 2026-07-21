"use client";

import Icon from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";
import { waLink, mailtoLink } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

interface FooterConfig {
  footer_tagline: string;
  footer_address: string | null;
  footer_wa_number: string;
  contact_email: string | null;
  copyright_text: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
}

const NAV_LINKS: { href: string; labelKey: string }[] = [
  { href: "#programs", labelKey: "landing.nav.groups.programs.links.programs" },
  { href: "#coaches", labelKey: "landing.nav.groups.programs.links.coaches" },
  { href: "#why-next", labelKey: "landing.nav.groups.about.links.whyNext" },
  { href: "#testimonials", labelKey: "landing.nav.groups.about.links.testimonials" },
  { href: "#branches", labelKey: "landing.nav.groups.visit.links.branches" },
  { href: "#faq", labelKey: "landing.nav.groups.visit.links.faq" },
];

export default function Footer({ config }: { config: FooterConfig | null }) {
  const { t } = useLocale();
  const year = new Date().getFullYear();
  const socials = [
    { key: "social_instagram", icon: "instagram" as const, url: config?.social_instagram },
    { key: "social_tiktok", icon: "tiktok" as const, url: config?.social_tiktok },
    { key: "social_youtube", icon: "youtube" as const, url: config?.social_youtube },
  ].filter((s) => s.url);

  return (
    <footer className="bg-ocean-900 text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo size={36} withWord dark />
          <p className="mt-3 text-sm leading-relaxed max-w-xs">{config?.footer_tagline}</p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/40">{t("landing.footer.linksHeading")}</div>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-white transition-colors">{t(link.labelKey)}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/40">{t("landing.footer.contactHeading")}</div>
          <ul className="mt-3 space-y-2 text-sm">
            {config?.footer_wa_number && (
              <li>
                <a href={waLink("", config.footer_wa_number)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Icon name="whatsapp" className="w-4 h-4 shrink-0" />{config.footer_wa_number}
                </a>
              </li>
            )}
            {config?.contact_email && (
              <li>
                <a href={mailtoLink("", "", config.contact_email)} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Icon name="mail" className="w-4 h-4 shrink-0" />{config.contact_email}
                </a>
              </li>
            )}
            {config?.footer_address && (
              <li className="flex items-start gap-2">
                <Icon name="pin" className="w-4 h-4 shrink-0 mt-0.5" /><span>{config.footer_address}</span>
              </li>
            )}
          </ul>
        </div>

        {socials.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/40">{t("landing.footer.followHeading")}</div>
            <div className="mt-3 flex items-center gap-3">
              {socials.map((s) => (
                <a key={s.key} href={s.url!} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Icon name={s.icon} className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-white/40 text-center">
          {(config?.copyright_text || t("landing.footer.copyrightFallback")).replace("{year}", String(year))}
        </div>
      </div>
    </footer>
  );
}
