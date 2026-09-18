"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useUpload } from "@/hooks/useUpload";
import ImageField from "./ImageField";
import { revalidate } from "./_utils";
import type { CoachItem } from "./_types";

export default function CoachesTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [items, setItems] = useState<CoachItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CoachItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", photo_url: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_coaches").select("id, sort_order, name, photo_url").order("sort_order");
    setItems((data ?? []) as CoachItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setPhotoFile(null); setForm({ name: "", photo_url: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (c: CoachItem) => { setEditItem(c); setPhotoFile(null); setForm({ name: c.name, photo_url: c.photo_url ?? "", sort_order: c.sort_order }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editItem) {
        let photoUrl = form.photo_url.trim() || null;
        if (photoFile) photoUrl = await upload.landingImage(photoFile, "coach", editItem.id);
        const { error } = await supabase.from("landing_coaches").update({ name: form.name, sort_order: form.sort_order, photo_url: photoUrl }).eq("id", editItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: inserted, error } = await supabase
          .from("landing_coaches")
          .insert({ name: form.name, sort_order: form.sort_order, photo_url: photoFile ? null : (form.photo_url.trim() || null) })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? "Failed to save");
        if (photoFile) await upload.landingImage(photoFile, "coach", inserted.id);
      }
    } catch (e) {
      toast.error("Failed to save", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Coach saved");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (c: CoachItem) => {
    const yes = await confirm({ title: "Delete this coach?", body: c.name || "This coach will be removed from the landing page.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_coaches").delete().eq("id", c.id);
    if (error) return toast.error("Failed to delete", error.message);
    await revalidate();
    toast.success("Coach deleted");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={"Coach photo + name shown in the Our Coach section"}>{"Coach"}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{"Add"}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-28 bg-white flex items-center justify-center">
              {c.photo_url ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" /> : <Icon name="user" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{c.name ? <NoTranslate>{c.name}</NoTranslate> : "Unnamed"}</div>
              </div>
              <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(c)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{"No coaches yet."}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Coach" : "Add Coach"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={"Photo"} url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} square />
          <Field label={"Coach name"}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={"Coach Andi"} /></Field>
          <Field label={"Order"}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
