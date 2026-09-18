"use client";

import CardNav, { type CardNavItem } from "@/components/CardNav";
import { GoogleLanguageSwitcher } from "@/components/GoogleTranslate";

export default function Navbar() {
  const items: CardNavItem[] = [
    {
      label: "Programs",
      bgColor: "#EAF4FB",
      textColor: "#0A2540",
      links: [
        { label: "Our Programs", href: "#programs", ariaLabel: "Our Programs" },
        { label: "Our Coaches", href: "#coaches", ariaLabel: "Our Coaches" },
      ],
    },
    {
      label: "About Us",
      bgColor: "#E5F7FE",
      textColor: "#0A2540",
      links: [
        { label: "Why Next", href: "#why-next", ariaLabel: "Why Next" },
        { label: "Testimonials", href: "#testimonials", ariaLabel: "Testimonials" },
      ],
    },
    {
      label: "Visit Us",
      bgColor: "#EEF4FA",
      textColor: "#0A2540",
      links: [
        { label: "Our Centers", href: "#branches", ariaLabel: "Our Branches" },
        { label: "FAQ", href: "#faq", ariaLabel: "FAQ" },
      ],
    },
  ];

  return (
    <CardNav
      logo="/rapor/logo_next_persegipanjang_1.svg"
      logoAlt={"Next Swimming School"}
      items={items}
      baseColor="#FFFFFF"
      menuColor="#0B3F73"
      ctaText={"Login"}
      ctaHref="/login"
      rightElement={<GoogleLanguageSwitcher />}
    />
  );
}
