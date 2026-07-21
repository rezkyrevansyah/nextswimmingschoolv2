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
import { useLocale } from "@/components/providers/LocaleProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartnerItem { id: string; sort_order: number; name: string; logo_url: string | null; website_url: string | null; }
interface ProgramItem { id: string; sort_order: number; name: string; description: string | null; class_type: string; photo_url: string | null; }
interface CoachItem { id: string; sort_order: number; name: string; photo_url: string | null; }
interface WhyNextItem { id: string; sort_order: number; icon: string; title: string; description: string | null; }
interface TestimonialItem { id: string; sort_order: number; name: string; role: string | null; body_text: string; avatar_url: string | null; rating: number; }
interface LinkedBranchPreview { name: string | null; city: string | null; address: string | null; phone: string | null; logo_url: string | null; }
interface BranchEntryItem {
  id: string; sort_order: number; branch_id: string | null;
  name: string | null; address: string | null; city: string | null; phone: string | null; photo_url: string | null;
  lat: number | null; lng: number | null;
  linked: LinkedBranchPreview | null;
}
interface CoreBranchOption { id: string; name: string; city: string | null; }
interface FaqItem { id: string; sort_order: number; question: string; answer: string; }

type Tab = "programs" | "coaches" | "whynext" | "testimonials" | "partners" | "branches" | "faq" | "footer";

const WHY_NEXT_ICONS = ["shield", "star", "check", "users", "target", "book", "swim", "clipboard", "sparkle"];

