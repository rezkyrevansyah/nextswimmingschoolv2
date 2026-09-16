import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import Navbar from "./_components/Navbar";
import Hero from "./_components/Hero";
import Programs from "./_components/Programs";
import WhyNext from "./_components/WhyNext";
import VideoSection from "./_components/VideoSection";
import Coaches from "./_components/Coaches";
import Testimonials from "./_components/Testimonials";
import Partners from "./_components/Partners";
import Branches from "./_components/Branches";
import Faq from "./_components/Faq";
import Footer from "./_components/Footer";
import FloatingWhatsapp from "./_components/FloatingWhatsapp";
import { GoogleTranslate } from "@/components/GoogleTranslate";

export const metadata: Metadata = {
  title: "Next Swimming School",
};

export default async function LandingPage() {
  const supabase = await createClient();

  // Fired in parallel — these are all independent reads, so there's no
  // reason to make the client wait for 8 sequential round-trips before any
  // HTML can stream.
  const [
    { data: partners },
    { data: programs },
    { data: coaches },
    { data: whyNextItems },
    { data: testimonials },
    { data: branchEntries },
    { data: faqs },
    { data: footerConfig },
  ] = await Promise.all([
    supabase
      .from("landing_partners")
      .select("id, name, logo_url, website_url")
      .order("sort_order"),
    supabase
      .from("landing_programs")
      .select("id, name, description, class_type, photo_url")
      .order("sort_order"),
    supabase
      .from("landing_coaches")
      .select("id, name, photo_url")
      .order("sort_order"),
    supabase
      .from("landing_why_next")
      .select("id, icon, title, description")
      .order("sort_order"),
    supabase
      .from("landing_testimonials_v2")
      .select("id, name, role, body_text, avatar_url, rating")
      .order("sort_order"),
    supabase
      .from("landing_branches")
      .select("id, branch_id, name, address, city, phone, photo_url, lat, lng, linked:public_branches!branch_id(name, city, address, phone, logo_url)")
      .order("sort_order"),
    supabase
      .from("landing_faqs")
      .select("id, question, answer")
      .order("sort_order"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("landing_config") as any)
      .select("footer_tagline, footer_address, footer_wa_number, contact_email, copyright_text, social_instagram, social_tiktok, social_youtube, floating_wa_message, youtube_video_url, youtube_video_url_2, youtube_video_url_3, youtube_section_title, youtube_section_subtitle")
      .eq("id", 1)
      .single() as Promise<{ data: { footer_tagline: string | null; footer_address: string | null; footer_wa_number: string | null; contact_email: string | null; copyright_text: string | null; social_instagram: string | null; social_tiktok: string | null; social_youtube: string | null; floating_wa_message: string | null; youtube_video_url: string | null; youtube_video_url_2: string | null; youtube_video_url_3: string | null; youtube_section_title: string | null; youtube_section_subtitle: string | null } | null }>,
  ]);

  const branches = (branchEntries ?? []).map((row) => {
    const rawLinked = Array.isArray(row.linked) ? row.linked[0] : row.linked;
    const linked = rawLinked as { name: string | null; city: string | null; address: string | null; phone: string | null; logo_url: string | null } | null | undefined;
    return row.branch_id
      ? { id: row.id, name: linked?.name ?? null, city: linked?.city ?? null, address: linked?.address ?? null, phone: linked?.phone ?? null, photo_url: row.photo_url || linked?.logo_url || null, lat: row.lat, lng: row.lng }
      : { id: row.id, name: row.name, city: row.city, address: row.address, phone: row.phone, photo_url: row.photo_url, lat: row.lat, lng: row.lng };
  });

  return (
    <div className="min-h-screen bg-white">
      <GoogleTranslate />
      <Navbar />
      <Hero waPhone={footerConfig?.footer_wa_number ?? null} waMessage={footerConfig?.floating_wa_message ?? null} />
      <Partners partners={partners ?? []} />
      <Programs programs={programs ?? []} />
      <WhyNext items={whyNextItems ?? []} />
      <VideoSection
        videoUrl={footerConfig?.youtube_video_url}
        videoUrl2={footerConfig?.youtube_video_url_2}
        videoUrl3={footerConfig?.youtube_video_url_3}
        title={footerConfig?.youtube_section_title}
        subtitle={footerConfig?.youtube_section_subtitle}
      />
      <Coaches coaches={coaches ?? []} />
      <Testimonials testimonials={testimonials ?? []} />
      <Branches branches={branches} />
      <Faq items={faqs ?? []} waPhone={footerConfig?.footer_wa_number ?? null} />
      <Footer config={footerConfig ?? null} />
      <FloatingWhatsapp phone={footerConfig?.footer_wa_number ?? null} message={footerConfig?.floating_wa_message ?? null} />
    </div>
  );
}
