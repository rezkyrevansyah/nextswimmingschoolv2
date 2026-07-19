"use client";

import CardNav, { type CardNavItem } from "@/components/CardNav";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function Navbar() {
  const { t } = useLocale();

  const items: CardNavItem[] = [
    {
      label: t("landing.nav.groups.programs.label"),
      bgColor: "#EAF4FB",
      textColor: "#0A2540",
      links: [
        { label: t("landing.nav.groups.programs.links.programs"), href: "#programs", ariaLabel: "Our Programs" },
        { label: t("landing.nav.groups.programs.links.coaches"), href: "#coaches", ariaLabel: "Our Coaches" },
      ],
    },
    {
      label: t("landing.nav.groups.about.label"),
      bgColor: "#E5F7FE",
      textColor: "#0A2540",
      links: [
        { label: t("landing.nav.groups.about.links.whyNext"), href: "#why-next", ariaLabel: "Why Next" },
        { label: t("landing.nav.groups.about.links.testimonials"), href: "#testimonials", ariaLabel: "Testimonials" },
      ],
    },
    {
      label: t("landing.nav.groups.visit.label"),
      bgColor: "#EEF4FA",
      textColor: "#0A2540",
      links: [
        { label: t("landing.nav.groups.visit.links.branches"), href: "#branches", ariaLabel: "Our Branches" },
        { label: t("landing.nav.groups.visit.links.faq"), href: "#faq", ariaLabel: "FAQ" },
      ],
    },
  ];

  return (
    <CardNav
      logo="/rapor/logo_next_persegipanjang_1.svg"
      logoAlt={t("landing.nav.logoAlt")}
      items={items}
      baseColor="#FFFFFF"
      menuColor="#0B3F73"
      ctaText={t("landing.nav.login")}
      ctaHref="/login"
    />
  );
}
