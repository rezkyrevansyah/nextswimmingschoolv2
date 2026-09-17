"use client";
import React, { useState, useRef } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import Modal from "@/components/ui/Modal";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import DatePicker from "@/components/ui/DatePicker";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { fmtMonthYear, toDbDate, fromDbDate } from "../_utils";
import type { ProfileData } from "../_types";

// ── Cert photo (resolves private-bucket storage key → signed URL) ────────────
function CertPhotoLink({ storageKey, title }: { storageKey: string; title: string }) {
  const url = useSignedUrl(storageKey);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={title} className="w-full max-h-40 object-cover rounded-xl border border-line hover:opacity-90 transition-opacity" />
    </a>
  );
}

export default function CoachProfile({ profile, onRefresh, onLogout, onAvatarChange }: { profile: ProfileData | null; onRefresh: () => void; onLogout: () => void; onAvatarChange?: (url: string) => void }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const { upload, uploading } = useUpload();
  // Password
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  // Avatar
  const [photoView, setPhotoView] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [, setPendingAvatarFile] = useState<File | null>(null);
  // Inline profile form
  const [profileForm, setProfileForm] = useState({
    nick_name: "", gender: "", birth_date: "", phone: "",
    specialization: "", bio: "", address: "",
    education_level: "", education_institution: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  // Bank modal
  const [openEditBank, setOpenEditBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", bank_account: "", bank_holder: "" });
  const [savingBank, setSavingBank] = useState(false);
  // Cert modal
  const [openAddCert, setOpenAddCert] = useState(false);
  const [editCertTarget, setEditCertTarget] = useState<{ id: string; title: string; issuer: string | null; valid_from: string | null; valid_until: string | null; photo_url: string | null; status: string; reject_reason: string | null } | null>(null);
  const editCertTargetPhotoUrl = useSignedUrl(editCertTarget?.photo_url);
  const [certForm, setCertForm] = useState({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
  const [certFile, setCertFile] = useState<File | null>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const [savingCert, setSavingCert] = useState(false);

  // Populate inline form when profile loads
  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from profile */
  React.useEffect(() => {
    if (!profile) return;
    setProfileForm({
      nick_name: profile.nick_name ?? "",
      gender: profile.gender ?? "",
      birth_date: profile.birth_date ?? "",
      phone: profile.phone ?? "",
      specialization: profile.specialization ?? "",
      bio: profile.bio ?? "",
      address: profile.address ?? "",
      education_level: profile.education_level ?? "",
      education_institution: profile.education_institution ?? "",
    });
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const changePassword = async () => {
    if (!newPwd || newPwd.length < 6) return toast.error(t("coach.profile.pwdMinLength"));
    if (newPwd !== confirmPwd) return toast.error(t("coach.profile.pwdMismatch"));
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) return toast.error(t("coach.profile.pwdChangeFailed"), error.message);
    toast.success(t("coach.profile.pwdChanged"));
    setNewPwd(""); setConfirmPwd("");
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setPhotoView(false);
    try {
      const url = await upload.avatar(file);
      // Propagate new URL to parent so Shell header avatar also updates
      onAvatarChange?.(url);
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      toast.success(t("coach.profile.avatarUpdated"));
    } catch {
      toast.error(t("coach.profile.photoUploadFailed"));
      setAvatarPreview(null);
      setPendingAvatarFile(null);
    }
  };

  const saveCert = async () => {
    if (!profile?.id) return toast.error(t("coach.profile.profileNotLoaded"));
    setSavingCert(true);
    const title = certForm.title.trim();

    // 1. Insert cert row
    const { data: cert, error } = await supabase.from("certifications").insert({
      coach_id: profile.id, name: title || "Sertifikasi", title: title || null,
      issuer: certForm.issuer || null,
      valid_from: certForm.issued_at ? toDbDate(certForm.issued_at) : null,
      valid_until: certForm.no_expiry ? null : (certForm.expires_at ? toDbDate(certForm.expires_at) : null),
      no_expiry: certForm.no_expiry,
      status: "pending",
    }).select("id").single();

    if (error) { setSavingCert(false); return toast.error(t("coach.profile.addCertFailed"), error.message); }

    // 2. Upload photo if provided — route handler already updates photo_url in DB
    if (cert && certFile) {
      try { await upload.cert(certFile, cert.id); } catch { /* non-fatal */ }
    }

    setSavingCert(false);
    toast.success(t("coach.profile.certAddedTitle"), t("coach.profile.certAddedBody"));
    setOpenAddCert(false);
    setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
    setCertFile(null);
    onRefresh();
  };

  const openCertEdit = (s: { id: string; title: string; issuer: string | null; valid_from: string | null; valid_until: string | null; photo_url: string | null; status: string; reject_reason: string | null }) => {
    setEditCertTarget(s);
    setCertForm({ title: s.title, issuer: s.issuer ?? "", issued_at: fromDbDate(s.valid_from), expires_at: fromDbDate(s.valid_until), no_expiry: !s.valid_until });
    setCertFile(null);
    setOpenAddCert(true);
  };

  const deleteCert = async (s: { id: string; title: string }) => {
    const ok = await confirm({ title: t("coach.profile.deleteCertConfirmTitle"), body: t("coach.profile.deleteCertConfirmBody", { title: s.title }), confirmLabel: t("coach.profile.deleteCertConfirmLabel"), danger: true });
    if (!ok) return;
    const { error } = await supabase.from("certifications").delete().eq("id", s.id);
    if (error) return toast.error(t("coach.profile.deleteCertFailed"), error.message);
    toast.success(t("coach.profile.certDeleted"));
    onRefresh();
  };

  const resubmitCert = async (id: string) => {
    const { error } = await supabase.from("certifications")
      .update({ status: "pending", reject_reason: null })
      .eq("id", id);
    if (error) return toast.error(t("coach.profile.resubmitCertFailed"), error.message);
    toast.success(t("coach.profile.certResubmittedTitle"), t("coach.profile.certResubmittedBody"));
    onRefresh();
  };

  const saveCertEdit = async () => {
    if (!editCertTarget) return toast.error(t("coach.profile.certNotFound"));
    setSavingCert(true);
    const title = certForm.title.trim();
    // Any edit on an approved or rejected cert resets it to pending for re-approval
    const needsReapproval = editCertTarget.status === "approved" || editCertTarget.status === "rejected";
    const { error } = await supabase.from("certifications").update({
      name: title || "Sertifikasi", title: title || null, issuer: certForm.issuer || null,
      valid_from: certForm.issued_at ? toDbDate(certForm.issued_at) : null,
      valid_until: certForm.no_expiry ? null : (certForm.expires_at ? toDbDate(certForm.expires_at) : null),
      no_expiry: certForm.no_expiry,
      ...(needsReapproval ? { status: "pending", reject_reason: null } : {}),
    }).eq("id", editCertTarget.id);
    if (!error && certFile) {
      try { await upload.cert(certFile, editCertTarget.id); } catch { /* non-fatal */ }
    }
    setSavingCert(false);
    if (error) return toast.error(t("coach.profile.updateCertFailed"), error.message);
    toast.success(t("coach.profile.certUpdated"));
    setOpenAddCert(false);
    setEditCertTarget(null);
    onRefresh();
  };

  const saveProfileInfo = async () => {
    setSavingProfile(true);
    // Compute completeness with the values being saved (bank fields come from existing profile)
    const nowComplete = !!(
      (profileForm.phone || null) &&
      (profileForm.gender || null) &&
      (profileForm.birth_date || null) &&
      (profile?.bank_name) &&
      (profile?.bank_account) &&
      (profile?.bank_holder)
    );
    const { error } = await supabase.from("profiles").update({
      nick_name: profileForm.nick_name || null,
      gender: profileForm.gender || null,
      birth_date: profileForm.birth_date || null,
      phone: profileForm.phone || null,
      specialization: profileForm.specialization || null,
      bio: profileForm.bio || null,
      address: profileForm.address || null,
      education_level: profileForm.education_level || null,
      education_institution: profileForm.education_institution || null,
      is_profile_complete: nowComplete,
    }).eq("id", profile?.id ?? "");
    setSavingProfile(false);
    if (error) return toast.error(t("coach.profile.saveProfileFailed"), error.message);
    toast.success(t("coach.profile.profileUpdated"));
    onRefresh();
  };

  const openBankEdit = () => {
    setBankForm({ bank_name: profile?.bank_name ?? "", bank_account: profile?.bank_account ?? "", bank_holder: profile?.bank_holder ?? "" });
    setOpenEditBank(true);
  };

  const saveBank = async () => {
    if (!bankForm.bank_name || !bankForm.bank_account || !bankForm.bank_holder) return toast.error(t("coach.profile.bankFieldsRequired"));
    setSavingBank(true);
    const nowComplete = !!(
      bankForm.bank_name && bankForm.bank_account && bankForm.bank_holder &&
      profile?.phone && profile?.gender && profile?.birth_date
    );
    const { error } = await supabase.from("profiles").update({
      bank_name: bankForm.bank_name, bank_account: bankForm.bank_account, bank_holder: bankForm.bank_holder,
      is_profile_complete: nowComplete,
    }).eq("id", profile?.id ?? "");
    setSavingBank(false);
    if (error) return toast.error(t("coach.profile.saveBankFailed"), error.message);
    toast.success(t("coach.profile.bankUpdated"));
    setOpenEditBank(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* ── Avatar card ── */}
      <Card>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setPhotoView(true)} className="relative inline-block shrink-0 cursor-zoom-in group">
            <Avatar name={profile?.full_name ?? "C"} size={72} src={avatarPreview ?? profile?.avatar_url ?? undefined} />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm pointer-events-none">
              <Icon name="camera" className="w-3 h-3" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink leading-tight">{profile?.full_name ?? "—"}</div>
            {profile?.nick_name && <div className="text-sm text-ink-mute">({profile.nick_name})</div>}
            <div className="text-sm text-ocean-700 font-semibold mt-0.5">{profile?.specialization ?? t("coach.home.defaultCoachName")}</div>
          </div>
          {profile?.qr_code && (
            <div className="shrink-0">
              <QRBox value={profile.qr_code} size={72} downloadable />
            </div>
          )}
        </div>
        {uploading && (
          <div className="mt-2 text-xs text-ink-mute font-semibold animate-pulse">{t("coach.profile.uploadingPhoto")}</div>
        )}
      </Card>

      {/* ── Inline Profile form ── */}
      <Card>
        <SectionTitle>{t("coach.profile.myProfileTitle")}</SectionTitle>
        <div className="mt-4 space-y-4">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{t("coach.profile.personalDataLabel")}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("coach.profile.fieldNickname")}><Input value={profileForm.nick_name} onChange={e => setProfileForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={t("coach.profile.nicknamePlaceholder")} /></Field>
            <Field label={t("coach.profile.fieldGender")}>
              <Select value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("coach.profile.selectEllipsis")}</option>
                <option value="male">{t("coach.kelas.memberGenderMale")}</option>
                <option value="female">{t("coach.kelas.memberGenderFemale")}</option>
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("coach.profile.fieldBirthDate")}><DatePicker value={profileForm.birth_date} onChange={v => setProfileForm(f => ({ ...f, birth_date: v }))} /></Field>
            <Field label={t("coach.profile.fieldWaNumber")}><Input type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{t("coach.profile.emailLabel")}</div>
              <div className="text-sm font-semibold text-ink">{profile?.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">{t("coach.profile.idNumberLabel")}</div>
              <div className="text-sm font-semibold text-ink font-mono">{profile?.user_no ?? "—"}</div>
            </div>
          </div>
          <Field label={t("coach.profile.fieldAddress")}><Textarea rows={2} value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder={t("coach.profile.addressPlaceholder")} /></Field>

          <div className="pt-3 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("coach.profile.educationSectionTitle")}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("coach.profile.fieldEducationLevel")}>
                <Select value={profileForm.education_level} onChange={e => setProfileForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">{t("coach.profile.selectEllipsis")}</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t("coach.profile.fieldInstitutionName")}><Input value={profileForm.education_institution} onChange={e => setProfileForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={t("coach.profile.institutionPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-3 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("coach.profile.coachProfileSectionTitle")}</div>
            <div className="space-y-3">
              <Field label={t("coach.profile.fieldSpecialization")}><Input value={profileForm.specialization} onChange={e => setProfileForm(f => ({ ...f, specialization: e.target.value }))} placeholder={t("coach.profile.specializationPlaceholder")} /></Field>
              <Field label={t("coach.profile.fieldBio")}><Textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} placeholder={t("coach.profile.bioPlaceholder")} /></Field>
            </div>
          </div>

          <Btn variant="primary" size="md" onClick={saveProfileInfo} disabled={savingProfile}>{savingProfile ? t("coach.absen.savingBtn") : t("coach.profile.saveProfileBtn")}</Btn>
        </div>
      </Card>

      {/* ── Bank info ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>{t("coach.profile.bankInfoTitle")}</SectionTitle>
          <Btn variant="ghost" size="sm" icon="edit" onClick={openBankEdit}>{t("common.actions.edit")}</Btn>
        </div>
        {profile?.bank_name ? (
          <div className="text-sm font-semibold text-ink">{profile.bank_name} · <span className="font-mono">{profile.bank_account}</span> a/n {profile.bank_holder}</div>
        ) : (
          <div className="text-sm text-warn-600 font-semibold">{t("coach.profile.bankNotFilled")}</div>
        )}
      </Card>

      {/* ── Certifications ── */}
      <Card padded={false}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <SectionTitle sub={t("coach.profile.certsSub")}>{t("coach.profile.certsTitle")}</SectionTitle>
          <Btn variant="soft" size="sm" icon="plus" onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false }); setCertFile(null); setEditCertTarget(null); setOpenAddCert(true); }}>{t("coach.invoice.addBtn")}</Btn>
        </div>
        <div className="divide-y divide-line">
          {(profile?.certifications ?? []).map((s) => (
            <div key={s.id} className="px-5 py-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.status === "approved" ? "bg-ok-50 text-ok-600" : s.status === "rejected" ? "bg-danger-50 text-danger-600" : "bg-warn-50 text-warn-600"}`}><Icon name="shield" className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{s.title}</div>
                  {s.valid_from && <div className="text-xs text-ink-mute">{fmtMonthYear(s.valid_from)}{s.valid_until ? ` – ${fmtMonthYear(s.valid_until)}` : ` · ${t("coach.profile.noExpiryLabel")}`}</div>}
                </div>
                <Status kind={s.status}>{s.status === "approved" ? t("coach.profile.certStatusApproved") : s.status === "rejected" ? t("coach.profile.certStatusRejected") : t("coach.profile.certStatusPending")}</Status>
                <div className="flex items-center gap-1">
                  <button onClick={() => openCertEdit(s)} className="p-1.5 rounded hover:bg-paper-tint text-ink-mute hover:text-ink" title={t("common.actions.edit")}><Icon name="edit" className="w-4 h-4" /></button>
                  <button onClick={() => deleteCert(s)} className="p-1.5 rounded hover:bg-danger-50 text-ink-mute hover:text-danger-600" title={t("coach.profile.deleteTitleAttr")}><Icon name="trash" className="w-4 h-4" /></button>
                </div>
              </div>
              {s.status === "rejected" && (
                <div className="space-y-2">
                  {s.reject_reason && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger-50 border border-danger-100">
                      <Icon name="warning" className="w-4 h-4 text-danger-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-danger-600 uppercase tracking-wide mb-0.5">{t("coach.profile.rejectedReasonLabel")}</div>
                        <div className="text-sm text-danger-700">{s.reject_reason}</div>
                      </div>
                    </div>
                  )}
                  <Btn variant="soft" size="sm" icon="refresh" onClick={() => resubmitCert(s.id)}>{t("coach.profile.resubmitBtn")}</Btn>
                </div>
              )}
              {s.photo_url && <CertPhotoLink storageKey={s.photo_url} title={s.title} />}
            </div>
          ))}
          {(profile?.certifications?.length ?? 0) === 0 && <div className="px-5 py-4 text-sm text-ink-mute">{t("coach.profile.noCertsYet")}</div>}
        </div>
      </Card>

      {/* ── Change password ── */}
      <Card>
        <SectionTitle>{t("coach.profile.changePasswordTitle")}</SectionTitle>
        <div className="mt-4 space-y-3">
          <Field label={t("coach.profile.fieldNewPassword")}><Input type="password" placeholder="••••••••" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></Field>
          <Field label={t("coach.profile.fieldConfirmPassword")}><Input type="password" placeholder="••••••••" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></Field>
          <Btn variant="primary" size="md" onClick={changePassword} disabled={savingPwd}>{savingPwd ? t("coach.absen.savingBtn") : t("coach.profile.savePasswordBtn")}</Btn>
        </div>
      </Card>

      {/* ── Cert modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setEditCertTarget(null); }} title={editCertTarget ? t("coach.profile.editCertModalTitle") : t("coach.profile.addCertModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setEditCertTarget(null); }}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={editCertTarget ? saveCertEdit : saveCert} disabled={savingCert}>{savingCert ? t("coach.absen.savingBtn") : t("coach.clockIn.submitBtn")}</Btn></>}>
        <div className="space-y-4">
          {editCertTarget?.status === "approved" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-xs text-warn-800">
              <Icon name="info" className="w-4 h-4 shrink-0 mt-0.5 text-warn-600" />
              {t("coach.profile.approvedCertEditWarningPrefix")} <strong>{t("coach.profile.approvedCertEditWarningMiddle")}</strong> {t("coach.profile.approvedCertEditWarningSuffix")}
            </div>
          )}
          <Field label={t("coach.profile.fieldCertName")}><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder={t("coach.profile.certNamePlaceholder")} /></Field>
          <Field label={t("coach.profile.fieldIssuer")}><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder={t("coach.profile.issuerPlaceholder")} /></Field>
          <Field label={t("coach.profile.fieldValidFrom")}><MonthYearPicker value={certForm.issued_at} onChange={v => setCertForm(f => ({ ...f, issued_at: v }))} placeholder={t("coach.profile.monthYearPlaceholder")} /></Field>
          <Field label={t("coach.profile.fieldValidUntil")}><MonthYearPicker value={certForm.expires_at} onChange={v => setCertForm(f => ({ ...f, expires_at: v }))} placeholder={t("coach.profile.monthYearPlaceholder")} disabled={certForm.no_expiry} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, no_expiry: e.target.checked, expires_at: "" }))} className="rounded" />
            {t("coach.profile.noExpiryCheckbox")}
          </label>
          <div>
            <div className="text-sm font-semibold text-ink mb-1.5">{t("coach.profile.certPhotoLabel")} <span className="text-ink-faint font-normal text-xs">{t("coach.profile.certPhotoOptionalHint")}</span></div>
            {editCertTargetPhotoUrl && !certFile && (
              <img src={editCertTargetPhotoUrl} alt={t("coach.profile.currentPhotoAlt")} className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            {certFile && (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL from file picker
              <img src={URL.createObjectURL(certFile)} alt={t("coach.profile.previewAlt")} className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => certFileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper-tint hover:bg-white hover:border-ocean-400 transition-colors text-sm font-semibold text-ink-soft hover:text-ink">
                <Icon name="camera" className="w-4 h-4" />
                {certFile ? t("coach.profile.changePhotoBtn") : editCertTarget?.photo_url ? t("coach.profile.changePhotoBtn") : t("coach.profile.choosePhotoBtn")}
              </button>
              {certFile && <span className="text-sm text-ink-mute truncate max-w-[160px]">{certFile.name}</span>}
              <input ref={certFileInputRef} type="file" accept="image/*" className="sr-only" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Bank modal ── */}
      <Modal open={openEditBank} onClose={() => setOpenEditBank(false)} title={t("coach.profile.editBankModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditBank(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveBank} disabled={savingBank}>{savingBank ? t("coach.absen.savingBtn") : t("coach.kelas.saveBtn")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("coach.profile.fieldBankName")} required><Input value={bankForm.bank_name} onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={t("coach.profile.bankNamePlaceholder")} /></Field>
          <Field label={t("coach.profile.fieldAccountNumber")} required><Input value={bankForm.bank_account} onChange={e => setBankForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={t("coach.profile.accountNumberPlaceholder")} /></Field>
          <Field label={t("coach.profile.fieldAccountHolder")} required><Input value={bankForm.bank_holder} onChange={e => setBankForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={t("coach.profile.accountHolderPlaceholder")} /></Field>
        </div>
      </Modal>

      <Card>
        <button onClick={onLogout} className="w-full flex items-center gap-3 py-1 text-left group">
          <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-500 flex items-center justify-center group-hover:bg-danger-100 transition-colors">
            <Icon name="logout" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-danger-600 group-hover:text-danger-700">{t("coach.profile.logoutBtn")}</span>
        </button>
      </Card>

      {photoView && (
        <PhotoLightbox
          src={avatarPreview ?? profile?.avatar_url ?? null}
          name={profile?.full_name ?? "C"}
          onClose={() => setPhotoView(false)}
          onChangePick={handleAvatarPick}
          uploading={uploading}
        />
      )}
    </div>
  );
}
