import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";

const BLOCKS = [
  {
    role: "Portal Orang Tua & Murid",
    icon: "users",
    items: [
      "Pantau rapor digital perkembangan teknik anak per semester",
      "Dapatkan notifikasi absensi kehadiran langsung di HP",
      "Ajukan izin berhalangan atau cuti secara online dengan mudah",
      "Cek tagihan bulanan dan riwayat pembayaran transparan",
      "Akses kalender jadwal latihan dan info libur kelas kapan saja",
    ],
  },
  {
    role: "Standar Keamanan Kolam",
    icon: "shield",
    items: [
      "Rasio coach-murid kecil demi perhatian & keamanan maksimal",
      "Pengawasan kolam ketat dan SOP penyelamatan air standar ARC",
      "Seluruh coach terlatih CPR & penanganan medis darurat",
      "Lingkungan kolam semi-private yang bersih dan terawat",
      "Evaluasi berkala kelayakan air untuk kenyamanan kulit anak",
    ],
  },
  {
    role: "Fleksibilitas Latihan & Cabang",
    icon: "calendar",
    items: [
      "Bebas pilih jadwal latihan pagi, siang, atau sore hari",
      "Metode bervariasi: Kelas Reguler, Private 1-on-1, atau Afiliasi",
      "Kemudahan reschedule kelas jika murid berhalangan hadir",
      "Pilihan multi-cabang terintegrasi (Jaksel, Bogor, Bandung)",
      "Konsultasi cepat via WhatsApp dengan admin cabang terdekat",
    ],
  },
];

export default function Ecosystem() {
  return (
    <section className="bg-ocean-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 grid-faint opacity-10" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-wave-500/20 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-wave-300 font-bold text-xs uppercase tracking-widest mb-2">Kenyamanan Layanan Digital</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl leading-tight">
            Kenyamanan ekstra untuk<br />setiap keluarga.
          </h2>
          <p className="text-white/70 mt-4 text-lg leading-relaxed">
            Kami memadukan pengajaran renang terbaik dengan teknologi modern guna memberikan transparansi penuh kepada orang tua selama masa belajar anak.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {BLOCKS.map((b, i) => (
            <div
              key={b.role}
              className={`relative rounded-2xl p-6 transition-all duration-350 hover:translate-y-[-4px] hover:shadow-lift ${
                i === 0
                  ? "bg-white/[0.06] ring-1 ring-white/10"
                  : i === 1
                  ? "bg-wave-600 ring-1 ring-wave-500/35"
                  : "bg-white/[0.06] ring-1 ring-white/10"
              }`}
            >
              <span
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  i === 1 ? "bg-white/20 text-white" : "bg-wave-500/20 text-wave-200"
                }`}
              >
                <Icon name={b.icon} className="w-6 h-6" />
              </span>
              <h3 className="font-display font-bold text-xl mt-5">{b.role}</h3>
              <ul className="mt-5 space-y-3">
                {b.items.map((it) => (
                  <li key={it} className="text-sm flex items-start gap-2.5 text-white/85 leading-snug">
                    <Icon name="check" className="w-4 h-4 mt-0.5 text-wave-200 shrink-0" strokeWidth={2.5} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/85 text-sm font-medium mb-3">Nikmati kemudahan pendaftaran dan monitoring progres belajar secara digital.</p>
          <a href={waLink("Halo, saya ingin tanya seputar pendaftaran & sistem digital di Next Swimming School.")} target="_blank" rel="noreferrer">
            <Btn variant="accent" icon="whatsapp">Daftar & Hubungi Admin</Btn>
          </a>
        </div>
      </div>
    </section>
  );
}
