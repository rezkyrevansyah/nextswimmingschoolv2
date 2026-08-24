"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Logo from "@/components/ui/Logo";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useUpload } from "@/hooks/useUpload";
import type { Branch } from "../_types";

function MapLoading() {
  const { t } = useLocale();
  return <div className="rounded-xl border border-line bg-paper-tint h-[260px] flex items-center justify-center text-ink-mute text-sm">{t("admin.settings.mapLoading")}</div>;
}
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { ssr: false, loading: MapLoading });

export default function AdminSettings({ branch, onRefresh, userId }: { branch: Branch | null; onRefresh: () => void; userId: string }) {
  const toast = useToast();
  const { t } = useLocale();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [lat, setLat] = useState(branch?.lat?.toString() ?? "");
  const [lng, setLng] = useState(branch?.lng?.toString() ?? "");
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [waPhone, setWaPhone] = useState(branch?.wa_numbers?.[0] ?? "");
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
    if (!res.ok) return toast.error(t("admin.settings.toastSaveProfileFailed"), json.error);
    toast.success(t("admin.settings.toastProfileUpdated"));
  };

  // Sync state when branch prop changes
  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from prop */
  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setAddress(branch.address ?? "");
      setLat(branch.lat?.toString() ?? "");
      setLng(branch.lng?.toString() ?? "");
      setWaPhone(branch.wa_numbers?.[0] ?? "");
    }
  }, [branch?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    if (!branch) return;
    setSaving(true);
    const clean = waPhone.trim() ? [waPhone.trim()] : [];
    const { error } = await supabase.from("branches").update({ name, address, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null, wa_numbers: clean }).eq("id", branch.id);
    setSaving(false);
    if (error) return toast.error(t("admin.settings.toastSaveFailed"), error.message);
    toast.success(t("admin.settings.toastSettingsSaved"));
    onRefresh();
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !branch) return;
    try {
      const url = await upload.logo(file, branch.id);
      if (url) { toast.success(t("admin.settings.toastLogoUpdated")); onRefresh(); }
    } catch (err) {
      toast.error(t("admin.settings.toastLogoUploadFailed"), err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Identitas + Profil Saya */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Identitas Cabang */}
        <Card className="space-y-5">
          <SectionTitle sub={t("admin.settings.branchIdentitySub")}>{t("admin.settings.branchIdentityTitle")}</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-paper-tint flex items-center justify-center border border-line overflow-hidden shrink-0">
              {branch?.logo_url ? <Image src={branch.logo_url} alt="logo" width={80} height={80} className="w-full h-full object-cover" /> : <Logo size={52} />}
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">{t("admin.settings.logoLabel")}</div>
              <p className="text-xs text-ink-mute mt-0.5">{t("admin.settings.logoHint")}</p>
              <label className="mt-2 inline-flex cursor-pointer">
                <Btn variant="outline" size="sm" icon="upload" disabled={uploading}>{t("admin.settings.changeLogoBtn")}</Btn>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogo} />
              </label>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-line">
            <Field label={t("admin.settings.fieldBranchName")} required><Input value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label={t("admin.settings.fieldFullAddress")} required><Input value={address} onChange={e => setAddress(e.target.value)} /></Field>
          </div>
          <div className="pt-4 border-t border-line">
            <Field label={t("admin.settings.fieldBranchWhatsapp")} hint={t("admin.settings.fieldBranchWhatsappHint")}>
              <Input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder={t("admin.settings.phonePlaceholder")} className="font-mono" />
            </Field>
          </div>
        </Card>

        {/* Profil Saya */}
        <Card className="space-y-4">
          <SectionTitle sub={t("admin.settings.myProfileSub")}>{t("admin.settings.myProfileTitle")}</SectionTitle>
          <Field label={t("admin.settings.fieldFullName")}><Input value={myName} onChange={e => setMyName(e.target.value)} /></Field>
          <Field label={t("admin.settings.fieldPersonalPhone")} hint={t("admin.settings.fieldPersonalPhoneHint")}>
            <Input type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder={t("admin.settings.phonePlaceholder")} className="font-mono" />
          </Field>
          <div className="pt-2">
            <Btn variant="primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? t("common.actions.saving") : t("admin.settings.saveProfileBtn")}</Btn>
          </div>
        </Card>
      </div>

      {/* Row 2: Koordinat Lokasi — full width karena peta butuh ruang */}
      <Card>
        <SectionTitle sub={t("admin.settings.locationCoordSub")}>{t("admin.settings.locationCoordTitle")}</SectionTitle>
        <div className="mt-4">
          <MapPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          <div className="mt-3 grid sm:grid-cols-2 gap-3 max-w-sm">
            <Field label={t("admin.settings.fieldLatitude")}><Input value={lat} onChange={e => setLat(e.target.value)} className="font-mono" placeholder="-6.2615" /></Field>
            <Field label={t("admin.settings.fieldLongitude")}><Input value={lng} onChange={e => setLng(e.target.value)} className="font-mono" placeholder="106.8106" /></Field>
          </div>
          <div className="mt-4 pt-4 border-t border-line">
            <Btn variant="primary" onClick={save} disabled={saving}>{saving ? t("common.actions.saving") : t("admin.settings.saveIdentityLocationBtn")}</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