function buildTabs(t: (key: string) => string): { id: Tab; label: string; icon: string }[] {
  return [
    { id: "programs",     label: t("owner.landingCms.tabPrograms"),     icon: "book"   },
    { id: "coaches",      label: t("owner.landingCms.tabCoaches"),      icon: "swim"   },
    { id: "whynext",      label: t("owner.landingCms.tabWhyNext"),      icon: "shield" },
    { id: "testimonials", label: t("owner.landingCms.tabTestimonials"), icon: "users"  },
    { id: "partners",     label: t("owner.landingCms.tabPartners"),     icon: "link"   },
    { id: "branches",     label: t("owner.landingCms.tabBranches"),     icon: "pin"    },
    { id: "faq",          label: t("owner.landingCms.tabFaq"),          icon: "info"   },
    { id: "footer",       label: t("owner.landingCms.tabFooter"),       icon: "grid"   },
  ];
}

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
  hint,
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
  const { t } = useLocale();
  const [mode, setMode] = useState<"url" | "upload">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);

  return (
    <Field label={label} hint={square ? t("owner.landingCms.imageFieldSquareHint") : (hint ?? t("owner.landingCms.imageFieldDefaultHint"))}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("upload"); onFileChange(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "upload" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
          >
            {t("owner.landingCms.uploadFile")}
          </button>
          <button
            type="button"
            onClick={() => { setMode("url"); onFileChange(null); setPreview(null); setFileName(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "url" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
          >
            {t("owner.landingCms.useUrl")}
          </button>
        </div>

        {mode === "upload" ? (
          <>
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line hover:border-ocean-400 bg-paper-tint hover:bg-ocean-50/30 transition-colors py-6 px-3">
              <Icon name="camera" className="w-6 h-6 text-ink-mute" />
              <span className="text-xs text-ink-mute font-medium">{processing ? t("owner.landingCms.processingImage") : (fileName || t("owner.landingCms.clickToChooseImage"))}</span>
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
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("programs");
  const tabs = buildTabs(t);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === tb.id
                ? "bg-ocean-700 text-white shadow-card"
                : "bg-paper-tint text-ink-soft hover:bg-paper-deep hover:text-ink"
            }`}
          >
            <Icon name={tb.icon} className="w-4 h-4" />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "programs"     && <ProgramsTab />}
      {tab === "coaches"      && <CoachesTab />}
      {tab === "whynext"      && <WhyNextTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "partners"     && <PartnersTab />}
      {tab === "branches"     && <BranchesTab />}
      {tab === "faq"          && <FaqTab />}
      {tab === "footer"       && <FooterTab />}
    </div>
  );
}

// ── Partners Tab ─────────────────────────────────────────────────────────────
function PartnersTab() {
  const { t } = useLocale();
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
        if (error || !inserted) throw new Error(error?.message ?? t("owner.landingCms.saveFailedGeneric"));
        if (logoFile) await upload.landingImage(logoFile, "partner", inserted.id);
      }
    } catch (e) {
      toast.error(t("owner.landingCms.partners.saveFailed"), (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success(t("owner.landingCms.partners.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (p: PartnerItem) => {
    const yes = await confirm({ title: t("owner.landingCms.partners.deleteConfirmTitle"), body: p.name || t("owner.landingCms.partners.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_partners").delete().eq("id", p.id);
    if (error) return toast.error(t("owner.landingCms.partners.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.partners.deleted"));
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.partners.sectionSub")}>{t("owner.landingCms.partners.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-20 bg-white flex items-center justify-center p-3">
              {p.logo_url ? <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" /> : <Icon name="link" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{p.name || t("owner.landingCms.noName")}</div>
                {p.website_url && <div className="text-xs text-ocean-600 truncate">{p.website_url}</div>}
              </div>
              <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(p)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{t("owner.landingCms.partners.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.partners.editModalTitle") : t("owner.landingCms.partners.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={t("owner.landingCms.partners.fieldLogo")} url={form.logo_url} onUrlChange={(url) => setForm({ ...form, logo_url: url })} onFileChange={setLogoFile} square />
          <Field label={t("owner.landingCms.partners.fieldName")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("owner.landingCms.partners.fieldNamePlaceholder")} /></Field>
          <Field label={t("owner.landingCms.partners.fieldWebsite")}><Input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." /></Field>
          <Field label={t("owner.landingCms.partners.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── Programs Tab ─────────────────────────────────────────────────────────────

function ProgramsTab() {
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
                <div className="text-sm font-bold text-ink truncate mt-1">{p.name || t("owner.landingCms.noName")}</div>
                {p.description && <div className="text-xs text-ink-mute line-clamp-2">{p.description}</div>}
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

// ── Coaches Tab ──────────────────────────────────────────────────────────────

function CoachesTab() {
  const { t } = useLocale();
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
        if (error || !inserted) throw new Error(error?.message ?? t("owner.landingCms.saveFailedGeneric"));
        if (photoFile) await upload.landingImage(photoFile, "coach", inserted.id);
      }
    } catch (e) {
      toast.error(t("owner.landingCms.coaches.saveFailed"), (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success(t("owner.landingCms.coaches.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (c: CoachItem) => {
    const yes = await confirm({ title: t("owner.landingCms.coaches.deleteConfirmTitle"), body: c.name || t("owner.landingCms.coaches.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_coaches").delete().eq("id", c.id);
    if (error) return toast.error(t("owner.landingCms.coaches.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.coaches.deleted"));
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.coaches.sectionSub")}>{t("owner.landingCms.coaches.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line">
            <div className="h-28 bg-white flex items-center justify-center">
              {c.photo_url ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" /> : <Icon name="user" className="w-8 h-8 text-ocean-300" />}
            </div>
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{c.name || t("owner.landingCms.noName")}</div>
              </div>
              <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(c)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{t("owner.landingCms.coaches.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.coaches.editModalTitle") : t("owner.landingCms.coaches.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || uploading || !form.name.trim()}>{saving || uploading ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <ImageField label={t("owner.landingCms.coaches.fieldPhoto")} url={form.photo_url} onUrlChange={(url) => setForm({ ...form, photo_url: url })} onFileChange={setPhotoFile} square />
          <Field label={t("owner.landingCms.coaches.fieldName")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("owner.landingCms.coaches.fieldNamePlaceholder")} /></Field>
          <Field label={t("owner.landingCms.coaches.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── Why Next Tab ─────────────────────────────────────────────────────────────

function WhyNextTab() {
  const { t } = useLocale();
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
      toast.error(t("owner.landingCms.whyNext.saveFailed"), (e as Error).message);
      setSaving(false);
      return;
    }
    await revalidate();
    toast.success(t("owner.landingCms.whyNext.saved"));
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (w: WhyNextItem) => {
    const yes = await confirm({ title: t("owner.landingCms.whyNext.deleteConfirmTitle"), body: w.title || t("owner.landingCms.whyNext.deleteConfirmBody"), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_why_next").delete().eq("id", w.id);
    if (error) return toast.error(t("owner.landingCms.whyNext.deleteFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.whyNext.deleted"));
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.whyNext.sectionSub")}>{t("owner.landingCms.whyNext.sectionTitle")}</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>{t("owner.landingCms.add")}</Btn>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((w) => (
          <div key={w.id} className="rounded-xl bg-paper-tint overflow-hidden border border-line p-4">
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-xl bg-ocean-50 flex items-center justify-center shrink-0">
                <Icon name={w.icon} className="w-4.5 h-4.5 text-ocean-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{w.title || t("owner.landingCms.whyNext.noTitle")}</div>
                {w.description && <div className="text-xs text-ink-mute line-clamp-2 mt-0.5">{w.description}</div>}
              </div>
              <button onClick={() => openEdit(w)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(w)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-8 text-center text-ink-mute text-sm sm:col-span-2 lg:col-span-3">{t("owner.landingCms.whyNext.empty")}</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("owner.landingCms.whyNext.editModalTitle") : t("owner.landingCms.whyNext.addModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <Field label={t("owner.landingCms.whyNext.fieldIcon")}>
            <Select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {WHY_NEXT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </Select>
          </Field>
          <Field label={t("owner.landingCms.whyNext.fieldTitle")}><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("owner.landingCms.whyNext.fieldTitlePlaceholder")} /></Field>
          <Field label={t("owner.landingCms.whyNext.fieldDescription")}><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("owner.landingCms.whyNext.fieldDescriptionPlaceholder")} /></Field>
          <Field label={t("owner.landingCms.whyNext.fieldOrder")}><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── Testimonials Tab ──────────────────────────────────────────────────────────

function TestimonialsTab() {
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
                {item.avatar_url ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" /> : item.name.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{item.name || t("owner.landingCms.noName")}</div>
                {item.role && <div className="text-xs text-ink-mute truncate">{item.role}</div>}
                <StarDisplay stars={item.rating} size="sm" />
              </div>
              <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
              <button onClick={() => del(item)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
            </div>
            <div className="text-xs text-ink-mute line-clamp-2 mt-2">{item.body_text}</div>
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

// ── FAQ Tab ──────────────────────────────────────────────────────────────────

function FaqTab() {
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
              <div className="text-sm font-bold text-ink">{item.question || t("owner.landingCms.noName")}</div>
              <div className="text-xs text-ink-mute line-clamp-2 mt-0.5">{item.answer}</div>
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

// ── Footer Tab ───────────────────────────────────────────────────────────────
// Singleton form (landing_config, id=1) — no list, no modal, no delete.

function FooterTab() {
  const { t } = useLocale();
  const toast = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    footer_tagline: "", footer_address: "", footer_wa_number: "", contact_email: "",
    copyright_text: "", social_instagram: "", social_tiktok: "", social_youtube: "",
    floating_wa_message: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("landing_config").select("footer_tagline, footer_address, footer_wa_number, contact_email, copyright_text, social_instagram, social_tiktok, social_youtube, floating_wa_message").eq("id", 1).single();
    if (data) {
      setForm({
        footer_tagline: data.footer_tagline ?? "",
        footer_address: data.footer_address ?? "",
        footer_wa_number: data.footer_wa_number ?? "",
        contact_email: data.contact_email ?? "",
        copyright_text: data.copyright_text ?? "",
        social_instagram: data.social_instagram ?? "",
        social_tiktok: data.social_tiktok ?? "",
        social_youtube: data.social_youtube ?? "",
        floating_wa_message: data.floating_wa_message ?? "",
      });
    }
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_config").update({
      footer_tagline: form.footer_tagline.trim(),
      footer_address: form.footer_address.trim() || null,
      footer_wa_number: form.footer_wa_number.trim(),
      contact_email: form.contact_email.trim() || null,
      copyright_text: form.copyright_text.trim() || null,
      social_instagram: form.social_instagram.trim() || null,
      social_tiktok: form.social_tiktok.trim() || null,
      social_youtube: form.social_youtube.trim() || null,
      floating_wa_message: form.floating_wa_message.trim(),
    }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(t("owner.landingCms.footer.saveFailed"), error.message);
    await revalidate();
    toast.success(t("owner.landingCms.footer.saved"));
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={t("owner.landingCms.footer.sectionSub")}>{t("owner.landingCms.footer.sectionTitle")}</SectionTitle>
        <Btn variant="primary" size="sm" onClick={save} disabled={loading || saving}>{saving ? t("common.actions.saving") : t("common.actions.save")}</Btn>
      </div>
      {loading ? (
        <div className="py-10 text-center text-ink-mute text-sm">{t("owner.landingCms.loading")}</div>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label={t("owner.landingCms.footer.fieldTagline")}><Textarea rows={2} value={form.footer_tagline} onChange={(e) => setForm({ ...form, footer_tagline: e.target.value })} placeholder={t("owner.landingCms.footer.fieldTaglinePlaceholder")} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("owner.landingCms.footer.fieldAddress")}><Input value={form.footer_address} onChange={(e) => setForm({ ...form, footer_address: e.target.value })} placeholder={t("owner.landingCms.footer.fieldAddressPlaceholder")} /></Field>
          </div>
          <Field label={t("owner.landingCms.footer.fieldWaNumber")}><Input type="tel" value={form.footer_wa_number} onChange={(e) => setForm({ ...form, footer_wa_number: e.target.value })} className="font-mono" /></Field>
          <Field label={t("owner.landingCms.footer.fieldContactEmail")}><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label={t("owner.landingCms.footer.fieldCopyright")}><Input value={form.copyright_text} onChange={(e) => setForm({ ...form, copyright_text: e.target.value })} placeholder={t("owner.landingCms.footer.fieldCopyrightPlaceholder")} /></Field>
          </div>
          <Field label={t("owner.landingCms.footer.fieldInstagram")}><Input type="url" value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} placeholder="https://instagram.com/..." /></Field>
          <Field label={t("owner.landingCms.footer.fieldTiktok")}><Input type="url" value={form.social_tiktok} onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })} placeholder="https://tiktok.com/@..." /></Field>
          <Field label={t("owner.landingCms.footer.fieldYoutube")}><Input type="url" value={form.social_youtube} onChange={(e) => setForm({ ...form, social_youtube: e.target.value })} placeholder="https://youtube.com/@..." /></Field>
          <div className="sm:col-span-2 pt-3 border-t border-line">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{t("owner.landingCms.footer.floatingWaSectionTitle")}</div>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("owner.landingCms.footer.fieldFloatingWaMessage")} hint={t("owner.landingCms.footer.fieldFloatingWaMessageHint")}>
              <Textarea rows={2} value={form.floating_wa_message} onChange={(e) => setForm({ ...form, floating_wa_message: e.target.value })} placeholder={t("owner.landingCms.footer.fieldFloatingWaMessagePlaceholder")} />
            </Field>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Branches Tab ─────────────────────────────────────────────────────────────
// Dual-mode: "linked" references an existing core branch (live-joined via the
// public_branches view), "standalone" stores its own minimal display fields.

function BranchesTab() {
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
                  <div className="text-sm font-bold text-ink truncate mt-1">{display.name || t("owner.landingCms.noName")}</div>
                  {display.city && <div className="text-xs text-ink-mute">{display.city}</div>}
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
                  {coreBranches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ""}</option>)}
                </Select>
              </Field>
              <div className="rounded-xl bg-paper-tint border border-line p-3 text-sm text-ink-mute">
                {selectedCoreBranch ? `${selectedCoreBranch.name}${selectedCoreBranch.city ? ` — ${selectedCoreBranch.city}` : ""}` : t("owner.landingCms.branches.linkedPreviewEmpty")}
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
