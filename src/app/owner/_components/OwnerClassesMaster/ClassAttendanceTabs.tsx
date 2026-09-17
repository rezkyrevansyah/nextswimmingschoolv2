"use client";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { coachDbToUi, memberDbToUi } from "@/lib/attendance";
import type { OwnerClassesMasterHook } from "./_hook";

export function ClassCoachAttendanceTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const { t, detailLoading, detailCoachAtt } = hook;

  return (
    <div>
      {detailLoading ? (
        <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachLoading")}</div>
      ) : detailCoachAtt.length === 0 ? (
        <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.attCoachEmpty")}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-paper-tint border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colDate")}</th>
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colCoach")}</th>
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colStatus")}</th>
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colNote")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {detailCoachAtt.map((a) => (
                <tr key={a.id} className="hover:bg-paper-tint/50">
                  <td className="py-2 px-3 font-mono font-semibold text-ink">
                    {a.session_date} {a.clock_in_time && <span className="text-ink-mute">({a.clock_in_time})</span>}
                  </td>
                  <td className="py-2 px-3 font-bold text-ink"><NoTranslate>{a.profile?.full_name ?? "—"}</NoTranslate></td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        coachDbToUi(a.status) === "present"
                          ? "bg-ok-50 text-ok-700"
                          : coachDbToUi(a.status) === "absent"
                          ? "bg-danger-50 text-danger-700"
                          : "bg-warn-50 text-warn-700"
                      }`}
                    >
                      {t(`owner.classes.attStatus.${coachDbToUi(a.status)}`) || a.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-ink-mute">
                    {a.is_manual ? (
                      <>
                        Manual: <NoTranslate>{a.manual_note || "—"}</NoTranslate>
                      </>
                    ) : a.distance_meters ? (
                      `${a.distance_meters}m`
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ClassMemberAttendanceTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const { t, detailLoading, detailMemberAtt } = hook;

  return (
    <div>
      {detailLoading ? (
        <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachLoading")}</div>
      ) : detailMemberAtt.length === 0 ? (
        <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.attMemberEmpty")}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-paper-tint border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colDate")}</th>
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colMember")}</th>
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colStatus")}</th>
                <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colMethod")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {detailMemberAtt.map((a) => (
                <tr key={a.id} className="hover:bg-paper-tint/50">
                  <td className="py-2 px-3 font-mono font-semibold text-ink">{a.session_date}</td>
                  <td className="py-2 px-3 font-bold text-ink">
                    <NoTranslate>{a.member?.profile?.full_name ?? a.member?.member_no ?? "—"}</NoTranslate>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        memberDbToUi(a.status) === "present"
                          ? "bg-ok-50 text-ok-700"
                          : memberDbToUi(a.status) === "absent"
                          ? "bg-danger-50 text-danger-700"
                          : "bg-warn-50 text-warn-700"
                      }`}
                    >
                      {t(`owner.classes.attStatus.${memberDbToUi(a.status)}`) || a.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-ink-mute uppercase font-mono text-[10px]">
                    {a.method ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
