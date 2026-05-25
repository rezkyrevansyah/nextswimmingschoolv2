import { waLink } from "@/lib/utils";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 water-bg" />
      <div className="caustics absolute inset-0" />
      <div className="relative max-w-5xl mx-auto px-4 lg:px-8 py-20 lg:py-28 text-center text-white">
        <h2 className="font-display font-extrabold text-4xl lg:text-6xl leading-tight">
          Mulai perjalanan renangmu<br />bersama Next Swimming School.
        </h2>
        <p className="text-white/85 mt-5 max-w-2xl mx-auto text-lg">
          Chat admin kami untuk konsultasi program yang paling sesuai dengan anak Anda atau diri sendiri.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={waLink("Halo, saya tertarik untuk daftar di Next Swimming School.")} target="_blank" rel="noreferrer">
            <Btn variant="wa" icon="whatsapp" size="lg">Chat admin sekarang</Btn>
          </a>
          <a
            href="#program"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur ring-1 ring-white/20 text-white font-semibold"
          >
            <Icon name="arrow" className="w-4 h-4" /> Lihat program
          </a>
        </div>
      </div>
    </section>
  );
}
