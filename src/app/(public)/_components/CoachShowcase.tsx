import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Btn from "@/components/ui/Btn";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { getAdminWaPhone } from "@/lib/landing-config";

export default async function CoachShowcase() {
  const supabase = await createClient();
  const [{ data: coaches }, waPhone] = await Promise.all([
    supabase.from("profiles").select("id, full_name, nick_name, specialization, avatar_url").eq("role", "coach").eq("is_archived", false).eq("show_on_landing", true).order("full_name").limit(4),
    getAdminWaPhone(),
  ]);

  const items = coaches ?? [];

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

        {items.length === 0 ? (
          <div className="mt-10 py-16 text-center text-ink-mute text-sm border border-dashed border-line rounded-2xl">
            Belum ada coach yang ditampilkan. Aktifkan &ldquo;Tampil di Landing&rdquo; pada profil coach di panel Owner.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {items.map((c) => (
              <Card key={c.id} padded={false} className="overflow-hidden group hover:shadow-lift transition-all duration-300">
                <div className="relative overflow-hidden aspect-[3/4] border-b border-line bg-paper-deep">
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.nick_name ?? c.full_name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-ocean-50">
                      <Avatar name={c.nick_name ?? c.full_name} size={72} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-display font-bold text-ink group-hover:text-ocean-600 transition-colors text-base lg:text-lg">
                    {c.nick_name ?? c.full_name}
                  </div>
                  {c.specialization && (
                    <div className="text-xs text-ink-mute mt-0.5 font-medium">{c.specialization}</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-ink-mute text-sm font-medium mb-3">Ingin dibimbing langsung oleh coach pilihan Anda? Hubungi admin untuk jadwalkan kelas privat.</p>
          <a href={waLink("Halo, saya ingin tanya ketersediaan jadwal privat dengan coach di Next Swimming School.", waPhone)} target="_blank" rel="noreferrer">
            <Btn variant="primary" icon="whatsapp">Hubungi Admin via WhatsApp</Btn>
          </a>
        </div>
      </div>
    </section>
  );
}
