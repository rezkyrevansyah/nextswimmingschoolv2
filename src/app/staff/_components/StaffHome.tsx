"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Input } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR, fmtDate, fmtDateLong } from "@/lib/utils";
import { fmtClockTime } from "../_utils";
import type { useStaffData } from "./useStaffData";

export default function StaffHome({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const { t } = useLocale();
  const {
    todayAttendance, clockNotes, setClockNotes, clockLoading, setShowSelfieFlow,
    handleClockOut, handleRecordLeave, leaveRequests, monthPresentCount, latestSalary,
    expenses, setActive, setShowExpenseModal,
  } = hook;

  return (
    <div className="space-y-6">
      {/* Presensi Widget Hero Card */}
      <Card className="relative overflow-hidden border-2 border-ocean-200 bg-gradient-to-br from-ocean-50/50 via-white to-sky-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ocean-100 text-ocean-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-ocean-600 animate-ping" />
              {t("staff.home.todayPresensiBadge", { date: fmtDateLong(new Date().toISOString().slice(0, 10)) })}
            </div>
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink">
              {todayAttendance
                ? todayAttendance.clock_out_time
                  ? t("staff.home.statusDone")
                  : t("staff.home.statusActive")
                : t("staff.home.statusNotYet")}
            </h3>
            <p className="text-sm text-ink-soft max-w-md">
              {todayAttendance
                ? todayAttendance.clock_out_time
                  ? t("staff.home.dutySubtextDone", { in: fmtClockTime(todayAttendance.clock_in_time), out: fmtClockTime(todayAttendance.clock_out_time) })
                  : t("staff.home.dutySubtextActive", { in: fmtClockTime(todayAttendance.clock_in_time) })
                : t("staff.home.dutySubtextNotYet")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {!todayAttendance ? (
              <>
                <Btn
                  variant="primary"
                  size="lg"
                  icon="check"
                  onClick={() => setShowSelfieFlow(true)}
                  disabled={clockLoading}
                  className="shadow-lg shadow-ocean-500/20 py-3.5 px-6 font-bold"
                >
                  {t("staff.home.clockInBtn")}
                </Btn>
                <div className="flex gap-2">
                  <Btn variant="outline" size="sm" onClick={() => handleRecordLeave("sakit")} disabled={clockLoading}>
                    {t("staff.home.sickBtn")}
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => handleRecordLeave("izin")} disabled={clockLoading}>
                    {t("staff.home.leaveBtn")}
                  </Btn>
                </div>
              </>
            ) : !todayAttendance.clock_out_time ? (
              <Btn
                variant="primary"
                size="lg"
                icon="check"
                onClick={handleClockOut}
                disabled={clockLoading}
                className="bg-ok-600 hover:bg-ok-700 shadow-lg shadow-ok-500/20 py-3.5 px-6 font-bold"
              >
                {clockLoading ? t("staff.home.clockInProcessing") : t("staff.home.clockOutBtn")}
              </Btn>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-ok-100 text-ok-800 font-bold text-sm flex items-center gap-2">
                <Icon name="check" className="w-5 h-5 text-ok-600" /> {t("staff.home.completedBadge")}
              </div>
            )}
          </div>
        </div>

        {!todayAttendance?.clock_out_time && (
          <div className="mt-4 pt-4 border-t border-line/60 flex items-center gap-3">
            <Input
              value={clockNotes}
              onChange={e => setClockNotes(e.target.value)}
              placeholder={t("staff.home.clockNotesPlaceholder")}
              className="text-xs bg-white"
            />
          </div>
        )}
      </Card>

      {leaveRequests.length > 0 && (
        <Card padded={false}>
          <div className="px-5 pt-4 pb-2 font-display font-bold text-ink">{t("staff.leaveHistory.title")}</div>
          <div className="divide-y divide-line">
            {leaveRequests.map(l => {
              const typeLabel = l.type === "izin" ? t("staff.home.leaveBtn") : t("staff.home.sickBtn");
              const statusLabel = l.status === "approved" ? t("staff.leaveHistory.statusApproved") : l.status === "rejected" ? t("staff.leaveHistory.statusRejected") : t("staff.leaveHistory.statusPending");
              const dateRange = l.date_to !== l.date_from ? `${fmtDate(l.date_from)}–${fmtDate(l.date_to)}` : fmtDate(l.date_from);
              return (
                <div key={l.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.status === "approved" ? "bg-ok-50 text-ok-600" : l.status === "rejected" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                      <Icon name={l.status === "approved" ? "check" : l.status === "rejected" ? "x" : "info"} className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm">{typeLabel} · {dateRange}</div>
                      {l.reason && <div className="text-xs text-ink-mute">{l.reason}</div>}
                    </div>
                    <Status kind={l.status}>{statusLabel}</Status>
                  </div>
                  {l.reject_reason && <div className="mt-2 text-xs text-danger-600 bg-danger-50 rounded-lg p-2.5"><b>{t("staff.leaveHistory.rejectReasonLabel")}:</b> {l.reject_reason}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Quick Summary Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-mute">{t("staff.home.statMonthAttendanceTitle")}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-ocean-700">{monthPresentCount}</span>
            <span className="text-xs text-ink-mute">{t("staff.home.daysPresentSuffix")}</span>
          </div>
          <button onClick={() => setActive("absen")} className="mt-3 text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
            {t("staff.home.viewAttendanceHistory")}
          </button>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-mute">{t("staff.home.statLatestPayslipTitle")}</div>
          <div className="mt-2">
            {latestSalary ? (
              <div>
                <div className="font-display font-extrabold text-2xl text-ink">{fmtIDR(latestSalary.total_salary)}</div>
                <div className="text-xs text-ok-600 font-semibold mt-0.5">{t("staff.home.periodLabel", { period: latestSalary.period_month, status: latestSalary.status.toUpperCase() })}</div>
              </div>
            ) : (
              <div className="text-sm text-ink-mute">{t("staff.home.noPayslipYet")}</div>
            )}
          </div>
          <button onClick={() => setActive("payslip")} className="mt-3 text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
            {t("staff.home.viewPayslipDetail")}
          </button>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-mute">{t("staff.home.statExpensesTitle")}</div>
          <div className="mt-2">
            <div className="font-display font-extrabold text-2xl text-ink">{expenses.length}</div>
            <div className="text-xs text-ink-mute">{t("staff.home.totalClaimsSubmitted")}</div>
          </div>
          <button onClick={() => { setActive("expenses"); setShowExpenseModal(true); }} className="mt-3 text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
            {t("staff.home.submitNewExpense")}
          </button>
        </Card>
      </div>
    </div>
  );
}
