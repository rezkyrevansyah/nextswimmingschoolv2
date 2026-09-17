"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { useLocale } from "@/components/providers/LocaleProvider";
import { waLink, toLocalDateStr } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const ID_DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
function translateDayName(day: string, longDays: string[]): string {
  const idx = ID_DAY_NAMES.indexOf(day);
  if (idx !== -1 && longDays && longDays[idx]) return longDays[idx];
  return day;
}
function translateDayShort(day: string, shortDays: string[]): string {
  const idx = ID_DAY_NAMES.indexOf(day);
  if (idx !== -1 && shortDays && shortDays[idx]) return shortDays[idx];
  return day.slice(0, 2);
}

export default function MemberSchedule({ memberId }: { memberId: string }) {
  const { t, tArray } = useLocale();
  const supabase = createClient();
  const [classes, setClasses] = useState<{ id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null; schedule_times?: { day: string; time_start: string; time_end: string }[] | null; location: string; goals: string | null; description: string | null; coaches: { name: string; phone: string | null; role: string }[] }[]>([]);
  const [sessions, setSessions] = useState<{ date: string; day: string; time: string; class_id: string; onLeave?: boolean }[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());
  // approved leave intervals: { date_from, date_to, class_ids }
  const [leaveIntervals, setLeaveIntervals] = useState<{ date_from: string; date_to: string; class_ids: Set<string> }[]>([]);
  const [sessionPage, setSessionPage] = useState(0);
  const PAGE_SIZE = 8;

  const longDays = tArray("common.days.long");
  const shortDays = tArray("common.days.short");
  const monthNames = tArray("common.months.short");

  useEffect(() => {
    if (!memberId) return;

    // Load approved leaves for this member
    supabase.from("member_leaves")
      .select("date_from, date_to, member_leave_classes(class_id)")
      .eq("member_id", memberId)
      .eq("status", "approved")
      .then(({ data }) => {
        if (!data) return;
        setLeaveIntervals((data as unknown as { date_from: string; date_to: string; member_leave_classes: { class_id: string }[] }[]).map(l => ({
          date_from: l.date_from,
          date_to: l.date_to,
          class_ids: new Set(l.member_leave_classes.map(lc => lc.class_id)),
        })));
      });

    supabase.from("member_classes")
      .select("classes(id, name, schedule_days, time_start, time_end, schedule_times, location_name, location_type, external_location_name, external_location_address, google_maps_url, goals, description, class_coaches(role, profile:profiles(full_name, phone)))")
      .eq("member_id", memberId)
      .then(async ({ data }) => {
        if (!data) return;
        const cls = data.map((mc) => {
          const c = mc.classes as unknown as { id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null; schedule_times?: { day: string; time_start: string; time_end: string }[] | null; location_name: string | null; location_type?: string; external_location_name?: string | null; external_location_address?: string | null; google_maps_url?: string | null; goals: string | null; description: string | null; class_coaches: { role: string; profile: { full_name: string; phone: string | null } | null }[] } | null;
          if (!c) return null;
          const coaches = (c.class_coaches ?? [])
            .filter((cc): cc is { role: string; profile: { full_name: string; phone: string | null } } => cc.profile !== null)
            .sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0))
            .map((cc) => ({ name: cc.profile.full_name, phone: cc.profile.phone ?? null, role: cc.role }));
          const locStr = c.location_type === "external" ? (c.external_location_name || c.location_name || "Lokasi External") : (c.location_name || "—");
          return { id: c.id, name: c.name, schedule_days: c.schedule_days ?? [], time_start: c.time_start, time_end: c.time_end ?? null, schedule_times: c.schedule_times ?? null, location: locStr, location_type: c.location_type ?? "branch", external_location_address: c.external_location_address ?? null, google_maps_url: c.google_maps_url ?? null, goals: c.goals ?? null, description: c.description ?? null, coaches };
        }).filter(Boolean) as typeof classes;
        setClasses(cls);
        setSessionPage(0);

        // Fetch today's holidays for these classes
        const classIds = cls.map(c => c.id);
        if (classIds.length > 0) {
          const today = toLocalDateStr();
          const { data: hols } = await supabase.from("class_holidays").select("class_id").in("class_id", classIds).eq("holiday_date", today);
          if (hols) setHolidayClassIds(new Set(hols.map((h: { class_id: string }) => h.class_id)));
        }

        // Build upcoming sessions
        const today = new Date();
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const upcoming: typeof sessions = [];
        cls.forEach((c) => {
          c.schedule_days.forEach((day) => {
            const dayIdx = dayNames.indexOf(day);
            if (dayIdx === -1) return;
            const slot = c.schedule_times?.find(s => s.day === day) ?? null;
            const ts = slot?.time_start || c.time_start || "";
            const te = slot?.time_end   || c.time_end   || "";
            const timeLabel = ts ? `${ts.slice(0,5)}${te ? `–${te.slice(0,5)}` : ""}` : "—";
            for (let w = 0; w < 4; w++) {
              const d = new Date(today);
              const diff = ((dayIdx - today.getDay()) + 7) % 7 + (w * 7);
              d.setDate(today.getDate() + diff);
              upcoming.push({ date: d.toISOString().slice(0, 10), day, time: timeLabel, class_id: c.id });
            }
          });
        });
        upcoming.sort((a, b) => a.date.localeCompare(b.date));
        setSessions(upcoming);
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive which sessions are on leave (runs whenever sessions or leaveIntervals change)
  const isOnLeave = (date: string, classId: string) =>
    leaveIntervals.some(l => date >= l.date_from && date <= l.date_to && (l.class_ids.size === 0 || l.class_ids.has(classId)));

  const totalSessions = sessions.length;
  const totalPages = Math.ceil(totalSessions / PAGE_SIZE);
  const pagedSessions = sessions.slice(sessionPage * PAGE_SIZE, sessionPage * PAGE_SIZE + PAGE_SIZE);
  const sessionRangeStart = sessionPage * PAGE_SIZE + 1;
  const sessionRangeEnd = Math.min(sessionPage * PAGE_SIZE + PAGE_SIZE, totalSessions);

  return (
    <div className="space-y-5">
      <SectionTitle sub={t("member.schedule.enrolledClassesSub")}>{t("member.schedule.enrolledClassesTitle")}</SectionTitle>
      {classes.map((c) => {
        const isHoliday = holidayClassIds.has(c.id);
        return (
        <Card key={c.id} padded={false} className={`overflow-hidden${isHoliday ? " opacity-70" : ""}`}>
          <div className="p-5 bg-ocean-700 text-white">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="font-display font-bold text-xl flex-1 min-w-0">{c.name}</div>
              {isHoliday && <Status kind="holiday" className="border-white/30">{t("member.schedule.holidayToday")}</Status>}
            </div>
            <div className="mt-2 space-y-2">
              {c.coaches.length === 0 ? (
                <span className="text-wave-200/60 text-sm">{t("member.schedule.noCoach")}</span>
              ) : c.coaches.length === 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={c.coaches[0].name} size={24} className="shrink-0" />
                    <span className="flex-1 min-w-0 text-wave-200 text-sm truncate">{c.coaches[0].name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.coaches[0].role === "head" ? "bg-wave-400/20 text-wave-200" : "bg-white/10 text-white/50"}`}>
                      {c.coaches[0].role === "head" ? t("member.schedule.headCoach") : t("member.schedule.assistantCoach")}
                    </span>
                  </div>
                  {c.coaches[0].phone && (
                    <a href={waLink(t("member.schedule.waCoachMessage", { className: c.name }), c.coaches[0].phone)} target="_blank" rel="noreferrer"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                      <Icon name="whatsapp" className="w-3.5 h-3.5" />
                      {t("member.schedule.chatCoach")}
                    </a>
                  )}
                </div>
              ) : (
                c.coaches.map((coach, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={coach.name} size={24} className="shrink-0" />
                      <span className="flex-1 min-w-0 text-wave-200 text-sm truncate">{coach.name}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${coach.role === "head" ? "bg-wave-400/20 text-wave-200" : "bg-white/10 text-white/50"}`}>
                        {coach.role === "head" ? t("member.schedule.headCoach") : t("member.schedule.assistantCoach")}
                      </span>
                    </div>
                    {coach.phone && (
                      <a href={waLink(t("member.schedule.waCoachMessage", { className: c.name }), coach.phone)} target="_blank" rel="noreferrer"
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                        <Icon name="whatsapp" className="w-3.5 h-3.5" />
                        {t("member.schedule.chatCoach")}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          {(c.goals || c.description) && (
            <div className="px-5 py-3 border-b border-line space-y-2">
              {c.goals && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("member.schedule.goals")}</div>
                  <p className="text-xs text-ink-soft mt-0.5">{c.goals}</p>
                </div>
              )}
              {c.description && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("member.schedule.description")}</div>
                  <p className="text-xs text-ink-soft mt-0.5">{c.description}</p>
                </div>
              )}
            </div>
          )}
          <div className="divide-y divide-line">
            {c.schedule_days.map((d, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center text-xs font-bold">{translateDayShort(d, shortDays)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{translateDayName(d, longDays)}</div>
                  {(() => {
                    const slot = c.schedule_times?.find(s => s.day === d) ?? null;
                    const ts = slot?.time_start || c.time_start || "";
                    const te = slot?.time_end   || c.time_end   || "";
                    return <div className="text-xs text-ink-mute font-mono">{ts.slice(0,5)}{te ? `–${te.slice(0,5)}` : ""} · {c.location}</div>;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </Card>
        );
      })}

      {sessions.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line">
            <SectionTitle sub={t("member.schedule.upcomingSub")}>{t("member.schedule.upcomingTitle")}</SectionTitle>
          </div>
          <div className="divide-y divide-line">
            {pagedSessions.map((s, i) => {
              const d = new Date(s.date + "T00:00:00");
              const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]}`;
              const yearStr = `${d.getFullYear()}`;
              const cls = classes.find((c) => c.id === s.class_id);
              const onLeave = isOnLeave(s.date, s.class_id);
              return (
                <div key={i} className={`px-4 py-3 flex items-center gap-3 min-w-0${onLeave ? " opacity-50" : ""}`}>
                  <div className="shrink-0 w-14 text-center">
                    <div className="font-bold text-sm text-ink leading-tight">{dateStr}</div>
                    <div className="text-[11px] text-ink-mute leading-tight">{yearStr}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink leading-tight">{cls?.name ?? "—"}</div>
                    <div className="text-xs text-ink-mute mt-0.5">{translateDayName(s.day, longDays)} · {s.time}</div>
                  </div>
                  {onLeave && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-warn-600 bg-warn-50 px-1.5 py-0.5 rounded">
                      {t("member.schedule.onLeave")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-line flex items-center justify-between gap-3">
              <button
                onClick={() => setSessionPage((p) => Math.max(0, p - 1))}
                disabled={sessionPage === 0}
                className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron-left" className="w-4 h-4" />
                {t("member.schedule.prev")}
              </button>
              <span className="text-xs text-ink-mute">
                {t("member.schedule.pageInfo", { start: sessionRangeStart, end: sessionRangeEnd, total: totalSessions })}
              </span>
              <button
                onClick={() => setSessionPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={sessionPage >= totalPages - 1}
                className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t("member.schedule.next")}
                <Icon name="chevron-right" className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {classes.length === 0 && (
        <div className="text-center py-12 text-ink-mute text-sm">{t("member.schedule.emptyClasses")}</div>
      )}
    </div>
  );
}
