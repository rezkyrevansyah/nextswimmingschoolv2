import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import LandingNav from "./_components/LandingNav";
import Hero from "./_components/Hero";
import WhyUs from "./_components/WhyUs";
import Programs from "./_components/Programs";
import Ecosystem from "./_components/Ecosystem";
import CoachShowcase from "./_components/CoachShowcase";
import Testimonials from "./_components/Testimonials";
import FAQ from "./_components/FAQ";
import FinalCTA from "./_components/FinalCTA";
import LandingFooter from "./_components/LandingFooter";
import WAFloatingButton from "./_components/WAFloatingButton";

export const metadata: Metadata = {
  title: "Sekolah Renang Anak & Dewasa Terbaik | Next Swimming School",
  description:
    "Les renang anak dan dewasa profesional di Indonesia. Pelatih bersertifikasi resmi, kolam aman & bersih, rasio kelas kecil, serta monitoring rapor digital progres anak Anda.",
  keywords: [
    "sekolah renang",
    "les renang anak",
    "les renang dewasa",
    "belajar renang",
    "pelatih renang bersertifikat",
    "monitoring renang digital",
    "swimming school indonesia",
  ],
};

export default async function LandingPage() {
  const supabase = await createClient();
  const [{ data: config }, { data: navLinks }] = await Promise.all([
    supabase.from("landing_config").select("footer_wa_number, floating_wa_message, nav_cta_text, nav_cta_message").single(),
    supabase.from("landing_nav_links").select("href, label").order("sort_order"),
  ]);

  const waPhone = config?.footer_wa_number ?? undefined;

  return (
    <div className="bg-white">
      <LandingNav
        links={navLinks ?? undefined}
        ctaText={config?.nav_cta_text ?? undefined}
        ctaMessage={config?.nav_cta_message ?? undefined}
        waPhone={waPhone}
      />
      <main>
        <Hero waPhone={waPhone} />
        <WhyUs waPhone={waPhone} />
        <Programs />
        <Ecosystem />
        <CoachShowcase />
        <Testimonials />
        <FAQ />
        <FinalCTA waPhone={waPhone} />
      </main>
      <LandingFooter />
      <WAFloatingButton message={config?.floating_wa_message ?? undefined} waPhone={waPhone} />
    </div>
  );
}
