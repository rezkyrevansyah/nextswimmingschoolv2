"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useUpload } from "@/hooks/useUpload";
import ImageField from "./ImageField";
import { revalidate } from "./_utils";
import type { BranchEntryItem, CoreBranchOption } from "./_types";

// Dual-mode: "linked" references an existing core branch (live-joined via the
// public_branches view), "standalone" stores its own minimal display fields.
export default function BranchesTab() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [items, setItems] = useState<BranchEntryItem[]>([]);
  const [coreBranches, setCoreBranches] = useState<CoreBranchOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BranchEntryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"linked" | "standalone">("linked");
  const [form, setForm] = useState({
    branch_id: "", name: "", address: "", city: "", phone: "", photo_url: "",
    lat: "", lng: "", sort_order: 0,
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("landing_branches")
      .select("id, sort_order, branch_id, name, address, city, phone, photo_url, lat, lng, linked:public_branches!branch_id(name, city, address, phone, logo_url)")
      .order("sort_order");
    setItems((data ?? []) as unknown as BranchEntryItem[]);
  }, [supabase]);

  const loadCoreBranches = useCallback(async () => {
    const { data } = await supabase.from("branches").select("id, name, city").eq("status", "active").order("name");
    setCoreBranches((data ?? []) as CoreBranchOption[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); loadCoreBranches(); }, [load, loadCoreBranches]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = (sortOrder: number) => setForm({ branch_id: "", name: "", address: "", city: "", phone: "", photo_url: "", lat: "", lng: "", sort_order: sortOrder });

  const openAdd = () => { setEditItem(null); setPhotoFile(null); setMode("linked"); resetForm(items.length + 1); setShowModal(true); };
  const openEdit = (item: BranchEntryItem) => {
    setEditItem(item);
    setPhotoFile(null);
    setMode(item.branch_id ? "linked" : "standalone");
    setForm({
      branch_id: item.branch_id ?? "",
      name: item.name ?? "", address: item.address ?? "", city: item.city ?? "", phone: item.phone ?? "",
      photo_url: item.photo_url ?? "", lat: item.lat != null ? String(item.lat) : "", lng: item.lng != null ? String(item.lng) : "",
      sort_order: item.sort_order,
    });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    const lat = form.lat.trim() ? Number(form.lat) : null;
    const lng = form.lng.trim() ? Number(form.lng) : null;
    const payload = mode === "linked"
      ? { branch_id: form.branch_id, name: null, address: null, city: null, phone: null, lat, lng, sort_order: form.sort_order }
      : { branch_id: null, name: form.name, address: form.address, city: form.city, phone: form.phone, lat, lng, sort_order: form.sort_order };

    try {
      if (editItem) {
        let photoUrl = form.photo_url.trim() || null;
        if (photoFile) photoUrl = await upload.landingImage(photoFile, "branch", editItem.id);
        const { error } = await supabase.from("landing_branches").update({ ...payload, photo_url: photoUrl }).eq("id", editItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: inserted, error } = await supabase
          .from("landing_branches")
          .insert({ ...payload, photo_url: photoFile ? null : (form.photo_url.trim() || null) })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? t("owner.landingCms.saveFailedGeneric"));
        if (photoFile) await upload.landingImage(photoFile, "branch", inserted.id);
      }
    } catch (e) {
      toast.error(t("owner.landingCms.branches.saveFailed"), (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success(t("owner.landingCms.branches.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (item: BranchEntryItem) => {
    const label = item.branch_id ? item.linked?.name : item.name;
    const yes = await confirm({ title: t("owner.landingCms.branches.deleteConfirmTitle"), body: label || t("owner.landingCms.branches.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_branches").delete().eq("id", item.id);
    if (error) return toast.error(t("owner.landingCms.branches.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.branches.deleted"));
    load();
  };

  const selectedCoreBranch = coreBranches.find((b) => b.id === form.branch_id);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.branches.sectionSub")}>{t("owner.landingCms.branches.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const display = item.branch_id
            ? { name: item.linked?.name, city: item.linked?.city, photo_url: item.photo_url || item.linked?.logo_url }
            : { name: item.name, city: item.city, photo_url: item.photo_url };
          return (
            <div key={item.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
              <div className="h-24 bg-white flex items-center justify-center">
                {display.photo_url ? <img src={display.photo_url} alt={display.name ?? ""} className="w-full h-full object-cover" /> : <Icon name="pin" className="w-8 h-8 text-ocean-300" />}
              </div>
              <div className="p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.branch_id ? "bg-ocean-50 text-ocean-700" : "bg-wave-50 text-wave-700"}`}>
                      {item.branch_id ? t("owner.landingCms.branches.modeLinked") : t("owner.landingCms.branches.modeStandalone")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-ink truncate mt-1">{display.name ? <NoTranslate>{display.name}</NoTranslate> : t("owner.landingCms.noName")}</div>
                  {display.city && <div className="text-xs text-ink-mute"><NoTranslate>{display.city}</NoTranslate></div>}
                </div>
                <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
                <button onClick={() => del(item)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{t("owner.landingCms.branches.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.branches.editModalTitle") : t("owner.landingCms.branches.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || (mode === "linked" ? !form.branch_id : !form.name.trim())}>{saving || uploading ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("linked")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "linked" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}>
              {t("owner.landingCms.branches.modeLinked")}
            </button>
            <button type="button" onClick={() => setMode("standalone")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "standalone" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}>
              {t("owner.landingCms.branches.modeStandalone")}
            </button>
          </div>

          {mode === "linked" ? (
            <>
              <Field label={t("owner.landingCms.branches.fieldLinkedBranch")}>
                <Select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="" disabled>{t("owner.landingCms.branches.fieldLinkedBranchPlaceholder")}</option>
                  {coreBranches.map((b) => <option key={b.id} value={b.id} translate="no" className="notranslate">{b.name}{b.city ? ` — ${b.city}` : ""}</option>)}
                </Select>
              </Field>
              <div className="rounded-xl bg-paper-tint border border-line p-3 text-sm text-ink-mute">
                {selectedCoreBranch ? <NoTranslate>{selectedCoreBranch.name}{selectedCoreBranch.city ? ` — ${selectedCoreBranch.city}` : ""}</NoTranslate> : t("owner.landingCms.branches.linkedPreviewEmpty")}
              </div>
              <ImageField label={t("owner.landingCms.branches.fieldPhotoOverride")} url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} />
            </>
          ) : (
            <>
              <ImageField label={t("owner.landingCms.branches.fieldPhoto")} url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} />
              <Field label={t("owner.landingCms.branches.fieldName")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("owner.landingCms.branches.fieldNamePlaceholder")} /></Field>
              <Field label={t("owner.landingCms.branches.fieldAddress")}><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t("owner.landingCms.branches.fieldAddressPlaceholder")} /></Field>
              <Field label={t("owner.landingCms.branches.fieldCity")}><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t("owner.landingCms.branches.fieldCityPlaceholder")} /></Field>
              <Field label={t("owner.landingCms.branches.fieldPhone")}><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("owner.landingCms.branches.fieldPhonePlaceholder")} className="font-mono" /></Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label={t("owner.landingCms.branches.fieldLat")}><Input inputMode="decimal" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="-6.2615" className="font-mono" /></Field>
            <Field label={t("owner.landingCms.branches.fieldLng")}><Input inputMode="decimal" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="106.8106" className="font-mono" /></Field>
          </div>
          <p className="text-[11px] text-ink-faint">{t("owner.landingCms.branches.fieldMapHint")}</p>
          <Field label={t("owner.landingCms.branches.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
