"use client";
import Btn from "@/components/ui/Btn";
import { fmtDate } from "@/lib/utils";
import type { AdminMemberHook } from "./_hook";
import { genderLabel } from "./_utils";

export default function MemberInfoTab({ hook }: { hook: AdminMemberHook }) {
  const { t, detail, regProofUrl } = hook;
  if (!detail) return null;
  const p = detail.profile;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowType2")}</div><div className="font-semibold text-ink capitalize">{detail.type === "reguler" ? t("admin.members.typeRegularFull") : detail.type === "private" ? t("admin.members.typePrivateFull") : t("admin.members.typeAffiliateFull")}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowSince")}</div><div className="font-semibold text-ink">{fmtDate(detail.date_start)}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowSessionsLeft")}</div><div className="font-semibold text-ink">{detail.remaining_sessions != null ? `${detail.remaining_sessions} / ${detail.total_sessions ?? "—"}` : "—"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.rowGender2")}</div><div className="font-semibold text-ink">{genderLabel(t, p?.gender) ?? "—"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowBirthDateFull")}</div><div className="font-semibold text-ink">{p?.birth_date ? fmtDate(p.birth_date) : "—"}</div></div>
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.fieldEmail2")}</div><div className="font-semibold text-ink text-xs break-all">{p?.email ?? "—"}</div></div>
      </div>
      <div className="pt-3 border-t border-line grid grid-cols-2 gap-x-4 gap-y-3">
        <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.approvement.rowPhone")}</div><div className="font-semibold text-ink font-mono text-xs">{p?.phone ?? "—"}</div></div>
      </div>
      {(p?.address || p?.health_notes) && (
        <div className="pt-3 border-t border-line space-y-2">
          {p?.address && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">{t("admin.coaches.rowAddress2")}</div><div className="text-ink-soft leading-snug">{p.address}</div></div>}
          {p?.health_notes && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">{t("admin.approvement.rowHealthNotes")}</div><div className="text-ink-soft leading-snug">{p.health_notes}</div></div>}
        </div>
      )}
      {detail.status === "suspended" && (
        <div className="pt-3 border-t border-line bg-warn-50 rounded-xl px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-warn-500">{t("admin.members.suspendUntilLabel")}</div>
          <div className="font-semibold text-warn-700">{fmtDate(detail.suspend_until ?? "")}</div>
          {detail.suspend_reason && <div className="text-xs text-warn-600 mt-0.5">{detail.suspend_reason}</div>}
        </div>
      )}
      <div className="pt-3 border-t border-line">
        <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{t("admin.members.classesJoinedLabel")}</div>
        <div className="flex flex-wrap gap-1.5">
          {detail.member_classes?.map((mc, i) => mc.class && <span key={i} className="px-2 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold">{mc.class.name}</span>)}
          {(detail.member_classes?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">{t("admin.members.notAssignedToClass")}</span>}
        </div>
      </div>
      <div className="pt-3 border-t border-line">
        <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{t("admin.members.initialPaymentProofLabel")}</div>
        {regProofUrl ? (
          <a href={regProofUrl} target="_blank" rel="noreferrer">
            <Btn variant="outline" size="sm" icon="eye">{t("admin.members.viewTransferProofBtn")}</Btn>
          </a>
        ) : (
          <span className="text-xs text-ink-faint">{t("admin.members.noProofAvailable")}</span>
        )}
      </div>
    </>
  );
}
