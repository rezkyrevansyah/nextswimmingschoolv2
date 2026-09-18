"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import type { CoachProfile, ClassRow } from "../../_types";
import type { Database } from "@/types/database";
import { fmtDate } from "@/lib/utils";
import { memberLeaveTypeToStatus, uiToCoachDb, MEMBER_ATTENDANCE_CONFLICT, COACH_ATTENDANCE_CONFLICT } from "@/lib/attendance";
import type { LeaveRow } from "./_types";

const PAGE_SIZE = 15;

export function useIzinData(branchId: string) {
  const supabase = createClient();
  const toast = useToast();
  const typeLabel = (ty: string) => ({ sakit: "Sick", izin: "Permission", cuti: "Leave" }[ty] ?? ty);
  const statusLabel = (s: string) => ({ pending: "Pending", approved: "Approved", rejected: "Rejected" }[s] ?? s);
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
        .select("id, member_id, type, reason, date_from, date_to, status, member:members(branch_id, profile_id, profile:profiles(full_name))")
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
      member_profile_id: (l.member as { profile_id?: string } | null)?.profile_id ?? null,
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
    const leaveStatus = memberLeaveTypeToStatus(detail.type);
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
      await supabase.from("member_attendances").upsert(rows, { onConflict: MEMBER_ATTENDANCE_CONFLICT });
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
    const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await supabase.from(table as "coach_leaves").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: adminId }).eq("id", id);
    if (error) return toast.error("Failed to update status", error.message);
    // Auto-create member attendance records when member leave approved
    if (status === "approved" && tab === "member") {
      await autoCreateMemberAttendances(id);
      const leave = leaves.find(l => l.id === id);
      const notifUserId = leave?.member_profile_id ?? leave?.member_id;
      if (leave && notifUserId) {
        await supabase.from("notifications").insert({
          user_id: notifUserId,
          title: "Leave approved",
          body: `Your leave (${fmtDate(leave.date_from)} – ${fmtDate(leave.date_to)}) has been approved.`,
          icon: "check",
          kind: "success",
        });
      }
    }
    toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
    load();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error("Rejection reason is required");
    setRejecting(true);
    const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const upd: Database["public"]["Tables"]["coach_leaves"]["Update"] = { status: "rejected" as Database["public"]["Enums"]["leave_status"], reviewed_at: new Date().toISOString(), reject_reason: rejectReason.trim(), reviewed_by: adminId };
    const table = tab === "coach" ? "coach_leaves" : "member_leaves";
    const { error } = await supabase.from(table as "coach_leaves").update(upd).eq("id", rejectTarget.id);
    setRejecting(false);
    if (error) return toast.error("Failed to reject leave", error.message);
    // Notify coach/member when leave is rejected
    if (tab === "coach" && rejectTarget.coach_id) {
      await supabase.from("notifications").insert({
        user_id: rejectTarget.coach_id,
        title: "Leave rejected",
        body: rejectReason.trim()
          ? `Your leave (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) has been rejected: "${rejectReason.trim()}"`
          : `Your leave (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) has been rejected.`,
        icon: "x",
        kind: "warn",
      });
    }
    const rejectNotifUserId = rejectTarget.member_profile_id ?? rejectTarget.member_id;
    if (tab === "member" && rejectNotifUserId) {
      await supabase.from("notifications").insert({
        user_id: rejectNotifUserId,
        title: "Leave rejected",
        body: rejectReason.trim()
          ? `Your leave (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) has been rejected: "${rejectReason.trim()}"`
          : `Your leave (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) has been rejected.`,
        icon: "x",
        kind: "warn",
      });
    }
    toast.success("Leave rejected");
    setRejectTarget(null);
    load();
  };

  const createLeave = async () => {
    if (!createForm.target_id || !createForm.date_from || !createForm.date_to) return toast.error("Target, start date, and end date are required");
    setCreating(true);
    if (tab === "coach") {
      const primarySubId = Object.values(createForm.class_substitutes).find(s => !!s) ?? null;
      const ins: Database["public"]["Tables"]["coach_leaves"]["Insert"] = { coach_id: createForm.target_id, type: createForm.type as Database["public"]["Enums"]["leave_type"], date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved" as Database["public"]["Enums"]["leave_status"], created_by_admin: true, reviewed_at: new Date().toISOString(), substitute_id: primarySubId || null };
      const { data, error } = await supabase.from("coach_leaves").insert(ins).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Failed to create leave", error?.message); }
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
              const sessionDate = d.toISOString().slice(0, 10);
              rows.push({ branch_id: branchId, coach_id: subId, class_id: cls.id, session_date: sessionDate, status: uiToCoachDb("present")!, is_manual: true, manual_by: adminId });
              // Mark the original coach absent for the same session so they
              // aren't paid twice alongside the substitute (invoice generation
              // only bills status "present"/"late").
              rows.push({ branch_id: branchId, coach_id: createForm.target_id, class_id: cls.id, session_date: sessionDate, status: uiToCoachDb("absent")!, is_manual: true, manual_by: adminId });
            }
            d.setDate(d.getDate() + 1);
          }
        }
        if (rows.length > 0) await supabase.from("coach_attendances").upsert(rows, { onConflict: COACH_ATTENDANCE_CONFLICT });
      }
    } else {
      const { data, error } = await supabase.from("member_leaves").insert({ member_id: createForm.target_id, type: createForm.type as Database["public"]["Enums"]["leave_type"], date_from: createForm.date_from, date_to: createForm.date_to, reason: createForm.reason || null, status: "approved" as Database["public"]["Enums"]["leave_status"], created_by_admin: true, reviewed_at: new Date().toISOString() }).select("id").single();
      if (error || !data) { setCreating(false); return toast.error("Failed to create leave", error?.message); }
      if (createForm.class_ids.length > 0) {
        await supabase.from("member_leave_classes").insert(createForm.class_ids.map(cid => ({ leave_id: data.id, class_id: cid })));
        // Auto-create attendance records
        await autoCreateMemberAttendances(data.id);
      }
      // Notify member that admin created an approved leave for them
      await supabase.from("notifications").insert({
        user_id: createForm.target_id,
        title: "Leave recorded by admin",
        body: `Admin has recorded your leave (${fmtDate(createForm.date_from)} – ${fmtDate(createForm.date_to)}) and it has been approved.`,
        icon: "check",
        kind: "info",
      });
    }
    setCreating(false);
    setOpenCreate(false);
    toast.success("Leave created successfully");
    load();
  };

  const confirmApprove = async () => {
    if (!approveTarget || approving) return;
    setApproving(true);

    // Determine primary substitute (first class's substitute, backward compat)
    const primarySubId = Object.values(classSubstitutes).find(s => !!s) ?? null;
    const adminId = (await supabase.auth.getUser()).data.user?.id ?? null;

    const upd: Database["public"]["Tables"]["coach_leaves"]["Update"] = {
      status: "approved" as Database["public"]["Enums"]["leave_status"],
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      substitute_id: primarySubId || null,
    };
    const { error } = await supabase.from("coach_leaves").update(upd).eq("id", approveTarget.id);
    if (error) { setApproving(false); return toast.error("Failed to approve leave", error.message); }

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
      const rows: { branch_id: string; coach_id: string; class_id: string; session_date: string; status: "present" | "absent" | "late"; is_manual: boolean; manual_by: string | null }[] = [];

      for (const lc of detail.coach_leave_classes) {
        const subId = classSubstitutes[lc.class_id];
        if (!subId) continue;
        const scheduleDays: string[] = lc.class?.schedule_days ?? [];
        const d = new Date(from);
        while (d <= to) {
          const dayName = dayNames[d.getDay()];
          if (scheduleDays.length === 0 || scheduleDays.includes(dayName)) {
            const sessionDate = d.toISOString().slice(0, 10);
            rows.push({ branch_id: branchId, coach_id: subId, class_id: lc.class_id, session_date: sessionDate, status: uiToCoachDb("present")!, is_manual: true, manual_by: adminId });
            // Mark the original coach absent for the same session so they
            // aren't paid twice alongside the substitute (invoice generation
            // only bills status "present"/"late").
            rows.push({ branch_id: branchId, coach_id: detail.coach_id, class_id: lc.class_id, session_date: sessionDate, status: uiToCoachDb("absent")!, is_manual: true, manual_by: adminId });
          }
          d.setDate(d.getDate() + 1);
        }
      }
      if (rows.length > 0) {
        await supabase.from("coach_attendances").upsert(rows, { onConflict: COACH_ATTENDANCE_CONFLICT });
      }
    }

    // Notify leaving coach
    if (detail?.coach_id) {
      const classNames = detail.coach_leave_classes.map(lc => lc.class?.name).filter(Boolean).join(", ");
      const dateRange = detail.date_from === detail.date_to ? detail.date_from : `${detail.date_from} – ${detail.date_to}`;
      await supabase.from("notifications").insert({
        user_id: detail.coach_id,
        title: "Leave approved",
        body: classNames ? `Your leave for ${classNames} (${dateRange}) has been approved.` : `Your leave (${dateRange}) has been approved.`,
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
        const dateRange = detail.date_from === detail.date_to ? detail.date_from : `${detail.date_from} – ${detail.date_to}`;
        await supabase.from("notifications").insert({
          user_id: subId,
          title: "You've been assigned as substitute coach",
          body: `You are substituting for classes ${classNames.join(", ")} on ${dateRange}.`,
          icon: "refresh",
          kind: "info",
        });
      }
    }

    setApproving(false);
    toast.success("Leave approved" + (primarySubId ? " & sessions transferred to substitute" : ""));
    setApproveTarget(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(leaves.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedLeaves = leaves.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return {
    typeLabel, statusLabel,
    tab, setTab, leaves, loading,
    approveTarget, setApproveTarget, classSubstitutes, setClassSubstitutes, approving, allCoaches,
    rejectTarget, setRejectTarget, rejectReason, setRejectReason, rejecting,
    openCreate, setOpenCreate, creating, allMembers, allClasses, createForm, setCreateForm,
    detailTarget, setDetailTarget, page, setPage,
    decide, confirmReject, createLeave, confirmApprove,
    totalPages, safePage, paginatedLeaves,
  };
}
