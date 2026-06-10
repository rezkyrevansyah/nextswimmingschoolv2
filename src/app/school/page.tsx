"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: "asc" | "desc" }) {
  return (
    <span className={`ml-1 text-[10px] transition-opacity ${sortBy === col ? "opacity-100 text-ocean-500" : "opacity-0 group-hover:opacity-40"}`}>
      {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Bell from "@/components/layout/Bell";
import { waLink } from "@/lib/utils";
import { printSingleRapor, printSchoolRekap, type PrintCriterion } from "@/lib/printRapor";
import { createClient } from "@/utils/supabase/client";

type Criterion = PrintCriterion;

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  coach_name: string;
  period_id: string | null;
  period_label: string | null;
  entry_id: string | null;
  scores: Record<string, number | string>;
  notes: string | null;
  criteria: Criterion[];
}

export default function SchoolPage() {
  const supabase = createClient();
  const [schoolName, setSchoolName] = useState("School Panel");
  const [userId, setUserId] = useState("");
  const [adminWaPhone, setAdminWaPhone] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [activePeriod, setActivePeriod] = useState<{ id: string; label: string; date_from: string; date_to: string } | null>(null);
  const [open, setOpen] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & sort state
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterCoach, setFilterCoach] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "" | "done" | "pending"
  const [sortBy, setSortBy] = useState("name"); // "name" | "class" | "coach" | "status"
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Multi-select for bulk print
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const load = useCallback(async (sId: string, pid: string | null, periodLabel: string | null) => {
    if (!sId) return;
    const { data } = await supabase
      .from("members")
      .select(`
        id,
        profile:profiles(full_name),
        member_classes(
          classes(
            id, name,
            class_coaches(profile:profiles(full_name)),
            class_criteria(id, label, kind, options, sort_order)
          )
        ),
        rapor_entries(
          id, scores, notes, period_id
        )
      `)
      .eq("school_id", sId)
      .eq("type", "school_affiliate");

    if (!data) { setLoading(false); return; }

    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; class_coaches: { profile: { full_name: string } | null }[]; class_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const firstCoach = cls?.class_coaches?.[0]?.profile;
      const entry = pid
        ? (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; period_id: string }[])
          ?.find((e) => e.period_id === pid)
        : undefined;
      const criteria: Criterion[] = [...(cls?.class_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as Criterion["kind"] }));
      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        class_name: cls?.name ?? "—",
        coach_name: firstCoach?.full_name ?? "—",
        period_id: pid,
        period_label: periodLabel,
        entry_id: entry?.id ?? null,
        scores: entry?.scores ?? {},
        notes: entry?.notes ?? null,
        criteria,
      };
    });
    setStudents(rows);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);

      const { data: school } = await supabase
        .from("schools")
        .select("id, name, branch_id")
        .eq("profile_id", u.id)
        .single();

      if (!school) { setLoading(false); return; }
      setSchoolName(school.name);

      const { data: branch } = await supabase.from("branches").select("wa_numbers").eq("id", school.branch_id).single();
      const waNumbers = (branch as unknown as { wa_numbers: string[] } | null)?.wa_numbers;
      if (waNumbers && waNumbers.length > 0) setAdminWaPhone(waNumbers[0]);

      const { data: period } = await supabase
        .from("rapor_periods")
        .select("id, label, date_from, date_to")
        .eq("branch_id", school.branch_id)
        .eq("is_open", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (period) {
        setActivePeriod(period);
        await load(school.id, period.id, period.label);
      } else {
        await load(school.id, null, null);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (filterStatus === "done")    result = result.filter(s => s.entry_id !== null);
    if (filterStatus === "pending") result = result.filter(s => s.entry_id === null);

    // Sort
    result.sort((a, b) => {
      let va = "", vb = "";
      if (sortBy === "name")   { va = a.full_name; vb = b.full_name; }
      else if (sortBy === "class")  { va = a.class_name; vb = b.class_name; }
      else if (sortBy === "coach")  { va = a.coach_name; vb = b.coach_name; }
      else if (sortBy === "status") { va = a.entry_id ? "1" : "0"; vb = b.entry_id ? "1" : "0"; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, search, filterClass, filterCoach, filterStatus, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  // Clamp page to valid range (auto-resets to 0 when filter shrinks result set)
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filteredSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const totalDone = students.filter(s => s.entry_id !== null).length;
  const totalPending = students.filter(s => s.entry_id === null).length;

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  // Print helpers
  const toPrintStudent = (s: Student) => ({
    full_name: s.full_name, class_name: s.class_name, coach_name: s.coach_name,
    period_label: s.period_label ?? "—", scores: s.scores, notes: s.notes, criteria: s.criteria,
  });

  const handlePrintAll = () => printSchoolRekap(schoolName, activePeriod?.label ?? "—", students.map(toPrintStudent));
  const handlePrintOne = (s: Student) => printSingleRapor(toPrintStudent(s));
  const handlePrintSelected = () => {
    const targets = students.filter(s => selected.has(s.id) && s.entry_id !== null);
    if (targets.length === 0) return;
    if (targets.length === 1) { printSingleRapor(toPrintStudent(targets[0])); return; }
    printSchoolRekap(schoolName, activePeriod?.label ?? "—", targets.map(toPrintStudent));
  };
  const handlePrintFiltered = () => {
    const targets = filteredSorted.filter(s => s.entry_id !== null);
    if (targets.length === 0) return;
    printSchoolRekap(schoolName, activePeriod?.label ?? "—", targets.map(toPrintStudent));
  };

  return (
    <div className="min-h-screen bg-paper-tint">
      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 lg:px-7 h-16 flex items-center gap-3">
          <Link href="/"><Logo size={32} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">School Panel</h1>
            <p className="text-xs text-ink-mute truncate">{schoolName}</p>
          </div>
          <Bell userId={userId} />
          <Avatar name={schoolName} size={36} />
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-danger-600 px-3 py-2 rounded-lg transition"
            title="Logout"
          >
            <Icon name="logout" className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-7 space-y-5">
        {/* Hero */}
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="caustics absolute inset-0 opacity-30" />
          <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-wave-500/30 blur-3xl" />
          <div className="relative grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> Periode rapor aktif
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl mt-1.5">
                {activePeriod?.label ?? "Belum ada periode aktif"}
              </h2>
              {activePeriod && (
                <p className="text-white/70 mt-1.5 text-sm max-w-lg">
                  Berlaku {activePeriod.date_from} – {activePeriod.date_to}
                </p>
              )}
              {totalDone > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handlePrintAll}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                  >
                    <Icon name="print" className="w-4 h-4" />
                    Cetak semua ({totalDone})
                  </button>
                  {(search || activeFilterCount > 0) && filteredSorted.filter(s => s.entry_id).length > 0 && filteredSorted.length < students.length && (
                    <button
                      onClick={handlePrintFiltered}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 text-white/90 text-sm font-semibold px-4 py-2 rounded-xl transition"
                    >
                      <Icon name="print" className="w-4 h-4" />
                      Cetak hasil filter ({filteredSorted.filter(s => s.entry_id).length})
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Total siswa</div>
                <div className="font-display font-bold text-2xl mt-0.5">{students.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Rapor tersedia</div>
                <div className="font-display font-bold text-2xl mt-0.5 text-ok-300">{totalDone}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Belum diisi</div>
                <div className="font-display font-bold text-2xl mt-0.5 text-warn-300">{totalPending}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Students table card */}
        <Card padded={false}>
          {/* Toolbar */}
          <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle sub={`${students.length} siswa terdaftar`}>Siswa Afiliasi</SectionTitle>
              {/* Bulk select mode toggle */}
              {!selectMode ? (
                <div className="flex items-center gap-2">
                  {totalDone > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSelectMode(true); setSelected(new Set()); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-white text-ink-soft hover:border-ocean-400 transition"
                    >
                      <Icon name="check" className="w-3.5 h-3.5" />
                      Pilih & Cetak
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink-soft">{selected.size} dipilih</span>
                  <button type="button" onClick={() => setSelected(new Set(filteredSorted.filter(s => s.entry_id).map(s => s.id)))}
                    className="text-xs font-semibold text-ocean-600 hover:underline">Pilih semua ({filteredSorted.filter(s => s.entry_id).length})</button>
                  <button type="button" onClick={() => setSelected(new Set())}
                    className="text-xs font-semibold text-ink-mute hover:underline">Batal pilih</button>
                  <Btn variant="primary" size="sm" icon="print" disabled={selected.size === 0} onClick={handlePrintSelected}>
                    Cetak ({selected.size})
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>Selesai</Btn>
                </div>
              )}
            </div>

            {/* Search + sort + filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-500/10 transition">
                <Icon name="search" className="w-4 h-4 text-ink-faint shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama, kelas, atau coach…"
                  className="flex-1 text-sm outline-none bg-transparent min-w-0"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-ink-mute hover:text-ink transition shrink-0">
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <select
                value={`${sortBy}:${sortDir}`}
                onChange={e => { const [col, dir] = e.target.value.split(":"); setSortBy(col); setSortDir(dir as "asc" | "desc"); }}
                className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none cursor-pointer hover:border-ocean-400 transition"
              >
                <option value="name:asc">Nama A–Z</option>
                <option value="name:desc">Nama Z–A</option>
                <option value="class:asc">Kelas A–Z</option>
                <option value="coach:asc">Coach A–Z</option>
                <option value="status:desc">Rapor tersedia dulu</option>
                <option value="status:asc">Belum diisi dulu</option>
              </select>

              {/* Filter toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
              >
                <Icon name="settings" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="bg-paper-tint border border-line rounded-xl p-4 grid sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">Kelas</div>
                  <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">Semua Kelas</option>
                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">Coach</div>
                  <select value={filterCoach} onChange={e => setFilterCoach(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">Semua Coach</option>
                    {coachList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">Status Rapor</div>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">Semua</option>
                    <option value="done">Tersedia</option>
                    <option value="pending">Belum diisi</option>
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="sm:col-span-3 flex justify-end pt-1">
                    <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">Reset semua filter</button>
                  </div>
                )}
              </div>
            )}

            {/* Active filter pills */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {filterClass && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                    {filterClass}
                    <button type="button" onClick={() => setFilterClass("")}><Icon name="x" className="w-3 h-3" /></button>
                  </span>
                )}
                {filterCoach && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                    {filterCoach}
                    <button type="button" onClick={() => setFilterCoach("")}><Icon name="x" className="w-3 h-3" /></button>
                  </span>
                )}
                {filterStatus && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                    {filterStatus === "done" ? "Rapor tersedia" : "Belum diisi"}
                    <button type="button" onClick={() => setFilterStatus("")}><Icon name="x" className="w-3 h-3" /></button>
                  </span>
                )}
                <button type="button" onClick={resetFilters} className="text-xs text-ink-mute hover:text-danger-600 transition ml-1">Hapus semua</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-ink-mute">Memuat data…</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                      {selectMode && <th className="w-10 py-3 pl-4">
                        <input
                          type="checkbox"
                          className="rounded border-line accent-ocean-600"
                          checked={filteredSorted.filter(s => s.entry_id).length > 0 && filteredSorted.filter(s => s.entry_id).every(s => selected.has(s.id))}
                          onChange={e => setSelected(e.target.checked ? new Set(filteredSorted.filter(s => s.entry_id).map(s => s.id)) : new Set())}
                        />
                      </th>}
                      <th className="text-left py-3 px-5 font-bold cursor-pointer select-none group" onClick={() => toggleSort("name")}>
                        Siswa <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("class")}>
                        Kelas <SortIcon col="class" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("coach")}>
                        Coach <SortIcon col="coach" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("status")}>
                        Status Rapor <SortIcon col="status" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-right py-3 px-5 font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginated.map(s => {
                      const isChecked = selected.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-paper-tint transition-colors ${selectMode && s.entry_id ? "cursor-pointer" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                          onClick={() => {
                            if (!selectMode || !s.entry_id) return;
                            setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                          }}
                        >
                          {selectMode && (
                            <td className="pl-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-line accent-ocean-600"
                                disabled={!s.entry_id}
                                checked={isChecked}
                                onChange={() => setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}
                              />
                            </td>
                          )}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.full_name} size={36} />
                              <div className="font-semibold text-ink">{s.full_name}</div>
                            </div>
                          </td>
                          <td className="text-ink-soft text-sm">{s.class_name}</td>
                          <td className="text-ink-soft text-sm">{s.coach_name}</td>
                          <td>{s.entry_id ? <Status kind="approved">Tersedia</Status> : <Status kind="pending">Belum diisi</Status>}</td>
                          <td className="text-right px-5">
                            <div className="inline-flex gap-1.5">
                              <Btn variant="soft" size="sm" icon="eye" disabled={!s.entry_id} onClick={() => setOpen(s)}>Lihat</Btn>
                              <Btn variant="ghost" size="sm" icon="print" disabled={!s.entry_id} onClick={() => handlePrintOne(s)}>Cetak</Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSorted.length === 0 && (
                      <tr>
                        <td colSpan={selectMode ? 6 : 5} className="py-14 text-center">
                          <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                          <div className="text-sm font-semibold text-ink-mute">Tidak ada siswa yang cocok</div>
                          {(search || activeFilterCount > 0) && (
                            <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">Hapus semua filter</button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-line">
                {paginated.map(s => {
                  const isChecked = selected.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`px-4 py-3.5 flex items-center gap-3 ${selectMode && s.entry_id ? "cursor-pointer active:bg-paper-tint" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                      onClick={() => {
                        if (!selectMode || !s.entry_id) return;
                        setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                      }}
                    >
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="rounded border-line accent-ocean-600 shrink-0"
                          disabled={!s.entry_id}
                          checked={isChecked}
                          onChange={() => setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                      <Avatar name={s.full_name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">{s.full_name}</div>
                        <div className="text-xs text-ink-mute truncate">{s.class_name} · {s.coach_name}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {s.entry_id ? <Status kind="approved">Tersedia</Status> : <Status kind="pending">Belum</Status>}
                        {s.entry_id && !selectMode && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setOpen(s)}
                              className="p-1.5 rounded-lg bg-ocean-50 text-ocean-600 hover:bg-ocean-100 transition"
                            >
                              <Icon name="eye" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintOne(s)}
                              className="p-1.5 rounded-lg bg-paper-tint text-ink-mute hover:bg-paper-deep transition"
                            >
                              <Icon name="print" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSorted.length === 0 && (
                  <div className="py-14 text-center">
                    <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                    <div className="text-sm font-semibold text-ink-mute">Tidak ada siswa yang cocok</div>
                    {(search || activeFilterCount > 0) && (
                      <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">Hapus semua filter</button>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 sm:px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-ink-mute tabular-nums">
                    {filteredSorted.length} siswa · halaman {safePage + 1} dari {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                      className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
                    <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition hidden sm:inline-flex">‹ Sebelumnya</button>
                    {Array.from({ length: totalPages }, (_, i) => i)
                      .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                      .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                        if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                        acc.push(i);
                        return acc;
                      }, [])
                      .map((item, idx) => item === "…"
                        ? <span key={`e${idx}`} className="px-2 text-ink-faint text-sm">…</span>
                        : <button key={item} type="button" onClick={() => setPage(item as number)}
                            className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${safePage === item ? "bg-ocean-600 text-white" : "border border-line text-ink-mute hover:bg-paper-tint"}`}>{(item as number) + 1}</button>
                      )
                    }
                    <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition hidden sm:inline-flex">Berikutnya ›</button>
                    <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                      className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Info card */}
        <Card className="bg-wave-50 border-wave-100">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-700 flex items-center justify-center shrink-0">
              <Icon name="info" className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display font-bold text-ink">Catatan untuk Sekolah</div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                School Panel hanya menampilkan data rapor siswa. Untuk pertanyaan tentang biaya, jadwal, atau penambahan siswa baru, silakan menghubungi admin cabang Next Swimming School.
              </p>
              <a
                href={adminWaPhone
                  ? `https://wa.me/62${adminWaPhone.replace(/^0/, "")}?text=${encodeURIComponent(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}`
                  : waLink(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex"
              >
                <Btn variant="wa" size="sm" icon="whatsapp">Hubungi admin cabang</Btn>
              </a>
            </div>
          </div>
        </Card>
      </main>

      {/* Rapor detail modal */}
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`Rapor — ${open?.full_name ?? ""}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Btn variant="ghost" icon="print" onClick={() => open && handlePrintOne(open)}>Cetak / PDF</Btn>
            <Btn variant="primary" onClick={() => setOpen(null)}>Tutup</Btn>
          </div>
        }
      >
        {open && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="flex items-center gap-3">
                <Avatar name={open.full_name} size={42} />
                <div>
                  <div className="font-semibold text-ink">{open.full_name}</div>
                  <div className="text-xs text-ink-mute">{open.class_name} · {open.coach_name} · {open.period_label}</div>
                </div>
              </div>
            </Card>
            <div className="space-y-3">
              {open.criteria.length > 0
                ? open.criteria.map(c => {
                    const val = open.scores[c.id];
                    if (val == null) return null;
                    const numVal = typeof val === "number" ? val : null;
                    const strVal = typeof val === "string" ? val : null;
                    const max = c.kind === "score_10" ? 10 : c.kind === "score_100" ? 100 : null;
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-ink">{c.label}</span>
                          {numVal != null && max && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                        </div>
                        {numVal != null && max && (
                          <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                            <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                          </div>
                        )}
                        {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                      </div>
                    );
                  })
                : Object.entries(open.scores).map(([key, val]) => {
                    const numVal = typeof val === "number" ? val : null;
                    const strVal = typeof val === "string" ? val : null;
                    const max = numVal !== null && numVal <= 10 ? 10 : 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-ink capitalize">{key.replace(/_/g, " ")}</span>
                          {numVal != null && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                        </div>
                        {numVal != null && (
                          <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                            <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                          </div>
                        )}
                        {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                      </div>
                    );
                  })
              }
              {open.notes && (
                <div>
                  <div className="font-semibold text-ink text-sm mb-1">Catatan coach</div>
                  <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed">{open.notes}</p>
                </div>
              )}
              {Object.keys(open.scores).length === 0 && !open.notes && (
                <div className="text-center py-6 text-sm text-ink-mute">Coach belum mengisi nilai untuk periode ini.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
