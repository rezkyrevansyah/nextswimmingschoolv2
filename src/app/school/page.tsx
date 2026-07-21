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
import { resolveRaporSigner } from "@/lib/rapor";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { fmtDate, waLink } from "@/lib/utils";
import { downloadRaporPdf, printSingleRaporPopup, type PrintCriterion, type PrintBestTime } from "@/lib/printRapor";
import { downloadRaporZip } from "@/lib/downloadRaporZip";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";

type Criterion = PrintCriterion;

// ── Absensi ────────────────────────────────────────────────────────────────────

interface SchoolAttRow {
  id: string;
  member_id: string;
  member_name: string;
  class_id: string;
  class_name: string;
  session_date: string;
  status: "hadir" | "izin" | "sakit" | "tidak_hadir" | "telat";
  method: "selfie" | "qr" | "manual" | null;
}

const ATT_STATUS_KIND: Record<string, string> = {
  hadir: "present", izin: "excused", sakit: "sick", tidak_hadir: "absent", telat: "late",
};
const ATT_STATUS_LABEL: Record<string, string> = {
  hadir: "Hadir", izin: "Izin", sakit: "Sakit", tidak_hadir: "Tidak Hadir", telat: "Telat",
};
const METHOD_LABEL: Record<string, string> = { qr: "QR", selfie: "Selfie", manual: "Manual" };

const ATT_PAGE_SIZE = 20;

