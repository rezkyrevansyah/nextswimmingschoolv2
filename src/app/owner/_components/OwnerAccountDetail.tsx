"use client";
import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import QRBox from "@/components/ui/QRBox";
import { Field, Input, Select, Textarea, SectionLabel } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDate } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { downloadSingleQRCard } from "@/lib/qrCardGenerator";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AccountMemberData {
  id: string;
  member_no: string | null;
  qr_code: string | null;
  type: string;
  status: string;
  remaining_sessions: number | null;
  total_sessions: number | null;
  school_id: string | null;
  school_grade: string | null;
  date_start: string | null;
  school?: { id: string; name: string } | null;
  member_classes?: { class: { id: string; name: string; time_start?: string; time_end?: string } }[];
}

export interface AccountProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  custom_role_label: string | null;
  branch_id: string | null;
  branch?: { id?: string; name: string } | null;
  avatar_url: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  user_no: string | null;
  qr_code?: string | null;
  is_archived: boolean;
  created_at: string;
  specialization: string | null;
  bio: string | null;
  linked_admin_id?: string | null;
  member?: AccountMemberData | null;
  members?: AccountMemberData[] | null;
}

interface Props {
  account: AccountProfile | null;
  branches: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

// Only roles actually paid through this system carry a bank account —
// members/schools pay the school, they don't receive payouts from it.
const BANK_ACCOUNT_ROLES = ["staff", "admin", "coach", "manager_center"];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-ocean-100 text-ocean-700 border-ocean-200",
  manager_center: "bg-indigo-100 text-indigo-700 border-indigo-200",
  coach: "bg-wave-100 text-wave-700 border-wave-200",
  member: "bg-green-100 text-green-700 border-green-200",
  school: "bg-amber-100 text-amber-700 border-amber-200",
  staff: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function OwnerAccountDetail({ account, branches, open, onClose, onRefresh }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tNode } = useLocale();
  const supabase = createClient();

