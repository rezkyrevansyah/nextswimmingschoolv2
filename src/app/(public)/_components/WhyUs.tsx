import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";

const ITEMS = [
  { icon: "shield",   t: "Coach Profesional",      d: "Setiap coach memiliki sertifikasi yang diverifikasi admin sebelum mengajar." },
  { icon: "chart",    t: "Progress Monitoring",     d: "Rapor digital per semester dengan aspek penilaian yang disesuaikan per kelas." },
  { icon: "qr",       t: "Sistem Digital Modern",   d: "QR absensi, notifikasi real-time, dan dashboard untuk orang tua." },
  { icon: "calendar", t: "Jadwal Fleksibel",         d: "Kelas reguler, private, hingga afiliasi sekolah — pilih yang paling cocok." },
  { icon: "target",   t: "Kelas Nyaman & Aman",      d: "Rasio coach-member kecil, kolam diawasi, dan SOP keamanan yang ketat." },
];

export default function WhyUs() {
  return (
    <section id="why" className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Mengapa Kami</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Lima alasan keluarga<br />mempercayakan kami.
          </h2>
          <p className="text-ink-mute mt-4 text-lg">
            Bukan sekadar belajar renang — kami menghadirkan ekosistem yang mempermudah orang tua, coach, dan administrasi sekolah dalam satu sistem.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {ITEMS.map((it, i) => (
            <Card key={it.t} className={i === 0 ? "lg:row-span-2 bg-ocean-700 text-white border-ocean-700" : ""}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${i === 0 ? "bg-white/15 text-wave-200" : "bg-ocean-50 text-ocean-700"}`}>
                <Icon name={it.icon} className="w-6 h-6" />
              </div>
              <h3 className={`font-display font-bold text-lg ${i === 0 ? "text-white" : "text-ink"}`}>{it.t}</h3>
              <p className={`text-sm mt-2 leading-relaxed ${i === 0 ? "text-white/75" : "text-ink-mute"}`}>{it.d}</p>
              {i === 0 && (
                <div className="mt-8 grid grid-cols-2 gap-3 text-white/90">
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-[10px] uppercase tracking-widest text-wave-200">Sertifikasi</div>
                    <div className="font-display font-bold text-xl">100%</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-[10px] uppercase tracking-widest text-wave-200">Lifeguard ARC</div>
                    <div className="font-display font-bold text-xl">Aktif</div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
