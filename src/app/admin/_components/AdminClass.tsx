"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Placeholder from "@/components/ui/Placeholder";
import TimePicker from "@/components/ui/TimePicker";
import Modal from "@/components/ui/Modal";
import type { ScheduleSlot, ClassRow, CoachProfile, ClassPackage, MemberAttendanceRow } from "../_types";
import { getSlotTime } from "../_utils";
import type { Database, Json } from "@/types/database";
import { fmtIDR, fmtDate } from "@/lib/utils";

interface Criterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}

const EMPTY_CLASS_FORM = { name: "", class_type: "reguler", schedule_days: [] as string[], schedule_times: [] as ScheduleSlot[], same_time_all: true, time_start: "", time_end: "", capacity: "", price_monthly: "", price_per_session: "", goals: "", description: "", photo_url: "" };
const DAY_OPTS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

export default function AdminClass({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit class modal
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);

  // Criteria (aspek penilaian) modal
  const [criteriaClass, setCriteriaClass] = useState<ClassRow | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Per-class attendance modal
  const [attClass, setAttClass] = useState<ClassRow | null>(null);
  const [attSessions, setAttSessions] = useState<{ date: string; rows: MemberAttendanceRow[] }[]>([]);
  const [loadingAtt2, setLoadingAtt2] = useState(false);
  const [attExpanded, setAttExpanded] = useState<Set<string>>(new Set());

  // Package management modal
  const [packageClass, setPackageClass] = useState<ClassRow | null>(null);
  const [packages, setPackages] = useState<ClassPackage[]>([]);
  const [pkgForm, setPkgForm] = useState({ name: "", sessions: "", price: "" });
  const [savingPkg, setSavingPkg] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, schedule_days, time_start, time_end, schedule_times, goals, description, photo_url, spreadsheet_url, spreadsheet_filled, class_coaches(role, profile:profiles(full_name, id)), coach_spreadsheets:class_coach_spreadsheets(coach_id, spreadsheet_url, updated_at, coach:profiles(full_name)), packages:class_packages(id, name, sessions, price, sort_order, active)")
      .eq("branch_id", branchId).order("name");
    if (data) setClasses(data as unknown as ClassRow[]);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("profiles").select("id, full_name").eq("branch_id", branchId).eq("role", "coach").order("full_name")
      .then(({ data }) => { if (data) setCoaches(data as unknown as CoachProfile[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_CLASS_FORM); setOpenForm(true); };
  const openEdit = (c: ClassRow) => {
    setEditTarget(c);
    const slots = c.schedule_times ?? [];
    // Detect if all slots share the same time (or no per-day slots set)
    const uniqueTimes = new Set(slots.map(s => `${s.time_start}|${s.time_end}`));
    const sameTime = slots.length === 0 || uniqueTimes.size === 1;
    setForm({
      name: c.name, class_type: c.class_type ?? "reguler",
      schedule_days: c.schedule_days ?? [],
      schedule_times: slots.length > 0 ? slots : (c.schedule_days ?? []).map(day => ({ day, time_start: c.time_start ?? "", time_end: c.time_end ?? "" })),
      same_time_all: sameTime,
      time_start: slots[0]?.time_start ?? c.time_start ?? "",
      time_end:   slots[0]?.time_end   ?? c.time_end   ?? "",
      capacity: c.capacity ? String(c.capacity) : "",
      price_monthly: c.price_monthly ? String(c.price_monthly) : "",
      price_per_session: c.price_per_session ? String(c.price_per_session) : "",
      goals: c.goals ?? "", description: c.description ?? "",
      photo_url: c.photo_url ?? "",
    });
    setOpenForm(true);
  };

  const isPrivate = form.class_type === "private";

  const saveClass = async () => {
    if (!form.name) return toast.error("Nama kelas wajib diisi");
    if (!isPrivate && form.schedule_days.length === 0) return toast.error("Hari sesi wajib diisi untuk kelas reguler");
    setSaving(true);
    // Build schedule_times — use per-day slots; derive global time_start/time_end from first slot
    const days = isPrivate ? (form.schedule_days.length > 0 ? form.schedule_days : []) : form.schedule_days;
    const scheduleTimes: ScheduleSlot[] = form.same_time_all
      ? days.map(day => ({ day, time_start: form.time_start, time_end: form.time_end }))
      : form.schedule_times.filter(s => days.includes(s.day));
    const firstSlot = scheduleTimes[0];

    if (editTarget) {
      const updatePayload: Database["public"]["Tables"]["classes"]["Update"] = { name: form.name, class_type: form.class_type, schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null, time_start: firstSlot?.time_start || form.time_start || undefined, time_end: firstSlot?.time_end || form.time_end || undefined, capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, goals: form.goals.trim() || null, description: form.description.trim() || null };
      const { error } = await supabase.from("classes").update(updatePayload).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error("Gagal update kelas", error.message);
      toast.success("Kelas diperbarui");
    } else {
      const insertPayload: Database["public"]["Tables"]["classes"]["Insert"] = { name: form.name, class_type: form.class_type, schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null, time_start: firstSlot?.time_start || form.time_start || "", time_end: firstSlot?.time_end || form.time_end || "", capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, goals: form.goals.trim() || null, description: form.description.trim() || null, branch_id: branchId, status: "active", enrolled: 0 };
      const { error } = await supabase.from("classes").insert(insertPayload).select("id").single();
      if (error) { setSaving(false); return toast.error("Gagal membuat kelas", error.message); }
      setSaving(false);
      toast.success("Kelas dibuat");
    }
    setOpenForm(false);
    load();
  };

  const archiveClass = async (c: ClassRow) => {
    const yes = await confirm({ body: `Arsipkan kelas "${c.name}"?` });
    if (!yes) return;
    await supabase.from("classes").update({ status: "archived" }).eq("id", c.id);
    toast.success("Kelas diarsipkan");
    load();
  };

  const restoreClass = async (c: ClassRow) => {
    const yes = await confirm({ body: `Aktifkan kembali kelas "${c.name}"?` });
    if (!yes) return;
    await supabase.from("classes").update({ status: "active" }).eq("id", c.id);
    toast.success("Kelas diaktifkan kembali");
    load();
  };

  const toggleDay = (d: string) => setForm(f => {
    const selected = f.schedule_days.includes(d);
    const newDays = selected ? f.schedule_days.filter(x => x !== d) : [...f.schedule_days, d];
    // Keep schedule_times in sync with selected days (preserve existing per-day times)
    const newTimes = newDays.map(day => {
      const existing = f.schedule_times.find(s => s.day === day);
      return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
    });
    return { ...f, schedule_days: newDays, schedule_times: newTimes };
  });

  const updateSlotTime = (day: string, field: "time_start" | "time_end", value: string) =>
    setForm(f => ({ ...f, schedule_times: f.schedule_times.map(s => s.day === day ? { ...s, [field]: value } : s) }));

  // ── Packages ───────────────────────────────────────────────────────────────
  const openPackages = (c: ClassRow) => {
    setPackageClass(c);
    setPackages((c.packages ?? []).slice().sort((a, b) => a.sort_order - b.sort_order));
    setPkgForm({ name: "", sessions: "", price: "" });
  };

  const savePackage = async () => {
    if (!packageClass || !pkgForm.sessions || !pkgForm.price) return toast.error("Jumlah sesi dan harga wajib diisi");
    setSavingPkg(true);
    const name = pkgForm.name.trim() || `Paket ${pkgForm.sessions} Sesi`;
    const { error } = await supabase.from("class_packages").insert({
      class_id: packageClass.id,
      name,
      sessions: Number(pkgForm.sessions),
      price: Number(pkgForm.price),
      sort_order: packages.length,
    });
    setSavingPkg(false);
    if (error) return toast.error("Gagal menyimpan paket", error.message);
    toast.success("Paket ditambahkan");
    const { data } = await supabase.from("class_packages").select("id, name, sessions, price, sort_order, active").eq("class_id", packageClass.id).order("sort_order");
    setPackages((data ?? []) as ClassPackage[]);
    setPkgForm({ name: "", sessions: "", price: "" });
    load();
  };

  const deletePackage = async (pkgId: string) => {
    const yes = await confirm({ body: "Hapus paket ini?" });
    if (!yes) return;
    await supabase.from("class_packages").delete().eq("id", pkgId);
    setPackages(p => p.filter(x => x.id !== pkgId));
    toast.success("Paket dihapus");
    load();
  };

  const togglePackageActive = async (pkg: ClassPackage) => {
    await supabase.from("class_packages").update({ active: !pkg.active }).eq("id", pkg.id);
    setPackages(p => p.map(x => x.id === pkg.id ? { ...x, active: !x.active } : x));
  };

  // ── Criteria ───────────────────────────────────────────────────────────────
  const openCriteria = async (c: ClassRow) => {
    setCriteriaClass(c);
    setLoadingCriteria(true);
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", c.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
    setLoadingCriteria(false);
    setCriterionForm({ label: "", kind: "score_10", options: [] });
  };

  const addCriterion = async () => {
    if (!criteriaClass || !criterionForm.label) return toast.error("Label wajib diisi");
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.filter(Boolean) : null;
    const { error } = await supabase.from("class_criteria").insert({
      class_id: criteriaClass.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Aspek penilaian ditambahkan");
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", criteriaClass.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm({ body: "Hapus aspek penilaian ini? Data rapor yang sudah diisi tidak akan terpengaruh." });
    if (!yes) return;
    await supabase.from("class_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success("Aspek penilaian dihapus");
  };

  const updateCriterion = async () => {
    if (!editingCriterion || !editingCriterion.label) return toast.error("Label wajib diisi");
    const opts = editingCriterion.kind === "choice" ? editingCriterion.options.filter(Boolean) : null;
    const { error } = await supabase.from("class_criteria").update({ label: editingCriterion.label, kind: editingCriterion.kind, options: opts }).eq("id", editingCriterion.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    setCriteria(prev => prev.map(c => c.id === editingCriterion.id ? { ...c, label: editingCriterion.label, kind: editingCriterion.kind, options: opts } : c));
    setEditingCriterion(null);
    toast.success("Aspek diperbarui");
  };

  const duplicateCriterion = async (cr: Criterion) => {
    if (!criteriaClass) return;
    setSavingCriterion(true);
    const { error } = await supabase.from("class_criteria").insert({
      class_id: criteriaClass.id, label: cr.label, kind: cr.kind,
      options: cr.options ?? [], sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menduplikat", error.message);
    toast.success("Aspek diduplikat");
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", criteriaClass.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
  };

  const applyBulkKind = async () => {
    if (!criteriaClass || criteria.length === 0) return;
    const yes = await confirm({ body: `Ubah semua ${criteria.length} aspek ke tipe "${kindLabel[bulkKind]}"? Options pilihan ganda akan dihapus kecuali tipe yang dipilih adalah pilihan ganda.` });
    if (!yes) return;
    setApplyingBulk(true);
    const opts = bulkKind === "choice" ? ["Sangat Baik", "Baik", "Cukup", "Perlu Latihan"] : null;
    await Promise.all(criteria.map(cr => supabase.from("class_criteria").update({ kind: bulkKind, options: opts }).eq("id", cr.id)));
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", criteriaClass.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
    setApplyingBulk(false);
    toast.success("Semua aspek diperbarui");
  };

  const kindLabel: Record<string, string> = { score_10: "Nilai 1–10", score_100: "Nilai 1–100", choice: "Pilihan ganda", text: "Teks bebas" };

  const openClassAtt = async (c: ClassRow) => {
    setAttClass(c);
    setAttSessions([]);
    setAttExpanded(new Set());
    setLoadingAtt2(true);
    const { data } = await supabase.from("member_attendances")
      .select("id, member_id, class_id, session_date, status, method, member:members(profile:profiles(full_name))")
      .eq("class_id", c.id)
      .order("session_date", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as unknown as MemberAttendanceRow[];
    // Group by session_date
    const map = new Map<string, MemberAttendanceRow[]>();
    for (const r of rows) {
      if (!map.has(r.session_date)) map.set(r.session_date, []);
      map.get(r.session_date)!.push(r);
    }
    setAttSessions(Array.from(map.entries()).map(([date, rs]) => ({ date, rows: rs })));
    setLoadingAtt2(false);
  };

  const archivedCount = classes.filter(c => c.status === "archived").length;
  const visibleClasses = classes.filter(c => showArchived ? c.status === "archived" : c.status !== "archived");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Manajemen Kelas</h2><p className="text-ink-mute text-sm mt-0.5">Buat kelas, atur jadwal, dan konfigurasi aspek penilaian.</p></div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Btn variant="ghost" icon="archive" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? "Lihat kelas aktif" : `Diarsipkan (${archivedCount})`}
            </Btn>
          )}
          {!showArchived && <Btn variant="primary" icon="plus" onClick={openCreate}>Tambah Kelas</Btn>}
        </div>
      </div>
      {showArchived && (
        <div className="flex items-center gap-2 px-4 py-3 bg-archive-50 border border-archive-500/20 rounded-xl text-sm text-archive-600">
          <Icon name="archive" className="w-4 h-4 shrink-0" />
          <span>Menampilkan {archivedCount} kelas yang diarsipkan. Kelas arsip tidak tampil di mana pun.</span>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleClasses.map((c) => {
          const archived = c.status === "archived";
          const coachNames = c.class_coaches?.map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
          const pct = c.enrolled / (c.capacity || 1);
          return (
            <Card key={c.id} padded={false} className={`overflow-hidden${archived ? " opacity-70" : ""}`}>
              <div className="relative">
                {c.photo_url
                  ? <div className="aspect-video w-full overflow-hidden bg-paper-deep"><img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" /></div>
                  : <Placeholder label={c.id} ratio="16/9" className="rounded-none border-0" />
                }
                <div className="absolute top-3 left-3 right-3 flex justify-between gap-2">
                  {archived && <Status kind="archived">Diarsipkan</Status>}
                </div>
              </div>
              <div className="p-4">
                <div className="font-display font-bold text-ink">{c.name}</div>
                <div className="text-xs text-ink-mute mt-0.5 space-y-0.5">
                  {(c.schedule_days ?? []).length > 0
                    ? (c.schedule_days ?? []).map(day => {
                        const t = getSlotTime(c, day);
                        return <div key={day}>{day} · {t.time_start?.slice(0,5)}{t.time_end ? `–${t.time_end.slice(0,5)}` : ""}</div>;
                      })
                    : <div>—</div>
                  }
                </div>
                {coachNames.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm"><Avatar name={coachNames[0]!} size={24} /><span className="text-ink-soft font-medium">{coachNames[0]}</span></div>
                )}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
                    <span>Kapasitas</span>
                    <span className={`font-mono ${pct >= 1 ? "text-danger-500" : pct > 0.7 ? "text-warn-600" : "text-ok-600"}`}>{c.enrolled}/{c.capacity}</span>
                  </div>
                  <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
                    <div className={`h-full ${pct >= 1 ? "bg-danger-500" : pct > 0.7 ? "bg-warn-500" : "bg-ok-500"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {(c.coach_spreadsheets ?? []).length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ok-600">
                      <Icon name="link" className="w-3 h-3" />{c.coach_spreadsheets!.length} spreadsheet
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warn-500">
                      <Icon name="warning" className="w-3 h-3" />Belum ada spreadsheet
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                  {c.class_type === "private" ? (
                    <div>
                      <div className="text-xs text-ink-mute font-semibold">Private</div>
                      <div className="text-xs text-ink-mute">{(c.packages ?? []).filter(p => p.active).length} paket aktif</div>
                    </div>
                  ) : (
                    <div className="font-display font-bold text-ocean-700">{fmtIDR(c.price_monthly)}<span className="text-xs text-ink-mute font-semibold">/bln</span></div>
                  )}
                  <div className="flex gap-1">
                    {archived ? (
                      <button onClick={() => restoreClass(c)} title="Aktifkan kembali" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ok-600 flex items-center justify-center"><Icon name="check" className="w-4 h-4" /></button>
                    ) : (
                      <>
                        {c.class_type === "private" && (
                          <button onClick={() => openPackages(c)} title="Paket harga" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="invoice" className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => openClassAtt(c)} title="Absensi member" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-wave-600 flex items-center justify-center"><Icon name="calendar" className="w-4 h-4" /></button>
                        <button onClick={() => openCriteria(c)} title="Aspek penilaian" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="book" className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(c)} title="Edit kelas" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                        <button onClick={() => archiveClass(c)} title="Arsipkan" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-danger-500 flex items-center justify-center"><Icon name="archive" className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit class modal */}
      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editTarget ? `Edit Kelas — ${editTarget.name}` : "Tambah Kelas Baru"} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenForm(false)}>Batal</Btn><Btn variant="primary" onClick={saveClass} disabled={saving}>{saving ? "Menyimpan…" : editTarget ? "Simpan perubahan" : "Simpan kelas"}</Btn></>}>
        <div className="space-y-4">
          {/* Tipe kelas toggle — hanya saat create */}
          {!editTarget && (
            <Field label="Tipe kelas" required>
              <div className="flex gap-2">
                {[["reguler", "Reguler", "Kelas group, jadwal tetap"], ["private", "Private", "1-on-1, jadwal fleksibel"]].map(([val, label, desc]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, class_type: val, capacity: val === "private" ? "1" : f.capacity }))}
                    className={`flex-1 p-3 rounded-xl border-2 text-left transition-colors ${form.class_type === val ? "border-ocean-500 bg-ocean-50" : "border-line hover:bg-paper-tint"}`}>
                    <div className={`font-bold text-sm ${form.class_type === val ? "text-ocean-700" : "text-ink"}`}>{label}</div>
                    <div className="text-xs text-ink-mute mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>
          )}
          {isPrivate && (
            <div className="bg-wave-50 border border-wave-100 rounded-xl p-3 text-sm text-wave-800 flex gap-2">
              <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-wave-500" />
              <span>Kelas private kapasitas otomatis 1. Hari sesi bersifat preferensi — absensi bisa dicatat kapan saja oleh coach.</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama kelas" required className="sm:col-span-2"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isPrivate ? "Mis. Private — Coach Salwa" : "Mis. Tadpole — Pengenalan Air"} /></Field>
            {!isPrivate && (
              <>
                <Field label="Kapasitas" required><Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="15" min="1" /></Field>
                <Field label="Harga/bulan" required hint={form.price_monthly ? `Rp ${Number(form.price_monthly).toLocaleString("id-ID")}` : undefined}>
                  <Input type="text" inputMode="numeric" value={form.price_monthly ? Number(form.price_monthly).toLocaleString("id-ID") : ""}
                    onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value.replace(/\D/g, "") }))}
                    className="font-mono" placeholder="550.000" />
                </Field>
              </>
            )}
            {isPrivate && (
              <Field label="Harga per sesi" hint={form.price_per_session ? `Rp ${Number(form.price_per_session).toLocaleString("id-ID")}` : "Rp per pertemuan"}>
                <Input type="text" inputMode="numeric" value={form.price_per_session ? Number(form.price_per_session).toLocaleString("id-ID") : ""}
                  onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value.replace(/\D/g, "") }))}
                  className="font-mono" placeholder="150.000" />
              </Field>
            )}
          </div>

          {/* Hari & Jam */}
          <div className="block">
            <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">{isPrivate ? "Preferensi hari latihan" : "Hari sesi"}{!isPrivate && <span className="text-danger-500 ml-0.5">*</span>}</span>
            {/* Day picker */}
            <div className="flex flex-wrap gap-2 mt-1">
              {DAY_OPTS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${form.schedule_days.includes(d) ? "bg-ocean-700 text-white border-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  {d.slice(0,3)}
                </button>
              ))}
            </div>

            {/* Jam config — muncul setelah ada hari dipilih */}
            {form.schedule_days.length > 0 && (
              <div className="mt-3 rounded-xl border border-line overflow-hidden">
                {/* Toggle mode */}
                <div className="flex items-center justify-between px-3 py-2 bg-paper-tint border-b border-line">
                  <span className="text-xs font-semibold text-ink-mute">Pengaturan jam</span>
                  <div className="flex rounded-lg border border-line overflow-hidden text-xs font-bold">
                    <button type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        same_time_all: true,
                        // Ambil jam representatif dari slot pertama yang ada
                        time_start: f.schedule_times[0]?.time_start || f.time_start,
                        time_end:   f.schedule_times[0]?.time_end   || f.time_end,
                        // Samakan semua slot ke jam representatif itu
                        schedule_times: f.schedule_times.map(s => ({
                          ...s,
                          time_start: f.schedule_times[0]?.time_start || f.time_start,
                          time_end:   f.schedule_times[0]?.time_end   || f.time_end,
                        })),
                      }))}
                      className={`px-2.5 py-1 transition-colors ${form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"}`}>
                      Sama semua hari
                    </button>
                    <button type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        same_time_all: false,
                        // Pastikan semua slot terisi jam terkini dari mode "Sama semua hari"
                        schedule_times: f.schedule_days.map(day => {
                          const existing = f.schedule_times.find(s => s.day === day);
                          return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
                        }),
                      }))}
                      className={`px-2.5 py-1 transition-colors ${!form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"}`}>
                      Beda per hari
                    </button>
                  </div>
                </div>

                {form.same_time_all ? (
                  /* Mode: jam sama untuk semua hari */
                  <div className="px-3 py-3 flex gap-3 items-end flex-wrap">
                    <Field label="Jam mulai" className="flex-1 min-w-[120px]">
                      <TimePicker value={form.time_start}
                        onChange={v => setForm(f => ({
                          ...f,
                          time_start: v,
                          schedule_times: f.schedule_times.map(s => ({ ...s, time_start: v })),
                        }))} />
                    </Field>
                    <Field label="Jam selesai" className="flex-1 min-w-[120px]">
                      <TimePicker value={form.time_end}
                        onChange={v => setForm(f => ({
                          ...f,
                          time_end: v,
                          schedule_times: f.schedule_times.map(s => ({ ...s, time_end: v })),
                        }))} />
                    </Field>
                    <div className="pb-1 text-xs text-ink-mute self-end">Berlaku untuk: {form.schedule_days.join(", ")}</div>
                  </div>
                ) : (
                  /* Mode: jam berbeda per hari */
                  <div className="divide-y divide-line">
                    {DAY_OPTS.filter(d => form.schedule_days.includes(d)).map(day => {
                      const slot = form.schedule_times.find(s => s.day === day) ?? { day, time_start: "", time_end: "" };
                      return (
                        <div key={day} className="px-3 py-2.5 flex items-center gap-3">
                          <span className="w-12 text-xs font-bold text-ink-soft shrink-0">{day.slice(0,3)}</span>
                          <div className="flex gap-2 flex-1">
                            <TimePicker value={slot.time_start} className="flex-1"
                              onChange={v => updateSlotTime(day, "time_start", v)} />
                            <span className="text-ink-faint self-center text-xs">–</span>
                            <TimePicker value={slot.time_end} className="flex-1"
                              onChange={v => updateSlotTime(day, "time_end", v)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <span className="text-xs text-ink-faint mt-1 block">{isPrivate ? "Opsional — hanya sebagai info" : "Pilih satu atau lebih hari, lalu atur jam per hari"}</span>
          </div>
          <Field label="Tujuan kelas" hint="Tampil di coach page dan member page"><Textarea rows={2} value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder="Mis. Pengenalan air, membangun rasa percaya diri di air." /></Field>
          <Field label="Deskripsi kelas" hint="Opsional — tampil di coach page dan member page"><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mis. Kelas ini dirancang untuk anak usia 4–6 tahun yang baru pertama kali belajar renang..." /></Field>
          {editTarget && coaches.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">Coach yang mengajar</div>
              <div className="flex flex-wrap gap-2">
                {editTarget.class_coaches?.map(cc => cc.profile && (
                  <span key={cc.profile.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold">
                    <Avatar name={cc.profile.full_name ?? ""} size={18} />{cc.profile.full_name}
                    {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide">Head</span>}
                  </span>
                ))}
                {(editTarget.class_coaches?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">Belum ada coach assigned</span>}
              </div>
            </div>
          )}
          {editTarget && (
            <div className="border-t border-line pt-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Spreadsheet Program</div>
              {(editTarget.coach_spreadsheets ?? []).length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-sm text-warn-700">
                  <Icon name="warning" className="w-4 h-4 shrink-0 text-warn-500" />
                  Belum ada coach yang mengisi spreadsheet program.
                </div>
              ) : (
                <div className="space-y-2">
                  {editTarget.coach_spreadsheets!.map(s => (
                    <div key={s.coach_id} className="flex items-center gap-3 p-3 rounded-xl bg-ok-50 border border-ok-100">
                      <Avatar name={s.coach?.full_name ?? "?"} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ok-700 font-semibold truncate">{s.coach?.full_name ?? s.coach_id}</div>
                        <div className="text-[10px] text-ink-faint font-mono">{new Date(s.updated_at).toLocaleDateString("id-ID")}</div>
                      </div>
                      <a href={s.spreadsheet_url} target="_blank" rel="noreferrer">
                        <Btn variant="soft" size="sm" icon="link">Buka</Btn>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Criteria modal */}
      <Modal open={!!criteriaClass} onClose={() => setCriteriaClass(null)} title={`Aspek Penilaian — ${criteriaClass?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => setCriteriaClass(null)}>Tutup</Btn>}>
        <div className="space-y-5">
          {loadingCriteria ? <div className="text-ink-mute text-sm text-center py-6">Memuat…</div> : (
            <>
              {criteria.length > 0 ? (
                <div className="space-y-2">
                  {/* Bulk change bar */}
                  <div className="flex items-center gap-2 p-2.5 bg-paper-tint rounded-xl border border-line">
                    <span className="text-xs text-ink-mute shrink-0">Ubah semua ke:</span>
                    <select value={bulkKind} onChange={e => setBulkKind(e.target.value)}
                      className="flex-1 text-xs border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500">
                      <option value="score_10">Nilai 1–10</option>
                      <option value="score_100">Nilai 1–100</option>
                      <option value="choice">Pilihan ganda</option>
                      <option value="text">Teks bebas</option>
                    </select>
                    <Btn variant="outline" size="sm" onClick={applyBulkKind} disabled={applyingBulk}>{applyingBulk ? "Mengubah…" : "Terapkan"}</Btn>
                  </div>

                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="rounded-xl border border-line overflow-hidden">
                      {editingCriterion?.id === cr.id ? (
                        /* Edit mode */
                        <div className="p-3 space-y-2 bg-ocean-50/40">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <Field label="Label"><Input value={editingCriterion.label} onChange={e => setEditingCriterion(v => v ? { ...v, label: e.target.value } : v)} /></Field>
                            <Field label="Tipe">
                              <Select value={editingCriterion.kind} onChange={e => setEditingCriterion(v => v ? { ...v, kind: e.target.value } : v)}>
                                <option value="score_10">Nilai 1–10</option>
                                <option value="score_100">Nilai 1–100</option>
                                <option value="choice">Pilihan ganda</option>
                                <option value="text">Teks bebas</option>
                              </Select>
                            </Field>
                          </div>
                          {editingCriterion.kind === "choice" && (
                            <Field label="Pilihan jawaban">
                              <div className="space-y-1.5">
                                {editingCriterion.options.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                                    <Input value={opt} onChange={e => setEditingCriterion(v => { if (!v) return v; const opts = [...v.options]; opts[idx] = e.target.value; return { ...v, options: opts }; })} placeholder={`Pilihan ${idx + 1}`} className="flex-1" />
                                    <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: v.options.filter((_, i) => i !== idx) } : v)} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: [...v.options, ""] } : v)} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                                  <Icon name="plus" className="w-3.5 h-3.5" />Tambah pilihan
                                </button>
                              </div>
                            </Field>
                          )}
                          <div className="flex gap-2">
                            <Btn variant="primary" size="sm" onClick={updateCriterion}>Simpan</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setEditingCriterion(null)}>Batal</Btn>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                          <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm">{cr.label}</div>
                            <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? cr.kind}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                          </div>
                          <button onClick={() => duplicateCriterion(cr)} disabled={savingCriterion}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0 disabled:opacity-50" title="Duplikat">
                            <Icon name="copy" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCriterion({ id: cr.id, label: cr.label, kind: cr.kind, options: cr.options ?? [] })}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title="Edit">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCriterion(cr.id)} className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title="Hapus">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">Belum ada aspek penilaian. Tambahkan di bawah.</p>
              )}

              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tambah Aspek Baru</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Label aspek" required><Input value={criterionForm.label} onChange={e => setCriterionForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Teknik gaya bebas" /></Field>
                  <Field label="Tipe penilaian">
                    <Select value={criterionForm.kind} onChange={e => setCriterionForm(f => ({ ...f, kind: e.target.value }))}>
                      <option value="score_10">Nilai 1–10</option>
                      <option value="score_100">Nilai 1–100</option>
                      <option value="choice">Pilihan ganda</option>
                      <option value="text">Teks bebas</option>
                    </Select>
                  </Field>
                </div>
                {criterionForm.kind === "choice" && (
                  <Field label="Pilihan jawaban">
                    <div className="space-y-1.5">
                      {criterionForm.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                          <Input value={opt} onChange={e => setCriterionForm(f => { const opts = [...f.options]; opts[idx] = e.target.value; return { ...f, options: opts }; })} placeholder={`Pilihan ${idx + 1}`} className="flex-1" />
                          <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: [...f.options, ""] }))} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                        <Icon name="plus" className="w-3.5 h-3.5" />Tambah pilihan
                      </button>
                    </div>
                  </Field>
                )}
                <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? "Menyimpan…" : "Tambah Aspek"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Per-class attendance modal */}
      <Modal open={!!attClass} onClose={() => setAttClass(null)} title={`Absensi Member — ${attClass?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => setAttClass(null)}>Tutup</Btn>}>
        {loadingAtt2 ? (
          <div className="py-8 text-center text-ink-mute text-sm">Memuat…</div>
        ) : attSessions.length === 0 ? (
          <div className="py-8 text-center text-ink-mute text-sm">Belum ada data absensi untuk kelas ini.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {attSessions.map(s => {
              const hadirCount = s.rows.filter(r => r.status === "hadir").length;
              const isOpen = attExpanded.has(s.date);
              return (
                <div key={s.date} className="border border-line rounded-xl overflow-hidden">
                  <button type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-paper-tint text-left"
                    onClick={() => setAttExpanded(prev => {
                      const next = new Set(prev);
                      if (next.has(s.date)) next.delete(s.date); else next.add(s.date);
                      return next;
                    })}>
                    <span className="flex-1 font-semibold text-sm text-ink">{fmtDate(s.date)}</span>
                    <span className="text-xs font-bold text-ok-600">{hadirCount} hadir</span>
                    <span className="text-xs text-ink-mute">{s.rows.length} total</span>
                    <Icon name="chevronD" className={`w-4 h-4 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line divide-y divide-line">
                      {s.rows.map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="flex-1 text-sm text-ink">{r.member?.profile?.full_name ?? "—"}</span>
                          <span className="text-xs text-ink-mute capitalize">{r.method === "manual" ? "Manual" : r.method === "qr" ? "QR" : r.method ?? "—"}</span>
                          {r.status === "hadir"
                            ? <Status kind="approved" dot={false}>Hadir</Status>
                            : r.status === "izin"
                            ? <Status kind="excused" dot={false}>Izin</Status>
                            : r.status === "sakit"
                            ? <Status kind="sick" dot={false}>Sakit</Status>
                            : <Status kind="rejected" dot={false}>Tidak Hadir</Status>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Package management modal */}
      <Modal open={!!packageClass} onClose={() => setPackageClass(null)} title={`Paket Harga — ${packageClass?.name ?? ""}`} size="sm"
        footer={<Btn variant="ghost" onClick={() => setPackageClass(null)}>Tutup</Btn>}>
        <div className="space-y-4">
          {packages.length === 0 ? (
            <div className="text-center py-6 text-ink-mute text-sm">Belum ada paket. Tambahkan paket di bawah.</div>
          ) : (
            <div className="space-y-2">
              {packages.map(pkg => (
                <div key={pkg.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pkg.active ? "border-line bg-white" : "border-line bg-paper-tint opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink truncate">{pkg.name}</div>
                    <div className="text-xs text-ink-mute">{pkg.sessions} sesi · {fmtIDR(pkg.price)}</div>
                  </div>
                  <button onClick={() => togglePackageActive(pkg)} className={`text-xs px-2 py-1 rounded-lg font-bold shrink-0 ${pkg.active ? "bg-ok-50 text-ok-600" : "bg-paper-tint text-ink-mute"}`}>
                    {pkg.active ? "Aktif" : "Nonaktif"}
                  </button>
                  <button onClick={() => deletePackage(pkg.id)} className="w-7 h-7 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center shrink-0">
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line pt-4 space-y-3">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">Tambah Paket</div>
            <Field label="Nama paket" hint="Opsional — otomatis dari jumlah sesi jika kosong.">
              <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder="Mis. Paket Hemat 10 Sesi" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah sesi" required>
                <Input type="number" min={1} value={pkgForm.sessions} onChange={e => setPkgForm(f => ({ ...f, sessions: e.target.value }))} placeholder="10" />
              </Field>
              <Field label="Harga paket" required>
                <Input type="number" min={0} value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} placeholder="1200000" className="font-mono" />
              </Field>
            </div>
            <Btn variant="primary" size="sm" icon="plus" onClick={savePackage} disabled={savingPkg}>{savingPkg ? "Menyimpan…" : "Tambah Paket"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
