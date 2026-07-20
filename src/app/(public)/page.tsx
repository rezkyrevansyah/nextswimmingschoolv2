import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import Navbar from "./_components/Navbar";
import Hero from "./_components/Hero";
import Programs from "./_components/Programs";
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Partners partners={partners ?? []} />
      <Programs programs={programs ?? []} />
    </div>
  );
}
