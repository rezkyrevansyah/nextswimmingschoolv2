"use client";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import type { AdminStudentHook } from "./_hook";
import { genderLabel } from "./_utils";

export default function StudentInfoTab({ hook }: { hook: AdminStudentHook }) {
  const { detail, regProofUrl } = hook;
  if (!detail) return null;
  const p = detail.profile;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Type"}</div><div className="font-semibold text-ink capitalize">{detail.type === "reguler" ? "Regular" : detail.type === "private" ? "Private" : "School Affiliate"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Since"}</div><div className="font-semibold text-ink">{fmtDate(detail.date_start)}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Sessions left"}</div><div className="font-semibold text-ink">{detail.remaining_sessions != null ? `${detail.remaining_sessions} / ${detail.total_sessions ?? "—"}` : "—"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Gender"}</div><div className="font-semibold text-ink">{genderLabel(p?.gender) ?? "—"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Date of birth"}</div><div className="font-semibold text-ink">{p?.birth_date ? fmtDate(p.birth_date) : "—"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Email"}</div><div className="font-semibold text-ink text-xs break-all"><NoTranslate>{p?.email ?? "—"}</NoTranslate></div></div>
      </div>
      <div className="pt-3 border-t border-line grid grid-cols-2 gap-x-4 gap-y-3">
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Phone number"}</div><div className="font-semibold text-ink font-mono text-xs"><NoTranslate>{p?.phone ?? "—"}</NoTranslate></div></div>
      </div>
      {(p?.address || p?.health_notes) && (
        <div className="pt-3 border-t border-line space-y-2">
          {p?.address && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">{"Address"}</div><div className="text-ink-soft leading-snug"><NoTranslate>{p.address}</NoTranslate></div></div>}
          {p?.health_notes && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">{"Health notes"}</div><div className="text-ink-soft leading-snug"><NoTranslate>{p.health_notes}</NoTranslate></div></div>}
        </div>
      )}
      {detail.status === "suspended" && (
        <div className="pt-3 border-t border-line bg-warn-50 rounded-xl px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-warn-500">{"Suspended until"}</div>
          <div className="font-semibold text-warn-700">{fmtDate(detail.suspend_until ?? "")}</div>
          {detail.suspend_reason && <div className="text-xs text-warn-600 mt-0.5"><NoTranslate>{detail.suspend_reason}</NoTranslate></div>}
        </div>
      )}
      <div className="pt-3 border-t border-line">
        <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{"Classes Joined"}</div>
        <div className="flex flex-wrap gap-1.5">
          {detail.student_classes?.map((mc, i) => mc.class && <span key={i} className="px-2 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold"><NoTranslate>{mc.class.name}</NoTranslate></span>)}
          {(detail.student_classes?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">{"Not assigned to a class yet"}</span>}
        </div>
      </div>
      <div className="pt-3 border-t border-line">
        <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{"Initial Payment Proof"}</div>
        {regProofUrl ? (
          <a href={regProofUrl} target="_blank" rel="noreferrer">
            <Btn variant="outline" size="sm" icon="eye">{"View Transfer Proof"}</Btn>
          </a>
        ) : (
          <span className="text-xs text-ink-faint">{"No proof available"}</span>
        )}
      </div>
    </>
  );
}
