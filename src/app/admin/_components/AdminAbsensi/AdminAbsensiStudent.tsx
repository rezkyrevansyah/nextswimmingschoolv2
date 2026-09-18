"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Btn from "@/components/ui/Btn";
import { Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { StudentAttendanceRow } from "../../_types";
import { fmtDate } from "@/lib/utils";
import { studentStatusKind, studentDbToUi } from "@/lib/attendance";

export default function AdminAbsensiStudent({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const localeTag = "en-US";
  const PAGE_SIZE = 30;

  const today = new Date().toISOString().split("T")[0];
  const defaultMonth = today.slice(0, 7);

  const [records, setRecords] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState(defaultMonth);
  const [filterName, setFilterName] = useState("");

  // Build 12-month dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString(localeTag, { month: "long", year: "numeric" });
    return { value, label };
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Load class list for filter
    supabase.from("classes").select("id, name").eq("branch_id", branchId).eq("status", "active")
      .order("name").then(({ data }) => { if (data) setClasses(data as { id: string; name: string }[]); });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadRecords = useCallback(async (pg: number, append = false) => {
    setLoading(true);
    const dateFrom = `${filterMonth}-01`;
    const dateTo = new Date(Number(filterMonth.slice(0, 4)), Number(filterMonth.slice(5, 7)), 0)
      .toISOString().split("T")[0];

    // student_attendances has no branch_id — scope via class_id
    let classIds: string[] = [];
    if (filterClass === "all") {
      const { data: cls } = await supabase.from("classes").select("id").eq("branch_id", branchId);
      classIds = (cls ?? []).map((c: { id: string }) => c.id);
    } else {
      classIds = [filterClass];
    }

    if (classIds.length === 0) { setRecords([]); setHasMore(false); setLoading(false); return; }

    let q = supabase.from("student_attendances")
      .select("id, student_id, class_id, session_date, status, method, student:students(profile:profiles(full_name)), class:classes(name)")
      .in("class_id", classIds)
      .gte("session_date", dateFrom)
      .lte("session_date", dateTo)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1);

    if (filterStatus !== "all") q = q.eq("status", filterStatus as "hadir" | "telat" | "izin" | "sakit" | "tidak_hadir");

    const { data } = await q;
    const rows = (data ?? []) as unknown as StudentAttendanceRow[];

    // Client-side name filter
    const filtered = filterName.trim()
      ? rows.filter(r => r.student?.profile?.full_name?.toLowerCase().includes(filterName.trim().toLowerCase()))
      : rows;

    if (append) {
      setRecords(prev => [...prev, ...filtered]);
    } else {
      setRecords(filtered);
    }
    setHasMore(rows.length > PAGE_SIZE);
    setLoading(false);
  }, [branchId, filterClass, filterStatus, filterMonth, filterName]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPage(0);
    loadRecords(0, false);
    // Realtime: any change to student attendance → refresh (mirrors AdminDashboard.tsx's
    // live_att channel). Merged into this effect so the channel is torn down and
    // recreated whenever loadRecords' own deps change, avoiding a stale closure.
    const channel = supabase.channel(`live_student_att:${branchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_attendances" }, () => loadRecords(0, false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadRecords(next, true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">{"All Classes"}</option>
          {classes.map(c => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
        </Select>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">{"All Statuses"}</option>
          <option value="hadir">{"Present"}</option>
          <option value="telat">{"Late"}</option>
          <option value="izin">{"Excused"}</option>
          <option value="sakit">{"Sick"}</option>
          <option value="tidak_hadir">{"Absent"}</option>
        </Select>
        <Input placeholder={"Search student name…"} value={filterName} onChange={e => setFilterName(e.target.value)} />
      </div>

      <Card padded={false}>
        {loading && records.length === 0 ? (
          <div className="p-10 text-center text-ink-mute">{"Loading data…"}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                    <th className="text-left py-3 px-5 font-bold">{"Date"}</th>
                    <th className="text-left py-3 font-bold">{"Student"}</th>
                    <th className="text-left py-3 font-bold">{"Class"}</th>
                    <th className="text-left py-3 font-bold">{"Status"}</th>
                    <th className="text-left py-3 pr-5 font-bold hidden sm:table-cell">{"Method"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-paper-tint">
                      <td className="py-3 px-5 font-mono whitespace-nowrap text-ink-soft">{fmtDate(r.session_date)}</td>
                      <td className="py-3 font-semibold text-ink"><NoTranslate>{r.student?.profile?.full_name ?? "—"}</NoTranslate></td>
                      <td className="py-3 text-ink-soft"><NoTranslate>{r.class?.name ?? "—"}</NoTranslate></td>
                      <td className="py-3">
                        {(() => {
                          const ui = studentDbToUi(r.status);
                          const kind = studentStatusKind(r.status);
                          const label = ui === "present" ? "Present"
                            : ui === "late" ? "Late"
                            : ui === "izin" ? "Excused"
                            : ui === "sick" ? "Sick"
                            : "Absent";
                          return <Status kind={kind} dot={false}>{label}</Status>;
                        })()}
                      </td>
                      <td className="py-3 pr-5 hidden sm:table-cell text-ink-mute capitalize">
                        {r.method === "manual" ? "Manual" : r.method === "qr" ? "QR Scan" : r.method ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && !loading && (
                    <tr><td colSpan={5} className="py-10 text-center text-ink-mute">{"No attendance data."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="px-5 py-3 border-t border-line">
                <Btn variant="ghost" onClick={loadMore} disabled={loading} className="w-full">
                  {loading ? "Loading…" : "Show more"}
                </Btn>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
