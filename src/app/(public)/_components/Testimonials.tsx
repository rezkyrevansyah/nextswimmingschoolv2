import { TESTIMONIALS } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";

export default function Testimonials() {
  return (
    <section className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Testimoni</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Dipercaya oleh ratusan<br />keluarga di Indonesia.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {TESTIMONIALS.map((t, i) => (
            <Card
              key={t.id}
              className={i === 1 ? "bg-ocean-700 text-white border-ocean-700 lg:scale-[1.04]" : ""}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon
                    key={k}
                    name="star"
                    className={`w-4 h-4 ${i === 1 ? "text-wave-200" : "text-amber-400"}`}
                    strokeWidth={0}
                  />
                ))}
              </div>
              <p className={`mt-4 text-[15px] leading-relaxed ${i === 1 ? "text-white/90" : "text-ink-soft"}`}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-5 pt-5 border-t border-line/40 flex items-center gap-3">
                <Avatar name={t.name} size={36} />
                <div>
                  <div className={`text-sm font-bold ${i === 1 ? "text-white" : "text-ink"}`}>{t.name}</div>
                  <div className={`text-xs ${i === 1 ? "text-white/70" : "text-ink-mute"}`}>{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
