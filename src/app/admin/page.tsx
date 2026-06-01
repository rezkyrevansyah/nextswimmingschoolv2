"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import { Card, SectionTitle, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import Placeholder from "@/components/ui/Placeholder";
import dynamic from "next/dynamic";
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { ssr: false, loading: () => <div className="rounded-xl border border-line bg-paper-tint h-[260px] flex items-center justify-center text-ink-mute text-sm">Memuat peta…</div> });
import Modal from "@/components/ui/Modal";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import { fmtIDR, fmtDate, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useUpload } from "@/hooks/useUpload";
import type { User } from "@supabase/supabase-js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClassRow {
  id: string; name: string; branch_id: string; status: string;
  capacity: number; enrolled: number; price_monthly: number;
  price_per_session: number | null; class_type: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null; show_on_landing: boolean;
  branch?: { name: string } | null;
  class_coaches?: { profile: { full_name: string; id: string } | null }[];
}

interface MemberRow {
  id: string; profile_id: string; type: string; status: string;
  date_start: string; qr_code: string | null; school_id: string | null;
  remaining_sessions: number | null; total_sessions: number | null;
  suspend_until?: string | null; suspend_reason?: string | null;
  profile?: {
    full_name: string; birth_date: string | null; phone: string | null;
    gender: string | null; address: string | null; health_notes: string | null;
    email: string | null;
  } | null;
  member_classes?: { class: { id: string; name: string } | null }[];
}

interface CoachProfile {
  id: string; full_name: string; email: string;
  phone: string | null; specialization: string | null;
  certifications?: { name: string; title: string | null; status: string }[];
}

interface AttendanceRow {
  id: string; coach_id: string; class_id: string; session_date: string; clock_in_time: string | null;
  status: string; distance_meters: number | null; is_manual: boolean;
  manual_note: string | null;
  profile?: { full_name: string } | null;
  class?: { name: string } | null;
}

interface LeaveRow {
  id: string; type: string; reason: string | null;
  date_from: string; date_to: string; status: string;
  profile?: { full_name: string; role: string } | null;
  leave_classes?: { class: { name: string } | null }[];
  substitute_profile?: { full_name: string } | null;
}

interface BillRow {
  id: string; member_id: string; period_label: string; amount: number;
  discount: number; total: number; status: string;
  paid_at: string | null; proof_url: string | null;
  member?: { profile: { full_name: string } | null } | null;
}

interface RegistrationRow {
  id: string; full_name: string; birth_date: string | null; gender: string | null;
  phone: string | null; phone_owner: string | null; parent_name: string | null;
  status: string; created_at: string;
}

interface CertRow {
  id: string; name: string; title: string | null; issuer: string | null; valid_from: string | null;
  valid_until: string | null; photo_url: string | null; status: string;
  profile?: { full_name: string } | null;
}

interface Announcement {
  id: string; title: string; body: string; target_all: boolean; active: boolean;
  valid_until: string | null; created_at: string;
}

interface RaporPeriod {
  id: string; label: string; date_from: string; date_to: string;
  is_open: boolean; branch_id: string;
}

interface School {
  id: string; name: string; email: string | null;
  profile_id: string | null;
}

