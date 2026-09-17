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
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useUpload } from "@/hooks/useUpload";
import ImageField from "./ImageField";
import { revalidate } from "./_utils";
import type { ProgramItem } from "./_types";

export default function ProgramsTab() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProgramItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", description: "", class_type: "reguler", photo_url: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_programs").select("id, sort_order, name, description, class_type, photo_url").order("sort_order");
    setItems((data ?? []) as ProgramItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setPhotoFile(null); setForm({ name: "", description: "", class_type: "reguler", photo_url: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (p: ProgramItem) => { setEditItem(p); setPhotoFile(null); setForm({ name: p.name, description: p.description ?? "", class_type: p.class_type, photo_url: p.photo_url ?? "", sort_order: p.sort_order }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const description = form.description.trim() || null;
      if (editItem) {
        let photoUrl = form.photo_url.trim() || null;
        if (photoFile) photoUrl = await upload.landingImage(photoFile, "program", editItem.id);
        const { error } = await supabase.from("landing_programs").update({ name: form.name, description, class_type: form.class_type, sort_order: form.sort_order, photo_url: photoUrl }).eq("id", editItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: inserted, error } = await supabase
          .from("landing_programs")
          .insert({ name: form.name, description, class_type: form.class_type, sort_order: form.sort_order, photo_url: photoFile ? null : (form.photo_url.trim() || null) })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? t("owner.landingCms.saveFailedGeneric"));
        if (photoFile) await upload.landingImage(photoFile, "program", inserted.id);
      }
    } catch (e) {
      toast.error(t("owner.landingCms.programs.saveFailed"), (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success(t("owner.landingCms.programs.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (p: ProgramItem) => {
    const yes = await confirm({ title: t("owner.landingCms.programs.deleteConfirmTitle"), body: p.name || t("owner.landingCms.programs.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_programs").delete().eq("id", p.id);
    if (error) return toast.error(t("owner.landingCms.programs.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.programs.deleted"));
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.programs.sectionSub")}>{t("owner.landingCms.programs.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-24 bg-white flex items-center justify-center">
              {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : <Icon name="swim" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.class_type === "private" ? "bg-wave-50 text-wave-700" : "bg-ocean-50 text-ocean-700"}`}>
                    {p.class_type === "private" ? t("owner.landingCms.programs.typePrivate") : t("owner.landingCms.programs.typeRegular")}
                  </span>
                </div>
                <div className="text-sm font-bold text-ink truncate mt-1">{p.name ? <NoTranslate>{p.name}</NoTranslate> : t("owner.landingCms.noName")}</div>
                {p.description && <div className="text-xs text-ink-mute line-clamp-2"><NoTranslate>{p.description}</NoTranslate></div>}
              </div>
              <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(p)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{t("owner.landingCms.programs.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.programs.editModalTitle") : t("owner.landingCms.programs.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={t("owner.landingCms.programs.fieldPhoto")} url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} />
          <Field label={t("owner.landingCms.programs.fieldName")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("owner.landingCms.programs.fieldNamePlaceholder")} /></Field>
          <Field label={t("owner.landingCms.programs.fieldClassType")}>
            <Select value={form.class_type} onChange={(e) => setForm({ ...form, class_type: e.target.value })}>
              <option value="reguler">{t("owner.landingCms.programs.typeRegular")}</option>
              <option value="private">{t("owner.landingCms.programs.typePrivate")}</option>
            </Select>
          </Field>
          <Field label={t("owner.landingCms.programs.fieldDescription")}><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("owner.landingCms.programs.fieldDescriptionPlaceholder")} /></Field>
          <Field label={t("owner.landingCms.programs.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
