import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Btn from "@/components/ui/Btn";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6"><Logo size={48} /></div>
      <div className="font-display font-extrabold text-8xl text-ocean-100 select-none mb-2">
        404
      </div>
      <h1 className="font-display font-bold text-2xl text-ink mb-2">
        Halaman tidak ditemukan
      </h1>
      <p className="text-ink-mute text-sm max-w-sm mb-8 leading-relaxed">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan. Pastikan URL
        sudah benar, atau kembali ke beranda.
      </p>
      <Link href="/">
        <Btn variant="primary">Kembali ke beranda</Btn>
      </Link>
    </div>
  );
}
