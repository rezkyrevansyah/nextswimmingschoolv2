import Link from "next/link";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

interface HeroData {
  headline: string; body_text: string; badge_text: string; bg_image_url: string;
  cta_primary_text: string; cta_primary_wa: string; cta_secondary_text: string;
  feature_1_icon: string; feature_1_text: string;
  feature_2_icon: string; feature_2_text: string;
  feature_3_icon: string; feature_3_text: string;
  feature_4_icon: string; feature_4_text: string;
}
interface HeroStat { id: string; value: string; suffix: string; label: string; sub: string; icon: string; }

const HERO_DEFAULTS: HeroData = {
  headline: "Belajar renang\nlebih aman, modern,\ndan profesional.",
  body_text: "Next Swimming School membantu anak hingga dewasa belajar renang dengan metode modern, coach bersertifikat, dan sistem digital yang memudahkan orang tua memantau setiap progres.",
  badge_text: "Sistem digital terintegrasi — 5+ cabang aktif",
  bg_image_url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1800&q=80&auto=format&fit=crop",
  cta_primary_text: "Konsultasi Sekarang",
  cta_primary_wa: "Halo, saya ingin tanya soal program & jadwal Next Swimming School.",
  cta_secondary_text: "Daftar Online",
  feature_1_icon: "shield", feature_1_text: "Coach bersertifikat",
  feature_2_icon: "chart",  feature_2_text: "Progress monitoring",
  feature_3_icon: "users",  feature_3_text: "Rasio kelas kecil",
  feature_4_icon: "qr",     feature_4_text: "Sistem QR absensi",
};

const STATS_DEFAULTS: HeroStat[] = [
  { id: "1", value: "5",   suffix: "+", label: "Cabang aktif",        sub: "Jakarta, Bogor, Bandung",  icon: "map"    },
  { id: "2", value: "500", suffix: "+", label: "Member terdaftar",    sub: "Anak hingga dewasa",        icon: "users"  },
  { id: "3", value: "30",  suffix: "+", label: "Coach bersertifikat", sub: "Tersertifikasi resmi",      icon: "shield" },
  { id: "4", value: "20",  suffix: "+", label: "Program & kelas",     sub: "Berbagai level kemampuan",  icon: "book"   },
];

