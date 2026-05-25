import Icon from "@/components/ui/Icon";

const BLOCKS = [
  {
    role: "Untuk Member",
    icon: "users",
    items: [
      "Lihat jadwal & libur kelas",
      "Histori absensi per kelas",
      "Tagihan & konfirmasi pembayaran",
      "Rapor & review coach",
      "Pengajuan izin online",
    ],
  },
  {
    role: "Untuk Coach",
    icon: "swim",
    items: [
      "Clock-in selfie + lokasi",
      "Scan QR absensi member",
      "Spreadsheet program kelas",
      "Generate invoice bulanan",
      "Pengajuan izin & pengganti",
    ],
  },
  {
    role: "Untuk Admin",
    icon: "settings",
    items: [
      "Multi-cabang & multi-coach",
      "Approve registrasi & sertifikasi",
      "Generate tagihan bulanan",
      "Class activity calendar",
      "Dashboard live attendance",
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
          <div className="text-wave-300 font-bold text-xs uppercase tracking-widest mb-2">Smart Swimming Ecosystem</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl leading-tight">
            Satu sistem,<br />tiga peran yang terhubung.
          </h2>
          <p className="text-white/70 mt-4 text-lg">
            Setiap aksi yang dilakukan oleh member, coach, atau admin langsung tersinkron — tanpa lag, tanpa kesalahan komunikasi.
          </p>
        </div>
        <div className="grid lg:grid-cols-3 gap-5 mt-12">
          {BLOCKS.map((b, i) => (
            <div
              key={b.role}
              className={`relative rounded-2xl p-6 ${i === 1 ? "bg-wave-500" : "bg-white/[0.06] ring-1 ring-white/10"}`}
            >
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${i === 1 ? "bg-white/20" : "bg-wave-500/20 text-wave-200"}`}>
                <Icon name={b.icon} className="w-6 h-6" />
              </span>
              <h3 className="font-display font-bold text-xl mt-4">{b.role}</h3>
              <ul className="mt-4 space-y-2.5">
                {b.items.map((it) => (
                  <li key={it} className="text-sm flex items-start gap-2.5 text-white/85">
                    <Icon name="check" className="w-4 h-4 mt-0.5 text-wave-200" strokeWidth={2.5} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