interface Branch {
  id: string; name: string; city: string; address: string | null;
  lat: number | null; lng: number | null; wa_numbers: string[] | null;
  logo_url: string | null;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function AdminDashboard({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const [stats, setStats] = useState({ members: 0, coaches: 0, classes: 0, pending: 0 });
  const [todayClasses, setTodayClasses] = useState<ClassRow[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRow[]>([]);
  const [classesWithoutCoach, setClassesWithoutCoach] = useState<{ id: string; name: string }[]>([]);

  const loadAttendance = useCallback(async () => {
    if (!branchId) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("coach_attendances")
      .select("id, session_date, clock_in_time, status, is_manual, profile:profiles!coach_attendances_coach_id_fkey(full_name), class:classes(name)")
      .eq("branch_id", branchId).eq("session_date", today)
      .order("clock_in_at", { ascending: false }).limit(8);
    if (data) setRecentAttendance(data as unknown as AttendanceRow[]);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!branchId) return;
    // Counts
    Promise.all([
      supabase.from("members").select("id", { count: "exact" }).eq("branch_id", branchId).eq("status", "active"),
      supabase.from("profiles").select("id", { count: "exact" }).eq("branch_id", branchId).eq("role", "coach"),
      supabase.from("classes").select("id", { count: "exact" }).eq("branch_id", branchId).eq("status", "active"),
      supabase.from("registrations").select("id", { count: "exact" }).eq("branch_id", branchId).eq("status", "pending"),
    ]).then(([m, c, k, reg]) => {
      setStats({ members: m.count ?? 0, coaches: c.count ?? 0, classes: k.count ?? 0, pending: reg.count ?? 0 });
    });

    // Today's classes
    const today = new Date().toLocaleDateString("id-ID", { weekday: "long" });
    supabase.from("classes").select("id, name, time_start, time_end, capacity, enrolled, class_coaches(profile:profiles(full_name, id))")
      .eq("branch_id", branchId).eq("status", "active").contains("schedule_days", [today]).limit(6)
      .then(({ data }) => { if (data) setTodayClasses(data as unknown as ClassRow[]); });

    // Alert: classes with no active coach (all coaches suspended or no coach assigned)
    supabase.from("classes").select("id, name, class_coaches(coach:profiles(id, suspend_until))")
      .eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => {
        if (!data) return;
        const now = new Date();
        const noActiveCoach = data.filter((c) => {
          const coaches = (c as unknown as { class_coaches: { coach: { id: string; suspend_until: string | null } | null }[] }).class_coaches ?? [];
          if (coaches.length === 0) return true; // no coach assigned
          return coaches.every((cc) => {
            const suspUntil = cc.coach?.suspend_until;
            return suspUntil != null && new Date(suspUntil) >= now;
          });
        });
        setClassesWithoutCoach(noActiveCoach.map(c => ({ id: c.id, name: c.name })));
      });

    // Initial attendance load
    loadAttendance();

    // Realtime: new coach clock-ins → refresh attendance panel
    const channel = supabase.channel(`live_att:${branchId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "coach_attendances",
        filter: `branch_id=eq.${branchId}`,
      }, () => { loadAttendance(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [branchId, loadAttendance]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-6">
      {classesWithoutCoach.length > 0 && (
        <Card className="bg-danger-50 border-danger-300">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0"><Icon name="warning" className="w-5 h-5" /></span>
            <div className="flex-1">
              <div className="font-display font-bold text-danger-700">Kelas tanpa coach aktif</div>
              <p className="text-sm text-danger-600 mt-0.5">Kelas berikut tidak memiliki coach aktif — semua coach sedang disuspend atau belum di-assign. Segera assign coach pengganti.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {classesWithoutCoach.map((c) => (
                  <span key={c.id} className="px-2 py-1 rounded-lg bg-danger-100 text-danger-700 text-xs font-bold">{c.name}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Member aktif"  value={stats.members} icon="users"   tone="ocean" />
        <Stat label="Coach aktif"   value={stats.coaches} icon="swim"    tone="wave"  />
        <Stat label="Kelas aktif"   value={stats.classes} icon="grid"    tone="ocean" />
        <Stat label="Approvement"   value={stats.pending} icon="warning" tone="warn"  sub="Menunggu review" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <SectionTitle sub="Kelas hari ini">Kelas aktif hari ini</SectionTitle>
          {todayClasses.length === 0 ? (
            <p className="text-ink-mute text-sm">Tidak ada kelas hari ini.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {todayClasses.map((c) => {
                const coaches = c.class_coaches?.map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
                return (
                  <div key={c.id} className="rounded-xl border border-line hover:border-ocean-200 hover:shadow-card p-3.5 transition">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-ink text-sm">{c.name}</div>
                      <Status kind="active" className="!text-[10px]">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</Status>
                    </div>
                    <div className="text-xs text-ink-mute mt-1">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""} · {coaches[0] ?? "—"}</div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex -space-x-1.5">
                        {Array.from({ length: Math.min(4, c.enrolled) }).map((_, k) => <Avatar key={k} name={`M${k + 1}`} size={22} ring />)}
                        {c.enrolled > 4 && <span className="ml-2 text-[10px] font-bold text-ink-mute self-center">+{c.enrolled - 4}</span>}
                      </div>
                      <span className="text-[10px] font-mono text-ink-mute">{c.enrolled}/{c.capacity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle sub="Real-time">Live Attendance</SectionTitle>
          <div className="space-y-2.5">
            {recentAttendance.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-paper-tint">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.is_manual ? "bg-manual-50 text-manual-500" : "bg-wave-50 text-wave-600"}`}>
                  <Icon name={a.is_manual ? "edit" : "camera"} className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{a.profile?.full_name}</div>
                  <div className="text-[11px] text-ink-mute">{a.class?.name}</div>
                </div>
                <span className="text-[10px] font-mono text-ink-faint">{a.clock_in_time?.slice(0, 5)}</span>
              </div>
            ))}
            {recentAttendance.length === 0 && <p className="text-ink-mute text-sm">Belum ada absensi hari ini.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────

function AdminSettings({ branch, onRefresh, userId }: { branch: Branch | null; onRefresh: () => void; userId: string }) {
  const toast = useToast();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const [lat, setLat] = useState(branch?.lat?.toString() ?? "");
  const [lng, setLng] = useState(branch?.lng?.toString() ?? "");
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [waNumbers, setWaNumbers] = useState<string[]>(branch?.wa_numbers ?? []);
  const [saving, setSaving] = useState(false);

  // Admin profile state
  const [myPhone, setMyPhone] = useState("");
  const [myName, setMyName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("full_name, phone").eq("id", userId).single()
      .then(({ data }) => { if (data) { setMyName(data.full_name ?? ""); setMyPhone(data.phone ?? ""); } });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: { full_name: myName, phone: myPhone || null } }),
    });
    setSavingProfile(false);
    const json = await res.json() as { error?: string };
    if (!res.ok) return toast.error("Gagal menyimpan profil", json.error);
    toast.success("Profil diperbarui");
  };

  // Sync state when branch prop changes
  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from prop */
  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setAddress(branch.address ?? "");
      setLat(branch.lat?.toString() ?? "");
      setLng(branch.lng?.toString() ?? "");
      setWaNumbers(branch.wa_numbers ?? []);
    }
  }, [branch?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    if (!branch) return;
    setSaving(true);
    const clean = waNumbers.map(n => n.trim()).filter(Boolean);
    const { error } = await supabase.from("branches").update({ name, address, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null, wa_numbers: clean }).eq("id", branch.id);
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Settings disimpan");
    onRefresh();
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !branch) return;
    try {
      const url = await upload.logo(file, branch.id);
      if (url) { toast.success("Logo diperbarui"); onRefresh(); }
    } catch (err) {
      toast.error("Gagal upload logo", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 space-y-5">
          <SectionTitle sub="Wajib diisi pertama kali">Logo & Identitas Cabang</SectionTitle>
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-paper-tint flex items-center justify-center border border-line overflow-hidden">
              {branch?.logo_url ? <Image src={branch.logo_url} alt="logo" width={96} height={96} className="w-full h-full object-cover" /> : <Logo size={64} />}
            </div>
            <div>
              <div className="font-display font-bold text-ink">Logo Cabang</div>
              <p className="text-xs text-ink-mute mt-1 max-w-xs">Rasio 1:1, max 2MB.</p>
              <label className="mt-2.5 inline-flex cursor-pointer">
                <Btn variant="primary" size="sm" icon="upload" disabled={uploading}>Upload baru</Btn>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogo} />
              </label>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-line">
            <Field label="Nama cabang" required><Input value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Alamat lengkap" required><Input value={address} onChange={e => setAddress(e.target.value)} /></Field>
          </div>
          <div className="pt-5 border-t border-line">
            <Field label="Nomor WhatsApp Admin" hint="Dipakai otomatis di tombol 'Hubungi Admin'. Format: 081234567890. Bisa lebih dari satu.">
              <div className="space-y-2">
                {waNumbers.map((num, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="tel"
                      value={num}
                      onChange={e => setWaNumbers(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                      placeholder="Mis. 081234567890"
                      className="flex-1 font-mono"
                    />
                    <button onClick={() => setWaNumbers(prev => prev.filter((_, j) => j !== i))} className="w-9 h-9 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center border border-line shrink-0">
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Btn variant="ghost" size="sm" icon="plus" onClick={() => setWaNumbers(prev => [...prev, ""])}>Tambah nomor</Btn>
              </div>
            </Field>
          </div>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan perubahan"}</Btn>
        </Card>
        <div className="space-y-5">
        <Card>
          <SectionTitle sub="Untuk validasi absensi coach">Koordinat Lokasi</SectionTitle>
          <MapPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Latitude"><Input value={lat} onChange={e => setLat(e.target.value)} className="font-mono" placeholder="-6.2615" /></Field>
            <Field label="Longitude"><Input value={lng} onChange={e => setLng(e.target.value)} className="font-mono" placeholder="106.8106" /></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <SectionTitle sub="Data akun Anda">Profil Saya</SectionTitle>
          <Field label="Nama lengkap"><Input value={myName} onChange={e => setMyName(e.target.value)} /></Field>
          <Field label="Nomor WhatsApp" hint="Tampil di profil admin"><Input type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder="081234567890" className="font-mono" /></Field>
          <Btn variant="primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Menyimpan…" : "Simpan profil"}</Btn>
        </Card>
        </div>
      </div>
    </div>
  );
}

// ── Class ──────────────────────────────────────────────────────────────────────

interface Criterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}

const EMPTY_CLASS_FORM = { name: "", class_type: "reguler", schedule_days: [] as string[], time_start: "", time_end: "", capacity: "", price_monthly: "", price_per_session: "", show_on_landing: true, goals: "" };
const DAY_OPTS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

function AdminClass({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [saving, setSaving] = useState(false);

  // Create / Edit class modal
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);

  // Criteria (aspek penilaian) modal
  const [criteriaClass, setCriteriaClass] = useState<ClassRow | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: "" });
  const [savingCriterion, setSavingCriterion] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, schedule_days, time_start, time_end, show_on_landing, class_coaches(profile:profiles(full_name, id))")
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
    setForm({ name: c.name, class_type: c.class_type ?? "reguler", schedule_days: c.schedule_days ?? [], time_start: c.time_start ?? "", time_end: c.time_end ?? "", capacity: c.capacity ? String(c.capacity) : "", price_monthly: c.price_monthly ? String(c.price_monthly) : "", price_per_session: c.price_per_session ? String(c.price_per_session) : "", show_on_landing: c.show_on_landing ?? false, goals: "" });
    setOpenForm(true);
  };

  const isPrivate = form.class_type === "private";

  const saveClass = async () => {
    if (!form.name) return toast.error("Nama kelas wajib diisi");
    if (!isPrivate && form.schedule_days.length === 0) return toast.error("Hari sesi wajib diisi untuk kelas reguler");
    setSaving(true);
    if (editTarget) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload = {name: form.name, class_type: form.class_type, schedule_days: isPrivate ? (form.schedule_days.length > 0 ? form.schedule_days : []) : form.schedule_days, time_start: form.time_start || null, time_end: form.time_end || null, capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, show_landing: form.show_on_landing} as any;
      const { error } = await supabase.from("classes").update(updatePayload).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error("Gagal update kelas", error.message);
      toast.success("Kelas diperbarui");
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload = {name: form.name, class_type: form.class_type, schedule_days: isPrivate ? (form.schedule_days.length > 0 ? form.schedule_days : []) : form.schedule_days, time_start: form.time_start || null, time_end: form.time_end || null, capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, show_landing: form.show_on_landing, goal: form.goals, branch_id: branchId, status: "active", enrolled: 0} as any;
      const { error } = await supabase.from("classes").insert(insertPayload);
      setSaving(false);
      if (error) return toast.error("Gagal membuat kelas", error.message);
      toast.success("Kelas dibuat");
    }
    setOpenForm(false);
    load();
  };

  const archiveClass = async (c: ClassRow) => {
    const yes = await confirm(`Arsipkan kelas "${c.name}"?`);
    if (!yes) return;
    await supabase.from("classes").update({ status: "archived" }).eq("id", c.id);
    toast.success("Kelas diarsipkan");
    load();
  };

  const toggleDay = (d: string) => setForm(f => ({ ...f, schedule_days: f.schedule_days.includes(d) ? f.schedule_days.filter(x => x !== d) : [...f.schedule_days, d] }));

  // ── Criteria ───────────────────────────────────────────────────────────────
  const openCriteria = async (c: ClassRow) => {
    setCriteriaClass(c);
    setLoadingCriteria(true);
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", c.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
    setLoadingCriteria(false);
    setCriterionForm({ label: "", kind: "score_10", options: "" });
  };

  const addCriterion = async () => {
    if (!criteriaClass || !criterionForm.label) return toast.error("Label wajib diisi");
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.split("\n").map(s => s.trim()).filter(Boolean) : null;
    const { error } = await supabase.from("class_criteria").insert({
      class_id: criteriaClass.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Aspek penilaian ditambahkan");
    setCriterionForm({ label: "", kind: "score_10", options: "" });
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", criteriaClass.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm("Hapus aspek penilaian ini? Data rapor yang sudah diisi tidak akan terpengaruh.");
    if (!yes) return;
    await supabase.from("class_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success("Aspek penilaian dihapus");
  };

  const kindLabel: Record<string, string> = { score_10: "Nilai 1–10", score_100: "Nilai 1–100", choice: "Pilihan ganda", text: "Teks bebas" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Manajemen Kelas</h2><p className="text-ink-mute text-sm mt-0.5">Buat kelas, atur jadwal, dan konfigurasi aspek penilaian.</p></div>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Tambah Kelas</Btn>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((c) => {
          const coachNames = c.class_coaches?.map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
          const pct = c.enrolled / (c.capacity || 1);
          return (
            <Card key={c.id} padded={false} className="overflow-hidden">
              <div className="relative">
                <Placeholder label={c.id} ratio="16/9" className="rounded-none border-0" />
                <div className="absolute top-3 left-3 right-3 flex justify-between gap-2">
                  {c.show_on_landing && <Status kind="active" className="!bg-white/95">Tampil di landing</Status>}
                </div>
              </div>
              <div className="p-4">
                <div className="font-display font-bold text-ink">{c.name}</div>
                <div className="text-xs text-ink-mute mt-0.5">{(c.schedule_days ?? []).join(", ")} · {c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
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
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                  <div className="font-display font-bold text-ocean-700">{fmtIDR(c.price_monthly)}<span className="text-xs text-ink-mute font-semibold">/bln</span></div>
                  <div className="flex gap-1">
                    <button onClick={() => openCriteria(c)} title="Aspek penilaian" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="book" className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(c)} title="Edit kelas" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                    <button onClick={() => archiveClass(c)} title="Arsipkan" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-danger-500 flex items-center justify-center"><Icon name="archive" className="w-4 h-4" /></button>
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
                <Field label="Harga/bulan" required><Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))} className="font-mono" placeholder="550000" min="0" /></Field>
              </>
            )}
            {isPrivate && (
              <Field label="Harga per sesi" hint="Rp per pertemuan"><Input type="number" value={form.price_per_session} onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value }))} className="font-mono" placeholder="150000" min="0" /></Field>
            )}
            <Field label="Jam mulai"><Input type="time" value={form.time_start} onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))} /></Field>
            <Field label="Jam selesai"><Input type="time" value={form.time_end} onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))} /></Field>
          </div>
          <Field label={isPrivate ? "Preferensi hari latihan" : "Hari sesi"} required={!isPrivate} hint={isPrivate ? "Opsional — hanya sebagai info" : "Pilih satu atau lebih"}>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAY_OPTS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${form.schedule_days.includes(d) ? "bg-ocean-700 text-white border-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  {d.slice(0,3)}
                </button>
              ))}
            </div>
          </Field>
          {!editTarget && <Field label="Tujuan kelas"><Textarea rows={2} value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder="Mis. Pengenalan air, blowing bubbles." /></Field>}
          {!isPrivate && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-ocean-50/50 border border-ocean-100">
              <div><div className="font-semibold text-ink text-sm">Tampilkan di landing page</div><div className="text-xs text-ink-mute">Kelas akan muncul di section Swimming Programs.</div></div>
              <Switch checked={form.show_on_landing} onChange={v => setForm(f => ({ ...f, show_on_landing: v }))} />
            </div>
          )}
          {editTarget && coaches.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">Coach yang mengajar</div>
              <div className="flex flex-wrap gap-2">
                {editTarget.class_coaches?.map(cc => cc.profile && (
                  <span key={cc.profile.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold">
                    <Avatar name={cc.profile.full_name ?? ""} size={18} />{cc.profile.full_name}
                  </span>
                ))}
                {(editTarget.class_coaches?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">Belum ada coach assigned</span>}
              </div>
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
                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-paper-tint">
                      <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm">{cr.label}</div>
                        <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? cr.kind}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                      </div>
                      <button onClick={() => deleteCriterion(cr.id)} className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0"><Icon name="x" className="w-3.5 h-3.5" /></button>
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
                  <Field label="Pilihan jawaban" hint="Satu pilihan per baris">
                    <Textarea rows={3} value={criterionForm.options} onChange={e => setCriterionForm(f => ({ ...f, options: e.target.value }))} placeholder={"Sangat Baik\nBaik\nCukup\nPerlu Latihan"} />
                  </Field>
                )}
                <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? "Menyimpan…" : "Tambah Aspek"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ── Member ─────────────────────────────────────────────────────────────────────

function AdminMember({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("all");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", email: "", password: "", jumlah_sesi: "" });
  const [openAddSesi, setOpenAddSesi] = useState(false);
  const [addSesiForm, setAddSesiForm] = useState({ jumlah: "", generate_bill: false });
  const [savingAddSesi, setSavingAddSesi] = useState(false);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const db = createClient();
    const sel = "id, profile_id, type, status, date_start, qr_code, school_id, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email), member_classes(class:classes(id, name))";
    let q = db.from("members").select(sel).eq("branch_id", branchId).order("created_at", { ascending: false });
    if (tab === "suspended") q = db.from("members").select(sel).eq("branch_id", branchId).eq("status", "suspended") as typeof q;
    else if (tab !== "all") q = q.eq("type", tab as "reguler" | "private" | "school_affiliate");
    const { data } = await q;
    if (data) setMembers(data as unknown as MemberRow[]);
    setLoading(false);
  }, [branchId, tab]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    supabase.from("classes").select("id, name, capacity, enrolled, status, branch_id, schedule_days, time_start, time_end, price_monthly, price_per_session, class_type, show_on_landing").eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
    supabase.from("schools").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setSchoolsList(data as School[]); });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMember = async () => {
    if (!form.full_name || !form.email || !form.password) return toast.error("Nama, email, dan password wajib diisi");
    if (form.type === "private" && !form.jumlah_sesi) return toast.error("Jumlah sesi wajib diisi untuk member private");
    // Capacity check
    if (form.class_id) {
      const cls = classes.find(c => c.id === form.class_id);
      if (cls && cls.enrolled >= cls.capacity) {
        const ok = await confirm({ body: `Kelas "${cls.name}" sudah penuh (${cls.enrolled}/${cls.capacity} member). Tetap lanjutkan?` });
        if (!ok) return;
      }
    }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email, password: form.password, full_name: form.full_name,
        role: "member", branch_id: branchId, phone: form.phone,
        birth_date: form.birth_date || null, gender: form.gender || null,
        address: form.address || null, health_notes: form.health_notes || null,
        member_type: form.type,
        school_id: form.type === "school_affiliate" ? form.school_id : null,
        class_id: form.class_id || null,
        total_sessions: form.type === "private" ? (Number(form.jumlah_sesi) || null) : null,
      }),
    });
    const json = await res.json() as { user_id?: string; error?: string };
    if (!res.ok) { toast.error("Gagal membuat akun", json.error); setSaving(false); return; }

    toast.success("Member dibuat", "Akun langsung aktif");
    setSaving(false);
    setOpenCreate(false);
    load();
  };

  const openEdit = (m: MemberRow) => {
    setEditMemberForm({
      full_name: m.profile?.full_name ?? "",
      birth_date: m.profile?.birth_date ?? "",
      gender: m.profile?.gender ?? "",
      phone: m.profile?.phone ?? "",
      phone_owner: "self",
      parent_name: "",
      parent_phone: "",
      address: m.profile?.address ?? "",
      health_notes: m.profile?.health_notes ?? "",
      type: m.type ?? "reguler",
      school_id: m.school_id ?? "",
      class_ids: m.member_classes?.map(mc => mc.class?.id).filter(Boolean) as string[] ?? [],
    });
    setOpenEditMember(true);
  };

  const saveMemberEdit = async () => {
    if (!detail) return;
    if (!editMemberForm.full_name) return toast.error("Nama lengkap wajib diisi");
    setSavingEdit(true);

    // Update profiles
    const { error: profileErr } = await createClient().from("profiles").update({
      full_name: editMemberForm.full_name,
      birth_date: editMemberForm.birth_date || null,
      gender: editMemberForm.gender || null,
      phone: editMemberForm.phone || null,
      address: editMemberForm.address || null,
      health_notes: editMemberForm.health_notes || null,
    }).eq("id", detail.profile_id);
    if (profileErr) { setSavingEdit(false); return toast.error("Gagal update profil", profileErr.message); }

    // Update members row (type, school_id)
    await createClient().from("members").update({
      type: editMemberForm.type as "reguler" | "private" | "school_affiliate",
      school_id: editMemberForm.type === "school_affiliate" ? (editMemberForm.school_id || null) : null,
    }).eq("id", detail.id);

    // Sync kelas — add new, remove removed
    const prev = detail.member_classes?.map(mc => mc.class?.id).filter(Boolean) as string[] ?? [];
    const next = editMemberForm.class_ids;
    const toAdd = next.filter(id => !prev.includes(id));
    const toRemove = prev.filter(id => !next.includes(id));
    if (toAdd.length > 0) {
      // capacity check for new classes
      for (const cid of toAdd) {
        const cls = classes.find(c => c.id === cid);
        if (cls && cls.enrolled >= cls.capacity) {
          const ok = await confirm({ body: `Kelas "${cls.name}" sudah penuh (${cls.enrolled}/${cls.capacity}). Tetap tambahkan?` });
          if (!ok) { setSavingEdit(false); return; }
        }
      }
      await createClient().from("member_classes").insert(toAdd.map(class_id => ({ member_id: detail.id, class_id, joined_at: new Date().toISOString() })));
    }
    if (toRemove.length > 0) {
      await createClient().from("member_classes").delete().eq("member_id", detail.id).in("class_id", toRemove);
    }

    setSavingEdit(false);
    toast.success("Data member diperbarui");
    setOpenEditMember(false);
    load();
  };

  const resetPassword = async () => {
    if (!detail) return;
    if (!newPwd || newPwd.length < 6) return toast.error("Password minimal 6 karakter");
    const res = await fetch(`/api/admin/users/${detail.profile_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) { toast.success("Password direset"); setOpenResetPwd(false); setNewPwd(""); }
    else toast.error("Gagal reset password");
  };

  const [suspendMemberTarget, setSuspendMemberTarget] = useState<MemberRow | null>(null);
  const [suspendMemberForm, setSuspendMemberForm] = useState({ reason: "", until: "" });
  const [suspendingMember, setSuspendingMember] = useState(false);
  const [openEditMember, setOpenEditMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    full_name: "", birth_date: "", gender: "", phone: "", phone_owner: "self",
    parent_name: "", parent_phone: "", address: "", health_notes: "",
    type: "reguler", school_id: "", class_ids: [] as string[],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [openResetPwd, setOpenResetPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");

  const doSuspendMember = async () => {
    if (!suspendMemberTarget || !suspendMemberForm.reason || !suspendMemberForm.until) return toast.error("Alasan dan tanggal berakhir wajib diisi");
    setSuspendingMember(true);
    const { error } = await supabase.from("members")
      .update({ status: "suspended", suspend_until: suspendMemberForm.until, suspend_reason: suspendMemberForm.reason })
      .eq("id", suspendMemberTarget.id);
    setSuspendingMember(false);
    if (error) return toast.error("Gagal suspend member", error.message);
    toast.success(`${suspendMemberTarget.profile?.full_name ?? "Member"} di-suspend`);
    setSuspendMemberTarget(null);
    setDetail(null);
    load();
  };

  const liftSuspendMember = async (m: MemberRow) => {
    const { error } = await supabase.from("members")
      .update({ status: "active", suspend_until: null, suspend_reason: null })
      .eq("id", m.id);
    if (error) return toast.error("Gagal mengakhiri suspend", error.message);
    toast.success("Suspend diakhiri");
    setDetail(null);
    load();
  };

  const doAddSesi = async () => {
    if (!detail) return;
    const jumlah = Number(addSesiForm.jumlah);
    if (!jumlah || jumlah < 1) return toast.error("Jumlah sesi tidak valid");
    setSavingAddSesi(true);
    const db = createClient();
    const newTotal = (detail.total_sessions ?? 0) + jumlah;
    const newRemaining = (detail.remaining_sessions ?? 0) + jumlah;
    const { error } = await db.from("members")
      .update({ total_sessions: newTotal, remaining_sessions: newRemaining })
      .eq("id", detail.id);
    if (error) { setSavingAddSesi(false); return toast.error("Gagal menambah sesi", error.message); }

    if (addSesiForm.generate_bill) {
      const cls = detail.member_classes?.[0]?.class;
      const classRow = cls ? classes.find(c => c.id === cls.id) : null;
      const pricePerSession = classRow?.price_per_session ?? 0;
      if (pricePerSession > 0) {
        await db.from("bills").insert({
          member_id: detail.id, branch_id: branchId,
          period_label: `Tambah ${jumlah} sesi`,
          type: "session_pack" as "monthly",
          amount: pricePerSession * jumlah,
          discount: 0,
          total: pricePerSession * jumlah,
          status: "unpaid",
        });
      }
    }

    setSavingAddSesi(false);
    toast.success(`${jumlah} sesi ditambahkan`);
    setOpenAddSesi(false);
    setAddSesiForm({ jumlah: "", generate_bill: false });
    // Refresh detail
    const { data } = await db.from("members")
      .select("id, profile_id, type, status, date_start, qr_code, school_id, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email), member_classes(class:classes(id, name))")
      .eq("id", detail.id).single();
    if (data) setDetail(data as unknown as MemberRow);
    load();
  };

  const stats = {
    all:     members.length,
    reguler: members.filter(m => m.type === "reguler").length,
    private: members.filter(m => m.type === "private").length,
    school:  members.filter(m => m.type === "school_affiliate").length,
  };

  const filtered = tab === "suspended" ? members.filter(m => m.status === "suspended") : (tab === "all" ? members : members.filter(m => m.type === tab));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Manajemen Member</h2><p className="text-ink-mute text-sm mt-0.5">CRUD member, suspend, dan reset password.</p></div>
        <div className="flex gap-2"><Btn variant="primary" icon="plus" onClick={() => { setForm({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", email: "", password: "", jumlah_sesi: "" }); setOpenCreate(true); }}>Tambah Member</Btn></div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total aktif"       value={stats.all}     icon="users"   tone="ocean" />
        <Stat label="Reguler"           value={stats.reguler} icon="grid"    tone="wave"  />
        <Stat label="Private"           value={stats.private} icon="sparkle" tone="ocean" />
        <Stat label="Afiliasi sekolah"  value={stats.school}  icon="school"  tone="ocean" />
      </div>
      <Card padded={false}>
        <div className="px-5 py-3 border-b border-line flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1">
            {[["all", "Semua"], ["reguler", "Reguler"], ["private", "Private"], ["school_affiliate", "Afiliasi"], ["suspended", "Suspend"]].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">Member</th>
                <th className="text-left py-3 font-bold">Tipe</th>
                <th className="text-left py-3 font-bold">Kelas</th>
                <th className="text-left py-3 font-bold">Status</th>
                <th className="px-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((m) => {
                const cls = m.member_classes?.map(mc => mc.class?.name).filter(Boolean).join(", ") ?? "—";
                const fullName = m.profile?.full_name ?? "—";
                const age = m.profile?.birth_date ? calcAge(m.profile.birth_date) : null;
                return (
                  <tr key={m.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => setDetail(m)}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3"><Avatar name={fullName} size={38} /><div><div className="font-semibold text-ink">{fullName}</div>{age && <div className="text-xs text-ink-mute">{age} thn</div>}</div></div>
                    </td>
                    <td><Status kind={m.type === "private" ? "substitute" : m.type === "school_affiliate" ? "school_covered" : "active"} dot={false}>{m.type === "reguler" ? "Reguler" : m.type === "private" ? "Private" : "Afiliasi"}</Status></td>
                    <td className="text-ink-soft text-xs">{cls}</td>
                    <td><Status kind={m.status === "suspended" ? "suspended" : "active"}>{m.status === "suspended" ? "Suspend" : "Aktif"}</Status></td>
                    <td className="px-5"><button className="text-ink-mute hover:text-ocean-600 p-1.5"><Icon name="eye" className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-ink-mute">Tidak ada member</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.profile?.full_name ?? ""} size="xl"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Tutup</Btn>
            <Btn variant="outline" icon="edit" onClick={() => detail && openEdit(detail)}>Edit Data</Btn>
            <Btn variant="outline" icon="refresh" onClick={() => { setOpenResetPwd(true); setNewPwd(""); }}>Reset Password</Btn>
            {detail?.type === "private" && (
              <Btn variant="accent" icon="plus" onClick={() => { setOpenAddSesi(true); setAddSesiForm({ jumlah: "", generate_bill: false }); }}>Tambah Sesi</Btn>
            )}
            {detail?.status !== "suspended"
              ? <Btn variant="ghost" className="text-warn-600" onClick={() => { setSuspendMemberTarget(detail); setSuspendMemberForm({ reason: "", until: "" }); }}>Suspend</Btn>
              : <Btn variant="soft" size="sm" icon="check" onClick={() => detail && liftSuspendMember(detail)}>Akhiri Suspend</Btn>
            }
          </>
        }>
        {detail && (() => {
          const p = detail.profile;
          const age = p?.birth_date ? calcAge(p.birth_date) : null;
          return (
            <div className="grid md:grid-cols-3 gap-5">
              {/* Left: avatar + QR */}
              <div className="text-center">
                <div className="mx-auto"><Avatar name={p?.full_name ?? ""} size={96} /></div>
                <div className="font-display font-bold text-lg text-ink mt-3">{p?.full_name ?? "—"}</div>
                {age && <div className="text-xs text-ink-mute">{age} tahun</div>}
                <div className="mt-4 flex justify-center"><QRBox value={detail.qr_code ?? detail.id} size={120} /></div>
                <div className="text-[9px] text-ink-faint font-mono mt-1 break-all">{detail.qr_code ?? detail.id}</div>
                {p?.phone ? (
                  <a href={`https://wa.me/62${p.phone.replace(/^0/, "").replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${p.full_name}, `)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                    <Btn variant="wa" size="sm" icon="whatsapp">Hubungi Member</Btn>
                  </a>
                ) : (
                  <div className="mt-3 text-xs text-ink-faint">No HP tidak tersedia</div>
                )}
              </div>

              {/* Right: detail info */}
              <div className="md:col-span-2 space-y-4 text-sm">
                {/* Row 1: Tipe / Sejak / Sisa Sesi / Jenis Kelamin */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tipe</div><div className="font-semibold text-ink capitalize">{detail.type === "reguler" ? "Reguler" : detail.type === "private" ? "Private" : "Afiliasi Sekolah"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sejak</div><div className="font-semibold text-ink">{fmtDate(detail.date_start)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sisa sesi</div><div className="font-semibold text-ink">{detail.remaining_sessions != null ? `${detail.remaining_sessions} / ${detail.total_sessions ?? "—"}` : "—"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Jenis kelamin</div><div className="font-semibold text-ink">{p?.gender === "male" ? "Laki-laki" : p?.gender === "female" ? "Perempuan" : "—"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tanggal lahir</div><div className="font-semibold text-ink">{p?.birth_date ? fmtDate(p.birth_date) : "—"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Email</div><div className="font-semibold text-ink text-xs break-all">{p?.email ?? "—"}</div></div>
                </div>

                {/* Contact */}
                <div className="pt-3 border-t border-line grid grid-cols-2 gap-x-4 gap-y-3">
                  <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">No HP</div><div className="font-semibold text-ink font-mono text-xs">{p?.phone ?? "—"}</div></div>
                </div>

                {/* Address & health */}
                {(p?.address || p?.health_notes) && (
                  <div className="pt-3 border-t border-line space-y-2">
                    {p?.address && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">Alamat</div><div className="text-ink-soft leading-snug">{p.address}</div></div>}
                    {p?.health_notes && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">Catatan kesehatan</div><div className="text-ink-soft leading-snug">{p.health_notes}</div></div>}
                  </div>
                )}

                {/* Suspend info */}
                {detail.status === "suspended" && (
                  <div className="pt-3 border-t border-line bg-warn-50 rounded-xl px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-warn-500">Suspend s.d.</div>
                    <div className="font-semibold text-warn-700">{fmtDate(detail.suspend_until ?? "")}</div>
                    {detail.suspend_reason && <div className="text-xs text-warn-600 mt-0.5">{detail.suspend_reason}</div>}
                  </div>
                )}

                {/* Classes */}
                <div className="pt-3 border-t border-line">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">Kelas yang diikuti</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.member_classes?.map((mc, i) => mc.class && <span key={i} className="px-2 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold">{mc.class.name}</span>)}
                    {(detail.member_classes?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">Belum assign ke kelas</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit member modal */}
      <Modal open={openEditMember} onClose={() => setOpenEditMember(false)} title={`Edit Member — ${detail?.profile?.full_name ?? ""}`} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditMember(false)}>Batal</Btn><Btn variant="primary" onClick={saveMemberEdit} disabled={savingEdit}>{savingEdit ? "Menyimpan…" : "Simpan Perubahan"}</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Identitas */}
          <Field label="Nama lengkap" required><Input value={editMemberForm.full_name} onChange={e => setEditMemberForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Tanggal lahir"><Input type="date" value={editMemberForm.birth_date} onChange={e => setEditMemberForm(f => ({ ...f, birth_date: e.target.value }))} /></Field>
          <Field label="Jenis kelamin">
            <Select value={editMemberForm.gender} onChange={e => setEditMemberForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">— pilih —</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </Select>
          </Field>
          <Field label="Tipe member" required>
            <Select value={editMemberForm.type} onChange={e => setEditMemberForm(f => ({ ...f, type: e.target.value }))}>
              <option value="reguler">Reguler</option>
              <option value="private">Private</option>
              <option value="school_affiliate">Afiliasi Sekolah</option>
            </Select>
          </Field>
          {editMemberForm.type === "school_affiliate" && (
            <Field label="Sekolah afiliasi">
              <Select value={editMemberForm.school_id} onChange={e => setEditMemberForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">— pilih sekolah —</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          )}
          {/* Kontak */}
          <Field label="No HP / WA member"><Input type="tel" value={editMemberForm.phone} onChange={e => setEditMemberForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Pemilik kontak">
            <Select value={editMemberForm.phone_owner} onChange={e => setEditMemberForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">Milik member sendiri</option>
              <option value="parent">Milik orang tua / wali</option>
            </Select>
          </Field>
          {editMemberForm.phone_owner === "parent" && (
            <>
              <Field label="Nama orang tua / wali"><Input value={editMemberForm.parent_name} onChange={e => setEditMemberForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
              <Field label="No HP orang tua / wali"><Input type="tel" value={editMemberForm.parent_phone} onChange={e => setEditMemberForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
            </>
          )}
          <Field label="Alamat" className="sm:col-span-2"><Textarea rows={2} value={editMemberForm.address} onChange={e => setEditMemberForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. ..." /></Field>
          <Field label="Catatan kesehatan" className="sm:col-span-2" hint="Alergi, kondisi khusus, dll."><Textarea rows={2} value={editMemberForm.health_notes} onChange={e => setEditMemberForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
          {/* Kelas — multi-select checkboxes */}
          <div className="sm:col-span-2">
            <div className="text-sm font-semibold text-ink mb-2">Kelas yang diikuti</div>
            {classes.length === 0 ? (
              <div className="text-sm text-ink-mute">Belum ada kelas aktif di cabang ini.</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {classes.map(cls => {
                  const checked = editMemberForm.class_ids.includes(cls.id);
                  return (
                    <button key={cls.id} type="button"
                      onClick={() => setEditMemberForm(f => ({ ...f, class_ids: checked ? f.class_ids.filter(id => id !== cls.id) : [...f.class_ids, cls.id] }))}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                        {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink truncate">{cls.name}</div>
                        <div className="text-xs text-ink-mute">{cls.enrolled}/{cls.capacity} · {cls.time_start?.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={openResetPwd} onClose={() => setOpenResetPwd(false)} title={`Reset Password — ${detail?.profile?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenResetPwd(false)}>Batal</Btn><Btn variant="primary" onClick={resetPassword}>Reset Password</Btn></>}>
        <Field label="Password baru" hint="Min. 6 karakter"><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" /></Field>
      </Modal>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Tambah Member Baru" size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>Batal</Btn><Btn variant="primary" onClick={createMember} disabled={saving}>{saving ? "Menyimpan…" : "Simpan & kirim WA"}</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nama lengkap" required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Tanggal lahir"><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></Field>
          <Field label="Jenis kelamin">
            <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">— pilih —</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </Select>
          </Field>
          <Field label="Tipe member" required>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="reguler">Reguler</option><option value="private">Private</option><option value="school_affiliate">Afiliasi Sekolah</option>
            </Select>
          </Field>
          {form.type === "school_affiliate" && (
            <Field label="Sekolah afiliasi">
              <Select value={form.school_id} onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">— pilih sekolah —</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Assign kelas" hint={form.type === "private" ? "Hanya kelas private" : "Hanya kelas reguler"}>
            <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">— pilih kelas —</option>
              {classes.filter(c => c.class_type === form.type || (form.type === "school_affiliate" && c.class_type === "reguler")).map(c => <option key={c.id} value={c.id}>{c.name} ({c.enrolled}/{c.capacity})</option>)}
            </Select>
          </Field>
          {form.type === "private" && (
            <Field label="Jumlah sesi" required hint={`Harga/sesi: ${classes.find(c => c.id === form.class_id)?.price_per_session ? fmtIDR(classes.find(c => c.id === form.class_id)!.price_per_session!) : "—"}`}>
              <Input type="number" min="1" value={form.jumlah_sesi} onChange={e => setForm(f => ({ ...f, jumlah_sesi: e.target.value }))} placeholder="Mis. 8" />
            </Field>
          )}
          <Field label="No HP / WA member">
            <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Pemilik kontak">
            <Select value={form.phone_owner} onChange={e => setForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">Milik member sendiri</option>
              <option value="parent">Milik orang tua / wali</option>
            </Select>
          </Field>
          {form.phone_owner === "parent" && (
            <>
              <Field label="Nama orang tua / wali"><Input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
              <Field label="No HP orang tua / wali"><Input type="tel" value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
            </>
          )}
          <Field label="Alamat" className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. ..." /></Field>
          <Field label="Catatan kesehatan" className="sm:col-span-2" hint="Alergi, kondisi khusus, dll."><Textarea rows={2} value={form.health_notes} onChange={e => setForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
          <Field label="Email login" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Password" required hint="Min. 6 karakter"><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* Suspend member modal */}
      <Modal open={!!suspendMemberTarget} onClose={() => setSuspendMemberTarget(null)} title={`Suspend Member — ${suspendMemberTarget?.profile?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendMemberTarget(null)}>Batal</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspendMember} disabled={suspendingMember}>{suspendingMember ? "Menyimpan…" : "Terapkan Suspend"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>Member tidak bisa login selama masa suspend dan tidak muncul di daftar absensi coach.</span></div>
          </Card>
          <Field label="Alasan suspend" required>
            <Textarea rows={2} value={suspendMemberForm.reason} onChange={e => setSuspendMemberForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Belum membayar tagihan selama 2 bulan." />
          </Field>
          <Field label="Suspend berakhir" required hint="Member otomatis aktif kembali setelah tanggal ini">
            <Input type="date" value={suspendMemberForm.until} onChange={e => setSuspendMemberForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* Tambah Sesi modal */}
      <Modal open={openAddSesi} onClose={() => setOpenAddSesi(false)} title={`Tambah Sesi — ${detail?.profile?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAddSesi(false)}>Batal</Btn><Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? "Menyimpan…" : "Tambah Sesi"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Jumlah sesi yang ditambahkan" required>
            <Input type="number" min="1" value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} placeholder="Mis. 8" />
          </Field>
          <div className="flex items-center justify-between p-3 rounded-xl bg-ocean-50/50 border border-ocean-100">
            <div><div className="font-semibold text-ink text-sm">Generate tagihan</div><div className="text-xs text-ink-mute">Buat tagihan otomatis berdasarkan harga per sesi.</div></div>
            <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
          </div>
          {addSesiForm.generate_bill && detail?.member_classes?.[0]?.class && (() => {
            const classRow = classes.find(c => c.id === detail.member_classes![0].class!.id);
            const pricePerSession = classRow?.price_per_session;
            const jumlah = Number(addSesiForm.jumlah) || 0;
            return pricePerSession ? (
              <div className="bg-paper-tint rounded-xl p-3 text-sm">
                <div className="text-ink-mute">Tagihan yang akan dibuat:</div>
                <div className="font-bold text-ink mt-1">{fmtIDR(pricePerSession * jumlah)}</div>
                <div className="text-xs text-ink-mute">{jumlah} sesi × {fmtIDR(pricePerSession)}</div>
              </div>
            ) : (
              <div className="text-xs text-warn-600">Harga per sesi belum diset di kelas ini.</div>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
}

// ── Coach ──────────────────────────────────────────────────────────────────────

interface CoachFull extends CoachProfile {
  suspend_until?: string | null;
  suspend_reason?: string | null;
  is_archived?: boolean | null;
  class_coaches?: { class_id: string; class?: { id: string; name: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null } | null }[];
}

const EMPTY_COACH_FORM = { full_name: "", email: "", phone: "", password: "", specialization: "" };

function AdminCoach({ branchId }: { branchId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [coaches, setCoaches] = useState<CoachFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // create
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_COACH_FORM);
  const [coachCredential, setCoachCredential] = useState<{ full_name: string; email: string; password: string; phone: string } | null>(null);

  // detail panel
  const [detail, setDetail] = useState<CoachFull | null>(null);

  // edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", specialization: "" });
  const [editSaving, setEditSaving] = useState(false);

  // suspend
  const [suspendTarget, setSuspendTarget] = useState<CoachFull | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [suspendForm, setSuspendForm] = useState({ reason: "", until: "" });

  // reset password
  const [openReset, setOpenReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  // assign class
  const [openAssign, setOpenAssign] = useState(false);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null }[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const { data, error } = await createClient().from("profiles")
      .select("id, full_name, email, phone, specialization, suspend_until, suspend_reason, is_archived, certifications!certifications_coach_id_fkey(name, title, status), class_coaches(class_id, class:classes(id, name, time_start, time_end, schedule_days))")
      .eq("branch_id", branchId).eq("role", "coach").order("full_name");
    if (error) console.error("[AdminCoach] query error:", JSON.stringify(error));
    if (data) setCoaches(data as unknown as CoachFull[]);
    setLoading(false);
  }, [branchId]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isSuspended = (c: CoachFull) => !c.is_archived && !!c.suspend_until && new Date(c.suspend_until) >= new Date();
  const isArchived = (c: CoachFull) => !!c.is_archived;

  const coachStatus = (c: CoachFull) => {
    if (isArchived(c)) return "archived";
    if (isSuspended(c)) return "suspended";
    return "active";
  };

  const createCoach = async () => {
    if (!form.full_name || !form.email || !form.password) return toast.error("Nama, email, dan password wajib diisi");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "coach", branch_id: branchId }),
    });
    const json = await res.json() as { error?: string };
    if (!res.ok) { toast.error("Gagal membuat coach", json.error); setSaving(false); return; }
    setSaving(false);
    setOpenAdd(false);
    setCoachCredential({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone });
    setForm(EMPTY_COACH_FORM);
    load();
  };

  const saveEdit = async () => {
    if (!detail) return;
    if (!editForm.full_name) return toast.error("Nama wajib diisi");
    setEditSaving(true);
    const { error } = await createClient().from("profiles")
      .update({ full_name: editForm.full_name, phone: editForm.phone || null, specialization: editForm.specialization || null })
      .eq("id", detail.id);
    setEditSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Data coach diperbarui");
    setOpenEdit(false);
    setDetail(prev => prev ? { ...prev, ...editForm } : prev);
    load();
  };

  const doSuspend = async () => {
    if (!suspendTarget || !suspendForm.reason || !suspendForm.until) return toast.error("Alasan dan tanggal berakhir wajib diisi");
    setSuspending(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await createClient().from("profiles").update({ suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } as any).eq("id", suspendTarget.id);
    setSuspending(false);
    if (error) return toast.error("Gagal suspend coach", error.message);
    toast.success(`${suspendTarget.full_name} di-suspend hingga ${fmtDate(suspendForm.until)}`);
    setSuspendTarget(null);
    if (detail?.id === suspendTarget.id) setDetail(prev => prev ? { ...prev, suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } : prev);
    load();
  };

  const liftSuspend = async (c: CoachFull) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await createClient().from("profiles").update({ suspend_until: null, suspend_reason: null } as any).eq("id", c.id);
    if (error) return toast.error("Gagal mengakhiri suspend", error.message);
    toast.success("Suspend diakhiri");
    if (detail?.id === c.id) setDetail(prev => prev ? { ...prev, suspend_until: null, suspend_reason: null } : prev);
    load();
  };

  const toggleArchive = async (c: CoachFull) => {
    const archiving = !c.is_archived;
    const ok = await confirm({ body: archiving ? `Arsipkan coach ${c.full_name}? Coach tidak akan muncul di daftar aktif.` : `Aktifkan kembali coach ${c.full_name}?` });
    if (!ok) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await createClient().from("profiles").update({ is_archived: archiving } as any).eq("id", c.id);
    if (error) return toast.error("Gagal mengubah status", error.message);
    toast.success(archiving ? "Coach diarsipkan" : "Coach diaktifkan kembali");
    if (detail?.id === c.id) { setDetail(prev => prev ? { ...prev, is_archived: archiving } : prev); }
    load();
  };

  const deleteCoach = async (c: CoachFull) => {
    const ok = await confirm({ body: `Hapus permanen akun coach ${c.full_name}? Tindakan ini tidak bisa dibatalkan.`, danger: true, confirmLabel: "Hapus" });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      return toast.error("Gagal menghapus coach", j.error);
    }
    toast.success("Coach dihapus");
    setDetail(null);
    load();
  };

  const resetPassword = async () => {
    if (!detail || !newPassword || newPassword.length < 6) return toast.error("Password minimal 6 karakter");
    setResetSaving(true);
    const res = await fetch(`/api/admin/users/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const j = await res.json() as { error?: string };
    setResetSaving(false);
    if (!res.ok) return toast.error("Gagal reset password", j.error);
    toast.success("Password berhasil direset");
    setOpenReset(false);
    setNewPassword("");
  };

  const openAssignModal = async (c: CoachFull) => {
    const { data } = await createClient().from("classes")
      .select("id, name, time_start, time_end, schedule_days").eq("branch_id", branchId).eq("status", "active").order("name");
    if (data) setAllClasses(data as unknown as typeof allClasses);
    setAssignedClassIds(c.class_coaches?.map(cc => cc.class_id) ?? []);
    setOpenAssign(true);
  };

  const saveAssign = async () => {
    if (!detail) return;
    setAssignSaving(true);
    const current = detail.class_coaches?.map(cc => cc.class_id) ?? [];
    const toAdd = assignedClassIds.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !assignedClassIds.includes(id));
    if (toAdd.length > 0) {
      await createClient().from("class_coaches").insert(toAdd.map(class_id => ({ class_id, coach_id: detail.id, is_primary: false })));
    }
    if (toRemove.length > 0) {
      await createClient().from("class_coaches").delete().eq("coach_id", detail.id).in("class_id", toRemove);
    }
    setAssignSaving(false);
    toast.success("Kelas berhasil diperbarui");
    setOpenAssign(false);
    load();
  };

  const visibleCoaches = showArchived ? coaches : coaches.filter(c => !c.is_archived);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Manajemen Coach</h2>
          <p className="text-ink-mute text-sm mt-0.5">Coach cabang Anda.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {coaches.some(c => c.is_archived) && (
            <Btn variant="ghost" size="sm" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? "Sembunyikan Arsip" : `Tampilkan Arsip (${coaches.filter(c => c.is_archived).length})`}
            </Btn>
          )}
          <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_COACH_FORM); setOpenAdd(true); }}>Tambah Coach</Btn>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-ink-mute">Memuat data…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleCoaches.map((c) => {
            const activeCerts = c.certifications?.filter(ct => ct.status === "approved").map(ct => ct.title ?? ct.name) ?? [];
            const suspended = isSuspended(c);
            const archived = isArchived(c);
            const assignedClasses = c.class_coaches?.filter(cc => cc.class) ?? [];
            return (
              <Card key={c.id} className={archived ? "opacity-60" : ""}>
                <div className="flex items-start gap-3">
                  <Avatar name={c.full_name} size={52} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-bold text-ink truncate">{c.full_name}</div>
                      <Status kind={coachStatus(c) as "active" | "suspended" | "archived"}>
                        {archived ? "Diarsipkan" : suspended ? "Suspend" : "Aktif"}
                      </Status>
                    </div>
                    {c.specialization && <div className="text-xs text-ocean-700 font-semibold mt-1">{c.specialization}</div>}
                    {c.phone && <div className="text-xs text-ink-mute mt-0.5">{c.phone}</div>}
                    {suspended && c.suspend_until && <div className="text-xs text-warn-600 mt-1">Suspend s/d {fmtDate(c.suspend_until)}</div>}
                  </div>
                </div>

                {assignedClasses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {assignedClasses.slice(0, 3).map(cc => (
                      <span key={cc.class_id} className="text-[10px] font-semibold bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full">{cc.class?.name}</span>
                    ))}
                    {assignedClasses.length > 3 && <span className="text-[10px] text-ink-mute">+{assignedClasses.length - 3} lainnya</span>}
                  </div>
                )}
                {activeCerts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">Sertifikasi aktif</div>
                    <div className="flex flex-wrap gap-1">{activeCerts.map(s => <span key={s} className="text-[10px] font-semibold text-ok-700 bg-ok-50 px-1.5 py-0.5 rounded">{s}</span>)}</div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-line flex gap-2 flex-wrap">
                  <Btn variant="ghost" size="sm" icon="eye" onClick={() => setDetail(c)}>Detail</Btn>
                  {!archived && c.phone && (
                    <a href={waLink(`Halo ${c.full_name}, saya dari admin Next Swimming School.`, c.phone)} target="_blank" rel="noreferrer">
                      <Btn variant="ghost" size="sm" icon="whatsapp" className="text-ok-600">WA</Btn>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
          {visibleCoaches.length === 0 && (
            <p className="text-ink-mute col-span-3">{showArchived ? "Tidak ada coach diarsipkan." : "Belum ada coach di cabang ini."}</p>
          )}
        </div>
      )}

      {/* ── Detail panel ── */}
      {detail && (() => {
        const suspended = isSuspended(detail);
        const archived = isArchived(detail);
        const activeCerts = detail.certifications?.filter(ct => ct.status === "approved") ?? [];
        const assignedClasses = detail.class_coaches?.filter(cc => cc.class) ?? [];
        return (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={() => setDetail(null)} />
            <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-float flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-line px-5 py-4 flex items-center justify-between z-10">
                <div className="font-display font-bold text-lg">Detail Coach</div>
                <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-paper-tint text-ink-mute"><Icon name="close" className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Profile summary */}
                <div className="flex items-start gap-4">
                  <Avatar name={detail.full_name} size={64} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-xl text-ink">{detail.full_name}</div>
                    {detail.specialization && <div className="text-sm text-ocean-700 font-semibold mt-0.5">{detail.specialization}</div>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Status kind={coachStatus(detail) as "active" | "suspended" | "archived"}>
                        {archived ? "Diarsipkan" : suspended ? "Suspend" : "Aktif"}
                      </Status>
                      {activeCerts.length > 0 && <span className="text-xs text-ok-700 bg-ok-50 px-2 py-0.5 rounded-full font-semibold">{activeCerts.length} Sertifikat</span>}
                    </div>
                  </div>
                </div>

                {/* Suspend banner */}
                {suspended && (
                  <div className="p-3 rounded-xl bg-warn-50 border border-warn-200 space-y-1">
                    <div className="flex items-center gap-2 text-warn-700 font-semibold text-sm"><Icon name="warning" className="w-4 h-4" />Sedang Disuspend</div>
                    {detail.suspend_until && <div className="text-xs text-warn-600">Berakhir: {fmtDate(detail.suspend_until)}</div>}
                    {detail.suspend_reason && <div className="text-xs text-warn-600">Alasan: {detail.suspend_reason}</div>}
                  </div>
                )}

                {/* Contact info */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kontak</div>
                  <div className="bg-paper-tint rounded-xl divide-y divide-line">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-ink-mute">Email</span>
                      <span className="text-sm font-mono text-ink">{detail.email}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-ink-mute">No HP / WA</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink">{detail.phone ?? "—"}</span>
                        {detail.phone && (
                          <a href={waLink(`Halo ${detail.full_name}, saya dari admin Next Swimming School.`, detail.phone)} target="_blank" rel="noreferrer" className="text-ok-600 hover:text-ok-700">
                            <Icon name="whatsapp" className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR & ID */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">QR Coach</div>
                  <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-xl">
                    <QRBox size={80} />
                    <div>
                      <div className="text-xs text-ink-mute mb-1">ID Coach</div>
                      <div className="font-mono text-sm font-bold text-ink bg-white px-2 py-1 rounded border border-line">{detail.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Assigned classes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kelas yang Dihandle</div>
                    {!archived && <button onClick={() => openAssignModal(detail)} className="text-xs text-ocean-600 font-semibold hover:underline">Edit Assign</button>}
                  </div>
                  {assignedClasses.length === 0 ? (
                    <div className="p-3 rounded-xl bg-warn-50 border border-warn-100 text-xs text-warn-700 flex items-center gap-2">
                      <Icon name="warning" className="w-4 h-4 shrink-0" />Belum diassign ke kelas manapun
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedClasses.map(cc => (
                        <div key={cc.class_id} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                          <div>
                            <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
                            {cc.class?.schedule_days && <div className="text-xs text-ink-mute mt-0.5">{cc.class.schedule_days.join(", ")}{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Certifications */}
                {(detail.certifications?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sertifikasi</div>
                    <div className="space-y-2">
                      {detail.certifications!.map((ct, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                          <div>
                            <div className="font-semibold text-sm text-ink">{ct.title ?? ct.name}</div>
                            <div className="text-xs text-ink-mute">{ct.name}</div>
                          </div>
                          <Status kind={ct.status === "approved" ? "active" : ct.status === "pending" ? "pending" : "inactive"}>
                            {ct.status === "approved" ? "Aktif" : ct.status === "pending" ? "Review" : "Ditolak"}
                          </Status>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="sticky bottom-0 bg-white border-t border-line px-5 py-4 space-y-2">
                {!archived && (
                  <>
                    <div className="flex gap-2">
                      <Btn variant="outline" size="sm" icon="edit" className="flex-1" onClick={() => { setEditForm({ full_name: detail.full_name, phone: detail.phone ?? "", specialization: detail.specialization ?? "" }); setOpenEdit(true); }}>Edit Data</Btn>
                      <Btn variant="outline" size="sm" icon="lock" className="flex-1" onClick={() => { setNewPassword(""); setOpenReset(true); }}>Reset Password</Btn>
                    </div>
                    <div className="flex gap-2">
                      {suspended
                        ? <Btn variant="soft" size="sm" icon="check" className="flex-1" onClick={() => liftSuspend(detail)}>Akhiri Suspend</Btn>
                        : <Btn variant="ghost" size="sm" className="flex-1 text-warn-600" onClick={() => { setSuspendTarget(detail); setSuspendForm({ reason: "", until: "" }); }}>Suspend Coach</Btn>
                      }
                      <Btn variant="ghost" size="sm" className="flex-1 text-ink-mute" onClick={() => toggleArchive(detail)}>Arsipkan</Btn>
                    </div>
                  </>
                )}
                {archived && (
                  <div className="flex gap-2">
                    <Btn variant="soft" size="sm" icon="check" className="flex-1" onClick={() => toggleArchive(detail)}>Aktifkan Kembali</Btn>
                    <Btn variant="ghost" size="sm" className="flex-1 text-danger-600" onClick={() => deleteCoach(detail)}>Hapus Permanen</Btn>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Add coach modal ── */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Coach" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={createCoach} disabled={saving}>{saving ? "Membuat…" : "Buat Akun"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama lengkap" required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="No HP / WA"><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Spesialisasi"><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Teknik renang anak" /></Field>
          <Field label="Password awal" required><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* ── Edit coach modal ── */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Edit Data Coach" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenEdit(false)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama lengkap" required><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="No HP / WA"><Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Spesialisasi"><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Teknik renang anak" /></Field>
        </div>
      </Modal>

      {/* ── Suspend coach modal ── */}
      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={`Suspend Coach — ${suspendTarget?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendTarget(null)}>Batal</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspend} disabled={suspending}>{suspending ? "Menyimpan…" : "Terapkan Suspend"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>Coach tetap bisa login tapi tidak bisa melakukan aktivitas (Clock In, input rapor, dll) selama masa suspend.</span></div>
          </Card>
          <Field label="Alasan suspend" required>
            <Textarea rows={2} value={suspendForm.reason} onChange={e => setSuspendForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Pelanggaran prosedur kehadiran." />
          </Field>
          <Field label="Suspend berakhir" required hint="Coach otomatis aktif kembali setelah tanggal ini">
            <Input type="date" value={suspendForm.until} onChange={e => setSuspendForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* ── Reset password modal ── */}
      <Modal open={openReset} onClose={() => setOpenReset(false)} title={`Reset Password — ${detail?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenReset(false)}>Batal</Btn><Btn variant="primary" onClick={resetPassword} disabled={resetSaving}>{resetSaving ? "Mereset…" : "Reset Password"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-ocean-50 border-ocean-100">
            <div className="text-xs text-ocean-700">Password baru langsung aktif tanpa konfirmasi email. Sampaikan password baru ke coach.</div>
          </Card>
          <Field label="Password baru" required hint="Minimal 6 karakter">
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password baru…" />
          </Field>
        </div>
      </Modal>

      {/* ── Assign class modal ── */}
      <Modal open={openAssign} onClose={() => setOpenAssign(false)} title={`Assign Kelas — ${detail?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAssign(false)}>Batal</Btn><Btn variant="primary" onClick={saveAssign} disabled={assignSaving}>{assignSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <p className="text-sm text-ink-mute">Pilih kelas yang akan dihandle oleh coach ini.</p>
          {allClasses.length === 0 ? (
            <div className="text-sm text-ink-mute py-4 text-center">Belum ada kelas aktif di cabang ini.</div>
          ) : (
            <div className="space-y-2">
              {allClasses.map(cls => {
                const checked = assignedClassIds.includes(cls.id);
                return (
                  <button key={cls.id} onClick={() => setAssignedClassIds(ids => checked ? ids.filter(id => id !== cls.id) : [...ids, cls.id])}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                      {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink">{cls.name}</div>
                      {cls.schedule_days && <div className="text-xs text-ink-mute">{cls.schedule_days.join(", ")}{cls.time_start ? ` · ${cls.time_start.slice(0,5)}${cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}` : ""}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Coach credential popup ── */}
      <Modal open={!!coachCredential} onClose={() => setCoachCredential(null)} title="Akun Coach Dibuat" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setCoachCredential(null)}>Tutup</Btn>{coachCredential?.phone && <Btn variant="wa" icon="whatsapp" onClick={() => { const num = coachCredential.phone!.replace(/^0/, "").replace(/\D/g, ""); const msg = encodeURIComponent(`Halo ${coachCredential.full_name}, akun coach Anda telah dibuat.\n\nEmail: ${coachCredential.email}\nPassword: ${coachCredential.password}\n\nSilakan login di aplikasi Next Swimming School.`); window.open(`https://wa.me/62${num}?text=${msg}`, "_blank"); }}>Kirim via WA</Btn>}</>}>
        <div className="space-y-3">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-center gap-2 text-ok-700 font-semibold text-sm"><Icon name="check" className="w-4 h-4" />Akun berhasil dibuat</div>
          </Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">Nama</span>
              <span className="font-semibold text-sm">{coachCredential?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">Email</span>
              <span className="font-mono text-sm">{coachCredential?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">Password</span>
              <span className="font-mono text-sm bg-paper-deep px-2 py-0.5 rounded">{coachCredential?.password}</span>
            </div>
          </div>
          <p className="text-xs text-ink-mute">Simpan atau kirim kredensial ini ke coach. Password tidak bisa dilihat lagi setelah modal ini ditutup.</p>
        </div>
      </Modal>
    </div>
  );
}

// ── Class Activity ──────────────────────────────────────────────────────────────

const DAY_NAMES = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
const DAY_IDX: Record<string, number> = { Senin: 0, Selasa: 1, Rabu: 2, Kamis: 3, Jumat: 4, Sabtu: 5, Minggu: 6 };

// Calendar constants — 1 hour = PX_PER_HOUR pixels, start at CAL_START
const CAL_START = 6;   // 06:00
const CAL_END   = 22;  // 22:00 (exclusive label)
const PX_PER_HOUR = 64;

/** Convert "HH:MM:SS" or "HH:MM" to minutes-since-midnight */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

interface CalEvent {
  classId: string; name: string; coach: string;
  timeStart: string; timeEnd: string;
  days: number[]; isSub?: boolean;
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

interface HolidayEntry { id: string; class_id: string; holiday_date: string; reason: string | null }
interface CalEventExt extends CalEvent { isHoliday?: boolean; holidayId?: string }

function AdminClassActivity({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [events, setEvents] = useState<CalEventExt[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([]);

  // Holiday modal state
  const [openHoliday, setOpenHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ class_id: "", holiday_date: "", reason: "" });
  const [savingH, setSavingH] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].toISOString().slice(0, 10);
  const weekEnd   = weekDates[6].toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);

    const [{ data: cls }, { data: leaves }, { data: hols }] = await Promise.all([
      supabase.from("classes")
        .select("id, name, schedule_days, time_start, time_end, class_coaches(profile:profiles(full_name))")
        .eq("branch_id", branchId).eq("status", "active"),
      supabase.from("coach_leaves")
        .select("id, date_from, date_to, substitute:profiles!coach_leaves_substitute_id_fkey(full_name), coach_leave_classes(class_id)")
        .eq("status", "approved")
        .lte("date_from", weekEnd).gte("date_to", weekStart),
      supabase.from("class_holidays")
        .select("id, class_id, holiday_date, reason")
        .eq("branch_id", branchId)
        .gte("holiday_date", weekStart).lte("holiday_date", weekEnd),
    ]);

    if (!cls) { setLoading(false); return; }

    setAllClasses((cls as { id: string; name: string }[]).map(c => ({ id: c.id, name: c.name })));

    const holArr = (hols ?? []) as HolidayEntry[];
    setHolidays(holArr);

    const subMap: Record<string, string> = {};
    (leaves ?? []).forEach((l) => {
      const sub = (l as unknown as { substitute: { full_name: string } | null }).substitute;
      if (sub) {
        (l.coach_leave_classes ?? []).forEach((lc) => {
          subMap[(lc as unknown as { class_id: string }).class_id] = sub.full_name;
        });
      }
    });

    const holMap: Record<string, string> = {};
    holArr.forEach(h => { holMap[`${h.class_id}|${h.holiday_date}`] = h.id; });

    const evts: CalEventExt[] = (cls as unknown as {
      id: string; name: string; schedule_days: string[];
      time_start: string; time_end: string;
      class_coaches: { profile: { full_name: string } | null }[];
    }[]).flatMap((c) => {
      const coach = c.class_coaches?.[0]?.profile?.full_name ?? "—";
      const subName = subMap[c.id];
      return (c.schedule_days ?? []).map((day: string) => {
        const dayIdx = DAY_IDX[day] ?? -1;
        if (dayIdx < 0) return null;
        const dateStr = weekDates[dayIdx]?.toISOString().slice(0, 10);
        const holKey = `${c.id}|${dateStr}`;
        const holidayId = holMap[holKey];
        return {
          classId: c.id,
          name: c.name,
          coach: subName ? subName.split(" ")[0] : (coach === "—" ? "—" : coach.split(" ")[0]),
          timeStart: c.time_start ?? "00:00",
          timeEnd: c.time_end ?? c.time_start ?? "01:00",
          days: [dayIdx],
          isSub: !!subName,
          isHoliday: !!holidayId,
          holidayId,
        };
      }).filter(Boolean) as CalEventExt[];
    });

    setEvents(evts);
    setLoading(false);
  }, [branchId, weekStart, weekEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addHoliday = async () => {
    if (!holidayForm.class_id || !holidayForm.holiday_date) return toast.error("Kelas dan tanggal wajib diisi");
    setSavingH(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("class_holidays").upsert({
      class_id: holidayForm.class_id,
      branch_id: branchId,
      holiday_date: holidayForm.holiday_date,
      reason: holidayForm.reason || null,
      created_by: user?.id,
    }, { onConflict: "class_id,holiday_date" });
    setSavingH(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Kelas ditandai libur");
    setOpenHoliday(false);
    setHolidayForm({ class_id: "", holiday_date: "", reason: "" });
    load();
  };

  const removeHoliday = async (holidayId: string) => {
    const { error } = await supabase.from("class_holidays").delete().eq("id", holidayId);
    if (error) return toast.error("Gagal batalkan", error.message);
    toast.success("Status libur dibatalkan");
    load();
  };

  const weekLabel = `${weekDates[0].getDate()} ${weekDates[0].toLocaleDateString("id-ID", { month: "short" })} – ${weekDates[6].getDate()} ${weekDates[6].toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`;

  // Total calendar height in px
  const totalHours = CAL_END - CAL_START;
  const calHeight = totalHours * PX_PER_HOUR;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="font-display font-bold text-2xl">Class Activity</h2><p className="text-ink-mute text-sm mt-0.5">Kalender semua kelas aktif minggu ini.</p></div>
        <div className="flex gap-2 items-center flex-wrap">
          <Btn variant="soft" size="sm" icon="flag" onClick={() => setOpenHoliday(true)}>Tandai Libur</Btn>
          <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute"><Icon name="chevron-left" className="w-4 h-4" /></button>
          <div className="font-display font-bold text-ink px-2 text-sm">{weekLabel}</div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute"><Icon name="chevron-right" className="w-4 h-4" /></button>
        </div>
      </div>

      {holidays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {holidays.map(h => {
            const cls = allClasses.find(c => c.id === h.class_id);
            return (
              <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warn-50 border border-warn-200 text-xs font-semibold text-warn-700">
                <Icon name="flag" className="w-3 h-3" />
                {cls?.name ?? h.class_id} · {h.holiday_date}{h.reason ? ` (${h.reason})` : ""}
                <button onClick={() => removeHoliday(h.id)} className="ml-1 hover:text-warn-900">
                  <Icon name="x" className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {loading ? <div className="p-10 text-center text-ink-mute">Memuat kalender…</div> : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row */}
              <div className="grid border-b border-line" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div className="border-r border-line" />
                {DAY_NAMES.map((d, i) => {
                  const date = weekDates[i];
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={d} className={`border-b-0 p-3 text-center ${i < 6 ? "border-r border-line" : ""}`}>
                      <div className="text-[10px] font-bold text-ink-faint uppercase tracking-widest">{d.slice(0, 3)}</div>
                      <div className={`font-display font-bold text-lg mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? "bg-ocean-600 text-white" : "text-ink"}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Body: time gutter + 7 day columns */}
              <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                {/* Time gutter */}
                <div className="border-r border-line relative" style={{ height: `${calHeight}px` }}>
                  {Array.from({ length: totalHours }, (_, i) => (
                    <div key={i} className="absolute w-full flex items-start justify-end pr-2" style={{ top: `${i * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}>
                      <span className="text-[10px] font-bold text-ink-faint leading-none -mt-2">{String(CAL_START + i).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const dayEvents = events.filter(e => e.days.includes(dayIdx));
                  return (
                    <div key={dayIdx} className={`relative ${dayIdx < 6 ? "border-r border-line" : ""}`} style={{ height: `${calHeight}px` }}>
                      {/* Hour gridlines */}
                      {Array.from({ length: totalHours }, (_, i) => (
                        <div key={i} className="absolute w-full border-t border-line/50" style={{ top: `${i * PX_PER_HOUR}px` }} />
                      ))}
                      {/* Half-hour gridlines (fainter) */}
                      {Array.from({ length: totalHours }, (_, i) => (
                        <div key={`h${i}`} className="absolute w-full border-t border-line/20" style={{ top: `${i * PX_PER_HOUR + PX_PER_HOUR / 2}px` }} />
                      ))}

                      {/* Events */}
                      {dayEvents.map((ev) => {
                        const startMin = timeToMin(ev.timeStart);
                        const endMin   = timeToMin(ev.timeEnd);
                        const topPx    = ((startMin - CAL_START * 60) / 60) * PX_PER_HOUR;
                        const heightPx = Math.max(((endMin - startMin) / 60) * PX_PER_HOUR, 28);
                        const timeLabel = `${ev.timeStart.slice(0,5)}–${ev.timeEnd.slice(0,5)}`;
                        return (
                          <div
                            key={ev.classId}
                            className={`absolute inset-x-1 rounded-lg ring-1 ring-inset px-2 py-1 overflow-hidden cursor-default select-none ${
                              ev.isHoliday
                                ? "bg-warn-50 text-warn-700 ring-warn-400/40"
                                : ev.isSub
                                ? "bg-sub-50 text-sub-700 ring-sub-500/30"
                                : "bg-ocean-100 text-ocean-700 ring-ocean-500/30"
                            }`}
                            style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 5 }}
                            title={`${ev.name} · ${timeLabel}`}
                          >
                            <div className="font-bold text-[11px] truncate flex items-center gap-1 leading-tight">
                              {ev.isHoliday && <Icon name="flag" className="w-3 h-3 shrink-0" />}
                              {ev.isSub && !ev.isHoliday && <Icon name="refresh" className="w-3 h-3 shrink-0" />}
                              <span className="truncate">{ev.name}</span>
                            </div>
                            {heightPx >= 44 && (
                              <div className="text-[10px] opacity-75 truncate leading-tight mt-0.5">
                                {ev.isHoliday ? "Libur" : ev.isSub ? `Pengganti: ${ev.coach}` : ev.coach}
                              </div>
                            )}
                            {heightPx >= 56 && (
                              <div className="text-[10px] opacity-60 truncate font-mono leading-tight">{timeLabel}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tandai Libur Modal */}
      <Modal open={openHoliday} onClose={() => setOpenHoliday(false)} title="Tandai Kelas Libur" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenHoliday(false)}>Batal</Btn><Btn variant="primary" onClick={addHoliday} disabled={savingH}>{savingH ? "Menyimpan…" : "Tandai Libur"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Kelas" required>
            <Select value={holidayForm.class_id} onChange={e => setHolidayForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Pilih kelas…</option>
              {allClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Tanggal libur" required>
            <Input type="date" value={holidayForm.holiday_date} onChange={e => setHolidayForm(f => ({ ...f, holiday_date: e.target.value }))} />
          </Field>
          <Field label="Alasan (opsional)">
            <Input value={holidayForm.reason} onChange={e => setHolidayForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Libur nasional, kolam tutup" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

// ── Absensi Coach ──────────────────────────────────────────────────────────────

function AdminAbsensiCoach({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openManual, setOpenManual] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceRow | null>(null);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ coach_id: "", class_id: "", session_date: "", clock_in_time: "", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("coach_attendances")
      .select("id, session_date, clock_in_time, status, distance_meters, is_manual, manual_note, profile:profiles!coach_attendances_coach_id_fkey(full_name), class:classes(name)")
      .eq("branch_id", branchId).order("session_date", { ascending: false }).order("clock_in_time", { ascending: false }).limit(50);
    if (data) setRecords(data as unknown as AttendanceRow[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("profiles").select("id, full_name").eq("branch_id", branchId).eq("role", "coach").then(({ data }) => { if (data) setCoaches(data as unknown as CoachProfile[]); });
    supabase.from("classes").select("id, name, time_start, time_end, status, branch_id, capacity, enrolled, schedule_days, price_monthly, show_on_landing").eq("branch_id", branchId).eq("status", "active").then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveManual = async () => {
    if (!form.coach_id || !form.class_id || !form.session_date) return toast.error("Coach, kelas, dan tanggal wajib diisi");
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (editTarget) {
      const { error } = await supabase.from("coach_attendances").update({
        coach_id: form.coach_id, class_id: form.class_id,
        session_date: form.session_date, clock_in_time: form.clock_in_time || null,
        manual_note: form.note || null,
      }).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error("Gagal menyimpan", error.message);
      toast.success("Absensi diperbarui");
    } else {
      const { error } = await supabase.from("coach_attendances").insert({
        branch_id: branchId, coach_id: form.coach_id, class_id: form.class_id,
        session_date: form.session_date, is_manual: true, manual_by: user?.id || null,
        manual_note: form.note || null, status: "present",
      });
      setSaving(false);
      if (error) return toast.error("Gagal menyimpan", error.message);
      toast.success("Absensi manual disimpan");
    }
    setOpenManual(false);
    setEditTarget(null);
    load();
  };

  const openEdit = (r: AttendanceRow) => {
    setEditTarget(r);
    setForm({
      coach_id: r.coach_id,
      class_id: r.class_id,
      session_date: r.session_date,
      clock_in_time: r.clock_in_time?.slice(0, 5) ?? "",
      note: r.manual_note ?? "",
    });
    setOpenManual(true);
  };

  const deleteRecord = async (r: AttendanceRow) => {
    const ok = await confirm({ title: "Hapus absensi?", message: `Hapus absensi ${r.profile?.full_name} tanggal ${fmtDate(r.session_date)}?`, confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("coach_attendances").delete().eq("id", r.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    toast.success("Absensi dihapus");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Absensi Coach</h2><p className="text-ink-mute text-sm mt-0.5">History clock-in coach · CRUD manual oleh admin.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setEditTarget(null); setForm({ coach_id: "", class_id: "", session_date: "", clock_in_time: "", note: "" }); setOpenManual(true); }}>Absensi Manual</Btn>
      </div>
      <Card padded={false}>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-5 font-bold">Tanggal</th><th className="text-left py-3 font-bold">Coach</th>
              <th className="text-left py-3 font-bold">Kelas</th><th className="text-left py-3 font-bold">Clock-in</th>
              <th className="text-left py-3 font-bold">Jarak</th><th className="text-left py-3 font-bold">Metode</th>
              <th className="text-left py-3 pr-5 font-bold"></th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-paper-tint">
                  <td className="py-3.5 px-5 text-ink-soft">{fmtDate(r.session_date)}</td>
                  <td className="font-semibold">{r.profile?.full_name}</td>
                  <td className="text-ink-soft">{r.class?.name}</td>
                  <td className="font-mono">{r.clock_in_time?.slice(0, 5) ?? "—"}</td>
                  <td className="font-mono">{r.distance_meters != null ? `${r.distance_meters} m` : "—"}</td>
                  <td>{r.is_manual ? <Status kind="manual">Manual</Status> : <Status kind="active">Selfie + GPS</Status>}</td>
                  <td className="pr-5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-paper-tint text-ink-mute hover:text-ink" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                      <button onClick={() => deleteRecord(r)} className="p-1.5 rounded hover:bg-danger-50 text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-mute">Belum ada absensi</td></tr>}
            </tbody>
          </table>
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
              <Select value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))}>
                <option value="">Pilih coach…</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Kelas" required>
              <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                <option value="">Pilih kelas…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Tanggal sesi" required><Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} /></Field>
            <Field label="Jam clock-in"><Input type="time" value={form.clock_in_time} onChange={e => setForm(f => ({ ...f, clock_in_time: e.target.value }))} /></Field>
          </div>
          <Field label="Catatan / alasan"><Textarea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Mis. Coach lupa clock-in, sudah konfirmasi via WA." /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ── Pengumuman ─────────────────────────────────────────────────────────────────

function AdminPengumuman({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState({ title: "", body: "", target: "all", valid_until: "", class_ids: [] as string[] });

  const load = useCallback(async () => {
    const { data } = await supabase.from("announcements")
      .select("id, title, body, target_all, active, valid_until, created_at, announcement_classes(class_id, class:classes(name))")
      .eq("branch_id", branchId).order("created_at", { ascending: false });
    if (data) setAnnouncements(data as unknown as Announcement[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("classes").select("id, name, time_start, time_end, status, branch_id, capacity, enrolled, schedule_days, price_monthly, show_on_landing")
      .eq("branch_id", branchId).eq("status", "active").order("name")
      .then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleClass = (id: string) => {
    setForm(f => ({
      ...f,
      class_ids: f.class_ids.includes(id) ? f.class_ids.filter(x => x !== id) : [...f.class_ids, id],
    }));
  };

  const create = async () => {
    if (!form.title || !form.body) return toast.error("Judul dan isi wajib diisi");
    if (form.target === "class" && form.class_ids.length === 0) return toast.error("Pilih minimal satu kelas");
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { data: ann, error } = await supabase.from("announcements").insert({
      branch_id: branchId, title: form.title, body: form.body,
      target_all: form.target === "all", active: true,
      valid_until: form.valid_until || null, created_by: user?.id,
    }).select("id").single();
    if (error || !ann) { setSaving(false); return toast.error("Gagal membuat pengumuman", error?.message); }
    if (form.target === "class" && form.class_ids.length > 0) {
      await supabase.from("announcement_classes").insert(form.class_ids.map(class_id => ({ announcement_id: ann.id, class_id })));
    }
    setSaving(false);
    toast.success("Pengumuman dibuat");
    setOpenAdd(false);
    load();
  };

  const deactivate = async (id: string) => {
    await supabase.from("announcements").update({ active: false }).eq("id", id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: false } : a));
    toast.success("Pengumuman dinonaktifkan");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Pengumuman</h2><p className="text-ink-mute text-sm mt-0.5">Tampil di home member page sebagai banner.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ title: "", body: "", target: "all", valid_until: "", class_ids: [] }); setOpenAdd(true); }}>Buat Pengumuman</Btn>
      </div>
      {loading ? <div className="text-ink-mute text-sm">Memuat…</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {announcements.map((a) => {
            const annClasses = (a as unknown as { announcement_classes?: { class_id: string; class?: { name: string } | null }[] }).announcement_classes;
            return (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0"><Icon name="bell" className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-display font-bold text-ink">{a.title}</h3><Status kind={a.active ? "active" : "inactive"}>{a.active ? "Aktif" : "Nonaktif"}</Status></div>
                    <div className="text-xs text-ink-mute mt-1">
                      {a.valid_until && <>Berlaku s/d {fmtDate(a.valid_until)} · </>}
                      Target: <b>{a.target_all ? "Semua" : annClasses && annClasses.length > 0 ? annClasses.map(ac => ac.class?.name ?? "").join(", ") : "Spesifik"}</b>
                    </div>
                    <p className="text-sm text-ink-soft mt-3 leading-relaxed">{a.body}</p>
                    <div className="mt-4 flex gap-2">
                      {a.active && <Btn variant="ghost" size="sm" onClick={() => deactivate(a.id)}>Nonaktifkan</Btn>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {announcements.length === 0 && <p className="text-ink-mute">Belum ada pengumuman.</p>}
        </div>
      )}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Buat Pengumuman"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? "Menyimpan…" : "Publikasikan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Judul" required><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Isi pengumuman" required><Textarea rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Target">
              <Select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value, class_ids: [] }))}>
                <option value="all">Semua</option>
                <option value="class">Per kelas</option>
              </Select>
            </Field>
            <Field label="Berlaku s/d"><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></Field>
          </div>
          {form.target === "class" && (
            <Field label="Pilih kelas" hint="Bisa pilih lebih dari satu">
              <div className="flex flex-wrap gap-2 mt-1">
                {classes.map(c => (
                  <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${form.class_ids.includes(c.id) ? "bg-ocean-600 text-white border-ocean-600" : "bg-white text-ink-soft border-line hover:border-ocean-300"}`}>
                    {c.name}
                  </button>
                ))}
                {classes.length === 0 && <span className="text-sm text-ink-mute">Tidak ada kelas aktif</span>}
              </div>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ── Izin ───────────────────────────────────────────────────────────────────────

function AdminIzin({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [tab, setTab] = useState("coach");
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<LeaveRow | null>(null);
  const [substituteId, setSubstituteId] = useState("");
  const [approving, setApproving] = useState(false);
  const [allCoaches, setAllCoaches] = useState<CoachProfile[]>([]);
  const [rejectTarget, setRejectTarget] = useState<LeaveRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([]);
  const [createForm, setCreateForm] = useState({ target_id: "", type: "sakit", date_from: "", date_to: "", reason: "", class_ids: [] as string[], substitute_id: "" });

  const load = useCallback(async () => {
    setLoading(true);
    let data: Record<string, unknown>[] | null = null;
    if (tab === "coach") {
      const { data: d } = await supabase.from("coach_leaves")
        .select("id, type, reason, date_from, date_to, status, substitute_id, substitute_profile:profiles!coach_leaves_substitute_id_fkey(full_name), coach:profiles!coach_leaves_coach_id_fkey(full_name, role, branch_id)")
        .order("created_at", { ascending: false });
      data = (d as Record<string, unknown>[] | null)?.filter(
        l => (l.coach as { branch_id?: string } | null)?.branch_id === branchId
      ) ?? null;
    } else {
      const { data: d } = await supabase.from("member_leaves")
        .select("id, type, reason, date_from, date_to, status, member:members(branch_id, profile:profiles(full_name))")
        .order("created_at", { ascending: false });
      data = (d as Record<string, unknown>[] | null)?.filter(
        l => (l.member as { branch_id?: string } | null)?.branch_id === branchId
      ) ?? null;
    }
    if (data) setLeaves(data.map((l: Record<string, unknown>) => ({
      ...l,
      profile: tab === "coach"
        ? (l.coach as { full_name?: string; role?: string } | null)
        : ((l.member as { profile?: { full_name?: string } } | null)?.profile ?? null),
    })) as unknown as LeaveRow[]);
    setLoading(false);
  }, [branchId, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("profiles").select("id, full_name").eq("branch_id", branchId).eq("role", "coach").order("full_name")
      .then(({ data }) => { if (data) setAllCoaches(data as unknown as CoachProfile[]); });
    supabase.from("members").select("id, profile:profiles(full_name)").eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => { if (data) setAllMembers(data.map((m: Record<string, unknown>) => ({ id: m.id as string, full_name: ((m.profile as { full_name?: string } | null)?.full_name ?? "—") }))); });
    supabase.from("classes").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setAllClasses(data as { id: string; name: string }[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const decide = async (id: string, status: "approved" | "rejected") => {
    if (status === "approved" && tab === "coach") {
      const leave = leaves.find(l => l.id === id);
      if (leave) { setApproveTarget(leave); setSubstituteId(leave.substitute_profile?.full_name ? (allCoaches.find(c => c.full_name === leave.substitute_profile?.full_name)?.id ?? "") : ""); return; }
    }
    if (status === "rejected" && tab === "member") {
      const leave = leaves.find(l => l.id === id);
      if (leave) { setRejectTarget(leave); setRejectReason(""); return; }
    }
    const table = tab === "coach" ? "coach_leaves" : "member_leaves";
    const { error } = await supabase.from(table as "coach_leaves").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Gagal update status", error.message);
    toast.success(status === "approved" ? "Izin disetujui" : "Izin ditolak");
    load();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    const upd: Record<string, unknown> = { status: "rejected", reviewed_at: new Date().toISOString() };
    if (rejectReason.trim()) upd.reject_reason = rejectReason.trim();
    const { error } = await supabase.from("member_leaves").update(upd).eq("id", rejectTarget.id);
    setRejecting(false);
    if (error) return toast.error("Gagal menolak izin", error.message);
    toast.success("Izin ditolak");
    setRejectTarget(null);
    load();
  };

  const createLeave = async () => {
    if (!createForm.target_id || !createForm.date_from || !createForm.date_to) return toast.error("Target, tanggal mulai, dan selesai wajib diisi");
    setCreating(true);
    if (tab === "coach") {
      const ins: Record<string, unknown> = { coach_id: createForm.target_id, type: createForm.type, date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved", created_by_admin: true, reviewed_at: new Date().toISOString() };
      if (createForm.substitute_id) ins.substitute_id = createForm.substitute_id;
      const { data, error } = await supabase.from("coach_leaves").insert(ins).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Gagal membuat izin", error?.message); }
      if (createForm.class_ids.length > 0) {
        await supabase.from("coach_leave_classes").insert(createForm.class_ids.map(cid => ({ leave_id: data.id, class_id: cid })));
      }
    } else {
      const { data, error } = await supabase.from("member_leaves").insert({ member_id: createForm.target_id, type: createForm.type, date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved", created_by_admin: true, reviewed_at: new Date().toISOString() }).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Gagal membuat izin", error?.message); }
      if (createForm.class_ids.length > 0) {
        await supabase.from("member_leave_classes").insert(createForm.class_ids.map(cid => ({ leave_id: data.id, class_id: cid })));
      }
    }
    setCreating(false);
    setOpenCreate(false);
    toast.success("Izin berhasil dibuat");
    load();
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    const upd: Record<string, unknown> = { status: "approved", reviewed_at: new Date().toISOString() };
    if (substituteId) upd.substitute_id = substituteId;
    const { error } = await supabase.from("coach_leaves").update(upd).eq("id", approveTarget.id);
    setApproving(false);
    if (error) return toast.error("Gagal menyetujui izin", error.message);
    toast.success("Izin disetujui" + (substituteId ? " & pengganti ditetapkan" : ""));
    setApproveTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Manajemen Izin</h2><p className="text-ink-mute text-sm mt-0.5">Approve pengajuan izin coach & member.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setCreateForm({ target_id: "", type: "sakit", date_from: "", date_to: "", reason: "", class_ids: [], substitute_id: "" }); setOpenCreate(true); }}>Buat Izin</Btn>
      </div>
      <Card padded={false}>
        <div className="px-5 py-3 border-b border-line flex items-center gap-2">
          <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1">
            {[["coach", "Izin Coach"], ["member", "Izin Member"]].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-5 font-bold">Nama</th>
              <th className="text-left py-3 font-bold">Jenis</th><th className="text-left py-3 font-bold">Mulai</th>
              <th className="text-left py-3 font-bold">Selesai</th><th className="text-left py-3 font-bold">Status</th><th className="text-left py-3 font-bold">Pengganti</th><th className="px-5" />
            </tr></thead>
            <tbody className="divide-y divide-line">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-paper-tint">
                  <td className="py-3.5 px-5 font-semibold">{l.profile?.full_name ?? "—"}</td>
                  <td>{l.type}</td>
                  <td className="text-ink-soft">{fmtDate(l.date_from)}</td>
                  <td className="text-ink-soft">{fmtDate(l.date_to)}</td>
                  <td><Status kind={l.status as "pending" | "approved" | "rejected"}>{l.status === "pending" ? "Menunggu" : l.status === "approved" ? "Disetujui" : "Ditolak"}</Status></td>
                  <td className="text-ink-soft text-xs">{l.substitute_profile?.full_name ?? "—"}</td>
                  <td className="px-5">{l.status === "pending" && (
                    <div className="flex gap-1 justify-end">
                      <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => decide(l.id, "rejected")}>Tolak</Btn>
                      <Btn variant="soft" size="sm" icon="check" onClick={() => decide(l.id, "approved")}>Setujui</Btn>
                    </div>
                  )}</td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-mute">Tidak ada pengajuan izin</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      {/* Approve coach leave + assign substitute modal */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Setujui Izin Coach" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setApproveTarget(null)}>Batal</Btn><Btn variant="primary" icon="check" onClick={confirmApprove} disabled={approving}>{approving ? "Menyetujui…" : "Setujui Izin"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{approveTarget?.profile?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(approveTarget?.date_from ?? "")} – {fmtDate(approveTarget?.date_to ?? "")} · {approveTarget?.type}</div>
            {approveTarget?.reason && <div className="text-xs text-ink-soft mt-1">{approveTarget.reason}</div>}
          </Card>
          <Field label="Assign Coach Pengganti" hint="Opsional. Pengganti muncul di coach page mereka dengan label 'Pengganti' selama tanggal izin.">
            <Select value={substituteId} onChange={e => setSubstituteId(e.target.value)}>
              <option value="">— tanpa pengganti —</option>
              {allCoaches
                .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                .map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Reject member leave + reason modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Tolak Izin Member" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectTarget(null)}>Batal</Btn><Btn variant="ghost" className="text-danger-500" onClick={confirmReject} disabled={rejecting}>{rejecting ? "Menolak…" : "Konfirmasi Tolak"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{rejectTarget?.profile?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(rejectTarget?.date_from ?? "")} – {fmtDate(rejectTarget?.date_to ?? "")} · {rejectTarget?.type}</div>
            {rejectTarget?.reason && <div className="text-xs text-ink-soft mt-1">{rejectTarget.reason}</div>}
          </Card>
          <Field label="Alasan penolakan" hint="Opsional — akan dilihat oleh member.">
            <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Mis. Dokumen tidak lengkap." />
          </Field>
        </div>
      </Modal>

      {/* Admin create leave modal */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title={`Buat Izin ${tab === "coach" ? "Coach" : "Member"}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>Batal</Btn><Btn variant="primary" icon="check" onClick={createLeave} disabled={creating}>{creating ? "Menyimpan…" : "Buat Izin"}</Btn></>}>
        <div className="space-y-4">
          <Field label={tab === "coach" ? "Coach" : "Member"} required>
            <Select value={createForm.target_id} onChange={e => setCreateForm(f => ({ ...f, target_id: e.target.value }))}>
              <option value="">— pilih {tab === "coach" ? "coach" : "member"} —</option>
              {tab === "coach"
                ? allCoaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)
                : allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Jenis izin" required>
            <Select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="cuti">Cuti</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal mulai" required><Input type="date" value={createForm.date_from} onChange={e => setCreateForm(f => ({ ...f, date_from: e.target.value }))} /></Field>
            <Field label="Tanggal selesai" required><Input type="date" value={createForm.date_to} onChange={e => setCreateForm(f => ({ ...f, date_to: e.target.value }))} min={createForm.date_from} /></Field>
          </div>
          <Field label="Kelas yang ditinggalkan" hint="Opsional">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allClasses.map(c => {
                const sel = createForm.class_ids.includes(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => setCreateForm(f => ({ ...f, class_ids: sel ? f.class_ids.filter(id => id !== c.id) : [...f.class_ids, c.id] }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${sel ? "bg-ocean-700 text-white border-ocean-700" : "bg-paper-tint border-line text-ink-soft hover:border-ocean-300"}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
          {tab === "coach" && (
            <Field label="Coach pengganti" hint="Opsional">
              <Select value={createForm.substitute_id} onChange={e => setCreateForm(f => ({ ...f, substitute_id: e.target.value }))}>
                <option value="">— tanpa pengganti —</option>
                {allCoaches.filter(c => c.id !== createForm.target_id).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Keterangan" hint="Opsional">
            <Textarea rows={2} value={createForm.reason} onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Demam sejak kemarin." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

// ── Pembayaran ─────────────────────────────────────────────────────────────────

function AdminPembayaran({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMonth, setGenMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openGenModal, setOpenGenModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bills")
      .select("id, member_id, period_label, amount, discount, total, status, paid_at, proof_url, member:members(profile:profiles(full_name))")
      .eq("branch_id", branchId).order("created_at", { ascending: false }).limit(100);
    if (data) setBills(data as unknown as BillRow[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const paid = bills.filter(b => b.status === "paid");
  const unpaid = bills.filter(b => b.status === "unpaid");
  const schoolCovered = bills.filter(b => b.status === "school_covered");

  const verify = async (id: string) => {
    setVerifying(id);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("bills").update({ status: "paid", paid_at: new Date().toISOString(), verified_by: user?.id ?? null }).eq("id", id);
    setVerifying(null);
    if (error) return toast.error("Gagal verifikasi", error.message);
    setBills(prev => prev.map(b => b.id === id ? { ...b, status: "paid" } : b));
    toast.success("Pembayaran terverifikasi");
  };

  // Format "2026-05" → "Mei 2026"
  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  const generateTagihan = async () => {
    const label = fmtMonth(genMonth);
    setOpenGenModal(false);
    setGenerating(true);
    try {
      // 1. Get all active reguler members with their class price
      const { data: members, error: mErr } = await supabase
        .from("members")
        .select("id, member_classes(class:classes(id, price_monthly))")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .eq("type", "reguler");

      if (mErr || !members) { toast.error("Gagal memuat member", mErr?.message); setGenerating(false); return; }

      // 2. Get existing bills for this period
      const { data: existing } = await supabase
        .from("bills").select("member_id").eq("branch_id", branchId).eq("period_label", label);
      const existingIds = new Set((existing ?? []).map(b => b.member_id));

      // 3. Build insert rows — skip members who already have a bill this period
      const rows: { member_id: string; branch_id: string; class_id: string | null; type: string; period_label: string; amount: number; discount: number; total: number; status: string }[] = [];
      for (const m of members as unknown as { id: string; member_classes: { class: { id: string; price_monthly: number } | null }[] }[]) {
        if (existingIds.has(m.id)) continue;
        const cls = m.member_classes?.[0]?.class;
        const amount = cls?.price_monthly ?? 0;
        rows.push({
          member_id: m.id,
          branch_id: branchId,
          class_id: cls?.id ?? null,
          type: "monthly",
          period_label: label,
          amount,
          discount: 0,
          total: amount,
          status: "unpaid",
        });
      }

      if (rows.length === 0) {
        toast.success("Semua member reguler sudah memiliki tagihan untuk periode ini");
        setGenerating(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("bills").insert(rows as any);
      if (error) { toast.error("Gagal generate tagihan", error.message); setGenerating(false); return; }
      toast.success(`${rows.length} tagihan berhasil digenerate`, `Periode ${label}`);
      load();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Pembayaran</h2><p className="text-ink-mute text-sm mt-0.5">Verifikasi pembayaran masuk & generate tagihan bulanan.</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="primary" icon="invoice" onClick={() => setOpenGenModal(true)} disabled={generating}>{generating ? "Generating…" : "Generate Tagihan"}</Btn>
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Tagihan bulan ini"  value={bills.length} icon="invoice" tone="ocean" />
        <Stat label="Sudah lunas"        value={paid.length} icon="check"   tone="ok"  sub={fmtIDR(paid.reduce((a,b) => a + b.total, 0))} />
        <Stat label="Belum dibayar"      value={unpaid.length} icon="warning" tone="warn" sub={fmtIDR(unpaid.reduce((a,b) => a + b.total, 0))} />
        <Stat label="Ditanggung sekolah" value={schoolCovered.length} icon="school" tone="ocean" />
      </div>
      <Card padded={false}>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-5 font-bold">Member</th>
              <th className="text-left py-3 font-bold">Periode</th><th className="text-right py-3 font-bold">Bruto</th>
              <th className="text-right py-3 font-bold">Diskon</th><th className="text-right py-3 font-bold">Total</th>
              <th className="text-left py-3 font-bold">Status</th><th className="px-5" />
            </tr></thead>
            <tbody className="divide-y divide-line">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-paper-tint">
                  <td className="py-3.5 px-5 font-semibold">{b.member?.profile?.full_name ?? "—"}</td>
                  <td className="text-ink-soft">{b.period_label}</td>
                  <td className="text-right font-mono text-ink-mute">{fmtIDR(b.amount)}</td>
                  <td className="text-right font-mono text-ink-mute">{b.discount > 0 ? `-${fmtIDR(b.discount)}` : "—"}</td>
                  <td className="text-right font-mono font-bold">{fmtIDR(b.total)}</td>
                  <td><Status kind={b.status as "paid" | "unpaid" | "school_covered"}>{b.status === "paid" ? "Lunas" : b.status === "unpaid" ? "Belum" : "Sekolah"}</Status></td>
                  <td className="px-5">
                    {b.status === "unpaid" && <Btn variant="soft" size="sm" icon="check" onClick={() => verify(b.id)} disabled={verifying === b.id}>{verifying === b.id ? "…" : "Verifikasi"}</Btn>}
                    {b.proof_url && <a href={b.proof_url} target="_blank" rel="noreferrer"><Btn variant="ghost" size="sm" icon="eye">Bukti</Btn></a>}
                  </td>
                </tr>
              ))}
              {bills.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-mute">Tidak ada tagihan</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      {/* Generate Tagihan Modal */}
      <Modal open={openGenModal} onClose={() => setOpenGenModal(false)} title="Generate Tagihan Bulanan" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenGenModal(false)}>Batal</Btn><Btn variant="primary" icon="invoice" onClick={generateTagihan} disabled={generating}>{generating ? "Generating…" : "Generate"}</Btn></>}>
        <div className="space-y-4">
          <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3.5 text-sm text-ocean-800 flex gap-2.5">
            <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-ocean-500" />
            <span>Generate tagihan bulanan untuk semua member reguler aktif. Member yang sudah punya tagihan periode ini akan dilewati otomatis.</span>
          </div>
          <Field label="Periode tagihan" required>
            <Input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} className="font-mono" />
          </Field>
          <div className="bg-paper-tint rounded-xl px-3.5 py-3 text-sm text-ink-soft">
            Tagihan akan digenerate untuk periode: <span className="font-semibold text-ink">{fmtMonth(genMonth)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Approvement ────────────────────────────────────────────────────────────────

function AdminApprovement({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      supabase.from("registrations").select("id, full_name, birth_date, gender, phone, phone_owner, parent_name, status, created_at").eq("branch_id", branchId).eq("status", "pending").order("created_at")
        .then(({ data }) => { if (data) setRegistrations(data as RegistrationRow[]); }),
      supabase.from("certifications").select("id, name, title, issuer, valid_from, valid_until, photo_url, status, profile:profiles(full_name)").eq("status", "pending")
        .then(({ data }) => { if (data) setCerts(data as unknown as CertRow[]); }),
    ]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const reviewReg = async (id: string, status: "approved" | "rejected") => {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("registrations").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    toast.success(status === "approved" ? "Pendaftaran diapprove" : "Pendaftaran ditolak");
    load();
  };

  const reviewCert = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("certifications").update({ status }).eq("id", id);
    toast.success(status === "approved" ? "Sertifikasi diverifikasi" : "Sertifikasi ditolak");
    load();
  };

  if (loading) return <div className="p-10 text-center text-ink-mute">Memuat data…</div>;

  return (
    <div className="space-y-5">
      <div><h2 className="font-display font-bold text-2xl">Approvement</h2><p className="text-ink-mute text-sm mt-0.5">Registrasi dan sertifikasi pending.</p></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle sub="Dari halaman /register">Registrasi Baru ({registrations.length})</SectionTitle>
          {registrations.length === 0 ? <p className="text-ink-mute text-sm">Tidak ada pendaftaran baru.</p> : (
            <div className="space-y-3">
              {registrations.map((r) => {
                const age = r.birth_date ? calcAge(r.birth_date) : null;
                return (
                  <div key={r.id} className="p-3 rounded-xl border border-line">
                    <div className="flex items-center gap-3"><Avatar name={r.full_name} size={42} /><div className="flex-1 min-w-0"><div className="font-semibold text-ink truncate">{r.full_name}</div><div className="text-xs text-ink-mute">{age ? `${age} thn` : ""} · {r.parent_name ?? r.phone}</div></div></div>
                    <div className="mt-3 flex gap-1.5">
                      <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => reviewReg(r.id, "rejected")}>Tolak</Btn>
                      <a href={waLink(`Halo ${r.full_name}, pendaftaran Anda di Next Swimming School sudah diproses.`)} target="_blank" rel="noreferrer"><Btn variant="wa" size="sm" icon="whatsapp">Chat WA</Btn></a>
                      <Btn variant="primary" size="sm" icon="check" className="ml-auto" onClick={() => reviewReg(r.id, "approved")}>Approve</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle sub="Wajib verifikasi">Sertifikasi ({certs.length})</SectionTitle>
          {certs.length === 0 ? <p className="text-ink-mute text-sm">Tidak ada sertifikasi pending.</p> : (
            <div className="space-y-3">
              {certs.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-line">
                  <div className="flex items-center gap-3"><Avatar name={c.profile?.full_name ?? "?"} size={42} /><div className="flex-1 min-w-0"><div className="font-semibold text-ink truncate">{c.profile?.full_name}</div><div className="text-xs text-ink-mute">{c.title ?? c.name} — {c.issuer ?? "—"}</div></div></div>
                  {c.photo_url && <a href={c.photo_url} target="_blank" rel="noreferrer" className="block mt-3"><Image src={c.photo_url} alt="cert" width={400} height={192} className="w-full rounded-lg object-cover max-h-48" /></a>}
                  <div className="mt-3 flex gap-1.5">
                    <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => reviewCert(c.id, "rejected")}>Tolak</Btn>
                    <Btn variant="primary" size="sm" icon="check" className="ml-auto" onClick={() => reviewCert(c.id, "approved")}>Approve</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Rapor ──────────────────────────────────────────────────────────────────────

function AdminRapor({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [periods, setPeriods] = useState<RaporPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", date_from: "", date_to: "" });

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
    const { error } = await supabase.from("rapor_periods").insert({ branch_id: branchId, label: form.label, date_from: form.date_from, date_to: form.date_to, is_open: true, created_by: user?.id ?? null });
    setSaving(false);
    if (error) return toast.error("Gagal membuat periode", error.message);
    toast.success("Periode rapor dibuka");
    setOpenAdd(false);
    load();
  };

  const closePeriod = async (id: string) => {
    await supabase.from("rapor_periods").update({ is_open: false }).eq("id", id);
    toast.success("Periode ditutup");
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
            <div className="mt-4">
              <Btn variant="outline" size="sm" onClick={() => closePeriod(activePeriod.id)}>Tutup periode</Btn>
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
              </div>
            ))}
          </div>
        </Card>
      )}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Buka Periode Rapor Baru" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? "Membuat…" : "Buka Periode"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Label periode" required><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Semester 1 — 2026" /></Field>
          <Field label="Tanggal mulai" required><Input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} /></Field>
          <Field label="Tanggal selesai" required><Input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ── School Panel ───────────────────────────────────────────────────────────────

function AdminSchoolPanel({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [createdCredential, setCreatedCredential] = useState<{ name: string; email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("schools").select("id, name, email, profile_id").eq("branch_id", branchId).order("name");
    if (data) setSchools(data as School[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const create = async () => {
    if (!form.name || !form.email || !form.password) return toast.error("Nama, email, dan password wajib diisi");
    if (form.password.length < 6) return toast.error("Password minimal 6 karakter");
    setSaving(true);
    // 1. Create auth account with role=school
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.name, role: "school", branch_id: branchId }),
    });
    const json = await res.json() as { user_id?: string; error?: string };
    if (!res.ok) { toast.error("Gagal membuat akun sekolah", json.error); setSaving(false); return; }

    // 2. Insert into schools table
    const { error } = await supabase.from("schools").insert({
      branch_id: branchId, name: form.name, email: form.email, profile_id: json.user_id ?? null,
    });
    setSaving(false);
    if (error) return toast.error("Gagal menambah sekolah", error.message);
    toast.success("Sekolah ditambahkan & akun login dibuat");
    setCreatedCredential({ name: form.name, email: form.email, password: form.password });
    setOpenAdd(false);
    setForm({ name: "", email: "", password: "" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">School Panel (Afiliasi)</h2><p className="text-ink-mute text-sm mt-0.5">Kelola sekolah afiliasi & rekap biaya yang ditanggung.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ name: "", email: "", password: "" }); setOpenAdd(true); }}>Tambah Sekolah</Btn>
      </div>
      {loading ? <div className="text-ink-mute text-sm">Memuat…</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {schools.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start gap-3">
                <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center"><Icon name="school" className="w-7 h-7" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-ink">{s.name}</div>
                  <div className="text-xs text-ink-mute">{s.email ?? "—"}</div>
                  <div className="mt-3 flex gap-2">
                    <Status kind={s.profile_id ? "active" : "warn"}>{s.profile_id ? "Akun aktif" : "Belum ada akun"}</Status>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {schools.length === 0 && <p className="text-ink-mute">Belum ada sekolah afiliasi.</p>}
        </div>
      )}

      {/* Add school modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Sekolah Afiliasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? "Menyimpan…" : "Buat Sekolah & Akun"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sekolah" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mis. SD Negeri 1 Bandung" /></Field>
          <Field label="Email login" required hint="Digunakan untuk login ke school page"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Password" required hint="Min. 6 karakter — kirimkan ke pihak sekolah"><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></Field>
        </div>
      </Modal>

      {/* Credential popup after create */}
      <Modal open={!!createdCredential} onClose={() => setCreatedCredential(null)} title="Sekolah Berhasil Ditambahkan" size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCreatedCredential(null)}>Tutup</Btn>
            <a href={waLink(`Halo, berikut akses login School Panel Next Swimming School untuk ${createdCredential?.name ?? ""}:\n\nEmail: ${createdCredential?.email ?? ""}\nPassword: ${createdCredential?.password ?? ""}\n\nLogin di: ${typeof window !== "undefined" ? window.location.origin : ""}/login`)} target="_blank" rel="noreferrer">
              <Btn variant="wa" icon="whatsapp">Kirim ke WA Sekolah</Btn>
            </a>
          </>
        }>
        <div className="space-y-4">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-start gap-2.5 text-sm text-ok-700"><Icon name="check" className="w-5 h-5 shrink-0 mt-0.5" /><span>Akun login berhasil dibuat. Kirimkan credential ini ke pihak sekolah.</span></div>
          </Card>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">Sekolah</span><span className="font-semibold text-ink">{createdCredential?.name}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">Email</span><span className="font-mono text-ink">{createdCredential?.email}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">Password</span><span className="font-mono text-ink">{createdCredential?.password}</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { section: "Operasional" },
  { id: "dashboard",  label: "Dashboard",      icon: "grid"      },
  { id: "activity",   label: "Class Activity", icon: "calendar"  },
  { section: "Manajemen" },
  { id: "classes",    label: "Class",          icon: "swim"      },
  { id: "members",    label: "Member",         icon: "users"     },
  { id: "coaches",    label: "Coach",          icon: "shield"    },
  { id: "absensi",    label: "Absensi Coach",  icon: "check"     },
  { id: "announce",   label: "Pengumuman",     icon: "bell"      },
  { section: "Persetujuan" },
  { id: "izin",       label: "Izin",           icon: "clipboard" },
  { id: "approve",    label: "Approvement",    icon: "check"     },
  { section: "Keuangan & rapor" },
  { id: "pay",        label: "Pembayaran",     icon: "wallet"    },
  { id: "rapor",      label: "Rapor",          icon: "book"      },
  { id: "school",     label: "School Panel",   icon: "school"    },
  { section: "System" },
  { id: "settings",   label: "Settings",       icon: "settings"  },
];

const TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard",       ""],
  activity:  ["Class Activity",  "Kalender semua kelas"],
  classes:   ["Class",           "CRUD kelas & jadwal"],
  members:   ["Member",          "Manajemen member cabang"],
  coaches:   ["Coach",           "Coach cabang Anda"],
  absensi:   ["Absensi Coach",   "History & input manual"],
  announce:  ["Pengumuman",      "Notifikasi ke member"],
  izin:      ["Izin",            "Approve & buat izin"],
  approve:   ["Approvement",     "Antrian persetujuan"],
  pay:       ["Pembayaran",      "Tagihan & verifikasi"],
  rapor:     ["Rapor",           "Periode pengisian rapor"],
  school:    ["School Panel",    "Sekolah afiliasi"],
  settings:  ["Settings",        "Logo, lokasi, WA admin"],
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState("");
  const [ownerPreview, setOwnerPreview] = useState<{ id: string; name: string } | null>(null);

  const loadBranch = useCallback(async (branchId: string) => {
    const { data } = await supabase.from("branches").select("id, name, city, address, lat, lng, wa_numbers, logo_url").eq("id", branchId).single();
    if (data) setBranch(data as Branch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- init from sessionStorage */
  useEffect(() => {
    // Check if owner navigated here to preview a branch
    const raw = sessionStorage.getItem("ownerPreviewBranch");
    if (raw) {
      try {
        const preview = JSON.parse(raw) as { id: string; name: string };
        setOwnerPreview(preview);
        setResolvedBranchId(preview.id);
        loadBranch(preview.id);
      } catch { /* ignore */ }
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setCurrentUser(user);

      // If owner preview is active, skip normal branch resolution
      if (sessionStorage.getItem("ownerPreviewBranch")) return;

      // Try branch_id from user_metadata first, fallback to profiles table
      let branchId = user.user_metadata?.branch_id as string | undefined;
      if (!branchId) {
        const { data: profile } = await supabase.from("profiles").select("branch_id").eq("id", user.id).single();
        branchId = profile?.branch_id ?? undefined;
      }
      if (branchId) {
        setResolvedBranchId(branchId);
        loadBranch(branchId);
      }
    });
  }, [loadBranch]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const backToOwner = () => {
    sessionStorage.removeItem("ownerPreviewBranch");
    router.push("/owner");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const branchId = resolvedBranchId || (currentUser?.user_metadata?.branch_id as string ?? "");

  function renderPage() {
    if (!resolvedBranchId && active !== "settings") return (
      <div className="flex items-center justify-center h-64 text-ink-mute">Memuat data cabang…</div>
    );
    switch (active) {
      case "dashboard": return <AdminDashboard branchId={branchId} />;
      case "activity":  return <AdminClassActivity branchId={branchId} />;
      case "classes":   return <AdminClass branchId={branchId} />;
      case "members":   return <AdminMember branchId={branchId} />;
      case "coaches":   return <AdminCoach branchId={branchId} />;
      case "absensi":   return <AdminAbsensiCoach branchId={branchId} />;
      case "announce":  return <AdminPengumuman branchId={branchId} />;
      case "izin":      return <AdminIzin branchId={branchId} />;
      case "approve":   return <AdminApprovement branchId={branchId} />;
      case "pay":       return <AdminPembayaran branchId={branchId} />;
      case "rapor":     return <AdminRapor branchId={branchId} />;
      case "school":    return <AdminSchoolPanel branchId={branchId} />;
      case "settings":  return <AdminSettings branch={branch} onRefresh={() => branchId && loadBranch(branchId)} userId={currentUser?.id ?? ""} />;
      default:          return null;
    }
  }

  const [title] = TITLES[active] ?? ["Admin", ""];
  const subTitle = active === "dashboard" ? branch?.name ?? "Admin Panel" : (TITLES[active]?.[1] ?? "");

  const brand = useMemo(() => (
    <div className="flex items-center gap-2.5">
      {branch?.logo_url ? <Image src={branch.logo_url} alt="logo" width={36} height={36} className="w-9 h-9 rounded-lg object-cover" /> : <Logo size={36} />}
      <div className="min-w-0">
        <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">Admin Panel</div>
        <div className="text-[10px] text-ink-mute tracking-wide truncate">{branch?.name ?? "Memuat…"}</div>
      </div>
    </div>
  ), [branch]);

  return (
    <div className="flex flex-col bg-paper-tint min-h-screen">
      {ownerPreview && (
        <div className="bg-ocean-800 text-white px-4 py-2.5 flex items-center gap-3 z-50 shrink-0">
          <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Icon name="shield" className="w-3.5 h-3.5 text-wave-200" />
          </span>
          <span className="text-sm font-semibold flex-1">
            Mode pratinjau Owner — Admin Panel <span className="text-wave-200 font-bold">{ownerPreview.name}</span>
          </span>
          <button
            onClick={backToOwner}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
          >
            <Icon name="arrowL" className="w-4 h-4" /> Kembali ke Owner Panel
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      <Sidebar
        items={NAV_ITEMS}
        active={active}
        onSelect={(id) => { setActive(id); setMobileNav(false); }}
        brand={brand}
        footer={
          <div className="space-y-2">
            {branch && (
              <Card className="!p-3 bg-wave-50 border-wave-100">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-700">Cabang Aktif</div>
                <div className="font-display font-bold text-ink mt-0.5 text-sm">{branch.name}</div>
              </Card>
            )}
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint">
              <Icon name="logout" className="w-4 h-4" /> Logout
            </button>
          </div>
        }
      />

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-line p-3 overflow-y-auto">
            <div className="px-2 py-2 mb-2">{brand}</div>
            {NAV_ITEMS.map((it) =>
              it.section ? (
                <div key={it.section} className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest font-bold text-ink-faint">{it.section}</div>
              ) : (
                <button key={it.id} onClick={() => { setActive(it.id!); setMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                  <Icon name={it.icon!} className="w-4 h-4" />{it.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          sub={subTitle}
          search="Cari member, coach, tagihan…"
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <Bell userId={currentUser?.id ?? ""} />
              <Avatar name={currentUser?.user_metadata?.full_name ?? "A"} size={36} />
            </>
          }
        />
        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7">
          {renderPage()}
        </main>
      </div>
      </div>

    </div>
  );
}
