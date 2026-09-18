"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

interface LeaveHistoryRow {
  id: string; type: string; date_from: string; date_to: string;
  status: string; reason: string | null; reject_reason: string | null;
  substitute_profile?: { full_name: string } | null;
  coach_leave_classes?: { class: { name: string } | null; substitute: { full_name: string } | null }[];
}

export default function LeaveHistory({ back, coachId }: { back: () => void; coachId: string }) {
  const supabase = createClient();
  const [leaves, setLeaves] = useState<LeaveHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!coachId) { setLoading(false); return; }
    supabase.from("coach_leaves")
      .select("id, type, date_from, date_to, status, reason, reject_reason, substitute_profile:profiles!coach_leaves_substitute_id_fkey(full_name), coach_leave_classes(class:classes(name), substitute:profiles!coach_leave_classes_substitute_id_fkey(full_name))")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { if (data) setLeaves(data as unknown as LeaveHistoryRow[]); setLoading(false); });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const statusLabel: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  const statusKind: Record<string, "pending" | "approved" | "rejected"> = { pending: "pending", approved: "approved", rejected: "rejected" };
  const typeLabel: Record<string, string> = { izin: "Leave", sakit: "Sick", lainnya: "Other" };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={back} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> {"Back"}
      </button>
      <Card>
        <SectionTitle sub={"All your leave requests"}>{"Leave History"}</SectionTitle>
        {loading ? (
          <div className="text-ink-mute text-sm">{"Loading…"}</div>
        ) : leaves.length === 0 ? (
          <p className="text-ink-mute text-sm">{"No leave requests yet."}</p>
        ) : (
          <div className="space-y-3">
            {leaves.map((l) => {
              const hasPerClassSub = l.coach_leave_classes?.some(lc => lc.substitute?.full_name);
              return (
                <div key={l.id} className="rounded-xl border border-line p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{typeLabel[l.type] ?? l.type}</span>
                    <Status kind={statusKind[l.status] ?? "pending"}>{statusLabel[l.status] ?? l.status}</Status>
                  </div>
                  <div className="text-xs text-ink-mute font-mono">
                    {fmtDate(l.date_from)}{l.date_from !== l.date_to ? ` — ${fmtDate(l.date_to)}` : ""}
                  </div>
                  {l.reason && <p className="text-xs text-ink-soft"><NoTranslate>{l.reason}</NoTranslate></p>}
                  {/* Per-class substitute listing (new format) */}
                  {hasPerClassSub && l.coach_leave_classes && l.coach_leave_classes.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {l.coach_leave_classes.map((lc, i) => (
                        <div key={i} className="text-xs flex items-center gap-1.5 text-ink-mute">
                          <Icon name="swim" className="w-3 h-3 shrink-0" />
                          <span className="font-medium text-ink"><NoTranslate>{lc.class?.name ?? "—"}</NoTranslate></span>
                          {lc.substitute?.full_name && (
                            <><span>→</span><span className="font-semibold text-ocean-700"><NoTranslate>{lc.substitute.full_name}</NoTranslate></span></>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Fallback: old single-substitute display for pre-migration leaves */}
                  {!hasPerClassSub && l.substitute_profile && (
                    <div className="text-xs text-ink-mute">{"Substitute:"} <span className="font-semibold text-ink"><NoTranslate>{l.substitute_profile.full_name}</NoTranslate></span></div>
                  )}
                  {l.status === "rejected" && l.reject_reason && (
                    <div className="rounded-lg bg-danger-50 border border-danger-200 px-3 py-2">
                      <div className="text-xs font-bold text-danger-700 mb-0.5">{"Rejection reason"}</div>
                      <p className="text-xs text-danger-600"><NoTranslate>{l.reject_reason}</NoTranslate></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
