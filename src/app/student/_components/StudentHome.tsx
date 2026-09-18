"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR, waLink } from "@/lib/utils";
import { isMemberPresentLike } from "@/lib/attendance";
import { createClient } from "@/utils/supabase/client";
import type { TabId } from "../_types";

export default function MemberHome({
  setActive, memberId, memberName, branchId,
}: {
  setActive: (id: TabId) => void;
  memberId: string;
  memberName: string;
  branchId: string;
}) {
  const supabase = createClient();
  const [monthAttend, setMonthAttend] = useState({ present: 0, total: 0 });
  const [activeClasses, setActiveClasses] = useState(0);
  const [memberInfo, setMemberInfo] = useState<{ type: string; remaining_sessions: number | null; total_sessions: number | null } | null>(null);
  const [pendingBill, setPendingBill] = useState<{ period: string; amount: number; class_name: string } | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<{ title: string; body: string } | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<{ date: string; day: string; time: string; class_name: string; coach: string; class_id: string }[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<{ date_from: string; date_to: string; class_ids: Set<string> }[]>([]);
  const [privateReminder, setPrivateReminder] = useState<{ remaining: number; total: number } | null>(null);


  useEffect(() => {
    if (!memberId) return;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Attendance this month
    supabase.from("member_attendances")
      .select("id, status")
      .eq("member_id", memberId)
      .gte("session_date", monthStart)
      .then(({ data }) => {
        if (data) {
          setMonthAttend({ present: data.filter((r) => isMemberPresentLike(r.status)).length, total: data.length });
        }
      });

    // Active classes
    supabase.from("member_classes")
      .select("class_id", { count: "exact" })
      .eq("member_id", memberId)
      .then(({ count }) => setActiveClasses(count ?? 0));

    // Pending bill
    supabase.from("bills")
      .select("period_label, total, classes(name)")
      .eq("member_id", memberId)
      .eq("status", "unpaid")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const cls = data.classes as unknown as { name: string } | null;
          setPendingBill({ period: data.period_label, amount: (data as unknown as { total: number }).total, class_name: cls?.name ?? "" });
        }
      });

    // Member info (type, sessions) — used for private stat display & reminder
    supabase.from("members")
      .select("type, remaining_sessions, total_sessions")
      .eq("id", memberId)
      .single()
      .then(({ data }) => {
        if (data) {
          setMemberInfo({ type: data.type, remaining_sessions: data.remaining_sessions, total_sessions: data.total_sessions });
          if (data.type === "private" && data.remaining_sessions != null && data.remaining_sessions <= 1) {
            setPrivateReminder({ remaining: data.remaining_sessions, total: data.total_sessions ?? 0 });
          }
        }
      });

    // Latest announcement — target_all OR targeted to member's classes
    supabase.from("member_classes").select("class_id").eq("member_id", memberId)
      .then(async ({ data: mcData }) => {
        const classIds = (mcData ?? []).map((mc) => (mc as unknown as { class_id: string }).class_id);
        // Fetch all active announcements for the branch
        const today = new Date().toISOString().slice(0, 10);
        const { data: allAnns } = await supabase.from("announcements")
          .select("title, body, target_all, valid_from, valid_until, target_roles, announcement_classes(class_id)")
          .eq("branch_id", branchId).eq("active", true)
          .order("created_at", { ascending: false }).limit(20);
        if (!allAnns) return;
        // Filter: valid_from <= today AND (valid_until is null OR valid_until >= today)
        // Show first announcement that targets member (or legacy empty target_roles)
        // AND is target_all OR has a matching class
        const match = (allAnns as unknown as { title: string; body: string; target_all: boolean; valid_from: string | null; valid_until: string | null; target_roles: string[]; announcement_classes: { class_id: string }[] }[])
          .find((a) => {
            if (a.valid_from && a.valid_from > today) return false;
            if (a.valid_until && a.valid_until < today) return false;
            // Backward compat: empty target_roles = legacy, show to member
            const roles = a.target_roles ?? [];
            if (roles.length > 0 && !roles.includes("member")) return false;
            return a.target_all || a.announcement_classes.some((ac) => classIds.includes(ac.class_id));
          });
        if (match) setLatestAnnouncement({ title: match.title, body: match.body });
      });

    // Approved leaves for home schedule filtering
    supabase.from("member_leaves")
      .select("date_from, date_to, member_leave_classes(class_id)")
      .eq("member_id", memberId)
      .eq("status", "approved")
      .then(({ data }) => {
        if (!data) return;
        setApprovedLeaves((data as unknown as { date_from: string; date_to: string; member_leave_classes: { class_id: string }[] }[]).map(l => ({
          date_from: l.date_from,
          date_to: l.date_to,
          class_ids: new Set(l.member_leave_classes.map(lc => lc.class_id)),
        })));
      });

    // Upcoming sessions from member_classes → classes (days + time_start)
    supabase.from("member_classes")
      .select("classes(id, name, schedule_days, time_start, time_end, schedule_times, class_coaches(profile:profiles(full_name)))")
      .eq("member_id", memberId)
      .then(({ data }) => {
        if (!data) return;
        const sessions: typeof upcomingSessions = [];
        const today = new Date();
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        data.forEach((mc) => {
          const cls = mc.classes as unknown as { id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null; schedule_times?: { day: string; time_start: string; time_end: string }[] | null; class_coaches: { profile: { full_name: string } | null }[] } | null;
          if (!cls || !cls.schedule_days) return;
          const firstCoach = cls.class_coaches?.[0]?.profile;
          const coachName = firstCoach?.full_name ?? "—";
          cls.schedule_days.forEach((day) => {
            const dayIdx = dayNames.indexOf(day);
            if (dayIdx === -1) return;
            const slot = cls.schedule_times?.find(s => s.day === day);
            const timeStart = slot?.time_start || cls.time_start || "";
            const timeEnd   = slot?.time_end   || cls.time_end   || "";
            for (let offset = 0; offset <= 14; offset++) {
              const d = new Date(today);
              d.setDate(today.getDate() + offset);
              if (d.getDay() === dayIdx) {
                sessions.push({
                  date: d.toISOString().slice(0, 10),
                  day,
                  time: timeStart ? `${timeStart.slice(0,5)}${timeEnd ? `–${timeEnd.slice(0,5)}` : ""}` : "—",
                  class_name: cls.name,
                  coach: coachName,
                  class_id: cls.id,
                });
                break;
              }
            }
          });
        });
        sessions.sort((a, b) => a.date.localeCompare(b.date));
        setUpcomingSessions(sessions.slice(0, 4));
      });
  }, [memberId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSessionOnLeave = (date: string, classId: string) =>
    approvedLeaves.some(l => date >= l.date_from && date <= l.date_to && (l.class_ids.size === 0 || l.class_ids.has(classId)));


  return (
    <div className="space-y-5">
      <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">{"WELCOME"}</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">{(<>{"Hi, "}<NoTranslate>{memberName || "…"}</NoTranslate>{" 👋"}</>)}</h2>
          <p className="text-white/80 text-sm mt-1">{"Stay motivated for today's practice!"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Present this month"}</div>
              <div className="font-display font-bold text-2xl mt-0.5">{monthAttend.present}</div>
            </div>
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
              {memberInfo?.type === "private" ? (
                <>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Sessions left"}</div>
                  <div className="font-display font-bold text-2xl mt-0.5">{memberInfo.remaining_sessions ?? "—"}</div>
                </>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Active classes"}</div>
                  <div className="font-display font-bold text-2xl mt-0.5">{activeClasses}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {pendingBill && (
        <Card className="bg-warn-50 border-warn-500/20">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-warn-600 flex items-center justify-center shrink-0"><Icon name="wallet" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-ink">{`Bill ${pendingBill.period}`}</div>
              <p className="text-sm text-ink-soft mt-0.5">{fmtIDR(pendingBill.amount)} · <NoTranslate>{pendingBill.class_name}</NoTranslate></p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn variant="outline" size="sm" onClick={() => setActive("bills")}>{"View Bill"}</Btn>
            <a href={waLink(`Hello Admin, I would like to confirm payment for ${pendingBill.period} for ${memberName}. Here is the transfer proof:`)} target="_blank" rel="noreferrer">
              <Btn variant="wa" size="sm" icon="whatsapp" className="w-full">{"Contact Admin"}</Btn>
            </a>
          </div>
        </Card>
      )}

      {privateReminder && (
        <Card className="bg-wave-50 border-wave-200">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-600 flex items-center justify-center shrink-0 animate-pulse"><Icon name="sparkle" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-ink">{"Session package running low"}</div>
              <p className="text-sm text-ink-soft mt-0.5">
                {privateReminder.remaining === 0
                  ? "Your session package has run out. Contact admin to renew."
                  : `${privateReminder.remaining} sessions left in your package. Renew soon so training isn't interrupted.`}
              </p>
            </div>
          </div>
          <a href={waLink(`Hello Admin, I would like to renew the private session package for ${memberName}. Current remaining sessions: ${privateReminder.remaining}.`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full">
            <Btn variant="wa" size="sm" icon="whatsapp" className="w-full">{"Contact Admin — Renew Package"}</Btn>
          </a>
        </Card>
      )}

      {latestAnnouncement && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0"><Icon name="bell" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <Status kind="active" className="!text-[10px] mb-1">{"ANNOUNCEMENT"}</Status>
              <div className="font-display font-bold text-ink"><NoTranslate>{latestAnnouncement.title}</NoTranslate></div>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed"><NoTranslate>{latestAnnouncement.body}</NoTranslate></p>
            </div>
          </div>
        </Card>
      )}

      {upcomingSessions.length > 0 && (
        <div>
          <SectionTitle sub={"Upcoming sessions"}>{"Next Schedule"}</SectionTitle>
          <div className="space-y-2.5">
            {upcomingSessions.map((s, i) => {
              const d = new Date(s.date + "T00:00:00");
              const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
              const dateNum = d.getDate();
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const monthShort = monthNames[d.getMonth()];
              const onLeave = isSessionOnLeave(s.date, s.class_id);
              return (
                <Card key={i} className={`!p-3${onLeave ? " opacity-60" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-14 text-center shrink-0">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{dayShort}</div>
                      <div className={`font-display font-bold text-xl ${onLeave ? "text-ink-mute" : "text-ocean-700"}`}>{dateNum}</div>
                      <div className="text-[10px] text-ink-mute">{monthShort}</div>
                    </div>
                    <div className="flex-1 min-w-0 pl-3 border-l border-line">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-ink text-sm truncate"><NoTranslate>{s.class_name}</NoTranslate></div>
                        {onLeave && <span className="text-[10px] font-bold uppercase tracking-wide text-warn-600 bg-warn-50 px-1.5 py-0.5 rounded shrink-0">{"Leave"}</span>}
                      </div>
                      <div className="text-xs text-ink-mute font-mono mt-0.5">{s.time} · <NoTranslate>{s.coach}</NoTranslate></div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
