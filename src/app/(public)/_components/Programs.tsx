import { fmtIDR, waLink } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { createClient } from "@/utils/supabase/server";

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  goals: string | null;
  price_monthly: number;
  price_per_session: number | null;
  class_type: string;
  schedule_days: string[];
  time_start: string | null;
  time_end: string | null;
  photo_url: string | null;
}

export default async function Programs() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, description, goals, price_monthly, price_per_session, class_type, schedule_days, time_start, time_end, photo_url")
    .eq("show_on_landing", true)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const items = (classes ?? []) as ClassRow[];

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

        {items.length === 0 ? (
          <div className="mt-10 py-16 text-center text-ink-mute text-sm border border-dashed border-line rounded-2xl">
            Belum ada program yang ditampilkan. Aktifkan &ldquo;Tampil di Landing&rdquo; pada kelas di panel Admin.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {items.map((c) => (
              <Card key={c.id} padded={false} className="overflow-hidden group hover:shadow-lift transition-all duration-300">
                <div className="relative overflow-hidden aspect-[16/10] border-b border-line bg-paper-deep">
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt={c.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-ocean-50">
                      <Icon name="swim" className="w-12 h-12 text-ocean-200" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-bold text-lg text-ink group-hover:text-ocean-600 transition-colors">{c.name}</h3>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-wave-50 text-wave-700 ring-1 ring-wave-500/20 capitalize">{c.class_type}</span>
                  </div>
                  {c.description && (
                    <p className="text-sm text-ink-mute mt-2 leading-relaxed line-clamp-2">{c.description}</p>
                  )}
                  {c.goals && (
                    <ul className="mt-3.5 space-y-2">
                      {c.goals.split("\n").filter(Boolean).slice(0, 3).map((g) => (
                        <li key={g} className="text-xs text-ink-soft flex items-center gap-2">
                          <Icon name="check" className="w-3.5 h-3.5 text-ok-500 shrink-0" strokeWidth={2.8} />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-5 flex items-center justify-between pt-4 border-t border-line">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                        {c.schedule_days.length > 0 ? `${c.schedule_days.length}x seminggu` : "Jadwal fleksibel"}
                      </div>
                      <div className="font-display font-bold text-ocean-700 text-lg">
                        {c.price_monthly > 0 ? fmtIDR(c.price_monthly) : "By contract"}
                        <span className="text-xs text-ink-mute font-semibold">{c.price_monthly > 0 ? "/bln" : ""}</span>
                      </div>
                    </div>
                    <a href={waLink(`Halo, saya tertarik dengan program ${c.name}.`)} target="_blank" rel="noreferrer">
                      <Btn variant="soft" size="sm" icon="arrow">Tanya</Btn>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

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
