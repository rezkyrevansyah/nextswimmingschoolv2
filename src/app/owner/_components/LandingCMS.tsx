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
import { useUpload } from "@/hooks/useUpload";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartnerItem { id: string; sort_order: number; name: string; logo_url: string | null; website_url: string | null; }
interface ProgramItem { id: string; sort_order: number; name: string; description: string | null; class_type: string; photo_url: string | null; }

type Tab = "programs" | "partners";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "programs",     label: "Program",      icon: "book"     },
  { id: "partners",     label: "Partner",      icon: "link"     },
];

// ── Revalidate helper ─────────────────────────────────────────────────────────
async function revalidate() {
  const res = await fetch("/api/owner/revalidate", { method: "POST" });
  if (!res.ok) console.error("[revalidate] failed", res.status, await res.text().catch(() => ""));
}

function ImageField({
  label,
  url,
  onUrlChange,
  onFileChange,
  hint = "Gunakan upload storage. URL manual hanya untuk domain yang sudah diizinkan.",
  square = false,
}: {
  label: string;
  url: string;
  onUrlChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
  hint?: string;
  /** Pad the uploaded image to a square canvas (no crop, transparent padding for PNG/WebP) — for logos. */
  square?: boolean;
}) {
  const [mode, setMode] = useState<"url" | "upload">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);

  return (
    <Field label={label} hint={square ? "Gambar akan otomatis dijadikan persegi (tanpa crop, padding transparan)." : hint}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("upload"); onFileChange(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "upload" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => { setMode("url"); onFileChange(null); setPreview(null); setFileName(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "url" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
          >
            Pakai URL
          </button>
        </div>

        {mode === "upload" ? (
          <>
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line hover:border-ocean-400 bg-paper-tint hover:bg-ocean-50/30 transition-colors py-6 px-3">
              <Icon name="camera" className="w-6 h-6 text-ink-mute" />
              <span className="text-xs text-ink-mute font-medium">{processing ? "Memproses gambar..." : (fileName || "Klik untuk pilih gambar")}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={processing}
                onChange={async (e) => {
                  const raw = e.target.files?.[0] ?? null;
                  if (!raw) { onFileChange(null); setFileName(""); setPreview(null); return; }
                  if (!square) {
                    onFileChange(raw);
                    setFileName(raw.name);
                    setPreview(URL.createObjectURL(raw));
                    return;
                  }
                  setProcessing(true);
                  try {
                    const { padImageToSquare } = await import("@/lib/imageSquarePad");
                    const padded = await padImageToSquare(raw);
                    onFileChange(padded);
                    setFileName(padded.name);
                    setPreview(URL.createObjectURL(padded));
                  } finally {
                    setProcessing(false);
                  }
                }}
              />
            </label>
            {(preview || url) && (
              <img
                src={preview ?? url}
                alt="preview"
                className={square ? "w-36 h-36 mx-auto object-contain rounded-lg border border-line [background-image:linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0]" : "w-full h-36 object-cover rounded-lg border border-line"}
              />
            )}
          </>
        ) : (
          <>
            <Input value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." />
            {url && <img src={url} alt="preview" className="w-full h-36 object-cover rounded-lg border border-line" />}
          </>
        )}
      </div>
    </Field>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingCMS() {
  const [tab, setTab] = useState<Tab>("programs");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-ocean-700 text-white shadow-card"
                : "bg-paper-tint text-ink-soft hover:bg-paper-deep hover:text-ink"
            }`}
          >
            <Icon name={t.icon} className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "programs"     && <ProgramsTab />}
      {tab === "partners"     && <PartnersTab />}
    </div>
  );
}

// ── Partners Tab ─────────────────────────────────────────────────────────────
function PartnersTab() {
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
        if (error || !inserted) throw new Error(error?.message ?? "Gagal menyimpan");
        if (logoFile) await upload.landingImage(logoFile, "partner", inserted.id);
      }
    } catch (e) {
      toast.error("Gagal menyimpan", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Partner disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (p: PartnerItem) => {
    const yes = await confirm({ title: "Hapus partner?", body: p.name || "Partner ini akan dihapus dari landing.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_partners").delete().eq("id", p.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("Partner dihapus");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="Logo partner/sekolah yang tampil di landing">Partner</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-20 bg-white flex items-center justify-center p-3">
              {p.logo_url ? <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" /> : <Icon name="link" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{p.name || "Tanpa nama"}</div>
                {p.website_url && <div className="text-xs text-ocean-600 truncate">{p.website_url}</div>}
              </div>
              <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(p)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">Belum ada partner.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Partner" : "Tambah Partner"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label="Logo" url={form.logo_url} onUrlChange={(url) => setForm({ ...form, logo_url: url })} onFileChange={setLogoFile} square />
          <Field label="Nama partner/sekolah"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="SD Ceria Bangsa" /></Field>
          <Field label="Website (opsional)"><Input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── Programs Tab ─────────────────────────────────────────────────────────────

function ProgramsTab() {
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
        if (error || !inserted) throw new Error(error?.message ?? "Gagal menyimpan");
        if (photoFile) await upload.landingImage(photoFile, "program", inserted.id);
      }
    } catch (e) {
      toast.error("Gagal menyimpan", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Program disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (p: ProgramItem) => {
    const yes = await confirm({ title: "Hapus program?", body: p.name || "Program ini akan dihapus dari landing.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_programs").delete().eq("id", p.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("Program dihapus");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="Daftar program/kelas yang tampil di section Our Programs">Program</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
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
                    {p.class_type === "private" ? "Privat" : "Reguler"}
                  </span>
                </div>
                <div className="text-sm font-bold text-ink truncate mt-1">{p.name || "Tanpa nama"}</div>
                {p.description && <div className="text-xs text-ink-mute line-clamp-2">{p.description}</div>}
              </div>
              <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(p)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">Belum ada program.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Program" : "Tambah Program"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label="Foto" url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} />
          <Field label="Nama program"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Renang Anak Pemula" /></Field>
          <Field label="Tipe kelas">
            <Select value={form.class_type} onChange={(e) => setForm({ ...form, class_type: e.target.value })}>
              <option value="reguler">Reguler</option>
              <option value="private">Privat</option>
            </Select>
          </Field>
          <Field label="Deskripsi singkat (opsional)"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Kelas dasar untuk anak usia 4-8 tahun, fokus pengenalan air dan keamanan." /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
