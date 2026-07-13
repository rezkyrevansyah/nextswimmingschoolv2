import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/utils/supabase/server";

interface ConfigData { footer_wa_number: string; footer_tagline: string; }
interface Branch { id: string; name: string; address: string | null; city: string | null; }

const CONFIG_DEFAULTS: ConfigData = {
  footer_wa_number: "082110009667",
  footer_tagline: "Sekolah renang untuk anak dan dewasa. Coach bersertifikat, kolam aman, dan progres yang bisa Anda pantau.",
};

const NAV_DEFAULTS = [
  { label: "Mengapa Kami", href: "#why" },
  { label: "Keamanan", href: "#safety" },
  { label: "Program", href: "#program" },
  { label: "Fasilitas", href: "#facilities" },
  { label: "Coach", href: "#coach" },
  { label: "FAQ", href: "#faq" },
];

export default async function LandingFooter() {
  const supabase = await createClient();
  const [{ data: configData }, { data: branchData }, { data: navData }] = await Promise.all([
    supabase.from("landing_config").select("footer_wa_number, footer_tagline").single(),
    supabase.from("branches").select("id, name, address, city").eq("status", "active").order("name"),
    supabase.from("landing_nav_links").select("id, label, href").order("sort_order"),
  ]);

  const config = configData ?? CONFIG_DEFAULTS;
  const branches = (branchData ?? []) as Branch[];
  const navLinks = (navData && navData.length > 0) ? navData : NAV_DEFAULTS;

  const waDisplay = config.footer_wa_number.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");

  return (
    <footer className="bg-ocean-900 text-white/80">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Logo size={44} withWord dark />
          <p className="text-sm text-white/60 mt-4 max-w-xs">
            {config.footer_tagline}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm">
            <Icon name="whatsapp" className="w-4 h-4 text-wave-300" /> {waDisplay}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-wave-300 mb-3">Navigasi</div>
          <ul className="space-y-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-white">{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        {branches.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-widest font-bold text-wave-300 mb-3">Cabang</div>
            <ul className="space-y-3 text-sm">
              {branches.map((b) => {
                const addr = [b.address, b.city].filter(Boolean).join(", ");
                const mapQuery = encodeURIComponent(`${b.name} ${addr}`.trim());
                return (
                  <li key={b.id}>
                    <div className="font-semibold text-white/85">{b.name}</div>
                    {addr && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/55 hover:text-white inline-flex items-start gap-1"
                      >
                        <Icon name="pin" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-wave-300" />
                        <span>{addr}</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Next Swimming School. All rights reserved.</span>
          <Link href="/register" className="text-white/60 hover:text-white font-semibold">
            Sudah yakin? Daftar penuh
          </Link>
        </div>
      </div>
    </footer>
  );
}
