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
import { fmtIDR, fmtDate, fmtDateLong, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useUpload } from "@/hooks/useUpload";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import type { User } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

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

interface ScheduleSlot { day: string; time_start: string; time_end: string }

interface ClassRow {
  id: string; name: string; branch_id: string; status: string;
  capacity: number; enrolled: number; price_monthly: number;
  price_per_session: number | null; class_type: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null;
  schedule_times?: ScheduleSlot[] | null;
  show_on_landing: boolean;
  goals?: string | null;
  description?: string | null;
  photo_url?: string | null;
  spreadsheet_url?: string | null;
  spreadsheet_filled?: boolean;
  branch?: { name: string } | null;
  class_coaches?: { profile: { full_name: string; id: string } | null }[];
}

/** Get time for a specific day — falls back to global time_start/time_end */
function getSlotTime(cls: Pick<ClassRow, "schedule_times" | "time_start" | "time_end">, day: string): { time_start: string; time_end: string } {
  const slot = cls.schedule_times?.find(s => s.day === day);
  return {
    time_start: slot?.time_start || cls.time_start || "",
    time_end:   slot?.time_end   || cls.time_end   || "",
  };
}

interface MemberRow {
  id: string; profile_id: string; type: string; status: string;
  date_start: string; qr_code: string | null; school_id: string | null;
  remaining_sessions: number | null; total_sessions: number | null;
  suspend_until?: string | null; suspend_reason?: string | null;
  profile?: {
    full_name: string; birth_date: string | null; phone: string | null;
    gender: string | null; address: string | null; health_notes: string | null;
    email: string | null; avatar_url: string | null;
  } | null;
  member_classes?: { class: { id: string; name: string } | null }[];
}

interface CoachProfile {
  id: string; full_name: string; email: string;
  nick_name: string | null; gender: string | null; birth_date: string | null;
  phone: string | null; specialization: string | null;
  bio: string | null; address: string | null;
  education_level: string | null; education_institution: string | null;
  bank_name: string | null; bank_account: string | null; bank_holder: string | null;
  avatar_url?: string | null;
  certifications?: { id: string; name: string; title: string | null; status: string; valid_from: string | null; valid_until: string | null }[];
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
  coach_id?: string | null;
  member_id?: string | null;
  profile?: { full_name: string; role: string } | null;
  leave_classes?: { class: { name: string } | null }[];
  substitute_profile?: { full_name: string } | null;
}

