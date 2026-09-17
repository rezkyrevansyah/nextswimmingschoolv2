"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDateLong, toLocalDateStr } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

import CoachShell from "./_components/CoachShell";
import ClockInFlow from "./_components/ClockInFlow";
import LeaveHistory from "./_components/CoachLeave/LeaveHistory";
import LeaveForm from "./_components/CoachLeave/LeaveForm";
import CoachHome from "./_components/CoachHome";
import CoachAbsensi from "./_components/CoachAbsensi";
import CoachKelas from "./_components/CoachKelas";
import CoachInvoice from "./_components/CoachInvoice";
import CoachRapor from "./_components/CoachRapor";
import CoachProfile from "./_components/CoachProfile";
import CoachPayslip from "./_components/CoachPayslip";
import type { ClassRow, CoachSpreadsheetRow, ProfileData, TabId } from "./_types";

function LockedNotice({ feature, reason }: { feature: string; reason: string }) {
  const { t } = useLocale();
  return (
    <Card className="!p-8 text-center border-dashed border-2">
      <Icon name="lock" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
      <div className="font-display font-bold text-ink">{feature} {t("coach.lockedNotice.unavailableSuffix")}</div>
      <p className="text-sm text-ink-mute mt-1">{reason}</p>
    </Card>
  );
}

