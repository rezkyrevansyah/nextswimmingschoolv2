"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

function AuthShell({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper-tint">
      {/* Left visual */}
      <div className="hidden lg:flex relative overflow-hidden">
        <div className="absolute inset-0 water-bg" />
        <div className="caustics absolute inset-0" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 100%, rgba(0,0,0,.35), transparent 60%)" }} />
        <div className="relative p-12 flex flex-col w-full text-white">
          <Link href="/" className="inline-flex items-center gap-2.5 w-fit">
            <Logo size={44} />
            <span className="font-display font-extrabold text-lg leading-tight">
              <span>NEXT</span><br />
              <span className="text-wave-200 text-[10px] tracking-[.2em]">SWIMMING SCHOOL</span>
            </span>
          </Link>
          <div className="flex-1 flex flex-col justify-center max-w-md">
            {side}
          </div>
          <div className="flex items-center gap-4 text-white/70 text-xs">
            <span>© 2026 Next Swimming School</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>Fast · Clean · Trusted · Effortless</span>
          </div>
        </div>
      </div>

      {/* Right content */}
      <div className="flex flex-col">
        <div className="lg:hidden p-5 border-b border-line bg-white">
          <Logo size={32} withWord />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (searchParams.get("suspended") === "1") {
      toast.error("Akun disuspend", "Akun Anda sedang dalam masa suspend. Hubungi admin cabang untuk informasi lebih lanjut.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pwd) return toast.error("Email dan password wajib diisi");

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });

    if (error) {
      setLoading(false);
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email atau password salah");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Email belum diverifikasi", "Cek inbox email Anda");
      } else {
        toast.error("Login gagal", error.message);
      }
      return;
    }

    const role = data.user?.user_metadata?.role as string | undefined;
    const destination = role ? `/${role}` : "/member";
    toast.success("Login berhasil", `Mengarahkan ke halaman ${role ?? "member"}…`);
    router.push(destination);
  };

  return (
    <AuthShell
      side={
        <div>
          <div className="inline-flex items-center gap-2 bg-white/15 ring-1 ring-white/20 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold mb-6">
            Sistem login terpadu
          </div>
          <h2 className="font-display font-extrabold text-4xl xl:text-5xl leading-tight">
            Masuk ke ekosistem<br />renang Anda.
          </h2>
          <p className="text-white/80 mt-5 text-lg max-w-md">
            Satu pintu login untuk owner, admin, coach, member, dan school. Sistem otomatis mengarahkan ke halaman sesuai peran.
          </p>
          <ul className="mt-10 space-y-3">
            {[
              "Zero loading antar menu",
              "Notifikasi real-time di setiap halaman",
              "Custom alert — tidak ada browser default",
              "Mobile-first untuk pengguna HP",
            ].map((x) => (
              <li key={x} className="flex items-center gap-2.5 text-white/85">
                <Icon name="check" className="w-4 h-4 text-wave-200" strokeWidth={2.5} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form onSubmit={submit} className="w-full max-w-md">
        <div className="mb-7">
          <h1 className="font-display font-extrabold text-3xl text-ink">Selamat datang kembali</h1>
          <p className="text-ink-mute mt-1.5">Masuk untuk melanjutkan ke dashboard Anda.</p>
        </div>

        <div className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                placeholder="••••••••"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-ink-mute hover:text-ink-soft"
              >
                {show ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-ink-soft">
              <input type="checkbox" className="rounded border-line-strong" /> Ingat saya
            </label>
            <button type="button" onClick={() => setForgot(true)} className="font-semibold text-ocean-600 hover:text-ocean-700">
              Lupa password?
            </button>
          </div>

          <Btn variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? "Memproses…" : "Masuk"}
          </Btn>

          <div className="text-center text-sm text-ink-mute">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-ocean-600 hover:text-ocean-700">
              Daftar di sini
            </Link>
          </div>
          <div className="text-center">
            <Link href="/" className="text-xs text-ink-faint hover:text-ink-mute font-semibold inline-flex items-center gap-1">
              <Icon name="arrowL" className="w-3.5 h-3.5" /> Kembali ke beranda
            </Link>
          </div>
        </div>
      </form>

      <Modal
        open={forgot}
        onClose={() => setForgot(false)}
        title="Lupa password?"
        footer={
          <>
            <button onClick={() => setForgot(false)} className="px-4 py-2 text-sm rounded-lg text-ink-soft hover:bg-paper-tint font-semibold">
              Nanti saja
            </button>
            <a href={waLink("Halo Admin, saya lupa password akun Next Swimming School. Mohon bantuannya untuk reset password.")} target="_blank" rel="noreferrer">
              <Btn variant="wa" icon="whatsapp">Chat admin sekarang</Btn>
            </a>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="w-12 h-12 rounded-2xl bg-wave-50 text-wave-600 flex items-center justify-center shrink-0">
            <Icon name="info" className="w-6 h-6" />
          </span>
          <div className="text-sm text-ink-soft leading-relaxed">
            Reset password dilakukan langsung oleh admin cabang Anda untuk menjaga keamanan akun.
            <br /><br />
            Klik tombol di bawah untuk menghubungi admin cabang via WhatsApp. Admin akan memberikan password baru yang langsung aktif begitu Anda masuk.
          </div>
        </div>
      </Modal>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
