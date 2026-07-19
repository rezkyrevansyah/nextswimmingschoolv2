"use client";
import { useState, useEffect, useCallback } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import QRBox from "@/components/ui/QRBox";
import Modal from "@/components/ui/Modal";
import MobileNav from "@/components/layout/MobileNav";
import type { NavItem as MobileNavItem } from "@/components/layout/Sidebar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { fmtIDR, fmtDate, waLink } from "@/lib/utils";
import { downloadRaporPdf, printSingleRaporPopup, type PrintCriterion, type PrintBestTime } from "@/lib/printRapor";
import { resolveRaporSigner } from "@/lib/rapor";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";

type TabId = "home" | "schedule" | "absen" | "bills" | "leave" | "rapor" | "profile";
type TFn = (key: string, vars?: Record<string, string | number>) => string;

function getNavItems(t: TFn): MobileNavItem[] {
  return [
    { id: "home",     label: t("member.nav.home"),   short: t("member.nav.shortHome"),     icon: "home"     },
    { id: "schedule", label: t("member.nav.schedule"), short: t("member.nav.shortSchedule"), icon: "calendar" },
    { id: "bills",    label: t("member.nav.bills"),  short: t("member.nav.shortBills"),    icon: "wallet"   },
    { id: "rapor",    label: t("member.nav.rapor"),  short: t("member.nav.shortRapor"),    icon: "book"     },
    { id: "profile",  label: t("member.nav.profile"),short: t("member.nav.shortProfile"),  icon: "user"     },
  ];
}