export default async function Hero({ waPhone }: { waPhone?: string }) {
  const supabase = await createClient();
  const [{ data: heroData }, { data: statsData }] = await Promise.all([
    supabase.from("landing_hero").select("*").single(),
    supabase.from("landing_hero_stats").select("id, value, suffix, label, sub, icon").order("sort_order"),
  ]);

  const h = heroData ?? HERO_DEFAULTS;
  const stats = (statsData && statsData.length > 0) ? statsData : STATS_DEFAULTS;

  const features = [
    [h.feature_1_icon, h.feature_1_text],
    [h.feature_2_icon, h.feature_2_text],
    [h.feature_3_icon, h.feature_3_text],
    [h.feature_4_icon, h.feature_4_text],
  ];

  return (
    <section id="home" className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${h.bg_image_url}')` }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(3,28,74,0.88) 0%, rgba(5,45,110,0.80) 50%, rgba(2,20,55,0.75) 100%)" }} />
      <div className="caustics absolute inset-0 opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur ring-1 ring-white/20 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" />
              {h.badge_text}
            </div>
            <h1 className="font-display font-extrabold text-[40px] sm:text-5xl lg:text-[64px] leading-[1.02] tracking-tight whitespace-pre-line">
              {h.headline}
            </h1>
            <p className="text-white/80 text-base lg:text-lg mt-6 max-w-xl leading-relaxed">
              {h.body_text}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={waLink(h.cta_primary_wa, waPhone)} target="_blank" rel="noreferrer">
                <Btn variant="accent" icon="whatsapp" size="lg">{h.cta_primary_text}</Btn>
              </a>
              <Link href="/register" className="inline-flex items-center gap-2 text-white/90 hover:text-white font-semibold px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur ring-1 ring-white/20">
                <Icon name="plus" className="w-4 h-4" /> {h.cta_secondary_text}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-white/85 text-sm">
              {features.map(([icon, text]) => (
                <span key={text} className="inline-flex items-center gap-1.5">
                  <Icon name={icon} className="w-4 h-4 text-wave-200" /> {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right visual: phone mockup (static decorative) */}
          <div className="relative">
            <div className="relative mx-auto w-[280px] sm:w-[320px] aspect-[9/19] bg-ink rounded-[40px] p-3 shadow-float ring-1 ring-white/10 rotate-[3deg]">
              <div className="absolute top-3 inset-x-0 mx-auto w-24 h-5 bg-ink rounded-b-2xl z-10" />
              <div className="w-full h-full bg-gradient-to-b from-ocean-50 to-wave-50 rounded-[32px] overflow-hidden relative">
                <div className="px-4 pt-10">
                  <div className="text-[10px] uppercase tracking-widest text-ocean-600 font-bold">Selamat pagi</div>
                  <div className="font-display font-bold text-lg text-ink leading-tight">Hai, Arsenio 👋</div>
                </div>
                <div className="mx-4 mt-4 bg-white rounded-2xl shadow-card p-3.5 border border-line">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-wave-600">Kelas hari ini</div>
                    <Status kind="active" dot={false}>Aktif</Status>
                  </div>
                  <div className="font-display font-bold text-ink mt-1.5">Shark — Gaya Bebas</div>
                  <div className="text-[11px] text-ink-mute mt-0.5">Selasa · 16:00 · Coach Bagas</div>
                  <div className="mt-3 h-1.5 bg-paper-deep rounded-full overflow-hidden">
                    <div className="h-full bg-wave-500 w-2/3" />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-mute mt-1.5"><span>Kehadiran</span><span className="font-mono">22/30</span></div>
                </div>
                <div className="mx-4 mt-3 grid grid-cols-2 gap-2.5">
                  <div className="bg-white rounded-xl p-2.5 border border-line">
                    <div className="text-[9px] uppercase tracking-widest text-ink-faint font-bold">Hadir bln ini</div>
                    <div className="font-display font-bold text-xl text-ok-600 mt-0.5">6</div>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-line">
                    <div className="text-[9px] uppercase tracking-widest text-ink-faint font-bold">Izin</div>
                    <div className="font-display font-bold text-xl text-warn-500 mt-0.5">1</div>
                  </div>
                </div>
                <div className="mx-4 mt-3 bg-ocean-700 text-white rounded-2xl p-3.5">
                  <div className="text-[9px] uppercase tracking-widest text-wave-200 font-bold">Tagihan Mei</div>
                  <div className="font-display font-bold text-base mt-0.5">Rp 600.000</div>
                  <div className="text-[10px] text-white/70">Jatuh tempo dalam 7 hari</div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block absolute -left-6 top-12 bg-white rounded-2xl p-3.5 shadow-lift border border-line w-44 -rotate-[6deg] anim-in">
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Coach hari ini</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-1.5">
                  <Avatar name="Bagas P" size={26} ring />
                  <Avatar name="Linda H" size={26} ring />
                  <Avatar name="Rizki A" size={26} ring />
                </div>
                <span className="text-xs font-semibold text-ink-soft">+5 lagi</span>
              </div>
              <div className="mt-2 text-[11px] text-ink-mute">Semua bersertifikat aktif</div>
            </div>
            <div className="hidden lg:block absolute -right-3 bottom-6 bg-white rounded-2xl p-3.5 shadow-lift border border-line w-52 rotate-[5deg] anim-in">
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Live Attendance</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-7 h-7 rounded-lg bg-ok-50 text-ok-600 flex items-center justify-center">
                  <Icon name="check" className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div>
                  <div className="text-xs font-semibold text-ink">Bunga Lestari</div>
                  <div className="text-[10px] text-ink-mute">Hadir · 16:58</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative bg-white border-t border-ocean-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-ocean-100/60 rounded-none overflow-hidden">
          {stats.map(({ id, value, suffix, label, sub, icon }, i) => (
            <div key={id} className={`bg-white flex flex-col items-center text-center px-5 py-6 lg:py-8 gap-3 group hover:bg-ocean-50 transition-colors duration-200 ${i === 0 ? "rounded-l-2xl" : ""} ${i === stats.length - 1 ? "rounded-r-2xl" : ""}`}>
              <div className="w-11 h-11 rounded-2xl bg-ocean-50 text-ocean-500 flex items-center justify-center group-hover:bg-ocean-100 group-hover:text-ocean-600 transition-colors duration-200">
                <Icon name={icon} className="w-5 h-5" />
              </div>
              <div className="flex items-end gap-0.5 leading-none">
                <span className="font-display font-extrabold text-4xl lg:text-5xl text-ocean-700 tabular-nums">{value}</span>
                {suffix && <span className="font-display font-extrabold text-2xl lg:text-3xl text-wave-400 mb-1">{suffix}</span>}
              </div>
              <div className="space-y-0.5">
                <div className="font-display font-bold text-sm lg:text-base text-ink">{label}</div>
                <div className="text-[11px] lg:text-xs text-ink-faint">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
