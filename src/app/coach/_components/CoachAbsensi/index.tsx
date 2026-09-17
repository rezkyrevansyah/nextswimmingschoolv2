"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { fmtDate } from "@/lib/utils";
import { isInClockInWindow } from "../../_utils";
import type { ClassRow } from "../../_types";
import QRScanner from "../QRScanner";
import { useCoachAbsensi } from "./useCoachAbsensi";
import ManualAttendanceModal from "./ManualAttendanceModal";
import PrivateSessionModal from "./PrivateSessionModal";
import SessionDetailModal from "./SessionDetailModal";

export default function CoachAbsensi({ setOverlay, coachId, branchId, classes, holidayClassIds, clockedInIds }: {
  setOverlay: (v: string) => void;
  coachId: string; branchId?: string; classes: ClassRow[]; holidayClassIds: Set<string>; clockedInIds: Set<string>;
}) {
  const hook = useCoachAbsensi({ coachId, classes });
  const {
    t, localeTag, history, historyLoading, historyPage, setHistoryPage, historyHasMore,
    filterMonth, setFilterMonth, filterClassId, setFilterClassId,
    setOpenManual, showQR, setShowQR, memberAttHistory, openDetailSesi, loadHistory,
    privateClasses,
  } = hook;

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const todayClasses = classes.filter(c =>
    (c.schedule_days ?? []).includes(todayName) &&
    (!branchId || !c.branch_id || c.branch_id === branchId)
  );

  if (showQR) {
    return <QRScanner coachId={coachId} classes={classes} onClose={() => setShowQR(false)} />;
  }

  return (
    <div className="space-y-5">
      <SectionTitle sub={t("coach.absen.absenNowSub")}>{t("coach.absen.absenNowTitle")}</SectionTitle>
      {todayClasses.length === 0 ? (
        <Card><p className="text-ink-mute text-sm">{t("coach.absen.noClassesToday")}</p></Card>
      ) : (
        <div className="space-y-3">
          {todayClasses.map((c) => {
            const isHoliday = holidayClassIds.has(c.id);
            const isClockedIn = clockedInIds.has(c.id);
            const inWindow = !isHoliday && !isClockedIn && isInClockInWindow(c.time_start, c.time_end);
            return (
              <Card key={c.id} className={isHoliday ? "opacity-60" : ""}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-bold text-ink">{c.name}</div>
                      {isHoliday && <Status kind="holiday">{t("coach.home.holidayBadge")}</Status>}
                      {isClockedIn && <Status kind="approved">{t("coach.home.alreadyClockedInBadge")}</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
                  </div>
                  {!isHoliday && (isClockedIn ? (
                    <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-600 flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  ) : inWindow ? (
                    <Btn variant="primary" size="md" icon="camera" onClick={() => setOverlay(`clockin:${c.id}`)}>{t("coach.home.clockInBtn")}</Btn>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs font-semibold text-ink-mute">{t("coach.absen.outsideWindowShort")}</div>
                      <div className="text-[10px] text-ink-faint">{t("coach.absen.contactAdminShort")}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className={`grid gap-3 ${privateClasses.length > 0 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
        <Card className="bg-ocean-50 border-ocean-100">
          <Icon name="qr" className="w-8 h-8 text-ocean-600 mb-2" />
          <div className="font-display font-bold text-ink">{t("coach.qrScanner.title")}</div>
          <p className="text-xs text-ink-mute mt-1">{t("coach.absen.qrAutoDetectHint")}</p>
          <Btn variant="primary" size="sm" className="mt-3 w-full" onClick={() => setShowQR(true)}>{t("coach.absen.openCameraBtn")}</Btn>
        </Card>
        <Card>
          <Icon name="edit" className="w-8 h-8 text-wave-600 mb-2" />
          <div className="font-display font-bold text-ink">{t("coach.absen.manualAttendanceTitle")}</div>
          <p className="text-xs text-ink-mute mt-1">{t("coach.absen.manualAttendanceHint")}</p>
          <Btn variant="soft" size="sm" className="mt-3 w-full" onClick={() => setOpenManual(true)}>{t("coach.absen.selectClassBtn")}</Btn>
        </Card>
        {privateClasses.length > 0 && (
          <Card className="bg-wave-50 border-wave-100">
            <Icon name="sparkle" className="w-8 h-8 text-wave-600 mb-2" />
            <div className="font-display font-bold text-ink">{t("coach.absen.privateSessionTitle")}</div>
            <p className="text-xs text-ink-mute mt-1">{t("coach.absen.privateSessionHint")}</p>
            <Btn variant="soft" size="sm" className="mt-3 w-full" onClick={() => hook.setOpenPrivate(true)}>{t("coach.absen.recordSessionBtn")}</Btn>
          </Card>
        )}
      </div>

      <Card padded={false}>
        {/* Header + filter */}
        <div className="p-5 border-b border-line space-y-3">
          <SectionTitle>{t("coach.absen.historyTitle")}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {/* Month filter */}
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="text-sm rounded-lg border border-line bg-white px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
                const val = d.toISOString().slice(0, 7);
                const label = d.toLocaleDateString(localeTag, { month: "long", year: "numeric" });
                return <option key={val} value={val}>{label}</option>;
              })}
            </select>
            {/* Class filter */}
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="text-sm rounded-lg border border-line bg-white px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300 max-w-[180px] truncate"
            >
              <option value="all">{t("coach.absen.allClassesOpt")}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {historyLoading && history.length === 0 ? (
          <div className="p-6 text-center text-ink-mute text-sm">{t("coach.leave.loadingEllipsis")}</div>
        ) : (
          <>
            <div className="divide-y divide-line">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.is_manual ? "bg-manual-50 text-manual-500" : h.status === "late" ? "bg-warn-50 text-warn-600" : "bg-ok-50 text-ok-600"}`}>
                    <Icon name={h.is_manual ? "edit" : "check"} className="w-4 h-4" strokeWidth={2.4} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-ink text-sm">{h.class?.name}</div>
                      {h.is_manual && <Status kind="manual">{t("coach.absen.manualBadge")}</Status>}
                      {!h.is_manual && h.status === "late" && <Status kind="late">{t("coach.absen.lateBadge")}</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)} · {h.clock_in_time?.slice(0, 5) ?? "—"}{h.distance_meters != null ? ` · ${h.distance_meters}m` : ""}</div>
                    {h.is_manual && h.manual_by_profile && (
                      <div className="text-[10px] text-ink-faint mt-0.5">{t("coach.absen.byLabel", { name: h.manual_by_profile.full_name })}{h.manual_note ? ` · "${h.manual_note}"` : ""}</div>
                    )}
                  </div>
                </div>
              ))}
              {!historyLoading && history.length === 0 && (
                <div className="p-6 text-center text-ink-mute text-sm">{t("coach.absen.noAttendanceInPeriod")}</div>
              )}
            </div>
            {historyHasMore && (
              <div className="p-4 border-t border-line">
                <button
                  onClick={() => {
                    const next = historyPage + 1;
                    setHistoryPage(next);
                    loadHistory(next, filterMonth, filterClassId, true);
                  }}
                  disabled={historyLoading}
                  className="w-full text-sm font-semibold text-ocean-700 hover:text-ocean-900 py-2 rounded-lg hover:bg-ocean-50 transition-colors disabled:opacity-50"
                >
                  {historyLoading ? t("coach.leave.loadingEllipsis") : t("coach.absen.showMoreBtn")}
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {memberAttHistory.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub={t("coach.absen.memberHistorySub")}>{t("coach.absen.memberHistoryTitle")}</SectionTitle></div>
          <div className="divide-y divide-line">
            {memberAttHistory.map((h) => (
              <div
                key={h.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint cursor-pointer active:bg-ocean-50 transition-colors"
                onClick={() => openDetailSesi(h.class_id, h.class_name, h.session_date)}
              >
                <span className="w-10 h-10 rounded-xl bg-wave-50 text-wave-600 flex items-center justify-center shrink-0">
                  <Icon name="users" className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{h.class_name}</div>
                  <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-ok-600 text-sm">{h.hadir}/{h.total}</div>
                    <div className="text-[10px] text-ink-faint">{t("coach.absen.presentLabel")}</div>
                  </div>
                  <Icon name="arrow" className="w-4 h-4 text-ink-faint -rotate-90" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ManualAttendanceModal hook={hook} classes={classes} />
      <PrivateSessionModal hook={hook} />
      <SessionDetailModal hook={hook} />
    </div>
  );
}
