"use client";

import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import BorderGlowCard from "@/components/BorderGlowCard";
import { waLink } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";

interface BranchDisplayItem {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
}

export default function Branches({ branches }: { branches: BranchDisplayItem[] }) {
  const { t } = useLocale();
  const withName = branches.filter((b) => b.name);

  if (withName.length === 0) return null;

  return (
    <section id="branches" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-wide uppercase text-wave-600">
            {t("landing.branches.label")}
          </p>
          <h2 className="mt-2 font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {t("landing.branches.headline")}
          </h2>
          <p className="mt-3 text-ink-mute">{t("landing.branches.subtitle")}</p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {withName.map((b) => (
            <BorderGlowCard key={b.id}>
              <div className="aspect-[4/3] bg-ocean-50">
                {b.photo_url ? (
                  <img src={b.photo_url} alt={b.name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="pin" className="w-10 h-10 text-ocean-200" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-display font-bold text-lg text-ink">{b.name}</h3>
                {(b.address || b.city) && (
                  <p className="mt-1.5 text-sm text-ink-mute">{[b.address, b.city].filter(Boolean).join(", ")}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {b.phone && (
                    <Btn variant="wa" size="sm" icon="whatsapp" href={waLink(t("landing.branches.chatOnWhatsapp"), b.phone)} target="_blank" rel="noreferrer">
                      {t("landing.branches.chatOnWhatsapp")}
                    </Btn>
                  )}
                  {b.lat != null && b.lng != null && (
                    <Btn variant="outline" size="sm" icon="pin" href={`https://www.google.com/maps?q=${b.lat},${b.lng}`} target="_blank" rel="noreferrer">
                      {t("landing.branches.viewOnMap")}
                    </Btn>
                  )}
                </div>
              </div>
            </BorderGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
