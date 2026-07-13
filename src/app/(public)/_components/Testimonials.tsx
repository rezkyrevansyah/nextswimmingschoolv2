import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import { TrialButton } from "./TrialBooking";
import { createClient } from "@/utils/supabase/server";

interface TestimonialRow {
  id: string;
  name: string;
  role: string;
  body_text: string;
  avatar_url: string | null;
  rating: number | null;
}

const TESTIMONIALS_DEFAULTS: TestimonialRow[] = [
  { id: "t1", name: "Ibu Maya Wijaya", role: "Ibu dari Calista, 7 tahun", body_text: "Anak saya yang awalnya takut air sekarang antusias setiap kelas. Coach Bagas sabar luar biasa.", avatar_url: null, rating: 5 },
  { id: "t2", name: "Bpk. Andika Putra", role: "Ayah dari Arsenio, 9 tahun", body_text: "Sistem QR memudahkan saya pantau kehadiran. Rapor dari coach sangat detail.", avatar_url: null, rating: 5 },
  { id: "t3", name: "Reza Ardiansyah", role: "Member dewasa", body_text: "Dari benar-benar tidak bisa renang, sekarang bisa nyaman 500 meter.", avatar_url: null, rating: null },
];

export default async function Testimonials() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_testimonials")
    .select("id, name, role, body_text, avatar_url, rating")
    .order("sort_order")
    .limit(3);

  const testimonials = (data && data.length > 0) ? data : TESTIMONIALS_DEFAULTS;
  const [featured, ...rest] = testimonials;

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
            Dipercaya ratusan keluarga.
          </h2>
        </div>

        <figure className="mt-14 text-center">
          {featured.rating != null && (
            <div className="flex gap-1 justify-center mb-6">
              {Array.from({ length: featured.rating }).map((_, k) => (
                <Icon key={k} name="star" className="w-5 h-5 text-amber-400" fill="currentColor" strokeWidth={0} />
              ))}
            </div>
          )}
          <blockquote className="font-display font-bold text-2xl lg:text-4xl text-ink leading-snug max-w-3xl mx-auto">
            &ldquo;{featured.body_text}&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-3">
            <Avatar name={featured.name} src={featured.avatar_url ?? undefined} size={44} ring />
            <div className="text-left">
              <div className="text-sm font-bold text-ink">{featured.name}</div>
              <div className="text-xs text-ink-mute font-medium">{featured.role}</div>
            </div>
          </figcaption>
        </figure>

        {rest.length > 0 && (
          <div className="mt-16 pt-10 border-t border-line grid sm:grid-cols-2 gap-8">
            {rest.map((t) => (
              <div key={t.id} className="flex items-start gap-3">
                <Avatar name={t.name} src={t.avatar_url ?? undefined} size={38} />
                <div>
                  <p className="text-sm text-ink-soft leading-relaxed">&ldquo;{t.body_text}&rdquo;</p>
                  <div className="mt-2 text-xs font-bold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-mute">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <TrialButton size="lg" />
        </div>
      </div>
    </section>
  );
}
