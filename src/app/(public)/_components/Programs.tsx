import { PROGRAMS } from "@/lib/data";
import { fmtIDR, waLink } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";

const PROGRAM_IMAGES: Record<string, string> = {
  "p-kids": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&auto=format&fit=crop&q=80",
  "p-teen": "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=600&auto=format&fit=crop&q=80",
  "p-adult": "https://images.unsplash.com/photo-1575425186775-b8de9fa427e6?w=600&auto=format&fit=crop&q=80",
  "p-private": "https://images.unsplash.com/photo-1560090421-99a3160e64c1?w=600&auto=format&fit=crop&q=80",
  "p-intense": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&auto=format&fit=crop&q=80",
  "p-school": "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=600&auto=format&fit=crop&q=80",
};

export default function Programs() {
  return (
    <section id="program" className="relative bg-white">
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {PROGRAMS.map((p) => (
            <Card key={p.id} padded={false} className="overflow-hidden group hover:shadow-lift transition-all duration-300">
              <div className="relative overflow-hidden aspect-[16/10] border-b border-line bg-paper-deep">
                <img
                  src={PROGRAM_IMAGES[p.id] || "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&auto=format&fit=crop&q=80"}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-lg text-ink group-hover:text-ocean-600 transition-colors">{p.name}</h3>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-wave-50 text-wave-700 ring-1 ring-wave-500/20">{p.age}</span>
                </div>
                <p className="text-sm text-ink-mute mt-2 leading-relaxed line-clamp-2">{p.desc}</p>
                <ul className="mt-3.5 space-y-2">
                  {p.benefit.map((b) => (
                    <li key={b} className="text-xs text-ink-soft flex items-center gap-2">
                      <Icon name="check" className="w-3.5 h-3.5 text-ok-500 shrink-0" strokeWidth={2.8} />
                      <span>{b}</span>
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

        <div className="mt-12 text-center bg-paper-tint rounded-2xl p-6 border border-line flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="text-left">
            <h4 className="font-display font-bold text-ink text-base">Bingung memilih program yang tepat?</h4>
            <p className="text-xs text-ink-mute mt-1">Konsultasikan kebutuhan renang Anda atau anak Anda secara gratis dengan tim kami.</p>
          </div>
          <a href={waLink("Halo, saya ingin konsultasi memilih program renang yang tepat.")} target="_blank" rel="noreferrer" className="w-full sm:w-auto shrink-0">
            <Btn variant="primary" icon="whatsapp" className="w-full sm:w-auto cursor-pointer">Konsultasi Program Gratis</Btn>
          </a>
        </div>
      </div>
    </section>
  );
}