  const ROLE_LABELS: Record<string, string> = {
    owner: t("owner.accounts.roleOwner"),
    admin: t("owner.accounts.roleAdmin"),
    manager_center: t("owner.accounts.roleManagerCenter"),
    coach: t("owner.accounts.roleCoach"),
    member: t("owner.accounts.roleMember"),
    school: t("owner.accounts.roleSchool"),
    staff: t("owner.accounts.roleStaff"),
  };

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banning, setBanning] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPwdReset, setShowPwdReset] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Extra loaded details (coach classes, certifications, member classes)
  const [coachClasses, setCoachClasses] = useState<{ id: string; name: string; time_start?: string; time_end?: string; branch?: { name: string } }[]>([]);
  const [certifications, setCertifications] = useState<{ id: string; name: string; title: string; valid_until: string | null }[]>([]);
  const [memberData, setMemberData] = useState<AccountMemberData | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [downloadingQr, setDownloadingQr] = useState(false);

  // For admin/manager_center accounts with an auto-created linked Staff account:
  // personal + bank fields live on the Staff profile (the only place they're ever
  // entered — via the Staff panel's profile gate), not on this primary row, which
  // stays permanently null for those columns. Look it up so we display/edit the
  // real data instead of an empty primary row.
  const [linkedStaff, setLinkedStaff] = useState<{
    id: string;
    gender: string | null;
    birth_date: string | null;
    address: string | null;
    bank_name: string | null;
    bank_account: string | null;
    bank_holder: string | null;
  } | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "staff",
    branch_id: "",
    gender: "",
    birth_date: "",
    address: "",
    bank_name: "",
    bank_account: "",
    bank_holder: "",
    custom_role_label: "",
    bio: "",
    specialization: "",
    // Member fields
    member_type: "reguler",
    total_sessions: "",
    remaining_sessions: "",
    school_id: "",
    school_grade: "",
  });

  // Load contextual relations for the account
  useEffect(() => {
    if (!account || !open) return;

    const linkedStaffQuery =
      account.role === "admin" || account.role === "manager_center"
        ? supabase
            .from("profiles")
            .select("id, gender, birth_date, address, bank_name, bank_account, bank_holder")
            .eq("linked_admin_id", account.id)
            .maybeSingle()
        : Promise.resolve({ data: null });
    linkedStaffQuery.then(({ data }) => setLinkedStaff(data ?? null));

    if (account.role === "coach") {
      supabase
        .from("class_coaches")
        .select("class:classes(id, name, time_start, time_end, branch:branches(name))")
        .eq("coach_id", account.id)
        .then(({ data }) => {
          if (data) setCoachClasses(data.map((d: any) => d.class).filter(Boolean));
        });

      supabase
        .from("certifications")
        .select("id, name, title, valid_until")
        .eq("coach_id", account.id)
        .then(({ data }) => {
          if (data) setCertifications(data);
        });
    }

    if (account.role === "member") {
      supabase
        .from("members")
        .select("id, member_no, qr_code, type, status, remaining_sessions, total_sessions, school_id, school_grade, date_start, school:schools(id, name), member_classes(class:classes(id, name, time_start, time_end))")
        .eq("profile_id", account.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMemberData(data as unknown as AccountMemberData);
        });
    }

    supabase.from("schools").select("id, name").order("name").then(({ data }) => {
      if (data) setSchools(data);
    });
  }, [account, open, supabase]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("owner.accountDetail.copiedToast", { label }), text);
  };

  const openEdit = () => {
    if (!account) return;
    const m = memberData || (account.members && account.members[0]) || account.member;
    const personal = linkedStaff ?? account;
    setForm({
      full_name: account.full_name ?? "",
      email: account.email ?? "",
      phone: account.phone ?? "",
      role: account.role ?? "staff",
      branch_id: account.branch_id ?? "",
      gender: personal.gender ?? "",
      birth_date: personal.birth_date ?? "",
      address: personal.address ?? "",
      bank_name: personal.bank_name ?? "",
      bank_account: personal.bank_account ?? "",
      bank_holder: personal.bank_holder ?? "",
      custom_role_label: account.custom_role_label ?? "",
      bio: account.bio ?? "",
      specialization: account.specialization ?? "",
      member_type: m?.type || "reguler",
      total_sessions: m?.total_sessions != null ? String(m.total_sessions) : "",
      remaining_sessions: m?.remaining_sessions != null ? String(m.remaining_sessions) : "",
      school_id: m?.school_id || "",
      school_grade: m?.school_grade || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!account) return;
    if (!form.full_name.trim()) return toast.error(t("owner.accountDetail.fullNameRequired"));

    setSaving(true);

    const personalFields = {
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      address: form.address.trim() || null,
      bank_name: form.bank_name.trim() || null,
      bank_account: form.bank_account.trim() || null,
      bank_holder: form.bank_holder.trim() || null,
    };

    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim() || undefined,
        profile: {
          full_name: form.full_name.trim(),
          role: form.role,
          phone: form.phone.trim() || null,
          branch_id: form.branch_id || null,
          custom_role_label: form.custom_role_label.trim() || null,
          bio: form.bio.trim() || null,
          specialization: form.specialization.trim() || null,
          // Personal/bank fields live on the linked Staff account instead, when
          // one exists — see the second PATCH below.
          ...(linkedStaff ? {} : personalFields),
        },
        user_metadata: {
          full_name: form.full_name.trim(),
          role: form.role,
          branch_id: form.branch_id || null,
        },
      }),
    });

    // Personal/bank data belongs to the linked Staff account (the one place it's
    // actually entered, via the Staff panel) — write there instead of this
    // primary row, so both views always agree with a single source of truth.
    if (linkedStaff) {
      await fetch(`/api/admin/users/${linkedStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: personalFields }),
      });
    }

    // If member, update members table too
    if (account.role === "member" && memberData) {
      await supabase
        .from("members")
        .update({
          type: form.member_type,
          total_sessions: form.total_sessions ? Number(form.total_sessions) : null,
          remaining_sessions: form.remaining_sessions ? Number(form.remaining_sessions) : null,
          school_id: form.member_type === "school_affiliate" ? form.school_id || null : null,
          school_grade: form.member_type === "school_affiliate" ? form.school_grade.trim() || null : null,
          branch_id: form.branch_id || null,
        })
        .eq("id", memberData.id);
    }

    setSaving(false);
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return toast.error(t("owner.accountDetail.saveFailed"), json.error);

    toast.success(t("owner.accountDetail.profileUpdated"));
    setEditing(false);
    onRefresh();
  };

  const handleBanToggle = async () => {
    if (!account) return;
    const isCurrentlyBanned = account.is_archived;
    const action = isCurrentlyBanned ? "unban" : "ban";
    const confirmed = await confirm({
      title: isCurrentlyBanned
        ? tNode("owner.accountDetail.reactivateConfirmTitle", { name: account.full_name })
        : tNode("owner.accountDetail.deactivateConfirmTitle", { name: account.full_name }),
      body: isCurrentlyBanned
        ? t("owner.accountDetail.reactivateConfirmBody")
        : t("owner.accountDetail.deactivateConfirmBody"),
      danger: !isCurrentlyBanned,
    });
    if (!confirmed) return;
    setBanning(true);
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBanning(false);
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return toast.error(t("owner.accountDetail.banToggleFailed"), json.error);
    toast.success(
      isCurrentlyBanned ? t("owner.accountDetail.reactivatedToast") : t("owner.accountDetail.deactivatedToast")
    );
    onRefresh();
    onClose();
  };

  const handleResetPassword = async () => {
    if (!account || !newPassword.trim()) return;
    if (newPassword.length < 6) return toast.error(t("owner.accountDetail.pwdMinLength"));
    setResettingPwd(true);
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResettingPwd(false);
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return toast.error(t("owner.accountDetail.resetPasswordFailed"), json.error);
    toast.success(
      t("owner.accountDetail.passwordResetToast"),
      tNode("owner.accountDetail.passwordResetSub", { name: account.full_name })
    );
    setNewPassword("");
    setShowPwdReset(false);
  };

  const handleDelete = async () => {
    if (!account) return;
    const confirmed = await confirm({
      title: tNode("owner.accountDetail.deleteConfirmTitle", { name: account.full_name }),
      body: t("owner.accountDetail.deleteConfirmBody"),
      danger: true,
    });
    if (!confirmed) return;
    const res = await fetch(`/api/admin/users/${account.id}`, { method: "DELETE" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return toast.error(t("owner.accountDetail.deleteFailed"), json.error);
    toast.success(t("owner.accountDetail.deletedToast"));
    onRefresh();
    onClose();
  };

  const handleDownloadSingleQR = async () => {
    if (!account) return;
    setDownloadingQr(true);
    try {
      const qrValue = memberData?.qr_code || memberData?.member_no || account.qr_code || account.user_no || account.id;
      await downloadSingleQRCard(
        {
          id: account.id,
          full_name: account.full_name,
          email: account.email,
          role: account.role,
          custom_role_label: account.custom_role_label,
          user_no: account.user_no,
          member_no: memberData?.member_no,
          qr_code: qrValue,
          branch: account.branch,
          phone: account.phone,
        },
        qrValue
      );
      toast.success(t("owner.accountDetail.qrCardDownloaded"));
    } catch (err) {
      console.error(err);
      toast.error(t("owner.accountDetail.qrCardDownloadFailed"));
    }
    setDownloadingQr(false);
  };

  if (!account) return null;

  const roleLabel = ROLE_LABELS[account.role] ?? account.role;
  const isKnownRole = account.role in ROLE_LABELS;
  const roleColor = ROLE_COLORS[account.role] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const displayName = account.full_name?.trim() || account.email?.split("@")[0] || roleLabel || "—";
  const activeQR = memberData?.qr_code || memberData?.member_no || account.qr_code || account.user_no || account.id;

  // Personal + bank data source: the linked Staff account when one exists
  // (see linkedStaff state above), otherwise this account's own row.
  const personalSource = linkedStaff ?? account;

  // Calculate age if birth_date exists
  const calcAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return null;
    const dob = new Date(birthDateStr);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };
  const age = calcAge(personalSource.birth_date);

  return (
    <Modal
      open={open}
      onClose={() => {
        setEditing(false);
        setShowPwdReset(false);
        onClose();
      }}
      title={editing ? t("owner.accountDetail.editTitle") : t("owner.accountDetail.viewTitle")}
      size="lg"
      footer={
        editing ? (
          <>
            <Btn variant="ghost" onClick={() => setEditing(false)}>
              {t("owner.accountDetail.cancelBtn")}
            </Btn>
            <Btn variant="primary" onClick={saveEdit} disabled={saving}>
              {saving ? t("owner.accountDetail.savingBtn") : t("owner.accountDetail.saveBtn")}
            </Btn>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={openEdit}>
              {t("owner.accountDetail.editBtn")}
            </Btn>
            <Btn variant="ghost" icon="key" onClick={() => setShowPwdReset((v) => !v)}>
              {t("owner.accountDetail.resetPasswordBtn")}
            </Btn>
            <Btn
              variant="ghost"
              icon={account.is_archived ? "check" : "x"}
              className={
                account.is_archived ? "text-ok-600 hover:bg-ok-50" : "text-warn-600 hover:bg-warn-50"
              }
              onClick={handleBanToggle}
              disabled={banning}
            >
              {banning
                ? t("owner.accountDetail.processingBtn")
                : account.is_archived
                ? t("owner.accountDetail.reactivateBtn")
                : t("owner.accountDetail.deactivateBtn")}
            </Btn>
            <Btn
              variant="ghost"
              icon="trash"
              className="text-danger-600 hover:bg-danger-50"
              onClick={handleDelete}
            >
              {t("owner.accountDetail.deleteBtn")}
            </Btn>
          </div>
        )
      }
    >
      {editing ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("owner.accountDetail.fieldFullName")} required>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label={t("owner.accountDetail.fieldRole")}>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="owner">{t("owner.accounts.roleOwner")}</option>
                <option value="admin">{t("owner.accounts.roleAdmin")}</option>
                <option value="manager_center">{t("owner.accounts.roleManagerCenter")}</option>
                <option value="coach">{t("owner.accounts.roleCoach")}</option>
                <option value="member">{t("owner.accounts.roleMember")}</option>
                <option value="staff">{t("owner.accounts.roleStaff")}</option>
                <option value="school">{t("owner.accounts.roleSchool")}</option>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("owner.accountDetail.fieldEmail")}>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label={t("owner.accountDetail.fieldPhone")}>
              <Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("owner.accountDetail.fieldGender")}>
              <Select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("owner.accountDetail.genderSelectPlaceholder")}</option>
                <option value="male">{t("owner.accountDetail.genderMale")}</option>
                <option value="female">{t("owner.accountDetail.genderFemale")}</option>
              </Select>
            </Field>
            <Field label={t("owner.accountDetail.fieldBirthDate")}>
              <Input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
            </Field>
          </div>

          <Field label={t("owner.accountDetail.fieldBranch")}>
            <Select value={form.branch_id} onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}>
              <option value="">{t("owner.accountDetail.branchNone")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} translate="no" className="notranslate">
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Member Specific Form Inputs */}
          {form.role === "member" && (
            <div className="border border-green-200 bg-green-50/40 rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-bold text-green-900 uppercase tracking-wider">{t("owner.accountDetail.memberSettingsTitle")}</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label={t("owner.accounts.fieldMemberType")}>
                  <Select value={form.member_type} onChange={(e) => setForm((f) => ({ ...f, member_type: e.target.value }))} disabled={form.member_type === "private"}>
                    <option value="reguler">{t("owner.accounts.memberTypeRegular")}</option>
                    <option value="school_affiliate">{t("owner.accounts.memberTypeSchoolAffiliate")}</option>
                    {form.member_type === "private" && <option value="private">{t("owner.accounts.memberTypePrivate")}</option>}
                  </Select>
                </Field>
                {form.member_type !== "private" && (
                  <>
                    <Field label={t("owner.accountDetail.fieldTotalSessions")}>
                      <Input type="number" min={0} value={form.total_sessions} onChange={(e) => setForm((f) => ({ ...f, total_sessions: e.target.value }))} />
                    </Field>
                    <Field label={t("owner.accountDetail.fieldRemainingSessions")}>
                      <Input type="number" min={0} value={form.remaining_sessions} onChange={(e) => setForm((f) => ({ ...f, remaining_sessions: e.target.value }))} />
                    </Field>
                  </>
                )}
              </div>
              {form.member_type === "private" && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800">
                  <Icon name="info" className="w-4 h-4 shrink-0 text-ocean-500" />
                  <span>{t("owner.accountDetail.privateManagedElsewhereNotice")}</span>
                </div>
              )}
              {form.member_type === "school_affiliate" && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label={t("owner.accountDetail.fieldSelectSchool")}>
                    <Select value={form.school_id} onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}>
                      <option value="">{t("owner.accountDetail.selectSchoolPlaceholder")}</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id} translate="no" className="notranslate">
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("owner.accounts.fieldSchoolGrade")} hint={t("owner.accounts.fieldSchoolGradeHint")}>
                    <Input
                      value={form.school_grade}
                      onChange={(e) => setForm((f) => ({ ...f, school_grade: e.target.value }))}
                      placeholder={t("owner.accounts.fieldSchoolGradePlaceholder")}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          <Field label={t("owner.accountDetail.fieldAddress")}>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
              placeholder={t("owner.accountDetail.addressPlaceholder")}
            />
          </Field>

          {(form.role === "staff" || form.role === "admin" || form.role === "manager_center") && (
            <Field
              label={t("owner.accountDetail.fieldCustomRoleLabel")}
              hint={t("owner.accountDetail.customRoleLabelHint")}
            >
              <Input
                value={form.custom_role_label}
                onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
                placeholder={t("owner.accountDetail.customRoleLabelPlaceholder")}
              />
            </Field>
          )}

          {form.role === "coach" && (
            <>
              <Field label={t("owner.accountDetail.fieldSpecialization")}>
                <Input
                  value={form.specialization}
                  onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                  placeholder={t("owner.accountDetail.specializationPlaceholder")}
                />
              </Field>
              <Field label={t("owner.accountDetail.fieldBio")}>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={2}
                />
              </Field>
            </>
          )}

          {BANK_ACCOUNT_ROLES.includes(form.role) && (
            <div className="border-t border-line pt-4">
              <p className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">
                {t("owner.accountDetail.bankAccountTitle")}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("owner.accountDetail.fieldBankName")}>
                  <Input
                    value={form.bank_name}
                    onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                    placeholder={t("owner.accountDetail.bankNamePlaceholder")}
                  />
                </Field>
                <Field label={t("owner.accountDetail.fieldBankAccount")}>
                  <Input
                    value={form.bank_account}
                    onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                    placeholder={t("owner.accountDetail.bankAccountPlaceholder")}
                  />
                </Field>
                <Field label={t("owner.accountDetail.fieldBankHolder")}>
                  <Input
                    value={form.bank_holder}
                    onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                    placeholder={t("owner.accountDetail.bankHolderPlaceholder")}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top: Header Info */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {account.avatar_url ? (
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-line shadow-sm">
                  <Image src={account.avatar_url} alt={displayName} fill className="object-cover" />
                </div>
              ) : (
                <Avatar name={displayName} size={64} className="rounded-2xl text-lg" />
              )}
              {account.is_archived && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full flex items-center justify-center shadow"
                  title={t("owner.accountDetail.inactiveTitleAttr")}
                >
                  <Icon name="x" className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-xl text-ink">
                  <NoTranslate>{displayName}</NoTranslate>
                </h3>
                {account.is_archived ? (
                  <Status kind="archived">{t("owner.accountDetail.inactiveBadge")}</Status>
                ) : (
                  <Status kind="active">{t("owner.accountDetail.activeBadge")}</Status>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${roleColor}`}
                >
                  {isKnownRole ? roleLabel : <NoTranslate>{roleLabel}</NoTranslate>}
                  {account.custom_role_label && !account.custom_role_label.includes("@") && (
                    <>
                      {" · "}
                      <NoTranslate>{account.custom_role_label}</NoTranslate>
                    </>
                  )}
                </span>
                {(memberData?.member_no || account.user_no) && (
                  <span className="font-mono text-xs font-bold text-ocean-700 bg-ocean-50 px-2.5 py-0.5 rounded-lg border border-ocean-200">
                    <NoTranslate>{memberData?.member_no || account.user_no}</NoTranslate>
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span>{t("owner.accountDetail.registeredOn", { date: fmtDate(account.created_at) })}</span>
                {account.branch?.name && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-ink-soft">
                      <NoTranslate>{account.branch.name}</NoTranslate>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Compact identity strip (QR + ID) ── */}
          <div className="flex items-center gap-3">
            <div
              className="shrink-0"
              title={t("owner.accountDetail.qrUsageHint")}
            >
              <QRBox value={activeQR} size={56} hideCaption />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                {t("owner.accountDetail.idLabel")}
              </div>
              <div
                className="font-mono text-sm font-semibold text-ink truncate"
                title={activeQR}
              >
                <NoTranslate>{activeQR}</NoTranslate>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Btn
                variant="ghost"
                size="sm"
                icon="copy"
                onClick={() => copyToClipboard(activeQR, t("owner.accountDetail.qrCodeCopyLabel"))}
                title={t("owner.accountDetail.copyCodeBtn")}
              />
              <Btn
                variant="ghost"
                size="sm"
                icon="download"
                onClick={handleDownloadSingleQR}
                disabled={downloadingQr}
                title={t("owner.accountDetail.downloadIdCardTitleAttr")}
              />
            </div>
          </div>

          {/* Member Specific Stats & Classes */}
          {account.role === "member" && memberData && (
            <div>
              <SectionLabel sub={t("owner.accountDetail.membershipTypeLabel", { type: memberData.type })}>
                {t("owner.accountDetail.membershipDetailsTitle")}
              </SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center">
                  <div className="text-[10px] text-ink-faint uppercase font-bold">{t("owner.accountDetail.fieldRemainingSessions")}</div>
                  <div className="text-xl font-bold font-mono text-ocean-700">
                    {memberData.remaining_sessions ?? "—"}
                  </div>
                </div>
                <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center">
                  <div className="text-[10px] text-ink-faint uppercase font-bold">{t("owner.accountDetail.fieldTotalSessions")}</div>
                  <div className="text-xl font-bold font-mono text-ink">
                    {memberData.total_sessions ?? "—"}
                  </div>
                </div>
                <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center col-span-2 sm:col-span-2">
                  <div className="text-[10px] text-ink-faint uppercase font-bold">{t("owner.accountDetail.schoolAffiliateLabel")}</div>
                  <div className="text-sm font-semibold text-ink truncate mt-0.5">
                    {memberData.school?.name ? (
                      <NoTranslate>{memberData.school.name}</NoTranslate>
                    ) : (
                      t("owner.accountDetail.nonAffiliatedFallback")
                    )}
                  </div>
                  {memberData.school_grade && (
                    <div className="text-xs text-ink-mute mt-0.5">
                      {t("owner.accounts.fieldSchoolGrade")}: <NoTranslate>{memberData.school_grade}</NoTranslate>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrolled classes */}
              {memberData.member_classes && memberData.member_classes.length > 0 && (
                <div className="pt-2 mt-2.5 border-t border-line/60">
                  <div className="text-[11px] font-bold text-ink-mute mb-1.5">{t("owner.accountDetail.enrolledClasses")}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {memberData.member_classes.map((mc, idx) => (
                      <span
                        key={mc.class?.id || idx}
                        className="bg-paper-tint px-2.5 py-1 rounded-lg border border-line/60 text-xs font-semibold text-ink-soft"
                      >
                        🏊 <NoTranslate>{mc.class?.name}</NoTranslate>{" "}
                        {mc.class?.time_start && (
                          <span className="font-normal text-ink-mute text-[11px]">
                            ({mc.class.time_start} - {mc.class.time_end})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coach Specific Classes & Certifications */}
          {account.role === "coach" && (
            <div>
              <SectionLabel>{t("owner.accountDetail.coachClassesAndCerts")}</SectionLabel>
              {coachClasses.length > 0 ? (
                <div>
                  <div className="text-[11px] font-bold text-ink-mute mb-1.5">{t("owner.accountDetail.classesTaught")}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {coachClasses.map((c) => (
                      <span
                        key={c.id}
                        className="bg-paper-tint px-2.5 py-1 rounded-lg border border-line/60 text-xs font-semibold text-ink-soft"
                      >
                        ⏱️ <NoTranslate>{c.name}</NoTranslate>{" "}
                        {c.branch?.name && (
                          <span className="font-normal text-ink-mute text-[11px]">
                            · <NoTranslate>{c.branch.name}</NoTranslate>
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-mute italic">No swimming classes assigned yet.</p>
              )}

              {certifications.length > 0 && (
                <div className="pt-2 mt-2.5 border-t border-line/60">
                  <div className="text-[11px] font-bold text-ink-mute mb-1.5">Official Certifications:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {certifications.map((cert) => (
                      <span
                        key={cert.id}
                        className="bg-paper-tint px-2.5 py-1 rounded-lg border border-line/60 text-xs font-semibold text-ink-soft"
                      >
                        📜 <NoTranslate>{cert.title || cert.name}</NoTranslate>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact & personal info */}
          <div>
          <SectionLabel>{t("owner.accountDetail.contactPersonalSection")}</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow
              icon="mail"
              label={t("owner.accountDetail.emailLabel")}
              value={<NoTranslate>{account.email ?? "—"}</NoTranslate>}
              title={account.email ?? undefined}
              onCopy={
                account.email
                  ? () => copyToClipboard(account.email!, t("owner.accountDetail.emailLabel"))
                  : undefined
              }
            />
            <InfoRow
              icon="phone"
              label={t("owner.accountDetail.phoneLabel")}
              value={<NoTranslate>{account.phone ?? "—"}</NoTranslate>}
              title={account.phone ?? undefined}
              onCopy={
                account.phone
                  ? () => copyToClipboard(account.phone!, t("owner.accountDetail.phoneLabel"))
                  : undefined
              }
            />
            <InfoRow
              icon="user"
              label={t("owner.accountDetail.genderLabel")}
              value={
                personalSource.gender === "male"
                  ? t("owner.accountDetail.genderMale")
                  : personalSource.gender === "female"
                  ? t("owner.accountDetail.genderFemale")
                  : "—"
              }
            />
            <InfoRow
              icon="calendar"
              label={t("owner.accountDetail.birthDateLabel")}
              value={
                personalSource.birth_date
                  ? `${fmtDate(personalSource.birth_date)}${age !== null ? ` (${age} yrs)` : ""}`
                  : "—"
              }
            />
            <InfoRow
              icon="pin"
              label={t("owner.accountDetail.branchLabel")}
              value={<NoTranslate>{account.branch?.name ?? "—"}</NoTranslate>}
              title={account.branch?.name ?? undefined}
            />
            <InfoRow
              icon="home"
              label={t("owner.accountDetail.addressLabel")}
              value={<NoTranslate>{personalSource.address ?? "—"}</NoTranslate>}
              title={personalSource.address ?? undefined}
            />
            {account.specialization && (
              <InfoRow
                icon="star"
                label={t("owner.accountDetail.specializationLabel")}
                value={<NoTranslate>{account.specialization}</NoTranslate>}
                title={account.specialization}
              />
            )}
            {account.bio && (
              <InfoRow
                icon="clipboard"
                label={t("owner.accountDetail.bioLabel")}
                value={<NoTranslate>{account.bio}</NoTranslate>}
                title={account.bio}
              />
            )}
          </div>
          </div>

          {account.role === "school" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
              <Icon name="info" className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{t("owner.accountDetail.schoolSettingsHint")}</span>
            </div>
          )}

          {/* Bank Account — only roles that get paid through this system */}
          {BANK_ACCOUNT_ROLES.includes(account.role) && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <SectionLabel className="flex-1">{t("owner.accountDetail.bankAccountTitle")}</SectionLabel>
                {linkedStaff && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-full px-2 py-0.5 shrink-0">
                    {t("owner.accountDetail.viaLinkedStaffBadge")}
                  </span>
                )}
              </div>
              {personalSource.bank_account ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-ink">
                      <NoTranslate>{personalSource.bank_name ?? "—"}</NoTranslate>
                    </div>
                    <div className="font-mono text-ocean-700 text-lg font-bold mt-0.5">
                      <NoTranslate>{personalSource.bank_account}</NoTranslate>
                    </div>
                    <div className="text-sm text-ink-mute">
                      {t("owner.accountDetail.accountHolderPrefix")}{" "}
                      <NoTranslate>{personalSource.bank_holder ?? "—"}</NoTranslate>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(personalSource.bank_account!, t("owner.accountDetail.fieldBankAccount"))
                    }
                    className="w-10 h-10 rounded-xl border border-ocean-200 bg-ocean-50 text-ocean-700 hover:bg-ocean-100 flex items-center justify-center transition-colors"
                    title={t("owner.accountDetail.copyBankAccountTitleAttr")}
                  >
                    <Icon name="copy" className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-ink-mute italic">
                  {t("owner.accountDetail.bankAccountEmpty")}{" "}
                  <button onClick={openEdit} className="text-ocean-600 underline">
                    {t("owner.accountDetail.addBankAccountLink")}
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Reset Password */}
          {showPwdReset && (
            <div className="rounded-xl border border-warn-200 bg-warn-50 p-4 space-y-3">
              <p className="text-sm font-bold text-warn-700 flex items-center gap-2">
                <Icon name="key" className="w-4 h-4" />
                {t("owner.accountDetail.resetPasswordTitle")}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showNewPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("owner.accountDetail.newPasswordPlaceholder")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
                  >
                    <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
                  </button>
                </div>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={resettingPwd || !newPassword.trim()}
                >
                  {resettingPwd
                    ? t("owner.accountDetail.processingBtn")
                    : t("owner.accountDetail.setPasswordBtn")}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── InfoRow helper ──────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  title,
  onCopy,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  /** Full-text value shown on hover — set this whenever `value` can overflow (addresses, notes, etc.), since `value` itself may be wrapped JSX rather than a plain string. */
  title?: string;
  onCopy?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-paper-tint border border-line/60">
      <span className="w-7 h-7 rounded-lg bg-ocean-100 text-ocean-600 flex items-center justify-center shrink-0 mt-0.5">
        <Icon name={icon as Parameters<typeof Icon>[0]["name"]} className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{label}</div>
        <div className="text-sm text-ink font-medium truncate" title={title}>
          {value}
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="text-ink-mute hover:text-ocean-600 p-0.5 shrink-0 mt-1"
          title={t("owner.accountDetail.copyIconTitleAttr")}
        >
          <Icon name="copy" className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
