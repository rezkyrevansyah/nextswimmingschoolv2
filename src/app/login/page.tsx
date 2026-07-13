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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-paper-tint py-16 px-4">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle water gradient top-right */}
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-ocean-100/50 blur-3xl" />
        {/* Wave accent bottom-left */}
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-wave-100/40 blur-3xl" />
        {/* Faint dot grid */}
        <div className="absolute inset-0 grid-faint opacity-40" />
        {/* Top subtle stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ocean-500 via-wave-400 to-ocean-400" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">

        {/* Logo area */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-lift flex items-center justify-center ring-1 ring-ocean-100 group-hover:ring-ocean-300 transition-all">
              <Logo size={36} />
            </div>
            <div className="text-center">
              <div className="font-display font-extrabold text-ink text-base leading-tight">NEXT</div>
              <div className="text-[9px] tracking-[.25em] font-bold text-ink-faint uppercase">Swimming School</div>
            </div>
          </Link>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-float ring-1 ring-ocean-100/80 px-5 sm:px-8 py-8 sm:py-10">
          <div className="mb-7">
            <h1 className="font-display font-extrabold text-2xl text-ink">Selamat datang kembali</h1>
            <p className="text-ink-mute text-sm mt-1.5">Masuk untuk melanjutkan ke dashboard Anda.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
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

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm pt-0.5">
              <label className="inline-flex items-center gap-2 text-ink-soft cursor-pointer">
                <input type="checkbox" className="rounded border-line-strong" /> Ingat saya
              </label>
              <button type="button" onClick={() => setForgot(true)} className="font-semibold text-ocean-600 hover:text-ocean-700 shrink-0">
                Lupa password?
              </button>
            </div>

            <Btn variant="primary" size="lg" className="w-full !mt-6" type="submit">
              {loading ? "Memproses…" : "Masuk"}
            </Btn>
          </form>

          <div className="mt-5 pt-5 border-t border-line text-center space-y-3">
            <p className="text-sm text-ink-mute">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-ocean-600 hover:text-ocean-700">
                Daftar di sini
              </Link>
            </p>
            <Link href="/" className="text-xs text-ink-faint hover:text-ink-mute font-semibold inline-flex items-center justify-center gap-1">
              <Icon name="arrowL" className="w-3 h-3" /> Kembali ke beranda
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-ink-faint mt-6 break-words px-2">
          © 2026 Next Swimming School · Fast · Clean · Trusted · Effortless
        </p>
      </div>

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
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
