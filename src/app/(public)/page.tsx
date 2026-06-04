import type { Metadata } from "next";
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

export default function LandingPage() {
  return (
    <div className="bg-white">
      <LandingNav />
      <main>
        <Hero />
        <WhyUs />
        <Programs />
        <Ecosystem />
        <CoachShowcase />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