interface BillRow {
  id: string; member_id: string; period_label: string; amount: number;
  discount: number; discount_reason: string | null; total: number; status: string;
  type: string; sessions_total: number | null; sessions_used: number;
  paid_at: string | null; paid_method: string | null; proof_url: string | null;
  admin_notes: string | null;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

interface RegistrationRow {
  id: string; full_name: string; birth_date: string | null; gender: string | null;
  phone: string | null; phone_owner: string | null; parent_name: string | null;
  parent_phone: string | null; address: string | null; health_notes: string | null;
  status: string; created_at: string; branch_id?: string | null;
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
  pic_name: string | null; pic_phone: string | null;
}

interface Branch {
  id: string; name: string; city: string; address: string | null;
  lat: number | null; lng: number | null; wa_numbers: string[] | null;
  logo_url: string | null;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function AdminDashboard({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const [stats, setStats] = useState({ members: 0, coaches: 0, classes: 0, pending: 0, coachLeaves: 0, memberLeaves: 0 });
  const [todayClasses, setTodayClasses] = useState<(ClassRow & { is_holiday?: boolean })[]>([]);
  const [recentCoachAtt, setRecentCoachAtt] = useState<AttendanceRow[]>([]);
  const [recentMemberAtt, setRecentMemberAtt] = useState<{ id: string; member_name: string; class_name: string; status: string; session_date: string }[]>([]);
  const [classesWithoutCoach, setClassesWithoutCoach] = useState<{ id: string; name: string }[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);

  const loadAttendance = useCallback(async () => {
    if (!branchId) return;
    const today = new Date().toISOString().split("T")[0];
    const [coachRes, memberRes] = await Promise.all([
      supabase.from("coach_attendances")
        .select("id, session_date, clock_in_time, status, is_manual, profile:profiles!coach_attendances_coach_id_fkey(full_name), class:classes(name)")
        .eq("branch_id", branchId).eq("session_date", today)
        .order("clock_in_at", { ascending: false }).limit(6),
      supabase.from("member_attendances")
        .select("id, session_date, status, member:members(profile:profiles(full_name)), class:classes(name)")
        .eq("session_date", today).eq("status", "hadir")
        .order("created_at", { ascending: false }).limit(6),
    ]);
    if (coachRes.data) setRecentCoachAtt(coachRes.data as unknown as AttendanceRow[]);
    if (memberRes.data) setRecentMemberAtt((memberRes.data as unknown as { id: string; session_date: string; status: string; member: { profile: { full_name: string } | null } | null; class: { name: string } | null }[])
      .map(r => ({ id: r.id, member_name: r.member?.profile?.full_name ?? "—", class_name: r.class?.name ?? "—", status: r.status, session_date: r.session_date })));
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!branchId) return;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Counts — coach aktif = not archived AND not suspended
    Promise.all([
      supabase.from("members").select("id", { count: "exact" }).eq("branch_id", branchId).eq("status", "active"),
      supabase.from("profiles").select("id, suspend_until").eq("branch_id", branchId).eq("role", "coach").eq("is_archived", false),
      supabase.from("classes").select("id", { count: "exact" }).eq("branch_id", branchId).eq("status", "active"),
      supabase.from("registrations").select("id", { count: "exact" }).eq("branch_id", branchId).eq("status", "pending"),
      supabase.from("coach_leaves").select("id, profile:profiles!coach_leaves_coach_id_fkey(branch_id)").eq("status", "pending"),
      supabase.from("member_leaves").select("id, member:members!member_leaves_member_id_fkey(branch_id)").eq("status", "pending"),
      supabase.from("certifications").select("id", { count: "exact" }).eq("status", "pending"),
    ]).then(([m, c, k, reg, cl, ml, cert]) => {
      // Coach aktif = not archived AND (no suspend_until OR suspend_until < today)
      const activeCoaches = ((c.data ?? []) as { suspend_until: string | null }[])
        .filter(p => !p.suspend_until || p.suspend_until < today).length;
      const coachLeaveCount = ((cl.data ?? []) as unknown as { profile?: { branch_id?: string | null } | null }[])
        .filter(r => r.profile?.branch_id === branchId).length;
      const memberLeaveCount = ((ml.data ?? []) as unknown as { member?: { branch_id?: string | null } | null }[])
        .filter(r => r.member?.branch_id === branchId).length;
      const totalPending = (reg.count ?? 0) + (cert.count ?? 0) + coachLeaveCount + memberLeaveCount;
      setStats({ members: m.count ?? 0, coaches: activeCoaches, classes: k.count ?? 0, pending: totalPending, coachLeaves: coachLeaveCount, memberLeaves: memberLeaveCount });
    });

    // Today's classes + holiday status
    const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
    Promise.all([
      supabase.from("classes").select("id, name, time_start, time_end, capacity, enrolled, class_coaches(profile:profiles(full_name, id))")
        .eq("branch_id", branchId).eq("status", "active").contains("schedule_days", [todayName]).limit(6),
      supabase.from("class_holidays").select("class_id").lte("date_from", today).gte("date_to", today),
    ]).then(([classRes, holidayRes]) => {
      if (!classRes.data) return;
      const holidayClassIds = new Set((holidayRes.data ?? []).map(h => h.class_id));
      setTodayClasses((classRes.data as unknown as ClassRow[]).map(c => ({ ...c, is_holiday: holidayClassIds.has(c.id) })));
    });

    // Alert: classes with no active coach
    supabase.from("classes").select("id, name, class_coaches(coach:profiles(id, suspend_until))")
      .eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => {
        if (!data) return;
        const noActiveCoach = data.filter((c) => {
          const coaches = (c as unknown as { class_coaches: { coach: { id: string; suspend_until: string | null } | null }[] }).class_coaches ?? [];
          if (coaches.length === 0) return true;
          return coaches.every(cc => {
            const su = cc.coach?.suspend_until;
            return su != null && new Date(su) >= now;
          });
        });
        setClassesWithoutCoach(noActiveCoach.map(c => ({ id: c.id, name: c.name })));
      });

    // Alert: overdue unpaid bills (unpaid bills older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase.from("bills").select("id", { count: "exact" })
      .eq("branch_id", branchId).eq("status", "unpaid").lt("created_at", thirtyDaysAgo)
      .then(({ count }) => setOverdueCount(count ?? 0));

    loadAttendance();

    // Realtime: new attendances → refresh
    const channel = supabase.channel(`live_att:${branchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "coach_attendances", filter: `branch_id=eq.${branchId}` }, () => loadAttendance())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "member_attendances" }, () => loadAttendance())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [branchId, loadAttendance]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-6">
      {/* Warning section */}
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
      {overdueCount > 0 && (
        <Card className="bg-warn-50 border-warn-300">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-warn-100 text-warn-600 flex items-center justify-center shrink-0"><Icon name="invoice" className="w-5 h-5" /></span>
            <div className="flex-1">
              <div className="font-display font-bold text-warn-700">Tagihan belum dibayar ({overdueCount})</div>
              <p className="text-sm text-warn-600 mt-0.5">Ada {overdueCount} tagihan yang sudah lebih dari 30 hari belum dibayar. Cek menu Pembayaran untuk detail.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Member aktif"  value={stats.members} icon="users"   tone="ocean" />
        <Stat label="Coach aktif"   value={stats.coaches} icon="swim"    tone="wave"  />
        <Stat label="Kelas aktif"   value={stats.classes} icon="grid"    tone="ocean" />
        <Stat label="Approvement"   value={stats.pending} icon="warning" tone="warn"  sub="Semua yang pending" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Stat label="Izin coach"  value={stats.coachLeaves} icon="calendar" tone="warn" sub="Menunggu persetujuan" />
        <Stat label="Izin member" value={stats.memberLeaves} icon="calendar" tone="warn" sub="Menunggu persetujuan" />
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
                const isHoliday = (c as unknown as { is_holiday?: boolean }).is_holiday;
                return (
                  <div key={c.id} className={`rounded-xl border p-3.5 transition ${isHoliday ? "border-line bg-paper-tint opacity-60" : "border-line hover:border-ocean-200 hover:shadow-card"}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-ink text-sm">{c.name}</div>
                      {isHoliday
                        ? <span className="px-2 py-0.5 rounded-full bg-archive-100 text-archive-600 text-[10px] font-bold">LIBUR</span>
                        : <Status kind="active" className="!text-[10px]">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</Status>
                      }
                    </div>
                    <div className="text-xs text-ink-mute mt-1">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""} · {coaches[0] ?? "—"}</div>
                    {!isHoliday && (
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          {Array.from({ length: Math.min(4, c.enrolled) }).map((_, k) => <Avatar key={k} name={`M${k + 1}`} size={22} ring />)}
                          {c.enrolled > 4 && <span className="ml-2 text-[10px] font-bold text-ink-mute self-center">+{c.enrolled - 4}</span>}
                        </div>
                        <span className="text-[10px] font-mono text-ink-mute">{c.enrolled}/{c.capacity}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle sub="Real-time">Live Attendance</SectionTitle>
          <div className="space-y-1">
            {recentCoachAtt.length === 0 && recentMemberAtt.length === 0 && <p className="text-ink-mute text-sm">Belum ada absensi hari ini.</p>}
            {recentCoachAtt.map((a) => (
              <div key={`c-${a.id}`} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-paper-tint">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.is_manual ? "bg-manual-50 text-manual-500" : "bg-wave-50 text-wave-600"}`}>
                  <Icon name="swim" className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink truncate">{a.profile?.full_name}</div>
                  <div className="text-[10px] text-ink-mute">Coach · {a.class?.name}</div>
                </div>
                <span className="text-[10px] font-mono text-ink-faint">{a.clock_in_time?.slice(0, 5)}</span>
              </div>
            ))}
            {recentMemberAtt.map((a) => (
              <div key={`m-${a.id}`} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-paper-tint">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-ok-50 text-ok-600">
                  <Icon name="users" className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink truncate">{a.member_name}</div>
                  <div className="text-[10px] text-ink-mute">Member · {a.class_name}</div>
                </div>
                <span className="text-[10px] font-mono text-ink-faint text-ok-500">Hadir</span>
              </div>
            ))}
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

const EMPTY_CLASS_FORM = { name: "", class_type: "reguler", schedule_days: [] as string[], schedule_times: [] as ScheduleSlot[], same_time_all: true, time_start: "", time_end: "", capacity: "", price_monthly: "", price_per_session: "", show_on_landing: true, goals: "", description: "", photo_url: "" };
const DAY_OPTS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

function AdminClass({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { upload, uploading: uploadingPhoto } = useUpload();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit class modal
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);
  const [classPhotoFile, setClassPhotoFile] = useState<File | null>(null);
  const [classPhotoPreview, setClassPhotoPreview] = useState<string | null>(null);

  // Criteria (aspek penilaian) modal
  const [criteriaClass, setCriteriaClass] = useState<ClassRow | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: "" });
  const [savingCriterion, setSavingCriterion] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, schedule_days, time_start, time_end, schedule_times, show_on_landing, goals, description, photo_url, spreadsheet_url, spreadsheet_filled, class_coaches(profile:profiles(full_name, id))")
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

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_CLASS_FORM); setClassPhotoFile(null); setClassPhotoPreview(null); setOpenForm(true); };
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
      show_on_landing: c.show_on_landing ?? false, goals: c.goals ?? "", description: c.description ?? "",
      photo_url: c.photo_url ?? "",
    });
    setClassPhotoFile(null);
    setClassPhotoPreview(null);
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
      let photoUrl = form.photo_url || null;
      if (classPhotoFile) {
        try { photoUrl = await upload.classPhoto(classPhotoFile, editTarget.id); } catch { /* non-fatal */ }
      }
      const updatePayload: Database["public"]["Tables"]["classes"]["Update"] = { name: form.name, class_type: form.class_type, schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null, time_start: firstSlot?.time_start || form.time_start || undefined, time_end: firstSlot?.time_end || form.time_end || undefined, capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, show_landing: form.show_on_landing, goals: form.goals.trim() || null, description: form.description.trim() || null, photo_url: photoUrl };
      const { error } = await supabase.from("classes").update(updatePayload).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error("Gagal update kelas", error.message);
      toast.success("Kelas diperbarui");
    } else {
      const insertPayload: Database["public"]["Tables"]["classes"]["Insert"] = { name: form.name, class_type: form.class_type, schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null, time_start: firstSlot?.time_start || form.time_start || "", time_end: firstSlot?.time_end || form.time_end || "", capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, show_landing: form.show_on_landing, goals: form.goals.trim() || null, description: form.description.trim() || null, branch_id: branchId, status: "active", enrolled: 0 };
      const { data: insertData, error } = await supabase.from("classes").insert(insertPayload).select("id").single();
      if (error) { setSaving(false); return toast.error("Gagal membuat kelas", error.message); }
      if (classPhotoFile && insertData?.id) {
        try {
          const photoUrl = await upload.classPhoto(classPhotoFile, insertData.id);
          await supabase.from("classes").update({ photo_url: photoUrl }).eq("id", insertData.id);
        } catch { /* non-fatal */ }
      }
      setSaving(false);
      toast.success("Kelas dibuat");
    }
    setOpenForm(false);
    setClassPhotoFile(null);
    setClassPhotoPreview(null);
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
    const yes = await confirm({ body: "Hapus aspek penilaian ini? Data rapor yang sudah diisi tidak akan terpengaruh." });
    if (!yes) return;
    await supabase.from("class_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success("Aspek penilaian dihapus");
  };

  const kindLabel: Record<string, string> = { score_10: "Nilai 1–10", score_100: "Nilai 1–100", choice: "Pilihan ganda", text: "Teks bebas" };

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
                  ? <div className="aspect-video w-full overflow-hidden bg-paper-deep"><Image src={c.photo_url} alt={c.name} width={480} height={270} className="w-full h-full object-cover" /></div>
                  : <Placeholder label={c.id} ratio="16/9" className="rounded-none border-0" />
                }
                <div className="absolute top-3 left-3 right-3 flex justify-between gap-2">
                  {archived
                    ? <Status kind="archived">Diarsipkan</Status>
                    : c.show_on_landing && <Status kind="active" className="!bg-white/95">Tampil di landing</Status>
                  }
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
                  {c.spreadsheet_filled && c.spreadsheet_url ? (
                    <a href={c.spreadsheet_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-ok-600 hover:underline">
                      <Icon name="link" className="w-3 h-3" />Spreadsheet
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warn-500">
                      <Icon name="warning" className="w-3 h-3" />Belum ada spreadsheet
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                  <div className="font-display font-bold text-ocean-700">{fmtIDR(c.price_monthly)}<span className="text-xs text-ink-mute font-semibold">/bln</span></div>
                  <div className="flex gap-1">
                    {archived ? (
                      <button onClick={() => restoreClass(c)} title="Aktifkan kembali" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ok-600 flex items-center justify-center"><Icon name="check" className="w-4 h-4" /></button>
                    ) : (
                      <>
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
                <Field label="Harga/bulan" required><Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))} className="font-mono" placeholder="550000" min="0" /></Field>
              </>
            )}
            {isPrivate && (
              <Field label="Harga per sesi" hint="Rp per pertemuan"><Input type="number" value={form.price_per_session} onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value }))} className="font-mono" placeholder="150000" min="0" /></Field>
            )}
          </div>

          {/* Hari & Jam */}
          <Field label={isPrivate ? "Preferensi hari latihan" : "Hari sesi"} required={!isPrivate} hint={isPrivate ? "Opsional — hanya sebagai info" : "Pilih satu atau lebih hari, lalu atur jam per hari"}>
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
                      <Input type="time" value={form.time_start}
                        onChange={e => setForm(f => ({
                          ...f,
                          time_start: e.target.value,
                          schedule_times: f.schedule_times.map(s => ({ ...s, time_start: e.target.value })),
                        }))} />
                    </Field>
                    <Field label="Jam selesai" className="flex-1 min-w-[120px]">
                      <Input type="time" value={form.time_end}
                        onChange={e => setForm(f => ({
                          ...f,
                          time_end: e.target.value,
                          schedule_times: f.schedule_times.map(s => ({ ...s, time_end: e.target.value })),
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
                            <Input type="time" value={slot.time_start} className="flex-1 text-sm"
                              onChange={e => updateSlotTime(day, "time_start", e.target.value)} />
                            <span className="text-ink-faint self-center text-xs">–</span>
                            <Input type="time" value={slot.time_end} className="flex-1 text-sm"
                              onChange={e => updateSlotTime(day, "time_end", e.target.value)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Field>
          <Field label="Tujuan kelas" hint="Tampil di coach page dan member page"><Textarea rows={2} value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder="Mis. Pengenalan air, membangun rasa percaya diri di air." /></Field>
          <Field label="Deskripsi kelas" hint="Opsional — tampil di coach page dan member page"><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mis. Kelas ini dirancang untuk anak usia 4–6 tahun yang baru pertama kali belajar renang..." /></Field>
          <Field label="Foto kelas" hint="Opsional — tampil di kartu kelas">
            <div className="flex items-start gap-4">
              {(classPhotoPreview || form.photo_url) && (
                <div className="shrink-0 relative">
                  <Image src={classPhotoPreview ?? form.photo_url!} alt="Foto kelas" width={80} height={60} className="rounded-lg object-cover border border-line w-20 h-[60px]" />
                </div>
              )}
              <label className="flex-1 cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line hover:border-ocean-400 bg-paper-tint hover:bg-ocean-50/30 transition-colors py-4 px-3">
                <Icon name="camera" className="w-5 h-5 text-ink-mute" />
                <span className="text-xs text-ink-mute font-medium">{uploadingPhoto ? "Mengunggah…" : "Pilih foto"}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setClassPhotoFile(f);
                  setClassPhotoPreview(f ? URL.createObjectURL(f) : null);
                }} />
              </label>
            </div>
          </Field>
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
          {editTarget && (
            <div className="border-t border-line pt-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Spreadsheet Program</div>
              {editTarget.spreadsheet_filled && editTarget.spreadsheet_url ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-ok-50 border border-ok-200">
                  <Icon name="link" className="w-4 h-4 text-ok-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ok-700 font-semibold">Sudah diisi coach</div>
                    <a href={editTarget.spreadsheet_url} target="_blank" rel="noreferrer"
                      className="text-xs text-ocean-600 hover:underline truncate block max-w-xs">{editTarget.spreadsheet_url}</a>
                  </div>
                  <a href={editTarget.spreadsheet_url} target="_blank" rel="noreferrer">
                    <Btn variant="soft" size="sm" icon="link">Buka</Btn>
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-sm text-warn-700">
                  <Icon name="warning" className="w-4 h-4 shrink-0 text-warn-500" />
                  Spreadsheet program belum diisi oleh coach.
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
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [openAddSesi, setOpenAddSesi] = useState(false);
  const [addSesiForm, setAddSesiForm] = useState({ jumlah: "", generate_bill: false });
  const [savingAddSesi, setSavingAddSesi] = useState(false);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const db = createClient();
    const sel = "id, profile_id, type, status, date_start, qr_code, school_id, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email, avatar_url), member_classes(class:classes(id, name))";
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

    // Upload avatar if selected
    if (createAvatarFile && json.user_id) {
      try {
        const fd = new FormData();
        fd.append("file", createAvatarFile);
        fd.append("profile_id", json.user_id);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    toast.success("Member dibuat", "Akun langsung aktif");
    setSaving(false);
    setOpenCreate(false);
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
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
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
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

    // Upload avatar if changed
    if (editAvatarFile) {
      try {
        const fd = new FormData();
        fd.append("file", editAvatarFile);
        fd.append("profile_id", detail.profile_id);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    setSavingEdit(false);
    toast.success("Data member diperbarui");
    setOpenEditMember(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    load();
  };

  const resetPassword = async () => {
    if (!detail) return;
    if (!newPwd || newPwd.length < 6) return toast.error("Password minimal 6 karakter");
    const res = await fetch(`/api/admin/users/${detail.profile_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) { toast.success("Password direset"); setOpenResetPwd(false); setNewPwd(""); setShowNewPwd(false); }
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
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [photoView, setPhotoView] = useState<string | null>(null);

  const [detailTab, setDetailTab] = useState<"info" | "absensi" | "pembayaran">("info");
  const [attendances, setAttendances] = useState<{ id: string; date: string; status: string; note: string | null; class: { name: string } | null }[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attLoaded, setAttLoaded] = useState(false);
  const [attClassFilter, setAttClassFilter] = useState("");
  const [bills, setBills] = useState<{ id: string; period_label: string; amount: number; discount: number; discount_reason: string | null; total: number; status: string; paid_at: string | null; payment_method: string | null }[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billsLoaded, setBillsLoaded] = useState(false);

  const loadAttendances = async (memberId: string) => {
    setLoadingAtt(true);
    const { data } = await supabase
      .from("member_attendances")
      .select("id, date, status, note, class:classes(name)")
      .eq("member_id", memberId)
      .order("date", { ascending: false })
      .limit(100);
    setAttendances((data ?? []) as unknown as typeof attendances);
    setAttLoaded(true);
    setLoadingAtt(false);
  };

  const loadBills = async (memberId: string) => {
    setLoadingBills(true);
    const { data } = await supabase
      .from("bills")
      .select("id, period_label, amount, discount, discount_reason, total, status, paid_at, payment_method")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    setBills((data ?? []) as unknown as typeof bills);
    setBillsLoaded(true);
    setLoadingBills(false);
  };

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
      .select("id, profile_id, type, status, date_start, qr_code, school_id, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email, avatar_url), member_classes(class:classes(id, name))")
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
          <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1 flex-wrap">
            {[["all", "Semua"], ["reguler", "Reguler"], ["private", "Private"], ["school_affiliate", "Afiliasi"], ["suspended", "Suspend"]].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">Member</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">Tipe</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">Kelas</th>
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
                    <tr key={m.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => { setDetail(m); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); setAttendances([]); setBills([]); setAttClassFilter(""); }}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName} src={m.profile?.avatar_url ?? undefined} size={38} />
                          <div className="min-w-0"><div className="font-semibold text-ink truncate max-w-[120px] sm:max-w-none">{fullName}</div>{age && <div className="text-xs text-ink-mute">{age} thn</div>}</div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell"><Status kind={m.type === "private" ? "substitute" : m.type === "school_affiliate" ? "school_covered" : "active"} dot={false}>{m.type === "reguler" ? "Reguler" : m.type === "private" ? "Private" : "Afiliasi"}</Status></td>
                      <td className="text-ink-soft text-xs hidden md:table-cell max-w-[150px] truncate">{cls}</td>
                      <td><Status kind={m.status === "suspended" ? "suspended" : "active"}>{m.status === "suspended" ? "Suspend" : "Aktif"}</Status></td>
                      <td className="px-5"><button className="text-ink-mute hover:text-ocean-600 p-1.5"><Icon name="eye" className="w-4 h-4" /></button></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-ink-mute">Tidak ada member</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => { setDetail(null); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); }} title={detail?.profile?.full_name ?? ""} size="xl"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setDetail(null); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); }}>Tutup</Btn>
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
          const memberClassNames = detail.member_classes?.map(mc => mc.class?.name).filter(Boolean) as string[] ?? [];
          const filteredAtt = attClassFilter ? attendances.filter(a => a.class?.name === attClassFilter) : attendances;
          return (
            <div className="grid md:grid-cols-3 gap-5">
              {/* Left: avatar + QR */}
              <div className="text-center">
                <div className="flex justify-center">
                  <button type="button" onClick={() => p?.avatar_url && setPhotoView(p.avatar_url)} className={p?.avatar_url ? "cursor-zoom-in" : "cursor-default"}>
                    <Avatar name={p?.full_name ?? ""} src={p?.avatar_url ?? undefined} size={96} />
                  </button>
                </div>
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

              {/* Right: tabbed detail */}
              <div className="md:col-span-2 space-y-4 text-sm">
                {/* Tab bar */}
                <div className="flex gap-1 bg-paper-tint rounded-xl p-1">
                  {([["info", "Info"], ["absensi", "Absensi"], ["pembayaran", "Pembayaran"]] as const).map(([id, label]) => (
                    <button key={id} type="button"
                      onClick={() => {
                        setDetailTab(id);
                        if (id === "absensi" && !attLoaded) loadAttendances(detail.id);
                        if (id === "pembayaran" && !billsLoaded) loadBills(detail.id);
                      }}
                      className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${detailTab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab: Info */}
                {detailTab === "info" && (
                  <>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tipe</div><div className="font-semibold text-ink capitalize">{detail.type === "reguler" ? "Reguler" : detail.type === "private" ? "Private" : "Afiliasi Sekolah"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sejak</div><div className="font-semibold text-ink">{fmtDate(detail.date_start)}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sisa sesi</div><div className="font-semibold text-ink">{detail.remaining_sessions != null ? `${detail.remaining_sessions} / ${detail.total_sessions ?? "—"}` : "—"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Jenis kelamin</div><div className="font-semibold text-ink">{p?.gender === "male" ? "Laki-laki" : p?.gender === "female" ? "Perempuan" : "—"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tanggal lahir</div><div className="font-semibold text-ink">{p?.birth_date ? fmtDate(p.birth_date) : "—"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Email</div><div className="font-semibold text-ink text-xs break-all">{p?.email ?? "—"}</div></div>
                    </div>
                    <div className="pt-3 border-t border-line grid grid-cols-2 gap-x-4 gap-y-3">
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">No HP</div><div className="font-semibold text-ink font-mono text-xs">{p?.phone ?? "—"}</div></div>
                    </div>
                    {(p?.address || p?.health_notes) && (
                      <div className="pt-3 border-t border-line space-y-2">
                        {p?.address && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">Alamat</div><div className="text-ink-soft leading-snug">{p.address}</div></div>}
                        {p?.health_notes && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">Catatan kesehatan</div><div className="text-ink-soft leading-snug">{p.health_notes}</div></div>}
                      </div>
                    )}
                    {detail.status === "suspended" && (
                      <div className="pt-3 border-t border-line bg-warn-50 rounded-xl px-3 py-2">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-warn-500">Suspend s.d.</div>
                        <div className="font-semibold text-warn-700">{fmtDate(detail.suspend_until ?? "")}</div>
                        {detail.suspend_reason && <div className="text-xs text-warn-600 mt-0.5">{detail.suspend_reason}</div>}
                      </div>
                    )}
                    <div className="pt-3 border-t border-line">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">Kelas yang diikuti</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.member_classes?.map((mc, i) => mc.class && <span key={i} className="px-2 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold">{mc.class.name}</span>)}
                        {(detail.member_classes?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">Belum assign ke kelas</span>}
                      </div>
                    </div>
                  </>
                )}

                {/* Tab: Absensi */}
                {detailTab === "absensi" && (
                  <div className="space-y-3">
                    {memberClassNames.length > 1 && (
                      <Select value={attClassFilter} onChange={e => setAttClassFilter(e.target.value)} className="text-xs">
                        <option value="">Semua kelas</option>
                        {memberClassNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    )}
                    {loadingAtt ? (
                      <div className="py-8 text-center text-ink-mute text-sm">Memuat…</div>
                    ) : filteredAtt.length === 0 ? (
                      <div className="py-8 text-center text-ink-mute text-sm">Belum ada riwayat absensi.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                              <th className="text-left py-2 px-3 font-bold">Tanggal</th>
                              <th className="text-left py-2 font-bold">Kelas</th>
                              <th className="text-left py-2 font-bold">Status</th>
                              <th className="text-left py-2 px-3 font-bold">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {filteredAtt.map(a => (
                              <tr key={a.id} className="hover:bg-paper-tint">
                                <td className="py-2 px-3 font-mono whitespace-nowrap">{fmtDate(a.date)}</td>
                                <td className="py-2 text-ink-soft">{a.class?.name ?? "—"}</td>
                                <td className="py-2">
                                  {a.status === "hadir"
                                    ? <Status kind="approved" dot={false}>Hadir</Status>
                                    : a.status === "izin"
                                    ? <Status kind="pending" dot={false}>Izin</Status>
                                    : a.status === "sakit"
                                    ? <Status kind="pending" dot={false}>Sakit</Status>
                                    : <Status kind="rejected" dot={false}>Tidak Hadir</Status>
                                  }
                                </td>
                                <td className="py-2 px-3 text-ink-mute">{a.note ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Pembayaran */}
                {detailTab === "pembayaran" && (
                  <div className="space-y-3">
                    {loadingBills ? (
                      <div className="py-8 text-center text-ink-mute text-sm">Memuat…</div>
                    ) : bills.length === 0 ? (
                      <div className="py-8 text-center text-ink-mute text-sm">Belum ada riwayat pembayaran.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                              <th className="text-left py-2 px-3 font-bold">Periode</th>
                              <th className="text-right py-2 font-bold">Nominal</th>
                              <th className="text-right py-2 font-bold">Diskon</th>
                              <th className="text-right py-2 font-bold">Total</th>
                              <th className="text-left py-2 font-bold">Status</th>
                              <th className="text-left py-2 px-3 font-bold">Tgl Bayar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {bills.map(b => (
                              <tr key={b.id} className="hover:bg-paper-tint">
                                <td className="py-2 px-3 font-semibold text-ink">{b.period_label}</td>
                                <td className="py-2 text-right font-mono text-ink-soft">{fmtIDR(b.amount)}</td>
                                <td className="py-2 text-right">
                                  {b.discount > 0
                                    ? <span className="text-ok-600 font-mono" title={b.discount_reason ?? undefined}>-{fmtIDR(b.discount)}</span>
                                    : <span className="text-ink-faint">—</span>
                                  }
                                </td>
                                <td className="py-2 text-right font-mono font-bold text-ink">{fmtIDR(b.total)}</td>
                                <td className="py-2">
                                  {b.status === "paid"
                                    ? <Status kind="approved" dot={false}>Lunas</Status>
                                    : b.status === "unpaid"
                                    ? <Status kind="rejected" dot={false}>Belum Bayar</Status>
                                    : b.status === "partial"
                                    ? <Status kind="pending" dot={false}>Sebagian</Status>
                                    : b.status === "free"
                                    ? <Status kind="archived" dot={false}>Gratis</Status>
                                    : <Status kind="school_covered" dot={false}>Sekolah</Status>
                                  }
                                </td>
                                <td className="py-2 px-3 text-ink-mute whitespace-nowrap">{b.paid_at ? fmtDate(b.paid_at) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit member modal */}
      <Modal open={openEditMember} onClose={() => setOpenEditMember(false)} title={`Edit Member — ${detail?.profile?.full_name ?? ""}`} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditMember(false)}>Batal</Btn><Btn variant="primary" onClick={saveMemberEdit} disabled={savingEdit}>{savingEdit ? "Menyimpan…" : "Simpan Perubahan"}</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Avatar picker */}
          <div className="sm:col-span-2 flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar
                name={editMemberForm.full_name || detail?.profile?.full_name || ""}
                src={editAvatarPreview ?? detail?.profile?.avatar_url ?? undefined}
                size={80}
                className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
              />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setEditAvatarFile(f);
                setEditAvatarPreview(f ? URL.createObjectURL(f) : null);
              }} />
            </label>
            <p className="text-xs text-ink-faint">Klik untuk ganti foto (opsional)</p>
          </div>
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
        <Field label="Password baru" hint="Min. 6 karakter">
          <div className="relative">
            <Input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" className="pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowNewPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
              <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </Modal>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Tambah Member Baru" size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>Batal</Btn><Btn variant="primary" onClick={createMember} disabled={saving}>{saving ? "Menyimpan…" : "Simpan & kirim WA"}</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Avatar picker */}
          <div className="sm:col-span-2 flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar
                name={form.full_name || "?"}
                src={createAvatarPreview ?? undefined}
                size={80}
                className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
              />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setCreateAvatarFile(f);
                setCreateAvatarPreview(f ? URL.createObjectURL(f) : null);
              }} />
            </label>
            <p className="text-xs text-ink-faint">Foto profil (opsional)</p>
          </div>
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

      {photoView && (
        <PhotoLightbox src={photoView} name={detail?.profile?.full_name ?? ""} onClose={() => setPhotoView(null)} />
      )}
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

const EMPTY_COACH_FORM = { full_name: "", nick_name: "", email: "", phone: "", password: "", gender: "", birth_date: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" };

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
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [coachCredential, setCoachCredential] = useState<{ full_name: string; email: string; password: string; phone: string } | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);

  // detail panel
  const [detail, setDetail] = useState<CoachFull | null>(null);

  // edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", nick_name: "", gender: "", birth_date: "", phone: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" });
  const [editSaving, setEditSaving] = useState(false);
  // certifications to add during create
  const [createCerts, setCreateCerts] = useState<{ title: string; issuer: string; valid_from: string; valid_until: string; no_expiry: boolean }[]>([]);
  // add cert from detail panel
  const [openAddCert, setOpenAddCert] = useState(false);
  const [certForm, setCertForm] = useState({ title: "", issuer: "", issued_at: "" });
  const [savingCert, setSavingCert] = useState(false);

  // suspend
  const [suspendTarget, setSuspendTarget] = useState<CoachFull | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [suspendForm, setSuspendForm] = useState({ reason: "", until: "" });

  // reset password
  const [openReset, setOpenReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // assign class
  const [openAssign, setOpenAssign] = useState(false);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null }[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const { data, error } = await createClient().from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, suspend_until, suspend_reason, is_archived, certifications!certifications_coach_id_fkey(id, name, title, status, valid_from, valid_until), class_coaches(class_id, class:classes(id, name, time_start, time_end, schedule_days))")
      .eq("branch_id", branchId).eq("role", "coach").order("full_name");
    if (error) return;
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
    const json = await res.json() as { user_id?: string; error?: string };
    if (!res.ok) { toast.error("Gagal membuat coach", json.error); setSaving(false); return; }

    const uid = json.user_id!;
    const db = createClient();

    // Save extended profile fields
    const extraFields: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (form.nick_name) extraFields.nick_name = form.nick_name;
    if (form.gender) extraFields.gender = form.gender;
    if (form.birth_date) extraFields.birth_date = form.birth_date;
    if (form.address) extraFields.address = form.address;
    if (form.bio) extraFields.bio = form.bio;
    if (form.education_level) extraFields.education_level = form.education_level;
    if (form.education_institution) extraFields.education_institution = form.education_institution;
    if (form.bank_name) extraFields.bank_name = form.bank_name;
    if (form.bank_account) extraFields.bank_account = form.bank_account;
    if (form.bank_holder) extraFields.bank_holder = form.bank_holder;
    if (Object.keys(extraFields).length > 0) {
      await db.from("profiles").update(extraFields).eq("id", uid);
    }

    // Insert certifications if any
    if (createCerts.length > 0) {
      const certRows: Database["public"]["Tables"]["certifications"]["Insert"][] = createCerts.filter(c => c.title).map(c => ({
        coach_id: uid, name: c.title, title: c.title,
        issuer: c.issuer || null,
        valid_from: c.valid_from || null,
        valid_until: c.no_expiry ? null : (c.valid_until || null),
        status: "pending" as Database["public"]["Enums"]["cert_status"],
      }));
      if (certRows.length > 0) await db.from("certifications").insert(certRows);
    }

    // Upload avatar if selected
    if (createAvatarFile) {
      try {
        const fd = new FormData();
        fd.append("file", createAvatarFile);
        fd.append("profile_id", uid);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    setSaving(false);
    setOpenAdd(false);
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
    setCreateCerts([]);
    setCoachCredential({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone });
    setForm(EMPTY_COACH_FORM);
    load();
  };

  const saveEdit = async () => {
    if (!detail) return;
    if (!editForm.full_name) return toast.error("Nama wajib diisi");
    setEditSaving(true);
    const { error } = await createClient().from("profiles")
      .update({
        full_name: editForm.full_name,
        nick_name: editForm.nick_name || null,
        gender: editForm.gender || null,
        birth_date: editForm.birth_date || null,
        phone: editForm.phone || null,
        specialization: editForm.specialization || null,
        bio: editForm.bio || null,
        address: editForm.address || null,
        education_level: editForm.education_level || null,
        education_institution: editForm.education_institution || null,
        bank_name: editForm.bank_name || null,
        bank_account: editForm.bank_account || null,
        bank_holder: editForm.bank_holder || null,
      })
      .eq("id", detail.id);
    if (error) { setEditSaving(false); return toast.error("Gagal menyimpan", error.message); }

    // Upload avatar if changed
    if (editAvatarFile) {
      try {
        const fd = new FormData();
        fd.append("file", editAvatarFile);
        fd.append("profile_id", detail.id);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    setEditSaving(false);
    toast.success("Data coach diperbarui");
    setOpenEdit(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setDetail(prev => prev ? { ...prev, ...editForm } : prev);
    load();
  };

  const addCert = async () => {
    if (!detail || !certForm.title) return toast.error("Judul sertifikasi wajib diisi");
    setSavingCert(true);
    const { data, error } = await createClient().from("certifications").insert({
      coach_id: detail.id, name: certForm.title, title: certForm.title,
      issuer: certForm.issuer || null, valid_from: certForm.issued_at || null, status: "pending",
    }).select("id, name, title, status, valid_from, valid_until").single();
    setSavingCert(false);
    if (error) return toast.error("Gagal menambah sertifikasi", error.message);
    toast.success("Sertifikasi ditambahkan");
    setOpenAddCert(false);
    setCertForm({ title: "", issuer: "", issued_at: "" });
    setDetail(prev => prev ? { ...prev, certifications: [...(prev.certifications ?? []), data as { id: string; name: string; title: string | null; status: string; valid_from: string | null; valid_until: string | null }] } : prev);
  };

  const deleteCert = async (certId: string) => {
    if (!detail) return;
    const ok = await confirm({ body: "Hapus sertifikasi ini?" });
    if (!ok) return;
    const { error } = await createClient().from("certifications").delete().eq("id", certId);
    if (error) return toast.error("Gagal menghapus sertifikasi", error.message);
    toast.success("Sertifikasi dihapus");
    setDetail(prev => prev ? { ...prev, certifications: (prev.certifications ?? []).filter(c => c.id !== certId) } : prev);
  };

  const doSuspend = async () => {
    if (!suspendTarget || !suspendForm.reason || !suspendForm.until) return toast.error("Alasan dan tanggal berakhir wajib diisi");
    setSuspending(true);
    const { error } = await createClient().from("profiles").update({ suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", suspendTarget.id);
    setSuspending(false);
    if (error) return toast.error("Gagal suspend coach", error.message);
    toast.success(`${suspendTarget.full_name} di-suspend hingga ${fmtDate(suspendForm.until)}`);
    setSuspendTarget(null);
    if (detail?.id === suspendTarget.id) setDetail(prev => prev ? { ...prev, suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } : prev);
    load();
  };

  const liftSuspend = async (c: CoachFull) => {
    const { error } = await createClient().from("profiles").update({ suspend_until: null, suspend_reason: null } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error("Gagal mengakhiri suspend", error.message);
    toast.success("Suspend diakhiri");
    if (detail?.id === c.id) setDetail(prev => prev ? { ...prev, suspend_until: null, suspend_reason: null } : prev);
    load();
  };

  const toggleArchive = async (c: CoachFull) => {
    const archiving = !c.is_archived;
    const ok = await confirm({ body: archiving ? `Arsipkan coach ${c.full_name}? Coach tidak akan muncul di daftar aktif.` : `Aktifkan kembali coach ${c.full_name}?` });
    if (!ok) return;
    const { error } = await createClient().from("profiles").update({ is_archived: archiving } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
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
    setShowNewPassword(false);
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
          <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_COACH_FORM); setCreateAvatarFile(null); setCreateAvatarPreview(null); setOpenAdd(true); }}>Tambah Coach</Btn>
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
                  <Avatar name={c.full_name} src={c.avatar_url ?? undefined} size={52} />
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
                  <button type="button" onClick={() => detail.avatar_url && setPhotoView(detail.avatar_url)} className={detail.avatar_url ? "cursor-zoom-in shrink-0" : "cursor-default shrink-0"}>
                    <Avatar name={detail.full_name} src={detail.avatar_url ?? undefined} size={64} />
                  </button>
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

                {/* Extra profile info */}
                {(detail.nick_name || detail.gender || detail.birth_date || detail.address || detail.education_level) && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Info Pribadi</div>
                    <div className="bg-paper-tint rounded-xl divide-y divide-line">
                      {detail.nick_name && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Nama panggilan</span><span className="text-sm text-ink">{detail.nick_name}</span></div>}
                      {detail.gender && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Jenis kelamin</span><span className="text-sm text-ink">{detail.gender === "male" ? "Laki-laki" : "Perempuan"}</span></div>}
                      {detail.birth_date && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Tgl lahir</span><span className="text-sm text-ink">{fmtDate(detail.birth_date)} ({calcAge(detail.birth_date)} thn)</span></div>}
                      {detail.education_level && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Pendidikan</span><span className="text-sm text-ink">{detail.education_level}{detail.education_institution ? ` — ${detail.education_institution}` : ""}</span></div>}
                      {detail.address && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute shrink-0">Alamat</span><span className="text-sm text-ink text-right ml-4">{detail.address}</span></div>}
                    </div>
                  </div>
                )}

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

                {/* Bio */}
                {detail.bio && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Bio</div>
                    <p className="text-sm text-ink leading-relaxed">{detail.bio}</p>
                  </div>
                )}

                {/* Bank info */}
                {detail.bank_name && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Rekening</div>
                    <div className="px-4 py-3 bg-paper-tint rounded-xl text-sm">
                      <div className="font-semibold text-ink">{detail.bank_name}</div>
                      <div className="text-ink-mute">{detail.bank_account} · a/n {detail.bank_holder}</div>
                    </div>
                  </div>
                )}

                {/* Certifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sertifikasi</div>
                    {!archived && (
                      <button onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "" }); setOpenAddCert(true); }} className="text-xs text-ocean-600 font-semibold hover:underline">+ Tambah</button>
                    )}
                  </div>
                  {(detail.certifications?.length ?? 0) === 0 ? (
                    <div className="text-xs text-ink-mute italic">Belum ada sertifikasi.</div>
                  ) : (
                    <div className="space-y-2">
                      {detail.certifications!.map((ct) => (
                        <div key={ct.id} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                          <div>
                            <div className="font-semibold text-sm text-ink">{ct.title ?? ct.name}</div>
                            {ct.valid_from && <div className="text-xs text-ink-mute font-mono mt-0.5">{ct.valid_from}{ct.valid_until ? ` – ${ct.valid_until}` : " · Tidak kedaluwarsa"}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Status kind={ct.status === "approved" ? "active" : ct.status === "pending" ? "pending" : "inactive"}>
                              {ct.status === "approved" ? "Aktif" : ct.status === "pending" ? "Review" : "Ditolak"}
                            </Status>
                            {!archived && (
                              <button type="button" onClick={() => deleteCert(ct.id)} className="p-1 rounded hover:bg-danger-50 text-danger-400 hover:text-danger-600 transition-colors">
                                <Icon name="x" className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="sticky bottom-0 bg-white border-t border-line px-5 py-4 space-y-2">
                {!archived && (
                  <>
                    <div className="flex gap-2">
                      <Btn variant="outline" size="sm" icon="edit" className="flex-1" onClick={() => { setEditForm({ full_name: detail.full_name, nick_name: detail.nick_name ?? "", gender: detail.gender ?? "", birth_date: detail.birth_date ?? "", phone: detail.phone ?? "", specialization: detail.specialization ?? "", bio: detail.bio ?? "", address: detail.address ?? "", education_level: detail.education_level ?? "", education_institution: detail.education_institution ?? "", bank_name: detail.bank_name ?? "", bank_account: detail.bank_account ?? "", bank_holder: detail.bank_holder ?? "" }); setEditAvatarFile(null); setEditAvatarPreview(null); setOpenEdit(true); }}>Edit Data</Btn>
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
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Coach" size="md"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={createCoach} disabled={saving}>{saving ? "Membuat…" : "Buat Akun"}</Btn></>}>
        <div className="space-y-4">
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar name={form.full_name || "?"} src={createAvatarPreview ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setCreateAvatarFile(f); setCreateAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
            </label>
            <p className="text-xs text-ink-faint">Foto profil (opsional)</p>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Data Pribadi</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama lengkap" required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nama lengkap" /></Field>
                <Field label="Nama panggilan" hint="Opsional"><Input value={form.nick_name} onChange={e => setForm(f => ({ ...f, nick_name: e.target.value }))} placeholder="Nama panggilan" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Jenis kelamin">
                  <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Pilih…</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </Select>
                </Field>
                <Field label="Tanggal lahir" hint="Opsional"><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></Field>
              </div>
              <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
              <Field label="No HP / WA"><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
              <Field label="Alamat" hint="Opsional"><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Pendidikan (Opsional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Pendidikan terakhir">
                <Select value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">Pilih…</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Nama instansi"><Input value={form.education_institution} onChange={e => setForm(f => ({ ...f, education_institution: e.target.value }))} placeholder="Mis. Universitas Indonesia" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Profil Pelatih</div>
            <div className="space-y-3">
              <Field label="Spesialisasi" hint="Opsional"><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Teknik renang anak" /></Field>
              <Field label="Bio / Deskripsi" hint="Opsional"><Textarea rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Ceritakan sedikit tentang coach…" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Informasi Rekening (Opsional)</div>
            <div className="space-y-3">
              <Field label="Nama bank"><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Mis. BCA, BRI, Mandiri" /></Field>
              <Field label="Nomor rekening"><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Nomor rekening" /></Field>
              <Field label="Atas nama"><Input value={form.bank_holder} onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Nama pemilik rekening" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">Sertifikasi (Opsional)</div>
              <Btn variant="ghost" size="sm" icon="plus" onClick={() => setCreateCerts(cs => [...cs, { title: "", issuer: "", valid_from: "", valid_until: "", no_expiry: false }])}>Tambah</Btn>
            </div>
            {createCerts.map((c, i) => (
              <div key={i} className="relative border border-line rounded-xl p-3 mb-3 space-y-2">
                <button type="button" onClick={() => setCreateCerts(cs => cs.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors"><Icon name="x" className="w-4 h-4" /></button>
                <Input placeholder="Nama sertifikasi*" value={c.title} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <Input placeholder="Lembaga penerbit (opsional)" value={c.issuer} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-ink-mute mb-1 block">Berlaku dari</label><Input type="date" value={c.valid_from} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_from: e.target.value } : x))} /></div>
                  <div><label className="text-xs text-ink-mute mb-1 block">Berlaku sampai</label><Input type="date" value={c.valid_until} disabled={c.no_expiry} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_until: e.target.value } : x))} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                  <input type="checkbox" checked={c.no_expiry} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, no_expiry: e.target.checked, valid_until: "" } : x))} className="rounded" />
                  Tidak ada kedaluwarsa
                </label>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Akun</div>
            <Field label="Password awal" required><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 karakter" /></Field>
          </div>
        </div>
      </Modal>

      {/* ── Edit coach modal ── */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Edit Data Coach" size="md"
        footer={<><Btn variant="ghost" onClick={() => setOpenEdit(false)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar name={editForm.full_name || detail?.full_name || ""} src={editAvatarPreview ?? detail?.avatar_url ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setEditAvatarFile(f); setEditAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
            </label>
            <p className="text-xs text-ink-faint">Klik untuk ganti foto (opsional)</p>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Data Pribadi</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama lengkap" required><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
                <Field label="Nama panggilan" hint="Opsional"><Input value={editForm.nick_name} onChange={e => setEditForm(f => ({ ...f, nick_name: e.target.value }))} placeholder="Nama panggilan" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Jenis kelamin">
                  <Select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Pilih…</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </Select>
                </Field>
                <Field label="Tanggal lahir" hint="Opsional"><Input type="date" value={editForm.birth_date} onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))} /></Field>
              </div>
              <Field label="No HP / WA"><Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
              <Field label="Alamat" hint="Opsional"><Textarea rows={2} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Pendidikan (Opsional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Pendidikan terakhir">
                <Select value={editForm.education_level} onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">Pilih…</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Nama instansi"><Input value={editForm.education_institution} onChange={e => setEditForm(f => ({ ...f, education_institution: e.target.value }))} placeholder="Mis. Universitas Indonesia" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Profil Pelatih</div>
            <div className="space-y-3">
              <Field label="Spesialisasi" hint="Opsional"><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Teknik renang anak" /></Field>
              <Field label="Bio / Deskripsi" hint="Opsional"><Textarea rows={2} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Ceritakan sedikit tentang coach…" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Informasi Rekening (Opsional)</div>
            <div className="space-y-3">
              <Field label="Nama bank"><Input value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Mis. BCA, BRI, Mandiri" /></Field>
              <Field label="Nomor rekening"><Input value={editForm.bank_account} onChange={e => setEditForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Nomor rekening" /></Field>
              <Field label="Atas nama"><Input value={editForm.bank_holder} onChange={e => setEditForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Nama pemilik rekening" /></Field>
            </div>
          </div>
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
            <div className="relative">
              <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password baru…" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showNewPassword ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
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

      {/* ── Add certification modal ── */}
      <Modal open={openAddCert} onClose={() => setOpenAddCert(false)} title={`Tambah Sertifikasi — ${detail?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAddCert(false)}>Batal</Btn><Btn variant="primary" onClick={addCert} disabled={savingCert}>{savingCert ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sertifikasi" required><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder="Mis. Renang Gaya Bebas Tingkat Lanjut" /></Field>
          <Field label="Lembaga penerbit"><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Mis. PRSI, FINA" /></Field>
          <Field label="Tanggal terbit"><Input type="date" value={certForm.issued_at} onChange={e => setCertForm(f => ({ ...f, issued_at: e.target.value }))} /></Field>
        </div>
      </Modal>

      {photoView && (
        <PhotoLightbox src={photoView} name={detail?.full_name ?? ""} onClose={() => setPhotoView(null)} />
      )}
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
        .select("id, name, schedule_days, time_start, time_end, schedule_times, class_coaches(profile:profiles(full_name))")
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
      time_start: string; time_end: string; schedule_times?: ScheduleSlot[] | null;
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
        // Per-day time override
        const t = getSlotTime(c, day);
        return {
          classId: c.id,
          name: c.name,
          coach: subName ? subName.split(" ")[0] : (coach === "—" ? "—" : coach.split(" ")[0]),
          timeStart: t.time_start || "00:00",
          timeEnd:   t.time_end   || t.time_start || "01:00",
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

                  // ── Overlap / column layout ──────────────────────────────
                  // Assign each event a column slot so overlapping events share width.
                  // Algorithm: greedy interval-graph colouring.
                  interface SlotEvent { ev: CalEventExt; col: number; totalCols: number }
                  const slots: SlotEvent[] = [];
                  const colEnds: number[] = []; // tracks the end-minute of the last event in each column

                  for (const ev of dayEvents) {
                    const s = timeToMin(ev.timeStart);
                    const e = timeToMin(ev.timeEnd);
                    // Find the first column where this event fits (no overlap)
                    let col = colEnds.findIndex(end => end <= s);
                    if (col === -1) { col = colEnds.length; colEnds.push(e); }
                    else { colEnds[col] = e; }
                    slots.push({ ev, col, totalCols: 0 }); // totalCols filled below
                  }

                  // Second pass: for each event, totalCols = max column index + 1
                  // among all events that overlap with it.
                  for (const slot of slots) {
                    const s = timeToMin(slot.ev.timeStart);
                    const e = timeToMin(slot.ev.timeEnd);
                    let maxCol = slot.col;
                    for (const other of slots) {
                      const os = timeToMin(other.ev.timeStart);
                      const oe = timeToMin(other.ev.timeEnd);
                      if (os < e && oe > s) maxCol = Math.max(maxCol, other.col);
                    }
                    slot.totalCols = maxCol + 1;
                  }

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
                      {slots.map(({ ev, col, totalCols }) => {
                        const startMin = timeToMin(ev.timeStart);
                        const endMin   = timeToMin(ev.timeEnd);
                        const topPx    = ((startMin - CAL_START * 60) / 60) * PX_PER_HOUR;
                        const heightPx = Math.max(((endMin - startMin) / 60) * PX_PER_HOUR, 28);
                        const timeLabel = `${ev.timeStart.slice(0,5)}–${ev.timeEnd.slice(0,5)}`;
                        const GAP = 2; // px gap between columns
                        const colW = `calc(${100 / totalCols}% - ${GAP}px)`;
                        const colL = `calc(${(col / totalCols) * 100}% + ${GAP / 2}px)`;
                        return (
                          <div
                            key={ev.classId}
                            className={`absolute rounded-lg ring-1 ring-inset px-2 py-1 overflow-hidden cursor-default select-none ${
                              ev.isHoliday
                                ? "bg-warn-50 text-warn-700 ring-warn-400/40"
                                : ev.isSub
                                ? "bg-sub-50 text-sub-700 ring-sub-500/30"
                                : "bg-ocean-100 text-ocean-700 ring-ocean-500/30"
                            }`}
                            style={{ top: `${topPx}px`, height: `${heightPx}px`, left: colL, width: colW, zIndex: 5 + col }}
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
  const [coachClassIds, setCoachClassIds] = useState<Set<string>>(new Set());
  const [sessionDates, setSessionDates] = useState<{ value: string; label: string }[]>([]);

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
    supabase.from("classes").select("id, name, time_start, time_end, status, branch_id, capacity, enrolled, schedule_days, price_monthly, show_on_landing, class_coaches(coach_id)").eq("branch_id", branchId).eq("status", "active").then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

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
      const today = new Date(); today.setHours(0, 0, 0, 0);
      // Go back up to 8 weeks
      for (let daysBack = 0; daysBack <= 56; daysBack++) {
        const d = new Date(today); d.setDate(today.getDate() - daysBack);
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
        status: "present",
      }).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error("Gagal menyimpan", error.message);
      toast.success("Absensi diperbarui");
    } else {
      const { error } = await supabase.from("coach_attendances").insert({
        branch_id: branchId, coach_id: form.coach_id, class_id: form.class_id,
        session_date: form.session_date,
        clock_in_time: clockInTime,
        is_manual: true, manual_by: user?.id ?? null,
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
    // Populate coach's classes
    const ids = new Set(
      classes
        .filter(c => (c as unknown as { class_coaches?: { coach_id: string }[] }).class_coaches?.some(cc => cc.coach_id === r.coach_id))
        .map(c => c.id)
    );
    setCoachClassIds(ids);
    // Generate session dates for the class
    const cls = classes.find(c => c.id === r.class_id);
    const dates: { value: string; label: string }[] = [];
    if (cls?.schedule_days?.length) {
      const DAY_MAP: Record<string, number> = { Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let daysBack = 0; daysBack <= 56; daysBack++) {
        const d = new Date(today); d.setDate(today.getDate() - daysBack);
        if (cls.schedule_days.some(sd => DAY_MAP[sd] === d.getDay())) {
          const iso = d.toISOString().split("T")[0];
          dates.push({ value: iso, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) });
        }
      }
    }
    // Include the existing session_date if not in list (older than 8 weeks)
    if (r.session_date && !dates.find(d => d.value === r.session_date)) {
      const d = new Date(r.session_date);
      dates.push({ value: r.session_date, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) });
    }
    setSessionDates(dates);
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
    const ok = await confirm({ title: "Hapus absensi?", body: `Hapus absensi ${r.profile?.full_name} tanggal ${fmtDate(r.session_date)}?`, confirmLabel: "Hapus", danger: true });
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
        <Btn variant="primary" icon="plus" onClick={() => { setEditTarget(null); setForm({ coach_id: "", class_id: "", session_date: "", clock_in_time: "", note: "" }); setCoachClassIds(new Set()); setSessionDates([]); setOpenManual(true); }}>Absensi Manual</Btn>
      </div>
      <Card padded={false}>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
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
                    <td className="hidden sm:table-cell">{r.is_manual ? <Status kind="manual">Manual</Status> : <Status kind="active">Selfie + GPS</Status>}</td>
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
          </div>
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
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState({ title: "", body: "", target: "all", valid_from: "", valid_until: "", class_ids: [] as string[] });

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
      valid_from: form.valid_from || new Date().toISOString().slice(0, 10),
      valid_until: form.valid_until || null, created_by: user?.id ?? "",
    }).select("id").single();
    if (error || !ann) { setSaving(false); return toast.error("Gagal membuat pengumuman", error?.message); }
    if (form.target === "class" && form.class_ids.length > 0) {
      await supabase.from("announcement_classes").insert(form.class_ids.map(class_id => ({ announcement_id: ann.id, class_id })));
    }
    // Send notifications to targeted members
    const today = new Date().toISOString().slice(0, 10);
    let targetMemberIds: string[] = [];
    if (form.target === "all") {
      const { data: mRows } = await supabase.from("members").select("id").eq("branch_id", branchId).eq("status", "active");
      targetMemberIds = (mRows ?? []).map(m => m.id);
    } else if (form.class_ids.length > 0) {
      const { data: mcRows } = await supabase.from("member_classes").select("member_id").in("class_id", form.class_ids);
      targetMemberIds = [...new Set((mcRows ?? []).map(mc => mc.member_id))];
    }
    if (targetMemberIds.length > 0) {
      await supabase.from("notifications").insert(
        targetMemberIds.map(uid => ({ user_id: uid, title: "Pengumuman baru", body: `${form.title}: ${form.body.slice(0, 80)}${form.body.length > 80 ? "…" : ""}`, icon: "bell", kind: "info", created_at: today }))
      );
    }
    setSaving(false);
    toast.success("Pengumuman dibuat");
    setOpenAdd(false);
    setForm({ title: "", body: "", target: "all", valid_from: "", valid_until: "", class_ids: [] });
    load();
  };

  const deactivate = async (id: string) => {
    await supabase.from("announcements").update({ active: false }).eq("id", id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: false } : a));
    toast.success("Pengumuman dinonaktifkan");
  };

  const activate = async (id: string) => {
    await supabase.from("announcements").update({ active: true }).eq("id", id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: true } : a));
    toast.success("Pengumuman diaktifkan");
  };

  const deleteAnn = async (id: string) => {
    const ok = await confirm({ body: "Hapus pengumuman ini? Tindakan tidak bisa dibatalkan." });
    if (!ok) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error("Gagal menghapus", error.message);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast.success("Pengumuman dihapus");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Pengumuman</h2><p className="text-ink-mute text-sm mt-0.5">Tampil di home member page sebagai banner.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ title: "", body: "", target: "all", valid_from: "", valid_until: "", class_ids: [] }); setOpenAdd(true); }}>Buat Pengumuman</Btn>
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
                      {a.active
                        ? <Btn variant="ghost" size="sm" onClick={() => deactivate(a.id)}>Nonaktifkan</Btn>
                        : <Btn variant="soft" size="sm" icon="check" onClick={() => activate(a.id)}>Aktifkan</Btn>
                      }
                      <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => deleteAnn(a.id)}>Hapus</Btn>
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
            <Field label="Berlaku mulai" hint="Kosong = hari ini"><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></Field>
          </div>
          <Field label="Berlaku s/d" hint="Opsional — kosong = tampil sampai dihapus manual"><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></Field>
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
        .select("id, coach_id, type, reason, date_from, date_to, status, substitute_id, substitute_profile:profiles!coach_leaves_substitute_id_fkey(full_name), coach:profiles!coach_leaves_coach_id_fkey(full_name, role, branch_id)")
        .order("created_at", { ascending: false });
      data = (d as Record<string, unknown>[] | null)?.filter(
        l => (l.coach as { branch_id?: string } | null)?.branch_id === branchId
      ) ?? null;
    } else {
      const { data: d } = await supabase.from("member_leaves")
        .select("id, member_id, type, reason, date_from, date_to, status, member:members(branch_id, profile:profiles(full_name))")
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
    const today = new Date().toISOString().split("T")[0];
    // Only load non-suspended coaches for substitute dropdown (per PRD)
    supabase.from("profiles").select("id, full_name, suspend_until").eq("branch_id", branchId).eq("role", "coach").order("full_name")
      .then(({ data }) => {
        if (!data) return;
        const active = (data as (CoachProfile & { suspend_until: string | null })[])
          .filter(c => !c.suspend_until || c.suspend_until < today);
        setAllCoaches(active);
      });
    supabase.from("members").select("id, profile:profiles(full_name)").eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => { if (data) setAllMembers(data.map((m: Record<string, unknown>) => ({ id: m.id as string, full_name: ((m.profile as { full_name?: string } | null)?.full_name ?? "—") }))); });
    supabase.from("classes").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setAllClasses(data as { id: string; name: string }[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const autoCreateMemberAttendances = async (leaveId: string) => {
    const { data: leaveDetail } = await supabase
      .from("member_leaves")
      .select("member_id, date_from, date_to, type, member_leave_classes(class_id, class:classes(schedule_days))")
      .eq("id", leaveId)
      .single();
    if (!leaveDetail) return;
    const detail = leaveDetail as unknown as {
      member_id: string; date_from: string; date_to: string; type: string;
      member_leave_classes: { class_id: string; class: { schedule_days: string[] } | null }[];
    };
    const leaveStatus = detail.type === "sakit" ? "sakit" : detail.type === "izin" ? "izin" : "izin";
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const from = new Date(detail.date_from);
    const to   = new Date(detail.date_to);
    const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const rows: Database["public"]["Tables"]["member_attendances"]["Insert"][] = [];
    for (const lc of detail.member_leave_classes) {
      const scheduleDays: string[] = lc.class?.schedule_days ?? [];
      const d = new Date(from);
      while (d <= to) {
        const dayName = dayNames[d.getDay()];
        if (scheduleDays.length === 0 || scheduleDays.includes(dayName)) {
          rows.push({ member_id: detail.member_id, class_id: lc.class_id, session_date: d.toISOString().slice(0, 10), status: leaveStatus as Database["public"]["Enums"]["attendance_status"], method: "manual" as Database["public"]["Enums"]["attendance_method"], marked_by: adminId });
        }
        d.setDate(d.getDate() + 1);
      }
    }
    if (rows.length > 0) {
      await supabase.from("member_attendances").upsert(rows, { onConflict: "class_id,member_id,session_date" });
    }
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    if (status === "approved" && tab === "coach") {
      const leave = leaves.find(l => l.id === id);
      if (leave) { setApproveTarget(leave); setSubstituteId(leave.substitute_profile?.full_name ? (allCoaches.find(c => c.full_name === leave.substitute_profile?.full_name)?.id ?? "") : ""); return; }
    }
    if (status === "rejected") {
      const leave = leaves.find(l => l.id === id);
      if (leave) { setRejectTarget(leave); setRejectReason(""); return; }
    }
    const table = tab === "coach" ? "coach_leaves" : "member_leaves";
    const { error } = await supabase.from(table as "coach_leaves").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Gagal update status", error.message);
    // Auto-create member attendance records when member leave approved
    if (status === "approved" && tab === "member") {
      await autoCreateMemberAttendances(id);
      const leave = leaves.find(l => l.id === id);
      if (leave?.member_id) {
        await supabase.from("notifications").insert({
          user_id: leave.member_id,
          title: "Izin disetujui",
          body: `Izin Anda (${fmtDate(leave.date_from)} – ${fmtDate(leave.date_to)}) telah disetujui.`,
          icon: "check",
          kind: "success",
        });
      }
    }
    toast.success(status === "approved" ? "Izin disetujui" : "Izin ditolak");
    load();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error("Alasan penolakan wajib diisi");
    setRejecting(true);
    const upd: Database["public"]["Tables"]["coach_leaves"]["Update"] = { status: "rejected" as Database["public"]["Enums"]["leave_status"], reviewed_at: new Date().toISOString(), reject_reason: rejectReason.trim() };
    const table = tab === "coach" ? "coach_leaves" : "member_leaves";
    const { error } = await supabase.from(table as "coach_leaves").update(upd).eq("id", rejectTarget.id);
    setRejecting(false);
    if (error) return toast.error("Gagal menolak izin", error.message);
    // Notify coach/member when leave is rejected
    if (tab === "coach" && rejectTarget.coach_id) {
      await supabase.from("notifications").insert({
        user_id: rejectTarget.coach_id,
        title: "Izin ditolak",
        body: `Izin Anda (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) telah ditolak${rejectReason.trim() ? `: "${rejectReason.trim()}"` : "."}`,
        icon: "x",
        kind: "warn",
      });
    }
    if (tab === "member" && rejectTarget.member_id) {
      await supabase.from("notifications").insert({
        user_id: rejectTarget.member_id,
        title: "Izin ditolak",
        body: `Izin Anda (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) telah ditolak${rejectReason.trim() ? `: "${rejectReason.trim()}"` : "."}`,
        icon: "x",
        kind: "warn",
      });
    }
    toast.success("Izin ditolak");
    setRejectTarget(null);
    load();
  };

  const createLeave = async () => {
    if (!createForm.target_id || !createForm.date_from || !createForm.date_to) return toast.error("Target, tanggal mulai, dan selesai wajib diisi");
    setCreating(true);
    if (tab === "coach") {
      const ins: Database["public"]["Tables"]["coach_leaves"]["Insert"] = { coach_id: createForm.target_id, type: createForm.type as Database["public"]["Enums"]["leave_type"], date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved" as Database["public"]["Enums"]["leave_status"], created_by_admin: true, reviewed_at: new Date().toISOString(), substitute_id: createForm.substitute_id || null };
      const { data, error } = await supabase.from("coach_leaves").insert(ins).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Gagal membuat izin", error?.message); }
      if (createForm.class_ids.length > 0) {
        await supabase.from("coach_leave_classes").insert(createForm.class_ids.map(cid => ({ leave_id: data.id, class_id: cid })));
      }
      // Auto-create substitute attendance records
      if (createForm.substitute_id && createForm.class_ids.length > 0) {
        const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
        const { data: clsRows } = await supabase.from("classes").select("id, schedule_days").in("id", createForm.class_ids);
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const from = new Date(createForm.date_from);
        const to   = new Date(createForm.date_to);
        const rows: { branch_id: string; coach_id: string; class_id: string; session_date: string; status: string; is_manual: boolean; manual_by: string | null }[] = [];
        for (const cls of (clsRows ?? []) as { id: string; schedule_days: string[] }[]) {
          const d = new Date(from);
          while (d <= to) {
            const dayName = dayNames[d.getDay()];
            if (cls.schedule_days.length === 0 || cls.schedule_days.includes(dayName)) {
              rows.push({ branch_id: branchId, coach_id: createForm.substitute_id, class_id: cls.id, session_date: d.toISOString().slice(0, 10), status: "present", is_manual: true, manual_by: adminId });
            }
            d.setDate(d.getDate() + 1);
          }
        }
        if (rows.length > 0) await supabase.from("coach_attendances").upsert(rows, { onConflict: "coach_id,class_id,session_date" });
      }
    } else {
      const { data, error } = await supabase.from("member_leaves").insert({ member_id: createForm.target_id, type: createForm.type as Database["public"]["Enums"]["leave_type"], date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved" as Database["public"]["Enums"]["leave_status"], created_by_admin: true, reviewed_at: new Date().toISOString() }).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Gagal membuat izin", error?.message); }
      if (createForm.class_ids.length > 0) {
        await supabase.from("member_leave_classes").insert(createForm.class_ids.map(cid => ({ leave_id: data.id, class_id: cid })));
        // Auto-create attendance records
        await autoCreateMemberAttendances(data.id);
      }
      // Notify member that admin created an approved leave for them
      await supabase.from("notifications").insert({
        user_id: createForm.target_id,
        title: "Izin dicatat oleh admin",
        body: `Admin telah mencatat izin Anda (${fmtDate(createForm.date_from)} – ${fmtDate(createForm.date_to)}) dan sudah disetujui.`,
        icon: "check",
        kind: "info",
      });
    }
    setCreating(false);
    setOpenCreate(false);
    toast.success("Izin berhasil dibuat");
    load();
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    const upd: Database["public"]["Tables"]["coach_leaves"]["Update"] = { status: "approved" as Database["public"]["Enums"]["leave_status"], reviewed_at: new Date().toISOString(), substitute_id: substituteId || null };
    const { error } = await supabase.from("coach_leaves").update(upd).eq("id", approveTarget.id);
    if (error) { setApproving(false); return toast.error("Gagal menyetujui izin", error.message); }

    // Fetch leave detail for substitute attendance + notifications
    const { data: leaveDetail } = await supabase
      .from("coach_leaves")
      .select("coach_id, date_from, date_to, coach_leave_classes(class_id, class:classes(name, schedule_days))")
      .eq("id", approveTarget.id)
      .single();

    const detail = leaveDetail as unknown as {
      coach_id: string; date_from: string; date_to: string;
      coach_leave_classes: { class_id: string; class: { name: string; schedule_days: string[] } | null }[];
    } | null;

    // Auto-create coach_attendances for substitute
    if (substituteId && detail) {
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const from = new Date(detail.date_from);
      const to   = new Date(detail.date_to);
      const rows: { branch_id: string; coach_id: string; class_id: string; session_date: string; status: string; is_manual: boolean; manual_by: string | null }[] = [];
      const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
      for (const lc of detail.coach_leave_classes) {
        const scheduleDays: string[] = lc.class?.schedule_days ?? [];
        const d = new Date(from);
        while (d <= to) {
          const dayName = dayNames[d.getDay()];
          if (scheduleDays.length === 0 || scheduleDays.includes(dayName)) {
            rows.push({ branch_id: branchId, coach_id: substituteId, class_id: lc.class_id, session_date: d.toISOString().slice(0, 10), status: "present", is_manual: true, manual_by: adminId });
          }
          d.setDate(d.getDate() + 1);
        }
      }
      if (rows.length > 0) {
        await supabase.from("coach_attendances").upsert(rows, { onConflict: "coach_id,class_id,session_date" });
      }
    }

    // Notify coach that leave was approved
    if (detail?.coach_id) {
      const classNames = detail.coach_leave_classes.map(lc => lc.class?.name).filter(Boolean).join(", ");
      await supabase.from("notifications").insert({
        user_id: detail.coach_id,
        title: "Izin disetujui",
        body: `Izin Anda${classNames ? ` untuk ${classNames}` : ""} (${detail.date_from === detail.date_to ? detail.date_from : `${detail.date_from} – ${detail.date_to}`}) telah disetujui.`,
        icon: "check",
        kind: "success",
      });
    }

    // Notify substitute coach that they've been assigned
    if (substituteId && detail) {
      const classNames = detail.coach_leave_classes.map(lc => lc.class?.name).filter(Boolean).join(", ");
      await supabase.from("notifications").insert({
        user_id: substituteId,
        title: "Anda ditambahkan sebagai coach pengganti",
        body: `Anda menggantikan coach untuk kelas ${classNames || "—"} pada ${detail.date_from === detail.date_to ? detail.date_from : `${detail.date_from} – ${detail.date_to}`}.`,
        icon: "refresh",
        kind: "info",
      });
    }

    setApproving(false);
    toast.success("Izin disetujui" + (substituteId ? " & sesi dialihkan ke pengganti" : ""));
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">Nama</th>
                <th className="text-left py-3 font-bold">Jenis</th><th className="text-left py-3 font-bold hidden sm:table-cell">Mulai</th>
                <th className="text-left py-3 font-bold hidden sm:table-cell">Selesai</th><th className="text-left py-3 font-bold">Status</th><th className="text-left py-3 font-bold hidden md:table-cell">Pengganti</th><th className="px-5" />
              </tr></thead>
              <tbody className="divide-y divide-line">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-paper-tint">
                    <td className="py-3.5 px-5 font-semibold">{l.profile?.full_name ?? "—"}</td>
                    <td>{l.type}</td>
                    <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_from)}</td>
                    <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_to)}</td>
                    <td><Status kind={l.status as "pending" | "approved" | "rejected"}>{l.status === "pending" ? "Menunggu" : l.status === "approved" ? "Disetujui" : "Ditolak"}</Status></td>
                    <td className="text-ink-soft text-xs hidden md:table-cell">{l.substitute_profile?.full_name ?? "—"}</td>
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
          </div>
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

      {/* Reject leave + reason modal (coach & member) */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Tolak Izin ${tab === "coach" ? "Coach" : "Member"}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectTarget(null)}>Batal</Btn><Btn variant="danger" onClick={confirmReject} disabled={rejecting}>{rejecting ? "Menolak…" : "Tolak Izin"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{rejectTarget?.profile?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(rejectTarget?.date_from ?? "")} – {fmtDate(rejectTarget?.date_to ?? "")} · {rejectTarget?.type}</div>
            {rejectTarget?.reason && <div className="text-xs text-ink-soft mt-1">{rejectTarget.reason}</div>}
          </Card>
          <Field label="Alasan penolakan" required hint="Wajib diisi — akan dilihat oleh coach/member.">
            <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Mis. Tanggal bentrok dengan acara cabang." />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
  const upload = useUpload();
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"unpaid" | "paid" | "all">("unpaid");
  const [generating, setGenerating] = useState(false);
  const [genMonth, setGenMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openGenModal, setOpenGenModal] = useState(false);

  // Verifikasi modal
  const [verifyTarget, setVerifyTarget] = useState<BillRow | null>(null);
  const [verifyForm, setVerifyForm] = useState({ paid_at: new Date().toISOString().slice(0, 10), paid_method: "transfer", proof_file: null as File | null });
  const [verifying, setVerifying] = useState(false);

  // Tambah tagihan manual modal
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({ member_id: "", class_id: "", type: "monthly", period_label: "", amount: "", discount: "", discount_reason: "", admin_notes: "", sessions_total: "" });
  const [addMembers, setAddMembers] = useState<{ id: string; full_name: string; type: string }[]>([]);
  const [addClasses, setAddClasses] = useState<{ id: string; name: string; price_monthly: number; price_per_session: number | null }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bills")
      .select("id, member_id, period_label, amount, discount, discount_reason, total, status, type, sessions_total, sessions_used, paid_at, paid_method, proof_url, admin_notes, member:members(profile:profiles(full_name)), class:classes(name)")
      .eq("branch_id", branchId).order("created_at", { ascending: false }).limit(200);
    if (data) setBills(data as unknown as BillRow[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    // Load members + classes for manual add form
    supabase.from("members").select("id, type, profile:profiles(full_name)").eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => {
        if (data) setAddMembers((data as unknown as { id: string; type: string; profile: { full_name: string } | null }[])
          .map(m => ({ id: m.id, full_name: m.profile?.full_name ?? "—", type: m.type })));
      });
    supabase.from("classes").select("id, name, price_monthly, price_per_session").eq("branch_id", branchId).eq("status", "active").order("name")
      .then(({ data }) => { if (data) setAddClasses(data as unknown as { id: string; name: string; price_monthly: number; price_per_session: number | null }[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  const openVerify = (b: BillRow) => {
    setVerifyTarget(b);
    setVerifyForm({ paid_at: new Date().toISOString().slice(0, 10), paid_method: "transfer", proof_file: null });
  };

  const confirmVerify = async () => {
    if (!verifyTarget) return;
    setVerifying(true);
    let proof_url: string | null = verifyTarget.proof_url ?? null;
    if (verifyForm.proof_file) {
      proof_url = await upload.upload.paymentProof(verifyForm.proof_file, verifyTarget.id);
    }
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("bills").update({
      status: "paid",
      paid_at: new Date(verifyForm.paid_at).toISOString(),
      paid_method: verifyForm.paid_method,
      proof_url,
      verified_by: user?.id ?? null,
    }).eq("id", verifyTarget.id);
    setVerifying(false);
    if (error) return toast.error("Gagal verifikasi", error.message);
    // Notify member
    await supabase.from("notifications").insert({
      user_id: verifyTarget.member_id,
      title: "Tagihan diverifikasi",
      body: `Pembayaran tagihan ${verifyTarget.period_label} Anda telah diverifikasi lunas via ${verifyForm.paid_method}.`,
      icon: "check",
      kind: "success",
    });
    toast.success("Pembayaran terverifikasi");
    setVerifyTarget(null);
    load();
  };

  const saveManualBill = async () => {
    if (!addForm.member_id || !addForm.period_label || !addForm.amount) return toast.error("Member, periode, dan nominal wajib diisi");
    setSaving(true);
    const amount = Number(addForm.amount) || 0;
    const discount = Number(addForm.discount) || 0;
    const total = amount - discount;
    const isSessionPack = addForm.type === "session_pack";
    const row: Database["public"]["Tables"]["bills"]["Insert"] = {
      member_id: addForm.member_id,
      branch_id: branchId,
      class_id: addForm.class_id || null,
      type: addForm.type as Database["public"]["Enums"]["bill_type"],
      period_label: addForm.period_label,
      amount,
      discount,
      discount_reason: addForm.discount_reason || null,
      total,
      status: "unpaid" as Database["public"]["Enums"]["payment_status"],
      admin_notes: addForm.admin_notes || null,
      sessions_total: (isSessionPack && addForm.sessions_total) ? Number(addForm.sessions_total) : null,
      sessions_used: (isSessionPack && addForm.sessions_total) ? 0 : undefined,
    };
    const { error } = await supabase.from("bills").insert(row);
    setSaving(false);
    if (error) return toast.error("Gagal membuat tagihan", error.message);
    // Notify member
    await supabase.from("notifications").insert({
      user_id: addForm.member_id,
      title: "Tagihan baru",
      body: `Tagihan ${addForm.period_label} sebesar ${fmtIDR(total)} telah dibuat. Hubungi admin untuk konfirmasi pembayaran.`,
      icon: "invoice",
      kind: "info",
    });
    toast.success("Tagihan berhasil dibuat");
    setOpenAdd(false);
    setAddForm({ member_id: "", class_id: "", type: "monthly", period_label: "", amount: "", discount: "", discount_reason: "", admin_notes: "", sessions_total: "" });
    load();
  };

  const generateTagihan = async () => {
    const label = fmtMonth(genMonth);
    setOpenGenModal(false);
    setGenerating(true);
    try {
      const { data: members, error: mErr } = await supabase
        .from("members").select("id, member_classes(class:classes(id, price_monthly))")
        .eq("branch_id", branchId).eq("status", "active").eq("type", "reguler");
      if (mErr || !members) { toast.error("Gagal memuat member", mErr?.message); setGenerating(false); return; }
      const { data: existing } = await supabase.from("bills").select("member_id").eq("branch_id", branchId).eq("period_label", label);
      const existingIds = new Set((existing ?? []).map(b => b.member_id));
      const rows: Database["public"]["Tables"]["bills"]["Insert"][] = [];
      for (const m of members as unknown as { id: string; member_classes: { class: { id: string; price_monthly: number } | null }[] }[]) {
        if (existingIds.has(m.id)) continue;
        const cls = m.member_classes?.[0]?.class;
        const amount = cls?.price_monthly ?? 0;
        rows.push({ member_id: m.id, branch_id: branchId, class_id: cls?.id ?? null, type: "monthly" as Database["public"]["Enums"]["bill_type"], period_label: label, amount, discount: 0, total: amount, status: "unpaid" as Database["public"]["Enums"]["payment_status"] });
      }
      if (rows.length === 0) { toast.success("Semua member reguler sudah memiliki tagihan untuk periode ini"); setGenerating(false); return; }
      const { error } = await supabase.from("bills").insert(rows);
      if (error) { toast.error("Gagal generate tagihan", error.message); setGenerating(false); return; }
      // Notify all members
      for (const row of rows) {
        await supabase.from("notifications").insert({ user_id: row.member_id as string, title: "Tagihan baru", body: `Tagihan ${label} sebesar ${fmtIDR(row.total as number)} telah dibuat.`, icon: "invoice", kind: "info" });
      }
      toast.success(`${rows.length} tagihan berhasil digenerate`, `Periode ${label}`);
      load();
    } finally { setGenerating(false); }
  };

  const paidBills = bills.filter(b => b.status === "paid");
  const unpaidBills = bills.filter(b => b.status === "unpaid" || b.status === "partial");
  const displayBills = tab === "unpaid" ? unpaidBills : tab === "paid" ? paidBills : bills;

  const statusLabel = (s: string) => ({ paid: "Lunas", unpaid: "Belum Bayar", partial: "Sebagian", school_covered: "Sekolah", free: "Gratis" }[s] ?? s);
  const statusKind = (s: string): "paid" | "unpaid" | "school_covered" | "pending" => ({ paid: "paid", unpaid: "unpaid", partial: "pending", school_covered: "school_covered", free: "paid" }[s] as "paid" | "unpaid" | "school_covered" | "pending" ?? "unpaid");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Pembayaran</h2><p className="text-ink-mute text-sm mt-0.5">Verifikasi pembayaran masuk & kelola tagihan.</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="ghost" icon="plus" onClick={() => setOpenAdd(true)}>Tambah Tagihan</Btn>
          <Btn variant="primary" icon="invoice" onClick={() => setOpenGenModal(true)} disabled={generating}>{generating ? "Generating…" : "Generate Tagihan"}</Btn>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Belum dibayar" value={unpaidBills.length} icon="warning" tone="warn" sub={fmtIDR(unpaidBills.reduce((a, b) => a + (b.total ?? 0), 0))} />
        <Stat label="Sudah lunas"   value={paidBills.length}   icon="check"   tone="ok"   sub={fmtIDR(paidBills.reduce((a, b) => a + (b.total ?? 0), 0))} />
        <Stat label="Total tagihan" value={bills.length}       icon="invoice" tone="ocean" />
      </div>

      {/* Tab filter */}
      <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1 w-fit">
        {([["unpaid", "Belum Bayar"], ["paid", "Sudah Lunas"], ["all", "Semua"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
        ))}
      </div>

      <Card padded={false}>
        {loading ? <div className="p-10 text-center text-ink-mute">Memuat data…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">Member</th>
                <th className="text-left py-3 font-bold">Periode</th>
                <th className="text-left py-3 font-bold hidden sm:table-cell">Kelas</th>
                <th className="text-right py-3 font-bold">Total</th>
                <th className="text-left py-3 font-bold">Status</th>
                <th className="px-5" />
              </tr></thead>
              <tbody className="divide-y divide-line">
                {displayBills.map((b) => (
                  <tr key={b.id} className="hover:bg-paper-tint">
                    <td className="py-3.5 px-5 font-semibold">{b.member?.profile?.full_name ?? "—"}</td>
                    <td className="text-ink-soft">{b.period_label}</td>
                    <td className="text-ink-mute text-xs hidden sm:table-cell">{b.class?.name ?? "—"}{b.type === "session_pack" && b.sessions_total ? ` · ${b.sessions_used}/${b.sessions_total} sesi` : ""}</td>
                    <td className="text-right font-mono font-bold">
                      {fmtIDR(b.total ?? b.amount)}
                      {b.discount > 0 && <div className="text-xs text-ok-600 font-normal">-{fmtIDR(b.discount)}</div>}
                    </td>
                    <td><Status kind={statusKind(b.status)}>{statusLabel(b.status)}</Status></td>
                    <td className="px-5 flex items-center gap-1.5 py-3.5">
                      {(b.status === "unpaid" || b.status === "partial") && <Btn variant="soft" size="sm" icon="check" onClick={() => openVerify(b)}>Verifikasi</Btn>}
                      {b.proof_url && <a href={b.proof_url} target="_blank" rel="noreferrer"><Btn variant="ghost" size="sm" icon="eye">Bukti</Btn></a>}
                      {b.status === "paid" && b.paid_at && <span className="text-xs text-ink-mute">{new Date(b.paid_at).toLocaleDateString("id-ID")}{b.paid_method ? ` · ${b.paid_method}` : ""}</span>}
                    </td>
                  </tr>
                ))}
                {displayBills.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-ink-mute">Tidak ada tagihan</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Verifikasi Pembayaran Modal */}
      <Modal open={!!verifyTarget} onClose={() => setVerifyTarget(null)} title="Verifikasi Pembayaran" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setVerifyTarget(null)}>Batal</Btn><Btn variant="primary" icon="check" onClick={confirmVerify} disabled={verifying}>{verifying ? "Menyimpan…" : "Verifikasi Lunas"}</Btn></>}>
        {verifyTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm">{verifyTarget.member?.profile?.full_name ?? "—"}</div>
              <div className="text-xs text-ink-mute mt-0.5">{verifyTarget.period_label} · {fmtIDR(verifyTarget.total ?? verifyTarget.amount)}</div>
            </Card>
            <Field label="Tanggal pembayaran" required>
              <Input type="date" value={verifyForm.paid_at} onChange={e => setVerifyForm(f => ({ ...f, paid_at: e.target.value }))} />
            </Field>
            <Field label="Metode pembayaran" required>
              <Select value={verifyForm.paid_method} onChange={e => setVerifyForm(f => ({ ...f, paid_method: e.target.value }))}>
                <option value="transfer">Transfer</option>
                <option value="tunai">Tunai</option>
                <option value="lainnya">Lainnya</option>
              </Select>
            </Field>
            <Field label="Bukti transfer" hint="Opsional untuk pembayaran tunai.">
              <Input type="file" accept="image/*,application/pdf" onChange={e => setVerifyForm(f => ({ ...f, proof_file: e.target.files?.[0] ?? null }))} />
            </Field>
          </div>
        )}
      </Modal>

      {/* Tambah Tagihan Manual Modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Tagihan" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" icon="plus" onClick={saveManualBill} disabled={saving}>{saving ? "Menyimpan…" : "Buat Tagihan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Member" required>
            <Select value={addForm.member_id} onChange={e => {
              const m = addMembers.find(x => x.id === e.target.value);
              setAddForm(f => ({ ...f, member_id: e.target.value, type: m?.type === "private" ? "session_pack" : "monthly" }));
            }}>
              <option value="">— pilih member —</option>
              {addMembers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.type})</option>)}
            </Select>
          </Field>
          <Field label="Kelas">
            <Select value={addForm.class_id} onChange={e => {
              const cls = addClasses.find(c => c.id === e.target.value);
              const isSession = addForm.type === "session_pack";
              setAddForm(f => ({ ...f, class_id: e.target.value, amount: String(isSession ? (cls?.price_per_session ?? 0) : (cls?.price_monthly ?? 0)) }));
            }}>
              <option value="">— pilih kelas —</option>
              {addClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Tipe tagihan" required>
            <Select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
              <option value="monthly">Bulanan</option>
              <option value="session_pack">Paket Sesi</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>
          {addForm.type === "session_pack" && (
            <Field label="Jumlah sesi dalam paket" required>
              <Input type="number" min={1} value={addForm.sessions_total} onChange={e => setAddForm(f => ({ ...f, sessions_total: e.target.value }))} placeholder="Mis. 8" />
            </Field>
          )}
          <Field label="Periode / nama paket" required>
            <Input value={addForm.period_label} onChange={e => setAddForm(f => ({ ...f, period_label: e.target.value }))} placeholder={addForm.type === "monthly" ? "Mis. Juni 2026" : "Mis. Paket 8 Sesi Juli"} />
          </Field>
          <Field label="Nominal tagihan" required>
            <Input type="number" min={0} value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Diskon" hint="Opsional.">
            <Input type="number" min={0} value={addForm.discount} onChange={e => setAddForm(f => ({ ...f, discount: e.target.value }))} placeholder="0" />
          </Field>
          {Number(addForm.discount) > 0 && (
            <Field label="Alasan diskon">
              <Input value={addForm.discount_reason} onChange={e => setAddForm(f => ({ ...f, discount_reason: e.target.value }))} placeholder="Mis. Beasiswa / keringanan" />
            </Field>
          )}
          {Number(addForm.amount) > 0 && (
            <div className="flex justify-between text-sm font-semibold px-1">
              <span className="text-ink-mute">Total yang harus dibayar</span>
              <span className="text-ink font-mono">{fmtIDR(Number(addForm.amount) - Number(addForm.discount || 0))}</span>
            </div>
          )}
          <Field label="Catatan admin" hint="Opsional.">
            <Textarea rows={2} value={addForm.admin_notes} onChange={e => setAddForm(f => ({ ...f, admin_notes: e.target.value }))} placeholder="Catatan internal…" />
          </Field>
        </div>
      </Modal>

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
  const confirm = useConfirm();
  const upload = useUpload();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailReg, setDetailReg] = useState<RegistrationRow | null>(null);
  const [editReg, setEditReg] = useState<RegistrationRow | null>(null);
  const [editRegForm, setEditRegForm] = useState<Partial<RegistrationRow>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<RegistrationRow | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  // Reject with reason — cert
  const [rejectCertTarget, setRejectCertTarget] = useState<CertRow | null>(null);
  const [certRejectReason, setCertRejectReason] = useState("");
  const [rejectingCert, setRejectingCert] = useState(false);
  // Reject with reason — registration
  const [rejectRegTarget, setRejectRegTarget] = useState<RegistrationRow | null>(null);
  const [regRejectReason, setRegRejectReason] = useState("");
  const [rejectingReg, setRejectingReg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      supabase.from("registrations").select("id, full_name, birth_date, gender, phone, phone_owner, parent_name, parent_phone, address, health_notes, status, created_at").eq("branch_id", branchId).eq("status", "pending").order("created_at")
        .then(({ data }) => { if (data) setRegistrations(data as RegistrationRow[]); }),
      supabase.from("certifications").select("id, name, title, issuer, valid_from, valid_until, photo_url, status, profile:profiles!certifications_coach_id_fkey(full_name, branch_id)").eq("status", "pending")
        .then(({ data }) => {
          if (data) {
            const filtered = (data as unknown as (CertRow & { profile: { full_name: string; branch_id: string | null } | null })[])
              .filter(c => c.profile?.branch_id === branchId);
            setCerts(filtered as unknown as CertRow[]);
          }
        }),
    ]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openEditReg = (r: RegistrationRow) => {
    setEditReg(r);
    setEditRegForm({ full_name: r.full_name, birth_date: r.birth_date, gender: r.gender, phone: r.phone, phone_owner: r.phone_owner, parent_name: r.parent_name, parent_phone: r.parent_phone, address: r.address, health_notes: r.health_notes });
  };

  const saveEditReg = async () => {
    if (!editReg) return;
    setSavingEdit(true);
    const { error } = await supabase.from("registrations").update({
      full_name: editRegForm.full_name ?? editReg.full_name,
      birth_date: editRegForm.birth_date ?? null,
      gender: editRegForm.gender ?? null,
      phone: editRegForm.phone ?? null,
      phone_owner: editRegForm.phone_owner ?? null,
      parent_name: editRegForm.parent_name ?? null,
      parent_phone: editRegForm.parent_phone ?? null,
      address: editRegForm.address ?? null,
      health_notes: editRegForm.health_notes ?? null,
    }).eq("id", editReg.id);
    setSavingEdit(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Data registrasi diperbarui");
    setEditReg(null);
    load();
  };

  const deleteReg = async (r: RegistrationRow) => {
    const ok = await confirm({ title: `Hapus registrasi "${r.full_name}"?`, body: "Tindakan tidak bisa dibatalkan.", confirmLabel: "Hapus" });
    if (!ok) return;
    setDeletingId(r.id);
    await supabase.from("registrations").delete().eq("id", r.id);
    setDeletingId(null);
    setDetailReg(null);
    toast.success("Registrasi dihapus");
    load();
  };

  const openApproveReg = (r: RegistrationRow) => {
    setApproveTarget(r);
    setProofFile(null);
  };

  const rejectReg = (r: RegistrationRow) => {
    setRejectRegTarget(r);
    setRegRejectReason("");
  };

  const confirmRejectReg = async () => {
    if (!rejectRegTarget) return;
    if (!regRejectReason.trim()) return toast.error("Alasan penolakan wajib diisi");
    setRejectingReg(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("registrations").update({ status: "rejected", reject_reason: regRejectReason.trim(), reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", rejectRegTarget.id);
    setRejectingReg(false);
    toast.success("Pendaftaran ditolak");
    setRejectRegTarget(null);
    setDetailReg(null);
    load();
  };

  const confirmApproveReg = async () => {
    const r = approveTarget;
    if (!r) return;
    setApprovingId(r.id);

    // Upload bukti transfer jika ada
    let proofUrl: string | null = null;
    if (proofFile) {
      proofUrl = await upload.upload.paymentProof(proofFile, r.id);
    }

    // Buat email sementara dari nama (tanpa spasi, lowercase) + timestamp
    const tempSlug = r.full_name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
    const tempEmail = `${tempSlug}.${Date.now()}@temp.nextswimmingschool.id`;
    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: tempEmail,
        password: tempPassword,
        full_name: r.full_name,
        role: "member",
        branch_id: branchId,
        phone: r.phone,
        birth_date: r.birth_date || null,
        gender: r.gender || null,
        address: r.address || null,
        health_notes: r.health_notes || null,
        member_type: "reguler",
        school_id: null,
        class_id: null,
        total_sessions: null,
        proof_url: proofUrl,
      }),
    });

    const json = await res.json() as { user_id?: string; error?: string };
    if (!res.ok) {
      toast.error("Gagal membuat akun member", json.error);
      setApprovingId(null);
      return;
    }

    // Update status registrasi + simpan bukti transfer
    const user = (await supabase.auth.getUser()).data.user;
    const upd: Database["public"]["Tables"]["registrations"]["Update"] = { status: "approved", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), proof_url: proofUrl ?? undefined };
    await supabase.from("registrations").update(upd).eq("id", r.id);

    toast.success("Pendaftaran diapprove", "Member masuk ke menu Member — lengkapi data & kirim credential.");
    setApprovingId(null);
    setApproveTarget(null);
    setDetailReg(null);
    load();
  };

  const approveCert = async (id: string) => {
    await supabase.from("certifications").update({ status: "approved", reject_reason: null }).eq("id", id);
    toast.success("Sertifikasi diverifikasi");
    load();
  };

  const confirmRejectCert = async () => {
    if (!rejectCertTarget) return;
    if (!certRejectReason.trim()) return toast.error("Alasan penolakan wajib diisi");
    setRejectingCert(true);
    await supabase.from("certifications").update({ status: "rejected", reject_reason: certRejectReason.trim() }).eq("id", rejectCertTarget.id);
    setRejectingCert(false);
    toast.success("Sertifikasi ditolak");
    setRejectCertTarget(null);
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
                const contactPhone = r.phone_owner === "parent" ? r.parent_phone : r.phone;
                const isApproving = approvingId === r.id;
                return (
                  <div key={r.id} className="p-3 rounded-xl border border-line">
                    <button className="flex items-center gap-3 w-full text-left" onClick={() => setDetailReg(r)}>
                      <Avatar name={r.full_name} size={42} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">{r.full_name}</div>
                        <div className="text-xs text-ink-mute">{age ? `${age} thn` : ""}{age && r.phone ? " · " : ""}{r.phone ?? ""}</div>
                      </div>
                      <Icon name="chevron-right" className="w-4 h-4 text-ink-faint shrink-0" />
                    </button>
                    <div className="mt-3 flex gap-1.5 flex-wrap">
                      <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEditReg(r)}>Edit</Btn>
                      <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => deleteReg(r)} disabled={deletingId === r.id}>Hapus</Btn>
                      <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => rejectReg(r)}>Tolak</Btn>
                      <a href={waLink(`Halo ${r.full_name}, terima kasih telah mendaftar di Next Swimming School. Kami sedang memproses pendaftaran Anda.`, contactPhone)} target="_blank" rel="noreferrer">
                        <Btn variant="wa" size="sm" icon="whatsapp">Chat WA</Btn>
                      </a>
                      <Btn variant="primary" size="sm" icon="check" className="ml-auto" disabled={isApproving} onClick={() => openApproveReg(r)}>
                        {isApproving ? "Memproses…" : "Approve"}
                      </Btn>
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
                  {c.photo_url && <a href={c.photo_url} target="_blank" rel="noreferrer" className="block mt-3"><img src={c.photo_url} alt="cert" className="w-full rounded-lg object-cover max-h-48" /></a>}
                  <div className="mt-3 flex gap-1.5">
                    <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { setRejectCertTarget(c); setCertRejectReason(""); }}>Tolak</Btn>
                    <Btn variant="primary" size="sm" icon="check" className="ml-auto" onClick={() => approveCert(c.id)}>Approve</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Detail Registrasi Modal */}
      <Modal open={!!detailReg} onClose={() => setDetailReg(null)} title="Detail Pendaftaran" size="sm"
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={() => detailReg && openEditReg(detailReg)}>Edit</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && deleteReg(detailReg)}>Hapus</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && rejectReg(detailReg)}>Tolak</Btn>
            <div className="flex-1" />
            {detailReg && (
              <a href={waLink(`Halo ${detailReg.full_name}, terima kasih telah mendaftar di Next Swimming School.`, detailReg.phone_owner === "parent" ? detailReg.parent_phone : detailReg.phone)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">Chat WA</Btn>
              </a>
            )}
            <Btn variant="primary" icon="check" disabled={!!approvingId} onClick={() => detailReg && openApproveReg(detailReg)}>
              {approvingId ? "Memproses…" : "Approve"}
            </Btn>
          </div>
        }>
        {detailReg && (() => {
          const age = detailReg.birth_date ? calcAge(detailReg.birth_date) : null;
          const rows: [string, string | null | undefined][] = [
            ["Nama lengkap", detailReg.full_name],
            ["Tanggal lahir", detailReg.birth_date ? `${fmtDate(detailReg.birth_date)}${age ? ` (${age} thn)` : ""}` : "—"],
            ["Jenis kelamin", detailReg.gender === "male" ? "Laki-laki" : detailReg.gender === "female" ? "Perempuan" : "—"],
            ["No. HP", detailReg.phone ?? "—"],
            ["Pemilik HP", detailReg.phone_owner === "parent" ? "Orang tua / wali" : "Sendiri"],
            ...(detailReg.phone_owner === "parent" ? [
              ["Nama orang tua", detailReg.parent_name ?? "—"] as [string, string],
              ["No. HP orang tua", detailReg.parent_phone ?? "—"] as [string, string],
            ] : []),
            ["Alamat", detailReg.address ?? "—"],
            ["Catatan kesehatan", detailReg.health_notes ?? "—"],
            ["Tanggal daftar", fmtDateLong(detailReg.created_at)],
          ];
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <Avatar name={detailReg.full_name} size={48} />
                <div>
                  <div className="font-display font-bold text-ink">{detailReg.full_name}</div>
                  <Status kind="pending" className="mt-1">Menunggu review</Status>
                </div>
              </div>
              <div className="divide-y divide-line">
                {rows.map(([label, value]) => (
                  <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                    <span className="text-ink-mute">{label}</span>
                    <span className="text-ink font-medium break-words">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Tolak Sertifikasi Modal ── */}
      <Modal open={!!rejectCertTarget} onClose={() => setRejectCertTarget(null)} title="Tolak Sertifikasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectCertTarget(null)}>Batal</Btn><Btn variant="danger" onClick={confirmRejectCert} disabled={rejectingCert}>{rejectingCert ? "Menolak…" : "Tolak Sertifikasi"}</Btn></>}>
        <div className="space-y-4">
          {rejectCertTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectCertTarget.title ?? rejectCertTarget.name}</div>
              <div className="text-ink-mute">{rejectCertTarget.profile?.full_name}</div>
            </div>
          )}
          <Field label="Alasan penolakan" required>
            <Textarea rows={3} value={certRejectReason} onChange={e => setCertRejectReason(e.target.value)} placeholder="Jelaskan alasan penolakan sertifikasi ini…" />
          </Field>
        </div>
      </Modal>

      {/* ── Tolak Registrasi Modal ── */}
      <Modal open={!!rejectRegTarget} onClose={() => setRejectRegTarget(null)} title="Tolak Pendaftaran" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectRegTarget(null)}>Batal</Btn><Btn variant="danger" onClick={confirmRejectReg} disabled={rejectingReg}>{rejectingReg ? "Menolak…" : "Tolak Pendaftaran"}</Btn></>}>
        <div className="space-y-4">
          {rejectRegTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectRegTarget.full_name}</div>
              <div className="text-ink-mute">{rejectRegTarget.phone ?? "—"}</div>
            </div>
          )}
          <Field label="Alasan penolakan" required>
            <Textarea rows={3} value={regRejectReason} onChange={e => setRegRejectReason(e.target.value)} placeholder="Jelaskan alasan penolakan pendaftaran ini…" />
          </Field>
        </div>
      </Modal>

      {/* ── Edit Registrasi Modal ── */}
      <Modal open={!!editReg} onClose={() => setEditReg(null)} title="Edit Data Registrasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditReg(null)}>Batal</Btn><Btn variant="primary" onClick={saveEditReg} disabled={savingEdit}>{savingEdit ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama lengkap" required><Input value={editRegForm.full_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tanggal lahir"><Input type="date" value={editRegForm.birth_date ?? ""} onChange={e => setEditRegForm(f => ({ ...f, birth_date: e.target.value }))} /></Field>
            <Field label="Jenis kelamin">
              <Select value={editRegForm.gender ?? ""} onChange={e => setEditRegForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </Select>
            </Field>
          </div>
          <Field label="No. HP"><Input value={editRegForm.phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Pemilik HP">
            <Select value={editRegForm.phone_owner ?? "self"} onChange={e => setEditRegForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">Sendiri</option>
              <option value="parent">Orang tua / wali</option>
            </Select>
          </Field>
          {editRegForm.phone_owner === "parent" && <>
            <Field label="Nama orang tua"><Input value={editRegForm.parent_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label="No. HP orang tua"><Input value={editRegForm.parent_phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>}
          <Field label="Alamat"><Textarea rows={2} value={editRegForm.address ?? ""} onChange={e => setEditRegForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label="Catatan kesehatan / alergi"><Input value={editRegForm.health_notes ?? ""} onChange={e => setEditRegForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* ── Approve + Bukti Transfer Modal ── */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve Pendaftaran" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setApproveTarget(null)}>Batal</Btn><Btn variant="primary" icon="check" onClick={confirmApproveReg} disabled={!!approvingId}>{approvingId ? "Memproses…" : "Approve & Buat Akun"}</Btn></>}>
        {approveTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm">{approveTarget.full_name}</div>
              <div className="text-xs text-ink-mute mt-0.5">{approveTarget.phone ?? "—"}</div>
            </Card>
            <Field label="Bukti transfer" hint="Upload bukti transfer sebelum approve. Opsional jika belum ada.">
              <Input type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
            </Field>
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3 text-xs text-ocean-800">
              Akun member akan dibuat otomatis dengan password sementara. Lengkapi data & kirim credential via WhatsApp dari menu Member.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Coach Reviews (sub-section inside Rapor) ───────────────────────────────────

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
        .select("id, stars, message, created_at, coach_id, coach:profiles!member_reviews_coach_id_fkey(full_name), member:members!member_reviews_member_id_fkey(profile:profiles(full_name)), rapor:rapor_entries!member_reviews_rapor_id_fkey(rapor_periods(label))")
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

// ── Rapor ──────────────────────────────────────────────────────────────────────

function AdminRapor({ branchId }: { branchId: string }) {
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

// ── School Panel ───────────────────────────────────────────────────────────────

const EMPTY_SCHOOL_FORM = { name: "", email: "", password: "", pic_name: "", pic_phone: "" };

function AdminSchoolPanel({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_SCHOOL_FORM);
  const [createdCredential, setCreatedCredential] = useState<{ name: string; email: string; password: string; pic_phone: string } | null>(null);
  // Detail / edit
  const [detailTarget, setDetailTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", pic_name: "", pic_phone: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("schools").select("id, name, email, profile_id, pic_name, pic_phone").eq("branch_id", branchId).order("name");
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
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.name, role: "school", branch_id: branchId }),
    });
    const json = await res.json() as { user_id?: string; error?: string };
    if (!res.ok) { toast.error("Gagal membuat akun sekolah", json.error); setSaving(false); return; }

    const { error } = await supabase.from("schools").insert({
      branch_id: branchId, name: form.name, email: form.email,
      profile_id: json.user_id ?? null,
      pic_name: form.pic_name || null, pic_phone: form.pic_phone || null,
    });
    setSaving(false);
    if (error) return toast.error("Gagal menambah sekolah", error.message);
    toast.success("Sekolah ditambahkan & akun login dibuat");
    setCreatedCredential({ name: form.name, email: form.email, password: form.password, pic_phone: form.pic_phone });
    setOpenAdd(false);
    setForm(EMPTY_SCHOOL_FORM);
    load();
  };

  const openEdit = (s: School) => {
    setEditTarget(s);
    setEditForm({ name: s.name, email: s.email ?? "", pic_name: s.pic_name ?? "", pic_phone: s.pic_phone ?? "" });
  };

  const saveEdit = async () => {
    if (!editTarget || !editForm.name) return toast.error("Nama sekolah wajib diisi");
    setEditSaving(true);
    const { error } = await supabase.from("schools").update({
      name: editForm.name, email: editForm.email || null,
      pic_name: editForm.pic_name || null, pic_phone: editForm.pic_phone || null,
    }).eq("id", editTarget.id);
    setEditSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Data sekolah diperbarui");
    setEditTarget(null);
    // Refresh detail jika sedang dibuka
    if (detailTarget?.id === editTarget.id) {
      setDetailTarget(s => s ? { ...s, ...editForm, email: editForm.email || null, pic_name: editForm.pic_name || null, pic_phone: editForm.pic_phone || null } : null);
    }
    load();
  };

  const deleteSchool = async (s: School) => {
    const ok = await confirm({ title: "Hapus sekolah?", body: `Hapus "${s.name}"? Data member afiliasi tidak ikut terhapus.`, confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("schools").delete().eq("id", s.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    toast.success("Sekolah dihapus");
    if (detailTarget?.id === s.id) setDetailTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">School Panel (Afiliasi)</h2><p className="text-ink-mute text-sm mt-0.5">Kelola sekolah afiliasi & rekap biaya yang ditanggung.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_SCHOOL_FORM); setOpenAdd(true); }}>Tambah Sekolah</Btn>
      </div>
      {loading ? <div className="text-ink-mute text-sm">Memuat…</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {schools.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-lift transition" onClick={() => setDetailTarget(s)}>
              <div className="flex items-start gap-3">
                <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center shrink-0"><Icon name="school" className="w-7 h-7" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-ink">{s.name}</div>
                  <div className="text-xs text-ink-mute mt-0.5">{s.email ?? "—"}</div>
                  {s.pic_name && <div className="text-xs text-ink-soft mt-0.5">PIC: {s.pic_name}{s.pic_phone ? ` · ${s.pic_phone}` : ""}</div>}
                  <div className="mt-2.5 flex gap-2">
                    <Status kind={s.profile_id ? "active" : "warn"}>{s.profile_id ? "Akun aktif" : "Belum ada akun"}</Status>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {schools.length === 0 && <p className="text-ink-mute">Belum ada sekolah afiliasi.</p>}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detailTarget && !editTarget} onClose={() => setDetailTarget(null)} title="Detail Sekolah" size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { const s = detailTarget!; setDetailTarget(null); deleteSchool(s); }}>Hapus</Btn>
            <div className="flex-1" />
            <Btn variant="ghost" onClick={() => setDetailTarget(null)}>Tutup</Btn>
            <Btn variant="primary" icon="edit" onClick={() => openEdit(detailTarget!)}>Edit</Btn>
          </div>
        }>
        {detailTarget && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center shrink-0"><Icon name="school" className="w-7 h-7" /></span>
              <div>
                <div className="font-display font-bold text-lg text-ink">{detailTarget.name}</div>
                <Status kind={detailTarget.profile_id ? "active" : "warn"}>{detailTarget.profile_id ? "Akun aktif" : "Belum ada akun"}</Status>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-ink-mute">Email login</span>
                <span className="font-mono text-ink">{detailTarget.email ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-ink-mute">Nama PIC</span>
                <span className="font-semibold text-ink">{detailTarget.pic_name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-ink-mute">No. HP PIC</span>
                <span className="font-semibold text-ink">{detailTarget.pic_phone ?? "—"}</span>
              </div>
            </div>
            {detailTarget.pic_phone && (
              <a href={waLink(`Halo ${detailTarget.pic_name ?? ""}, berikut akses login School Panel Next Swimming School untuk ${detailTarget.name}.\n\nEmail: ${detailTarget.email ?? ""}\n\nSilakan login di: ${typeof window !== "undefined" ? window.location.origin : ""}/login`)} target="_blank" rel="noreferrer" className="block">
                <Btn variant="wa" icon="whatsapp" className="w-full">Hubungi PIC via WA</Btn>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Sekolah" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditTarget(null)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sekolah" required><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email login"><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama PIC"><Input value={editForm.pic_name} onChange={e => setEditForm(f => ({ ...f, pic_name: e.target.value }))} placeholder="Mis. Pak Budi" /></Field>
            <Field label="No. HP PIC"><Input value={editForm.pic_phone} onChange={e => setEditForm(f => ({ ...f, pic_phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
        </div>
      </Modal>

      {/* Add school modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Sekolah Afiliasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? "Menyimpan…" : "Buat Sekolah & Akun"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sekolah" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mis. SMAN 4 Bekasi" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama PIC"><Input value={form.pic_name} onChange={e => setForm(f => ({ ...f, pic_name: e.target.value }))} placeholder="Mis. Pak Budi" /></Field>
            <Field label="No. HP PIC" hint="WA credential dikirim ke sini"><Input value={form.pic_phone} onChange={e => setForm(f => ({ ...f, pic_phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
          <Field label="Email login" required hint="Digunakan untuk login ke school page"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Password" required hint="Min. 6 karakter"><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></Field>
        </div>
      </Modal>

      {/* Credential popup after create */}
      <Modal open={!!createdCredential} onClose={() => setCreatedCredential(null)} title="Sekolah Berhasil Ditambahkan" size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Btn variant="ghost" onClick={() => setCreatedCredential(null)}>Tutup</Btn>
            <div className="flex-1" />
            {createdCredential?.pic_phone && (
              <a href={waLink(`Halo, berikut akses login School Panel Next Swimming School untuk ${createdCredential.name}:\n\nEmail: ${createdCredential.email}\nPassword: ${createdCredential.password}\n\nLogin di: ${typeof window !== "undefined" ? window.location.origin : ""}/login`)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">Kirim ke WA PIC</Btn>
              </a>
            )}
          </div>
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
    window.location.href = "/login";
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
