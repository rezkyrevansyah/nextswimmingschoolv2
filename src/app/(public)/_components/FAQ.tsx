import { createClient } from "@/utils/supabase/server";
import FAQAccordion from "./FAQAccordion";

interface FAQItem { id: string; question: string; answer: string; }

const FAQ_DEFAULTS: FAQItem[] = [
  { id: "1", question: "Mulai usia berapa anak bisa ikut?", answer: "Mulai 4 tahun untuk kelas Tadpole (pengenalan air). Untuk usia di bawahnya tersedia private dengan pendamping orang tua." },
  { id: "2", question: "Apakah ada sesi trial gratis?", answer: "Ya. Isi form Coba Gratis dan admin akan menjadwalkan satu sesi trial tanpa biaya di cabang terdekat." },
  { id: "3", question: "Bagaimana sistem pembayarannya?", answer: "Member reguler bayar per bulan, member private bayar per paket sesi. Konfirmasi pembayaran via WhatsApp ke admin cabang." },
  { id: "4", question: "Bagaimana cara absensinya?", answer: "Setiap member punya QR code unik. Coach scan QR di awal sesi, dan orang tua bisa pantau kehadiran lewat halaman member." },
  { id: "5", question: "Apakah ada rapor perkembangan?", answer: "Ada, setiap semester. Coach mengisi penilaian berdasarkan aspek yang dikonfigurasi admin. Member juga bisa memberi review ke coach." },
  { id: "6", question: "Apakah bisa untuk sekolah atau B2B?", answer: "Bisa. Program School Collaboration memungkinkan sekolah membayar langsung dan mendapat akses School Panel untuk memantau rapor." },
];

export default async function FAQ() {
  const supabase = await createClient();
  const { data } = await supabase.from("landing_faqs").select("id, question, answer").order("sort_order");

  const items = (data && data.length > 0) ? data : FAQ_DEFAULTS;

  return (
    <section id="faq" className="bg-white">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">FAQ</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Pertanyaan yang sering ditanyakan.
          </h2>
          <p className="text-ink-mute mt-4">Tidak menemukan jawaban? Chat admin kami langsung.</p>
        </div>

        <FAQAccordion items={items} />
      </div>
    </section>
  );
}
