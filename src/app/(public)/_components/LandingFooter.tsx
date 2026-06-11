import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/utils/supabase/server";

interface ConfigData { footer_wa_number: string; footer_tagline: string; }

const CONFIG_DEFAULTS: ConfigData = {
  footer_wa_number: "082110009667",
  footer_tagline: "Sekolah renang modern dengan ekosistem digital terintegrasi. Cabang aktif di Jakarta Selatan, Bogor, dan Bandung.",
};

const NAV_DEFAULTS = [
  { label: "Beranda", href: "#home" },
  { label: "Program", href: "#program" },
  { label: "Coach", href: "#coach" },
  { label: "FAQ", href: "#faq" },
];

export default async function LandingFooter() {
  const supabase = await createClient();
  const [{ data: configData }, { data: branchData }, { data: navData }] = await Promise.all([
    supabase.from("landing_config").select("footer_wa_number, footer_tagline").single(),
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
    supabase.from("landing_nav_links").select("id, label, href").order("sort_order"),
  ]);

  const config = configData ?? CONFIG_DEFAULTS;
  const branches = branchData ?? [];
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
            <ul className="space-y-2 text-sm">
              {branches.map((b) => (
                <li key={b.id}>{b.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Next Swimming School. All rights reserved.</span>
          <span>Built with care · Fast · Clean · Trusted · Effortless.</span>
        </div>
      </div>
    </footer>
  );
}
