import { TrialButton } from "./TrialBooking";
import { createClient } from "@/utils/supabase/server";

interface CtaData {
  headline: string; body_text: string;
}

const DEFAULTS: CtaData = {
  headline: "Coba satu sesi gratis.\nLihat sendiri bedanya.",
  body_text: "Tanpa biaya, tanpa komitmen. Isi data singkat dan admin akan menjadwalkan sesi trial di cabang terdekat.",
};

export default async function FinalCTA() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_finalcta")
    .select("headline, body_text")
    .single();

  const cta = (data as CtaData | null) ?? DEFAULTS;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 water-bg" />
      <div className="caustics absolute inset-0" />
      <div className="relative max-w-5xl mx-auto px-4 lg:px-8 py-20 lg:py-28 text-center text-white">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-6xl leading-tight whitespace-pre-line">
          {cta.headline}
        </h2>
        <p className="text-white/85 mt-5 max-w-2xl mx-auto text-lg">
          {cta.body_text}
        </p>
        <div className="mt-8 flex items-center justify-center">
          <TrialButton size="lg" variant="accent" />
        </div>
      </div>
    </section>
  );
}
