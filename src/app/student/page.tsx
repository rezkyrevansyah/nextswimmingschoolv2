"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { createClient } from "@/utils/supabase/client";

import StudentShell from "./_components/StudentShell";
import StudentHome from "./_components/StudentHome";
import StudentSchedule from "./_components/StudentSchedule";
import StudentAbsensi from "./_components/StudentAbsensi";
import StudentBills from "./_components/StudentBills";
import StudentLeave from "./_components/StudentLeave";
import StudentRapor from "./_components/StudentRapor";
import StudentProfile from "./_components/StudentProfile";
import ProfileGate from "./_components/ProfileGate";
import type { TabId } from "./_types";

export default function StudentPage() {
  const supabase = createClient();
  const [active, setActive] = useState<TabId>("home");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentType, setStudentType] = useState<"reguler" | "private" | "school_affiliate">("reguler");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [studentAvatarUrl, setStudentAvatarUrl] = useState<string | null>(null);
  const [studentNo, setStudentNo] = useState<string | null>(null);
  const [studentBirthDate, setStudentBirthDate] = useState<string | null>(null);
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
      if (diff <= 0) { setSuspendCountdown("Reactivating soon…"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setSuspendCountdown(`${days}d ${hrs}h ${mins}m ${secs}s`);
    };
    tick();
    const ticker = setInterval(tick, 1000);
    return () => clearInterval(ticker);
  }, [isSuspended, suspendUntil]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const SuspendBanner = isSuspended ? (
    <div className="bg-danger-50 border border-danger-300 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0 animate-pulse">
          <Icon name="warning" className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <div className="font-display font-bold text-danger-700 text-base">{"Your account is currently suspended"}</div>
          {suspendReason && <p className="text-sm text-danger-600 mt-1">{(<>{"Reason: "}<NoTranslate>{suspendReason}</NoTranslate></>)}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-danger-500 font-semibold">{"Reactivates in:"}</span>
            <span className="bg-danger-100 text-danger-700 font-mono text-xs font-bold px-2 py-0.5 rounded-lg">{suspendCountdown}</span>
          </div>
          <p className="text-xs text-danger-500 mt-1">{"All features are inaccessible during suspension. Contact the center admin if you have questions."}</p>
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

      // Load student record by profile_id (= auth uid)
      supabase.from("students")
        .select("id, type, student_no, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, is_profile_complete, avatar_url)")
        .eq("profile_id", u.id)
        .single()
        .then(async ({ data: m }) => {
          if (!m) {
            setInitError("Account data not found in the database. The data may have been reset. Please contact admin to recreate your account.");
            return;
          }
          if (m) {
            setStudentId(m.id);
            const rec = m as unknown as { id: string; type: "reguler" | "private" | "school_affiliate"; student_no: string | null; suspend_until: string | null; suspend_reason: string | null; profile: { full_name: string; birth_date: string | null; is_profile_complete: boolean | null; avatar_url: string | null } | null };
            setStudentType(rec.type ?? "reguler");
            setStudentNo(rec.student_no ?? null);
            setSuspendUntil(rec.suspend_until ?? null);
            setSuspendReason(rec.suspend_reason ?? null);
            const prof = rec.profile;
            setStudentName(prof?.full_name ?? "");
            setStudentAvatarUrl(prof?.avatar_url ?? null);
            setStudentBirthDate(prof?.birth_date ?? null);
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

  // Called when student finishes uploading avatar from profile tab
  const onProfileComplete = () => setLocked(false);

  const pages: Record<TabId, React.ReactNode> = {
    home:     <>{SuspendBanner}<StudentHome setActive={setActive} studentId={studentId} studentName={studentName} branchId={branchId} /></>,
    schedule: <>{SuspendBanner}<StudentSchedule studentId={studentId} /></>,
    absen:    <>{SuspendBanner}<StudentAbsensi studentId={studentId} onSwitchToLeave={() => setActive("leave")} /></>,
    bills:    <>{SuspendBanner}<StudentBills studentId={studentId} studentName={studentName} branchId={branchId} /></>,
    leave:    <>{SuspendBanner}<StudentLeave studentId={studentId} onSwitchToAbsen={() => setActive("absen")} /></>,
    rapor:    <>{SuspendBanner}<StudentRapor studentId={studentId} studentName={studentName} branchId={branchId} avatarUrl={studentAvatarUrl} studentNo={studentNo} birthDate={studentBirthDate} location={branchName} /></>,
    profile:  <StudentProfile studentId={studentId} studentName={studentName} onLogout={logout} onProfileComplete={onProfileComplete} onAvatarChange={url => setStudentAvatarUrl(url)} />,
  };

  // Profile completion gate — shown before lockChecked is done to avoid flash
  if (lockChecked && locked) {
    return <ProfileGate studentName={studentName} onComplete={onProfileComplete} onLogout={logout} />;
  }

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">{"Account Not Found"}</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          {"Back to Login"}
        </Btn>
      </div>
    </div>
  );

  return (
    <StudentShell active={active} setActive={setActive} name={studentName} branchName={branchName} userId={userId} avatarUrl={studentAvatarUrl} isSchoolAffiliate={studentType === "school_affiliate"}>
      {lockChecked ? pages[active] : <div className="p-10 text-center text-ink-mute">{"Loading…"}</div>}
    </StudentShell>
  );
}
