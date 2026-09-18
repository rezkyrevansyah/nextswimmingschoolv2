"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";
import {
  isStudentPresentLike,
  uiToStudentDb,
  STUDENT_ATTENDANCE_CONFLICT,
  type StudentDbStatus,
} from "@/lib/attendance";
import type { AttendanceRow, ClassRow, StudentAttRow } from "../../_types";

export function useCoachAbsensi({ coachId, classes }: { coachId: string; classes: ClassRow[] }) {
  const supabase = createClient();
  const toast = useToast();
  const localeTag = "en-US";
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [openManual, setOpenManual] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [manualClassId, setManualClassId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualSessionDates, setManualSessionDates] = useState<{ value: string; label: string }[]>([]);
  const [studentAtt, setStudentAtt] = useState<StudentAttRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [attStatus, setAttStatus] = useState<Record<string, string>>({});
  const [studentAttHistory, setStudentAttHistory] = useState<{ id: string; class_id: string; session_date: string; class_name: string; total: number; hadir: number }[]>([]);

  // Detail sesi modal
  const [detailSesi, setDetailSesi] = useState<{ classId: string; className: string; date: string } | null>(null);
  const [detailRows, setDetailRows] = useState<{ student_id: string; full_name: string; status: string; method: string }[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Private session recording
  const [openPrivate, setOpenPrivate] = useState(false);
  const [privateClassId, setPrivateClassId] = useState("");
  const [privateDate, setPrivateDate] = useState(new Date().toISOString().split("T")[0]);
  const [privateNote, setPrivateNote] = useState("");
  const [savingPrivate, setSavingPrivate] = useState(false);
  const privateClasses = classes.filter(c => c.class_type === "private");

  const loadStudentAttHistory = useCallback(async () => {
    if (!coachId) return;
    // Get distinct (class_id, session_date) combos for all methods (manual + QR)
    const { data } = await supabase.from("student_attendances")
      .select("id, session_date, method, status, class_id, class:classes(name)")
      .in("class_id",
        (await supabase.from("class_coaches").select("class_id").eq("coach_id", coachId).then(r => r.data?.map(x => x.class_id) ?? []))
      )
      .order("session_date", { ascending: false })
      .limit(200);
    if (!data) return;
    // Group by (class_id, session_date)
    const grouped = new Map<string, { id: string; class_id: string; session_date: string; class_name: string; total: number; hadir: number }>();
    for (const row of data) {
      const cls = (row as unknown as { class: { name: string } | null }).class;
      const key = `${row.class_id}__${row.session_date}`;
      if (!grouped.has(key)) grouped.set(key, { id: key, class_id: row.class_id, session_date: row.session_date, class_name: cls?.name ?? "—", total: 0, hadir: 0 });
      const g = grouped.get(key)!;
      g.total++;
      if (isStudentPresentLike(row.status)) g.hadir++;
    }
    setStudentAttHistory([...grouped.values()].sort((a, b) => b.session_date.localeCompare(a.session_date)).slice(0, 15));
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetailSesi = async (classId: string, className: string, date: string) => {
    setDetailSesi({ classId, className, date });
    setLoadingDetail(true);
    // Goes through a server route — see /api/coach/attendance-detail for why
    // (student profile names are RLS-blocked from a direct browser query).
    try {
      const res = await fetch(`/api/coach/attendance-detail?classId=${classId}&date=${date}`);
      const json = await res.json() as { rows?: { student_id: string; full_name: string; status: string; method: string }[] };
      setDetailRows(json.rows ?? []);
    } catch {
      setDetailRows([]);
    }
    setLoadingDetail(false);
  };

  const PAGE_SIZE = 15;

  const loadHistory = useCallback(async (page: number, month: string, classId: string, append = false) => {
    if (!coachId) return;
    setHistoryLoading(true);
    const [y, m] = month.split("-");
    const monthStart = `${y}-${m}-01`;
    const monthEnd = new Date(Number(y), Number(m), 0).toISOString().split("T")[0]; // last day of month
    let q = supabase.from("coach_attendances")
      .select("id, session_date, clock_in_time, distance_meters, is_manual, manual_note, status, class_id, class:classes(name), manual_by_profile:profiles!coach_attendances_manual_by_fkey(full_name)")
      .eq("coach_id", coachId)
      .gte("session_date", monthStart)
      .lte("session_date", monthEnd)
      .order("session_date", { ascending: false })
      .order("clock_in_time", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE); // +PAGE_SIZE fetches PAGE_SIZE+1 to detect next page
    if (classId !== "all") q = q.eq("class_id", classId);
    const { data } = await q;
    const rows = (data ?? []) as unknown as AttendanceRow[];
    const hasMore = rows.length > PAGE_SIZE;
    const display = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    setHistory(prev => append ? [...prev, ...display] : display);
    setHistoryHasMore(hasMore);
    setHistoryLoading(false);
  }, [coachId, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    setHistoryPage(0);
    loadHistory(0, filterMonth, filterClassId);
    loadStudentAttHistory();
    setLoading(false);
  }, [coachId, loadStudentAttHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHistoryPage(0);
    loadHistory(0, filterMonth, filterClassId);
  }, [filterMonth, filterClassId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const onManualClassChange = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    const dates: { value: string; label: string }[] = [];
    if (cls?.schedule_days?.length) {
      const DAY_MAP: Record<string, number> = { Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let daysBack = 0; daysBack <= 56; daysBack++) {
        const d = new Date(today); d.setDate(today.getDate() - daysBack);
        if (cls.schedule_days.some(sd => DAY_MAP[sd] === d.getDay())) {
          const iso = d.toISOString().split("T")[0];
          dates.push({ value: iso, label: d.toLocaleDateString(localeTag, { weekday: "long", day: "numeric", month: "long" }) });
        }
      }
    }
    setManualSessionDates(dates);
    const defaultDate = dates[0]?.value ?? new Date().toISOString().split("T")[0];
    setManualClassId(classId);
    setManualDate(defaultDate);
    setStudentAtt([]);
    setAttStatus({});
  };

  const loadStudents = useCallback(async (classId: string, date: string) => {
    const studentIds = await supabase.from("student_classes").select("student_id").eq("class_id", classId)
      .then(r => r.data?.map(m => m.student_id) ?? []);
    if (studentIds.length === 0) { setStudentAtt([]); setAttStatus({}); return; }

    const { data } = await supabase.from("students")
      .select("id, status, suspend_until, type, school_grade, profile:profiles(full_name, avatar_url, birth_date)")
      .in("id", studentIds);

    if (data) {
      // Filter out suspended students
      const today = new Date().toISOString().split("T")[0];
      const active = data.filter((m: Record<string, unknown>) => {
        const status = m.status as string;
        const suspendUntil = m.suspend_until as string | null;
        if (status === "suspended") return false;
        if (suspendUntil && suspendUntil >= today) return false;
        return true;
      });
      const rows = active.map(m => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawProfile = Array.isArray((m as any).profile) ? (m as any).profile[0] : (m as any).profile;
        return {
          id: "", student_id: (m as any).id as string, session_date: date, status: uiToStudentDb("present"),
          type: m.type as string | undefined,
          school_grade: m.school_grade as string | null | undefined,
          student: rawProfile,
        };
      });
      setStudentAtt(rows as unknown as StudentAttRow[]);
      const init: Record<string, string> = {};
      active.forEach(m => { init[m.id as string] = uiToStudentDb("present"); });
      setAttStatus(init);
    }
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (manualClassId && manualDate) loadStudents(manualClassId, manualDate);
  }, [manualClassId, manualDate, loadStudents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveManualAtt = async () => {
    if (!manualClassId || !manualDate) return toast.error("Class and date are required");
    if (studentAtt.length === 0) return toast.error("No students in this class");
    setSaving(true);
    const rows = studentAtt.map(m => ({ class_id: manualClassId, student_id: m.student_id, session_date: manualDate, status: (attStatus[m.student_id] ?? uiToStudentDb("present")) as StudentDbStatus, method: "manual" as const }));
    const { error } = await supabase.from("student_attendances").upsert(rows, { onConflict: STUDENT_ATTENDANCE_CONFLICT });
    setSaving(false);
    if (error) return toast.error("Failed to save", error.message);
    const hadirCount = rows.filter(r => isStudentPresentLike(r.status)).length;
    toast.success("Student attendance saved", `${hadirCount} present out of ${rows.length} students`);
    const savedClassId = manualClassId;
    const savedDate = manualDate;
    const savedClassName = classes.find(c => c.id === manualClassId)?.name ?? "—";
    setOpenManual(false);
    setManualClassId(""); setManualDate(""); setManualSessionDates([]); setStudentAtt([]); setAttStatus({});
    await loadStudentAttHistory();
    openDetailSesi(savedClassId, savedClassName, savedDate);
  };

  const closeManualModal = () => {
    setOpenManual(false); setManualClassId(""); setManualDate(""); setManualSessionDates([]); setStudentAtt([]); setAttStatus({});
  };

  const savePrivateSession = async () => {
    if (!privateClassId || !privateDate) return toast.error("Class and date are required");
    setSavingPrivate(true);
    // Get student_id for this private class (capacity=1, so 1 student)
    const { data: mcData } = await supabase.from("student_classes").select("student_id").eq("class_id", privateClassId).limit(1);
    const studentId = mcData?.[0]?.student_id;
    if (!studentId) { setSavingPrivate(false); return toast.error("No students in this class"); }
    // Attendance insert + remaining_sessions decrement + bill sync all happen
    // in one atomic DB transaction (record_private_session_attendance) — if
    // any part fails, nothing is committed, so a retry is always safe and
    // remaining_sessions can never silently drift from attendance.
    const { data: result, error: recordErr } = await supabase
      .rpc("record_private_session_attendance", {
        p_student_id: studentId, p_class_id: privateClassId, p_session_date: privateDate,
        p_status: uiToStudentDb("present"), p_method: "manual", p_marked_by: null,
      })
      .single();
    if (recordErr) {
      setSavingPrivate(false);
      return toast.error("Failed to record session", "Failed to record attendance — nothing was saved, sessions left is unaffected. Please try again.");
    }
    const { out_remaining_sessions, out_bill_id, out_bill_sessions_used, out_bill_sessions_total, out_already_recorded } = result as {
      out_remaining_sessions: number | null; out_bill_id: string | null;
      out_bill_sessions_used: number | null; out_bill_sessions_total: number | null; out_already_recorded: boolean;
    };
    if (out_already_recorded) {
      setSavingPrivate(false);
      return toast.error("This session on this date is already recorded");
    }
    // Send reminder when only 1 session left on the active package bill
    if (out_bill_id && out_bill_sessions_total != null && out_bill_sessions_used != null && (out_bill_sessions_total - out_bill_sessions_used) <= 1) {
      await supabase.from("notifications").insert({
        user_id: studentId,
        title: "Sessions almost up",
        body: `You have ${out_bill_sessions_total - out_bill_sessions_used} session(s) left in your package. Contact admin to renew your package.`,
        icon: "warning",
        kind: "warn",
      });
    }
    setSavingPrivate(false);
    toast.success("Private session recorded", `Remaining sessions: ${out_remaining_sessions ?? 0}`);
    setOpenPrivate(false);
    setPrivateClassId(""); setPrivateDate(new Date().toISOString().split("T")[0]); setPrivateNote("");
  };

  return {
    localeTag,
    history, historyLoading, historyPage, setHistoryPage, historyHasMore,
    filterMonth, setFilterMonth, filterClassId, setFilterClassId,
    loading, openManual, setOpenManual, showQR, setShowQR,
    manualClassId, manualDate, setManualDate, manualSessionDates,
    studentAtt, saving, attStatus, setAttStatus, studentAttHistory,
    detailSesi, setDetailSesi, detailRows, loadingDetail,
    openPrivate, setOpenPrivate, privateClassId, setPrivateClassId,
    privateDate, setPrivateDate, privateNote, setPrivateNote, savingPrivate,
    privateClasses,
    loadHistory, openDetailSesi, onManualClassChange, saveManualAtt, closeManualModal, savePrivateSession,
  };
}
