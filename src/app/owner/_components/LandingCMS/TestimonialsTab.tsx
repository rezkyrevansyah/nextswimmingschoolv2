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
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import StarDisplay from "@/components/ui/StarDisplay";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useUpload } from "@/hooks/useUpload";
import ImageField from "./ImageField";
import { revalidate } from "./_utils";
import type { TestimonialItem } from "./_types";

export default function TestimonialsTab() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TestimonialItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", role: "", body_text: "", avatar_url: "", rating: 5, sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_testimonials_v2").select("id, sort_order, name, role, body_text, avatar_url, rating").order("sort_order");
    setItems((data ?? []) as TestimonialItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setAvatarFile(null); setForm({ name: "", role: "", body_text: "", avatar_url: "", rating: 5, sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (item: TestimonialItem) => { setEditItem(item); setAvatarFile(null); setForm({ name: item.name, role: item.role ?? "", body_text: item.body_text, avatar_url: item.avatar_url ?? "", rating: item.rating, sort_order: item.sort_order }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const role = form.role.trim() || null;
      if (editItem) {
        let avatarUrl = form.avatar_url.trim() || null;
        if (avatarFile) avatarUrl = await upload.landingImage(avatarFile, "testimonial-v2", editItem.id);
        const { error } = await supabase.from("landing_testimonials_v2").update({ name: form.name, role, body_text: form.body_text, avatar_url: avatarUrl, rating: form.rating, sort_order: form.sort_order }).eq("id", editItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: inserted, error } = await supabase
          .from("landing_testimonials_v2")
          .insert({ name: form.name, role, body_text: form.body_text, rating: form.rating, sort_order: form.sort_order, avatar_url: avatarFile ? null : (form.avatar_url.trim() || null) })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? t("owner.landingCms.saveFailedGeneric"));
        if (avatarFile) await upload.landingImage(avatarFile, "testimonial-v2", inserted.id);
      }
    } catch (e) {
      toast.error(t("owner.landingCms.testimonials.saveFailed"), (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success(t("owner.landingCms.testimonials.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (item: TestimonialItem) => {
    const yes = await confirm({ title: t("owner.landingCms.testimonials.deleteConfirmTitle"), body: item.name || t("owner.landingCms.testimonials.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_testimonials_v2").delete().eq("id", item.id);
    if (error) return toast.error(t("owner.landingCms.testimonials.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.testimonials.deleted"));
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.testimonials.sectionSub")}>{t("owner.landingCms.testimonials.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line p-3">
            <div className="flex items-start gap-2">
              <div className="w-10 h-10 rounded-full bg-ocean-100 overflow-hidden shrink-0 flex items-center justify-center text-ocean-700 font-bold text-sm">
                {item.avatar_url ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" /> : <NoTranslate>{item.name.charAt(0).toUpperCase() || "?"}</NoTranslate>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{item.name ? <NoTranslate>{item.name}</NoTranslate> : t("owner.landingCms.noName")}</div>
                {item.role && <div className="text-xs text-ink-mute truncate"><NoTranslate>{item.role}</NoTranslate></div>}
                <StarDisplay stars={item.rating} size="sm" />
              </div>
              <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(item)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
            <div className="text-xs text-ink-mute line-clamp-2 mt-2"><NoTranslate>{item.body_text}</NoTranslate></div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{t("owner.landingCms.testimonials.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.testimonials.editModalTitle") : t("owner.landingCms.testimonials.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim() || !form.body_text.trim()}>{saving || uploading ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={t("owner.landingCms.testimonials.fieldPhoto")} url={form.avatar_url} onUrlChange={(url) => setForm({ ...form, avatar_url: url })} onFileChange={setAvatarFile} square />
          <Field label={t("owner.landingCms.testimonials.fieldName")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("owner.landingCms.testimonials.fieldNamePlaceholder")} /></Field>
          <Field label={t("owner.landingCms.testimonials.fieldRole")}><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder={t("owner.landingCms.testimonials.fieldRolePlaceholder")} /></Field>
          <Field label={t("owner.landingCms.testimonials.fieldRating")}>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                  <Icon name="star" className={`w-6 h-6 ${n <= form.rating ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={n <= form.rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("owner.landingCms.testimonials.fieldBody")}><Textarea rows={4} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} placeholder={t("owner.landingCms.testimonials.fieldBodyPlaceholder")} /></Field>
          <Field label={t("owner.landingCms.testimonials.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
