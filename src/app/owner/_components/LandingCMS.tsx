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
import StarDisplay from "@/components/ui/StarDisplay";
import { useUpload } from "@/hooks/useUpload";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartnerItem { id: string; sort_order: number; name: string; logo_url: string | null; website_url: string | null; }
interface ProgramItem { id: string; sort_order: number; name: string; description: string | null; class_type: string; photo_url: string | null; }
interface CoachItem { id: string; sort_order: number; name: string; photo_url: string | null; }
interface WhyNextItem { id: string; sort_order: number; icon: string; title: string; description: string | null; }
interface TestimonialItem { id: string; sort_order: number; name: string; role: string | null; body_text: string; avatar_url: string | null; rating: number; }

type Tab = "programs" | "coaches" | "whynext" | "testimonials" | "partners";

const WHY_NEXT_ICONS = ["shield", "star", "check", "users", "target", "book", "swim", "clipboard", "sparkle"];

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "programs",     label: "Program",      icon: "book"     },
  { id: "coaches",      label: "Coach",        icon: "swim"     },
  { id: "whynext",      label: "Why Next",     icon: "shield"   },
  { id: "testimonials", label: "Testimoni",    icon: "users"    },
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
      {tab === "coaches"      && <CoachesTab />}
      {tab === "whynext"      && <WhyNextTab />}
      {tab === "testimonials" && <TestimonialsTab />}
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

// ── Coaches Tab ──────────────────────────────────────────────────────────────

function CoachesTab() {
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
        if (error || !inserted) throw new Error(error?.message ?? "Gagal menyimpan");
        if (photoFile) await upload.landingImage(photoFile, "coach", inserted.id);
      }
    } catch (e) {
      toast.error("Gagal menyimpan", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Coach disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (c: CoachItem) => {
    const yes = await confirm({ title: "Hapus coach?", body: c.name || "Coach ini akan dihapus dari landing.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_coaches").delete().eq("id", c.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("Coach dihapus");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="Foto + nama coach yang tampil di section Our Coach">Coach</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-28 bg-white flex items-center justify-center">
              {c.photo_url ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" /> : <Icon name="user" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{c.name || "Tanpa nama"}</div>
              </div>
              <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(c)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">Belum ada coach.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Coach" : "Tambah Coach"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label="Foto" url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} square />
          <Field label="Nama coach"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coach Andi" /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── Why Next Tab ─────────────────────────────────────────────────────────────

function WhyNextTab() {
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
      toast.error("Gagal menyimpan", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Poin Why Next disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (w: WhyNextItem) => {
    const yes = await confirm({ title: "Hapus poin ini?", body: w.title || "Poin ini akan dihapus dari landing.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_why_next").delete().eq("id", w.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("Poin dihapus");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="Poin keunggulan yang tampil di section Why Next">Why Next</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((w) => (
          <div key={w.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line p-4">
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-xl bg-ocean-50 flex items-center justify-center shrink-0">
                <Icon name={w.icon} className="w-4.5 h-4.5 text-ocean-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{w.title || "Tanpa judul"}</div>
                {w.description && <div className="text-xs text-ink-mute line-clamp-2 mt-0.5">{w.description}</div>}
              </div>
              <button onClick={() => openEdit(w)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(w)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">Belum ada poin.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Poin" : "Tambah Poin"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <Field label="Ikon">
            <Select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {WHY_NEXT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </Select>
          </Field>
          <Field label="Judul"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Coach Bersertifikat" /></Field>
          <Field label="Deskripsi singkat (opsional)"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Setiap coach memiliki sertifikasi yang diverifikasi sebelum mengajar." /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── Testimonials Tab ──────────────────────────────────────────────────────────

function TestimonialsTab() {
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
  const openEdit = (t: TestimonialItem) => { setEditItem(t); setAvatarFile(null); setForm({ name: t.name, role: t.role ?? "", body_text: t.body_text, avatar_url: t.avatar_url ?? "", rating: t.rating, sort_order: t.sort_order }); setShowModal(true); };

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
        if (error || !inserted) throw new Error(error?.message ?? "Gagal menyimpan");
        if (avatarFile) await upload.landingImage(avatarFile, "testimonial-v2", inserted.id);
      }
    } catch (e) {
      toast.error("Gagal menyimpan", (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success("Testimoni disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (t: TestimonialItem) => {
    const yes = await confirm({ title: "Hapus testimoni?", body: t.name || "Testimoni ini akan dihapus dari landing.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_testimonials_v2").delete().eq("id", t.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("Testimoni dihapus");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="Testimoni member/orang tua yang tampil di landing">Testimoni</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((t) => (
          <div key={t.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line p-3">
            <div className="flex items-start gap-2">
              <div className="w-10 h-10 rounded-full bg-ocean-100 overflow-hidden shrink-0 flex items-center justify-center text-ocean-700 font-bold text-sm">
                {t.avatar_url ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" /> : t.name.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{t.name || "Tanpa nama"}</div>
                {t.role && <div className="text-xs text-ink-mute truncate">{t.role}</div>}
                <StarDisplay stars={t.rating} size="sm" />
              </div>
              <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(t)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
            <div className="text-xs text-ink-mute line-clamp-2 mt-2">{t.body_text}</div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">Belum ada testimoni.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Testimoni" : "Tambah Testimoni"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim() || !form.body_text.trim()}>{saving || uploading ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <ImageField label="Foto (opsional)" url={form.avatar_url} onUrlChange={(url) => setForm({ ...form, avatar_url: url })} onFileChange={setAvatarFile} square />
          <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ibu Sarah" /></Field>
          <Field label="Peran (opsional)"><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Ibu dari Kayla, 7 tahun" /></Field>
          <Field label="Rating">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                  <Icon name="star" className={`w-6 h-6 ${n <= form.rating ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={n <= form.rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Isi testimoni"><Textarea rows={4} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} placeholder="Anak saya jadi lebih percaya diri di air setelah 2 bulan les di sini." /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}
