import Link from "next/link";
import Placeholder from "@/components/ui/Placeholder";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

interface HeroData {
  headline: string;
  body_text: string;
  bg_image_url: string | null;
  badge_text: string | null;
  cta_primary_text: string | null;
  cta_primary_wa: string | null;
  cta_secondary_text: string | null;
  feature_1_icon: string | null;
  feature_1_text: string | null;
  feature_2_icon: string | null;
  feature_2_text: string | null;
  feature_3_icon: string | null;
  feature_3_text: string | null;
  feature_4_icon: string | null;
  feature_4_text: string | null;
}

interface HeroStat {
  id: string;
  value: string;
  suffix: string;
  label: string;
  sub: string;
  icon: string;
}

const HERO_DEFAULTS: HeroData = {
  headline: "Renang aman, diajar\ncoach bersertifikat.",
  body_text: "Kelas kecil, progres dipantau tiap sesi, coba gratis sebelum daftar.",
  bg_image_url: null,
  badge_text: "Sekolah Renang Modern",
  cta_primary_text: "Hubungi Admin",
  cta_primary_wa: "Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?",
  cta_secondary_text: "Daftar Online",
  feature_1_icon: "star",
  feature_1_text: "Coach bersertifikat",
  feature_2_icon: "check",
  feature_2_text: "SOP keamanan ketat",
  feature_3_icon: "calendar",
  feature_3_text: "Jadwal fleksibel",
  feature_4_icon: "map",
  feature_4_text: "Cabang terdekat",
};

const HERO_STAT_DEFAULTS: HeroStat[] = [
  { id: "1", value: "500+", suffix: "", label: "Member aktif", sub: "Anak & dewasa", icon: "users" },
  { id: "2", value: "4", suffix: "+", label: "Cabang", sub: "Tersedia", icon: "map" },
  { id: "3", value: "98", suffix: "%", label: "Kepuasan", sub: "Orang tua", icon: "star" },
  { id: "4", value: "24", suffix: "/7", label: "Support", sub: "WhatsApp", icon: "whatsapp" },
];

export default async function Hero({ waPhone }: { waPhone?: string }) {
  const supabase = await createClient();
  const [{ data: heroData }, { data: heroStats }] = await Promise.all([
    supabase
      .from("landing_hero")
      .select("headline, body_text, bg_image_url, badge_text, cta_primary_text, cta_primary_wa, cta_secondary_text, feature_1_icon, feature_1_text, feature_2_icon, feature_2_text, feature_3_icon, feature_3_text, feature_4_icon, feature_4_text")
      .single(),
    supabase.from("landing_hero_stats").select("id, value, suffix, label, sub, icon").order("sort_order"),
  ]);

  const h = (heroData as HeroData | null) ?? HERO_DEFAULTS;
  const stats = (heroStats && heroStats.length > 0 ? heroStats : HERO_STAT_DEFAULTS) as HeroStat[];

  const features = [
    { icon: h.feature_1_icon ?? "star", text: h.feature_1_text ?? "Coach bersertifikat" },
    { icon: h.feature_2_icon ?? "check", text: h.feature_2_text ?? "SOP keamanan ketat" },
    { icon: h.feature_3_icon ?? "calendar", text: h.feature_3_text ?? "Jadwal fleksibel" },
    { icon: h.feature_4_icon ?? "map", text: h.feature_4_text ?? "Cabang terdekat" },
  ];

  const primaryLabel = h.cta_primary_text?.trim() || "Hubungi Admin";
  const primaryMessage = h.cta_primary_wa?.trim() || "Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?";
  const secondaryLabel = h.cta_secondary_text?.trim() || "Daftar Online";

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
        <div className="max-w-3xl text-white">
          {h.badge_text && (
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85 backdrop-blur-sm">
              {h.badge_text}
            </div>
          )}
          <h1 className="font-display font-extrabold text-[36px] sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight whitespace-pre-line mt-4">
            {h.headline}
          </h1>
          <p className="text-white/85 text-base lg:text-lg mt-5 max-w-2xl leading-relaxed">
            {h.body_text}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
            <Btn href={waLink(primaryMessage, waPhone)} variant="accent" size="lg" icon="whatsapp">
              {primaryLabel}
            </Btn>
            <Btn href="/register" variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/40">
              {secondaryLabel}
            </Btn>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.text} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15 text-wave-200">
                    <Icon name={feature.icon} className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-semibold text-white/90">{feature.text}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{stat.label}</div>
                <div className="mt-1 font-display font-bold text-2xl text-white">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-sm text-white/70">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
