"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function StudentProfile({ studentId, studentName, onLogout, onProfileComplete, onAvatarChange }: { studentId: string; studentName: string; onLogout: () => void; onProfileComplete?: () => void; onAvatarChange?: (url: string) => void }) {
  const supabase = createClient();
  const { upload } = useUpload();
  const [profile, setProfile] = useState<{
    full_name: string; birth_date: string | null; gender: string | null;
    phone: string | null; address: string | null; health_notes: string | null;
    date_start: string | null; qr_code: string | null;
    avatar_url: string | null; student_no: string | null;
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
    if (!studentId) return;
    // student row for date_start + qr_code
    supabase.from("students")
      .select("date_start, qr_code, profile_id, student_no")
      .eq("id", studentId)
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
              setProfile({ ...p, date_start: m.date_start ?? null, qr_code: m.qr_code ?? null, student_no: m.student_no ?? null });
              setEditPhone(p.phone ?? "");
              setEditAddress(p.address ?? "");
              setEditHealth(p.health_notes ?? "");
            }
          });
        // registration for parent info
        supabase.from("registrations")
          .select("parent_name, parent_phone")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: r }) => { if (r) setRegInfo({ parent_name: r.parent_name, parent_phone: r.parent_phone }); });
      });
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps


  const saveProfile = async () => {
    if (!studentId || !profile) return;
    setSaving(true);
    // profile_id is fetched inside useEffect; we update profiles by auth uid
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ phone: editPhone, address: editAddress, health_notes: editHealth }).eq("id", user.id);
    setSaving(false);
  };

  const changePwd = async () => {
    setPwdError("");
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    if (newPwd.length < 6) { setPwdError("Password must be at least 6 characters"); return; }
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
              name={studentName}
              src={avatarPreview ?? profile?.avatar_url ?? undefined}
              size={72}
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm pointer-events-none">
              <Icon name="camera" className="w-3 h-3" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink"><NoTranslate>{profile?.full_name ?? studentName}</NoTranslate></div>
            <div className="text-sm text-ocean-700 font-semibold">{age != null ? `${age} yo · Student` : "Student"}</div>
            {profile?.date_start && <div className="text-xs text-ink-mute mt-1">{`Student since ${fmtDate(profile.date_start)}`}</div>}
            {profile?.student_no && <div className="text-xs text-ink-mute font-mono mt-0.5"><NoTranslate>{profile.student_no}</NoTranslate></div>}
            {avatarSaving && (
              <div className="mt-2 text-xs text-ink-mute font-semibold animate-pulse">{"Uploading photo…"}</div>
            )}
          </div>
        </div>
        {(regInfo?.parent_name || regInfo?.parent_phone) && (
          <Card className="!p-3 mt-4 bg-paper-tint border-line">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {regInfo.parent_name && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Guardian"}</div><div className="font-semibold text-ink"><NoTranslate>{regInfo.parent_name}</NoTranslate></div></div>}
              {regInfo.parent_phone && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Guardian Phone"}</div><div className="font-semibold text-ink font-mono text-xs"><NoTranslate>{regInfo.parent_phone}</NoTranslate></div></div>}
            </div>
          </Card>
        )}
      </Card>

      <Card className="text-center">
        <div className="mb-4">
          <h2 className="font-display font-bold text-xl text-ink leading-tight">{"Attendance QR Code"}</h2>
          <p className="text-sm text-ink-mute mt-0.5">{"Print as attendance card — QR never changes"}</p>
        </div>
        <div className="flex justify-center my-4">
          <QRBox
            value={profile?.qr_code ?? `NSS-M-${studentId.slice(0, 8).toUpperCase()}`}
            size={180}
            downloadable
            downloadName={`QR-${profile?.full_name?.replace(/\s+/g, "-") ?? studentId}`}
          />
        </div>
        <div className="flex justify-center gap-2">
          <a href={waLink("Hello, please send my child's attendance QR card for printing.")} target="_blank" rel="noreferrer">
            <Btn variant="wa" size="md" icon="whatsapp">{"Request Print"}</Btn>
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle sub={"Editable by you"}>{"Editable Information"}</SectionTitle>
        <div className="space-y-3">
          <Field label={"Phone Number"}><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></Field>
          <Field label={"Address"}><Textarea rows={2} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></Field>
          <Field label={"Medical history / allergies"}><Textarea rows={2} value={editHealth} onChange={(e) => setEditHealth(e.target.value)} /></Field>
          <Btn variant="primary" disabled={saving} onClick={saveProfile}>{"Save changes"}</Btn>
        </div>
        <div className="mt-4 pt-4 border-t border-line text-xs text-ink-mute flex items-start gap-2">
          <Icon name="info" className="w-4 h-4 mt-0.5 text-wave-600" />
          {"To change name, date of birth, or class — please contact center admin."}
        </div>
      </Card>

      <Card>
        <SectionTitle>{"Change Password"}</SectionTitle>
        <div className="space-y-3">
          <Field label={"New password"}>
            <div className="relative">
              <Input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowNewPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
          <Field label={"Confirm password"}>
            <div className="relative">
              <Input type={showConfirmPwd ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirmPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showConfirmPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
          {pwdError && <p className="text-xs text-danger-600">{pwdError}</p>}
          <Btn variant="primary" disabled={pwdSaving} onClick={changePwd}>{"Save new password"}</Btn>
        </div>
      </Card>

      <Card>
        <button onClick={onLogout} className="w-full flex items-center gap-3 py-1 text-left group">
          <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-500 flex items-center justify-center group-hover:bg-danger-100 transition-colors">
            <Icon name="logout" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-danger-600 group-hover:text-danger-700">{"Log out of account"}</span>
        </button>
      </Card>

      {photoView && (
        <PhotoLightbox
          src={avatarPreview ?? profile?.avatar_url ?? null}
          name={studentName}
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