export default function CoachPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState<TabId>("home");
  const [overlay, setOverlay] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());
  const [clockedInIds, setClockedInIds] = useState<Set<string>>(new Set());
  const [coachBranches, setCoachBranches] = useState<{ branch_id: string; name: string; is_primary: boolean }[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>("");
  const [ownSpreadsheets, setOwnSpreadsheets] = useState<Map<string, string>>(new Map());
  const [classSpreadsheets, setClassSpreadsheets] = useState<Map<string, CoachSpreadsheetRow[]>>(new Map());

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, is_profile_complete, suspend_until, suspend_reason, user_no, qr_code")
      .eq("id", userId).single();
    if (error) return null;
    // Load certifications separately to avoid FK join ambiguity errors
    const { data: certs } = await supabase.from("certifications")
      .select("id, title, issuer, valid_from, valid_until, photo_url, status, reject_reason")
      .eq("coach_id", userId);
    if (data) {
      const combined = { ...(data as unknown as Record<string, unknown>), certifications: certs ?? [] };
      setProfile(combined as unknown as ProfileData);
    }
    return data ? { ...(data as unknown as Record<string, unknown>), certifications: certs ?? [] } as unknown as ProfileData : null;
  }, [supabase]);

  const loadSpreadsheets = useCallback(async (coachId: string, classIds: string[]) => {
    if (classIds.length === 0) return;
    // Own entries (for unfilled alert + modal pre-population)
    const { data: own } = await supabase
      .from("class_coach_spreadsheets")
      .select("class_id, spreadsheet_url")
      .eq("coach_id", coachId)
      .in("class_id", classIds);
    if (own) setOwnSpreadsheets(new Map(
      (own as { class_id: string; spreadsheet_url: string }[]).map(r => [r.class_id, r.spreadsheet_url])
    ));
    // All coaches' entries (for display in detail modal)
    const { data: all } = await supabase
      .from("class_coach_spreadsheets")
      .select("class_id, coach_id, spreadsheet_url, updated_at, coach:profiles(full_name)")
      .in("class_id", classIds);
    if (all) {
      const map = new Map<string, CoachSpreadsheetRow[]>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (all as any[]).forEach((r: any) => {
        const rawCoach = Array.isArray(r.coach) ? r.coach[0] : r.coach;
        const item: CoachSpreadsheetRow = {
          coach_id: r.coach_id,
          spreadsheet_url: r.spreadsheet_url,
          updated_at: r.updated_at,
          coach: rawCoach ?? null,
        };
        map.set(r.class_id, [...(map.get(r.class_id) ?? []), item]);
      });
      setClassSpreadsheets(map);
    }
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClasses = useCallback(async (profileId: string) => {
    const { data, error } = await supabase.from("class_coaches").select("class:classes(id, name, branch_id, schedule_days, time_start, time_end, capacity, enrolled, goals, description, class_type, location_type, external_location_name, external_location_address, google_maps_url, custom_location_lat, custom_location_lng, spreadsheet_filled, spreadsheet_url, branch:branches(name, city, address))").eq("coach_id", profileId);
    if (error || !data) return;
    const rows = data.map((d: Record<string, unknown>) => d.class as ClassRow).filter(Boolean);
    const classIds = rows.map((c) => c.id);

    // Load class rosters via a server route — `profiles` RLS blocks a coach
    // from reading other users' (members') profile rows directly from the
    // browser, regardless of query shape, so this goes through a Route
    // Handler using the service-role client instead (see route file).
    if (classIds.length > 0) {
      type MemberEntry = NonNullable<ClassRow["member_classes"]>[number];
      try {
        const res = await fetch(`/api/coach/class-members?classIds=${classIds.join(",")}`);
        if (res.ok) {
          const { membersByClass } = await res.json() as { membersByClass: Record<string, MemberEntry["member"][]> };
          for (const c of rows) c.member_classes = (membersByClass[c.id] ?? []).map(member => ({ member }));
        }
      } catch {
        // Roster stays empty on network failure — non-fatal for the rest of the page.
      }
    }
    setClasses(rows);

    // Load today's holidays for these classes
    if (classIds.length > 0) {
      const today = toLocalDateStr();
      const { data: hols } = await supabase.from("class_holidays").select("class_id").in("class_id", classIds).eq("holiday_date", today);
      if (hols) setHolidayClassIds(new Set((hols as { class_id: string }[]).map((h) => h.class_id)));
    }
    // Load spreadsheets for all classes this coach teaches
    await loadSpreadsheets(profileId, classIds);
  }, [supabase, loadSpreadsheets]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await loadProfile(u.id);
      if (!p) {
        setInitError(t("coach.page.accountNotFoundBody"));
        return;
      }
      loadClasses(p.id);
      // Load branches for this coach
      const { data: cbData } = await supabase
        .from("coach_branches")
        .select("branch_id, branches(name), is_primary")
        .eq("coach_id", p.id);
      if (cbData && cbData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (cbData as any[]).map((cb: any) => {
          const rawBranch = Array.isArray(cb.branches) ? cb.branches[0] : cb.branches;
          return {
            branch_id: cb.branch_id as string,
            name: (rawBranch?.name as string) ?? (cb.branch_id as string),
            is_primary: Boolean(cb.is_primary),
          };
        });
        setCoachBranches(mapped);
        // Default to primary branch, or first, or fallback to auth metadata
        const primaryId = mapped.find(b => b.is_primary)?.branch_id ?? mapped[0]?.branch_id ?? (u.user_metadata?.branch_id as string ?? "");
        setActiveBranchId(primaryId);
      } else {
        // Fallback to auth metadata (pre-migration coaches)
        setActiveBranchId(u.user_metadata?.branch_id as string ?? "");
      }
    });
  }, [loadProfile, loadClasses, supabase]); // eslint-disable-line react-hooks/exhaustive-deps


  const coachId = profile?.id ?? "";
  const branchId = activeBranchId || (user?.user_metadata?.branch_id as string ?? "");

  const refreshClasses = useCallback(() => {
    if (coachId) loadClasses(coachId);
  }, [coachId, loadClasses]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isSuspended = profile?.suspend_until ? new Date(profile.suspend_until) >= new Date() : false;
  // Profile is complete when all required fields are filled (sertifikat opsional)
  const isProfileComplete = profile == null
    ? true // keep unlocked while loading — will lock once profile loads if incomplete
    : !!(profile.phone && profile.gender && profile.birth_date && profile.bank_name && profile.bank_account && profile.bank_holder);

  const todayName = new Date().toLocaleDateString(localeTag, { weekday: "long" });
  const title = active === "home" ? (profile?.full_name ?? t("coach.home.defaultCoachName")) : {
    absen: t("coach.tabs.absenLabel"), kelas: t("coach.tabs.kelasLabel"), invoice: t("coach.tabs.invoiceLabel"),
    rapor: t("coach.tabs.raporLabel"), payslip: t("coach.tabs.payslipLabel"), profile: t("coach.tabs.profileLabel")
  }[active] ?? "";
  const sub = active === "home" ? `${todayName} · ${fmtDateLong(new Date())}` : {
    absen: t("coach.page.absenSub"), kelas: t("coach.page.kelasSub"),
    invoice: t("coach.page.invoiceSub"), rapor: t("coach.page.raporSub"),
    payslip: t("coach.page.payslipSub"),
    profile: t("coach.page.profileSub")
  }[active] ?? "";

  // Suspend countdown hook — ticks every second
  const [suspendCountdown, setSuspendCountdown] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- timer-driven countdown */
  useEffect(() => {
    if (!isSuspended || !profile?.suspend_until) { setSuspendCountdown(""); return; }
    const tick = () => {
      const diff = new Date(profile.suspend_until!).getTime() - Date.now();
      if (diff <= 0) { setSuspendCountdown(t("coach.page.activeAgainSoon")); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setSuspendCountdown(t("coach.page.countdownFormat", { days, hrs, mins, secs }));
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [isSuspended, profile?.suspend_until, t]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Suspend/incomplete banners shown at the top of each tab's content
  const SuspendBanner = isSuspended ? (
    <Card className="bg-danger-50 border-danger-300 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0 animate-pulse"><Icon name="warning" className="w-5 h-5" /></span>
        <div className="flex-1">
          <div className="font-display font-bold text-danger-700 text-base">{t("coach.page.accountSuspendedTitle")}</div>
          {profile?.suspend_reason && <p className="text-sm text-danger-600 mt-1">{t("coach.page.reasonLabel")} {profile.suspend_reason}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-danger-500 font-semibold">{t("coach.page.activeAgainIn")}</span>
            <span className="bg-danger-100 text-danger-700 font-mono text-xs font-bold px-2 py-0.5 rounded-lg">{suspendCountdown}</span>
          </div>
          <p className="text-xs text-danger-500 mt-1">{t("coach.page.suspendedFeaturesHint")}</p>
        </div>
      </div>
    </Card>
  ) : null;

  const missingFields = profile && !isProfileComplete ? [
    !profile.phone && t("coach.page.missingPhone"),
    !profile.gender && t("coach.page.missingGender"),
    !profile.birth_date && t("coach.page.missingBirthDate"),
    !profile.bank_name && t("coach.page.missingBankName"),
    !profile.bank_account && t("coach.page.missingAccountNumber"),
    !profile.bank_holder && t("coach.page.missingAccountHolder"),
  ].filter(Boolean) : [];

  const IncompleteBanner = (!isSuspended && profile && !isProfileComplete) ? (
    <Card className="bg-warn-50 border-warn-200 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-warn-100 text-warn-600 flex items-center justify-center shrink-0"><Icon name="warning" className="w-5 h-5" /></span>
        <div>
          <div className="font-display font-bold text-warn-700">{t("coach.page.incompleteProfileTitle")}</div>
          <p className="text-sm text-warn-600 mt-1">{t("coach.page.incompleteProfileHintPrefix")} <strong>{t("coach.page.incompleteProfileHintTab")}</strong> {t("coach.page.incompleteProfileHintSuffix")}</p>
          {missingFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {missingFields.map(f => (
                <span key={f as string} className="text-xs font-semibold bg-warn-100 text-warn-700 px-2 py-0.5 rounded-full">{f}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  ) : null;

  // Lock active features when suspended or profile incomplete
  const locked = isSuspended || !isProfileComplete;
  const lockReason = isSuspended ? t("coach.lockedNotice.accountSuspended") : t("coach.lockedNotice.completeProfileFirst");

  const clockinClassId = overlay?.startsWith("clockin:") ? overlay.slice(8) : null;
  const content = (overlay === "clockin" || overlay?.startsWith("clockin:"))
    ? (locked ? <LockedNotice feature="Clock-In" reason={lockReason} /> : <ClockInFlow back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} preselectedClassId={clockinClassId ?? undefined} onSuccess={(cid) => setClockedInIds(prev => new Set([...prev, cid]))} />)
    : overlay === "leave"
    ? <LeaveForm back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} />
    : overlay === "leave-history"
    ? <LeaveHistory back={() => setOverlay(null)} coachId={coachId} />
    : {
        home:    <>{SuspendBanner}{IncompleteBanner}<CoachHome setOverlay={setOverlay} setActive={(tab) => setActive(tab as TabId)} coachId={coachId} branchId={branchId} profile={profile} classes={classes} holidayClassIds={holidayClassIds} clockedInIds={clockedInIds} setClockedInIds={setClockedInIds} ownSpreadsheets={ownSpreadsheets} /></>,
        absen:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature={t("coach.tabs.absenLabel")} reason={lockReason} /> : <CoachAbsensi setOverlay={setOverlay} coachId={coachId} branchId={branchId} classes={classes} holidayClassIds={holidayClassIds} clockedInIds={clockedInIds} />}</>,
        kelas:   <CoachKelas classes={classes} coachId={coachId} classSpreadsheets={classSpreadsheets} ownSpreadsheets={ownSpreadsheets} onRefreshClasses={refreshClasses} />,
        invoice: <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature={t("coach.tabs.invoiceLabel")} reason={lockReason} /> : <CoachInvoice coachId={coachId} branchId={branchId} profile={profile} />}</>,
        rapor:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature={t("coach.tabs.raporLabel")} reason={lockReason} /> : <CoachRapor coachId={coachId} branchId={branchId} coachName={profile?.full_name ?? ""} branchName={coachBranches.find(b => b.branch_id === branchId)?.name ?? ""} />}</>,
        payslip: <CoachPayslip coachId={coachId} coachName={profile?.full_name ?? ""} />,
        profile: <CoachProfile profile={profile} onRefresh={() => user && loadProfile(user.id)} onLogout={logout} onAvatarChange={url => setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)} />,
      }[active];

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">{t("coach.page.accountNotFoundTitle")}</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          {t("coach.page.backToLoginBtn")}
        </Btn>
      </div>
    </div>
  );

  return (
    <>
      <CoachShell active={active} onNav={(id) => { setOverlay(null); setActive(id); }} title={overlay ? "" : title} sub={overlay ? "" : sub} user={user} avatarUrl={profile?.avatar_url}
        branches={coachBranches.length > 1 ? coachBranches : undefined}
        activeBranchId={activeBranchId}
        onBranchChange={setActiveBranchId}>
        {content}
      </CoachShell>
      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="coach" />}
    </>
  );
}
