import { createClient } from "@/utils/supabase/server";
import FAQAccordion from "./FAQAccordion";
import { getAdminWaPhone } from "@/lib/landing-config";

interface FAQItem { id: string; question: string; answer: string; }

const FAQ_DEFAULTS: FAQItem[] = [
  { id: "1", question: "Mulai usia berapa anak bisa ikut?", answer: "Mulai 4 tahun sudah bisa bergabung kelas Starter kami yang dirancang khusus untuk anak-anak yang baru mengenal air." },
  { id: "2", question: "Bagaimana sistem pembayarannya?", answer: "Member reguler membayar tagihan bulanan. Kami juga menyediakan kelas private dengan tarif per sesi." },
  { id: "3", question: "Apakah ada uji coba gratis?", answer: "Kami menyediakan sesi konsultasi & orientasi gratis. Hubungi admin kami via WhatsApp untuk jadwalkan kunjungan kolam." },
];

export default async function FAQ() {
  const supabase = await createClient();
  const [{ data }, waPhone] = await Promise.all([
    supabase.from("landing_faqs").select("id, question, answer").order("sort_order"),
    getAdminWaPhone(),
  ]);

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

        <FAQAccordion items={items} waPhone={waPhone} />
      </div>
    </section>
  );
}
