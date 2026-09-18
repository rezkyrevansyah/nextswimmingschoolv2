"use client";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import type { useIzinData } from "./useIzinData";

type IzinDataHook = ReturnType<typeof useIzinData>;

export default function DetailLeaveModal({ hook }: { hook: IzinDataHook }) {
  const {
    typeLabel, statusLabel, tab,
    detailTarget, setDetailTarget, setRejectTarget, setRejectReason, decide,
  } = hook;

  return (
    <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={"Leave Detail"} size="md"
      footer={
        <div className="flex gap-2 w-full">
          {detailTarget?.status === "pending" && (
            <>
              <Btn variant="ghost" className="text-danger-500"
                onClick={() => { setRejectTarget(detailTarget); setRejectReason(""); setDetailTarget(null); }}>{"Reject"}</Btn>
              <Btn variant="soft" icon="check"
                onClick={() => { decide(detailTarget.id, "approved"); setDetailTarget(null); }}>{"Approve"}</Btn>
            </>
          )}
          <Btn variant="ghost" className="ml-auto" onClick={() => setDetailTarget(null)}>{"Close"}</Btn>
        </div>
      }>
      {detailTarget && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-2xl">
            <Avatar name={detailTarget.profile?.full_name ?? "?"} size={48} />
            <div className="min-w-0">
              <div className="font-display font-bold text-lg text-ink leading-tight truncate"><NoTranslate>{detailTarget.profile?.full_name ?? "—"}</NoTranslate></div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Status kind={detailTarget.status as "pending" | "approved" | "rejected"}>
                  {statusLabel(detailTarget.status)}
                </Status>
                <span className="text-xs text-ink-mute capitalize">{typeLabel(detailTarget.type)}</span>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="bg-paper-tint rounded-xl divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{"Type"}</span>
              <span className="text-sm text-ink font-medium capitalize">{typeLabel(detailTarget.type)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{"Start date"}</span>
              <span className="text-sm text-ink">{fmtDate(detailTarget.date_from)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{"End date"}</span>
              <span className="text-sm text-ink">{fmtDate(detailTarget.date_to)}</span>
            </div>
            {detailTarget.date_from !== detailTarget.date_to && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">{"Duration"}</span>
                <span className="text-sm text-ink tabular-nums">
                  {`${Math.round((new Date(detailTarget.date_to).getTime() - new Date(detailTarget.date_from).getTime()) / 86400000) + 1} days`}
                </span>
              </div>
            )}
          </div>

          {/* Reason — main ask */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Reason / Notes"}</div>
            {detailTarget.reason
              ? <p className="text-sm text-ink bg-paper-tint rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap"><NoTranslate>{detailTarget.reason}</NoTranslate></p>
              : <p className="text-sm text-ink-faint italic px-4 py-3 bg-paper-tint rounded-xl">{"No notes."}</p>
            }
          </div>

          {/* Per-class substitutes (coach, new format) */}
          {tab === "coach" && detailTarget.coach_leave_classes && detailTarget.coach_leave_classes.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Classes & Substitutes"}</div>
              <div className="bg-paper-tint rounded-xl divide-y divide-line">
                {detailTarget.coach_leave_classes.map(lc => (
                  <div key={lc.class_id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-ink"><NoTranslate>{lc.class?.name ?? "—"}</NoTranslate></span>
                    {lc.substitute?.full_name
                      ? <span className="text-xs font-semibold text-ok-600"><NoTranslate>{lc.substitute.full_name}</NoTranslate></span>
                      : <span className="text-xs text-warn-600">{"No substitute yet"}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback: old single substitute (pre-migration) */}
          {tab === "coach" && !(detailTarget.coach_leave_classes?.length) && detailTarget.substitute_profile && (
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">{"Substitute"}</span>
                <span className="text-sm font-semibold text-ok-600"><NoTranslate>{detailTarget.substitute_profile.full_name}</NoTranslate></span>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
