import { COACHES } from "@/lib/data";
import { Card } from "@/components/ui/Card";

const COACH_IMAGES: Record<string, string> = {
  "c-001": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80", // Coach Bagas
  "c-002": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80", // Coach Linda
  "c-003": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80", // Coach Rizki
  "c-005": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80", // Coach Dimas
  "c-006": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80", // Coach Yoga
};

export default function CoachShowcase() {
  const activeCoaches = COACHES.filter((c) => c.status === "active").slice(0, 4);

  return (
    <section id="coach" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="max-w-xl">
            <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Coach Showcase</div>
            <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
              Tim coach yang<br />akan menemani perjalananmu.
            </h2>
          </div>
          <div className="text-sm text-ink-mute font-semibold">Semua coach telah lolos verifikasi sertifikasi resmi.</div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {activeCoaches.map((c) => (
            <Card key={c.id} padded={false} className="overflow-hidden group hover:shadow-lift transition-all duration-300">
              <div className="relative overflow-hidden aspect-[3/4] border-b border-line bg-paper-deep">
                <img
                  src={COACH_IMAGES[c.id] || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80"}
                  alt={c.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider text-ocean-700 uppercase shadow-sm">
                  {c.code}
                </span>
              </div>
              <div className="p-4">
                <div className="font-display font-bold text-ink group-hover:text-ocean-600 transition-colors text-base lg:text-lg">{c.nick}</div>
                <div className="text-xs text-ink-mute mt-0.5 font-medium">{c.spec}</div>
                <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap gap-1.5">
                  {c.certs.slice(0, 2).map((s) => (
                    <span key={s} className="text-[10px] font-semibold text-ocean-700 bg-ocean-50 px-2 py-0.5 rounded border border-ocean-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
