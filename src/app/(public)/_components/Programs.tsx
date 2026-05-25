import { PROGRAMS } from "@/lib/data";
import { fmtIDR, waLink } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Placeholder from "@/components/ui/Placeholder";

export default function Programs() {
  return (
    <section id="program" className="relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="max-w-xl">
            <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Swimming Programs</div>
            <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
              Program yang dirancang<br />untuk setiap level.
            </h2>
          </div>
          <a href={waLink("Halo, saya ingin tanya program yang sesuai untuk saya / anak saya.")} target="_blank" rel="noreferrer" className="hidden sm:inline-flex">
            <Btn variant="outline" icon="whatsapp">Tanya program ke admin</Btn>
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {PROGRAMS.map((p) => (
            <Card key={p.id} padded={false} className="overflow-hidden group hover:shadow-lift transition-shadow">
              <Placeholder label={`${p.name.toLowerCase().replace(/\s/g, "-")}-photo`} ratio="16/10" className="rounded-none border-0 border-b border-line" />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-lg text-ink">{p.name}</h3>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-wave-50 text-wave-700 ring-1 ring-wave-500/20">{p.age}</span>
                </div>
                <p className="text-sm text-ink-mute mt-2 leading-relaxed line-clamp-2">{p.desc}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.benefit.map((b) => (
                    <li key={b} className="text-xs text-ink-soft flex items-center gap-2">
                      <Icon name="check" className="w-3.5 h-3.5 text-ok-500" strokeWidth={2.8} />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between pt-4 border-t border-line">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{p.sessions}</div>
                    <div className="font-display font-bold text-ocean-700 text-lg">
                      {p.price > 0 ? fmtIDR(p.price) : "By contract"}
                      <span className="text-xs text-ink-mute font-semibold">{p.price > 0 ? "/bln" : ""}</span>
                    </div>
                  </div>
                  <a href={waLink(`Halo, saya tertarik dengan program ${p.name}.`)} target="_blank" rel="noreferrer">
                    <Btn variant="soft" size="sm" icon="arrow">Tanya</Btn>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
