"use client";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDateLong, mailtoLink } from "@/lib/utils";
import { isCoachPresentLike } from "@/lib/attendance";
import { createClient } from "@/utils/supabase/client";
import { isInClockInWindow } from "../_utils";
import type { ClassRow, ProfileData } from "../_types";

export default function CoachHome({ setOverlay, setActive, coachId, branchId, profile, classes, holidayClassIds, clockedInIds, setClockedInIds, ownSpreadsheets }: {
  setOverlay: (v: string) => void;
  setActive: (tab: string) => void;
  coachId: string; branchId?: string;
  profile: ProfileData | null;
  classes: ClassRow[];
  holidayClassIds: Set<string>;
  clockedInIds: Set<string>;
  setClockedInIds: Dispatch<SetStateAction<Set<string>>>;
  ownSpreadsheets: Map<string, string>;
}) {
  const supabase = createClient();
  const { t } = useLocale();
  const [monthStats, setMonthStats] = useState({ present: 0, leave: 0, sub: 0 });
  const [subClasses, setSubClasses] = useState<{ classId: string; className: string; originalCoach: string }[]>([]);
  // School contact email (for the "Hubungi via Email" button)
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("landing_config").select("contact_email").single();
      setContactEmail(data?.contact_email ?? null);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Class IDs the coach is on leave for today (clock-in blocked)
  const [leaveClassIds, setLeaveClassIds] = useState<Set<string>>(new Set());
  const [latestAnnouncement, setLatestAnnouncement] = useState<{ title: string; body: string } | null>(null);
  const [activeInvoicePeriod, setActiveInvoicePeriod] = useState<{
    id: string;
    label: string;
    date_from: string;
    date_to: string;
  } | null>(null);
  const [existingInvoiceForPeriod, setExistingInvoiceForPeriod] = useState<{
    id: string;
    invoice_number: string | null;
    status: string;
    period_label: string;
  } | null>(null);

  // Classes where THIS coach hasn't filled their own spreadsheet yet
  const unfilledClasses = classes.filter(c => !ownSpreadsheets.has(c.id));


  useEffect(() => {
    if (!coachId) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    supabase.from("coach_attendances").select("id, status, class_id, session_date").eq("coach_id", coachId).gte("session_date", monthStart).lte("session_date", monthEnd)
      .then(({ data }) => {
        if (data) {
          setMonthStats({ present: data.filter(a => isCoachPresentLike(a.status)).length, leave: data.filter(a => a.status === "absent").length, sub: 0 });
          // Track which classes coach already clocked-in today
          const todayClockedIn = new Set<string>(
            (data as { id: string; status: string; class_id: string; session_date: string }[])
              .filter(a => a.session_date === today && isCoachPresentLike(a.status) && a.class_id)
              .map(a => a.class_id)
          );
          setClockedInIds(todayClockedIn);
        }
      });

    // Check for active invoice submission period
    const invPeriodQuery = supabase
      .from("invoice_periods")
      .select("id, label, date_from, date_to")
      .eq("is_open", true);
    if (branchId) {
      invPeriodQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    invPeriodQuery.order("date_to", { ascending: true }).limit(1).then(async ({ data: pData }) => {
      const activeP = (pData && pData.length > 0 ? pData[0] : null) as { id: string; label: string; date_from: string; date_to: string } | null;
      setActiveInvoicePeriod(activeP);
      if (activeP) {
        const { data: invData } = await supabase
          .from("coach_invoices")
          .select("id, invoice_number, status, period_label")
          .eq("coach_id", coachId)
          .or(`period_id.eq.${activeP.id},period_label.eq.${activeP.label}`)
          .not("status", "eq", "cancelled")
          .maybeSingle();
        setExistingInvoiceForPeriod(invData as { id: string; invoice_number: string | null; status: string; period_label: string } | null);
      }
    });

    // Load substitute assignments for today
    supabase.from("coach_leaves")
      .select("id, date_from, date_to, coach:profiles!coach_leaves_coach_id_fkey(full_name), coach_leave_classes(class:classes(id, name))")
      .eq("substitute_id", coachId)
      .eq("status", "approved")
      .lte("date_from", today)
      .gte("date_to", today)
      .then(({ data }) => {
        if (!data) return;
        const subs: { classId: string; className: string; originalCoach: string }[] = [];
        (data as unknown as { coach: { full_name: string } | null; coach_leave_classes: { class: { id: string; name: string } | null }[] }[]).forEach(l => {
          l.coach_leave_classes.forEach(lc => {
            if (lc.class) subs.push({ classId: lc.class.id, className: lc.class.name, originalCoach: l.coach?.full_name ?? "—" });
          });
        });
        setSubClasses(subs);
        setMonthStats(s => ({ ...s, sub: subs.length }));
      });

    // Load own approved leaves for today → block clock-in on those classes
    supabase.from("coach_leaves")
      .select("coach_leave_classes(class_id)")
      .eq("coach_id", coachId)
      .eq("status", "approved")
      .lte("date_from", today)
      .gte("date_to", today)
      .then(({ data }) => {
        if (!data) return;
        const ids = new Set<string>();
        (data as unknown as { coach_leave_classes: { class_id: string }[] }[]).forEach(l =>
          l.coach_leave_classes.forEach(lc => ids.add(lc.class_id))
        );
        setLeaveClassIds(ids);
      });

    // Load latest announcement targeted to coach
    if (branchId) {
      supabase.from("announcements")
        .select("title, body, valid_from, valid_until")
        .eq("branch_id", branchId)
        .eq("active", true)
        .contains("target_roles", ["coach"])
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data: annData }) => {
          const match = (annData ?? []).find((a: { title: string; body: string; valid_from: string | null; valid_until: string | null }) => {
            if (a.valid_from && a.valid_from > today) return false;
            if (a.valid_until && a.valid_until < today) return false;
            return true;
          });
          setLatestAnnouncement(match ? { title: match.title, body: match.body } : null);
        });
    }
  }, [coachId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps


  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  // For multi-branch coaches, filter today's classes to active branch only
  const todayClasses = classes.filter(c =>
    (c.schedule_days ?? []).includes(todayName) &&
    (!branchId || !c.branch_id || c.branch_id === branchId)
  );

  return (
    <div className="space-y-5">
      {/* ── Eye-Catching Invoice Submission Period Reminder Banner ──────── */}
      {activeInvoicePeriod && (
        !existingInvoiceForPeriod ? (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-5 lg:p-6 text-white shadow-float relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-black tracking-wider uppercase text-amber-100 border border-white/30">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    {t("coach.home.invoiceBannerBadge")}
                  </span>
                  {(() => {
                    const diffDays = Math.ceil((new Date(activeInvoicePeriod.date_to).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                    return diffDays <= 0 ? (
                      <span className="text-xs font-bold text-red-100 bg-red-600/70 px-2 py-0.5 rounded-full animate-pulse">
                        {t("coach.home.invoiceBannerTodayDeadline")}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-100">
                        {t("coach.home.invoiceBannerDaysLeft", { days: diffDays })}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="font-display font-black text-xl lg:text-2xl text-white leading-snug">
                  {activeInvoicePeriod.label}
                </h3>
                <p className="text-white/90 text-xs sm:text-sm max-w-xl leading-relaxed">
                  {t("coach.home.invoiceBannerSub", { date: fmtDateLong(activeInvoicePeriod.date_to) })}
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActive("invoice")}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-orange-700 font-display font-extrabold text-sm shadow-card hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Icon name="invoice" className="w-4 h-4 text-orange-600 group-hover:rotate-12 transition-transform" />
                  <span>{t("coach.home.invoiceBannerCta")}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-ocean-50 border border-ocean-200/80 rounded-2xl p-4 lg:p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-ocean-100 text-ocean-700 flex items-center justify-center shrink-0">
                <Icon name="check" className="w-5 h-5 text-ok-600" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ocean-700">{t("coach.home.invoiceBannerSubmittedBadge")}</span>
                  <Status kind={existingInvoiceForPeriod.status === "paid" ? "paid" : existingInvoiceForPeriod.status === "approved" ? "approved" : "pending"}>
                    {existingInvoiceForPeriod.status}
                  </Status>
                </div>
                <div className="font-bold text-ink text-sm mt-0.5">
                  {t("coach.home.invoiceBannerSubmittedTitle", { period: activeInvoicePeriod.label })}
                </div>
                <div className="text-xs text-ink-mute mt-0.5">
                  {t("coach.home.invoiceBannerSubmittedSub", { status: existingInvoiceForPeriod.status })}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive("invoice")}
              className="text-xs font-bold text-ocean-700 hover:text-ocean-800 underline underline-offset-2 cursor-pointer"
            >
              {t("coach.home.invoiceBannerViewPast")} →
            </button>
          </div>
        )
      )}

      {latestAnnouncement && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0">
              <Icon name="bell" className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <Status kind="active" className="!text-[10px] mb-1">{t("coach.home.announcementBadge")}</Status>
              <div className="font-display font-bold text-ink">{latestAnnouncement.title}</div>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{latestAnnouncement.body}</p>
            </div>
          </div>
        </Card>
      )}
      {unfilledClasses.length > 0 && (
        <div className="rounded-2xl border border-warn-200 bg-warn-50 p-4 flex gap-3 items-start">
          <span className="w-9 h-9 rounded-xl bg-warn-100 text-warn-600 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="alert" className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-warn-800 text-sm">{t("coach.home.spreadsheetUnfilledTitle")}</div>
            <p className="text-warn-700 text-xs mt-0.5 leading-relaxed">
              {unfilledClasses.length === 1
                ? <>{t("coach.home.spreadsheetUnfilledSinglePrefix")} <span className="font-semibold">{unfilledClasses[0].name}</span> {t("coach.home.spreadsheetUnfilledSingleSuffix")}</>
                : <>{t("coach.home.spreadsheetUnfilledMultiPrefix", { count: unfilledClasses.length })} <span className="font-semibold">{unfilledClasses.map(c => c.name).join(", ")}</span>.</>
              }
            </p>
            <button
              className="mt-2 text-xs font-semibold text-warn-700 underline underline-offset-2 hover:text-warn-900"
              onClick={() => setActive("kelas")}
            >
              {t("coach.home.openClassMenuBtn")}
            </button>
          </div>
        </div>
      )}
      <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">{t("coach.home.greeting")}</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">{t("coach.home.helloName", { name: profile?.full_name ?? t("coach.home.defaultCoachName") })}</h2>
          <p className="text-white/80 text-sm mt-1.5">{t("coach.home.classesTodayCount", { count: todayClasses.length + subClasses.length })}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 min-w-0">
            {[[t("coach.home.statPresentThisMonth"), monthStats.present.toString()], [t("coach.home.statLeave"), monthStats.leave.toString()], [t("coach.home.statSubstitute"), monthStats.sub.toString()]].map(([l, v]) => (
              <div key={l} className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{l}</div>
                <div className="font-display font-bold text-2xl mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle sub={fmtDateLong(new Date())}>{t("coach.home.classesTodayTitle")}</SectionTitle>
        {todayClasses.length === 0 && subClasses.length === 0 ? (
          <Card><p className="text-ink-mute text-sm">{t("coach.home.noClassesToday")}</p></Card>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((c) => {
              const isHoliday = holidayClassIds.has(c.id);
              const isOnLeave = leaveClassIds.has(c.id);
              const isClockedIn = clockedInIds.has(c.id);
              const inWindow = !isHoliday && !isOnLeave && !isClockedIn && isInClockInWindow(c.time_start, c.time_end);
              return (
                <Card key={c.id} className={isHoliday || isOnLeave ? "opacity-60" : ""}>
                  <div className="flex items-start gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isHoliday ? "bg-warn-50 text-warn-500" : isOnLeave ? "bg-danger-50 text-danger-400" : isClockedIn ? "bg-ok-50 text-ok-600" : "bg-wave-50 text-wave-600"}`}>
                      <Icon name={isHoliday ? "flag" : isOnLeave ? "clipboard" : isClockedIn ? "check" : "swim"} className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{c.name}</div>
                        {isHoliday && <Status kind="holiday">{t("coach.home.holidayBadge")}</Status>}
                        {isOnLeave && <Status kind="inactive">{t("coach.home.onLeaveTodayBadge")}</Status>}
                        {isClockedIn && <Status kind="approved">{t("coach.home.alreadyClockedInBadge")}</Status>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5 font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""} · {c.enrolled}/{c.capacity} member</div>
                      {!isHoliday && !isOnLeave && !isClockedIn && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {inWindow ? (
                            <Btn variant="primary" size="sm" icon="camera" onClick={() => setOverlay(`clockin:${c.id}`)}>{t("coach.home.clockInBtn")}</Btn>
                          ) : (
                            <div className="text-xs text-ink-mute font-semibold flex items-center gap-1">
                              <Icon name="clock" className="w-3.5 h-3.5" />
                              {t("coach.home.outsideWindowHint")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {subClasses.map((s) => {
              const subClass = classes.find(c => c.id === s.classId);
              const isClockedIn = clockedInIds.has(s.classId);
              const inWindow = !isClockedIn && (subClass ? isInClockInWindow(subClass.time_start, subClass.time_end) : false);
              return (
                <Card key={s.classId} className="border-sub-200 bg-sub-50/30">
                  <div className="flex items-start gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isClockedIn ? "bg-ok-50 text-ok-600" : "bg-sub-100 text-sub-600"}`}>
                      <Icon name={isClockedIn ? "check" : "refresh"} className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{s.className}</div>
                        <Status kind="substitute">{t("coach.home.substituteBadge")}</Status>
                        {isClockedIn && <Status kind="approved">{t("coach.home.alreadyClockedInBadge")}</Status>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5">{t("coach.home.substitutingForLabel", { name: s.originalCoach })}</div>
                      {!isClockedIn && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {inWindow ? (
                            <Btn variant="primary" size="sm" icon="camera" onClick={() => setOverlay(`clockin:${s.classId}`)}>{t("coach.home.clockInBtn")}</Btn>
                          ) : (
                            <div className="text-xs text-ink-mute font-semibold flex items-center gap-1">
                              <Icon name="clock" className="w-3.5 h-3.5" />
                              {t("coach.home.outsideWindowHint")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <SectionTitle>{t("coach.home.quickActionsTitle")}</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setOverlay("leave")} className="p-4 rounded-xl bg-paper-tint hover:bg-ocean-50 border border-line text-left">
            <span className="w-9 h-9 rounded-lg bg-white text-ocean-600 flex items-center justify-center mb-2"><Icon name="clipboard" className="w-4 h-4" /></span>
            <div className="font-bold text-sm text-ink">{t("coach.home.requestLeaveTitle")}</div>
            <div className="text-xs text-ink-mute mt-0.5">{t("coach.home.requestLeaveSub")}</div>
          </button>
          <button onClick={() => setOverlay("leave-history")} className="p-4 rounded-xl bg-paper-tint hover:bg-ocean-50 border border-line text-left">
            <span className="w-9 h-9 rounded-lg bg-white text-wave-600 flex items-center justify-center mb-2"><Icon name="calendar" className="w-4 h-4" /></span>
            <div className="font-bold text-sm text-ink">{t("coach.home.leaveHistoryTitle")}</div>
            <div className="text-xs text-ink-mute mt-0.5">{t("coach.home.leaveHistorySub")}</div>
          </button>
        </div>
      </Card>

      <Card>
        <a
          href={mailtoLink(
            t("coach.home.contactSubject"),
            t("coach.home.contactBody", { name: profile?.full_name ?? t("coach.home.defaultCoachName") }),
            contactEmail
          )}
          className="w-full flex items-center gap-3 py-1 group"
        >
          <span className="w-9 h-9 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center group-hover:bg-ocean-100 transition-colors">
            <Icon name="mail" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-ink group-hover:text-ocean-700">{t("coach.home.contactViaEmail")}</span>
        </a>
      </Card>
    </div>
  );
}
