"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import { Card, SectionTitle, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { createClient } from "@/utils/supabase/client";
import type { ClassRow, AttendanceRow } from "../_types";

export default function AdminDashboard({ branchId }: { branchId: string }) {
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
