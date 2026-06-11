import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

interface WhyUsData {
  section_label: string; headline: string; body_text: string; wa_button_text: string; wa_message: string;
  featured_icon: string; featured_title: string; featured_desc: string;
  featured_stat1_label: string; featured_stat1_value: string;
  featured_stat2_label: string; featured_stat2_value: string;
}
interface WhyUsCard { id: string; icon: string; title: string; description: string; }

const SECTION_DEFAULTS: WhyUsData = {
  section_label: "Mengapa Kami",
  headline: "Lima alasan keluarga mempercayakan kami.",
  body_text: "Bukan sekadar belajar renang — kami menghadirkan ekosistem yang mempermudah orang tua, coach, dan administrasi sekolah dalam satu sistem.",
  wa_button_text: "Hubungi Admin via WhatsApp",
  wa_message: "Halo, saya ingin tanya kelebihan & detail program di Next Swimming School.",
  featured_icon: "shield",
  featured_title: "Coach Profesional",
  featured_desc: "Setiap coach memiliki sertifikasi yang diverifikasi admin sebelum mengajar.",
  featured_stat1_label: "Sertifikasi",
  featured_stat1_value: "100%",
  featured_stat2_label: "Lifeguard ARC",
  featured_stat2_value: "Aktif",
};

const CARDS_DEFAULTS: WhyUsCard[] = [
  { id: "1", icon: "chart",    title: "Progress Monitoring",   description: "Rapor digital per semester dengan aspek penilaian yang disesuaikan per kelas." },
  { id: "2", icon: "qr",       title: "Sistem Digital Modern", description: "QR absensi, notifikasi real-time, dan dashboard untuk orang tua." },
  { id: "3", icon: "calendar", title: "Jadwal Fleksibel",       description: "Kelas reguler, private, hingga afiliasi sekolah — pilih yang paling cocok." },
  { id: "4", icon: "target",   title: "Kelas Nyaman & Aman",    description: "Rasio coach-member kecil, kolam diawasi, dan SOP keamanan yang ketat." },
];

export default async function WhyUs({ waPhone }: { waPhone?: string }) {
  const supabase = await createClient();
  const [{ data: sectionData }, { data: cardsData }] = await Promise.all([
    supabase.from("landing_whyus").select("*").single(),
    supabase.from("landing_whyus_cards").select("id, icon, title, description").order("sort_order"),
  ]);

  const s = sectionData ?? SECTION_DEFAULTS;
  const cards = (cardsData && cardsData.length > 0) ? cardsData : CARDS_DEFAULTS;

  return (
    <section id="why" className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">{s.section_label}</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight whitespace-pre-line">
            {s.headline}
          </h2>
          <p className="text-ink-mute mt-4 text-lg">
            {s.body_text}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {/* Featured card */}
          <div className="lg:row-span-2 rounded-2xl border border-ocean-700 bg-ocean-700 text-white p-6 flex flex-col">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-white/15 text-wave-200">
              <Icon name={s.featured_icon} className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">{s.featured_title}</h3>
            <p className="text-sm mt-2 leading-relaxed text-white/75">{s.featured_desc}</p>
            <div className="mt-auto pt-8 grid grid-cols-2 gap-3 text-white/90">
              <div className="bg-white/10 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-widest text-wave-200">{s.featured_stat1_label}</div>
                <div className="font-display font-bold text-xl">{s.featured_stat1_value}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-widest text-wave-200">{s.featured_stat2_label}</div>
                <div className="font-display font-bold text-xl">{s.featured_stat2_value}</div>
              </div>
            </div>
          </div>

          {cards.map((it) => (
            <Card key={it.id}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-ocean-50 text-ocean-700">
                <Icon name={it.icon} className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-ink">{it.title}</h3>
              <p className="text-sm mt-2 leading-relaxed text-ink-mute">{it.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-ink-mute text-sm font-medium mb-3">Ingin berkonsultasi mengenai fasilitas kolam, jadwal, atau coach kami?</p>
          <a href={waLink(s.wa_message, waPhone)} target="_blank" rel="noreferrer">
            <Btn variant="primary" icon="whatsapp">{s.wa_button_text}</Btn>
          </a>
        </div>
      </div>
    </section>
  );
}
