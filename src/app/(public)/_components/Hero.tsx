import Placeholder from "@/components/ui/Placeholder";
import { TrialButton } from "./TrialBooking";
import { createClient } from "@/utils/supabase/server";

interface HeroData {
  headline: string;
  body_text: string;
  bg_image_url: string | null;
}

const HERO_DEFAULTS: HeroData = {
  headline: "Renang aman, diajar\ncoach bersertifikat.",
  body_text: "Kelas kecil, progres dipantau tiap sesi, coba gratis sebelum daftar.",
  bg_image_url: null,
};

export default async function Hero() {
  const supabase = await createClient();
  const { data: heroData } = await supabase
    .from("landing_hero")
    .select("headline, body_text, bg_image_url")
    .single();

  const h = (heroData as HeroData | null) ?? HERO_DEFAULTS;

  return (
    <section id="home" className="relative min-h-[100dvh] flex items-end pt-24 pb-16 lg:pb-20 overflow-hidden bg-ink">
      <div className="absolute inset-0">
        {h.bg_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.bg_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Placeholder
            ratio="4/3"
            label="FOTO: anak-anak sedang belajar di kolam dangkal, coach mendampingi, cahaya alami"
            className="w-full h-full rounded-none border-0"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 w-full">
        <div className="max-w-2xl text-white">
          <h1 className="font-display font-extrabold text-[36px] sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight whitespace-pre-line">
            {h.headline}
          </h1>
          <p className="text-white/85 text-base lg:text-lg mt-5 max-w-lg leading-relaxed">
            {h.body_text}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <TrialButton size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
