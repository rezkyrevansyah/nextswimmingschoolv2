"use client";
import { Select } from "@/components/ui/FormFields";
import Status from "@/components/ui/Status";
import { fmtDate } from "@/lib/utils";
import { memberDbToUi, memberStatusKind } from "@/lib/attendance";
import type { AdminMemberHook } from "./_hook";

export default function MemberAttendanceTab({ hook }: { hook: AdminMemberHook }) {
  const { t, detail, attClassFilter, setAttClassFilter, loadingAtt, attendances } = hook;
  if (!detail) return null;
  const memberClassNames = detail.member_classes?.map(mc => mc.class?.name).filter(Boolean) as string[] ?? [];
  const filteredAtt = attClassFilter ? attendances.filter(a => a.class?.name === attClassFilter) : attendances;

  return (
    <div className="space-y-3">
      {memberClassNames.length > 1 && (
        <Select value={attClassFilter} onChange={e => setAttClassFilter(e.target.value)} className="text-xs">
          <option value="">{t("admin.members.allClassesLowerOpt")}</option>
          {memberClassNames.map(n => <option key={n} value={n}>{n}</option>)}
        </Select>
      )}
      {loadingAtt ? (
        <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.loadingEllipsis")}</div>
      ) : filteredAtt.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{t("admin.members.noAttendanceHistory")}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                <th className="text-left py-2 px-3 font-bold">{t("admin.absensi.colDate")}</th>
                <th className="text-left py-2 font-bold">{t("admin.absensi.colClass")}</th>
                <th className="text-left py-2 font-bold">{t("admin.absensi.colStatus")}</th>
                <th className="text-left py-2 px-3 font-bold">{t("admin.absensi.colMethod")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredAtt.map(a => (
                <tr key={a.id} className="hover:bg-paper-tint">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">{fmtDate(a.session_date)}</td>
                  <td className="py-2 text-ink-soft">{a.class?.name ?? "—"}</td>
                  <td className="py-2">
                    {(() => {
                      const ui = memberDbToUi(a.status);
                      const label = ui === "present" ? t("admin.absensi.statusPresent")
                        : ui === "late" ? t("admin.absensi.statusLate")
                        : ui === "izin" ? t("admin.absensi.statusExcused")
                        : ui === "sick" ? t("admin.absensi.statusSick")
                        : t("admin.absensi.statusAbsent");
                      return <Status kind={memberStatusKind(a.status)} dot={false}>{label}</Status>;
                    })()}
                  </td>
                  <td className="py-2 px-3 text-ink-mute capitalize">{a.method === "manual" ? t("admin.absensi.methodManual") : a.method === "qr" ? t("admin.absensi.methodQr") : a.method ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