function getAllItems(t: TFn): MobileNavItem[] {
  return [
    ...getNavItems(t).slice(0, 2),
    { id: "absen",   label: t("member.nav.attendance"), short: t("member.nav.shortAttendance"), icon: "check"     },
    { id: "bills",   label: t("member.nav.bills"),      short: t("member.nav.shortBills"),      icon: "wallet"    },
    { id: "leave",   label: t("member.nav.leave"),      short: t("member.nav.shortLeave"),      icon: "clipboard" },
    { id: "rapor",   label: t("member.nav.rapor"),      short: t("member.nav.shortRapor"),      icon: "book"      },
    { id: "profile", label: t("member.nav.profile"),    short: t("member.nav.shortProfile"),    icon: "user"      },
  ];
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children, active, setActive, name, branchName, userId, avatarUrl, isSchoolAffiliate }: {
  children: React.ReactNode;
  active: TabId;
  setActive: (id: TabId) => void;
  name: string;
  branchName: string;
  userId: string;
  avatarUrl?: string | null;
  isSchoolAffiliate?: boolean;
}) {
  const { t } = useLocale();
  const navItems = getNavItems(t);
  const allItems = getAllItems(t);

  const title = active === "home" ? t("member.shell.greeting", { name: name || "…" }) : {
    schedule: t("member.nav.schedule"), absen: t("member.nav.attendance"), bills: t("member.nav.bills"),
    leave: t("member.nav.leave"), rapor: t("member.nav.rapor"), profile: t("member.nav.profile"),
  }[active] ?? "";

  const sub = active === "home"
    ? t("member.shell.subMember", { branch: branchName || "…" })
    : { schedule: t("member.shell.subSchedule"), absen: t("member.shell.subAttendance"),
        bills: t("member.shell.subBills"), leave: t("member.shell.subLeave"),
        rapor: t("member.shell.subRapor"), profile: t("member.shell.subProfile") }[active] ?? "";

  return (
    <div className="min-h-screen bg-paper-tint pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-line">
        <div className="px-4 lg:px-7 h-16 flex items-center gap-3">
          <Logo size={32} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">{title}</h1>
            <p className="text-xs text-ink-mute truncate">{sub}</p>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {allItems.filter(it => !(isSchoolAffiliate && it.id === "bills")).map((it) => (
              <button key={it.id} onClick={() => setActive(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon ?? ""} className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </div>
          <LanguageSwitcher />
          <Bell userId={userId} />
          <button onClick={() => setActive("profile")} title="Profile">
            <Avatar name={name} src={avatarUrl ?? undefined} size={36} />
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 lg:p-7 anim-in">{children}</main>
      <MobileNav items={navItems.filter(it => !(isSchoolAffiliate && it.id === "bills"))} active={active} onSelect={(id) => setActive(id as TabId)} />
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────────

function MemberHome({
  setActive, memberId, memberName, branchId,
}: {
  setActive: (id: TabId) => void;
  memberId: string;
  memberName: string;
  branchId: string;
}) {
  const { t, tArray } = useLocale();
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
          setMonthAttend({ present: data.filter((r) => r.status === "hadir").length, total: data.length });
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
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">{t("member.home.welcome")}</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">{t("member.home.greeting", { name: memberName || "…" })}</h2>
          <p className="text-white/80 text-sm mt-1">{t("member.home.encouragement")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("member.home.presentThisMonth")}</div>
              <div className="font-display font-bold text-2xl mt-0.5">{monthAttend.present}</div>
            </div>
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
              {memberInfo?.type === "private" ? (
                <>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("member.home.remainingSessions")}</div>
                  <div className="font-display font-bold text-2xl mt-0.5">{memberInfo.remaining_sessions ?? "—"}</div>
                </>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("member.home.activeClasses")}</div>
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
              <div className="font-display font-bold text-ink">{t("member.home.billTitle", { period: pendingBill.period })}</div>
              <p className="text-sm text-ink-soft mt-0.5">{fmtIDR(pendingBill.amount)} · {pendingBill.class_name}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn variant="outline" size="sm" onClick={() => setActive("bills")}>{t("member.home.viewBill")}</Btn>
            <a href={waLink(`Halo Admin, saya ingin konfirmasi pembayaran ${pendingBill.period} untuk ${memberName}. Berikut bukti transfer:`)} target="_blank" rel="noreferrer">
              <Btn variant="wa" size="sm" icon="whatsapp" className="w-full">{t("member.home.contactAdmin")}</Btn>
            </a>
          </div>
        </Card>
      )}

      {privateReminder && (
        <Card className="bg-wave-50 border-wave-200">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-600 flex items-center justify-center shrink-0 animate-pulse"><Icon name="sparkle" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-ink">{t("member.home.packageRunningLow")}</div>
              <p className="text-sm text-ink-soft mt-0.5">
                {privateReminder.remaining === 0
                  ? t("member.home.packageEmpty")
                  : t("member.home.packageLow", { remaining: privateReminder.remaining })}
              </p>
            </div>
          </div>
          <a href={waLink(`Halo Admin, saya ingin memperpanjang paket sesi private untuk ${memberName}. Sisa sesi saat ini: ${privateReminder.remaining}.`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full">
            <Btn variant="wa" size="sm" icon="whatsapp" className="w-full">{t("member.home.renewPackage")}</Btn>
          </a>
        </Card>
      )}

      {latestAnnouncement && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0"><Icon name="bell" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <Status kind="active" className="!text-[10px] mb-1">{t("member.home.announcement")}</Status>
              <div className="font-display font-bold text-ink">{latestAnnouncement.title}</div>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{latestAnnouncement.body}</p>
            </div>
          </div>
        </Card>
      )}

      {upcomingSessions.length > 0 && (
        <div>
          <SectionTitle sub={t("member.home.upcomingSub")}>{t("member.home.upcomingTitle")}</SectionTitle>
          <div className="space-y-2.5">
            {upcomingSessions.map((s, i) => {
              const d = new Date(s.date + "T00:00:00");
              const dayShort = tArray("common.days.short")[d.getDay()];
              const dateNum = d.getDate();
              const monthNames = tArray("common.months.short");
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
                        <div className="font-semibold text-ink text-sm truncate">{s.class_name}</div>
                        {onLeave && <span className="text-[10px] font-bold uppercase tracking-wide text-warn-600 bg-warn-50 px-1.5 py-0.5 rounded shrink-0">{t("member.home.onLeaveBadge")}</span>}
                      </div>
                      <div className="text-xs text-ink-mute font-mono mt-0.5">{s.time} · {s.coach}</div>
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

// ── Jadwal ─────────────────────────────────────────────────────────────────────

function MemberSchedule({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const [classes, setClasses] = useState<{ id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null; schedule_times?: { day: string; time_start: string; time_end: string }[] | null; location: string; goals: string | null; description: string | null; coaches: { name: string; phone: string | null; role: string }[] }[]>([]);
  const [sessions, setSessions] = useState<{ date: string; day: string; time: string; class_id: string; onLeave?: boolean }[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());
  // approved leave intervals: { date_from, date_to, class_ids }
  const [leaveIntervals, setLeaveIntervals] = useState<{ date_from: string; date_to: string; class_ids: Set<string> }[]>([]);
  const [sessionPage, setSessionPage] = useState(0);
  const PAGE_SIZE = 8;


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
      .select("classes(id, name, schedule_days, time_start, time_end, schedule_times, location_name, goals, description, class_coaches(role, profile:profiles(full_name, phone)))")
      .eq("member_id", memberId)
      .then(async ({ data }) => {
        if (!data) return;
        const cls = data.map((mc) => {
          const c = mc.classes as unknown as { id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null; schedule_times?: { day: string; time_start: string; time_end: string }[] | null; location_name: string | null; goals: string | null; description: string | null; class_coaches: { role: string; profile: { full_name: string; phone: string | null } | null }[] } | null;
          if (!c) return null;
          const coaches = (c.class_coaches ?? [])
            .filter((cc): cc is { role: string; profile: { full_name: string; phone: string | null } } => cc.profile !== null)
            .map((cc) => ({ name: cc.profile.full_name, phone: cc.profile.phone ?? null, role: cc.role }));
          return { id: c.id, name: c.name, schedule_days: c.schedule_days ?? [], time_start: c.time_start, time_end: c.time_end ?? null, schedule_times: c.schedule_times ?? null, location: c.location_name ?? "—", goals: c.goals ?? null, description: c.description ?? null, coaches };
        }).filter(Boolean) as typeof classes;
        setClasses(cls);
        setSessionPage(0);

        // Fetch today's holidays for these classes
        const classIds = cls.map(c => c.id);
        if (classIds.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
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
   

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  const totalSessions = sessions.length;
  const totalPages = Math.ceil(totalSessions / PAGE_SIZE);
  const pagedSessions = sessions.slice(sessionPage * PAGE_SIZE, sessionPage * PAGE_SIZE + PAGE_SIZE);
  const sessionRangeStart = sessionPage * PAGE_SIZE + 1;
  const sessionRangeEnd = Math.min(sessionPage * PAGE_SIZE + PAGE_SIZE, totalSessions);

  return (
    <div className="space-y-5">
      <SectionTitle sub="Kelas terdaftar">Kelas Anda</SectionTitle>
      {classes.map((c) => {
        const isHoliday = holidayClassIds.has(c.id);
        return (
        <Card key={c.id} padded={false} className={`overflow-hidden${isHoliday ? " opacity-70" : ""}`}>
          <div className="p-5 bg-ocean-700 text-white">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="font-display font-bold text-xl flex-1 min-w-0">{c.name}</div>
              {isHoliday && <Status kind="holiday" className="border-white/30">Libur Hari Ini</Status>}
            </div>
            <div className="mt-2 space-y-2">
              {c.coaches.length === 0 ? (
                <span className="text-wave-200/60 text-sm">Belum ada coach</span>
              ) : c.coaches.length === 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={c.coaches[0].name} size={24} className="shrink-0" />
                    <span className="flex-1 min-w-0 text-wave-200 text-sm truncate">{c.coaches[0].name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.coaches[0].role === "head" ? "bg-wave-400/20 text-wave-200" : "bg-white/10 text-white/50"}`}>
                      {c.coaches[0].role === "head" ? "Head Coach" : "Assistant Coach"}
                    </span>
                  </div>
                  {c.coaches[0].phone && (
                    <a href={waLink(`Halo Coach, saya ingin bertanya mengenai kelas ${c.name}.`, c.coaches[0].phone)} target="_blank" rel="noreferrer"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                      <Icon name="whatsapp" className="w-3.5 h-3.5" />
                      Chat Coach
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
                        {coach.role === "head" ? "Head Coach" : "Assistant Coach"}
                      </span>
                    </div>
                    {coach.phone && (
                      <a href={waLink(`Halo Coach, saya ingin bertanya mengenai kelas ${c.name}.`, coach.phone)} target="_blank" rel="noreferrer"
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                        <Icon name="whatsapp" className="w-3.5 h-3.5" />
                        Chat Coach
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
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tujuan</div>
                  <p className="text-xs text-ink-soft mt-0.5">{c.goals}</p>
                </div>
              )}
              {c.description && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Deskripsi</div>
                  <p className="text-xs text-ink-soft mt-0.5">{c.description}</p>
                </div>
              )}
            </div>
          )}
          <div className="divide-y divide-line">
            {c.schedule_days.map((d, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center text-xs font-bold">{d.slice(0, 2)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{d}</div>
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
            <SectionTitle sub="4 minggu ke depan">Sesi yang akan datang</SectionTitle>
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
                    <div className="text-xs text-ink-mute mt-0.5">{s.day} · {s.time}</div>
                  </div>
                  {onLeave && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-warn-600 bg-warn-50 px-1.5 py-0.5 rounded">
                      Izin
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
                Sebelumnya
              </button>
              <span className="text-xs text-ink-mute">
                {sessionRangeStart}–{sessionRangeEnd} dari {totalSessions} sesi
              </span>
              <button
                onClick={() => setSessionPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={sessionPage >= totalPages - 1}
                className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
                <Icon name="chevron-right" className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {classes.length === 0 && (
        <div className="text-center py-12 text-ink-mute text-sm">Belum terdaftar di kelas manapun.</div>
      )}
    </div>
  );
}

// ── Absensi ────────────────────────────────────────────────────────────────────

function MemberAbsensi({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [filterClass, setFilterClass] = useState("all");
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [allRows, setAllRows] = useState<{ id: string; session_date: string; status: string; notes: string | null; class_name: string; class_id: string; time: string }[]>([]);

  useEffect(() => {
    if (!memberId) return;
    // Load member's classes for filter dropdown
    supabase.from("member_classes").select("classes(id, name)").eq("member_id", memberId)
      .then(({ data }) => {
        if (data) setMyClasses(data.map((mc) => {
          const c = mc.classes as unknown as { id: string; name: string } | null;
          return { id: c?.id ?? "", name: c?.name ?? "" };
        }).filter((c) => c.id));
      });
    // Load all attendance (no limit so month filter works client-side)
    supabase.from("member_attendances")
      .select("id, session_date, status, class_id, classes(name, time_start)")
      .eq("member_id", memberId)
      .order("session_date", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return;
        setAllRows(data.map((r) => {
          const cls = r.classes as unknown as { name: string; time_start: string } | null;
          return { id: r.id, session_date: r.session_date, status: r.status, notes: null as string | null, class_name: cls?.name ?? "—", class_id: (r as unknown as { class_id: string }).class_id ?? "", time: cls?.time_start ?? "—" };
        }));
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = allRows.filter((r) => {
    const matchMonth = !filterMonth || r.session_date.startsWith(filterMonth);
    const matchClass = filterClass === "all" || r.class_id === filterClass;
    return matchMonth && matchClass;
  });

  const stats = {
    present: rows.filter((r) => r.status === "hadir").length,
    excused: rows.filter((r) => r.status === "izin").length,
    sick: rows.filter((r) => r.status === "sakit").length,
    absent: rows.filter((r) => r.status === "tidak_hadir" || r.status === "absent").length,
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-line bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300"
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-line bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300"
        >
          <option value="all">Semua Kelas</option>
          {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[["Hadir", stats.present, "ok"], ["Izin", stats.excused, "warn"], ["Sakit", stats.sick, "warn"], ["Absen", stats.absent, "danger"]].map(([l, v, t]) => (
          <Card key={l as string} className="!p-3 text-center">
            <div className={`font-display font-extrabold text-2xl text-${t}-500`}>{v}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-mute">{l}</div>
          </Card>
        ))}
      </div>
      <Card padded={false}>
        <div className="divide-y divide-line">
          {rows.map((r) => {
            const d = new Date(r.session_date + "T00:00:00");
            const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.status === "hadir" ? "bg-ok-50 text-ok-600" : r.status === "telat" ? "bg-warn-50 text-warn-600" : (r.status === "tidak_hadir" || r.status === "absent") ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                  <Icon name={r.status === "hadir" ? "check" : (r.status === "tidak_hadir" || r.status === "absent") ? "x" : "info"} className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{r.class_name}</div>
                  <div className="text-xs text-ink-mute font-mono">{dateStr} · {r.time}{r.notes ? ` · ${r.notes}` : ""}</div>
                </div>
                <Status kind={r.status === "hadir" ? "present" : r.status === "telat" ? "telat" : (r.status === "tidak_hadir" || r.status === "absent") ? "absent" : r.status === "izin" ? "excused" : "sick"}>
                  {r.status === "hadir" ? "Hadir" : r.status === "telat" ? "Telat" : (r.status === "tidak_hadir" || r.status === "absent") ? "Absen" : r.status === "izin" ? "Izin" : "Sakit"}
                </Status>
              </div>
            );
          })}
          {rows.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">Belum ada data absensi.</div>}
        </div>
      </Card>
    </div>
  );
}

// ── Tagihan ────────────────────────────────────────────────────────────────────

function MemberBills({ memberId, memberName, branchId }: { memberId: string; memberName: string; branchId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState("active");
  const [activeBills, setActiveBills] = useState<{ id: string; period_label: string; amount: number; discount: number; discount_reason: string | null; total: number; class_name: string; type: string; sessions_total: number | null; sessions_used: number }[]>([]);
  const [history, setHistory] = useState<{ id: string; period_label: string; amount: number; paid_at: string; payment_method: string | null }[]>([]);
  const [adminWa, setAdminWa] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{ bank_name: string | null; bank_account: string | null; bank_holder: string | null } | null>(null);


  useEffect(() => {
    if (!branchId) return;
    supabase.from("branches").select("wa_numbers, bank_name, bank_account, bank_holder").eq("id", branchId).single()
      .then(({ data }) => {
        if (data) {
          const d = data as unknown as { wa_numbers: string[]; bank_name: string | null; bank_account: string | null; bank_holder: string | null };
          if (d.wa_numbers?.length) setAdminWa(d.wa_numbers[0]);
          if (d.bank_name) setBankInfo({ bank_name: d.bank_name, bank_account: d.bank_account, bank_holder: d.bank_holder });
        }
      });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps


  const load = useCallback(async () => {
    if (!memberId) return;
    const [actRes, hisRes] = await Promise.all([
      supabase.from("bills").select("id, period_label, amount, discount, discount_reason, total, type, sessions_total, sessions_used, classes(name)").eq("member_id", memberId).in("status", ["unpaid", "partial"]).order("created_at", { ascending: false }),
      supabase.from("bills").select("id, period_label, amount, total, paid_at, paid_method").eq("member_id", memberId).eq("status", "paid").order("paid_at", { ascending: false }),
    ]);
    if (actRes.data) {
      setActiveBills(actRes.data.map((b) => {
        const bx = b as unknown as { amount: number; discount: number; discount_reason: string | null; total: number; classes: { name: string } | null };
        return {
          id: b.id, period_label: b.period_label,
          amount: bx.amount ?? 0, discount: bx.discount ?? 0, discount_reason: bx.discount_reason ?? null,
          total: bx.total ?? bx.amount ?? 0,
          class_name: bx.classes?.name ?? "—",
          type: (b as unknown as { type: string }).type ?? "monthly",
          sessions_total: (b as unknown as { sessions_total: number | null }).sessions_total ?? null,
          sessions_used: (b as unknown as { sessions_used: number }).sessions_used ?? 0,
        };
      }));
    }
    if (hisRes.data) {
      setHistory(hisRes.data.map((b) => ({
        id: b.id, period_label: b.period_label, amount: (b as unknown as { total: number }).total ?? b.amount,
        paid_at: b.paid_at ?? "", payment_method: (b as unknown as { paid_method: string | null }).paid_method,
      })));
    }
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader + realtime */
  useEffect(() => {
    load();
    const channel = supabase.channel(`bills:${memberId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bills", filter: `member_id=eq.${memberId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1 w-fit">
        {[["active", "Tagihan Aktif"], ["history", "Histori"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
        ))}
      </div>

      {tab === "active" && (
        <>
          {activeBills.length === 0 && (
            <div className="text-center py-12 text-ink-mute text-sm">Tidak ada tagihan aktif.</div>
          )}
          {activeBills.map((b) => (
            <Card key={b.id} className="bg-warn-50 border-warn-500/20">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white text-warn-600 flex items-center justify-center"><Icon name="wallet" className="w-6 h-6" /></span>
                <div className="flex-1">
                  <Status kind="unpaid" className="!text-[10px]">BELUM BAYAR</Status>
                  <div className="font-display font-bold text-lg text-ink mt-1">Tagihan {b.period_label}</div>
                  <div className="text-xs text-ink-mute">{b.class_name}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-warn-500/20 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-mute"><span>Biaya kelas</span><span className="font-mono">{fmtIDR(b.amount)}</span></div>
                {b.discount > 0 && (
                  <div className="flex justify-between text-ok-600">
                    <span>Diskon{b.discount_reason ? ` (${b.discount_reason})` : ""}</span>
                    <span className="font-mono">−{fmtIDR(b.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-bold text-xl text-ink pt-2 border-t border-warn-500/20"><span>Total</span><span className="font-mono text-ocean-700">{fmtIDR(b.total)}</span></div>
              </div>
              {b.type === "session_pack" && b.sessions_total != null && (
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${(b.sessions_total - b.sessions_used) <= 1 ? "bg-warn-50 border-warn-300 text-warn-800" : "bg-paper-tint border-line text-ink-soft"}`}>
                  <Icon name="calendar" className="w-4 h-4 shrink-0" />
                  <span>Sisa sesi: <strong>{b.sessions_total - b.sessions_used}</strong> dari {b.sessions_total} sesi</span>
                  {(b.sessions_total - b.sessions_used) <= 1 && <span className="ml-auto text-warn-700 font-bold text-xs">Hampir habis!</span>}
                </div>
              )}
              {bankInfo?.bank_name && (
                <div className="mt-3 rounded-xl bg-ocean-50 border border-ocean-500/20 p-3 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ocean-600">Rekening Pembayaran</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-soft">Bank</span>
                    <span className="font-bold text-ink">{bankInfo.bank_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-soft">No. Rekening</span>
                    <span className="font-mono font-bold text-ink">{bankInfo.bank_account}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-soft">Atas Nama</span>
                    <span className="font-bold text-ink">{bankInfo.bank_holder}</span>
                  </div>
                </div>
              )}
              {adminWa && (
                <div className="mt-3 flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-white border border-warn-500/20">
                  <Icon name="whatsapp" className="w-4 h-4 text-ok-600 shrink-0" />
                  <div className="text-xs text-ink-soft">Konfirmasi pembayaran ke admin:</div>
                  <div className="font-mono font-bold text-sm text-ink ml-auto truncate">{adminWa}</div>
                </div>
              )}
              <a href={`https://wa.me/${adminWa?.replace(/\D/g, "") ?? ""}?text=${encodeURIComponent(`Halo Admin, saya ingin konfirmasi pembayaran tagihan ${b.period_label} untuk ${memberName}. Bukti transfer terlampir.`)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full">
                <Btn variant="wa" icon="whatsapp" size="lg" className="w-full">Hubungi Admin untuk konfirmasi</Btn>
              </a>
              <div className="mt-2 text-[11px] text-ink-mute text-center">
                {bankInfo?.bank_name
                  ? "Transfer ke rekening di atas lalu kirim bukti via WA ke admin."
                  : "Hubungi admin via WhatsApp untuk mendapat info rekening dan konfirmasi pembayaran."}
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === "history" && (
        <Card padded={false}>
          <div className="divide-y divide-line">
            {history.map((h) => {
              const d = h.paid_at ? new Date(h.paid_at) : null;
              const dateStr = d ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}` : "—";
              return (
                <div key={h.id} className="px-5 py-3.5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-600 flex items-center justify-center"><Icon name="check" className="w-4 h-4" strokeWidth={2.5} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm">{h.period_label}</div>
                    <div className="text-xs text-ink-mute">Diverifikasi {dateStr}{h.payment_method ? ` · ${h.payment_method}` : ""}</div>
                  </div>
                  <div className="font-mono font-bold text-sm">{fmtIDR(h.amount)}</div>
                </div>
              );
            })}
            {history.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">Belum ada histori pembayaran.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Izin ───────────────────────────────────────────────────────────────────────

function MemberLeave({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [openForm, setOpenForm] = useState(false);
  const [leaves, setLeaves] = useState<{ id: string; date_from: string; date_to: string; type: string; reason: string | null; status: string; reject_reason: string | null; class_ids: string[] }[]>([]);
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ class_ids: [] as string[], start_date: "", end_date: "", type: "izin", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    const [lvRes, clsRes] = await Promise.all([
      supabase.from("member_leaves")
        .select("id, date_from, date_to, type, reason, status, reject_reason, member_leave_classes(class_id)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false }),
      supabase.from("member_classes")
        .select("classes(id, name)")
        .eq("member_id", memberId),
    ]);
    if (lvRes.data) {
      setLeaves(lvRes.data.map((l) => ({
        id: l.id, date_from: l.date_from, date_to: l.date_to, type: l.type,
        reason: l.reason, status: l.status, reject_reason: l.reject_reason,
        class_ids: (l.member_leave_classes as unknown as { class_id: string }[])?.map((x) => x.class_id) ?? [],
      })));
    }
    if (clsRes.data) {
      setMyClasses(clsRes.data.map((mc) => {
        const c = mc.classes as unknown as { id: string; name: string } | null;
        return { id: c?.id ?? "", name: c?.name ?? "" };
      }).filter((c) => c.id));
    }
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const submit = async () => {
    if (!form.start_date || !form.type) return;
    setSubmitting(true);
    const { data: newLeave, error } = await supabase.from("member_leaves").insert({
      member_id: memberId,
      date_from: form.start_date,
      date_to: form.end_date || form.start_date,
      type: form.type as "izin" | "sakit" | "ujian" | "lainnya",
      reason: form.notes || null,
      status: "pending" as const,
    }).select("id").single();
    // Link to classes via member_leave_classes
    if (!error && newLeave && form.class_ids.length > 0) {
      await supabase.from("member_leave_classes").insert(form.class_ids.map((class_id) => ({ leave_id: newLeave.id, class_id })));
    }
    setSubmitting(false);
    if (!error) {
      setOpenForm(false);
      setForm({ class_ids: [], start_date: "", end_date: "", type: "izin", notes: "" });
      toast.success("Pengajuan izin berhasil dikirim", "Menunggu persetujuan admin.");
      load();
    }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      <Btn variant="primary" size="lg" icon="plus" className="w-full" onClick={() => setOpenForm(true)}>Ajukan Izin Baru</Btn>
      <SectionTitle sub="Pengajuan Anda">Riwayat Izin</SectionTitle>
      <Card padded={false}>
        <div className="divide-y divide-line">
          {leaves.map((l) => {
            const d = new Date(l.date_from + "T00:00:00");
            const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            const endD = l.date_to && l.date_to !== l.date_from ? new Date(l.date_to + "T00:00:00") : null;
            const dateRange = endD
              ? `${dateStr}–${endD.getDate()} ${monthNames[endD.getMonth()]}`
              : dateStr;
            const typeLabel = l.type === "izin" ? "Izin" : l.type === "sakit" ? "Sakit" : l.type === "ujian" ? "Ujian" : "Lainnya";
            return (
              <div key={l.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.status === "approved" ? "bg-ok-50 text-ok-600" : l.status === "rejected" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                    <Icon name={l.status === "approved" ? "check" : l.status === "rejected" ? "x" : "info"} className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm">{typeLabel} · {dateRange}</div>
                    <div className="text-xs text-ink-mute">Diajukan {dateStr}{l.reason ? ` · ${l.reason}` : ""}</div>
                  </div>
                  <Status kind={l.status as "approved" | "rejected" | "pending"}>{l.status === "approved" ? "Disetujui" : l.status === "rejected" ? "Ditolak" : "Menunggu"}</Status>
                </div>
                {l.reject_reason && <div className="mt-2 text-xs text-danger-600 bg-danger-50 rounded-lg p-2.5"><b>Alasan tolak:</b> {l.reject_reason}</div>}
              </div>
            );
          })}
          {leaves.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">Belum ada pengajuan izin.</div>}
        </div>
      </Card>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title="Ajukan Izin"
        footer={<><Btn variant="ghost" onClick={() => setOpenForm(false)}>Batal</Btn><Btn variant="primary" disabled={submitting} onClick={submit}>Submit</Btn></>}>
        <div className="space-y-4">
          <Field label="Kelas" required hint="Bisa pilih lebih dari satu">
            <div className="flex flex-wrap gap-2 mt-1">
              {myClasses.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => setForm((f) => ({ ...f, class_ids: f.class_ids.includes(c.id) ? f.class_ids.filter((x) => x !== c.id) : [...f.class_ids, c.id] }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${form.class_ids.includes(c.id) ? "bg-ocean-600 text-white border-ocean-600" : "bg-white text-ink-soft border-line hover:border-ocean-300"}`}>
                  {c.name}
                </button>
              ))}
              {myClasses.length === 0 && <span className="text-sm text-ink-mute">Tidak ada kelas terdaftar</span>}
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tanggal mulai" required><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></Field>
            <Field label="Tanggal selesai"><Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></Field>
          </div>
          <Field label="Jenis izin" required>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[["izin", "Izin"], ["sakit", "Sakit"], ["ujian", "Ujian"], ["lainnya", "Lainnya"]].map(([val, label]) => (
                <label key={val} className={`px-2 py-2 rounded-xl border text-xs font-semibold text-center cursor-pointer ${form.type === val ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  <input type="radio" name="lt" className="sr-only" checked={form.type === val} onChange={() => setForm((f) => ({ ...f, type: val }))} />{label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Alasan tambahan"><Textarea rows={3} placeholder="Mis. Demam, tidak bisa hadir" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
          <div className="text-xs text-ink-mute bg-paper-tint rounded-lg p-3 flex items-start gap-2"><Icon name="info" className="w-4 h-4 mt-0.5 text-wave-600" />Pengajuan akan menunggu persetujuan admin.</div>
        </div>
      </Modal>
    </div>
  );
}

// ── Rapor ──────────────────────────────────────────────────────────────────────

interface CoachReviewSlot {
  coach_id: string; coach_name: string; role: string;
  review_id: string | null; review_stars: number | null; review_message: string | null;
}

interface RaporEntryFull {
  id: string; period: string; period_id: string; period_is_open: boolean; class_name: string; coach_name: string;
  class_id: string;
  scores: Record<string, number | string>; notes: string | null;
  personality: string | null; motivation: string | null; learning_achievements: string | null;
  level: string | null;
  coachReviews: CoachReviewSlot[];
  criteria: PrintCriterion[];
  best_times: PrintBestTime[];
  coach_signature_url: string | null;
}

function MemberRapor({ memberId, memberName, branchId, avatarUrl, memberNo, birthDate, location }: {
  memberId: string; memberName: string; branchId: string;
  avatarUrl?: string | null; memberNo?: string | null; birthDate?: string | null; location?: string;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [raporTab, setRaporTab] = useState<"rapor" | "review">("rapor");
  const [open, setOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RaporEntryFull | null>(null);
  const [entries, setEntries] = useState<RaporEntryFull[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { stars: number; text: string }>>({});
  const [savingSlot, setSavingSlot] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!memberId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("rapor_entries")
      .select("id, scores, notes, personality, motivation, learning_achievements, level, coach_id, period_id, class_id, rapor_periods(label, is_open), classes(name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url))), coach:profiles!rapor_entries_coach_id_fkey(full_name, signature_url)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }) as { data: any[] | null };
    if (!data) return;

    // Load existing reviews (keyed by rapor_id + coach_id, since a class can have multiple coaches)
    const entryIds = data.map((e: any) => e.id);
    const { data: reviews } = entryIds.length
      ? await supabase.from("member_reviews").select("id, rapor_id, coach_id, stars, message").in("rapor_id", entryIds).eq("member_id", memberId)
      : { data: [] };
    const reviewMap = new Map((reviews ?? []).map((r) => [`${r.rapor_id}:${r.coach_id}`, r]));

    // Load class_criteria for all unique class_ids
    const classIds = [...new Set(data.map((e) => e.class_id).filter(Boolean))];
    const { data: criteriaRows } = classIds.length
      ? await supabase.from("class_criteria").select("id, class_id, label, kind").in("class_id", classIds).order("sort_order")
      : { data: [] };
    const criteriaByClass = new Map<string, PrintCriterion[]>();
    for (const c of (criteriaRows ?? [])) {
      const list = criteriaByClass.get(c.class_id) ?? [];
      list.push({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] });
      criteriaByClass.set(c.class_id, list);
    }

    // Load best times for this member
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("stroke, distance, time_seconds")
      .eq("member_id", memberId)
      .eq("branch_id", branchId);
    const bestTimesArr: PrintBestTime[] = (btRows ?? []).map(r => ({
      stroke: (r as { stroke: string }).stroke,
      distance: (r as { distance: number }).distance,
      time_seconds: (r as { time_seconds: number }).time_seconds,
    }));

    setEntries(data.map((e) => {
      const p = e.rapor_periods as unknown as { label: string; is_open: boolean } | null;
      const cls = e.classes as unknown as { name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } | null;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const coachReviews: CoachReviewSlot[] = (cls?.class_coaches ?? []).map(cc => {
        const review = reviewMap.get(`${e.id}:${cc.coach_id}`);
        return {
          coach_id: cc.coach_id,
          coach_name: cc.profile?.full_name ?? "—",
          role: cc.role,
          review_id: review?.id ?? null,
          review_stars: review?.stars ?? null,
          review_message: review?.message ?? null,
        };
      });
      return {
        id: e.id,
        period: p?.label ?? "—",
        period_id: e.period_id,
        period_is_open: p?.is_open ?? false,
        class_name: cls?.name ?? "—",
        class_id: e.class_id,
        coach_name: signer?.full_name ?? "—",
        scores: (e.scores as unknown as Record<string, number | string>) ?? {},
        notes: e.notes,
        personality: (e as unknown as { personality: string | null }).personality ?? null,
        motivation: (e as unknown as { motivation: string | null }).motivation ?? null,
        learning_achievements: (e as unknown as { learning_achievements: string | null }).learning_achievements ?? null,
        level: (e as unknown as { level: string | null }).level ?? null,
        coachReviews,
        criteria: criteriaByClass.get(e.class_id) ?? [],
        best_times: bestTimesArr,
        coach_signature_url: signer?.signature_url ?? null,
      };
    }));
  }, [memberId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openRapor = (e: RaporEntryFull) => {
    setSelectedEntry(e);
    setOpen(true);
  };

  const draftKey = (entryId: string, coachId: string) => `${entryId}:${coachId}`;

  const getDraft = (entry: RaporEntryFull, slot: CoachReviewSlot) => {
    const key = draftKey(entry.id, slot.coach_id);
    return reviewDrafts[key] ?? { stars: slot.review_stars ?? 5, text: slot.review_message ?? "" };
  };

  const setDraft = (entry: RaporEntryFull, slot: CoachReviewSlot, patch: Partial<{ stars: number; text: string }>) => {
    const key = draftKey(entry.id, slot.coach_id);
    setReviewDrafts(prev => ({ ...prev, [key]: { ...getDraft(entry, slot), ...patch } }));
  };

  const saveReview = async (entry: RaporEntryFull, slot: CoachReviewSlot) => {
    const { data: periodCheck } = await supabase.from("rapor_periods").select("is_open").eq("id", entry.period_id).single();
    if (!periodCheck?.is_open) return toast.error("Periode rapor sudah ditutup", "Review tidak bisa diedit setelah periode berakhir.");
    const draft = getDraft(entry, slot);
    const key = draftKey(entry.id, slot.coach_id);
    setSavingSlot(key);
    if (slot.review_id) {
      await supabase.from("member_reviews").update({ stars: draft.stars, message: draft.text }).eq("id", slot.review_id);
    } else {
      await supabase.from("member_reviews").insert({ rapor_id: entry.id, member_id: memberId, coach_id: slot.coach_id, stars: draft.stars, message: draft.text });
    }
    setSavingSlot(null);
    await load();
  };

  // Separate open-period entries from closed-period (history)
  const openEntries = entries.filter((e) => e.period_is_open);
  const historyEntries = entries.filter((e) => !e.period_is_open);

  return (
    <div className="space-y-5">
      {/* Sub-tab toggle */}
      <div className="flex gap-1 bg-paper-tint border border-line rounded-xl p-1 w-fit">
        {([{ id: "rapor", label: "Rapor" }, { id: "review", label: "Review Coach" }] as const).map(t => (
          <button key={t.id} onClick={() => setRaporTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${raporTab === t.id ? "bg-white text-ocean-700 shadow-card" : "text-ink-soft hover:bg-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {raporTab === "rapor" && (
      <>
      {/* Active / open period rapor */}
      {openEntries.length > 0 && (
        <>
          {openEntries.map((entry) => (
            <div key={entry.id} className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
              <div className="caustics absolute inset-0 opacity-30" />
              <div className="relative flex items-center gap-3">
                <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"><Icon name="book" className="w-7 h-7" /></span>
                <div>
                  <div className="text-wave-200 text-[10px] uppercase tracking-widest font-bold">Rapor aktif · {entry.period}</div>
                  <div className="font-display font-bold text-xl mt-0.5">{entry.class_name}</div>
                  <div className="text-white/80 text-xs mt-0.5">{entry.coach_name}</div>
                </div>
                <Btn variant="accent" size="sm" className="ml-auto" onClick={() => openRapor(entry)}>Buka</Btn>
              </div>
            </div>
          ))}
        </>
      )}

      {openEntries.length === 0 && entries.length === 0 && (
        <div className="text-center py-12 text-ink-mute text-sm">Belum ada rapor yang tersedia.</div>
      )}

      {openEntries.length === 0 && entries.length > 0 && (
        <div className="rounded-xl border border-line bg-paper-tint p-4 text-sm text-ink-mute text-center">Tidak ada periode rapor yang sedang aktif.</div>
      )}

      {/* History rapor (closed periods) */}
      {historyEntries.length > 0 && (
        <>
          <SectionTitle sub="Periode sudah berakhir">History Rapor</SectionTitle>
          <div className="space-y-2.5">
            {historyEntries.map((r) => (
              <Card key={r.id} className="!p-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-paper-tint text-ink-soft flex items-center justify-center"><Icon name="book" className="w-4 h-4" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm">{r.period}</div>
                    <div className="text-xs text-ink-mute">{r.coach_name} · {r.class_name}</div>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => openRapor(r)}>Buka</Btn>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      </>
      )}

      {raporTab === "review" && (
        <>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-ink-mute text-sm">Belum ada rapor yang tersedia untuk direview.</div>
          ) : (
            <div className="space-y-4">
              {entries.map(entry => (
                <Card key={entry.id} className="space-y-4">
                  <div>
                    <div className="font-display font-bold text-ink">{entry.class_name}</div>
                    <div className="text-xs text-ink-mute mt-0.5">{entry.period}{!entry.period_is_open && " · periode berakhir"}</div>
                  </div>
                  {entry.coachReviews.length === 0 ? (
                    <p className="text-xs text-ink-faint italic">Belum ada coach terdaftar di kelas ini.</p>
                  ) : (
                    <div className="space-y-3">
                      {entry.coachReviews.map(slot => {
                        const key = draftKey(entry.id, slot.coach_id);
                        const draft = getDraft(entry, slot);
                        const isSaving = savingSlot === key;
                        return (
                          <div key={slot.coach_id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar name={slot.coach_name} size={28} />
                              <span className="font-semibold text-sm text-ink">{slot.coach_name}</span>
                              {slot.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide">Head</span>}
                            </div>
                            {entry.period_is_open ? (
                              <div className="bg-wave-50 border border-wave-100 rounded-2xl p-4">
                                <div className="flex items-center gap-0.5 mb-3">
                                  {Array.from({ length: 5 }).map((_, k) => (
                                    <button key={k} onClick={() => setDraft(entry, slot, { stars: k + 1 })} className="p-1 rounded-lg hover:bg-wave-100 transition-colors">
                                      <Icon name="star" className={`w-7 h-7 transition-colors ${k < draft.stars ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < draft.stars ? "currentColor" : "none"} />
                                    </button>
                                  ))}
                                  <span className="ml-2 text-sm font-semibold text-ink-soft">{["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Luar Biasa"][draft.stars]}</span>
                                </div>
                                <Textarea rows={2} placeholder="Mis. Coach sangat sabar dan metodenya menyenangkan untuk anak-anak." value={draft.text} onChange={(e) => setDraft(entry, slot, { text: e.target.value })} />
                                <Btn variant="primary" size="sm" className="mt-3" disabled={isSaving} onClick={() => saveReview(entry, slot)}>
                                  {isSaving ? "Menyimpan…" : slot.review_id ? "Perbarui review" : "Simpan review"}
                                </Btn>
                              </div>
                            ) : (
                              <div className="bg-paper-tint border border-line rounded-2xl p-4">
                                {slot.review_stars ? (
                                  <>
                                    <div className="flex items-center gap-0.5 mb-2">
                                      {Array.from({ length: 5 }).map((_, k) => (
                                        <Icon key={k} name="star" className={`w-5 h-5 ${k < (slot.review_stars ?? 0) ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < (slot.review_stars ?? 0) ? "currentColor" : "none"} />
                                      ))}
                                      <span className="ml-2 text-xs font-semibold text-ink-soft">{["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Luar Biasa"][slot.review_stars]}</span>
                                    </div>
                                    {slot.review_message && <p className="text-sm text-ink-soft">{slot.review_message}</p>}
                                  </>
                                ) : (
                                  <p className="text-sm text-ink-mute">Periode sudah berakhir — review tidak diberikan.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Rapor — ${selectedEntry?.period ?? ""}`} size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            {selectedEntry && (() => {
              const raporData = {
                full_name: memberName,
                member_no: memberNo ?? undefined,
                birth_date: birthDate ?? undefined,
                avatar_url: avatarUrl ?? undefined,
                location: location ?? undefined,
                level: selectedEntry.level ?? undefined,
                class_name: selectedEntry.class_name,
                coach_name: selectedEntry.coach_name,
                period_label: selectedEntry.period,
                scores: selectedEntry.scores,
                notes: selectedEntry.notes,
                personality: selectedEntry.personality,
                motivation: selectedEntry.motivation,
                learning_achievements: selectedEntry.learning_achievements,
                criteria: selectedEntry.criteria,
                best_times: selectedEntry.best_times,
                coach_signature_url: selectedEntry.coach_signature_url,
              };
              return (<>
                <Btn variant="outline" size="sm" icon="printer"
                  onClick={() => printSingleRaporPopup(raporData)}>
                  Print
                </Btn>
                <Btn variant="soft" size="sm" icon="download"
                  onClick={() => void downloadRaporPdf(raporData)}>
                  Download PDF
                </Btn>
              </>);
            })()}
            <Btn variant="primary" onClick={() => setOpen(false)}>Tutup</Btn>
          </div>
        }>
        {selectedEntry && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="flex items-center gap-3"><Avatar name={memberName} size={42} /><div><div className="font-semibold text-ink">{memberName}</div><div className="text-xs text-ink-mute">{selectedEntry.class_name} · {selectedEntry.coach_name}</div></div></div>
            </Card>
            <div className="space-y-3">
              {(() => {
                const criteriaMap = new Map(selectedEntry.criteria.map(c => [c.id, c]));
                const orderedEntries = selectedEntry.criteria.length > 0
                  ? selectedEntry.criteria.filter(c => c.id in selectedEntry.scores).map(c => [c.id, selectedEntry.scores[c.id]] as [string, number | string])
                  : Object.entries(selectedEntry.scores);
                return orderedEntries.map(([key, val]) => {
                  const crit = criteriaMap.get(key);
                  const label = crit?.label ?? key.replace(/_/g, " ");
                  const numVal = typeof val === "number" ? val : null;
                  const strVal = typeof val === "string" ? val : null;
                  const isScore = numVal !== null;
                  const max = crit?.kind === "score_10" ? 10 : crit?.kind === "score_100" ? 100 : (numVal !== null && numVal <= 10 ? 10 : 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-ink capitalize">{label}</span>
                        {isScore && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                      </div>
                      {isScore && (
                        <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                          <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                        </div>
                      )}
                      {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                    </div>
                  );
                });
              })()}
              {selectedEntry.notes && (
                <div>
                  <div className="font-semibold text-ink text-sm mb-1">Catatan coach</div>
                  <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────

function MemberProfile({ memberId, memberName, onLogout, onProfileComplete, onAvatarChange }: { memberId: string; memberName: string; onLogout: () => void; onProfileComplete?: () => void; onAvatarChange?: (url: string) => void }) {
  const supabase = createClient();
  const { upload } = useUpload();
  const [profile, setProfile] = useState<{
    full_name: string; birth_date: string | null; gender: string | null;
    phone: string | null; address: string | null; health_notes: string | null;
    date_start: string | null; qr_code: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [regInfo, setRegInfo] = useState<{ parent_name: string | null; parent_phone: string | null } | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHealth, setEditHealth] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [photoView, setPhotoView] = useState<string | null>(null);

   
  useEffect(() => {
    if (!memberId) return;
    // member row for date_start + qr_code
    supabase.from("members")
      .select("date_start, qr_code, profile_id")
      .eq("id", memberId)
      .single()
      .then(({ data: m }) => {
        if (!m) return;
        // profile row for personal data
        supabase.from("profiles")
          .select("full_name, birth_date, gender, phone, address, health_notes, avatar_url")
          .eq("id", m.profile_id)
          .single()
          .then(({ data: p }) => {
            if (p) {
              setProfile({ ...p, date_start: m.date_start ?? null, qr_code: m.qr_code ?? null });
              setEditPhone(p.phone ?? "");
              setEditAddress(p.address ?? "");
              setEditHealth(p.health_notes ?? "");
            }
          });
        // registration for parent info
        supabase.from("registrations")
          .select("parent_name, parent_phone")
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: r }) => { if (r) setRegInfo({ parent_name: r.parent_name, parent_phone: r.parent_phone }); });
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps
   

  const saveProfile = async () => {
    if (!memberId || !profile) return;
    setSaving(true);
    // profile_id is fetched inside useEffect; we update profiles by auth uid
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ phone: editPhone, address: editAddress, health_notes: editHealth }).eq("id", user.id);
    setSaving(false);
  };



  const changePwd = async () => {
    setPwdError("");
    if (newPwd !== confirmPwd) { setPwdError("Password tidak cocok"); return; }
    if (newPwd.length < 6) { setPwdError("Password minimal 6 karakter"); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (error) { setPwdError(error.message); return; }
    setNewPwd(""); setConfirmPwd("");
  };

  const age = profile?.birth_date ? calcAge(profile.birth_date) : null;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-4">
          {/* Avatar — click to view lightbox; use hidden input ref for picking */}
          <button type="button" onClick={() => setPhotoView("open")} className="relative inline-block shrink-0 cursor-zoom-in group">
            <Avatar
              name={memberName}
              src={avatarPreview ?? profile?.avatar_url ?? undefined}
              size={72}
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm pointer-events-none">
              <Icon name="camera" className="w-3 h-3" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink">{profile?.full_name ?? memberName}</div>
            <div className="text-sm text-ocean-700 font-semibold">{age != null ? `${age} thn · ` : ""}Member</div>
            {profile?.date_start && <div className="text-xs text-ink-mute mt-1">Member sejak {fmtDate(profile.date_start)}</div>}
            {avatarSaving && (
              <div className="mt-2 text-xs text-ink-mute font-semibold animate-pulse">Mengupload foto…</div>
            )}
          </div>
        </div>
        {(regInfo?.parent_name || regInfo?.parent_phone) && (
          <Card className="!p-3 mt-4 bg-paper-tint border-line">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {regInfo.parent_name && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Wali</div><div className="font-semibold text-ink">{regInfo.parent_name}</div></div>}
              {regInfo.parent_phone && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">No HP wali</div><div className="font-semibold text-ink font-mono text-xs">{regInfo.parent_phone}</div></div>}
            </div>
          </Card>
        )}
      </Card>

      <Card className="text-center">
        <div className="mb-4">
          <h2 className="font-display font-bold text-xl text-ink leading-tight">QR Code Absensi</h2>
          <p className="text-sm text-ink-mute mt-0.5">Print sebagai kartu absensi — QR tidak pernah berubah</p>
        </div>
        <div className="flex justify-center my-4">
          <QRBox
            value={profile?.qr_code ?? `NSS-M-${memberId.slice(0, 8).toUpperCase()}`}
            size={180}
            downloadable
            downloadName={`QR-${profile?.full_name?.replace(/\s+/g, "-") ?? memberId}`}
          />
        </div>
        <div className="flex justify-center gap-2">
          <a href={waLink("Halo, kirimkan kartu QR absensi anak saya untuk diprint.")} target="_blank" rel="noreferrer">
            <Btn variant="wa" size="md" icon="whatsapp">Minta cetak</Btn>
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Yang bisa diubah sendiri">Data yang bisa diupdate</SectionTitle>
        <div className="space-y-3">
          <Field label="No HP"><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></Field>
          <Field label="Alamat"><Textarea rows={2} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></Field>
          <Field label="Riwayat kesehatan / alergi"><Textarea rows={2} value={editHealth} onChange={(e) => setEditHealth(e.target.value)} /></Field>
          <Btn variant="primary" disabled={saving} onClick={saveProfile}>Simpan perubahan</Btn>
        </div>
        <div className="mt-4 pt-4 border-t border-line text-xs text-ink-mute flex items-start gap-2">
          <Icon name="info" className="w-4 h-4 mt-0.5 text-wave-600" />
          Untuk mengubah nama, tanggal lahir, atau kelas — silakan hubungi admin cabang.
        </div>
      </Card>

      <Card>
        <SectionTitle>Ganti password</SectionTitle>
        <div className="space-y-3">
          <Field label="Password baru">
            <div className="relative">
              <Input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowNewPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi password">
            <div className="relative">
              <Input type={showConfirmPwd ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirmPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showConfirmPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
          {pwdError && <p className="text-xs text-danger-600">{pwdError}</p>}
          <Btn variant="primary" disabled={pwdSaving} onClick={changePwd}>Simpan password baru</Btn>
        </div>
      </Card>

      <Card>
        <button onClick={onLogout} className="w-full flex items-center gap-3 py-1 text-left group">
          <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-500 flex items-center justify-center group-hover:bg-danger-100 transition-colors">
            <Icon name="logout" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-danger-600 group-hover:text-danger-700">Keluar dari akun</span>
        </button>
      </Card>

      {photoView && (
        <PhotoLightbox
          src={avatarPreview ?? profile?.avatar_url ?? null}
          name={memberName}
          onClose={() => setPhotoView(null)}
          onChangePick={async e => {
            const f = e.target.files?.[0] ?? null;
            if (!f) return;
            setAvatarPreview(URL.createObjectURL(f));
            setAvatarSaving(true);
            setPhotoView(null);
            try {
              const url = await upload.avatar(f);
              setProfile(p => p ? { ...p, avatar_url: url } : p);
              onAvatarChange?.(url);
              onProfileComplete?.();
            } catch {
              // silent fail
            }
            setAvatarPreview(null);
            setAvatarSaving(false);
          }}
          uploading={avatarSaving}
        />
      )}
    </div>
  );
}

// ── Profile Completion Gate ────────────────────────────────────────────────────

function ProfileGate({ memberName, onComplete, onLogout }: { memberName: string; onComplete: () => void; onLogout: () => void }) {
  const { upload, uploading } = useUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!avatarFile) return setError("Pilih foto terlebih dahulu");
    setError("");
    try {
      await upload.avatar(avatarFile);
      onComplete();
    } catch {
      setError("Gagal upload foto, coba lagi");
    }
  };

  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center px-4 py-12">
      <Logo size={48} withWord />
      <div className="w-full max-w-xs mt-8 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display font-bold text-2xl text-ink">Lengkapi Profil</h1>
          <p className="text-sm text-ink-mute">Upload foto profil untuk mulai menggunakan aplikasi.</p>
        </div>
        <Card className="flex flex-col items-center gap-4">
          <label className="cursor-pointer group relative inline-block">
            <Avatar
              name={memberName || "?"}
              src={avatarPreview ?? undefined}
              size={112}
              className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-md">
              <Icon name="camera" className="w-4 h-4" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setAvatarFile(f);
              setAvatarPreview(f ? URL.createObjectURL(f) : null);
            }} />
          </label>
          <div className="text-center">
            <p className="text-sm text-ink-soft">Klik foto untuk memilih gambar</p>
            <p className="text-xs text-ink-faint mt-0.5">Format: JPG / PNG · Maks. 5 MB</p>
          </div>
          {error && <p className="text-xs text-danger-600 text-center">{error}</p>}
          <Btn variant="primary" className="w-full" disabled={uploading || !avatarFile} onClick={handleUpload}>
            {uploading ? "Mengupload…" : "Simpan & Lanjutkan"}
          </Btn>
          <button onClick={onLogout} className="text-xs text-ink-mute hover:text-danger-600 transition-colors">Keluar dari akun</button>
        </Card>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MemberPage() {
  const supabase = createClient();
  const [active, setActive] = useState<TabId>("home");
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState<"reguler" | "private" | "school_affiliate">("reguler");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [memberAvatarUrl, setMemberAvatarUrl] = useState<string | null>(null);
  const [memberNo, setMemberNo] = useState<string | null>(null);
  const [memberBirthDate, setMemberBirthDate] = useState<string | null>(null);
  const [suspendUntil, setSuspendUntil] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);
  const [suspendCountdown, setSuspendCountdown] = useState("");

  const isSuspended = suspendUntil ? new Date(suspendUntil) >= new Date() : false;

  // Countdown ticker for suspend
  /* eslint-disable react-hooks/set-state-in-effect -- interval-based countdown */
  useEffect(() => {
    if (!isSuspended || !suspendUntil) { setSuspendCountdown(""); return; }
    const tick = () => {
      const diff = new Date(suspendUntil).getTime() - Date.now();
      if (diff <= 0) { setSuspendCountdown("Segera aktif kembali…"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setSuspendCountdown(`${days}h ${hrs}j ${mins}m ${secs}d`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isSuspended, suspendUntil]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const SuspendBanner = isSuspended ? (
    <div className="bg-danger-50 border border-danger-300 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0 animate-pulse">
          <Icon name="warning" className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <div className="font-display font-bold text-danger-700 text-base">Akun Anda sedang disuspend</div>
          {suspendReason && <p className="text-sm text-danger-600 mt-1">Alasan: {suspendReason}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-danger-500 font-semibold">Aktif kembali dalam:</span>
            <span className="bg-danger-100 text-danger-700 font-mono text-xs font-bold px-2 py-0.5 rounded-lg">{suspendCountdown}</span>
          </div>
          <p className="text-xs text-danger-500 mt-1">Semua fitur tidak dapat diakses selama masa suspend. Hubungi admin cabang jika ada pertanyaan.</p>
        </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { window.location.href = "/login"; return; }
      setUserId(u.id);
      const meta = u.user_metadata ?? {};
      const bid = meta.branch_id as string | undefined;
      if (bid) setBranchId(bid);

      // Load member record by profile_id (= auth uid)
      supabase.from("members")
        .select("id, type, member_no, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, is_profile_complete, avatar_url)")
        .eq("profile_id", u.id)
        .single()
        .then(async ({ data: m }) => {
          if (!m) {
            setInitError("Data akun tidak ditemukan di database. Kemungkinan data telah direset. Silakan hubungi admin untuk membuat ulang akun Anda.");
            return;
          }
          if (m) {
            setMemberId(m.id);
            const rec = m as unknown as { id: string; type: "reguler" | "private" | "school_affiliate"; member_no: string | null; suspend_until: string | null; suspend_reason: string | null; profile: { full_name: string; birth_date: string | null; is_profile_complete: boolean | null; avatar_url: string | null } | null };
            setMemberType(rec.type ?? "reguler");
            setMemberNo(rec.member_no ?? null);
            setSuspendUntil(rec.suspend_until ?? null);
            setSuspendReason(rec.suspend_reason ?? null);
            const prof = rec.profile;
            setMemberName(prof?.full_name ?? "");
            setMemberAvatarUrl(prof?.avatar_url ?? null);
            setMemberBirthDate(prof?.birth_date ?? null);
            // Lock if profile incomplete AND no avatar
            const complete = prof?.is_profile_complete === true;
            const hasAvatar = !!(prof?.avatar_url);
            setLocked(!complete && !hasAvatar);
            setLockChecked(true);
          }
        });

      // Load branch name
      if (bid) {
        supabase.from("branches").select("name").eq("id", bid).single()
          .then(({ data: b }) => { if (b) setBranchName(b.name); });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Called when member finishes uploading avatar from profile tab
  const onProfileComplete = () => setLocked(false);

  const pages: Record<TabId, React.ReactNode> = {
    home:     <>{SuspendBanner}<MemberHome setActive={setActive} memberId={memberId} memberName={memberName} branchId={branchId} /></>,
    schedule: <>{SuspendBanner}<MemberSchedule memberId={memberId} /></>,
    absen:    <>{SuspendBanner}<MemberAbsensi memberId={memberId} /></>,
    bills:    <>{SuspendBanner}<MemberBills memberId={memberId} memberName={memberName} branchId={branchId} /></>,
    leave:    <>{SuspendBanner}<MemberLeave memberId={memberId} /></>,
    rapor:    <>{SuspendBanner}<MemberRapor memberId={memberId} memberName={memberName} branchId={branchId} avatarUrl={memberAvatarUrl} memberNo={memberNo} birthDate={memberBirthDate} location={branchName} /></>,
    profile:  <MemberProfile memberId={memberId} memberName={memberName} onLogout={logout} onProfileComplete={onProfileComplete} onAvatarChange={url => setMemberAvatarUrl(url)} />,
  };

  // Profile completion gate — shown before lockChecked is done to avoid flash
  if (lockChecked && locked) {
    return <ProfileGate memberName={memberName} onComplete={onProfileComplete} onLogout={logout} />;
  }

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">Data Tidak Ditemukan</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          Kembali ke Login
        </Btn>
      </div>
    </div>
  );

  return (
    <>
      <Shell active={active} setActive={setActive} name={memberName} branchName={branchName} userId={userId} avatarUrl={memberAvatarUrl} isSchoolAffiliate={memberType === "school_affiliate"}>
        {lockChecked ? pages[active] : <div className="p-10 text-center text-ink-mute">Memuat…</div>}
      </Shell>
      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="member" />}
    </>
  );
}
