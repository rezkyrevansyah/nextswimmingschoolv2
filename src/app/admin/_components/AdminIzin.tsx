"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import type { CoachProfile, ClassRow } from "../_types";
import type { Database } from "@/types/database";
import { fmtDate } from "@/lib/utils";

interface LeaveRow {
  id: string; type: string; reason: string | null;
  date_from: string; date_to: string; status: string;
  coach_id?: string | null;
  member_id?: string | null;
  profile?: { full_name: string; role: string } | null;
  leave_classes?: { class: { name: string } | null }[];
  substitute_profile?: { full_name: string } | null;
  coach_leave_classes?: {
    class_id: string;
    substitute_id: string | null;
    class?: { name: string; schedule_days: string[] } | null;
    substitute?: { full_name: string } | null;
  }[];
}

export default function AdminIzin({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [tab, setTab] = useState("coach");
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<LeaveRow | null>(null);
  // classSubstitutes: map of class_id → substitute_id (per-class, for approve modal)
  const [classSubstitutes, setClassSubstitutes] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState(false);
  const [allCoaches, setAllCoaches] = useState<CoachProfile[]>([]);
  const [rejectTarget, setRejectTarget] = useState<LeaveRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([]);
  const [createForm, setCreateForm] = useState({ target_id: "", type: "sakit", date_from: "", date_to: "", reason: "", class_ids: [] as string[], class_substitutes: {} as Record<string, string> });
  const [detailTarget, setDetailTarget] = useState<LeaveRow | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Suppress unused import warning
  void (null as unknown as ClassRow);

  const load = useCallback(async () => {
    setLoading(true);
    let data: Record<string, unknown>[] | null = null;
    if (tab === "coach") {
      const { data: d } = await supabase.from("coach_leaves")
        .select("id, coach_id, type, reason, date_from, date_to, status, substitute_id, substitute_profile:profiles!coach_leaves_substitute_id_fkey(full_name), coach:profiles!coach_leaves_coach_id_fkey(full_name, role, branch_id), coach_leave_classes(class_id, substitute_id, class:classes(name, schedule_days), substitute:profiles!coach_leave_classes_substitute_id_fkey(full_name))")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      data = (d as Record<string, unknown>[] | null) ?? null;
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
    // Load all coaches cross-branch for substitute dropdown
    supabase.from("profiles").select("id, full_name, suspend_until").eq("role", "coach").order("full_name")
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

  // Reset page when tab changes
  useEffect(() => { setPage(0); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (leave) {
        setApproveTarget(leave);
        // Pre-fill classSubstitutes from per-class data set by coach
        const prefilled: Record<string, string> = {};
        for (const lc of leave.coach_leave_classes ?? []) {
          prefilled[lc.class_id] = lc.substitute_id ?? "";
        }
        setClassSubstitutes(prefilled);
        return;
      }
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
      const primarySubId = Object.values(createForm.class_substitutes).find(s => !!s) ?? null;
      const ins: Database["public"]["Tables"]["coach_leaves"]["Insert"] = { coach_id: createForm.target_id, type: createForm.type as Database["public"]["Enums"]["leave_type"], date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved" as Database["public"]["Enums"]["leave_status"], created_by_admin: true, reviewed_at: new Date().toISOString(), substitute_id: primarySubId || null };
      const { data, error } = await supabase.from("coach_leaves").insert(ins).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Gagal membuat izin", error?.message); }
      if (createForm.class_ids.length > 0) {
        await supabase.from("coach_leave_classes").insert(
          createForm.class_ids.map(cid => ({
            leave_id: data.id,
            class_id: cid,
            substitute_id: createForm.class_substitutes[cid] || null,
          }))
        );
      }
      // Auto-create substitute attendance records per class
      const classSubsEntries = createForm.class_ids.filter(cid => createForm.class_substitutes[cid]);
      if (classSubsEntries.length > 0) {
        const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
        const { data: clsRows } = await supabase.from("classes").select("id, schedule_days").in("id", classSubsEntries);
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const from = new Date(createForm.date_from);
        const to   = new Date(createForm.date_to);
        const rows: { branch_id: string; coach_id: string; class_id: string; session_date: string; status: "present" | "absent" | "late"; is_manual: boolean; manual_by: string | null }[] = [];
        for (const cls of (clsRows ?? []) as { id: string; schedule_days: string[] }[]) {
          const subId = createForm.class_substitutes[cls.id];
          if (!subId) continue;
          const d = new Date(from);
          while (d <= to) {
            const dayName = dayNames[d.getDay()];
            if (cls.schedule_days.length === 0 || cls.schedule_days.includes(dayName)) {
              rows.push({ branch_id: branchId, coach_id: subId, class_id: cls.id, session_date: d.toISOString().slice(0, 10), status: "present" as const, is_manual: true, manual_by: adminId });
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

    // Determine primary substitute (first class's substitute, backward compat)
    const primarySubId = Object.values(classSubstitutes).find(s => !!s) ?? null;

    const upd: Database["public"]["Tables"]["coach_leaves"]["Update"] = {
      status: "approved" as Database["public"]["Enums"]["leave_status"],
      reviewed_at: new Date().toISOString(),
      substitute_id: primarySubId || null,
    };
    const { error } = await supabase.from("coach_leaves").update(upd).eq("id", approveTarget.id);
    if (error) { setApproving(false); return toast.error("Gagal menyetujui izin", error.message); }

    // Upsert per-class substitute_id
    const perClassRows = Object.entries(classSubstitutes).map(([class_id, substitute_id]) => ({
      leave_id: approveTarget.id,
      class_id,
      substitute_id: substitute_id || null,
    }));
    if (perClassRows.length > 0) {
      await supabase.from("coach_leave_classes").upsert(perClassRows, { onConflict: "leave_id,class_id" });
    }

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

    // Auto-create coach_attendances per class per substitute
    if (detail && Object.keys(classSubstitutes).length > 0) {
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const from = new Date(detail.date_from);
      const to   = new Date(detail.date_to);
      const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const rows: { branch_id: string; coach_id: string; class_id: string; session_date: string; status: "present" | "absent" | "late"; is_manual: boolean; manual_by: string | null }[] = [];

      for (const lc of detail.coach_leave_classes) {
        const subId = classSubstitutes[lc.class_id];
        if (!subId) continue;
        const scheduleDays: string[] = lc.class?.schedule_days ?? [];
        const d = new Date(from);
        while (d <= to) {
          const dayName = dayNames[d.getDay()];
          if (scheduleDays.length === 0 || scheduleDays.includes(dayName)) {
            rows.push({ branch_id: branchId, coach_id: subId, class_id: lc.class_id, session_date: d.toISOString().slice(0, 10), status: "present" as const, is_manual: true, manual_by: adminId });
          }
          d.setDate(d.getDate() + 1);
        }
      }
      if (rows.length > 0) {
        await supabase.from("coach_attendances").upsert(rows, { onConflict: "coach_id,class_id,session_date" });
      }
    }

    // Notify leaving coach
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

    // Notify each unique substitute coach
    if (detail) {
      const uniqueSubs = new Map<string, string[]>(); // subId → class names
      for (const lc of detail.coach_leave_classes) {
        const subId = classSubstitutes[lc.class_id];
        if (!subId) continue;
        if (!uniqueSubs.has(subId)) uniqueSubs.set(subId, []);
        uniqueSubs.get(subId)!.push(lc.class?.name ?? "—");
      }
      for (const [subId, classNames] of uniqueSubs) {
        await supabase.from("notifications").insert({
          user_id: subId,
          title: "Anda ditambahkan sebagai coach pengganti",
          body: `Anda menggantikan coach untuk kelas ${classNames.join(", ")} pada ${detail.date_from === detail.date_to ? detail.date_from : `${detail.date_from} – ${detail.date_to}`}.`,
          icon: "refresh",
          kind: "info",
        });
      }
    }

    setApproving(false);
    toast.success("Izin disetujui" + (primarySubId ? " & sesi dialihkan ke pengganti" : ""));
    setApproveTarget(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(leaves.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedLeaves = leaves.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">Manajemen Izin</h2><p className="text-ink-mute text-sm mt-0.5">Approve pengajuan izin coach & member.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setCreateForm({ target_id: "", type: "sakit", date_from: "", date_to: "", reason: "", class_ids: [], class_substitutes: {} }); setOpenCreate(true); }}>Buat Izin</Btn>
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
                {paginatedLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => setDetailTarget(l)}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={l.profile?.full_name ?? "?"} size={34} />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate">{l.profile?.full_name ?? "—"}</div>
                          {l.reason && <div className="text-xs text-ink-faint truncate max-w-[140px] sm:max-w-[220px]">{l.reason}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="capitalize text-sm">{l.type}</td>
                    <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_from)}</td>
                    <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_to)}</td>
                    <td><Status kind={l.status as "pending" | "approved" | "rejected"}>{l.status === "pending" ? "Menunggu" : l.status === "approved" ? "Disetujui" : "Ditolak"}</Status></td>
                    <td className="text-ink-soft text-xs hidden md:table-cell">
                      {(() => {
                        const hasPerClass = l.coach_leave_classes && l.coach_leave_classes.length > 0;
                        if (hasPerClass) {
                          const filled = l.coach_leave_classes!.filter(lc => lc.substitute_id).length;
                          const total = l.coach_leave_classes!.length;
                          return <span className={filled === total ? "text-ok-600 font-semibold" : "text-warn-600"}>{filled}/{total} kelas</span>;
                        }
                        return l.substitute_profile?.full_name ?? "—";
                      })()}
                    </td>
                    <td className="px-5" onClick={e => e.stopPropagation()}>
                      {l.status === "pending" ? (
                        <div className="flex gap-1 justify-end">
                          <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => decide(l.id, "rejected")}>Tolak</Btn>
                          <Btn variant="soft" size="sm" icon="check" onClick={() => decide(l.id, "approved")}>Setujui</Btn>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button className="p-1.5 text-ink-mute hover:text-ocean-600 rounded-lg transition-colors" onClick={() => setDetailTarget(l)}>
                            <Icon name="eye" className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-mute">Tidak ada pengajuan izin</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-ink-mute tabular-nums">
              {leaves.length} pengajuan · halaman {safePage + 1} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
              <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                .reduce<(number | "...")[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`e${idx}`} className="px-2 text-xs text-ink-faint">…</span>
                  ) : (
                    <button key={item} type="button" onClick={() => setPage(item as number)}
                      className={`min-w-[32px] py-1.5 rounded-lg border text-xs transition
                        ${safePage === item ? "bg-ocean-600 border-ocean-600 text-white font-bold" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                      {(item as number) + 1}
                    </button>
                  )
                )}
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
            </div>
          </div>
        )}
      </Card>

      {/* Approve coach leave + assign per-class substitute modal */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Setujui Izin Coach" size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setApproveTarget(null)}>Batal</Btn>
          <Btn variant="primary" icon="check" onClick={confirmApprove}
            disabled={approving || (approveTarget?.coach_leave_classes?.length ? approveTarget.coach_leave_classes.some(lc => !classSubstitutes[lc.class_id]) : false)}>
            {approving ? "Menyetujui…" : "Setujui Izin"}
          </Btn>
        </>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{approveTarget?.profile?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(approveTarget?.date_from ?? "")} – {fmtDate(approveTarget?.date_to ?? "")} · {approveTarget?.type}</div>
            {approveTarget?.reason && <div className="text-xs text-ink-soft mt-1">{approveTarget.reason}</div>}
          </Card>
          {approveTarget?.coach_leave_classes && approveTarget.coach_leave_classes.length > 0 ? (
            <div>
              <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider mb-2">Pengganti per Kelas</div>
              <div className="space-y-3">
                {approveTarget.coach_leave_classes.map(lc => (
                  <div key={lc.class_id} className="space-y-1.5">
                    <div className="text-sm font-semibold text-ink">{lc.class?.name ?? "—"}</div>
                    <Select
                      value={classSubstitutes[lc.class_id] ?? ""}
                      onChange={e => setClassSubstitutes(prev => ({ ...prev, [lc.class_id]: e.target.value }))}
                    >
                      <option value="">— pilih coach pengganti —</option>
                      {allCoaches
                        .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                        .map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </Select>
                    {!classSubstitutes[lc.class_id] && (
                      <p className="text-xs text-warn-600">Wajib pilih pengganti untuk kelas ini</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Field label="Assign Coach Pengganti" hint="Opsional. Pengganti muncul di coach page mereka dengan label 'Pengganti' selama tanggal izin.">
              <Select value={classSubstitutes["__single__"] ?? ""} onChange={e => setClassSubstitutes({ "__single__": e.target.value })}>
                <option value="">— tanpa pengganti —</option>
                {allCoaches
                  .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                  .map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
          )}
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

      {/* Detail leave modal */}
      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Detail Izin" size="md"
        footer={
          <div className="flex gap-2 w-full">
            {detailTarget?.status === "pending" && (
              <>
                <Btn variant="ghost" className="text-danger-500"
                  onClick={() => { setRejectTarget(detailTarget); setRejectReason(""); setDetailTarget(null); }}>Tolak</Btn>
                <Btn variant="soft" icon="check"
                  onClick={() => { decide(detailTarget.id, "approved"); setDetailTarget(null); }}>Setujui</Btn>
              </>
            )}
            <Btn variant="ghost" className="ml-auto" onClick={() => setDetailTarget(null)}>Tutup</Btn>
          </div>
        }>
        {detailTarget && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-2xl">
              <Avatar name={detailTarget.profile?.full_name ?? "?"} size={48} />
              <div className="min-w-0">
                <div className="font-display font-bold text-lg text-ink leading-tight truncate">{detailTarget.profile?.full_name ?? "—"}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Status kind={detailTarget.status as "pending" | "approved" | "rejected"}>
                    {detailTarget.status === "pending" ? "Menunggu" : detailTarget.status === "approved" ? "Disetujui" : "Ditolak"}
                  </Status>
                  <span className="text-xs text-ink-mute capitalize">{detailTarget.type}</span>
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">Jenis</span>
                <span className="text-sm text-ink font-medium capitalize">{detailTarget.type}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">Tanggal mulai</span>
                <span className="text-sm text-ink">{fmtDate(detailTarget.date_from)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">Tanggal selesai</span>
                <span className="text-sm text-ink">{fmtDate(detailTarget.date_to)}</span>
              </div>
              {detailTarget.date_from !== detailTarget.date_to && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-ink-mute">Durasi</span>
                  <span className="text-sm text-ink tabular-nums">
                    {Math.round((new Date(detailTarget.date_to).getTime() - new Date(detailTarget.date_from).getTime()) / 86400000) + 1} hari
                  </span>
                </div>
              )}
            </div>

            {/* Reason — main ask */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Alasan / Keterangan</div>
              {detailTarget.reason
                ? <p className="text-sm text-ink bg-paper-tint rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">{detailTarget.reason}</p>
                : <p className="text-sm text-ink-faint italic px-4 py-3 bg-paper-tint rounded-xl">Tidak ada keterangan.</p>
              }
            </div>

            {/* Per-class substitutes (coach, new format) */}
            {tab === "coach" && detailTarget.coach_leave_classes && detailTarget.coach_leave_classes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kelas & Pengganti</div>
                <div className="bg-paper-tint rounded-xl divide-y divide-line">
                  {detailTarget.coach_leave_classes.map(lc => (
                    <div key={lc.class_id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-ink">{lc.class?.name ?? "—"}</span>
                      {lc.substitute?.full_name
                        ? <span className="text-xs font-semibold text-ok-600">{lc.substitute.full_name}</span>
                        : <span className="text-xs text-warn-600">Belum ada pengganti</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: old single substitute (pre-migration) */}
            {tab === "coach" && !(detailTarget.coach_leave_classes?.length) && detailTarget.substitute_profile && (
              <div className="bg-paper-tint rounded-xl divide-y divide-line">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-ink-mute">Pengganti</span>
                  <span className="text-sm font-semibold text-ok-600">{detailTarget.substitute_profile.full_name}</span>
                </div>
              </div>
            )}
          </div>
        )}
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
                    onClick={() => setCreateForm(f => {
                      const newIds = sel ? f.class_ids.filter(id => id !== c.id) : [...f.class_ids, c.id];
                      const newSubs = { ...f.class_substitutes };
                      if (sel) delete newSubs[c.id];
                      return { ...f, class_ids: newIds, class_substitutes: newSubs };
                    })}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${sel ? "bg-ocean-700 text-white border-ocean-700" : "bg-paper-tint border-line text-ink-soft hover:border-ocean-300"}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
          {tab === "coach" && createForm.class_ids.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider mb-2">Coach Pengganti per Kelas</div>
              <div className="space-y-3">
                {allClasses.filter(c => createForm.class_ids.includes(c.id)).map(c => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="text-sm font-semibold text-ink">{c.name}</div>
                    <Select
                      value={createForm.class_substitutes[c.id] ?? ""}
                      onChange={e => setCreateForm(f => ({ ...f, class_substitutes: { ...f.class_substitutes, [c.id]: e.target.value } }))}
                    >
                      <option value="">— tanpa pengganti —</option>
                      {allCoaches.filter(c2 => c2.id !== createForm.target_id).map(c2 => <option key={c2.id} value={c2.id}>{c2.full_name}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Field label="Keterangan" hint="Opsional">
            <Textarea rows={2} value={createForm.reason} onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Demam sejak kemarin." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
