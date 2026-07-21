import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import Navbar from "./_components/Navbar";
import Hero from "./_components/Hero";
import Programs from "./_components/Programs";
import WhyNext from "./_components/WhyNext";
import Coaches from "./_components/Coaches";
import Testimonials from "./_components/Testimonials";
import Partners from "./_components/Partners";

export const metadata: Metadata = {
  title: "Next Swimming School",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: partners } = await supabase
    .from("landing_partners")
    .select("id, name, logo_url, website_url")
    .order("sort_order");
  const { data: programs } = await supabase
    .from("landing_programs")
    .select("id, name, description, class_type, photo_url")
    .order("sort_order");
  const { data: coaches } = await supabase
    .from("landing_coaches")
    .select("id, name, photo_url")
    .order("sort_order");
  const { data: whyNextItems } = await supabase
    .from("landing_why_next")
    .select("id, icon, title, description")
    .order("sort_order");
  const { data: testimonials } = await supabase
    .from("landing_testimonials_v2")
    .select("id, name, role, body_text, avatar_url, rating")
    .order("sort_order");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Partners partners={partners ?? []} />
      <Programs programs={programs ?? []} />
      <WhyNext items={whyNextItems ?? []} />
      <Coaches coaches={coaches ?? []} />
      <Testimonials testimonials={testimonials ?? []} />
    </div>
  );
}
