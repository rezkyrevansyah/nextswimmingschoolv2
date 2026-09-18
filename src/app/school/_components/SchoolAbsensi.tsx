"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import { Card, SectionTitle } from "@/components/ui/Card";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { isMemberPresentLike, memberDbToUi, memberStatusKind } from "@/lib/attendance";
import { createClient } from "@/utils/supabase/client";

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

export default function SchoolAbsensi({ schoolId, schoolName, members }: {
  schoolId: string;
  schoolName: string;
  members: { id: string; name: string; school_grade: string | null; class_name: string }[];
}) {
  const supabase = createClient();
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
      case "present": return "Present";
      case "izin": return "Leave";
      case "sick": return "Sick";
      case "absent": return "Absent";
      case "late": return "Late";
      default: return status;
    }
  };

  const getMethodLabel = (method: string | null) => {
    if (!method) return "—";
    switch (method) {
      case "qr": return "QR Scan";
      case "selfie": return "Selfie";
      case "manual": return "Manual";
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
        "Student",
        "School Grade",
        "Class",
        ...dates,
        "Present",
        "Late",
        "Absent",
        "Sick",
        "Leave",
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
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{"Practice Dates"}</div>
          <div className="font-display font-bold text-2xl text-ink">{statsDates}</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{"Present (Total)"}</div>
          <div className="font-display font-bold text-2xl text-ok-600">{statsHadir}</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{"Leave / Sick"}</div>
          <div className="font-display font-bold text-2xl text-warn-600">{statsIzinSakit}</div>
        </div>
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{"Absent"}</div>
          <div className="font-display font-bold text-2xl text-danger-600">{statsTidakHadir}</div>
        </div>
      </div>

      {/* Filter panel */}
      <Card padded={false}>
        <div className="p-4 sm:p-5 border-b border-line space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle sub={`Monitoring and attendance history for ${schoolName} students.`}>
              {"Student Attendance Recap"}
            </SectionTitle>
            <Btn
              variant="outline"
              size="sm"
              icon="download"
              disabled={members.length === 0 || downloading}
              onClick={downloadExcel}
            >
              {downloading ? "Exporting…" : "Export Excel (.xlsx)"}
            </Btn>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-ink-mute mr-1">{"Filter"}:</span>
            {(["week", "month", "3month"] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-line bg-white hover:border-ocean-400 hover:text-ocean-700 transition"
              >
                {p === "week" ? "1 Week" : p === "month" ? "1 Month" : "3 Months"}
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{"From Date"}</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{"To Date"}</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{"All Students"}</label>
              <select
                value={filterMember}
                onChange={e => setFilterMember(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400"
              >
                <option value="all">{"All Students"}</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} translate="no">{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-ink-faint block mb-1">{"All Status"}</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-ocean-400"
              >
                <option value="all">{"All Status"}</option>
                <option value="hadir">{"Present"}</option>
                <option value="izin">{"Leave"}</option>
                <option value="sakit">{"Sick"}</option>
                <option value="tidak_hadir">{"Absent"}</option>
                <option value="telat">{"Late"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">{"Date"}</th>
                <th className="text-left py-3 px-4 font-bold">{"Student"}</th>
                <th className="text-left py-3 px-4 font-bold">{"School Grade"}</th>
                <th className="text-left py-3 px-4 font-bold">{"Class"}</th>
                <th className="text-left py-3 px-4 font-bold">{"Status"}</th>
                <th className="text-left py-3 px-5 font-bold">{"Method"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginated.map(r => (
                <tr key={r.id} className="hover:bg-paper-tint transition-colors">
                  <td className="py-3 px-5 font-mono text-xs text-ink-soft">{r.session_date}</td>
                  <td className="py-3 px-4 font-semibold text-ink"><NoTranslate>{r.member_name}</NoTranslate></td>
                  <td className="py-3 px-4 text-ink-soft text-xs"><NoTranslate>{r.school_grade ?? "—"}</NoTranslate></td>
                  <td className="py-3 px-4 text-ink-soft text-xs"><NoTranslate>{r.class_name}</NoTranslate></td>
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
                    {"No student attendance records found in this period."}
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
              <div className="font-semibold text-sm text-ink"><NoTranslate>{r.member_name}</NoTranslate></div>
              {r.school_grade && <div className="text-xs text-ink-mute"><NoTranslate>{r.school_grade}</NoTranslate></div>}
              <div className="flex items-center justify-between text-xs text-ink-mute pt-1 border-t border-line/60">
                <span><NoTranslate>{r.class_name}</NoTranslate></span>
                <span className="font-mono text-[11px] bg-paper-tint px-2 py-0.5 rounded">{getMethodLabel(r.method)}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-ink-mute text-sm">
              {"No student attendance records found in this period."}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-ink-mute">
              {`Page ${safePage + 1} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
              >
                ‹ {"Previous"}
              </button>
              <button
                type="button"
                disabled={safePage === totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
              >
                {"Next"} ›
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
