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
import { NoTranslate } from "@/components/ui/NoTranslate";
import { revalidate } from "./_utils";
import type { FaqItem } from "./_types";

export default function FaqTab() {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_faqs").select("id, sort_order, question, answer").order("sort_order");
    setItems((data ?? []) as FaqItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setForm({ question: "", answer: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (item: FaqItem) => { setEditItem(item); setForm({ question: item.question, answer: item.answer, sort_order: item.sort_order }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    if (editItem) {
      const { error } = await supabase.from("landing_faqs").update({ question: form.question, answer: form.answer, sort_order: form.sort_order }).eq("id", editItem.id);
      if (error) { toast.error(t("owner.landingCms.faq.saveFailed"), error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("landing_faqs").insert({ question: form.question, answer: form.answer, sort_order: form.sort_order });
      if (error) { toast.error(t("owner.landingCms.faq.saveFailed"), error.message); setSaving(false); return; }
    }
    await revalidate();
    toast.success(t("owner.landingCms.faq.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (item: FaqItem) => {
    const yes = await confirm({ title: t("owner.landingCms.faq.deleteConfirmTitle"), body: item.question || t("owner.landingCms.faq.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_faqs").delete().eq("id", item.id);
    if (error) return toast.error(t("owner.landingCms.faq.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.faq.deleted"));
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.faq.sectionSub")}>{t("owner.landingCms.faq.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-paper-tint border border-line p-3 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-ink">{item.question ? <NoTranslate>{item.question}</NoTranslate> : t("owner.landingCms.noName")}</div>
              <div className="text-xs text-ink-mute line-clamp-2 mt-0.5"><NoTranslate>{item.answer}</NoTranslate></div>
            </div>
            <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
            <button onClick={() => del(item)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm">{t("owner.landingCms.faq.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.faq.editModalTitle") : t("owner.landingCms.faq.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || !form.question.trim() || !form.answer.trim()}>{saving ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <Field label={t("owner.landingCms.faq.fieldQuestion")}><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={t("owner.landingCms.faq.fieldQuestionPlaceholder")} /></Field>
          <Field label={t("owner.landingCms.faq.fieldAnswer")}><Textarea rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder={t("owner.landingCms.faq.fieldAnswerPlaceholder")} /></Field>
          <Field label={t("owner.landingCms.faq.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
