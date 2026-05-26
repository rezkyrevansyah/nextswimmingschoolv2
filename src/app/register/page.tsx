"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";

function AuthShell({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper-tint">
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

interface Branch { id: string; name: string; city: string }

export default function RegisterPage() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Form state
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [branchId, setBranchId] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOwner, setPhoneOwner] = useState<"self" | "parent">("self");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [address, setAddress] = useState("");
  const [healthNotes, setHealthNotes] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("branches")
      .select("id, name, city")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        if (data) setBranches(data);
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !birthDate || !gender || !branchId || !phone || !address) {
      toast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("registrations").insert({
      full_name: fullName,
      birth_date: birthDate,
      gender: gender as "male" | "female",
      branch_id: branchId,
      phone,
      phone_owner: phoneOwner,
      parent_name: phoneOwner === "parent" ? parentName : null,
      parent_phone: phoneOwner === "parent" ? parentPhone : null,
      address,
      health_notes: healthNotes || null,
      status: "pending",
    });

    setLoading(false);
    if (error) {
      toast.error("Gagal mengirim pendaftaran", error.message);
      return;
    }
    setStep(2);
  };

  const waMessage = `Halo, saya baru saja mendaftar online lewat web Next Swimming School.\n\nNama: ${fullName}\nTanggal lahir: ${birthDate}\nProgram yang diminati: (belum ditentukan)\nCabang: ${branches.find(b => b.id === branchId)?.name ?? ""}`;

  return (
    <AuthShell
      side={
        <div>
          <div className="inline-flex items-center gap-2 bg-white/15 ring-1 ring-white/20 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold mb-6">
            Pendaftaran online
          </div>
          <h2 className="font-display font-extrabold text-4xl xl:text-5xl leading-tight">
            Selangkah lagi menuju<br />kelas pertama.
          </h2>
          <p className="text-white/80 mt-5 text-lg">
            Lengkapi data berikut — admin cabang akan menghubungi Anda via WhatsApp untuk konfirmasi kelas dan pembayaran.
          </p>
          <div className="mt-10 bg-white/10 backdrop-blur ring-1 ring-white/20 rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200 mb-2">Tahapan setelah Anda daftar</div>
            <ol className="space-y-2 text-sm text-white/85">
              <li><span className="font-bold">1.</span> Admin review data Anda</li>
              <li><span className="font-bold">2.</span> Admin chat WA untuk konfirmasi program</li>
              <li><span className="font-bold">3.</span> Pembayaran pertama → akun aktif</li>
              <li><span className="font-bold">4.</span> Anda terima credential login</li>
            </ol>
          </div>
        </div>
      }
    >
      <div className="w-full max-w-lg">
        {step === 0 && (
          <div className="anim-in">
            <h1 className="font-display font-extrabold text-3xl text-ink">Sebelum mendaftar</h1>
            <p className="text-ink-mute mt-1.5">
              Disarankan tanya admin terlebih dahulu untuk memilih program yang paling sesuai — agar tidak ada miskomunikasi.
            </p>
            <Card className="mt-6 bg-wave-50 border-wave-100">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-xl bg-white text-[#25D366] flex items-center justify-center shrink-0">
                  <Icon name="whatsapp" className="w-6 h-6" />
                </span>
                <div>
                  <div className="font-display font-bold text-ink">Chat dulu? Itu lebih baik.</div>
                  <p className="text-sm text-ink-soft mt-1.5">
                    Admin akan tanya umur, lokasi, dan tujuan belajar Anda — lalu rekomendasikan kelas yang pas. Tidak ada kewajiban.
                  </p>
                  <a href={waLink("Halo, saya ingin konsultasi sebelum daftar.")} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                    <Btn variant="wa" icon="whatsapp">Konsultasi via WhatsApp</Btn>
                  </a>
                </div>
              </div>
            </Card>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest font-bold text-ink-faint">
              <span className="flex-1 h-px bg-line" />atau<span className="flex-1 h-px bg-line" />
            </div>
            <Btn variant="primary" size="lg" className="w-full" onClick={() => setStep(1)}>
              Langsung isi form pendaftaran
            </Btn>
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm text-ink-mute hover:text-ink-soft font-semibold">
                Sudah punya akun? Masuk
              </Link>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={submit} className="anim-in">
            <div className="flex items-center justify-between mb-5">
              <button type="button" onClick={() => setStep(0)} className="text-sm text-ink-mute hover:text-ink-soft font-semibold inline-flex items-center gap-1">
                <Icon name="arrowL" className="w-3.5 h-3.5" /> Kembali
              </button>
              <span className="text-xs text-ink-faint font-semibold">Step 2 dari 3</span>
            </div>
            <h1 className="font-display font-extrabold text-3xl text-ink">Form pendaftaran</h1>
            <p className="text-ink-mute mt-1.5">Pastikan nomor WhatsApp Anda aktif agar admin bisa menghubungi.</p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <Field label="Nama lengkap" required>
                <Input required placeholder="Mis. Arsenio Daud Putra" value={fullName} onChange={e => setFullName(e.target.value)} />
              </Field>
              <Field label="Tanggal lahir" required>
                <Input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              </Field>
              <Field label="Jenis kelamin" required>
                <Select required value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="" disabled>Pilih…</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </Select>
              </Field>
              <Field label="Cabang yang dituju" required>
                <Select required value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="" disabled>Pilih cabang…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Nomor HP / WhatsApp" required hint="Pastikan bisa dihubungi via WA">
                <Input required type="tel" placeholder="0812 …" value={phone} onChange={e => setPhone(e.target.value)} />
              </Field>
              <Field label="HP milik siapa?" required>
                <div className="flex gap-2 mt-0.5">
                  {(["self", "parent"] as const).map((v) => (
                    <label
                      key={v}
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer text-center ${
                        phoneOwner === v
                          ? "border-ocean-500 bg-ocean-50 text-ocean-700"
                          : "border-line text-ink-soft hover:bg-paper-tint"
                      }`}
                    >
                      <input type="radio" name="phone-owner" className="sr-only" checked={phoneOwner === v} onChange={() => setPhoneOwner(v)} />
                      {v === "self" ? "Saya sendiri" : "Orang tua / wali"}
                    </label>
                  ))}
                </div>
              </Field>

              {phoneOwner === "parent" && (
                <>
                  <Field label="Nama orang tua / wali" required>
                    <Input required placeholder="Mis. Bpk. Andika Putra" value={parentName} onChange={e => setParentName(e.target.value)} />
                  </Field>
                  <Field label="Nomor HP orang tua" required>
                    <Input required type="tel" placeholder="0812 …" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
                  </Field>
                </>
              )}

              <Field label="Alamat" required>
                <Textarea required rows={2} placeholder="Alamat tinggal" value={address} onChange={e => setAddress(e.target.value)} />
              </Field>
              <Field label="Riwayat kesehatan / alergi" hint="Opsional, namun sangat membantu coach">
                <Textarea rows={2} placeholder="Contoh: asma ringan, alergi klorin" value={healthNotes} onChange={e => setHealthNotes(e.target.value)} />
              </Field>
            </div>

            <Card className="mt-6 bg-warn-50 border-warn-500/20">
              <div className="text-sm text-ink-soft flex items-start gap-2.5">
                <Icon name="info" className="w-5 h-5 text-warn-600 shrink-0" />
                <span>
                  <b>Catatan:</b> Setelah submit, admin akan menghubungi Anda untuk konfirmasi kelas dan pembayaran. Akun login akan diberikan setelah pembayaran pertama diverifikasi.
                </span>
              </div>
            </Card>

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <a href={waLink("Halo, saya baru saja mendaftar via web — mohon dibantu konfirmasinya.")} target="_blank" rel="noreferrer" className="block">
                <Btn variant="wa" size="lg" icon="whatsapp" className="w-full h-full">Chat admin dulu</Btn>
              </a>
              <Btn variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "Mengirim…" : "Kirim pendaftaran"}
              </Btn>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="anim-in text-center">
            <div className="w-20 h-20 rounded-full bg-ok-50 text-ok-600 mx-auto flex items-center justify-center mb-5">
              <Icon name="check" className="w-10 h-10" strokeWidth={2.5} />
            </div>
            <h1 className="font-display font-extrabold text-3xl text-ink">Pendaftaran terkirim!</h1>
            <p className="text-ink-mute mt-2.5 max-w-md mx-auto">
              Anda bisa menunggu admin menghubungi via WhatsApp, atau langsung chat admin sekarang untuk mempercepat proses.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <a href={waLink(waMessage)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp" size="lg" className="w-full">Chat admin sekarang</Btn>
              </a>
              <Link href="/">
                <Btn variant="outline" size="lg" className="w-full">Kembali ke beranda</Btn>
              </Link>
            </div>
            <Card className="mt-8 text-left bg-ocean-50 border-ocean-100">
              <div className="text-[11px] uppercase tracking-widest font-bold text-ocean-700 mb-2">Apa yang terjadi selanjutnya</div>
              <ol className="text-sm text-ink-soft space-y-1.5">
                <li>1. Admin review data Anda di panel approvement</li>
                <li>2. Admin chat WA untuk konfirmasi kelas &amp; pembayaran</li>
                <li>3. Setelah lunas → akun login dikirim ke WA Anda</li>
              </ol>
            </Card>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
