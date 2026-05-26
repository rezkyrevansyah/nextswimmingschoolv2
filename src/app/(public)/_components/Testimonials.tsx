import { TESTIMONIALS } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";

export default function Testimonials() {
  const [first, featured, last] = [TESTIMONIALS[0], TESTIMONIALS[1], TESTIMONIALS[2]];

  return (
    <section className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Testimoni</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Dipercaya oleh ratusan<br />keluarga di Indonesia.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mt-12 items-center">
          {/* Card biasa kiri */}
          {first && (
            <Card>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" className="w-4 h-4 text-amber-400" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">&ldquo;{first.text}&rdquo;</p>
              <div className="mt-5 pt-5 border-t border-line/40 flex items-center gap-3">
                <Avatar name={first.name} size={36} />
                <div>
                  <div className="text-sm font-bold text-ink">{first.name}</div>
                  <div className="text-xs text-ink-mute">{first.role}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Card featured tengah — ocean-700 */}
          {featured && (
            <div className="rounded-2xl border border-ocean-700 bg-ocean-700 p-6 lg:scale-[1.04] shadow-lift">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" className="w-4 h-4 text-wave-200" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-white/90">&ldquo;{featured.text}&rdquo;</p>
              <div className="mt-5 pt-5 border-t border-white/20 flex items-center gap-3">
                <Avatar name={featured.name} size={36} />
                <div>
                  <div className="text-sm font-bold text-white">{featured.name}</div>
                  <div className="text-xs text-white/70">{featured.role}</div>
                </div>
              </div>
            </div>
          )}

          {/* Card biasa kanan */}
          {last && (
            <Card>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" className="w-4 h-4 text-amber-400" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">&ldquo;{last.text}&rdquo;</p>
              <div className="mt-5 pt-5 border-t border-line/40 flex items-center gap-3">
                <Avatar name={last.name} size={36} />
                <div>
                  <div className="text-sm font-bold text-ink">{last.name}</div>
                  <div className="text-xs text-ink-mute">{last.role}</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
