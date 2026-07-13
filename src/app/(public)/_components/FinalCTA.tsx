import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

interface CtaData {
  headline: string;
  body_text: string;
  cta_wa_text: string | null;
  cta_wa_message: string | null;
  cta_sec_text: string | null;
}

const DEFAULTS: CtaData = {
  headline: "Coba satu sesi gratis.\nLihat sendiri bedanya.",
  body_text: "Tanpa biaya, tanpa komitmen. Isi data singkat dan admin akan menjadwalkan sesi trial di cabang terdekat.",
  cta_wa_text: "Hubungi Admin",
  cta_wa_message: "Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?",
  cta_sec_text: "Lihat Program",
};

export default async function FinalCTA({ waPhone }: { waPhone?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_finalcta")
    .select("headline, body_text, cta_wa_text, cta_wa_message, cta_sec_text")
    .single();

  const cta = (data as CtaData | null) ?? DEFAULTS;
  const primaryLabel = cta.cta_wa_text?.trim() || DEFAULTS.cta_wa_text || "Hubungi Admin";
  const primaryMessage = cta.cta_wa_message?.trim() || DEFAULTS.cta_wa_message || "Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?";
  const secondaryLabel = cta.cta_sec_text?.trim() || DEFAULTS.cta_sec_text || "Lihat Program";

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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Btn href={waLink(primaryMessage, waPhone)} variant="accent" size="lg" icon="whatsapp">
            {primaryLabel}
          </Btn>
          <Btn href="#program" variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/40">
            {secondaryLabel}
          </Btn>
        </div>
      </div>
    </section>
  );
}
