"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { ssr: false, loading: () => <div className="rounded-xl border border-line bg-paper-tint h-[260px] flex items-center justify-center text-ink-mute text-sm">Memuat peta…</div> });
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useUpload } from "@/hooks/useUpload";
import type { Branch } from "../_types";

export default function AdminSettings({ branch, onRefresh, userId }: { branch: Branch | null; onRefresh: () => void; userId: string }) {
  const toast = useToast();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [lat, setLat] = useState(branch?.lat?.toString() ?? "");
  const [lng, setLng] = useState(branch?.lng?.toString() ?? "");
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [waNumbers, setWaNumbers] = useState<string[]>(branch?.wa_numbers ?? []);
  const [saving, setSaving] = useState(false);

  // Admin profile state
  const [myPhone, setMyPhone] = useState("");
  const [myName, setMyName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("full_name, phone").eq("id", userId).single()
      .then(({ data }) => { if (data) { setMyName(data.full_name ?? ""); setMyPhone(data.phone ?? ""); } });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: { full_name: myName, phone: myPhone || null } }),
    });
    setSavingProfile(false);
    const json = await res.json() as { error?: string };
    if (!res.ok) return toast.error("Gagal menyimpan profil", json.error);
    toast.success("Profil diperbarui");
  };

  // Sync state when branch prop changes
  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from prop */
  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setAddress(branch.address ?? "");
      setLat(branch.lat?.toString() ?? "");
      setLng(branch.lng?.toString() ?? "");
      setWaNumbers(branch.wa_numbers ?? []);
    }
  }, [branch?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    if (!branch) return;
    setSaving(true);
    const clean = waNumbers.map(n => n.trim()).filter(Boolean);
    const { error } = await supabase.from("branches").update({ name, address, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null, wa_numbers: clean }).eq("id", branch.id);
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Settings disimpan");
    onRefresh();
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !branch) return;
    try {
      const url = await upload.logo(file, branch.id);
      if (url) { toast.success("Logo diperbarui"); onRefresh(); }
    } catch (err) {
      toast.error("Gagal upload logo", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Identitas + Profil Saya */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Identitas Cabang */}
        <Card className="space-y-5">
          <SectionTitle sub="Informasi dasar cabang">Identitas Cabang</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-paper-tint flex items-center justify-center border border-line overflow-hidden shrink-0">
              {branch?.logo_url ? <Image src={branch.logo_url} alt="logo" width={80} height={80} className="w-full h-full object-cover" /> : <Logo size={52} />}
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">Logo Cabang</div>
              <p className="text-xs text-ink-mute mt-0.5">Rasio 1:1, max 2MB.</p>
              <label className="mt-2 inline-flex cursor-pointer">
                <Btn variant="outline" size="sm" icon="upload" disabled={uploading}>Ganti logo</Btn>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogo} />
              </label>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-line">
            <Field label="Nama cabang" required><Input value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Alamat lengkap" required><Input value={address} onChange={e => setAddress(e.target.value)} /></Field>
          </div>
          <div className="pt-4 border-t border-line">
            <Field label="Nomor WhatsApp Cabang" hint="Muncul di tombol 'Hubungi Admin' pada landing page, panel member, dan panel coach.">
              <div className="space-y-2">
                {waNumbers.map((num, i) => (
                  <div key={i} className="flex gap-2">
                    <Input type="tel" value={num}
                      onChange={e => setWaNumbers(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                      placeholder="Mis. 081234567890" className="flex-1 font-mono" />
                    <button onClick={() => setWaNumbers(prev => prev.filter((_, j) => j !== i))}
                      className="w-9 h-9 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center border border-line shrink-0">
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Btn variant="ghost" size="sm" icon="plus" onClick={() => setWaNumbers(prev => [...prev, ""])}>Tambah nomor</Btn>
              </div>
            </Field>
          </div>
          <div className="pt-2">
            <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan perubahan"}</Btn>
          </div>
        </Card>

        {/* Profil Saya */}
        <Card className="space-y-4">
          <SectionTitle sub="Data akun Anda">Profil Saya</SectionTitle>
          <Field label="Nama lengkap"><Input value={myName} onChange={e => setMyName(e.target.value)} /></Field>
          <Field label="No. HP Pribadi" hint="Nomor pribadi Anda sebagai admin — tidak dipakai untuk tombol kontak cabang">
            <Input type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder="Mis. 081234567890" className="font-mono" />
          </Field>
          <div className="pt-2">
            <Btn variant="primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Menyimpan…" : "Simpan profil"}</Btn>
          </div>
        </Card>
      </div>

      {/* Row 2: Koordinat Lokasi — full width karena peta butuh ruang */}
      <Card>
        <SectionTitle sub="Digunakan untuk validasi radius absensi coach">Koordinat Lokasi Cabang</SectionTitle>
        <div className="mt-4">
          <MapPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          <div className="mt-3 grid sm:grid-cols-2 gap-3 max-w-sm">
            <Field label="Latitude"><Input value={lat} onChange={e => setLat(e.target.value)} className="font-mono" placeholder="-6.2615" /></Field>
            <Field label="Longitude"><Input value={lng} onChange={e => setLng(e.target.value)} className="font-mono" placeholder="106.8106" /></Field>
          </div>
        </div>
      </Card>
    </div>
  );
}
