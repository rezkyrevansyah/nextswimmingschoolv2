"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { resolveRaporSigner, buildSchoolRaporSignatures, type SchoolForSignerConfig } from "@/lib/rapor";
import type { PrintBestTime } from "@/lib/printRapor";
import { createClient } from "@/utils/supabase/client";
import type { Criterion, Student } from "../_types";

const PAGE_SIZE = 15;

export function useSchoolRaporData() {
  const supabase = createClient();
  const [tab, setTab] = useState<"rapor" | "absensi">("rapor");
  const [schoolName, setSchoolName] = useState("SMAN 70 Jakarta");
  const [schoolId, setSchoolId] = useState("");
  const [, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [adminWaPhone, setAdminWaPhone] = useState("");
  const [activePeriod, setActivePeriod] = useState<{ id: string; label: string; date_from: string; date_to: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  // Toolbar & filter state
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterCoach, setFilterCoach] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  // Bulk select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal detail view
  const [open, setOpen] = useState<Student | null>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const load = useCallback(async (sid: string, pid: string | null, periodLabel: string | null, branch_id: string, schoolConfig?: SchoolForSignerConfig & { logo_url: string | null }) => {
    setLoading(true);

    const { data: studentRows } = await supabase
      .from("students")
      .select("id, profile_id, student_no, school_grade, profile:profiles(full_name, birth_date, avatar_url)")
      .eq("school_id", sid);

    if (!studentRows || studentRows.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = studentRows.map(m => m.id);

    const [{ data: mcRows }, { data: entries }, { data: bestTimes }, { data: levelDistances }, { data: levelStrokes }] = await Promise.all([
      supabase
        .from("student_classes")
        .select("student_id, class_id, class:classes(id, name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url)))")
        .in("student_id", studentIds),
      pid
        ? supabase
            .from("rapor_entries")
            .select("id, student_id, class_id, period_id, scores, notes, personality, motivation, learning_achievements, level, level_id, locked, rapor_levels(rapor_level_criteria(id, label, description, kind, options, sort_order))")
            .eq("period_id", pid)
            .in("student_id", studentIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("student_best_times")
        .select("id, student_id, stroke, distance, time_seconds, event_date, is_official")
        .in("student_id", studentIds)
        .order("distance", { ascending: true }),
      supabase
        .from("rapor_level_distances")
        .select("level_id, distance")
        .order("distance", { ascending: true }),
      supabase
        .from("rapor_level_strokes")
        .select("level_id, stroke"),
    ]);

    const { data: ownerSettings } = await supabase
      .from("owner_settings")
      .select("head_name, head_title, head_signature_url")
      .eq("id", "default")
      .maybeSingle();

    const headSigUrl = ownerSettings?.head_signature_url || null;
    const headName = ownerSettings?.head_name || "Syahril Sidik";
    const headTitle = ownerSettings?.head_title || "HEAD OF NEXT SWIMMING";

    const classByStudent = new Map<string, {
      name: string;
      signerCoach: { full_name: string; signature_url: string | null } | null;
    }>();

    type McRow = {
      student_id: string;
      class: {
        id: string;
        name: string;
        rapor_signer_coach_id?: string | null;
        class_coaches: {
          coach_id: string;
          role: string;
          profile: { full_name: string; signature_url?: string | null } | null;
        }[];
      } | null;
    };

    (mcRows as unknown as McRow[] ?? []).forEach(mc => {
      if (!mc.class) return;
      const coaches = (mc.class.class_coaches ?? []).map(cc => ({
        coach_id: cc.coach_id,
        role: cc.role,
        profile: cc.profile ? { full_name: cc.profile.full_name, signature_url: cc.profile.signature_url ?? null } : null,
      }));
      const signer = resolveRaporSigner(coaches, mc.class.rapor_signer_coach_id);
      classByStudent.set(mc.student_id, {
        name: mc.class.name,
        signerCoach: signer,
      });
    });

    type RaporEntryRow = {
      id: string;
      student_id: string;
      class_id: string;
      period_id: string;
      scores: Record<string, number | string>;
      notes: string | null;
      personality: string | null;
      motivation: string | null;
      learning_achievements: string | null;
      level: string | null;
      level_id: string | null;
      locked: boolean;
      rapor_levels?: {
        rapor_level_criteria: (Criterion & { sort_order: number })[];
      } | null;
    };

    const entryByStudent = new Map<string, RaporEntryRow>();
    (entries as unknown as RaporEntryRow[] ?? []).forEach(e => {
      entryByStudent.set(e.student_id, e);
    });

    const btByStudent = new Map<string, PrintBestTime[]>();
    (bestTimes ?? []).forEach(bt => {
      const arr = btByStudent.get(bt.student_id) ?? [];
      arr.push({ stroke: bt.stroke, distance: bt.distance, time_seconds: bt.time_seconds });
      btByStudent.set(bt.student_id, arr);
    });

    const distancesByLevel = new Map<string, number[]>();
    (levelDistances ?? []).forEach(ld => {
      const arr = distancesByLevel.get(ld.level_id) ?? [];
      arr.push(ld.distance);
      distancesByLevel.set(ld.level_id, arr);
    });

    const strokesByLevel = new Map<string, string[]>();
    (levelStrokes ?? []).forEach(ls => {
      const arr = strokesByLevel.get(ls.level_id) ?? [];
      arr.push(ls.stroke);
      strokesByLevel.set(ls.level_id, arr);
    });

    type StudentProfile = {
      id: string;
      student_no?: string | null;
      school_grade?: string | null;
      profile: {
        full_name: string;
        birth_date?: string | null;
        avatar_url?: string | null;
      } | null;
    };

    const rows: Student[] = (studentRows as unknown as StudentProfile[]).map(m => {
      const cls = classByStudent.get(m.id);
      const entry = entryByStudent.get(m.id);
      const profile = m.profile;
      const signer = cls?.signerCoach ?? null;
      const coachSig = signer?.signature_url ?? null;

      const signatures = buildSchoolRaporSignatures(
        schoolConfig,
        signer?.full_name ?? "—",
        coachSig,
        { head_name: headName, head_title: headTitle, head_signature_url: headSigUrl }
      );

      const criteria = (entry?.rapor_levels?.rapor_level_criteria ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);

      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        student_no: m.student_no ?? null,
        birth_date: profile?.birth_date ?? null,
        avatar_url: profile?.avatar_url ?? null,
        school_grade: m.school_grade ?? null,
        class_name: cls?.name ?? "—",
        coach_name: signer?.full_name ?? "—",
        coach_signature_url: coachSig,
        period_id: pid,
        period_label: periodLabel,
        entry_id: entry?.id ?? null,
        is_filled: entry?.locked === true,
        scores: entry?.scores ?? {},
        notes: entry?.notes ?? null,
        personality: entry?.personality ?? null,
        motivation: entry?.motivation ?? null,
        learning_achievements: entry?.learning_achievements ?? null,
        level: entry?.level ?? null,
        criteria,
        best_times: btByStudent.get(m.id) ?? [],
        level_strokes: entry?.level_id ? (strokesByLevel.get(entry.level_id) ?? []) : [],
        level_distances: entry?.level_id ? (distancesByLevel.get(entry.level_id) ?? []) : [],
        school_logo_url: schoolConfig?.logo_url ?? null,
        signatures,
      };
    });
    setStudents(rows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);

      const { data: schoolData } = await supabase
        .from("schools")
        .select("id, name, branch_id, logo_url, show_coach_sig, show_head_sig, show_school_sig, coach_sig_title, head_sig_title, school_signatures(name, title, image_url, is_active)")
        .eq("profile_id", u.id)
        .single();

      if (!schoolData) { setLoading(false); return; }
      setSchoolName(schoolData.name);
      setSchoolId(schoolData.id);
      setBranchId(schoolData.branch_id);
      const schoolConfig = schoolData as unknown as (SchoolForSignerConfig & { logo_url: string | null });

      const { data: branch } = await supabase.from("branches").select("name, wa_numbers").eq("id", schoolData.branch_id).single();
      const branchRow = branch as unknown as { name: string; wa_numbers: string[] } | null;
      if (branchRow?.name) setBranchName(branchRow.name);
      const waNumbers = branchRow?.wa_numbers;
      if (waNumbers && waNumbers.length > 0) setAdminWaPhone(waNumbers[0]);

      const { data: period } = await supabase
        .from("rapor_periods")
        .select("id, label, date_from, date_to")
        .eq("branch_id", schoolData.branch_id)
        .eq("is_open", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (period) {
        setActivePeriod(period);
        await load(schoolData.id, period.id, period.label, schoolData.branch_id, schoolConfig);
      } else {
        await load(schoolData.id, null, null, schoolData.branch_id, schoolConfig);
      }
    });
  }, [supabase, load]);

  // Derived: unique class & coach lists for filter dropdowns
  const classList = useMemo(() => [...new Set(students.map(s => s.class_name).filter(n => n !== "—"))].sort(), [students]);
  const coachList = useMemo(() => [...new Set(students.map(s => s.coach_name).filter(n => n !== "—"))].sort(), [students]);

  const activeFilterCount = [filterClass, filterCoach, filterStatus].filter(Boolean).length;

  const resetFilters = () => { setFilterClass(""); setFilterCoach(""); setFilterStatus(""); };

  // Filtered + sorted list
  const filteredSorted = useMemo(() => {
    let result = [...students];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q) ||
        s.coach_name.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filterClass)  result = result.filter(s => s.class_name === filterClass);
    if (filterCoach)  result = result.filter(s => s.coach_name === filterCoach);
    if (filterStatus === "done")    result = result.filter(s => s.is_filled);
    if (filterStatus === "pending") result = result.filter(s => !s.is_filled);

    // Sort
    result.sort((a, b) => {
      let va = "", vb = "";
      if (sortBy === "name")   { va = a.full_name; vb = b.full_name; }
      else if (sortBy === "class")  { va = a.class_name; vb = b.class_name; }
      else if (sortBy === "coach")  { va = a.coach_name; vb = b.coach_name; }
      else if (sortBy === "status") { va = a.is_filled ? "1" : "0"; vb = b.is_filled ? "1" : "0"; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, search, filterClass, filterCoach, filterStatus, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filteredSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const totalDone = students.filter(s => s.is_filled).length;
  const totalPending = students.filter(s => !s.is_filled).length;

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  return {
    tab, setTab, schoolName, schoolId, branchName, adminWaPhone, activePeriod, students, loading, userId,
    search, setSearch, filterClass, setFilterClass, filterCoach, setFilterCoach, filterStatus, setFilterStatus,
    showFilters, setShowFilters, sortBy, sortDir, page, setPage,
    selectMode, setSelectMode, selected, setSelected,
    open, setOpen,
    logout,
    classList, coachList, activeFilterCount, resetFilters,
    filteredSorted, totalPages, safePage, paginated,
    totalDone, totalPending, toggleSort, setSortBy, setSortDir,
  };
}
