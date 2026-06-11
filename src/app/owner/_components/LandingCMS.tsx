"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import { Field, Input, Textarea, Switch } from "@/components/ui/FormFields";
import { useUpload } from "@/hooks/useUpload";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HeroData {
  headline: string; body_text: string; badge_text: string; bg_image_url: string;
  cta_primary_text: string; cta_primary_wa: string; cta_secondary_text: string;
  feature_1_icon: string; feature_1_text: string;
  feature_2_icon: string; feature_2_text: string;
  feature_3_icon: string; feature_3_text: string;
  feature_4_icon: string; feature_4_text: string;
}
interface HeroStat { id: string; sort_order: number; value: string; suffix: string; label: string; sub: string; icon: string; }
interface WhyUsData {
  section_label: string; headline: string; body_text: string; wa_button_text: string; wa_message: string;
  featured_icon: string; featured_title: string; featured_desc: string;
  featured_stat1_label: string; featured_stat1_value: string;
  featured_stat2_label: string; featured_stat2_value: string;
}
interface WhyUsCard { id: string; sort_order: number; icon: string; title: string; description: string; }
interface CoachRow { id: string; full_name: string; nick_name: string | null; specialization: string | null; avatar_url: string | null; show_on_landing: boolean; }
interface Testimonial { id: string; sort_order: number; name: string; role: string; body_text: string; avatar_url: string | null; }
interface FaqItem { id: string; question: string; answer: string; sort_order: number; }
interface FinalCtaData { headline: string; body_text: string; cta_wa_text: string; cta_wa_message: string; cta_sec_text: string; }
interface LandingConfigData { footer_wa_number: string; footer_tagline: string; floating_wa_message: string; nav_cta_text: string; nav_cta_message: string; }
interface NavLink { id: string; sort_order: number; label: string; href: string; }

type Tab = "hero" | "whyus" | "programs" | "coaches" | "testimonials" | "faq" | "finalcta" | "config";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "hero",         label: "Hero",         icon: "star"     },
  { id: "whyus",        label: "Mengapa Kami", icon: "shield"   },
  { id: "programs",     label: "Program",      icon: "book"     },
  { id: "coaches",      label: "Coach",        icon: "swim"     },
  { id: "testimonials", label: "Testimoni",    icon: "users"    },
  { id: "faq",          label: "FAQ",          icon: "calendar" },
  { id: "finalcta",     label: "Final CTA",    icon: "arrow"    },
  { id: "config",       label: "Konfigurasi",  icon: "settings" },
];

const ICON_OPTIONS = ["shield", "chart", "qr", "calendar", "target", "star", "map", "users", "book", "check", "swim", "pin", "bell", "grid", "invoice"];

