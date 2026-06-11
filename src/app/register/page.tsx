"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";

interface Branch { id: string; name: string; city: string | null }

const STEPS = ["Persiapan", "Formulir", "Selesai"];

export default function RegisterPage() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [waPhone, setWaPhone] = useState<string | undefined>(undefined);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
    supabase.from("branches").select("id, name, city").eq("status", "active").order("name")
      .then(({ data }) => { if (data) setBranches(data); });
    supabase.from("landing_config").select("footer_wa_number").single()
      .then(({ data }) => { if (data?.footer_wa_number) setWaPhone(data.footer_wa_number); });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !birthDate || !gender || !branchId || !phone || !address) {
      toast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("registrations").insert({
      full_name: fullName,
      email,
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-paper-tint py-16 px-4">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-ocean-100/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-wave-100/40 blur-3xl" />
        <div className="absolute inset-0 grid-faint opacity-40" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ocean-500 via-wave-400 to-ocean-400" />
      </div>

      <div className="relative w-full max-w-lg">

        {/* Logo */}
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

        {/* Step indicator — only on step 1 */}
        {step === 1 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${i <= step ? "text-ocean-600" : "text-ink-faint"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < step ? "bg-ocean-500 text-white" : i === step ? "bg-ocean-100 text-ocean-700 ring-2 ring-ocean-400" : "bg-paper-deep text-ink-faint"}`}>
                    {i < step ? <Icon name="check" className="w-3 h-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? "bg-ocean-400" : "bg-line"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-float ring-1 ring-ocean-100/80 px-5 sm:px-8 py-8 sm:py-10">

          {/* Step 0 — Persiapan */}
          {step === 0 && (
            <div className="anim-in">
              <div className="mb-6">
                <h1 className="font-display font-extrabold text-2xl text-ink">Sebelum mendaftar</h1>
                <p className="text-ink-mute text-sm mt-1.5">
                  Disarankan tanya admin dulu agar program yang dipilih benar-benar sesuai.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-wave-50 border border-wave-100 flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-white text-[#25D366] flex items-center justify-center shrink-0 shadow-card">
                  <Icon name="whatsapp" className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-display font-bold text-ink text-sm">Chat dulu, lebih aman.</div>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                    Admin akan bantu rekomendasikan kelas yang pas — gratis, tanpa kewajiban apapun.
                  </p>
                  <a href={waLink("Halo, saya ingin konsultasi sebelum daftar.", waPhone)} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                    <Btn variant="wa" size="sm" icon="whatsapp">Konsultasi via WhatsApp</Btn>
                  </a>
                </div>
              </div>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest font-bold text-ink-faint">
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

          {/* Step 1 — Form */}
          {step === 1 && (
            <form onSubmit={submit} className="anim-in">
              <div className="mb-5">
                <h1 className="font-display font-extrabold text-2xl text-ink">Form pendaftaran</h1>
                <p className="text-ink-mute text-sm mt-1.5">Pastikan nomor WhatsApp aktif agar admin bisa menghubungi.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nama lengkap" required>
                  <Input required placeholder="Mis. Arsenio Daud Putra" value={fullName} onChange={e => setFullName(e.target.value)} />
                </Field>
                <Field label="Email" required hint="Akan dipakai sebagai akun login">
                  <Input required type="email" placeholder="nama@email.com" value={email} onChange={e => setEmail(e.target.value)} />
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
                      <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ""}</option>
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
                        className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer text-center transition-colors ${
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
                <Field label="Riwayat kesehatan / alergi" hint="Opsional, sangat membantu coach">
                  <Textarea rows={2} placeholder="Contoh: asma ringan, alergi klorin" value={healthNotes} onChange={e => setHealthNotes(e.target.value)} />
                </Field>
              </div>

              <div className="mt-5 p-3.5 rounded-2xl bg-ocean-50 border border-ocean-100 flex items-start gap-2.5">
                <Icon name="info" className="w-4 h-4 text-ocean-500 shrink-0 mt-0.5" />
                <p className="text-xs text-ink-soft leading-relaxed">
                  Setelah pendaftaran dikirim, admin akan menghubungi via WhatsApp untuk konfirmasi kelas dan pembayaran. Akun Anda diaktifkan otomatis setelah proses selesai.
                </p>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setStep(0)} className="flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl border border-line text-sm font-semibold text-ink-soft hover:bg-paper-tint transition-colors">
                  <Icon name="arrowL" className="w-3.5 h-3.5" /> Kembali
                </button>
                <Btn variant="primary" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Mengirim…" : "Kirim pendaftaran"}
                </Btn>
              </div>
            </form>
          )}

          {/* Step 2 — Sukses */}
          {step === 2 && (
            <div className="anim-in text-center">
              <div className="w-16 h-16 rounded-2xl bg-ok-50 text-ok-600 mx-auto flex items-center justify-center mb-5 shadow-card">
                <Icon name="check" className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h1 className="font-display font-extrabold text-2xl text-ink">Pendaftaran terkirim!</h1>
              <p className="text-ink-mute text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                Tunggu admin menghubungi via WhatsApp, atau langsung chat sekarang untuk mempercepat proses.
              </p>

              <div className="mt-7 space-y-3">
                <a href={waLink(waMessage, waPhone)} target="_blank" rel="noreferrer" className="block">
                  <Btn variant="wa" icon="whatsapp" size="lg" className="w-full">Chat admin sekarang</Btn>
                </a>
                <Link href="/" className="block">
                  <Btn variant="outline" size="lg" className="w-full">Kembali ke beranda</Btn>
                </Link>
              </div>

              <div className="mt-7 p-4 rounded-2xl bg-ocean-50 border border-ocean-100 text-left">
                <div className="text-[10px] uppercase tracking-widest font-bold text-ocean-600 mb-2.5">Selanjutnya</div>
                <ol className="text-sm text-ink-soft space-y-2">
                  <li className="flex gap-2.5"><span className="text-ocean-400 font-bold shrink-0">1.</span>Admin review data di panel approvement</li>
                  <li className="flex gap-2.5"><span className="text-ocean-400 font-bold shrink-0">2.</span>Admin chat WA untuk konfirmasi kelas &amp; pembayaran</li>
                  <li className="flex gap-2.5"><span className="text-ocean-400 font-bold shrink-0">3.</span>Setelah lunas → akun login dikirim ke WA Anda</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-ink-faint mt-6 break-words px-2">
          © 2026 Next Swimming School · Fast · Clean · Trusted · Effortless
        </p>
      </div>
    </div>
  );
}
