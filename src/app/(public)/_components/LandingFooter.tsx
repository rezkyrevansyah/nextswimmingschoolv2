import { BRANCHES } from "@/lib/data";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";

export default function LandingFooter() {
  return (
    <footer className="bg-ocean-900 text-white/80">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Logo size={44} withWord />
          <p className="text-sm text-white/60 mt-4 max-w-xs">
            Sekolah renang modern dengan ekosistem digital terintegrasi. Cabang aktif di Jakarta Selatan, Bogor, dan Bandung.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm">
            <Icon name="whatsapp" className="w-4 h-4 text-wave-300" /> 0821-1000-9667
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-wave-300 mb-3">Navigasi</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#home" className="hover:text-white">Beranda</a></li>
            <li><a href="#program" className="hover:text-white">Program</a></li>
            <li><a href="#coach" className="hover:text-white">Coach</a></li>
            <li><a href="#faq" className="hover:text-white">FAQ</a></li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-wave-300 mb-3">Cabang</div>
          <ul className="space-y-2 text-sm">
            {BRANCHES.map((b) => (
              <li key={b.id}>{b.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>© 2026 Next Swimming School. All rights reserved.</span>
          <span>Built with care · Fast · Clean · Trusted · Effortless.</span>
        </div>
      </div>
    </footer>
  );
}
