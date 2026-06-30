"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";

interface CoachReviewRow {
  id: string;
  stars: number;
  message: string | null;
  created_at: string;
  member_name: string;
  coach_name: string;
  coach_id: string;
  period_label: string;
}

interface RaporPeriod {
  id: string; label: string; date_from: string; date_to: string;
  is_open: boolean; branch_id: string;
}

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, k) => (
        <Icon key={k} name="star" className={`w-4 h-4 ${k < stars ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < stars ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function AdminCoachReviews({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const [reviews, setReviews] = useState<CoachReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCoach, setFilterCoach] = useState<string>("all");
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("member_reviews")
        .select("id, stars, message, created_at, coach_id, coach:profiles!member_reviews_coach_id_fkey(full_name), member:members!member_reviews_member_id_fkey(branch_id, profile:profiles(full_name)), rapor:rapor_entries!member_reviews_rapor_id_fkey(rapor_periods(label))")
        .eq("member.branch_id", branchId)
        .order("created_at", { ascending: false });
      if (!data) { setLoading(false); return; }

      const rows: CoachReviewRow[] = (data as unknown as {
        id: string; stars: number; message: string | null; created_at: string; coach_id: string;
        coach: { full_name: string } | null;
        member: { profile: { full_name: string } | null } | null;
        rapor: { rapor_periods: { label: string } | null } | null;
      }[]).map(r => ({
        id: r.id,
        stars: r.stars,
        message: r.message,
        created_at: r.created_at,
        coach_id: r.coach_id,
        coach_name: r.coach?.full_name ?? "—",
        member_name: r.member?.profile?.full_name ?? "—",
        period_label: r.rapor?.rapor_periods?.label ?? "—",
      }));

      setReviews(rows);
      const coachMap = new Map<string, string>();
      rows.forEach(r => coachMap.set(r.coach_id, r.coach_name));
      setCoaches(Array.from(coachMap.entries()).map(([id, name]) => ({ id, name })));
      setLoading(false);
    })();
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filterCoach === "all" ? reviews : reviews.filter(r => r.coach_id === filterCoach);

  // Compute avg per coach
  const coachAvg = coaches.map(c => {
    const cReviews = reviews.filter(r => r.coach_id === c.id);
    const avg = cReviews.length ? cReviews.reduce((s, r) => s + r.stars, 0) / cReviews.length : 0;
    return { ...c, avg, count: cReviews.length };
  }).sort((a, b) => b.avg - a.avg);

  if (loading) return <div className="text-ink-mute text-sm py-4">Memuat ulasan…</div>;
  if (reviews.length === 0) return (
    <div className="text-center py-8 text-ink-mute text-sm bg-paper-tint rounded-2xl">Belum ada ulasan dari member.</div>
  );

  return (
    <div className="space-y-4">
      {/* Coach summary */}
      {coachAvg.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {coachAvg.map(c => (
            <button key={c.id} onClick={() => setFilterCoach(filterCoach === c.id ? "all" : c.id)}
              className={`text-left rounded-2xl border p-4 transition-all ${filterCoach === c.id ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line hover:border-ocean-300"}`}>
              <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${filterCoach === c.id ? "text-wave-200" : "text-ink-mute"}`}>Coach</div>
              <div className={`font-semibold text-sm truncate ${filterCoach === c.id ? "text-white" : "text-ink"}`}>{c.name}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-lg font-bold ${filterCoach === c.id ? "text-amber-300" : "text-amber-500"}`}>{c.avg.toFixed(1)}</span>
                <Icon name="star" className={`w-4 h-4 ${filterCoach === c.id ? "text-amber-300" : "text-amber-400"}`} strokeWidth={1.5} fill="currentColor" />
                <span className={`text-xs ${filterCoach === c.id ? "text-white/60" : "text-ink-mute"}`}>({c.count})</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Review list */}
      <div className="space-y-2.5">
        {filtered.map(r => (
          <div key={r.id} className="bg-white border border-line rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-ink text-sm">{r.member_name}</div>
                <div className="text-xs text-ink-mute">{r.coach_name} · {r.period_label}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StarDisplay stars={r.stars} />
                <span className="text-xs text-ink-faint">{fmtDate(r.created_at)}</span>
              </div>
            </div>
            {r.message && <p className="text-sm text-ink-soft bg-paper-tint rounded-xl px-3 py-2">{r.message}</p>}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-ink-mute text-sm text-center py-4">Tidak ada ulasan untuk coach ini.</p>}
      </div>
    </div>
  );
}

export default function AdminRapor({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [periods, setPeriods] = useState<RaporPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", date_from: "", date_to: "" });
  const [editTarget, setEditTarget] = useState<RaporPeriod | null>(null);
  const [editForm, setEditForm] = useState({ label: "", date_from: "", date_to: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("rapor_periods").select("id, label, date_from, date_to, is_open, branch_id").eq("branch_id", branchId).order("date_from", { ascending: false });
    if (data) setPeriods(data as RaporPeriod[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activePeriod = periods.find(p => p.is_open);

  const create = async () => {
    if (!form.label || !form.date_from || !form.date_to) return toast.error("Semua field wajib diisi");
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("rapor_periods").insert({ branch_id: branchId, label: form.label, date_from: form.date_from, date_to: form.date_to, is_open: true, created_by: user?.id ?? "" });
    setSaving(false);
    if (error) return toast.error("Gagal membuat periode", error.message);
    toast.success("Periode rapor dibuka");
    setOpenAdd(false);
    load();
  };

  const closePeriod = async (id: string) => {
    const ok = await confirm({ title: "Tutup periode?", body: "Coach tidak bisa lagi mengisi rapor setelah periode ditutup.", confirmLabel: "Tutup", danger: true });
    if (!ok) return;
    await supabase.from("rapor_periods").update({ is_open: false }).eq("id", id);
    toast.success("Periode ditutup");
    load();
  };

  const openEditModal = (p: RaporPeriod) => {
    setEditTarget(p);
    setEditForm({ label: p.label, date_from: p.date_from, date_to: p.date_to });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.label || !editForm.date_from || !editForm.date_to) return toast.error("Semua field wajib diisi");
    setSavingEdit(true);
    const { error } = await supabase.from("rapor_periods").update({ label: editForm.label, date_from: editForm.date_from, date_to: editForm.date_to }).eq("id", editTarget.id);
    setSavingEdit(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Periode diperbarui");
    setEditTarget(null);
    load();
  };

  const reopenPeriod = async (id: string) => {
    await supabase.from("rapor_periods").update({ is_open: true }).eq("id", id);
    toast.success("Periode dibuka kembali");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Periode Rapor</h2><p className="text-ink-mute text-sm mt-0.5">Buka & kelola periode pengisian rapor.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ label: "", date_from: "", date_to: "" }); setOpenAdd(true); }}>Buka Periode Baru</Btn>
      </div>
      {activePeriod && (
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-wave-500/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-wave-200 text-xs font-bold uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-wave-300 animate-pulse" /> Periode aktif</div>
            <div className="mt-2 font-display font-extrabold text-3xl">{activePeriod.label}</div>
            <div className="text-white/80 mt-1">{fmtDate(activePeriod.date_from)} – {fmtDate(activePeriod.date_to)}</div>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => openEditModal(activePeriod)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors">Edit periode</button>
              <button onClick={() => closePeriod(activePeriod.id)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-colors">Tutup periode</button>
            </div>
          </div>
        </div>
      )}
      {!loading && periods.length === 0 && <p className="text-ink-mute">Belum ada periode rapor.</p>}
      {periods.filter(p => !p.is_open).length > 0 && (
        <Card>
          <SectionTitle sub="Riwayat periode">Periode lalu</SectionTitle>
          <div className="space-y-2">
            {periods.filter(p => !p.is_open).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-paper-tint">
                <div className="flex-1"><div className="font-semibold text-ink">{p.label}</div><div className="text-xs text-ink-mute">{fmtDate(p.date_from)} – {fmtDate(p.date_to)}</div></div>
                <Status kind="archived">Ditutup</Status>
                <button onClick={() => openEditModal(p)} className="p-1.5 rounded hover:bg-paper-deep text-ink-mute hover:text-ink" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                <button onClick={() => reopenPeriod(p.id)} className="p-1.5 rounded hover:bg-ok-50 text-ink-mute hover:text-ok-600" title="Buka kembali"><Icon name="check" className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div>
        <SectionTitle sub="Ulasan member terhadap coach" action={null}>Ulasan Coach</SectionTitle>
        <AdminCoachReviews branchId={branchId} />
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Buka Periode Rapor Baru" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? "Membuat…" : "Buka Periode"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Label periode" required><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Semester 1 — 2026" /></Field>
          <Field label="Tanggal mulai" required><Input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} /></Field>
          <Field label="Tanggal selesai" required><Input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Periode Rapor" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditTarget(null)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Label periode" required><Input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Semester 1 — 2026" /></Field>
          <Field label="Tanggal mulai" required><Input type="date" value={editForm.date_from} onChange={e => setEditForm(f => ({ ...f, date_from: e.target.value }))} /></Field>
          <Field label="Tanggal selesai" required><Input type="date" value={editForm.date_to} onChange={e => setEditForm(f => ({ ...f, date_to: e.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  );
}