// ── Icon picker ───────────────────────────────────────────────────────────────
function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-white text-sm hover:bg-paper-tint text-left"
      >
        <span className="w-5 h-5 flex items-center justify-center text-ocean-700 shrink-0">
          <Icon name={value} className="w-4 h-4" />
        </span>
        <span className="flex-1 text-ink">{value}</span>
        <Icon name="arrow" className={`w-3.5 h-3.5 text-ink-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-line rounded-xl shadow-lift overflow-hidden">
          <div className="overflow-y-auto max-h-48 p-1">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  opt === value
                    ? "bg-ocean-50 text-ocean-700 font-semibold"
                    : "hover:bg-paper-tint text-ink"
                }`}
              >
                <span className="w-7 h-7 rounded-lg bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0">
                  <Icon name={opt} className="w-4 h-4" />
                </span>
                {opt}
                {opt === value && (
                  <Icon name="check" className="w-3.5 h-3.5 ml-auto text-ocean-600" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Revalidate helper ─────────────────────────────────────────────────────────
async function revalidate() {
  const res = await fetch("/api/owner/revalidate", { method: "POST" });
  if (!res.ok) console.error("[revalidate] failed", res.status, await res.text().catch(() => ""));
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingCMS() {
  const [tab, setTab] = useState<Tab>("hero");

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

      {tab === "hero"         && <HeroTab />}
      {tab === "whyus"        && <WhyUsTab />}
      {tab === "programs"     && <ProgramsTab />}
      {tab === "coaches"      && <CoachesTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "faq"          && <FAQTab />}
      {tab === "finalcta"     && <FinalCtaTab />}
      {tab === "config"       && <ConfigTab />}
    </div>
  );
}

// ── Programs Tab ─────────────────────────────────────────────────────────────
interface ProgramClass { id: string; name: string; class_type: string | null; photo_url: string | null; show_on_landing: boolean; }

function ProgramsTab() {
  const toast = useToast();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [classes, setClasses] = useState<ProgramClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ProgramClass | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [photoMode, setPhotoMode] = useState<"url" | "upload">("url");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, class_type, photo_url, show_on_landing")
      .eq("status", "active")
      .order("name");
    setClasses((data ?? []) as ProgramClass[]);
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = async (c: ProgramClass) => {
    const next = !c.show_on_landing;
    const { error } = await supabase.from("classes").update({ show_on_landing: next }).eq("id", c.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    await revalidate();
    setClasses((prev) => prev.map((p) => p.id === c.id ? { ...p, show_on_landing: next } : p));
    toast.success(next ? "Program ditampilkan di landing" : "Program disembunyikan dari landing");
  };

  const openEdit = (c: ProgramClass) => {
    setEditTarget(c);
    setPhotoMode("url");
    setPhotoUrl(c.photo_url ?? "");
    setPhotoPreview(null);
    setShowModal(true);
  };

  const savePhoto = async () => {
    if (!editTarget) return;
    setSaving(true);
    let finalUrl = photoUrl.trim() || null;

    if (photoMode === "upload" && photoPreview) {
      // photoPreview means a file was picked — get the file from the input via ref is tricky
      // We stored the file in photoFileRef
      if (pendingFile) {
        try {
          finalUrl = await upload.classPhoto(pendingFile, editTarget.id);
        } catch (e) {
          toast.error("Gagal upload foto", (e as Error).message);
          setSaving(false);
          return;
        }
      }
    }

    const { error } = await supabase.from("classes").update({ photo_url: finalUrl }).eq("id", editTarget.id);
    if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    await revalidate();
    toast.success("Foto kelas disimpan");
    setSaving(false);
    setShowModal(false);
    setClasses((prev) => prev.map((p) => p.id === editTarget.id ? { ...p, photo_url: finalUrl } : p));
  };

  // Store pending file in state (simpler than ref for client component)
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const shown = classes.filter(c => c.show_on_landing).length;

  return (
    <Card>
      <SectionTitle sub={`${shown} ditampilkan di landing page · section Swimming Programs`}>Program Kelas Landing</SectionTitle>
      <p className="text-xs text-ink-mute mt-1 mb-4">Toggle untuk memilih kelas yang muncul di section Program. Klik ikon edit untuk mengatur foto kartu kelas.</p>

      {loading ? (
        <div className="py-8 text-center text-ink-mute text-sm">Memuat data kelas...</div>
      ) : classes.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">Belum ada kelas aktif.</div>
      ) : (
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-paper-tint">
              {/* Foto preview kecil */}
              <div className="w-12 h-9 rounded-lg bg-ocean-50 border border-line overflow-hidden shrink-0 flex items-center justify-center">
                {c.photo_url ? (
                  <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="swim" className="w-5 h-5 text-ocean-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{c.name}</div>
                <div className="text-xs text-ink-mute">{c.class_type === "private" ? "Privat" : "Reguler"}</div>
              </div>
              <div className="flex items-center gap-2">
                {c.show_on_landing && (
                  <span className="text-[10px] font-bold bg-ok-50 text-ok-600 px-2 py-0.5 rounded-full">Ditampilkan</span>
                )}
                <button
                  onClick={() => openEdit(c)}
                  className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep"
                >
                  <Icon name="camera" className="w-3.5 h-3.5 text-ink-mute" />
                </button>
                <Switch checked={c.show_on_landing} onChange={() => toggle(c)} label="" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Foto — ${editTarget?.name ?? ""}`}
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn>
            <Btn variant="primary" onClick={savePhoto} disabled={saving || (photoMode === "upload" && uploading)}>
              {saving || uploading ? "Menyimpan..." : "Simpan Foto"}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {/* Mode switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setPhotoMode("url"); setPendingFile(null); setPhotoPreview(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${photoMode === "url" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
            >
              Pakai URL
            </button>
            <button
              type="button"
              onClick={() => setPhotoMode("upload")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${photoMode === "upload" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
            >
              Upload File
            </button>
          </div>

          {photoMode === "url" ? (
            <Field label="URL foto">
              <Input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
              {photoUrl && (
                <img src={photoUrl} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-line" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </Field>
          ) : (
            <Field label="Pilih file foto">
              <label className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line hover:border-ocean-400 bg-paper-tint hover:bg-ocean-50/30 transition-colors py-6 px-3">
                <Icon name="camera" className="w-6 h-6 text-ink-mute" />
                <span className="text-xs text-ink-mute font-medium">{uploading ? "Mengunggah..." : pendingFile ? pendingFile.name : "Klik untuk pilih gambar"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPendingFile(f);
                    setPhotoPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </label>
              {photoPreview && (
                <img src={photoPreview} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-line" />
              )}
            </Field>
          )}
        </div>
      </Modal>
    </Card>
  );
}

// ── Hero Tab ─────────────────────────────────────────────────────────────────
function HeroTab() {
  const toast = useToast();
  const supabase = createClient();
  const [data, setData] = useState<HeroData | null>(null);
  const [stats, setStats] = useState<HeroStat[]>([]);
  const [saving, setSaving] = useState(false);
  const [editStat, setEditStat] = useState<HeroStat | null>(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [statForm, setStatForm] = useState({ value: "", suffix: "", label: "", sub: "", icon: "star", sort_order: 0 });

  const load = useCallback(async () => {
    const [{ data: h }, { data: s }] = await Promise.all([
      supabase.from("landing_hero").select("*").single(),
      supabase.from("landing_hero_stats").select("*").order("sort_order"),
    ]);
    if (h) setData(h as HeroData);
    if (s) setStats(s as HeroStat[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveHero = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("landing_hero").upsert({ id: 1, ...data });
    if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    await revalidate();
    toast.success("Hero disimpan");
    setSaving(false);
  };

  const openEditStat = (s: HeroStat) => { setEditStat(s); setStatForm({ value: s.value, suffix: s.suffix, label: s.label, sub: s.sub, icon: s.icon, sort_order: s.sort_order }); setShowStatModal(true); };
  const openAddStat = () => { setEditStat(null); setStatForm({ value: "", suffix: "+", label: "", sub: "", icon: "star", sort_order: stats.length + 1 }); setShowStatModal(true); };

  const saveStat = async () => {
    if (!statForm.label) return toast.error("Label wajib diisi");
    setSaving(true);
    if (editStat) {
      const { error } = await supabase.from("landing_hero_stats").update(statForm).eq("id", editStat.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("landing_hero_stats").insert(statForm);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    }
    await revalidate();
    toast.success("Stat disimpan");
    setSaving(false);
    setShowStatModal(false);
    load();
  };

  if (!data) return <div className="py-10 text-center text-ink-mute text-sm">Memuat data hero...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle sub="Bagian paling atas landing page">Konten Hero</SectionTitle>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Field label="Headline (enter untuk baris baru)">
            <Textarea value={data.headline} onChange={(e) => setData({ ...data, headline: e.target.value })} rows={3} />
          </Field>
          <Field label="Body text">
            <Textarea value={data.body_text} onChange={(e) => setData({ ...data, body_text: e.target.value })} rows={3} />
          </Field>
          <Field label="Badge text (teks kecil di atas headline)">
            <Input value={data.badge_text} onChange={(e) => setData({ ...data, badge_text: e.target.value })} />
          </Field>
          <Field label="URL background image">
            <Input value={data.bg_image_url} onChange={(e) => setData({ ...data, bg_image_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Teks tombol CTA utama (WhatsApp)">
            <Input value={data.cta_primary_text} onChange={(e) => setData({ ...data, cta_primary_text: e.target.value })} />
          </Field>
          <Field label="Pesan WA tombol CTA utama">
            <Textarea value={data.cta_primary_wa} onChange={(e) => setData({ ...data, cta_primary_wa: e.target.value })} rows={2} />
          </Field>
          <Field label="Teks tombol sekunder (Daftar Online)">
            <Input value={data.cta_secondary_text} onChange={(e) => setData({ ...data, cta_secondary_text: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {([1,2,3,4] as const).map((n) => {
            const iconKey = `feature_${n}_icon` as keyof HeroData;
            const textKey = `feature_${n}_text` as keyof HeroData;
            return (
              <div key={n} className="bg-paper-tint rounded-xl p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Fitur {n}</div>
                <Field label="Icon">
                  <IconSelect value={data[iconKey]} onChange={(v) => setData({ ...data, [iconKey]: v })} />
                </Field>
                <Field label="Teks">
                  <Input value={data[textKey]} onChange={(e) => setData({ ...data, [textKey]: e.target.value })} />
                </Field>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <Btn variant="primary" onClick={saveHero} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Hero"}</Btn>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle sub="4 kartu statistik di bawah hero">Stat Cards</SectionTitle>
          <Btn variant="soft" size="sm" icon="plus" onClick={openAddStat}>Tambah</Btn>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.id} className="bg-paper-tint rounded-xl p-3 relative">
              <button onClick={() => openEditStat(s)} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center hover:bg-paper-deep">
                <Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" />
              </button>
              <div className="font-display font-bold text-2xl text-ocean-700">{s.value}{s.suffix}</div>
              <div className="text-sm font-semibold text-ink">{s.label}</div>
              <div className="text-xs text-ink-mute">{s.sub}</div>
              <div className="text-[10px] text-ink-faint mt-1">icon: {s.icon} · urutan: {s.sort_order}</div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={showStatModal} onClose={() => setShowStatModal(false)} title={editStat ? "Edit Stat Card" : "Tambah Stat Card"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowStatModal(false)}>Batal</Btn><Btn variant="primary" onClick={saveStat} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nilai (angka)"><Input value={statForm.value} onChange={(e) => setStatForm({ ...statForm, value: e.target.value })} placeholder="500" /></Field>
            <Field label="Suffix (+ atau kosong)"><Input value={statForm.suffix} onChange={(e) => setStatForm({ ...statForm, suffix: e.target.value })} placeholder="+" /></Field>
          </div>
          <Field label="Label"><Input value={statForm.label} onChange={(e) => setStatForm({ ...statForm, label: e.target.value })} placeholder="Member terdaftar" /></Field>
          <Field label="Sub (teks kecil)"><Input value={statForm.sub} onChange={(e) => setStatForm({ ...statForm, sub: e.target.value })} placeholder="Anak hingga dewasa" /></Field>
          <Field label="Icon">
            <IconSelect value={statForm.icon} onChange={(v) => setStatForm({ ...statForm, icon: v })} />
          </Field>
          <Field label="Urutan"><Input type="number" value={String(statForm.sort_order)} onChange={(e) => setStatForm({ ...statForm, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ── WhyUs Tab ─────────────────────────────────────────────────────────────────
function WhyUsTab() {
  const toast = useToast();
  const supabase = createClient();
  const [data, setData] = useState<WhyUsData | null>(null);
  const [cards, setCards] = useState<WhyUsCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [editCard, setEditCard] = useState<WhyUsCard | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardForm, setCardForm] = useState({ icon: "chart", title: "", description: "", sort_order: 0 });

  const load = useCallback(async () => {
    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from("landing_whyus").select("*").single(),
      supabase.from("landing_whyus_cards").select("*").order("sort_order"),
    ]);
    if (w) setData(w as WhyUsData);
    if (c) setCards(c as WhyUsCard[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveSection = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("landing_whyus").upsert({ id: 1, ...data });
    if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    await revalidate();
    toast.success("Konten disimpan");
    setSaving(false);
  };

  const openEditCard = (c: WhyUsCard) => { setEditCard(c); setCardForm({ icon: c.icon, title: c.title, description: c.description, sort_order: c.sort_order }); setShowCardModal(true); };
  const openAddCard = () => { setEditCard(null); setCardForm({ icon: "chart", title: "", description: "", sort_order: cards.length + 1 }); setShowCardModal(true); };

  const saveCard = async () => {
    if (!cardForm.title) return toast.error("Judul wajib diisi");
    setSaving(true);
    if (editCard) {
      const { error } = await supabase.from("landing_whyus_cards").update(cardForm).eq("id", editCard.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("landing_whyus_cards").insert(cardForm);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    }
    await revalidate();
    toast.success("Kartu disimpan");
    setSaving(false);
    setShowCardModal(false);
    load();
  };

  if (!data) return <div className="py-10 text-center text-ink-mute text-sm">Memuat data...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle sub="Teks & kartu featured">Konten Mengapa Kami</SectionTitle>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Field label="Label section"><Input value={data.section_label} onChange={(e) => setData({ ...data, section_label: e.target.value })} /></Field>
          <Field label="Headline"><Textarea value={data.headline} onChange={(e) => setData({ ...data, headline: e.target.value })} rows={2} /></Field>
          <Field label="Body text"><Textarea value={data.body_text} onChange={(e) => setData({ ...data, body_text: e.target.value })} rows={2} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teks tombol WA"><Input value={data.wa_button_text} onChange={(e) => setData({ ...data, wa_button_text: e.target.value })} /></Field>
            <Field label="Pesan WA"><Textarea value={data.wa_message} onChange={(e) => setData({ ...data, wa_message: e.target.value })} rows={2} /></Field>
          </div>
        </div>
        <div className="mt-4 bg-ocean-700/5 border border-ocean-200 rounded-xl p-4">
          <div className="text-xs font-bold text-ocean-700 uppercase tracking-widest mb-3">Kartu Featured (Biru Gelap)</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Icon">
              <IconSelect value={data.featured_icon} onChange={(v) => setData({ ...data, featured_icon: v })} />
            </Field>
            <Field label="Judul"><Input value={data.featured_title} onChange={(e) => setData({ ...data, featured_title: e.target.value })} /></Field>
            <Field label="Deskripsi"><Textarea value={data.featured_desc} onChange={(e) => setData({ ...data, featured_desc: e.target.value })} rows={2} /></Field>
            <Field label="Stat 1 — Label"><Input value={data.featured_stat1_label} onChange={(e) => setData({ ...data, featured_stat1_label: e.target.value })} /></Field>
            <Field label="Stat 1 — Nilai"><Input value={data.featured_stat1_value} onChange={(e) => setData({ ...data, featured_stat1_value: e.target.value })} /></Field>
            <Field label="Stat 2 — Label"><Input value={data.featured_stat2_label} onChange={(e) => setData({ ...data, featured_stat2_label: e.target.value })} /></Field>
            <Field label="Stat 2 — Nilai"><Input value={data.featured_stat2_value} onChange={(e) => setData({ ...data, featured_stat2_value: e.target.value })} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Btn variant="primary" onClick={saveSection} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle sub="4 kartu fitur reguler">Feature Cards</SectionTitle>
          <Btn variant="soft" size="sm" icon="plus" onClick={openAddCard}>Tambah</Btn>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <div key={c.id} className="flex items-start gap-3 bg-paper-tint rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0">
                <Icon name={c.icon} className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink">{c.title}</div>
                <div className="text-xs text-ink-mute mt-0.5 line-clamp-2">{c.description}</div>
              </div>
              <button onClick={() => openEditCard(c)} className="shrink-0 w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep">
                <Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={showCardModal} onClose={() => setShowCardModal(false)} title={editCard ? "Edit Feature Card" : "Tambah Feature Card"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowCardModal(false)}>Batal</Btn><Btn variant="primary" onClick={saveCard} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <Field label="Icon">
            <IconSelect value={cardForm.icon} onChange={(v) => setCardForm({ ...cardForm, icon: v })} />
          </Field>
          <Field label="Judul"><Input value={cardForm.title} onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })} /></Field>
          <Field label="Deskripsi"><Textarea value={cardForm.description} onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })} rows={3} /></Field>
          <Field label="Urutan"><Input type="number" value={String(cardForm.sort_order)} onChange={(e) => setCardForm({ ...cardForm, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ── Coaches Tab ───────────────────────────────────────────────────────────────
function CoachesTab() {
  const toast = useToast();
  const supabase = createClient();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, nick_name, specialization, avatar_url, show_on_landing")
      .eq("role", "coach")
      .eq("is_archived", false)
      .order("full_name");
    setCoaches((data ?? []) as CoachRow[]);
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = async (c: CoachRow) => {
    const next = !c.show_on_landing;
    const { error } = await supabase.from("profiles").update({ show_on_landing: next }).eq("id", c.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    await revalidate();
    setCoaches((prev) => prev.map((p) => p.id === c.id ? { ...p, show_on_landing: next } : p));
    toast.success(next ? "Coach ditampilkan di landing" : "Coach disembunyikan dari landing");
  };

  const shown = coaches.filter(c => c.show_on_landing).length;

  return (
    <Card>
      <SectionTitle sub={`${shown} ditampilkan · maks 4 yang ditampilkan di landing`}>Coach Showcase Landing</SectionTitle>
      <p className="text-xs text-ink-mute mt-1 mb-4">Toggle untuk memilih coach yang tampil di section Coach pada landing page. Pastikan profil coach memiliki foto (avatar_url) agar tampilannya baik.</p>
      {loading ? (
        <div className="py-8 text-center text-ink-mute text-sm">Memuat data coach...</div>
      ) : coaches.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">Belum ada coach terdaftar.</div>
      ) : (
        <div className="space-y-2">
          {coaches.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-paper-tint">
              <Avatar name={c.nick_name ?? c.full_name} src={c.avatar_url ?? undefined} size={38} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink">{c.nick_name ?? c.full_name}</div>
                <div className="text-xs text-ink-mute">{c.specialization ?? "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                {c.show_on_landing && (
                  <span className="text-[10px] font-bold bg-ok-50 text-ok-600 px-2 py-0.5 rounded-full">Ditampilkan</span>
                )}
                <Switch
                  checked={c.show_on_landing}
                  onChange={() => toggle(c)}
                  label=""
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Testimonials Tab ──────────────────────────────────────────────────────────
function TestimonialsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", body_text: "", avatar_url: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_testimonials").select("*").order("sort_order");
    setItems((data ?? []) as Testimonial[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setForm({ name: "", role: "", body_text: "", avatar_url: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (t: Testimonial) => { setEditItem(t); setForm({ name: t.name, role: t.role, body_text: t.body_text, avatar_url: t.avatar_url ?? "", sort_order: t.sort_order }); setShowModal(true); };

  const save = async () => {
    if (!form.name || !form.body_text) return toast.error("Nama dan testimoni wajib diisi");
    setSaving(true);
    const payload = { ...form, avatar_url: form.avatar_url || null };
    if (editItem) {
      const { error } = await supabase.from("landing_testimonials").update(payload).eq("id", editItem.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("landing_testimonials").insert(payload);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    }
    await revalidate();
    toast.success("Testimoni disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (t: Testimonial) => {
    const yes = await confirm({ title: `Hapus testimoni dari "${t.name}"?`, body: "Tindakan ini tidak bisa dibatalkan.", danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_testimonials").delete().eq("id", t.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("Testimoni dihapus");
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="3 testimoni ditampilkan (urut sort_order)">Testimoni</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-paper-tint">
            <Avatar name={t.name} src={t.avatar_url ?? undefined} size={38} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-ink">{t.name}</div>
              <div className="text-xs text-ink-mute">{t.role}</div>
              <p className="text-xs text-ink-soft mt-1 line-clamp-2">&ldquo;{t.body_text}&rdquo;</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep">
                <Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" />
              </button>
              <button onClick={() => del(t)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100">
                <Icon name="trash" className="w-3.5 h-3.5 text-danger-500" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-6 text-center text-ink-mute text-sm">Belum ada testimoni.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Testimoni" : "Tambah Testimoni"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Peran / Keterangan (contoh: Ibu dari Calista)"><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></Field>
          <Field label="Testimoni"><Textarea value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} rows={4} /></Field>
          <Field label="URL foto (opsional)"><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── FAQ Tab ───────────────────────────────────────────────────────────────────
function FAQTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", sort_order: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("landing_faqs").select("*").order("sort_order");
    setItems((data ?? []) as FaqItem[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdd = () => { setEditItem(null); setForm({ question: "", answer: "", sort_order: items.length + 1 }); setShowModal(true); };
  const openEdit = (f: FaqItem) => { setEditItem(f); setForm({ question: f.question, answer: f.answer, sort_order: f.sort_order }); setShowModal(true); };

  const save = async () => {
    if (!form.question || !form.answer) return toast.error("Pertanyaan dan jawaban wajib diisi");
    setSaving(true);
    if (editItem) {
      const { error } = await supabase.from("landing_faqs").update(form).eq("id", editItem.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("landing_faqs").insert(form);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    }
    await revalidate();
    toast.success("FAQ disimpan");
    setSaving(false);
    setShowModal(false);
    load();
  };

  const del = async (f: FaqItem) => {
    const yes = await confirm({ title: "Hapus FAQ ini?", body: `"${f.question}"`, danger: true });
    if (!yes) return;
    const { error } = await supabase.from("landing_faqs").delete().eq("id", f.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    await revalidate();
    toast.success("FAQ dihapus");
    load();
  };

  const move = async (f: FaqItem, dir: -1 | 1) => {
    const newOrder = f.sort_order + dir;
    const swap = items.find(i => i.sort_order === newOrder);
    if (!swap) return;
    await Promise.all([
      supabase.from("landing_faqs").update({ sort_order: newOrder }).eq("id", f.id),
      supabase.from("landing_faqs").update({ sort_order: f.sort_order }).eq("id", swap.id),
    ]);
    await revalidate();
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub="Pertanyaan & jawaban">FAQ</SectionTitle>
        <Btn variant="soft" size="sm" icon="plus" onClick={openAdd}>Tambah</Btn>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((f, i) => (
          <div key={f.id} className="flex items-start gap-3 p-3 rounded-xl bg-paper-tint">
            <div className="flex flex-col gap-1 mt-0.5">
              <button onClick={() => move(f, -1)} disabled={i === 0} className="w-6 h-6 rounded flex items-center justify-center bg-white border border-line hover:bg-paper-deep disabled:opacity-30">
                <Icon name="arrow" className="w-3 h-3 rotate-[-90deg]" />
              </button>
              <button onClick={() => move(f, 1)} disabled={i === items.length - 1} className="w-6 h-6 rounded flex items-center justify-center bg-white border border-line hover:bg-paper-deep disabled:opacity-30">
                <Icon name="arrow" className="w-3 h-3 rotate-90" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-ink">{f.question}</div>
              <p className="text-xs text-ink-mute mt-1 line-clamp-2">{f.answer}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(f)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep">
                <Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" />
              </button>
              <button onClick={() => del(f)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100">
                <Icon name="trash" className="w-3.5 h-3.5 text-danger-500" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-6 text-center text-ink-mute text-sm">Belum ada FAQ.</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit FAQ" : "Tambah FAQ"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowModal(false)}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <Field label="Pertanyaan"><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
          <Field label="Jawaban"><Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={5} /></Field>
          <Field label="Urutan"><Input type="number" value={String(form.sort_order)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

// ── FinalCTA Tab ──────────────────────────────────────────────────────────────
function FinalCtaTab() {
  const toast = useToast();
  const supabase = createClient();
  const [data, setData] = useState<FinalCtaData | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: d } = await supabase.from("landing_finalcta").select("*").single();
    if (d) setData(d as FinalCtaData);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("landing_finalcta").upsert({ id: 1, ...data });
    if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    await revalidate();
    toast.success("Final CTA disimpan");
    setSaving(false);
  };

  if (!data) return <div className="py-10 text-center text-ink-mute text-sm">Memuat data...</div>;

  return (
    <Card>
      <SectionTitle sub="Section penutup di bagian bawah landing">Final CTA</SectionTitle>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Field label="Headline"><Textarea value={data.headline} onChange={(e) => setData({ ...data, headline: e.target.value })} rows={3} /></Field>
        <Field label="Body text"><Textarea value={data.body_text} onChange={(e) => setData({ ...data, body_text: e.target.value })} rows={3} /></Field>
        <Field label="Teks tombol WhatsApp"><Input value={data.cta_wa_text} onChange={(e) => setData({ ...data, cta_wa_text: e.target.value })} /></Field>
        <Field label="Pesan WhatsApp"><Textarea value={data.cta_wa_message} onChange={(e) => setData({ ...data, cta_wa_message: e.target.value })} rows={2} /></Field>
        <Field label="Teks tombol sekunder (Lihat Program)"><Input value={data.cta_sec_text} onChange={(e) => setData({ ...data, cta_sec_text: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end">
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
      </div>
    </Card>
  );
}

// ── Config Tab ────────────────────────────────────────────────────────────────
function ConfigTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const [config, setConfig] = useState<LandingConfigData | null>(null);
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [editNav, setEditNav] = useState<NavLink | null>(null);
  const [navForm, setNavForm] = useState({ label: "", href: "", sort_order: 0 });

  const load = useCallback(async () => {
    const [{ data: c }, { data: n }] = await Promise.all([
      supabase.from("landing_config").select("*").single(),
      supabase.from("landing_nav_links").select("*").order("sort_order"),
    ]);
    if (c) setConfig(c as LandingConfigData);
    setNavLinks((n ?? []) as NavLink[]);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from("landing_config").upsert({ id: 1, ...config });
    if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    await revalidate();
    toast.success("Konfigurasi disimpan");
    setSaving(false);
  };

  const openAddNav = () => { setEditNav(null); setNavForm({ label: "", href: "#", sort_order: navLinks.length + 1 }); setShowNavModal(true); };
  const openEditNav = (n: NavLink) => { setEditNav(n); setNavForm({ label: n.label, href: n.href, sort_order: n.sort_order }); setShowNavModal(true); };

  const saveNav = async () => {
    if (!navForm.label) return toast.error("Label wajib diisi");
    setSaving(true);
    if (editNav) {
      const { error } = await supabase.from("landing_nav_links").update(navForm).eq("id", editNav.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("landing_nav_links").insert(navForm);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
    }
    await revalidate();
    toast.success("Nav link disimpan");
    setSaving(false);
    setShowNavModal(false);
    load();
  };

  const delNav = async (n: NavLink) => {
    const yes = await confirm({ title: `Hapus nav link "${n.label}"?`, body: "Link ini akan hilang dari navigasi.", danger: true });
    if (!yes) return;
    await supabase.from("landing_nav_links").delete().eq("id", n.id);
    await revalidate();
    toast.success("Nav link dihapus");
    load();
  };

  if (!config) return <div className="py-10 text-center text-ink-mute text-sm">Memuat data...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle sub="WhatsApp, tagline footer, dan teks nav">Konfigurasi Global</SectionTitle>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Field label="Nomor WA footer (format: 0821xxxxxxxx)">
            <Input value={config.footer_wa_number} onChange={(e) => setConfig({ ...config, footer_wa_number: e.target.value })} placeholder="082110009667" />
          </Field>
          <Field label="Tagline footer">
            <Textarea value={config.footer_tagline} onChange={(e) => setConfig({ ...config, footer_tagline: e.target.value })} rows={2} />
          </Field>
          <Field label="Pesan floating WhatsApp button">
            <Textarea value={config.floating_wa_message} onChange={(e) => setConfig({ ...config, floating_wa_message: e.target.value })} rows={2} />
          </Field>
          <Field label="Teks tombol CTA navigasi">
            <Input value={config.nav_cta_text} onChange={(e) => setConfig({ ...config, nav_cta_text: e.target.value })} />
          </Field>
          <Field label="Pesan WA tombol CTA navigasi">
            <Textarea value={config.nav_cta_message} onChange={(e) => setConfig({ ...config, nav_cta_message: e.target.value })} rows={2} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Btn variant="primary" onClick={saveConfig} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Konfigurasi"}</Btn>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle sub="Link di navigasi atas dan footer">Nav Links</SectionTitle>
          <Btn variant="soft" size="sm" icon="plus" onClick={openAddNav}>Tambah</Btn>
        </div>
        <div className="mt-4 space-y-2">
          {navLinks.map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-paper-tint">
              <div className="flex-1">
                <span className="text-sm font-bold text-ink">{n.label}</span>
                <span className="text-xs text-ink-mute ml-2">{n.href}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditNav(n)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep">
                  <Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" />
                </button>
                <button onClick={() => delNav(n)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100">
                  <Icon name="trash" className="w-3.5 h-3.5 text-danger-500" />
                </button>
              </div>
            </div>
          ))}
          {navLinks.length === 0 && <div className="py-4 text-center text-ink-mute text-sm">Belum ada nav link.</div>}
        </div>
      </Card>

      <Modal open={showNavModal} onClose={() => setShowNavModal(false)} title={editNav ? "Edit Nav Link" : "Tambah Nav Link"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setShowNavModal(false)}>Batal</Btn><Btn variant="primary" onClick={saveNav} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <Field label="Label (teks yang tampil)"><Input value={navForm.label} onChange={(e) => setNavForm({ ...navForm, label: e.target.value })} placeholder="Program" /></Field>
          <Field label="Href (anchor atau path)"><Input value={navForm.href} onChange={(e) => setNavForm({ ...navForm, href: e.target.value })} placeholder="#program" /></Field>
          <Field label="Urutan"><Input type="number" value={String(navForm.sort_order)} onChange={(e) => setNavForm({ ...navForm, sort_order: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
