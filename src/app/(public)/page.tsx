import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { TrialBookingProvider } from "./_components/TrialBooking";
import LandingNav from "./_components/LandingNav";
import Hero from "./_components/Hero";
import WhyUs from "./_components/WhyUs";
import SafetyStandards from "./_components/SafetyStandards";
import Programs from "./_components/Programs";
import Facilities from "./_components/Facilities";
import CoachShowcase from "./_components/CoachShowcase";
import LearningProcess from "./_components/LearningProcess";
import Testimonials from "./_components/Testimonials";
import Gallery from "./_components/Gallery";
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
  const [{ data: config }, { data: navLinks }, { data: branchData }] = await Promise.all([
    supabase.from("landing_config").select("footer_wa_number, floating_wa_message").single(),
    supabase.from("landing_nav_links").select("href, label").order("sort_order"),
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
  ]);

  const waPhone = config?.footer_wa_number ?? undefined;
  const branches = (branchData ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Next Swimming School",
    description:
      "Sekolah renang anak dan dewasa dengan pelatih bersertifikat, kolam aman, dan monitoring rapor digital.",
    sport: "Swimming",
    ...(branches.length > 0 && {
      department: branches.map((b) => ({ "@type": "SportsActivityLocation", name: b.name })),
    }),
  };

  return (
    <TrialBookingProvider branches={branches} waPhone={waPhone}>
      <div className="bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LandingNav links={navLinks ?? undefined} />
        <main>
          <Hero />
          <WhyUs />
          <SafetyStandards />
          <Programs />
          <Facilities />
          <CoachShowcase />
          <LearningProcess />
          <Testimonials />
          <Gallery />
          <FAQ />
          <FinalCTA />
        </main>
        <LandingFooter />
        <WAFloatingButton message={config?.floating_wa_message ?? undefined} waPhone={waPhone} />
      </div>
    </TrialBookingProvider>
  );
}
