"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { fmtDate } from "@/lib/utils";
import { staffStatusKind, staffLeaveTypeToStatus, STAFF_ATTENDANCE_CONFLICT, type StaffDbStatus } from "@/lib/attendance";
import type { Branch } from "../_types";

interface StaffLeaveRow {
  id: string;
  staff_id: string;
  branch_id: string | null;
  type: "izin" | "sakit";
  reason: string | null;
  date_from: string;
  date_to: string;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  staff?: { full_name: string } | null;
}

interface StaffAttendanceRow {
  id: string;
  staff_id: string;
  branch_id: string;
  attendance_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: StaffDbStatus;
  note: string | null;
  selfie_url: string | null;
  staff?: { full_name: string } | null;
}

function SelfieThumb({ selfieKey, onOpen }: { selfieKey: string | null; onOpen: () => void }) {
  const url = useSignedUrl(selfieKey);
  if (!selfieKey) return <span className="text-ink-faint text-xs">—</span>;
  return (
    <button type="button" onClick={onOpen} className="w-9 h-9 rounded-lg overflow-hidden border border-line shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not a static asset
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="skeleton w-full h-full block" />
      )}
    </button>
  );
}

export default function OwnerStaffPresensi({ branches }: { branches: Branch[] }) {
  const supabase = createClient();
  const toast = useToast();
  const typeLabel = (ty: string) => (ty === "sakit" ? "Sick" : "Leave");
  const statusLabel = (s: string) => ({ pending: "Pending", approved: "Approved", rejected: "Rejected" }[s] ?? s);

  const [tab, setTab] = useState<"leave" | "attendance">("leave");
  const [filterBranch, setFilterBranch] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [leaves, setLeaves] = useState<StaffLeaveRow[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<StaffLeaveRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [attendances, setAttendances] = useState<StaffAttendanceRow[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const lightboxUrl = useSignedUrl(lightboxKey);

  const loadLeaves = useCallback(async () => {
    setLoadingLeaves(true);
    let q = supabase.from("staff_leaves")
      .select("id, staff_id, branch_id, type, reason, date_from, date_to, status, reject_reason, staff:profiles!staff_leaves_staff_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    if (filterBranch !== "all") q = q.eq("branch_id", filterBranch);
    const { data } = await q;
    setLeaves((data as unknown as StaffLeaveRow[]) ?? []);
    setLoadingLeaves(false);
  }, [supabase, filterBranch]);

  const loadAttendances = useCallback(async () => {
    setLoadingAtt(true);
    let q = supabase.from("staff_attendances")
      .select("id, staff_id, branch_id, attendance_date, clock_in_time, clock_out_time, status, note, selfie_url, staff:profiles!staff_attendances_staff_id_fkey(full_name)")
      .gte("attendance_date", `${selectedMonth}-01`)
      .lte("attendance_date", `${selectedMonth}-31`)
      .order("attendance_date", { ascending: false });
    if (filterBranch !== "all") q = q.eq("branch_id", filterBranch);
    const { data } = await q;
    setAttendances((data as unknown as StaffAttendanceRow[]) ?? []);
    setLoadingAtt(false);
  }, [supabase, filterBranch, selectedMonth]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  useEffect(() => {
    loadLeaves();
    // Realtime: any change to staff leave requests → refresh (mirrors
    // AdminDashboard.tsx's live_att channel pattern).
    const channel = supabase.channel("live_staff_leaves")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_leaves" }, () => loadLeaves())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLeaves]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAttendances();
    // Realtime: any change to staff attendance → refresh.
    const channel = supabase.channel("live_staff_att")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_attendances" }, () => loadAttendances())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAttendances]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- resets pagination when the tab/filter changes what's paginated */
  useEffect(() => { setPage(0); }, [tab, filterBranch]);

  // One staff_attendances row per calendar day in [date_from, date_to] —
  // mirrors autoCreateStudentAttendances in AdminIzin.tsx, simplified since
  // staff attendance has no per-class/schedule_days concept to filter by.
  const applyStaffLeaveToAttendances = async (leave: StaffLeaveRow) => {
    const status = staffLeaveTypeToStatus(leave.type);
    let branchId = leave.branch_id;
    if (!branchId) {
      const { data: prof } = await supabase.from("profiles").select("branch_id").eq("id", leave.staff_id).single();
      branchId = prof?.branch_id ?? null;
    }
    if (!branchId) return;
    const rows: { staff_id: string; branch_id: string; attendance_date: string; status: StaffDbStatus }[] = [];
    const from = new Date(leave.date_from);
    const to = new Date(leave.date_to);
    const d = new Date(from);
    while (d <= to) {
      rows.push({ staff_id: leave.staff_id, branch_id: branchId, attendance_date: d.toISOString().slice(0, 10), status });
      d.setDate(d.getDate() + 1);
    }
    if (rows.length > 0) await supabase.from("staff_attendances").upsert(rows, { onConflict: STAFF_ATTENDANCE_CONFLICT });
  };

  const decide = async (leave: StaffLeaveRow, status: "approved" | "rejected") => {
    if (status === "rejected") { setRejectTarget(leave); setRejectReason(""); return; }
    const ownerId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await supabase.from("staff_leaves")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: ownerId })
      .eq("id", leave.id);
    if (error) return toast.error("Failed to update status", error.message);
    await applyStaffLeaveToAttendances(leave);
    await supabase.from("notifications").insert({
      user_id: leave.staff_id,
      title: "Leave request approved",
      body: `Your leave request (${fmtDate(leave.date_from)} – ${fmtDate(leave.date_to)}) has been approved.`,
      icon: "check",
      kind: "success",
    });
    toast.success("Leave request approved");
    loadLeaves();
    loadAttendances();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error("A rejection reason is required");
    setRejecting(true);
    const ownerId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await supabase.from("staff_leaves")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: ownerId, reject_reason: rejectReason.trim() })
      .eq("id", rejectTarget.id);
    setRejecting(false);
    if (error) return toast.error("Failed to reject leave request", error.message);
    await supabase.from("notifications").insert({
      user_id: rejectTarget.staff_id,
      title: "Leave request rejected",
      body: `Your leave request (${fmtDate(rejectTarget.date_from)} – ${fmtDate(rejectTarget.date_to)}) was rejected. Reason: ${rejectReason.trim()}`,
      icon: "x",
      kind: "warn",
    });
    toast.success("Leave request rejected");
    setRejectTarget(null);
    loadLeaves();
  };

  const totalPages = Math.max(1, Math.ceil((tab === "leave" ? leaves.length : attendances.length) / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedLeaves = leaves.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const paginatedAtt = attendances.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Notice banner matching pen.dev eoQKX */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-ocean-50 text-ocean-700 text-xs">
        <Icon name="info" className="w-4 h-4 shrink-0 text-ocean-600 mt-0.5" />
        <p className="leading-relaxed">
          No GPS for staff. Distance is never measured here. The selfie is compressed and stored, so a row without a photo means the upload failed, not that the photo was skipped.
        </p>
      </div>

      {/* Toolbar & Filter matching pen.dev vYywC */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {([["leave", "Leave Requests"], ["attendance", "Attendance"]] as const).map(([id, l]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`h-10 px-5 text-sm font-semibold rounded-xl transition-all ${
                tab === id ? "bg-ocean-600 text-white shadow-xs" : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {tab === "attendance" && <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />}
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
          >
            <option value="all">{"All Centers"}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Card Table matching pen.dev NDWu3 / AziAl */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {tab === "leave" ? (
          loadingLeaves ? (
            <div className="p-12 text-center text-ink-mute text-sm">{"Loading data…"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <tr>
                    <th className="py-2 px-5">{"Name"}</th>
                    <th className="py-2 px-5">{"Type"}</th>
                    <th className="py-2 px-5 hidden sm:table-cell">{"Start"}</th>
                    <th className="py-2 px-5 hidden sm:table-cell">{"End"}</th>
                    <th className="py-2 px-5">{"Status"}</th>
                    <th className="py-2 px-5 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedLeaves.map(l => (
                    <tr key={l.id} className="hover:bg-paper-tint/60 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.staff?.full_name ?? "?"} size={32} />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-ink truncate">{l.staff?.full_name ?? "—"}</div>
                            {l.reason && <div className="text-xs text-ink-mute truncate max-w-[200px]">{l.reason}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-ink-soft">{typeLabel(l.type)}</td>
                      <td className="py-3 px-5 text-ink-soft text-xs font-mono hidden sm:table-cell">{fmtDate(l.date_from)}</td>
                      <td className="py-3 px-5 text-ink-soft text-xs font-mono hidden sm:table-cell">{fmtDate(l.date_to)}</td>
                      <td className="py-3 px-5"><Status kind={l.status}>{statusLabel(l.status)}</Status></td>
                      <td className="py-3 px-5 text-right">
                        {l.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Btn variant="ghost" size="sm" className="text-danger-600 hover:bg-danger-50" onClick={() => decide(l, "rejected")}>
                              {"Reject"}
                            </Btn>
                            <Btn variant="soft" size="sm" icon="check" onClick={() => decide(l, "approved")}>
                              {"Approve"}
                            </Btn>
                          </div>
                        ) : l.reject_reason ? (
                          <div className="text-xs text-danger-600 text-right max-w-[200px]">{l.reject_reason}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-mute text-sm">
                        {"No leave requests yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          loadingAtt ? (
            <div className="p-12 text-center text-ink-mute text-sm">{"Loading data…"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <tr>
                    <th className="py-2 px-5">{"Date"}</th>
                    <th className="py-2 px-5">{"Name"}</th>
                    <th className="py-2 px-5 hidden sm:table-cell">{"Clock-in"}</th>
                    <th className="py-2 px-5 hidden sm:table-cell">{"Clock-out"}</th>
                    <th className="py-2 px-5">{"Status"}</th>
                    <th className="py-2 px-5 text-center">{"Selfie"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedAtt.map(a => {
                    const kind = staffStatusKind(a.status);
                    const label = kind === "present" ? "Present" : kind === "excused" ? "Leave" : kind === "sick" ? "Sick" : "Absent";
                    return (
                      <tr key={a.id} className="hover:bg-paper-tint/60 transition-colors">
                        <td className="py-3 px-5 text-ink-soft text-xs font-mono">{fmtDate(a.attendance_date)}</td>
                        <td className="py-3 px-5 font-semibold text-ink text-sm">{a.staff?.full_name ?? "—"}</td>
                        <td className="py-3 px-5 font-mono text-xs text-ink-soft hidden sm:table-cell">{a.clock_in_time ? a.clock_in_time.slice(11, 16) : "—"}</td>
                        <td className="py-3 px-5 font-mono text-xs text-ink-soft hidden sm:table-cell">{a.clock_out_time ? a.clock_out_time.slice(11, 16) : "—"}</td>
                        <td className="py-3 px-5"><Status kind={kind === "present" ? "active" : kind}>{label}</Status></td>
                        <td className="py-3 px-5 text-center"><SelfieThumb selfieKey={a.selfie_url} onOpen={() => setLightboxKey(a.selfie_url)} /></td>
                      </tr>
                    );
                  })}
                  {attendances.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-mute text-sm">
                        {"No attendance records for this month"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {!(tab === "leave" ? loadingLeaves : loadingAtt) && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-line flex items-center justify-between flex-wrap gap-3 bg-paper-tint/30 text-xs text-ink-mute">
            <span className="tabular-nums">
              {`${tab === "leave" ? leaves.length : attendances.length} item · page ${safePage + 1} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(0)} className="px-2.5 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
              <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
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
                      className={`min-w-[32px] py-1 rounded-lg border text-xs transition ${safePage === item ? "bg-ocean-600 border-ocean-600 text-white font-bold" : "border-line bg-paper text-ink-soft hover:bg-paper-tint"}`}>
                      {(item as number) + 1}
                    </button>
                  )
                )}
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)} className="px-2.5 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={"Reject Leave Request"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectTarget(null)}>{"Cancel"}</Btn><Btn variant="danger" onClick={confirmReject} disabled={rejecting}>{rejecting ? "Rejecting…" : "Reject Request"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{rejectTarget?.staff?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(rejectTarget?.date_from ?? "")} – {fmtDate(rejectTarget?.date_to ?? "")} · {typeLabel(rejectTarget?.type ?? "")}</div>
            {rejectTarget?.reason && <div className="text-xs text-ink-soft mt-1">{rejectTarget.reason}</div>}
          </Card>
          <Field label={"Rejection reason"} required>
            <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={"Explain why this request is rejected"} />
          </Field>
        </div>
      </Modal>

      {lightboxKey && (
        <PhotoLightbox src={lightboxUrl} name={"Selfie"} onClose={() => setLightboxKey(null)} />
      )}
    </div>
  );
}
