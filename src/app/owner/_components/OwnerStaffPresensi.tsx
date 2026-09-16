"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Btn from "@/components/ui/Btn";
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

interface Branch {
  id: string;
  name: string;
}

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
  const { t } = useLocale();
  const typeLabel = (ty: string) => (ty === "sakit" ? t("owner.staffPresensi.typeSick") : t("owner.staffPresensi.typeLeave"));
  const statusLabel = (s: string) => ({ pending: t("owner.staffPresensi.statusPending"), approved: t("owner.staffPresensi.statusApproved"), rejected: t("owner.staffPresensi.statusRejected") }[s] ?? s);

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
  // mirrors autoCreateMemberAttendances in AdminIzin.tsx, simplified since
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
    if (error) return toast.error(t("owner.staffPresensi.updateStatusFailed"), error.message);
    await applyStaffLeaveToAttendances(leave);
    await supabase.from("notifications").insert({
      user_id: leave.staff_id,
      title: t("owner.staffPresensi.leaveApprovedNotifTitle"),
      body: t("owner.staffPresensi.leaveApprovedNotifBody", { from: fmtDate(leave.date_from), to: fmtDate(leave.date_to) }),
      icon: "check",
      kind: "success",
    });
    toast.success(t("owner.staffPresensi.leaveApprovedToast"));
    loadLeaves();
    loadAttendances();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error(t("owner.staffPresensi.reasonRequired"));
    setRejecting(true);
    const ownerId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error } = await supabase.from("staff_leaves")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: ownerId, reject_reason: rejectReason.trim() })
      .eq("id", rejectTarget.id);
    setRejecting(false);
    if (error) return toast.error(t("owner.staffPresensi.rejectLeaveFailed"), error.message);
    await supabase.from("notifications").insert({
      user_id: rejectTarget.staff_id,
      title: t("owner.staffPresensi.leaveRejectedNotifTitle"),
      body: t("owner.staffPresensi.leaveRejectedNotifBody", { from: fmtDate(rejectTarget.date_from), to: fmtDate(rejectTarget.date_to), reason: rejectReason.trim() }),
      icon: "x",
      kind: "warn",
    });
    toast.success(t("owner.staffPresensi.leaveRejectedToast"));
    setRejectTarget(null);
    loadLeaves();
  };

  const totalPages = Math.max(1, Math.ceil((tab === "leave" ? leaves.length : attendances.length) / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedLeaves = leaves.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const paginatedAtt = attendances.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div><h2 className="font-display font-bold text-2xl">{t("owner.staffPresensi.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("owner.staffPresensi.pageSub")}</p></div>
      <Card padded={false}>
        <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1">
            {([["leave", t("owner.staffPresensi.tabLeave")], ["attendance", t("owner.staffPresensi.tabAttendance")]] as const).map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {tab === "attendance" && <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />}
            <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="!w-auto">
              <option value="all">{t("owner.staffPresensi.allBranchesOpt")}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
        </div>

        {tab === "leave" ? (
          loadingLeaves ? <div className="p-10 text-center text-ink-mute">{t("owner.staffPresensi.loadingData")}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">{t("owner.staffPresensi.colName")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.staffPresensi.colType")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">{t("owner.staffPresensi.colStart")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">{t("owner.staffPresensi.colEnd")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.staffPresensi.colStatus")}</th>
                  <th className="px-5" />
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {paginatedLeaves.map(l => (
                    <tr key={l.id} className="hover:bg-paper-tint">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.staff?.full_name ?? "?"} size={34} />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink truncate">{l.staff?.full_name ?? "—"}</div>
                            {l.reason && <div className="text-xs text-ink-faint truncate max-w-[180px]">{l.reason}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{typeLabel(l.type)}</td>
                      <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_from)}</td>
                      <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_to)}</td>
                      <td><Status kind={l.status}>{statusLabel(l.status)}</Status></td>
                      <td className="px-5">
                        {l.status === "pending" ? (
                          <div className="flex gap-1 justify-end">
                            <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => decide(l, "rejected")}>{t("common.actions.reject")}</Btn>
                            <Btn variant="soft" size="sm" icon="check" onClick={() => decide(l, "approved")}>{t("common.actions.approve")}</Btn>
                          </div>
                        ) : l.reject_reason ? (
                          <div className="text-xs text-danger-600 text-right max-w-[200px]">{l.reject_reason}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-ink-mute">{t("owner.staffPresensi.emptyLeaveRequests")}</td></tr>}
                </tbody>
              </table>
            </div>
          )
        ) : (
          loadingAtt ? <div className="p-10 text-center text-ink-mute">{t("owner.staffPresensi.loadingData")}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">{t("owner.staffPresensi.colDate")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.staffPresensi.colName")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">{t("owner.staffPresensi.colClockIn")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">{t("owner.staffPresensi.colClockOut")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.staffPresensi.colStatus")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.staffPresensi.colSelfie")}</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {paginatedAtt.map(a => {
                    const kind = staffStatusKind(a.status);
                    const label = kind === "present" ? t("owner.staffPresensi.typePresent") : kind === "excused" ? t("owner.staffPresensi.typeLeave") : kind === "sick" ? t("owner.staffPresensi.typeSick") : t("owner.staffPresensi.typeAbsent");
                    return (
                      <tr key={a.id} className="hover:bg-paper-tint">
                        <td className="py-3.5 px-5 text-ink-soft">{fmtDate(a.attendance_date)}</td>
                        <td className="font-semibold">{a.staff?.full_name ?? "—"}</td>
                        <td className="font-mono hidden sm:table-cell">{a.clock_in_time ? a.clock_in_time.slice(11, 16) : "—"}</td>
                        <td className="font-mono hidden sm:table-cell">{a.clock_out_time ? a.clock_out_time.slice(11, 16) : "—"}</td>
                        <td><Status kind={kind === "present" ? "active" : kind}>{label}</Status></td>
                        <td><SelfieThumb selfieKey={a.selfie_url} onOpen={() => setLightboxKey(a.selfie_url)} /></td>
                      </tr>
                    );
                  })}
                  {attendances.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-ink-mute">{t("owner.staffPresensi.emptyAttendance")}</td></tr>}
                </tbody>
              </table>
            </div>
          )
        )}

        {!(tab === "leave" ? loadingLeaves : loadingAtt) && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-ink-mute tabular-nums">
              {t("owner.staffPresensi.itemsPageLabel", { count: tab === "leave" ? leaves.length : attendances.length, page: safePage + 1, total: totalPages })}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(0)} className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
              <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
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
                      className={`min-w-[32px] py-1.5 rounded-lg border text-xs transition ${safePage === item ? "bg-ocean-600 border-ocean-600 text-white font-bold" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                      {(item as number) + 1}
                    </button>
                  )
                )}
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)} className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={t("owner.staffPresensi.rejectLeaveModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="danger" onClick={confirmReject} disabled={rejecting}>{rejecting ? t("owner.staffPresensi.rejectingBtn") : t("owner.staffPresensi.rejectLeaveBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{rejectTarget?.staff?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(rejectTarget?.date_from ?? "")} – {fmtDate(rejectTarget?.date_to ?? "")} · {typeLabel(rejectTarget?.type ?? "")}</div>
            {rejectTarget?.reason && <div className="text-xs text-ink-soft mt-1">{rejectTarget.reason}</div>}
          </Card>
          <Field label={t("owner.staffPresensi.fieldRejectReason")} required>
            <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={t("owner.staffPresensi.rejectReasonPlaceholder")} />
          </Field>
        </div>
      </Modal>

      {lightboxKey && (
        <PhotoLightbox src={lightboxUrl} name={t("owner.staffPresensi.colSelfie")} onClose={() => setLightboxKey(null)} />
      )}
    </div>
  );
}