function SchoolAbsensi({ schoolId, schoolName, members }: {
  schoolId: string;
  schoolName: string;
  members: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const defaultFrom = today.slice(0, 7) + "-01"; // first day of current month

  const [rows, setRows] = useState<SchoolAttRow[]>([]);
  const [loading, setLoading] = useState(false);
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
    let q = supabase
      .from("member_attendances")
      .select("id, member_id, class_id, session_date, status, method, member:members(profile:profiles(full_name)), class:classes(name)")
      .in("member_id", memberIds)
      .gte("session_date", filterDateFrom)
      .lte("session_date", filterDateTo)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);
    const { data } = await q;
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
  }, [members, filterDateFrom, filterDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const statsHadir     = rows.filter(r => r.status === "hadir").length;
  const statsTidakHadir = rows.filter(r => r.status === "tidak_hadir").length;
  const statsIzinSakit  = rows.filter(r => r.status === "izin" || r.status === "sakit").length;
  const statsDates      = new Set(rows.map(r => r.session_date)).size;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ATT_PAGE_SIZE));
  const safePage   = Math.min(page, Math.max(0, totalPages - 1));
  const paginated  = filtered.slice(safePage * ATT_PAGE_SIZE, (safePage + 1) * ATT_PAGE_SIZE);

  const downloadExcel = async () => {
    if (filtered.length === 0) return;
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");
      const sheetRows = filtered.map(r => ({
        "Tanggal": r.session_date,
        "Siswa": r.member_name,
        "Kelas": r.class_name,
        "Status": ATT_STATUS_LABEL[r.status] ?? r.status,
        "Metode": r.method ? (METHOD_LABEL[r.method] ?? r.method) : "—",
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 12 }];
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
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">Total Sesi</div>
          <div className="font-display font-bold text-2xl text-ink">{statsDates}</div>
          <div className="text-xs text-ink-mute mt-0.5">{rows.length} record</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ok-500 mb-1">Hadir</div>
          <div className="font-display font-bold text-2xl text-ok-600">{statsHadir}</div>
          <div className="text-xs text-ink-mute mt-0.5">{rows.length > 0 ? Math.round(statsHadir / rows.length * 100) : 0}% kehadiran</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-danger-500 mb-1">Tidak Hadir</div>
          <div className="font-display font-bold text-2xl text-danger-600">{statsTidakHadir}</div>
          <div className="text-xs text-ink-mute mt-0.5">tanpa keterangan</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-warn-500 mb-1">Izin / Sakit</div>
          <div className="font-display font-bold text-2xl text-warn-600">{statsIzinSakit}</div>
          <div className="text-xs text-ink-mute mt-0.5">dengan keterangan</div>
        </div>
      </div>

      {/* Main table card */}
      <Card padded={false}>
        {/* Toolbar */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle sub={`${filtered.length} record absensi`}>Data Absensi</SectionTitle>
            <button
              type="button"
              disabled={filtered.length === 0 || downloading}
              onClick={downloadExcel}
              className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-xl border border-ocean-300 bg-ocean-50 text-ocean-700 hover:bg-ocean-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Icon name="download" className="w-4 h-4" />
              {downloading ? "Mengunduh…" : "Unduh Excel"}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2">
            {/* Quick presets */}
            <div className="flex gap-1">
              {(["week", "month", "3month"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-line bg-white text-ink-soft hover:border-ocean-400 hover:text-ocean-700 transition"
                >
                  {p === "week" ? "Minggu ini" : p === "month" ? "Bulan ini" : "3 Bulan"}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400 transition"
              />
              <span className="text-xs text-ink-faint">–</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400 transition"
              />
            </div>

            {/* Member filter */}
            <select
              value={filterMember}
              onChange={e => { setFilterMember(e.target.value); setPage(0); }}
              className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-white text-ink-soft outline-none hover:border-ocean-400 transition"
            >
              <option value="all">Semua Siswa</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
              className="text-xs border border-line rounded-lg px-2.5 py-1.5 bg-white text-ink-soft outline-none hover:border-ocean-400 transition"
            >
              <option value="all">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="tidak_hadir">Tidak Hadir</option>
              <option value="telat">Telat</option>
            </select>

            {(filterMember !== "all" || filterStatus !== "all") && (
              <button
                type="button"
                onClick={() => { setFilterMember("all"); setFilterStatus("all"); setPage(0); }}
                className="text-xs font-semibold text-danger-600 hover:underline px-1"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-ink-mute">Memuat data absensi…</div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="users" className="w-9 h-9 text-ink-faint mx-auto mb-3" />
            <div className="text-sm font-semibold text-ink-mute">Belum ada siswa terdaftar</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="calendar" className="w-9 h-9 text-ink-faint mx-auto mb-3" />
            <div className="text-sm font-semibold text-ink-mute">Tidak ada data absensi</div>
            <div className="text-xs text-ink-faint mt-1">Coba ubah rentang tanggal atau hapus filter</div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                    <th className="text-left py-3 px-5 font-bold">Tanggal</th>
                    <th className="text-left py-3 font-bold">Siswa</th>
                    <th className="text-left py-3 font-bold">Kelas</th>
                    <th className="text-left py-3 font-bold">Status</th>
                    <th className="text-left py-3 pr-5 font-bold">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.map(r => (
                    <tr key={r.id} className="hover:bg-paper-tint transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-ink text-sm">{fmtDate(r.session_date)}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.member_name} size={32} />
                          <span className="font-medium text-ink">{r.member_name}</span>
                        </div>
                      </td>
                      <td className="text-ink-soft text-sm">{r.class_name}</td>
                      <td className="py-3.5">
                        <Status kind={ATT_STATUS_KIND[r.status] ?? "pending"} dot={false}>
                          {ATT_STATUS_LABEL[r.status] ?? r.status}
                        </Status>
                      </td>
                      <td className="py-3.5 pr-5 text-ink-mute text-xs">
                        {r.method ? (METHOD_LABEL[r.method] ?? r.method) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-line">
              {paginated.map(r => (
                <div key={r.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="text-center shrink-0 w-12">
                    <div className="font-bold text-sm text-ink leading-tight">{r.session_date.slice(8, 10)}</div>
                    <div className="text-[10px] text-ink-mute uppercase">
                      {new Date(r.session_date + "T00:00:00").toLocaleDateString("id-ID", { month: "short" })}
                    </div>
                  </div>
                  <Avatar name={r.member_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm truncate">{r.member_name}</div>
                    <div className="text-xs text-ink-mute truncate">{r.class_name}</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Status kind={ATT_STATUS_KIND[r.status] ?? "pending"} dot={false}>
                      {ATT_STATUS_LABEL[r.status] ?? r.status}
                    </Status>
                    {r.method && <span className="text-[10px] text-ink-faint">{METHOD_LABEL[r.method] ?? r.method}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 sm:px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-ink-mute tabular-nums">
                  {filtered.length} record · halaman {safePage + 1} dari {totalPages}
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
    </div>
  );
}

// ── Student Rapor ──────────────────────────────────────────────────────────────

interface Student {
  id: string;
  full_name: string;
  member_no: string | null;
  birth_date: string | null;
  avatar_url: string | null;
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
}

type SchoolTab = "rapor" | "absensi";

export default function SchoolPage() {
  const supabase = createClient();
  const toast = useToast();
  const [schoolName, setSchoolName] = useState("School Panel");
  const [schoolId, setSchoolId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState("");
  const [adminWaPhone, setAdminWaPhone] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [activePeriod, setActivePeriod] = useState<{ id: string; label: string; date_from: string; date_to: string } | null>(null);
  const [open, setOpen] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SchoolTab>("rapor");

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const load = useCallback(async (sId: string, pid: string | null, periodLabel: string | null, bId: string) => {
    if (!sId) return;
    const { data } = await supabase
      .from("members")
      .select(`
        id, member_no,
        profile:profiles(full_name, avatar_url, birth_date),
        member_classes(
          classes(
            id, name, rapor_signer_coach_id,
            class_coaches(coach_id, role, profile:profiles(full_name, signature_url)),
            class_criteria(id, label, kind, options, sort_order)
          )
        ),
        rapor_entries(
          id, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id, locked
        )
      `)
      .eq("school_id", sId)
      .eq("type", "school_affiliate");

    if (!data) { setLoading(false); return; }

    // Fetch all best times for these members in one query
    const memberIds = data.map(m => m.id);
    const { data: btRows } = memberIds.length && bId
      ? await supabase.from("member_best_times").select("member_id, stroke, distance, time_seconds").in("member_id", memberIds).eq("branch_id", bId)
      : { data: [] };
    const btByMember = new Map<string, PrintBestTime[]>();
    for (const row of (btRows ?? []) as { member_id: string; stroke: string; distance: number; time_seconds: number }[]) {
      const list = btByMember.get(row.member_id) ?? [];
      list.push({ stroke: row.stroke, distance: row.distance, time_seconds: row.time_seconds });
      btByMember.set(row.member_id, list);
    }

    // Fetch each distinct level's ordered strokes/distances in one batch pair of queries
    const entriesRaw = data.flatMap(m => (m.rapor_entries as unknown as { level_id: string | null; period_id: string }[]) ?? []);
    const levelIds = [...new Set(entriesRaw.filter(e => e.period_id === pid && e.level_id).map(e => e.level_id as string))];
    const [{ data: levelStrokeRows }, { data: levelDistanceRows }] = levelIds.length
      ? await Promise.all([
          supabase.from("rapor_level_strokes").select("level_id, name, sort_order").in("level_id", levelIds).order("sort_order"),
          supabase.from("rapor_level_distances").select("level_id, distance, sort_order").in("level_id", levelIds).order("sort_order"),
        ])
      : [{ data: [] }, { data: [] }];
    const strokesByLevel = new Map<string, string[]>();
    for (const row of (levelStrokeRows ?? []) as { level_id: string; name: string }[]) {
      strokesByLevel.set(row.level_id, [...(strokesByLevel.get(row.level_id) ?? []), row.name]);
    }
    const distancesByLevel = new Map<string, number[]>();
    for (const row of (levelDistanceRows ?? []) as { level_id: string; distance: number }[]) {
      distancesByLevel.set(row.level_id, [...(distancesByLevel.get(row.level_id) ?? []), row.distance]);
    }

    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string; avatar_url: string | null; birth_date: string | null } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[]; class_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const entry = pid
        ? (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; personality: string | null; motivation: string | null; learning_achievements: string | null; level: string | null; level_id: string | null; period_id: string; locked: boolean }[])
          ?.find((e) => e.period_id === pid)
        : undefined;
      const criteria: Criterion[] = [...(cls?.class_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as Criterion["kind"] }));
      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        member_no: (m as unknown as { member_no: string | null }).member_no ?? null,
        birth_date: profile?.birth_date ?? null,
        avatar_url: profile?.avatar_url ?? null,
        class_name: cls?.name ?? "—",
        coach_name: signer?.full_name ?? "—",
        coach_signature_url: signer?.signature_url ?? null,
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
      setSchoolId(school.id);
      setBranchId(school.branch_id);

      const { data: branch } = await supabase.from("branches").select("name, wa_numbers").eq("id", school.branch_id).single();
      const branchRow = branch as unknown as { name: string; wa_numbers: string[] } | null;
      if (branchRow?.name) setBranchName(branchRow.name);
      const waNumbers = branchRow?.wa_numbers;
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
        await load(school.id, period.id, period.label, school.branch_id);
      } else {
        await load(school.id, null, null, school.branch_id);
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
  // Clamp page to valid range (auto-resets to 0 when filter shrinks result set)
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
    full_name: s.full_name, avatar_url: s.avatar_url ?? undefined,
    member_no: s.member_no ?? undefined, birth_date: s.birth_date ?? undefined,
    location: branchName || undefined,
    level: s.level ?? undefined,
    class_name: s.class_name, coach_name: s.coach_name,
    coach_signature_url: s.coach_signature_url,
    period_label: s.period_label ?? "—", scores: s.scores, notes: s.notes,
    personality: s.personality, motivation: s.motivation, learning_achievements: s.learning_achievements,
    criteria: s.criteria, best_times: s.best_times,
    level_strokes: s.level_strokes, level_distances: s.level_distances,
  });

  const downloadZipFor = async (targets: Student[]) => {
    if (targets.length === 0) return;
    setBulkDownloading(true);
    try {
      const zipName = `rapor-${schoolName.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}`;
      const { success, failed } = await downloadRaporZip(targets.map(toPrintStudent), zipName);
      if (failed === 0) toast.success(`${success} rapor berhasil diunduh`);
      else if (success === 0) toast.error("Gagal mengunduh rapor", "Semua rapor gagal diproses, coba lagi.");
      else toast.error(`${success} berhasil, ${failed} gagal`, "Sebagian rapor gagal diproses, coba lagi untuk yang gagal.");
    } catch {
      toast.error("Gagal mengunduh rapor", "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handlePrintAll = () => void downloadZipFor(students.filter(s => s.is_filled));
  const handlePrintOne = async (s: Student) => {
    setDownloadingId(s.id);
    try {
      await downloadRaporPdf(toPrintStudent(s));
    } catch {
      toast.error("Gagal download PDF", "Terjadi kesalahan. Coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  };
  const handlePrintSelected = () => void downloadZipFor(students.filter(s => selected.has(s.id) && s.is_filled));
  const handlePrintFiltered = () => void downloadZipFor(filteredSorted.filter(s => s.is_filled));

  return (
    <div className="min-h-screen bg-paper-tint">
      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 lg:px-7 h-16 flex items-center gap-3">
          <Link href="/"><Logo size={32} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">School Panel</h1>
            <p className="text-xs text-ink-mute truncate">{schoolName}</p>
          </div>
          <LanguageSwitcher />
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
                    disabled={bulkDownloading}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                  >
                    <Icon name="download" className="w-4 h-4" />
                    {bulkDownloading ? "Mengunduh…" : `Download Semua (${totalDone})`}
                  </button>
                  {(search || activeFilterCount > 0) && filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.length < students.length && (
                    <button
                      onClick={handlePrintFiltered}
                      disabled={bulkDownloading}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 text-white/90 text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                    >
                      <Icon name="download" className="w-4 h-4" />
                      {bulkDownloading ? "Mengunduh…" : `Download Hasil Filter (${filteredSorted.filter(s => s.is_filled).length})`}
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

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-paper-tint rounded-xl border border-line w-fit">
          <button
            type="button"
            onClick={() => setTab("rapor")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "rapor" ? "bg-white shadow-card text-ocean-700 font-semibold" : "text-ink-mute hover:text-ink"}`}
          >
            Rapor
          </button>
          <button
            type="button"
            onClick={() => setTab("absensi")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "absensi" ? "bg-white shadow-card text-ocean-700 font-semibold" : "text-ink-mute hover:text-ink"}`}
          >
            Absensi
          </button>
        </div>

        {/* Absensi tab */}
        {tab === "absensi" && schoolId && (
          <SchoolAbsensi
            schoolId={schoolId}
            schoolName={schoolName}
            members={students.map(s => ({ id: s.id, name: s.full_name }))}
          />
        )}

        {/* Rapor tab */}
        {tab === "rapor" && (<Card padded={false}>
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
                      Pilih & Download
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink-soft">{selected.size} dipilih</span>
                  <button type="button" onClick={() => setSelected(new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)))}
                    className="text-xs font-semibold text-ocean-600 hover:underline">Pilih semua ({filteredSorted.filter(s => s.is_filled).length})</button>
                  <button type="button" onClick={() => setSelected(new Set())}
                    className="text-xs font-semibold text-ink-mute hover:underline">Batal pilih</button>
                  <Btn variant="primary" size="sm" icon="download" disabled={selected.size === 0 || bulkDownloading} onClick={handlePrintSelected}>
                    {bulkDownloading ? "Mengunduh…" : `Download PDF (${selected.size})`}
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
                          checked={filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.filter(s => s.is_filled).every(s => selected.has(s.id))}
                          onChange={e => setSelected(e.target.checked ? new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)) : new Set())}
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
                          <td className="text-ink-soft text-sm">{s.class_name}</td>
                          <td className="text-ink-soft text-sm">{s.coach_name}</td>
                          <td>{s.is_filled ? <Status kind="approved">Tersedia</Status> : <Status kind="pending">Belum diisi</Status>}</td>
                          <td className="text-right px-5">
                            <div className="inline-flex gap-1.5">
                              <Btn variant="soft" size="sm" icon="eye" disabled={!s.is_filled} onClick={() => setOpen(s)}>Lihat</Btn>
                              <Btn variant="ghost" size="sm" icon="download" disabled={!s.is_filled || downloadingId === s.id} onClick={() => void handlePrintOne(s)}>
                                {downloadingId === s.id ? "Mengunduh…" : "Download PDF"}
                              </Btn>
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
                        <div className="text-xs text-ink-mute truncate">{s.class_name} · {s.coach_name}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {s.is_filled ? <Status kind="approved">Tersedia</Status> : <Status kind="pending">Belum</Status>}
                        {s.is_filled && !selectMode && (
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
                              onClick={() => void handlePrintOne(s)}
                              disabled={downloadingId === s.id}
                              className="p-1.5 rounded-lg bg-paper-tint text-ink-mute hover:bg-paper-deep transition disabled:opacity-60"
                              title="Download PDF"
                            >
                              <Icon name="download" className="w-3.5 h-3.5" />
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
        </Card>)}

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
            <Btn variant="outline" size="sm" icon="printer" onClick={() => open && printSingleRaporPopup(toPrintStudent(open))}>Print</Btn>
            <Btn variant="soft" size="sm" icon="download" disabled={downloadingId === open?.id} onClick={() => open && void handlePrintOne(open)}>
              {downloadingId === open?.id ? "Mengunduh…" : "Download PDF"}
            </Btn>
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
      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="school" />}
    </div>
  );
}
