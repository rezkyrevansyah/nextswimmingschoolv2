import { Card } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { getAdminWaPhone } from "@/lib/landing-config";

export default async function Testimonials() {
  const supabase = await createClient();
  const [{ data }, waPhone] = await Promise.all([
    supabase.from("landing_testimonials").select("id, name, role, body_text, avatar_url").order("sort_order").limit(3),
    getAdminWaPhone(),
  ]);

  const testimonials = data ?? [];
  const [first, featured, last] = testimonials;

  if (testimonials.length === 0) return null;

  return (
    <section className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Testimoni</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Dipercaya oleh ratusan<br />keluarga di Indonesia.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-12 items-center">
          {/* Card biasa kiri */}
          {first && (
            <Card className="transition-all duration-300 hover:shadow-lift hover:-translate-y-1 pt-5 pb-5 px-6">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" className="w-4 h-4 text-amber-400" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft min-h-[72px]">&ldquo;{first.body_text}&rdquo;</p>
              <div className="mt-4 pt-4 border-t border-line/40 flex items-center gap-3">
                <Avatar name={first.name} src={first.avatar_url ?? undefined} size={38} />
                <div>
                  <div className="text-sm font-bold text-ink">{first.name}</div>
                  <div className="text-xs text-ink-mute font-medium">{first.role}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Card featured tengah — ocean-700 */}
          {featured && (
            <div className="rounded-2xl border border-ocean-700 bg-ocean-700 pt-5 pb-5 px-6 lg:scale-[1.04] shadow-lift transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 text-white">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" className="w-4 h-4 text-wave-200" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-white/90 min-h-[72px]">&ldquo;{featured.body_text}&rdquo;</p>
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-3">
                <Avatar name={featured.name} src={featured.avatar_url ?? undefined} size={38} ring />
                <div>
                  <div className="text-sm font-bold text-white">{featured.name}</div>
                  <div className="text-xs text-white/70 font-medium">{featured.role}</div>
                </div>
              </div>
            </div>
          )}

          {/* Card biasa kanan */}
          {last && (
            <Card className="transition-all duration-300 hover:shadow-lift hover:-translate-y-1 pt-5 pb-5 px-6">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Icon key={k} name="star" className="w-4 h-4 text-amber-400" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft min-h-[72px]">&ldquo;{last.body_text}&rdquo;</p>
              <div className="mt-4 pt-4 border-t border-line/40 flex items-center gap-3">
                <Avatar name={last.name} src={last.avatar_url ?? undefined} size={38} />
                <div>
                  <div className="text-sm font-bold text-ink">{last.name}</div>
                  <div className="text-xs text-ink-mute font-medium">{last.role}</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-ink-soft text-sm font-medium mb-3">Gabung bersama ratusan keluarga yang telah puas belajar bersama kami.</p>
          <a href={waLink("Halo, saya ingin daftar belajar renang di Next Swimming School.", waPhone)} target="_blank" rel="noreferrer">
            <Btn variant="primary" icon="whatsapp">Hubungi Admin & Daftar</Btn>
          </a>
        </div>
      </div>
    </section>
  );
}
