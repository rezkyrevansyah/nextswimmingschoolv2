"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import type { ClassRow, School } from "../../_types";
import type { StudentRow } from "./_types";

export function useStudentListData({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState("all");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [coachesForImport, setCoachesForImport] = useState<{ id: string; phone: string | null }[]>([]);

  // Filter, sort & pagination state
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterSessions, setFilterSessions] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const db = createClient();
    const sel = "id, profile_id, type, status, date_start, qr_code, school_id, school_grade, student_no, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email, avatar_url), student_classes(class:classes(id, name))";
    let q = db.from("students").select(sel).eq("branch_id", branchId).order("created_at", { ascending: false });
    if (tab === "suspended") q = db.from("students").select(sel).eq("branch_id", branchId).eq("status", "suspended") as typeof q;
    else if (tab !== "all") q = q.eq("type", tab as "reguler" | "private" | "school_affiliate");
    const { data } = await q;
    if (data) setStudents(data as unknown as StudentRow[]);
    setLoading(false);
  }, [branchId, tab]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    supabase.from("classes").select("id, name, capacity, enrolled, status, branch_id, schedule_days, time_start, time_end, price_monthly, price_per_session, class_type").eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
    supabase.from("schools").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setSchoolsList(data as School[]); });
    supabase.from("profiles").select("id, phone").eq("role", "coach").eq("branch_id", branchId)
      .then(({ data }) => { if (data) setCoachesForImport(data as { id: string; phone: string | null }[]); });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const findCoachByPhone = (phone: string) => coachesForImport.find(c => (c.phone ?? "").replace(/\D/g, "") === phone.replace(/\D/g, "") && phone.trim() !== "");

  const stats = {
    all:     students.length,
    reguler: students.filter(m => m.type === "reguler").length,
    private: students.filter(m => m.type === "private").length,
    school:  students.filter(m => m.type === "school_affiliate").length,
  };

  const activeFilterCount = [filterGender, filterClass, filterSchool, filterSessions].filter(Boolean).length;

  const filteredSorted = useMemo(() => {
    // 1. Tab filter
    let result = tab === "suspended"
      ? students.filter(m => m.status === "suspended")
      : tab === "all" ? students : students.filter(m => m.type === tab);

    // 2. Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.profile?.full_name?.toLowerCase().includes(q) ||
        m.profile?.email?.toLowerCase().includes(q) ||
        (m.profile?.phone ?? "").includes(q)
      );
    }

    // 3. Filters
    if (filterGender)   result = result.filter(m => m.profile?.gender === filterGender);
    if (filterClass)    result = result.filter(m => m.student_classes?.some(mc => mc.class?.id === filterClass));
    if (filterSchool)   result = result.filter(m => m.school_id === filterSchool);
    if (filterSessions === "has")  result = result.filter(m => (m.remaining_sessions ?? 0) > 0);
    if (filterSessions === "low")  result = result.filter(m => m.remaining_sessions !== null && m.remaining_sessions <= 3);
    if (filterSessions === "none") result = result.filter(m => m.remaining_sessions !== null && m.remaining_sessions === 0);

    // 4. Sort
    if (sortBy !== "created_at") {
      result = [...result].sort((a, b) => {
        let va: string | number = "", vb: string | number = "";
        if (sortBy === "name")                { va = (a.profile?.full_name ?? "").toLowerCase(); vb = (b.profile?.full_name ?? "").toLowerCase(); }
        else if (sortBy === "date_start")     { va = a.date_start; vb = b.date_start; }
        else if (sortBy === "sessions")       { va = a.remaining_sessions ?? -1; vb = b.remaining_sessions ?? -1; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    } else if (sortDir === "asc") {
      result = [...result].reverse();
    }

    return result;
  }, [students, tab, search, filterGender, filterClass, filterSchool, filterSessions, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  // Clamp page to valid range (auto-resets to 0 when filter shrinks result set)
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filteredSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const resetFilters = () => { setSearch(""); setFilterGender(""); setFilterClass(""); setFilterSchool(""); setFilterSessions(""); };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  return {
    tab, setTab, students, setStudents, loading, classes, schoolsList, coachesForImport,
    search, setSearch, filterGender, setFilterGender, filterClass, setFilterClass,
    filterSchool, setFilterSchool, filterSessions, setFilterSessions,
    sortBy, setSortBy, sortDir, setSortDir, showFilters, setShowFilters, page, setPage, PAGE_SIZE,
    load, findCoachByPhone, stats, activeFilterCount, filteredSorted, totalPages, safePage, paginated,
    resetFilters, toggleSort,
  };
}
