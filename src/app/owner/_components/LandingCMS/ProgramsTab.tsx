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
import { useUpload } from "@/hooks/useUpload";
import ImageField from "./ImageField";
import { revalidate } from "./_utils";
import type { ProgramItem } from "./_types";

export default function ProgramsTab() {
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
        if (error || !inserted) throw new Error(error?.message ?? "Failed to save");
        if (photoFile) await upload.landingImage(photoFile, "program", inserted.id);
      }
    } catch (e) {
      toast.error("Failed to save", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Program saved");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (p: ProgramItem) => {
    const yes = await confirm({ title: "Delete this program?", body: p.name || "This program will be removed from the landing page.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_programs").delete().eq("id", p.id);
    if (error) return toast.error("Failed to delete", error.message);
    await revalidate();
    toast.success("Program deleted");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={"Programs/classes shown in the Our Programs section"}>{"Program"}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{"Add"}</Btn>
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
                    {p.class_type === "private" ? "Private" : "Regular"}
                  </span>
                </div>
                <div className="text-sm font-bold text-ink truncate mt-1">{p.name ? <NoTranslate>{p.name}</NoTranslate> : "Unnamed"}</div>
                {p.description && <div className="text-xs text-ink-mute line-clamp-2"><NoTranslate>{p.description}</NoTranslate></div>}
              </div>
              <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(p)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{"No programs yet."}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Program" : "Add Program"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={"Photo"} url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} />
          <Field label={"Program name"}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={"Beginner Kids Swimming"} /></Field>
          <Field label={"Class type"}>
            <Select value={form.class_type} onChange={(e) => setForm({ ...form, class_type: e.target.value })}>
              <option value="reguler">{"Regular"}</option>
              <option value="private">{"Private"}</option>
            </Select>
          </Field>
          <Field label={"Short description (optional)"}><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={"Basic class for ages 4-8, focused on water familiarization and safety."} /></Field>
          <Field label={"Order"}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
