"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { revalidate } from "./_utils";
import { WHY_NEXT_ICONS, type WhyNextItem } from "./_types";

export default function WhyNextTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const [items, setItems] = useState<WhyNextItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<WhyNextItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ icon: "shield", title: "", description: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_why_next").select("id, sort_order, icon, title, description").order("sort_order");
    setItems((data ?? []) as WhyNextItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setForm({ icon: "shield", title: "", description: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (w: WhyNextItem) => { setEditItem(w); setForm({ icon: w.icon, title: w.title, description: w.description ?? "", sort_order: w.sort_order }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const description = form.description.trim() || null;
      if (editItem) {
        const { error } = await supabase.from("landing_why_next").update({ icon: form.icon, title: form.title, description, sort_order: form.sort_order }).eq("id", editItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("landing_why_next").insert({ icon: form.icon, title: form.title, description, sort_order: form.sort_order });
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      toast.error("Failed to save", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Why Next point saved");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (w: WhyNextItem) => {
    const yes = await confirm({ title: "Delete this point?", body: w.title || "This point will be removed from the landing page.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_why_next").delete().eq("id", w.id);
    if (error) return toast.error("Failed to delete", error.message);
    await revalidate();
    toast.success("Point deleted");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={"Highlight points shown in the Why Next section"}>{"Why Next"}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{"Add"}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((w) => (
          <div key={w.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line p-4">
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-xl bg-ocean-50 flex items-center justify-center shrink-0">
                <Icon name={w.icon} className="w-4.5 h-4.5 text-ocean-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{w.title ? <NoTranslate>{w.title}</NoTranslate> : "Untitled"}</div>
                {w.description && <div className="text-xs text-ink-mute line-clamp-2 mt-0.5"><NoTranslate>{w.description}</NoTranslate></div>}
              </div>
              <button onClick={() => openEdit(w)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(w)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{"No points yet."}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Point" : "Add Point"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-3">
          <Field label={"Icon"}>
            <Select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {WHY_NEXT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </Select>
          </Field>
          <Field label={"Title"}><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={"Certified Coaches"} /></Field>
          <Field label={"Short description (optional)"}><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={"Every coach holds a verified certification before teaching."} /></Field>
          <Field label={"Order"}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
