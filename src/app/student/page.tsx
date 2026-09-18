"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { createClient } from "@/utils/supabase/client";

import MemberShell from "./_components/MemberShell";
import MemberHome from "./_components/MemberHome";
import MemberSchedule from "./_components/MemberSchedule";
import MemberAbsensi from "./_components/MemberAbsensi";
import MemberBills from "./_components/MemberBills";
import MemberLeave from "./_components/MemberLeave";
import MemberRapor from "./_components/MemberRapor";
import MemberProfile from "./_components/MemberProfile";
import ProfileGate from "./_components/ProfileGate";
import type { TabId } from "./_types";

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

      // Load member record by profile_id (= auth uid)
      supabase.from("members")
        .select("id, type, member_no, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, is_profile_complete, avatar_url)")
        .eq("profile_id", u.id)
        .single()
        .then(async ({ data: m }) => {
          if (!m) {
            setInitError("Account data not found in the database. The data may have been reset. Please contact admin to recreate your account.");
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
    absen:    <>{SuspendBanner}<MemberAbsensi memberId={memberId} onSwitchToLeave={() => setActive("leave")} /></>,
    bills:    <>{SuspendBanner}<MemberBills memberId={memberId} memberName={memberName} branchId={branchId} /></>,
    leave:    <>{SuspendBanner}<MemberLeave memberId={memberId} onSwitchToAbsen={() => setActive("absen")} /></>,
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
    <MemberShell active={active} setActive={setActive} name={memberName} branchName={branchName} userId={userId} avatarUrl={memberAvatarUrl} isSchoolAffiliate={memberType === "school_affiliate"}>
      {lockChecked ? pages[active] : <div className="p-10 text-center text-ink-mute">{"Loading…"}</div>}
    </MemberShell>
  );
}
