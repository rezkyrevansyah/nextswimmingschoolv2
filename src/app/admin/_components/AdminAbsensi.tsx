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
import Modal from "@/components/ui/Modal";
import TimePicker from "@/components/ui/TimePicker";
import type { AttendanceRow, CoachProfile, ClassRow, MemberAttendanceRow } from "../_types";
import { fmtDate } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";

function AdminAbsensiMember({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const PAGE_SIZE = 30;

  const today = new Date().toISOString().split("T")[0];
  const defaultMonth = today.slice(0, 7);

  const [records, setRecords] = useState<MemberAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState(defaultMonth);
  const [filterName, setFilterName] = useState("");

  // Build 12-month dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return { value, label };
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Load class list for filter
    supabase.from("classes").select("id, name").eq("branch_id", branchId).eq("status", "active")
      .order("name").then(({ data }) => { if (data) setClasses(data as { id: string; name: string }[]); });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadRecords = useCallback(async (pg: number, append = false) => {
    setLoading(true);
    const dateFrom = `${filterMonth}-01`;
    const dateTo = new Date(Number(filterMonth.slice(0, 4)), Number(filterMonth.slice(5, 7)), 0)
      .toISOString().split("T")[0];

    // member_attendances has no branch_id — scope via class_id
    let classIds: string[] = [];
    if (filterClass === "all") {
      const { data: cls } = await supabase.from("classes").select("id").eq("branch_id", branchId);
      classIds = (cls ?? []).map((c: { id: string }) => c.id);
    } else {
      classIds = [filterClass];
    }

    if (classIds.length === 0) { setRecords([]); setHasMore(false); setLoading(false); return; }

    let q = supabase.from("member_attendances")
      .select("id, member_id, class_id, session_date, status, method, member:members(profile:profiles(full_name)), class:classes(name)")
      .in("class_id", classIds)
      .gte("session_date", dateFrom)
      .lte("session_date", dateTo)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE);

    if (filterStatus !== "all") q = q.eq("status", filterStatus as "hadir" | "telat" | "izin" | "sakit" | "tidak_hadir");

    const { data } = await q;
    const rows = (data ?? []) as unknown as MemberAttendanceRow[];

    // Client-side name filter
    const filtered = filterName.trim()
      ? rows.filter(r => r.member?.profile?.full_name?.toLowerCase().includes(filterName.trim().toLowerCase()))
      : rows;

    if (append) {
      setRecords(prev => [...prev, ...filtered]);
    } else {
      setRecords(filtered);
    }
    setHasMore(rows.length > PAGE_SIZE);
    setLoading(false);
  }, [branchId, filterClass, filterStatus, filterMonth, filterName]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPage(0);
    loadRecords(0, false);
  }, [loadRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadRecords(next, true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">Semua Kelas</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="hadir">Hadir</option>
          <option value="telat">Telat</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
          <option value="tidak_hadir">Tidak Hadir</option>
        </Select>
        <Input placeholder="Cari nama member…" value={filterName} onChange={e => setFilterName(e.target.value)} />
      </div>

      <Card padded={false}>
        {loading && records.length === 0 ? (
          <div className="p-10 text-center text-ink-mute">Memuat data…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                    <th className="text-left py-3 px-5 font-bold">Tanggal</th>
                    <th className="text-left py-3 font-bold">Member</th>
                    <th className="text-left py-3 font-bold">Kelas</th>
                    <th className="text-left py-3 font-bold">Status</th>
                    <th className="text-left py-3 pr-5 font-bold hidden sm:table-cell">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-paper-tint">
                      <td className="py-3 px-5 font-mono whitespace-nowrap text-ink-soft">{fmtDate(r.session_date)}</td>
                      <td className="py-3 font-semibold text-ink">{r.member?.profile?.full_name ?? "—"}</td>
                      <td className="py-3 text-ink-soft">{r.class?.name ?? "—"}</td>
                      <td className="py-3">
                        {r.status === "hadir"
                          ? <Status kind="approved" dot={false}>Hadir</Status>
                          : r.status === "telat"
                          ? <Status kind="telat" dot={false}>Telat</Status>
                          : r.status === "izin"
                          ? <Status kind="excused" dot={false}>Izin</Status>
                          : r.status === "sakit"
                          ? <Status kind="sick" dot={false}>Sakit</Status>
                          : <Status kind="rejected" dot={false}>Tidak Hadir</Status>}
                      </td>
                      <td className="py-3 pr-5 hidden sm:table-cell text-ink-mute capitalize">
                        {r.method === "manual" ? "Manual" : r.method === "qr" ? "QR Scan" : r.method ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && !loading && (
                    <tr><td colSpan={5} className="py-10 text-center text-ink-mute">Tidak ada data absensi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="px-5 py-3 border-t border-line">
                <Btn variant="ghost" onClick={loadMore} disabled={loading} className="w-full">
                  {loading ? "Memuat…" : "Tampilkan lebih banyak"}
                </Btn>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function AdminAbsensiCoach({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const today = new Date().toISOString().split("T")[0];
  const defaultMonth = today.slice(0, 7);

  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE_COACH = 30;

  const [openManual, setOpenManual] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceRow | null>(null);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ coach_id: "", class_id: "", session_date: "", clock_in_time: "", note: "" });
  const [manualStatus, setManualStatus] = useState<"present" | "late" | "absent">("present");
  const [coachClassIds, setCoachClassIds] = useState<Set<string>>(new Set());
  const [sessionDates, setSessionDates] = useState<{ value: string; label: string }[]>([]);

  // Filters
  const [filterCoach, setFilterCoach] = useState("all");
  const [filterClass2, setFilterClass2] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState(`${defaultMonth}-01`);
  const [filterDateTo, setFilterDateTo] = useState(today);

  // Build month options for quick filter
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return { value, label };
  });

  const loadRecords = useCallback(async (pg: number, append = false) => {
    setLoading(true);
    let q = supabase.from("coach_attendances")
      .select("id, coach_id, class_id, session_date, clock_in_time, status, distance_meters, is_manual, manual_note, profile:profiles!coach_attendances_coach_id_fkey(full_name), class:classes(name)")
      .eq("branch_id", branchId)
      .gte("session_date", filterDateFrom)
      .lte("session_date", filterDateTo)
      .order("session_date", { ascending: false })
      .order("clock_in_time", { ascending: false })
      .range(pg * PAGE_SIZE_COACH, pg * PAGE_SIZE_COACH + PAGE_SIZE_COACH);

    if (filterCoach !== "all") q = q.eq("coach_id", filterCoach);
    if (filterClass2 !== "all") q = q.eq("class_id", filterClass2);

    const { data } = await q;
    const rows = (data ?? []) as unknown as AttendanceRow[];
    if (append) {
      setRecords(prev => [...prev, ...rows]);
    } else {
      setRecords(rows);
    }
    setHasMore(rows.length > PAGE_SIZE_COACH);
    setLoading(false);
  }, [branchId, filterCoach, filterClass2, filterDateFrom, filterDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    supabase.from("profiles").select("id, full_name").eq("branch_id", branchId).eq("role", "coach").then(({ data }) => { if (data) setCoaches(data as unknown as CoachProfile[]); });
    supabase.from("classes").select("id, name, time_start, time_end, status, branch_id, capacity, enrolled, schedule_days, price_monthly, class_coaches(coach_id)").eq("branch_id", branchId).eq("status", "active").then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(0);
    loadRecords(0, false);
  }, [loadRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadRecords(next, true);
  };

  // When coach changes → compute which classes they teach
  const onCoachChange = (coachId: string) => {
    const ids = new Set(
      classes
        .filter(c => (c as unknown as { class_coaches?: { coach_id: string }[] }).class_coaches?.some(cc => cc.coach_id === coachId))
        .map(c => c.id)
    );
    setCoachClassIds(ids);
    setForm(f => ({ ...f, coach_id: coachId, class_id: "", session_date: "", clock_in_time: "" }));
    setSessionDates([]);
  };

  // When class changes → generate past session dates from schedule_days (last 8 weeks)
  const onClassChange = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    const dates: { value: string; label: string }[] = [];
    if (cls && cls.schedule_days?.length) {
      const DAY_MAP: Record<string, number> = { Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      for (let daysBack = 0; daysBack <= 56; daysBack++) {
        const d = new Date(todayD); d.setDate(todayD.getDate() - daysBack);
        const dayName = d.toLocaleDateString("id-ID", { weekday: "long" });
        if (cls.schedule_days.includes(dayName) || cls.schedule_days.some(sd => DAY_MAP[sd] === d.getDay())) {
          const iso = d.toISOString().split("T")[0];
          const label = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          dates.push({ value: iso, label });
        }
      }
    }
    setSessionDates(dates);
    setForm(f => ({
      ...f, class_id: classId, session_date: dates[0]?.value ?? "",
      clock_in_time: cls?.time_start?.slice(0, 5) ?? "",
    }));
  };

  const saveManual = async () => {
    if (!form.coach_id || !form.class_id || !form.session_date) return toast.error("Coach, kelas, dan tanggal wajib diisi");
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const clockInTime = form.clock_in_time || new Date().toTimeString().slice(0, 8);
    if (editTarget) {
      const { error } = await supabase.from("coach_attendances").update({
        coach_id: form.coach_id, class_id: form.class_id,
        session_date: form.session_date,
        clock_in_time: clockInTime,
        is_manual: true,
        manual_by: user?.id ?? null,
        manual_note: form.note || null,
        status: manualStatus,
      }).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error("Gagal menyimpan", error.message);
      toast.success("Absensi diperbarui");
      logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "coach_attendances", entityId: editTarget.id, action: "update", label: `Absensi manual coach tanggal ${form.session_date} diperbarui`, meta: { coach_id: form.coach_id, session_date: form.session_date, status: manualStatus } });
    } else {
      const { error } = await supabase.from("coach_attendances").insert({
        branch_id: branchId, coach_id: form.coach_id, class_id: form.class_id,
        session_date: form.session_date,
        clock_in_time: clockInTime,
        is_manual: true, manual_by: user?.id ?? null,
        manual_note: form.note || null, status: manualStatus,
      });
      setSaving(false);
      if (error) return toast.error("Gagal menyimpan", error.message);
      toast.success("Absensi manual disimpan");
      logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "coach_attendances", entityId: form.coach_id, action: "create", label: `Absensi manual coach tanggal ${form.session_date} ditambahkan`, meta: { coach_id: form.coach_id, session_date: form.session_date, status: manualStatus } });
    }
    setOpenManual(false);
    setEditTarget(null);
    setPage(0);
    loadRecords(0, false);
  };

  const openEdit = (r: AttendanceRow) => {
    setEditTarget(r);
    const ids = new Set(
      classes
        .filter(c => (c as unknown as { class_coaches?: { coach_id: string }[] }).class_coaches?.some(cc => cc.coach_id === r.coach_id))
        .map(c => c.id)
    );
    setCoachClassIds(ids);
    const cls = classes.find(c => c.id === r.class_id);
    const dates: { value: string; label: string }[] = [];
    if (cls?.schedule_days?.length) {
      const DAY_MAP: Record<string, number> = { Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      for (let daysBack = 0; daysBack <= 56; daysBack++) {
        const d = new Date(todayD); d.setDate(todayD.getDate() - daysBack);
        if (cls.schedule_days.some(sd => DAY_MAP[sd] === d.getDay())) {
          const iso = d.toISOString().split("T")[0];
          dates.push({ value: iso, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) });
        }
      }
    }
    if (r.session_date && !dates.find(d => d.value === r.session_date)) {
      const d = new Date(r.session_date);
      dates.push({ value: r.session_date, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) });
    }
    setSessionDates(dates);
    setForm({ coach_id: r.coach_id, class_id: r.class_id, session_date: r.session_date, clock_in_time: r.clock_in_time?.slice(0, 5) ?? "", note: r.manual_note ?? "" });
    setManualStatus((r.status as "present" | "late" | "absent") ?? "present");
    setOpenManual(true);
  };

  const deleteRecord = async (r: AttendanceRow) => {
    const ok = await confirm({ title: "Hapus absensi?", body: `Hapus absensi ${r.profile?.full_name} tanggal ${fmtDate(r.session_date)}?`, confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("coach_attendances").delete().eq("id", r.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    toast.success("Absensi dihapus");
    setPage(0);
    loadRecords(0, false);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={filterCoach} onChange={e => setFilterCoach(e.target.value)}>
          <option value="all">Semua Coach</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </Select>
        <Select value={filterClass2} onChange={e => setFilterClass2(e.target.value)}>
          <option value="all">Semua Kelas</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="flex-1" />
          <span className="text-ink-mute text-xs shrink-0">s.d.</span>
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="flex-1" />
        </div>
        <div className="flex justify-end">
          <Btn variant="primary" icon="plus" onClick={() => { setEditTarget(null); setForm({ coach_id: "", class_id: "", session_date: "", clock_in_time: "", note: "" }); setManualStatus("present"); setCoachClassIds(new Set()); setSessionDates([]); setOpenManual(true); }}>Absensi Manual</Btn>
        </div>
      </div>
      {/* Quick month filter */}
      <div className="flex gap-2 flex-wrap">
        {monthOptions.slice(0, 4).map(o => (
          <button key={o.value} type="button"
            onClick={() => {
              const from = `${o.value}-01`;
              const to = new Date(Number(o.value.slice(0, 4)), Number(o.value.slice(5, 7)), 0).toISOString().split("T")[0];
              setFilterDateFrom(from); setFilterDateTo(to);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filterDateFrom.startsWith(o.value) ? "bg-ocean-600 text-white border-ocean-600" : "border-line text-ink-mute hover:border-ocean-300"}`}>
            {o.label}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {loading && records.length === 0 ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">Tanggal</th><th className="text-left py-3 font-bold">Coach</th>
                  <th className="text-left py-3 font-bold">Kelas</th><th className="text-left py-3 font-bold">Clock-in</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">Jarak</th><th className="text-left py-3 font-bold hidden sm:table-cell">Metode</th>
                  <th className="text-left py-3 pr-5 font-bold"></th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-paper-tint">
                      <td className="py-3.5 px-5 text-ink-soft">{fmtDate(r.session_date)}</td>
                      <td className="font-semibold">{r.profile?.full_name}</td>
                      <td className="text-ink-soft">{r.class?.name}</td>
                      <td className="font-mono">{r.clock_in_time?.slice(0, 5) ?? "—"}</td>
                      <td className="font-mono hidden sm:table-cell">{r.distance_meters != null ? `${r.distance_meters} m` : "—"}</td>
                      <td className="hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          {r.is_manual ? <Status kind="manual">Manual</Status> : <Status kind="active">Selfie + GPS</Status>}
                          {r.status === "late" && <Status kind="late">Telat</Status>}
                        </div>
                      </td>
                      <td className="pr-5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-paper-tint text-ink-mute hover:text-ink" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                          <button onClick={() => deleteRecord(r)} className="p-1.5 rounded hover:bg-danger-50 text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && !loading && <tr><td colSpan={7} className="py-10 text-center text-ink-mute">Belum ada absensi</td></tr>}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="px-5 py-3 border-t border-line">
                <Btn variant="ghost" onClick={loadMore} disabled={loading} className="w-full">{loading ? "Memuat…" : "Tampilkan lebih banyak"}</Btn>
              </div>
            )}
          </>
        )}
      </Card>
      <Modal open={openManual} onClose={() => { setOpenManual(false); setEditTarget(null); }} title={editTarget ? "Edit Absensi Coach" : "Absensi Manual Coach"}
        footer={<><Btn variant="ghost" onClick={() => setOpenManual(false)}>Batal</Btn><Btn variant="primary" onClick={saveManual} disabled={saving}>{saving ? "Menyimpan…" : "Simpan absensi"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-manual-50 border-manual-500/20">
            <div className="flex items-start gap-2.5 text-sm"><Icon name="info" className="w-5 h-5 text-manual-500 shrink-0" /><span>Absensi manual diberi label <b>&quot;Manual — oleh Admin&quot;</b> untuk transparansi.</span></div>
          </Card>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Coach" required>
              <Select value={form.coach_id} onChange={e => onCoachChange(e.target.value)}>
                <option value="">Pilih coach…</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Kelas" required>
              <Select value={form.class_id} onChange={e => onClassChange(e.target.value)} disabled={!form.coach_id}>
                <option value="">{form.coach_id ? "Pilih kelas…" : "Pilih coach dulu"}</option>
                {classes.filter(c => coachClassIds.has(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Sesi / tanggal" required>
              <Select value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} disabled={!form.class_id}>
                <option value="">{form.class_id ? "Pilih sesi…" : "Pilih kelas dulu"}</option>
                {sessionDates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Jam clock-in"><TimePicker value={form.clock_in_time} onChange={v => setForm(f => ({ ...f, clock_in_time: v }))} /></Field>
          </div>
          <Field label="Status kehadiran">
            <Select value={manualStatus} onChange={e => setManualStatus(e.target.value as "present" | "late" | "absent")}>
              <option value="present">Hadir (Tepat Waktu)</option>
              <option value="late">Telat</option>
              <option value="absent">Tidak Hadir</option>
            </Select>
          </Field>
          <Field label="Catatan / alasan"><Textarea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Mis. Coach lupa clock-in, sudah konfirmasi via WA." /></Field>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminAbsensi({ branchId }: { branchId: string }) {
  const [sub, setSub] = useState<"coach" | "member">("coach");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">Absensi</h2>
        <p className="text-ink-mute text-sm mt-0.5">Data absensi coach dan member · SSDP cabang.</p>
      </div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-paper-tint rounded-xl p-1 w-fit">
        {([["coach", "Coach"], ["member", "Member"]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSub(id)}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${sub === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === "coach" && <AdminAbsensiCoach branchId={branchId} />}
      {sub === "member" && <AdminAbsensiMember branchId={branchId} />}
    </div>
  );
}
