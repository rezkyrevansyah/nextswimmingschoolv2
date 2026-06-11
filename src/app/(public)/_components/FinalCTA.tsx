import { waLink } from "@/lib/utils";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { createClient } from "@/utils/supabase/server";

interface CtaData {
  headline: string; body_text: string; cta_wa_text: string; cta_wa_message: string; cta_sec_text: string;
}

const DEFAULTS: CtaData = {
  headline: "Mulai perjalanan renangmu\nbersama Next Swimming School.",
  body_text: "Chat admin kami untuk konsultasi program yang paling sesuai dengan anak Anda atau diri sendiri.",
  cta_wa_text: "Chat admin sekarang",
  cta_wa_message: "Halo, saya tertarik untuk daftar di Next Swimming School.",
  cta_sec_text: "Lihat program",
};

export default async function FinalCTA({ waPhone }: { waPhone?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_finalcta")
    .select("headline, body_text, cta_wa_text, cta_wa_message, cta_sec_text")
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
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={waLink(cta.cta_wa_message, waPhone)} target="_blank" rel="noreferrer">
            <Btn variant="wa" icon="whatsapp" size="lg">{cta.cta_wa_text}</Btn>
          </a>
          <a
            href="#program"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur ring-1 ring-white/20 text-white font-semibold"
          >
            <Icon name="arrow" className="w-4 h-4" /> {cta.cta_sec_text}
          </a>
        </div>
      </div>
    </section>
  );
}
