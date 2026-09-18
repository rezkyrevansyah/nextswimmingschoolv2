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
import type { PartnerItem } from "./_types";

export default function PartnersTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [items, setItems] = useState<PartnerItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PartnerItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", logo_url: "", website_url: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_partners").select("id, sort_order, name, logo_url, website_url").order("sort_order");
    setItems((data ?? []) as PartnerItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setLogoFile(null); setForm({ name: "", logo_url: "", website_url: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (p: PartnerItem) => { setEditItem(p); setLogoFile(null); setForm({ name: p.name, logo_url: p.logo_url ?? "", website_url: p.website_url ?? "", sort_order: p.sort_order }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const websiteUrl = form.website_url.trim() || null;
      if (editItem) {
        let logoUrl = form.logo_url.trim() || null;
        if (logoFile) logoUrl = await upload.landingImage(logoFile, "partner", editItem.id);
        const { error } = await supabase.from("landing_partners").update({ name: form.name, sort_order: form.sort_order, logo_url: logoUrl, website_url: websiteUrl }).eq("id", editItem.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: inserted, error } = await supabase
          .from("landing_partners")
          .insert({ name: form.name, sort_order: form.sort_order, website_url: websiteUrl, logo_url: logoFile ? null : (form.logo_url.trim() || null) })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? "Failed to save");
        if (logoFile) await upload.landingImage(logoFile, "partner", inserted.id);
      }
    } catch (e) {
      toast.error("Failed to save", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Partner saved");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (p: PartnerItem) => {
    const yes = await confirm({ title: "Delete this partner?", body: p.name || "This partner will be removed from the landing page.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_partners").delete().eq("id", p.id);
    if (error) return toast.error("Failed to delete", error.message);
    await revalidate();
    toast.success("Partner deleted");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={"Partner/school logos shown on the landing page"}>{"Partner"}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{"Add"}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-20 bg-white flex items-center justify-center p-3">
              {p.logo_url ? <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" /> : <Icon name="link" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{p.name ? <NoTranslate>{p.name}</NoTranslate> : "Unnamed"}</div>
                {p.website_url && <div className="text-xs text-ocean-600 truncate"><NoTranslate>{p.website_url}</NoTranslate></div>}
              </div>
              <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(p)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{"No partners yet."}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Partner" : "Add Partner"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={"Logo"} url={form.logo_url} onUrlChange={(url) => setForm({ ...form, logo_url: url })} onFileChange={setLogoFile} square />
          <Field label={"Partner/school name"}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={"Ceria Bangsa Elementary School"} /></Field>
          <Field label={"Website (optional)"}><Input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." /></Field>
          <Field label={"Order"}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
