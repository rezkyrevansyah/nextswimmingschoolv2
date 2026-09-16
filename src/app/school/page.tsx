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
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import Status from "@/components/ui/Status";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Bell from "@/components/layout/Bell";
import { resolveRaporSigner, buildSchoolRaporSignatures, type SchoolForSignerConfig } from "@/lib/rapor";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { waLink } from "@/lib/utils";
import { isMemberPresentLike, memberDbToUi, memberStatusKind } from "@/lib/attendance";
import { downloadRaporPdf, printSingleRaporPopup, type PrintCriterion, type PrintBestTime, type PrintSignatureItem } from "@/lib/printRapor";
import { downloadRaporZip } from "@/lib/downloadRaporZip";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";

type Criterion = PrintCriterion;

// ── Absensi ────────────────────────────────────────────────────────────────────

interface SchoolAttRow {
  id: string;
  member_id: string;
  member_name: string;
  school_grade: string | null;
  class_id: string;
  class_name: string;
  session_date: string;
  status: "hadir" | "izin" | "sakit" | "tidak_hadir" | "telat";
  method: "selfie" | "qr" | "manual" | null;
}

const ATT_PAGE_SIZE = 20;

function SchoolAbsensi({ schoolId, schoolName, members }: {
  schoolId: string;
  schoolName: string;
  members: { id: string; name: string; school_grade: string | null; class_name: string }[];
}) {
  const supabase = createClient();
  const { t } = useLocale();
  const today = new Date().toISOString().split("T")[0];
  const defaultFrom = today.slice(0, 7) + "-01"; // first day of current month

  const [rows, setRows] = useState<SchoolAttRow[]>([]);
  const [, setLoading] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState(defaultFrom);
  const [filterDateTo, setFilterDateTo] = useState(today);
  const [filterMember, setFilterMember] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (members.length === 0) { setRows([]); return; }
    setLoading(true);
    const memberIds = members.map(m => m.id);
    // Paginated fetch — no arbitrary row cap, so a wide date range × many
    // students can't silently truncate the data this export is built from.
    const BATCH = 1000;
    let offset = 0;
    const allData: unknown[] = [];
    while (true) {
      const { data: batch } = await supabase
        .from("member_attendances")
        .select("id, member_id, class_id, session_date, status, method, member:members(profile:profiles(full_name)), class:classes(name)")
        .in("member_id", memberIds)
        .gte("session_date", filterDateFrom)
        .lte("session_date", filterDateTo)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + BATCH - 1);
      if (!batch || batch.length === 0) break;
      allData.push(...batch);
      if (batch.length < BATCH) break;
      offset += BATCH;
    }
    const data = allData;
    const mapped: SchoolAttRow[] = (data ?? []).map((r) => {
      const raw = r as unknown as {
        id: string; member_id: string; class_id: string; session_date: string;
        status: SchoolAttRow["status"]; method: SchoolAttRow["method"];
        member: { profile: { full_name: string } | null } | null;
        class: { name: string } | null;
      };
      return {
        id: raw.id,
        member_id: raw.member_id,
        member_name: raw.member?.profile?.full_name ?? members.find(m => m.id === raw.member_id)?.name ?? "—",
        school_grade: members.find(m => m.id === raw.member_id)?.school_grade ?? null,
        class_id: raw.class_id,
        class_name: raw.class?.name ?? "—",
        session_date: raw.session_date,
        status: raw.status,
        method: raw.method,
      };
    });
    setRows(mapped);
    setLoading(false);
    setPage(0);
  }, [members, filterDateFrom, filterDateTo, supabase]);

  useEffect(() => { load(); }, [load]);

  // Quick preset helpers
  const applyPreset = (preset: "week" | "month" | "3month") => {
    const d = new Date();
    if (preset === "week") {
      const dow = d.getDay(); // 0=Sun
      const diff = dow === 0 ? 6 : dow - 1;
      const mon = new Date(d); mon.setDate(d.getDate() - diff);
      setFilterDateFrom(mon.toISOString().slice(0, 10));
      setFilterDateTo(today);
    } else if (preset === "month") {
      setFilterDateFrom(today.slice(0, 7) + "-01");
      setFilterDateTo(today);
    } else {
      const from = new Date(d); from.setMonth(d.getMonth() - 2); from.setDate(1);
      setFilterDateFrom(from.toISOString().slice(0, 10));
      setFilterDateTo(today);
    }
  };

  // Client-side filter by member & status (server already filters by date + members)
  const filtered = useMemo(() => {
    let r = rows;
    if (filterMember !== "all") r = r.filter(a => a.member_id === filterMember);
    if (filterStatus !== "all") r = r.filter(a => a.status === filterStatus);
    return r;
  }, [rows, filterMember, filterStatus]);

  // Stats — computed from date-filtered rows (before member/status filter)
  const statsHadir     = rows.filter(r => isMemberPresentLike(r.status)).length;
  const statsTidakHadir = rows.filter(r => memberDbToUi(r.status) === "absent").length;
  const statsIzinSakit  = rows.filter(r => {
    const ui = memberDbToUi(r.status);
    return ui === "izin" || ui === "sick";
  }).length;
  const statsDates      = new Set(rows.map(r => r.session_date)).size;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ATT_PAGE_SIZE));
  const safePage   = Math.min(page, Math.max(0, totalPages - 1));
  const paginated  = filtered.slice(safePage * ATT_PAGE_SIZE, (safePage + 1) * ATT_PAGE_SIZE);

  const getStatusLabel = (status: string) => {
    switch (memberDbToUi(status)) {
      case "present": return t("school.absensi.statusHadir");
      case "izin": return t("school.absensi.statusIzin");
      case "sick": return t("school.absensi.statusSakit");
      case "absent": return t("school.absensi.statusTidakHadir");
      case "late": return t("school.absensi.statusTelat");
      default: return status;
    }
  };

  const getMethodLabel = (method: string | null) => {
    if (!method) return "—";
    switch (method) {
      case "qr": return t("school.absensi.methodQr");
      case "selfie": return t("school.absensi.methodSelfie");
      case "manual": return t("school.absensi.methodManual");
      default: return method;
    }
  };

  const downloadExcel = async () => {
    const targetMembers = filterMember === "all" ? members : members.filter(m => m.id === filterMember);
    if (targetMembers.length === 0) return;
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");

      // Per-member date → status lookup, built from every attendance row in
      // the selected date range (independent of the per-record filterStatus
      // dropdown, which doesn't map cleanly onto a per-student summary row).
      const byMember = new Map<string, Map<string, SchoolAttRow["status"]>>();
      for (const r of rows) {
        if (!byMember.has(r.member_id)) byMember.set(r.member_id, new Map());
        byMember.get(r.member_id)!.set(r.session_date, r.status);
      }

      // Every calendar date in the selected range, inclusive — same column
      // set for every student, regardless of which days their class met.
      const dates: string[] = [];
      const cursor = new Date(filterDateFrom + "T00:00:00");
      const end = new Date(filterDateTo + "T00:00:00");
      while (cursor <= end) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }

      const header = [
        t("school.absensi.colStudent"),
        t("school.absensi.colSchoolGrade"),
        t("school.absensi.colClass"),
        ...dates,
        t("school.absensi.statusHadir"),
        t("school.absensi.statusTelat"),
        t("school.absensi.statusTidakHadir"),
        t("school.absensi.statusSakit"),
        t("school.absensi.statusIzin"),
      ];

      const dataRows = targetMembers.map(m => {
        const memberDates = byMember.get(m.id);
        let present = 0, late = 0, absent = 0, sick = 0, izin = 0;
        const dateCells = dates.map(date => {
          const status = memberDates?.get(date);
          if (!status) return "-";
          switch (memberDbToUi(status)) {
            case "present": present++; break;
            case "late": late++; break;
            case "absent": absent++; break;
            case "sick": sick++; break;
            case "izin": izin++; break;
          }
          return getStatusLabel(status);
        });
        return [m.name, m.school_grade ?? "-", m.class_name ?? "-", ...dateCells, present, late, absent, sick, izin];
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
      ws["!cols"] = [
        { wch: 24 }, { wch: 14 }, { wch: 20 },
        ...dates.map(() => ({ wch: 10 })),
        { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 13 },
      ];
      ws["!freeze"] = { xSplit: 3, ySplit: 1 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Absensi Siswa");
      const safeName = schoolName.replace(/[^a-zA-Z0-9]/g, "-");
      XLSX.writeFile(wb, `Absensi-${safeName}-${filterDateFrom}-sd-${filterDateTo}.xlsx`);
    } catch {
      // silent
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{t("school.absensi.statTotalSessions")}</div>
          <div className="font-display font-bold text-2xl text-ink">{statsDates}</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{t("school.absensi.statPresent")}</div>
          <div className="font-display font-bold text-2xl text-ok-600">{statsHadir}</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{t("school.absensi.statExcusedSick")}</div>
          <div className="font-display font-bold text-2xl text-warn-600">{statsIzinSakit}</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{t("school.absensi.statAbsent")}</div>
          <div className="font-display font-bold text-2xl text-danger-600">{statsTidakHadir}</div>
        </div>
      </div>

      {/* Filter panel */}
      <Card padded={false}>
        <div className="p-4 sm:p-5 border-b border-line space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle sub={t("school.absensi.sub", { school: schoolName })}>
              {t("school.absensi.title")}
            </SectionTitle>
            <Btn
              variant="outline"
              size="sm"
              icon="download"
              disabled={members.length === 0 || downloading}
              onClick={downloadExcel}
            >
              {downloading ? t("school.absensi.exportingExcel") : t("school.absensi.exportExcelBtn")}
            </Btn>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-ink-mute mr-1">{t("common.actions.filter")}:</span>
            {(["week", "month", "3month"] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-line bg-white hover:border-ocean-400 hover:text-ocean-700 transition"
              >
                {p === "week" ? t("school.absensi.presetWeek") : p === "month" ? t("school.absensi.presetMonth") : t("school.absensi.preset3Month")}
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{t("school.absensi.filterFrom")}</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{t("school.absensi.filterTo")}</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{t("school.absensi.filterAllStudents")}</label>
              <select
                value={filterMember}
                onChange={e => setFilterMember(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400"
              >
                <option value="all">{t("school.absensi.filterAllStudents")}</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{t("school.absensi.filterAllStatus")}</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400"
              >
                <option value="all">{t("school.absensi.filterAllStatus")}</option>
                <option value="hadir">{t("school.absensi.statusHadir")}</option>
                <option value="izin">{t("school.absensi.statusIzin")}</option>
                <option value="sakit">{t("school.absensi.statusSakit")}</option>
                <option value="tidak_hadir">{t("school.absensi.statusTidakHadir")}</option>
                <option value="telat">{t("school.absensi.statusTelat")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">{t("school.absensi.colDate")}</th>
                <th className="text-left py-3 px-4 font-bold">{t("school.absensi.colStudent")}</th>
                <th className="text-left py-3 px-4 font-bold">{t("school.absensi.colSchoolGrade")}</th>
                <th className="text-left py-3 px-4 font-bold">{t("school.absensi.colClass")}</th>
                <th className="text-left py-3 px-4 font-bold">{t("school.absensi.colStatus")}</th>
                <th className="text-left py-3 px-5 font-bold">{t("school.absensi.colMethod")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginated.map(r => (
                <tr key={r.id} className="hover:bg-paper-tint transition-colors">
                  <td className="py-3 px-5 font-mono text-xs text-ink-soft">{r.session_date}</td>
                  <td className="py-3 px-4 font-semibold text-ink">{r.member_name}</td>
                  <td className="py-3 px-4 text-ink-soft text-xs">{r.school_grade ?? "—"}</td>
                  <td className="py-3 px-4 text-ink-soft text-xs">{r.class_name}</td>
                  <td className="py-3 px-4">
                    <Status kind={memberStatusKind(r.status)}>
                      {getStatusLabel(r.status)}
                    </Status>
                  </td>
                  <td className="py-3 px-5 text-xs text-ink-mute">{getMethodLabel(r.method)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-mute text-sm">
                    {t("school.absensi.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden divide-y divide-line">
          {paginated.map(r => (
            <div key={r.id} className="p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ink-mute">{r.session_date}</span>
                <Status kind={memberStatusKind(r.status)}>
                  {getStatusLabel(r.status)}
                </Status>
              </div>
              <div className="font-semibold text-sm text-ink">{r.member_name}</div>
              {r.school_grade && <div className="text-xs text-ink-mute">{r.school_grade}</div>}
              <div className="flex items-center justify-between text-xs text-ink-mute pt-1 border-t border-line/60">
                <span>{r.class_name}</span>
                <span className="font-mono text-[11px] bg-paper-tint px-2 py-0.5 rounded">{getMethodLabel(r.method)}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-ink-mute text-sm">
              {t("school.absensi.empty")}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-ink-mute">
              {t("school.absensi.paginationInfo", { page: safePage + 1, total: totalPages })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
              >
                ‹ {t("school.absensi.prevBtn")}
              </button>
              <button
                type="button"
                disabled={safePage === totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
              >
                {t("school.absensi.nextBtn")} ›
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  full_name: string;
  member_no: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  school_grade: string | null;
  class_name: string;
  coach_name: string;
  coach_signature_url: string | null;
  period_id: string | null;
  period_label: string | null;
  entry_id: string | null;
  is_filled: boolean;
  scores: Record<string, number | string>;
  notes: string | null;
  personality: string | null;
  motivation: string | null;
  learning_achievements: string | null;
  level: string | null;
  criteria: Criterion[];
  best_times: PrintBestTime[];
  level_strokes: string[];
  level_distances: number[];
  school_logo_url: string | null;
  signatures?: PrintSignatureItem[];
}

const PAGE_SIZE = 15;

export default function SchoolPage() {
  const supabase = createClient();
  const toast = useToast();
  const { t } = useLocale();
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

  // Download loading states
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const load = useCallback(async (sid: string, pid: string | null, periodLabel: string | null, branch_id: string, schoolConfig?: SchoolForSignerConfig & { logo_url: string | null }) => {
    setLoading(true);

    const { data: memberRows } = await supabase
      .from("members")
      .select("id, profile_id, member_no, school_grade, profile:profiles(full_name, birth_date, avatar_url)")
      .eq("school_id", sid);

    if (!memberRows || memberRows.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const memberIds = memberRows.map(m => m.id);

    const [{ data: mcRows }, { data: entries }, { data: bestTimes }, { data: levelDistances }, { data: levelStrokes }] = await Promise.all([
      supabase
        .from("member_classes")
        .select("member_id, class_id, class:classes(id, name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url)))")
        .in("member_id", memberIds),
      pid
        ? supabase
            .from("rapor_entries")
            .select("id, member_id, class_id, period_id, scores, notes, personality, motivation, learning_achievements, level, level_id, locked, rapor_levels(rapor_level_criteria(id, label, description, kind, options, sort_order))")
            .eq("period_id", pid)
            .in("member_id", memberIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("member_best_times")
        .select("id, member_id, stroke, distance, time_seconds, event_date, is_official")
        .in("member_id", memberIds)
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

    const classByMember = new Map<string, {
      name: string;
      signerCoach: { full_name: string; signature_url: string | null } | null;
    }>();

    type McRow = {
      member_id: string;
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
      classByMember.set(mc.member_id, {
        name: mc.class.name,
        signerCoach: signer,
      });
    });

    type RaporEntryRow = {
      id: string;
      member_id: string;
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

    const entryByMember = new Map<string, RaporEntryRow>();
    (entries as unknown as RaporEntryRow[] ?? []).forEach(e => {
      entryByMember.set(e.member_id, e);
    });

    const btByMember = new Map<string, PrintBestTime[]>();
    (bestTimes ?? []).forEach(bt => {
      const arr = btByMember.get(bt.member_id) ?? [];
      arr.push({ stroke: bt.stroke, distance: bt.distance, time_seconds: bt.time_seconds });
      btByMember.set(bt.member_id, arr);
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

    type MemberProfile = {
      id: string;
      member_no?: string | null;
      school_grade?: string | null;
      profile: {
        full_name: string;
        birth_date?: string | null;
        avatar_url?: string | null;
      } | null;
    };

    const rows: Student[] = (memberRows as unknown as MemberProfile[]).map(m => {
      const cls = classByMember.get(m.id);
      const entry = entryByMember.get(m.id);
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
        member_no: m.member_no ?? null,
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
        best_times: btByMember.get(m.id) ?? [],
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

  // Print helpers
  const toPrintStudent = (s: Student) => ({
    member_id: s.id, period_id: s.period_id ?? undefined,
    full_name: s.full_name, avatar_url: s.avatar_url ?? undefined,
    member_no: s.member_no ?? undefined, birth_date: s.birth_date ?? undefined,
    location: branchName || undefined,
    level: s.level ?? undefined,
    class_name: s.class_name, coach_name: s.coach_name,
    coach_signature_url: s.coach_signature_url,
    school_logo_url: s.school_logo_url,
    signatures: s.signatures,
    period_label: s.period_label ?? "—", scores: s.scores, notes: s.notes,
    personality: s.personality, motivation: s.motivation, learning_achievements: s.learning_achievements,
    criteria: s.criteria, best_times: s.best_times,
    level_strokes: s.level_strokes, level_distances: s.level_distances,
  });

  const downloadZipFor = async (targets: Student[]) => {
    if (targets.length === 0) return;
    setBulkDownloading(true);
    setDownloadProgress({ done: 0, total: targets.length });
    try {
      const zipName = `rapor-${schoolName.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}`;
      const { success, failed } = await downloadRaporZip(
        targets.map(toPrintStudent),
        zipName,
        (done, total) => setDownloadProgress({ done, total })
      );
      if (failed === 0) toast.success(t("school.rapor.zipSuccessToast"));
      else if (success === 0) toast.error(t("school.rapor.zipFailedToast"));
      else toast.error(t("school.rapor.zipPartialToast", { success, failed }));
    } catch {
      toast.error(t("school.rapor.zipFailedToast"));
    } finally {
      setBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handlePrintAll = () => void downloadZipFor(students.filter(s => s.is_filled));
  const handlePrintOne = async (s: Student) => {
    setDownloadingId(s.id);
    try {
      await downloadRaporPdf(toPrintStudent(s));
      toast.success(t("school.rapor.pdfSuccessToast"));
    } catch {
      toast.error(t("school.rapor.pdfFailedToast"));
    } finally {
      setDownloadingId(null);
    }
  };
  const handlePrintSelected = () => void downloadZipFor(students.filter(s => selected.has(s.id) && s.is_filled));
  const handlePrintFiltered = () => void downloadZipFor(filteredSorted.filter(s => s.is_filled));
  const bulkDownloadingLabel = downloadProgress
    ? t("school.rapor.downloadingZipProgress", { done: downloadProgress.done, total: downloadProgress.total })
    : t("school.rapor.downloadingZip");

  return (
    <div className="min-h-screen bg-paper-tint">
      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 lg:px-7 h-16 flex items-center gap-3">
          <Link href="/"><Logo size={32} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">{t("school.shell.brandTitle")}</h1>
            <p className="text-xs text-ink-mute truncate">{schoolName}</p>
          </div>
          <LanguageSwitcher />
          <Bell userId={userId} />
          <Avatar name={schoolName} size={36} />
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-danger-600 px-3 py-2 rounded-lg transition"
            title={t("school.shell.logoutBtn")}
          >
            <Icon name="logout" className="w-4 h-4" />
            <span className="hidden sm:inline">{t("school.shell.logoutBtn")}</span>
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
                <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> {t("school.rapor.activePeriodLabel", { period: "" })}
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl mt-1.5">
                {activePeriod?.label ?? t("school.rapor.noActivePeriodLabel")}
              </h2>
              {activePeriod && (
                <p className="text-white/70 mt-1.5 text-sm max-w-lg">
                  {activePeriod.date_from} – {activePeriod.date_to}
                </p>
              )}
              {totalDone > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handlePrintAll}
                    disabled={bulkDownloading}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                  >
                    <Icon name="download" className="w-4 h-4" />
                    {bulkDownloading ? bulkDownloadingLabel : `${t("school.rapor.downloadAllZipBtn")} (${totalDone})`}
                  </button>
                  {(search || activeFilterCount > 0) && filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.length < students.length && (
                    <button
                      onClick={handlePrintFiltered}
                      disabled={bulkDownloading}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 text-white/90 text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                    >
                      <Icon name="download" className="w-4 h-4" />
                      {bulkDownloading ? bulkDownloadingLabel : `${t("school.rapor.downloadPdfBtn")} (${filteredSorted.filter(s => s.is_filled).length})`}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("school.absensi.colStudent")}</div>
                <div className="font-display font-bold text-2xl mt-0.5">{students.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("school.rapor.statusComplete")}</div>
                <div className="font-display font-bold text-2xl mt-0.5 text-ok-300">{totalDone}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("school.rapor.statusIncomplete")}</div>
                <div className="font-display font-bold text-2xl mt-0.5 text-warn-300">{totalPending}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-line w-full sm:w-fit shadow-xs sticky top-16 z-20">
          <button
            type="button"
            onClick={() => setTab("rapor")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "rapor" ? "bg-ocean-50 shadow-xs text-ocean-700 font-bold" : "text-ink-mute hover:text-ink"}`}
          >
            {t("school.tabs.rapor")}
          </button>
          <button
            type="button"
            onClick={() => setTab("absensi")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "absensi" ? "bg-ocean-50 shadow-xs text-ocean-700 font-bold" : "text-ink-mute hover:text-ink"}`}
          >
            {t("school.tabs.absensi")}
          </button>
        </div>

        {/* Absensi tab */}
        {tab === "absensi" && schoolId && (
          <SchoolAbsensi
            schoolId={schoolId}
            schoolName={schoolName}
            members={students.map(s => ({ id: s.id, name: s.full_name, school_grade: s.school_grade, class_name: s.class_name }))}
          />
        )}

        {/* Rapor tab */}
        {tab === "rapor" && (<Card padded={false}>
          {/* Toolbar */}
          <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle sub={`${students.length} ${t("school.absensi.colStudent").toLowerCase()}`}>{t("school.rapor.title")}</SectionTitle>
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
                      {t("school.rapor.downloadAllZipBtn")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink-soft">{selected.size} dipilih</span>
                  <button type="button" onClick={() => setSelected(new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)))}
                    className="text-xs font-semibold text-ocean-600 hover:underline">Pilih semua ({filteredSorted.filter(s => s.is_filled).length})</button>
                  <button type="button" onClick={() => setSelected(new Set())}
                    className="text-xs font-semibold text-ink-mute hover:underline">{t("common.actions.cancel")}</button>
                  <Btn variant="primary" size="sm" icon="download" disabled={selected.size === 0 || bulkDownloading} onClick={handlePrintSelected}>
                    {bulkDownloading ? bulkDownloadingLabel : `${t("school.rapor.downloadPdfBtn")} (${selected.size})`}
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>{t("common.actions.close")}</Btn>
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
                  placeholder={t("school.rapor.searchPlaceholder")}
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
                <option value="name:asc">{t("school.absensi.colStudent")} A–Z</option>
                <option value="name:desc">{t("school.absensi.colStudent")} Z–A</option>
                <option value="class:asc">{t("school.absensi.colClass")} A–Z</option>
                <option value="coach:asc">{t("school.rapor.colCoach")} A–Z</option>
                <option value="status:desc">{t("school.rapor.statusComplete")}</option>
                <option value="status:asc">{t("school.rapor.statusIncomplete")}</option>
              </select>

              {/* Filter toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
              >
                <Icon name="settings" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("common.actions.filter")}</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="bg-paper-tint border border-line rounded-xl p-4 grid sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("school.absensi.colClass")}</div>
                  <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">{t("school.rapor.filterAllClasses")}</option>
                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("school.rapor.colCoach")}</div>
                  <select value={filterCoach} onChange={e => setFilterCoach(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">{t("school.rapor.filterAllCoaches")}</option>
                    {coachList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("school.rapor.colStatus")}</div>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">{t("school.rapor.filterAllStatus")}</option>
                    <option value="done">{t("school.rapor.statusComplete")}</option>
                    <option value="pending">{t("school.rapor.statusIncomplete")}</option>
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="sm:col-span-3 flex justify-end pt-1">
                    <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">Reset filter</button>
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
                    {filterStatus === "done" ? t("school.rapor.statusComplete") : t("school.rapor.statusIncomplete")}
                    <button type="button" onClick={() => setFilterStatus("")}><Icon name="x" className="w-3 h-3" /></button>
                  </span>
                )}
                <button type="button" onClick={resetFilters} className="text-xs text-ink-mute hover:text-danger-600 transition ml-1">Reset</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-ink-mute">{t("school.shell.loading")}</div>
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
                          checked={filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.filter(s => s.is_filled).every(s => selected.has(s.id))}
                          onChange={e => setSelected(e.target.checked ? new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)) : new Set())}
                        />
                      </th>}
                      <th className="text-left py-3 px-5 font-bold cursor-pointer select-none group" onClick={() => toggleSort("name")}>
                        {t("school.absensi.colStudent")} <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-left py-3 font-bold">
                        {t("school.rapor.colSchoolGrade")}
                      </th>
                      <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("class")}>
                        {t("school.absensi.colClass")} <SortIcon col="class" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("coach")}>
                        {t("school.rapor.colCoach")} <SortIcon col="coach" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("status")}>
                        {t("school.rapor.colStatus")} <SortIcon col="status" sortBy={sortBy} sortDir={sortDir} />
                      </th>
                      <th className="text-right py-3 px-5 font-bold">{t("school.rapor.colAction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginated.map(s => {
                      const isChecked = selected.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-paper-tint transition-colors ${selectMode && s.is_filled ? "cursor-pointer" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                          onClick={() => {
                            if (!selectMode || !s.is_filled) return;
                            setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                          }}
                        >
                          {selectMode && (
                            <td className="pl-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-line accent-ocean-600"
                                disabled={!s.is_filled}
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
                          <td className="text-ink-soft text-sm">{s.school_grade ?? "—"}</td>
                          <td className="text-ink-soft text-sm">{s.class_name}</td>
                          <td className="text-ink-soft text-sm">{s.coach_name}</td>
                          <td>{s.is_filled ? <Status kind="approved">{t("school.rapor.statusComplete")}</Status> : <Status kind="pending">{t("school.rapor.statusIncomplete")}</Status>}</td>
                          <td className="text-right px-5">
                            <div className="inline-flex gap-1.5">
                              <Btn variant="soft" size="sm" icon="eye" disabled={!s.is_filled} onClick={() => setOpen(s)}>{t("common.actions.view")}</Btn>
                              <Btn variant="ghost" size="sm" icon="download" disabled={!s.is_filled || downloadingId === s.id} onClick={() => void handlePrintOne(s)}>
                                {downloadingId === s.id ? "…" : t("school.rapor.downloadPdfBtn")}
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSorted.length === 0 && (
                      <tr>
                        <td colSpan={selectMode ? 7 : 6} className="py-14 text-center">
                          <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                          <div className="text-sm font-semibold text-ink-mute">{t("school.rapor.empty")}</div>
                          {(search || activeFilterCount > 0) && (
                            <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">Reset filter</button>
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
                      className={`px-4 py-3.5 flex items-center gap-3 ${selectMode && s.is_filled ? "cursor-pointer active:bg-paper-tint" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                      onClick={() => {
                        if (!selectMode || !s.is_filled) return;
                        setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                      }}
                    >
                      {selectMode && (
                        <input
                          type="checkbox"
                          className="rounded border-line accent-ocean-600 shrink-0"
                          disabled={!s.is_filled}
                          checked={isChecked}
                          onChange={() => setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                      <Avatar name={s.full_name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">{s.full_name}</div>
                        <div className="text-xs text-ink-mute truncate">
                          {s.school_grade && <>{s.school_grade} · </>}
                          {s.class_name} · {s.coach_name}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {s.is_filled ? <Status kind="approved">{t("school.rapor.statusComplete")}</Status> : <Status kind="pending">{t("school.rapor.statusIncomplete")}</Status>}
                        {s.is_filled && !selectMode && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setOpen(s)}
                              className="h-8 px-2.5 rounded-lg bg-ocean-50 text-ocean-700 hover:bg-ocean-100 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                            >
                              <Icon name="eye" className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handlePrintOne(s)}
                              disabled={downloadingId === s.id}
                              className="h-8 px-2.5 rounded-lg bg-paper-tint text-ink-soft hover:bg-paper-deep text-xs font-semibold flex items-center gap-1 transition active:scale-95 disabled:opacity-60"
                              title={t("school.rapor.downloadPdfBtn")}
                            >
                              <Icon name="download" className="w-3.5 h-3.5" />
                              <span>{downloadingId === s.id ? "…" : "PDF"}</span>
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
                    <div className="text-sm font-semibold text-ink-mute">{t("school.rapor.empty")}</div>
                    {(search || activeFilterCount > 0) && (
                      <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">Reset filter</button>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 sm:px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-ink-mute tabular-nums">
                    {filteredSorted.length} {t("school.absensi.colStudent").toLowerCase()} · {t("school.absensi.paginationInfo", { page: safePage + 1, total: totalPages })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                      className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
                    <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition hidden sm:inline-flex">‹ {t("school.absensi.prevBtn")}</button>
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
                      className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition hidden sm:inline-flex">{t("school.absensi.nextBtn")} ›</button>
                    <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                      className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>)}

        {/* Info card */}
        <Card className="bg-wave-50 border-wave-100">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-700 flex items-center justify-center shrink-0">
              <Icon name="info" className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display font-bold text-ink">{t("school.shell.brandTitle")}</div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                {t("school.rapor.sub", { school: schoolName })}
              </p>
              <a
                href={adminWaPhone
                  ? `https://wa.me/62${adminWaPhone.replace(/^0/, "")}?text=${encodeURIComponent(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}`
                  : waLink(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex"
              >
                <Btn variant="wa" size="sm" icon="whatsapp">{t("school.shell.contactAdminBtn")}</Btn>
              </a>
            </div>
          </div>
        </Card>
      </main>

      {/* Rapor detail modal */}
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={t("school.rapor.studentDetailModalTitle", { name: open?.full_name ?? "" })}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" icon="printer" onClick={() => open && printSingleRaporPopup(toPrintStudent(open))}>{t("school.rapor.printBtn")}</Btn>
            <Btn variant="soft" size="sm" icon="download" disabled={downloadingId === open?.id} onClick={() => open && void handlePrintOne(open)}>
              {downloadingId === open?.id ? "…" : t("school.rapor.downloadPdfBtn")}
            </Btn>
            <Btn variant="primary" onClick={() => setOpen(null)}>{t("common.actions.close")}</Btn>
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
                  <div className="font-semibold text-ink text-sm mb-1">{t("school.rapor.notesSection")}</div>
                  <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed">{open.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="school" />}
    </div>
  );
}
