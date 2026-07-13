import Image from "next/image";
import Icon from "@/components/ui/Icon";
import Placeholder from "@/components/ui/Placeholder";
import { createClient } from "@/utils/supabase/server";

interface SafetyPoint {
  id: string;
  text: string;
}

const SECTION_DEFAULTS = {
  section_label: "Standar Keamanan",
  headline: "Keamanan bukan slogan, tapi SOP.",
  body_text: "Setiap cabang mengikuti standar pengawasan air yang sama, diaudit berkala oleh admin pusat.",
  photo_url: null as string | null,
};

const POINTS_DEFAULTS: SafetyPoint[] = [
  { id: "1", text: "Rasio coach-murid kecil demi perhatian dan keamanan maksimal" },
  { id: "2", text: "Pengawasan kolam ketat dengan SOP penyelamatan air standar ARC" },
  { id: "3", text: "Seluruh coach tersertifikasi CPR dan penanganan medis darurat" },
  { id: "4", text: "Lingkungan kolam semi-private yang bersih dan terawat" },
  { id: "5", text: "Evaluasi berkala kualitas air untuk kenyamanan kulit anak" },
];

export default async function SafetyStandards() {
  const supabase = await createClient();
  const [{ data: sectionData }, { data: pointsData }] = await Promise.all([
    supabase.from("landing_safety").select("section_label, headline, body_text, photo_url").single(),
    supabase.from("landing_safety_points").select("id, text").order("sort_order"),
  ]);

  const s = sectionData ?? SECTION_DEFAULTS;
  const points = (pointsData && pointsData.length > 0) ? pointsData : POINTS_DEFAULTS;

  return (
    <section id="safety" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl order-2 lg:order-1">
            {s.photo_url ? (
              <Image src={s.photo_url} alt="Standar keamanan kolam Next Swimming School" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            ) : (
              <Placeholder
                ratio="4/3"
                label="FOTO: lifeguard mengawasi tepi kolam, papan SOP terlihat"
                className="absolute inset-0 border-0"
              />
            )}
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">{s.section_label}</div>
            <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
              {s.headline}
            </h2>
            <p className="text-ink-mute mt-4 text-lg leading-relaxed">{s.body_text}</p>
            <ul className="mt-8 space-y-4">
              {points.map((p) => (
                <li key={p.id} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-ok-50 text-ok-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-ink-soft leading-relaxed">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
