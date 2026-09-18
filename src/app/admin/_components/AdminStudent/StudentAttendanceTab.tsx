"use client";
import { Select } from "@/components/ui/FormFields";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import { memberDbToUi, memberStatusKind } from "@/lib/attendance";
import type { AdminMemberHook } from "./_hook";

export default function MemberAttendanceTab({ hook }: { hook: AdminMemberHook }) {
  const { detail, attClassFilter, setAttClassFilter, loadingAtt, attendances } = hook;
  if (!detail) return null;
  const memberClassNames = detail.member_classes?.map(mc => mc.class?.name).filter(Boolean) as string[] ?? [];
  const filteredAtt = attClassFilter ? attendances.filter(a => a.class?.name === attClassFilter) : attendances;

  return (
    <div className="space-y-3">
      {memberClassNames.length > 1 && (
        <Select value={attClassFilter} onChange={e => setAttClassFilter(e.target.value)} className="text-xs">
          <option value="">{"All classes"}</option>
          {memberClassNames.map(n => <option key={n} value={n} translate="no">{n}</option>)}
        </Select>
      )}
      {loadingAtt ? (
        <div className="py-8 text-center text-ink-mute text-sm">{"Loading…"}</div>
      ) : filteredAtt.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{"No attendance history yet."}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                <th className="text-left py-2 px-3 font-bold">{"Date"}</th>
                <th className="text-left py-2 font-bold">{"Class"}</th>
                <th className="text-left py-2 font-bold">{"Status"}</th>
                <th className="text-left py-2 px-3 font-bold">{"Method"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredAtt.map(a => (
                <tr key={a.id} className="hover:bg-paper-tint">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">{fmtDate(a.session_date)}</td>
                  <td className="py-2 text-ink-soft"><NoTranslate>{a.class?.name ?? "—"}</NoTranslate></td>
                  <td className="py-2">
                    {(() => {
                      const ui = memberDbToUi(a.status);
                      const label = ui === "present" ? "Present"
                        : ui === "late" ? "Late"
                        : ui === "izin" ? "Excused"
                        : ui === "sick" ? "Sick"
                        : "Absent";
                      return <Status kind={memberStatusKind(a.status)} dot={false}>{label}</Status>;
                    })()}
                  </td>
                  <td className="py-2 px-3 text-ink-mute capitalize">{a.method === "manual" ? "Manual" : a.method === "qr" ? "QR Scan" : a.method ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
