import Image from "next/image";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { TrialButton } from "./TrialBooking";
import { createClient } from "@/utils/supabase/server";

interface CoachRow {
  id: string;
  full_name: string;
  nick_name: string | null;
  specialization: string | null;
  avatar_url: string | null;
  bio: string | null;
  certifications: string[] | null;
}

export default async function CoachShowcase() {
  const supabase = await createClient();
  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, full_name, nick_name, specialization, avatar_url, bio, certifications")
    .eq("role", "coach")
    .eq("is_archived", false)
    .eq("show_on_landing", true)
    .order("full_name")
    .limit(4);

  const items = (coaches ?? []) as unknown as CoachRow[];

  return (
    <section id="coach" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="max-w-xl">
            <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">Coach Kami</div>
            <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight">
              Tim coach yang<br />menemani perjalananmu.
            </h2>
          </div>
          <div className="text-sm text-ink-mute font-semibold">Semua coach lolos verifikasi sertifikasi resmi.</div>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 py-16 text-center text-ink-mute text-sm border border-dashed border-line rounded-2xl">
            Belum ada coach yang ditampilkan. Aktifkan &ldquo;Tampil di Landing&rdquo; pada profil coach di panel Owner.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {items.map((c) => (
              <Card key={c.id} padded={false} className="overflow-hidden group hover:shadow-lift transition-all duration-300 flex flex-col">
                <div className="relative overflow-hidden aspect-[3/4] border-b border-line bg-paper-deep">
                  {c.avatar_url ? (
                    <Image
                      src={c.avatar_url}
                      alt={c.nick_name ?? c.full_name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-ocean-50">
                      <Avatar name={c.nick_name ?? c.full_name} size={72} />
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col grow">
                  <div className="font-display font-bold text-ink group-hover:text-ocean-600 transition-colors text-base lg:text-lg">
                    {c.nick_name ?? c.full_name}
                  </div>
                  {c.specialization && (
                    <div className="text-xs text-ink-mute mt-0.5 font-medium">{c.specialization}</div>
                  )}
                  {c.bio && (
                    <p className="text-xs text-ink-soft mt-2 leading-relaxed line-clamp-3">{c.bio}</p>
                  )}
                  {c.certifications && c.certifications.length > 0 && (
                    <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                      {c.certifications.slice(0, 3).map((cert) => (
                        <span key={cert} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-ocean-50 text-ocean-700">
                          <Icon name="shield" className="w-3 h-3" /> {cert}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-ink-mute text-sm font-medium mb-3">Ingin dibimbing langsung oleh coach kami? Coba sesi trial gratis dulu.</p>
          <TrialButton />
        </div>
      </div>
    </section>
  );
}
