"use client";
import { Card, SectionTitle } from "@/components/ui/Card";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDate } from "@/lib/utils";
import { fmtClockTime } from "../_utils";
import type { useStaffData } from "./useStaffData";

export default function StaffAbsen({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const { t } = useLocale();
  const { selectedMonth, setSelectedMonth, filteredAttendances, staffStatusBadge } = hook;

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionTitle sub={t("staff.attendance.sub")}>
          {t("staff.attendance.title")}
        </SectionTitle>
        <div className="w-48">
          <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-4">{t("staff.attendance.colDate")}</th>
              <th className="text-left py-3 px-4">{t("staff.attendance.colClockIn")}</th>
              <th className="text-left py-3 px-4">{t("staff.attendance.colClockOut")}</th>
              <th className="text-left py-3 px-4">{t("staff.attendance.colStatus")}</th>
              <th className="text-left py-3 px-4">{t("staff.attendance.colNotes")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredAttendances.map(att => (
              <tr key={att.id} className="hover:bg-paper-tint">
                <td className="py-3 px-4 font-semibold text-ink">{fmtDate(att.attendance_date)}</td>
                <td className="py-3 px-4 font-mono text-ink-soft">{fmtClockTime(att.clock_in_time)}</td>
                <td className="py-3 px-4 font-mono text-ink-soft">{fmtClockTime(att.clock_out_time)}</td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${staffStatusBadge(att.status).className}`}>
                    {staffStatusBadge(att.status).label}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-ink-mute">{att.note ?? "—"}</td>
              </tr>
            ))}
            {filteredAttendances.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-ink-mute">
                  {t("staff.attendance.empty", { month: selectedMonth })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {filteredAttendances.map(att => (
          <div key={att.id} className="p-3.5 rounded-xl border border-line bg-white shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-ink">{fmtDate(att.attendance_date)}</span>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${staffStatusBadge(att.status).className}`}>
                {staffStatusBadge(att.status).label}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-soft font-mono bg-paper-tint px-3 py-2 rounded-lg">
              <div>Masuk: <span className="font-bold text-ink">{fmtClockTime(att.clock_in_time)}</span></div>
              <div>Pulang: <span className="font-bold text-ink">{fmtClockTime(att.clock_out_time)}</span></div>
            </div>
            {att.note && <p className="text-xs text-ink-mute italic">{att.note}</p>}
          </div>
        ))}
        {filteredAttendances.length === 0 && (
          <div className="py-8 text-center text-xs text-ink-mute">
            {t("staff.attendance.empty", { month: selectedMonth })}
          </div>
        )}
      </div>
    </Card>
  );
}
