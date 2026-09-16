"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Logo from "@/components/ui/Logo";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
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

const CENTER_STAFF_TEAM_ROLES = ["staff", "manager_center"];

interface StaffProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  custom_role_label: string | null;
  avatar_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
}

export default function AdminSettings({ branch, onRefresh }: { branch: Branch | null; onRefresh: () => void; userId: string }) {
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

  // Branch staff team state
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const loadBranchStaff = useCallback(async () => {
    if (!branch?.id) return;
    setLoadingStaff(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, custom_role_label, avatar_url, bank_name, bank_account, bank_holder")
      .eq("branch_id", branch?.id)
      .in("role", CENTER_STAFF_TEAM_ROLES)
      .order("full_name");
    setStaffList((data as StaffProfile[]) ?? []);
    setLoadingStaff(false);
  }, [branch?.id, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load staff team list on mount / branch change
    loadBranchStaff();
  }, [loadBranchStaff]);

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
      {/* Row 1: Identitas Center + Daftar Staff Cabang */}
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

        {/* Daftar Staff & Admin Cabang */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle sub={t("admin.settings.staffListSub")}>
                {t("admin.settings.staffListTitle")}
              </SectionTitle>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-ocean-50 text-ocean-700 border border-ocean-200">
                {t("admin.settings.activeStaffBadge", { count: staffList.length })}
              </span>
            </div>

            {loadingStaff ? (
              <div className="py-8 text-center text-ink-mute text-xs">Memuat daftar staf...</div>
            ) : staffList.length === 0 ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-line text-center space-y-1.5 bg-paper-tint/50">
                <Icon name="users" className="w-8 h-8 text-ink-mute mx-auto stroke-1" />
                <div className="font-semibold text-xs text-ink">{t("admin.settings.noStaffTitle")}</div>
                <div className="text-[11px] text-ink-mute max-w-xs mx-auto">
                  {t("admin.settings.noStaffSub")}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 divide-y divide-line">
                {staffList.map((st) => (
                  <div key={st.id} className="pt-2.5 first:pt-0 flex items-start gap-3">
                    <Avatar name={st.full_name} size={40} className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-ink truncate">{st.full_name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-paper-deep text-ink-soft">
                          {st.custom_role_label || (st.role === "manager_center" ? "Manager Cabang" : "Staff Cabang")}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-mute flex items-center gap-2 flex-wrap">
                        {st.phone && (
                          <a
                            href={`https://wa.me/${st.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ok-700 hover:underline flex items-center gap-1"
                          >
                            <Icon name="whatsapp" className="w-3 h-3 text-ok-600" />
                            {st.phone}
                          </a>
                        )}
                        {st.email && <span>{st.email}</span>}
                      </div>
                      {st.bank_account ? (
                        <div className="flex items-center gap-1.5 text-[11px] bg-paper-tint px-2 py-1 rounded-lg border border-line/60">
                          <Icon name="card" className="w-3 h-3 text-ocean-600 shrink-0" />
                          <span className="font-medium text-ink">{st.bank_name}</span>
                          <span className="font-mono text-ocean-800 font-semibold">{st.bank_account}</span>
                          {st.bank_holder && <span className="text-ink-mute">({st.bank_holder})</span>}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(st.bank_account!);
                              toast.success("Nomor rekening disalin");
                            }}
                            className="text-ink-mute hover:text-ocean-700 ml-auto"
                            title="Salin No. Rekening"
                          >
                            <Icon name="copy" className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-ink-faint italic">Rekening bank belum diatur</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Koordinat Lokasi — full width dengan Interactive Google Maps Picker */}
      <Card>
        <SectionTitle sub={t("admin.settings.locationCoordSub")}>{t("admin.settings.locationCoordTitle")}</SectionTitle>
        <div className="mt-4">
          <MapPicker
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
            onSelectAddress={(newAddress) => {
              if (!address) setAddress(newAddress);
            }}
          />
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
