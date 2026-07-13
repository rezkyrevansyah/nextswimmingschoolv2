import Image from "next/image";
import Icon from "@/components/ui/Icon";
import Placeholder from "@/components/ui/Placeholder";
import { createClient } from "@/utils/supabase/server";

interface BranchRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
}

const BRANCHES_DEFAULTS: BranchRow[] = [
  { id: "1", name: "Cabang Jakarta Selatan", address: "Jl. Kemang Raya 88", city: "Jakarta Selatan" },
  { id: "2", name: "Cabang Bogor", address: "Jl. Pajajaran 12", city: "Bogor Tengah" },
  { id: "3", name: "Cabang Bandung", address: "Jl. Setiabudhi 220", city: "Bandung" },
];

interface FacilityItem {
  id: string;
  title: string;
  body_text: string;
  photo_url: string | null;
}

const ROW_LABELS = ["Lingkungan Kolam", "Multi-Cabang"];
const ROW_PHOTO_HINTS = [
  "FOTO: sudut kolam bersih, air jernih, area tepi kolam rapi",
  "FOTO: tampak depan bangunan cabang / area resepsionis",
];

const ITEMS_DEFAULTS: Pick<FacilityItem, "title" | "body_text" | "photo_url">[] = [
  {
    title: "Kolam bersih, terawat, semi-private.",
    body_text: "Kualitas air dicek berkala, suhu terjaga nyaman untuk anak, dan area kolam tidak dicampur dengan pengunjung umum saat jam kelas.",
    photo_url: null,
  },
  {
    title: "Pilih cabang terdekat dari rumah Anda.",
    body_text: "Jadwal dan level kelas terintegrasi antar cabang, cukup satu akun untuk semua.",
    photo_url: null,
  },
];

export default async function Facilities() {
  const supabase = await createClient();
  const [{ data: branchesData }, { data: sectionData }, { data: itemsData }] = await Promise.all([
    supabase.from("branches").select("id, name, address, city").eq("status", "active").order("created_at", { ascending: true }),
    supabase.from("landing_facilities").select("headline").single(),
    supabase.from("landing_facility_items").select("id, title, body_text, photo_url").order("sort_order"),
  ]);

  const branches = (branchesData && branchesData.length > 0) ? branchesData : BRANCHES_DEFAULTS;
  const headline = sectionData?.headline || "Fasilitas yang mendukung\nkenyamanan belajar.";
  const items = (itemsData && itemsData.length > 0) ? (itemsData as FacilityItem[]) : ITEMS_DEFAULTS;

  const rows = items.slice(0, 2).map((it, i) => ({
    label: ROW_LABELS[i] ?? "Fasilitas",
    headline: it.title,
    body: it.body_text,
    photoUrl: it.photo_url ?? null,
    photoLabel: ROW_PHOTO_HINTS[i] ?? "FOTO fasilitas",
  }));

  return (
    <section id="facilities" className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl mb-14">
          <h2 className="font-display font-extrabold text-3xl lg:text-5xl text-ink leading-tight whitespace-pre-line">
            {headline}
          </h2>
        </div>

        <div className="space-y-16 lg:space-y-24">
          {rows.map((r, i) => (
            <div key={r.label} className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                {r.photoUrl ? (
                  <Image src={r.photoUrl} alt={r.headline} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                ) : (
                  <Placeholder ratio="4/3" label={r.photoLabel} className="absolute inset-0 border-0" />
                )}
              </div>
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                <div className="text-wave-600 font-bold text-xs uppercase tracking-widest mb-2">{r.label}</div>
                <h3 className="font-display font-bold text-2xl lg:text-3xl text-ink leading-snug">{r.headline}</h3>
                <p className="text-ink-mute mt-4 leading-relaxed">{r.body}</p>
                {i === 1 && (
                  <ul className="mt-6 space-y-3">
                    {branches.map((b) => (
                      <li key={b.id} className="flex items-start gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name="pin" className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-ink-soft">
                          <span className="font-semibold text-ink">{b.name}</span>
                          {b.address ? ` · ${b.address}${b.city ? `, ${b.city}` : ""}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
