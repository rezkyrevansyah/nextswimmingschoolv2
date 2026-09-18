"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
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
    localeTag, history, historyLoading, historyPage, setHistoryPage, historyHasMore,
    filterMonth, setFilterMonth, filterClassId, setFilterClassId,
    setOpenManual, showQR, setShowQR, studentAttHistory, openDetailSesi, loadHistory,
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
      <SectionTitle sub={"Classes ongoing/about to start"}>{"Attend Now"}</SectionTitle>
      {todayClasses.length === 0 ? (
        <Card><p className="text-ink-mute text-sm">{"No classes today."}</p></Card>
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
                      <div className="font-display font-bold text-ink"><NoTranslate>{c.name}</NoTranslate></div>
                      {isHoliday && <Status kind="holiday">{"Holiday"}</Status>}
                      {isClockedIn && <Status kind="approved">{"Already Clocked In"}</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
                  </div>
                  {!isHoliday && (isClockedIn ? (
                    <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-600 flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  ) : inWindow ? (
                    <Btn variant="primary" size="md" icon="camera" onClick={() => setOverlay(`clockin:${c.id}`)}>{"Clock-In"}</Btn>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs font-semibold text-ink-mute">{"Outside window"}</div>
                      <div className="text-[10px] text-ink-faint">{"Contact admin"}</div>
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
          <div className="font-display font-bold text-ink">{"Scan Student QR"}</div>
          <p className="text-xs text-ink-mute mt-1">{"Automatically detects the ongoing class"}</p>
          <Btn variant="primary" size="sm" className="mt-3 w-full" onClick={() => setShowQR(true)}>{"Open camera"}</Btn>
        </Card>
        <Card>
          <Icon name="edit" className="w-8 h-8 text-wave-600 mb-2" />
          <div className="font-display font-bold text-ink">{"Manual Attendance"}</div>
          <p className="text-xs text-ink-mute mt-1">{"Checklist students per class"}</p>
          <Btn variant="soft" size="sm" className="mt-3 w-full" onClick={() => setOpenManual(true)}>{"Select class"}</Btn>
        </Card>
        {privateClasses.length > 0 && (
          <Card className="bg-wave-50 border-wave-100">
            <Icon name="sparkle" className="w-8 h-8 text-wave-600 mb-2" />
            <div className="font-display font-bold text-ink">{"Private Session"}</div>
            <p className="text-xs text-ink-mute mt-1">{"Record a 1-on-1 session, deduct remaining sessions"}</p>
            <Btn variant="soft" size="sm" className="mt-3 w-full" onClick={() => hook.setOpenPrivate(true)}>{"Record session"}</Btn>
          </Card>
        )}
      </div>

      <Card padded={false}>
        {/* Header + filter */}
        <div className="p-5 border-b border-line space-y-3">
          <SectionTitle>{"Attendance History"}</SectionTitle>
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
              <option value="all">{"All classes"}</option>
              {classes.map(c => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
            </select>
          </div>
        </div>
        {historyLoading && history.length === 0 ? (
          <div className="p-6 text-center text-ink-mute text-sm">{"Loading…"}</div>
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
                      <div className="font-semibold text-ink text-sm"><NoTranslate>{h.class?.name}</NoTranslate></div>
                      {h.is_manual && <Status kind="manual">{"Manual"}</Status>}
                      {!h.is_manual && h.status === "late" && <Status kind="late">{"Late"}</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)} · {h.clock_in_time?.slice(0, 5) ?? "—"}{h.distance_meters != null ? ` · ${h.distance_meters}m` : ""}</div>
                    {h.is_manual && h.manual_by_profile && (
                      <div className="text-[10px] text-ink-faint mt-0.5">{(<>{"by: "}<NoTranslate>{h.manual_by_profile.full_name}</NoTranslate></>)}{h.manual_note ? <> · &quot;<NoTranslate>{h.manual_note}</NoTranslate>&quot;</> : ""}</div>
                    )}
                  </div>
                </div>
              ))}
              {!historyLoading && history.length === 0 && (
                <div className="p-6 text-center text-ink-mute text-sm">{"No attendance in this period."}</div>
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
                  {historyLoading ? "Loading…" : "Show more"}
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {studentAttHistory.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub={"Click a session to see student detail"}>{"Student Attendance History"}</SectionTitle></div>
          <div className="divide-y divide-line">
            {studentAttHistory.map((h) => (
              <div
                key={h.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint cursor-pointer active:bg-ocean-50 transition-colors"
                onClick={() => openDetailSesi(h.class_id, h.class_name, h.session_date)}
              >
                <span className="w-10 h-10 rounded-xl bg-wave-50 text-wave-600 flex items-center justify-center shrink-0">
                  <Icon name="users" className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm"><NoTranslate>{h.class_name}</NoTranslate></div>
                  <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-ok-600 text-sm">{h.hadir}/{h.total}</div>
                    <div className="text-[10px] text-ink-faint">{"present"}</div>
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
