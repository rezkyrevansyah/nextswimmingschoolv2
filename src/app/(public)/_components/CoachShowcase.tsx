import { COACHES } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import Placeholder from "@/components/ui/Placeholder";

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
          <div className="text-sm text-ink-mute">Semua coach telah lolos verifikasi sertifikasi.</div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {activeCoaches.map((c) => (
            <Card key={c.id} padded={false} className="overflow-hidden group">
              <div className="relative">
                <Placeholder
                  label={c.nick.toLowerCase().replace(/\s/g, "-")}
                  ratio="3/4"
                  className="rounded-none border-0 border-b border-line"
                />
                <span className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full px-2 py-1 text-[10px] font-bold tracking-wide text-ocean-700 uppercase">
                  {c.code}
                </span>
              </div>
              <div className="p-4">
                <div className="font-display font-bold text-ink">{c.nick}</div>
                <div className="text-xs text-ink-mute mt-0.5">{c.spec}</div>
                <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-1">
                  {c.certs.slice(0, 2).map((s) => (
                    <span key={s} className="text-[10px] font-semibold text-ocean-700 bg-ocean-50 px-2 py-0.5 rounded">
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
