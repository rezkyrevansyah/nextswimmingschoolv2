import Image from "next/image";
import Placeholder from "@/components/ui/Placeholder";
import { createClient } from "@/utils/supabase/server";

interface GalleryItem {
  id: string;
  photo_url: string | null;
  alt_text: string | null;
}

const GALLERY_DEFAULTS: { id: string; label: string }[] = [
  { id: "1", label: "FOTO: anak melompat ke kolam, ekspresi gembira" },
  { id: "2", label: "FOTO: coach memegang lengan murid saat drill gaya bebas" },
  { id: "3", label: "FOTO: barisan murid duduk di tepi kolam sebelum kelas" },
  { id: "4", label: "FOTO: orang tua menonton dari area tribun" },
  { id: "5", label: "FOTO: murid dewasa latihan gaya dada" },
  { id: "6", label: "FOTO: momen wisuda/selebrasi kecil murid lulus level" },
];

export default async function Gallery() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_gallery")
    .select("id, photo_url, alt_text")
    .order("sort_order")
    .limit(6);

  const items = (data && data.length > 0) ? (data as GalleryItem[]) : null;

  return (
    <section id="gallery" className="bg-paper-tint">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 auto-rows-[160px] lg:auto-rows-[220px]">
          {(items ?? GALLERY_DEFAULTS).map((item, i) => {
            const span = i === 0 || i === 3 ? "col-span-2 row-span-2" : "";
            const photoUrl = "photo_url" in item ? item.photo_url : null;
            const alt = "alt_text" in item ? (item.alt_text ?? "Momen kelas renang") : "Momen kelas renang";
            return (
              <div key={item.id} className={`relative rounded-xl overflow-hidden ${span}`}>
                {photoUrl ? (
                  <Image src={photoUrl} alt={alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                ) : (
                  <Placeholder
                    ratio="1/1"
                    label={"label" in item ? item.label : "FOTO"}
                    className="absolute inset-0 rounded-xl border-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
