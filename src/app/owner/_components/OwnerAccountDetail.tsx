"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import QRBox from "@/components/ui/QRBox";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
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

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-ocean-100 text-ocean-700 border-ocean-200",
  coach: "bg-wave-100 text-wave-700 border-wave-200",
  member: "bg-green-100 text-green-700 border-green-200",
  school: "bg-amber-100 text-amber-700 border-amber-200",
  staff: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function OwnerAccountDetail({ account, branches, open, onClose, onRefresh }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const supabase = createClient();

  const ROLE_LABELS: Record<string, string> = {
    owner: t("owner.accounts.roleOwner"),
    admin: t("owner.accounts.roleAdmin"),
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
  });

  // Load contextual relations for the account
  useEffect(() => {
    if (!account || !open) return;

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
        .select("id, member_no, qr_code, type, status, remaining_sessions, total_sessions, school_id, date_start, school:schools(id, name), member_classes(class:classes(id, name, time_start, time_end))")
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
    setForm({
      full_name: account.full_name ?? "",
      email: account.email ?? "",
      phone: account.phone ?? "",
      role: account.role ?? "staff",
      branch_id: account.branch_id ?? "",
      gender: account.gender ?? "",
      birth_date: account.birth_date ?? "",
      address: account.address ?? "",
      bank_name: account.bank_name ?? "",
      bank_account: account.bank_account ?? "",
      bank_holder: account.bank_holder ?? "",
      custom_role_label: account.custom_role_label ?? "",
      bio: account.bio ?? "",
      specialization: account.specialization ?? "",
      member_type: m?.type || "reguler",
      total_sessions: m?.total_sessions != null ? String(m.total_sessions) : "",
      remaining_sessions: m?.remaining_sessions != null ? String(m.remaining_sessions) : "",
      school_id: m?.school_id || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!account) return;
    if (!form.full_name.trim()) return toast.error(t("owner.accountDetail.fullNameRequired"));

    setSaving(true);
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
          gender: form.gender || null,
          birth_date: form.birth_date || null,
          address: form.address.trim() || null,
          bank_name: form.bank_name.trim() || null,
          bank_account: form.bank_account.trim() || null,
          bank_holder: form.bank_holder.trim() || null,
          custom_role_label: form.custom_role_label.trim() || null,
          bio: form.bio.trim() || null,
          specialization: form.specialization.trim() || null,
        },
        user_metadata: {
          full_name: form.full_name.trim(),
          role: form.role,
          branch_id: form.branch_id || null,
        },
      }),
    });

    // If member, update members table too
    if (account.role === "member" && memberData) {
      await supabase
        .from("members")
        .update({
          type: form.member_type,
          total_sessions: form.total_sessions ? Number(form.total_sessions) : null,
          remaining_sessions: form.remaining_sessions ? Number(form.remaining_sessions) : null,
          school_id: form.member_type === "school_affiliate" ? form.school_id || null : null,
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
        ? t("owner.accountDetail.reactivateConfirmTitle", { name: account.full_name })
        : t("owner.accountDetail.deactivateConfirmTitle", { name: account.full_name }),
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
      t("owner.accountDetail.passwordResetSub", { name: account.full_name })
    );
    setNewPassword("");
    setShowPwdReset(false);
  };

  const handleDelete = async () => {
    if (!account) return;
    const confirmed = await confirm({
      title: t("owner.accountDetail.deleteConfirmTitle", { name: account.full_name }),
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
      toast.success("Kartu QR berhasil diunduh!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh kartu QR");
    }
    setDownloadingQr(false);
  };

  if (!account) return null;

  const roleLabel = ROLE_LABELS[account.role] ?? account.role;
  const roleColor = ROLE_COLORS[account.role] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const displayName = account.full_name?.trim() || account.email?.split("@")[0] || roleLabel || "—";
  const activeQR = memberData?.qr_code || memberData?.member_no || account.qr_code || account.user_no || account.id;

  // Calculate age if birth_date exists
  const calcAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return null;
    const dob = new Date(birthDateStr);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };
  const age = calcAge(account.birth_date);

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
                <option value="coach">{t("owner.accounts.roleCoach")}</option>
                <option value="member">{t("owner.accounts.roleMember")}</option>
                <option value="staff">{t("owner.accounts.roleStaff")}</option>
                <option value="school">{t("owner.accounts.roleSchool")}</option>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Email">
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
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Member Specific Form Inputs */}
          {form.role === "member" && (
            <div className="border border-green-200 bg-green-50/40 rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-bold text-green-900 uppercase tracking-wider">Pengaturan Member</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Tipe Member">
                  <Select value={form.member_type} onChange={(e) => setForm((f) => ({ ...f, member_type: e.target.value }))}>
                    <option value="reguler">Reguler</option>
                    <option value="private">Private</option>
                    <option value="school_affiliate">Afiliasi Sekolah</option>
                  </Select>
                </Field>
                <Field label="Total Sesi">
                  <Input type="number" min={0} value={form.total_sessions} onChange={(e) => setForm((f) => ({ ...f, total_sessions: e.target.value }))} />
                </Field>
                <Field label="Sisa Sesi">
                  <Input type="number" min={0} value={form.remaining_sessions} onChange={(e) => setForm((f) => ({ ...f, remaining_sessions: e.target.value }))} />
                </Field>
              </div>
              {form.member_type === "school_affiliate" && (
                <Field label="Pilih Sekolah">
                  <Select value={form.school_id} onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}>
                    <option value="">— Pilih Sekolah —</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
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

          {(form.role === "staff" || form.role === "admin") && (
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
                <h3 className="font-display font-bold text-xl text-ink">{displayName}</h3>
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
                  {roleLabel}
                  {account.custom_role_label &&
                    !account.custom_role_label.includes("@") &&
                    ` · ${account.custom_role_label}`}
                </span>
                {(memberData?.member_no || account.user_no) && (
                  <span className="font-mono text-xs font-bold text-ocean-700 bg-ocean-50 px-2.5 py-0.5 rounded-lg border border-ocean-200">
                    {memberData?.member_no || account.user_no}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span>{t("owner.accountDetail.registeredOn", { date: fmtDate(account.created_at) })}</span>
                {account.branch?.name && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-ink-soft">{account.branch.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Visual QR Code & Barcode Card ── */}
          <div className="bg-gradient-to-br from-paper-tint to-ocean-50/40 border border-ocean-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl border border-line shadow-xs shrink-0">
                <QRBox value={activeQR} size={110} />
              </div>
              <div className="space-y-1 text-left min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ocean-800 flex items-center gap-1">
                  <Icon name="qr" className="w-3.5 h-3.5" />
                  QR Code &amp; Identitas Akun
                </div>
                <div className="font-mono text-sm font-bold text-ink-strong break-all">
                  {activeQR}
                </div>
                <p className="text-xs text-ink-mute">
                  Gunakan kode ini untuk scan presensi, absensi kelas, dan verifikasi profil resmi.
                </p>
              </div>
            </div>
            <div className="flex sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
              <Btn
                variant="outline"
                size="sm"
                icon="copy"
                onClick={() => copyToClipboard(activeQR, "Kode QR")}
                className="flex-1 sm:flex-none justify-center text-xs"
              >
                Salin Kode
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon="download"
                onClick={handleDownloadSingleQR}
                disabled={downloadingQr}
                className="flex-1 sm:flex-none justify-center text-xs"
              >
                {downloadingQr ? "Memproses…" : "Unduh ID Card (PNG)"}
              </Btn>
            </div>
          </div>

          {/* Member Specific Stats & Classes */}
          {account.role === "member" && memberData && (
            <div className="border border-green-200 bg-green-50/30 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-green-900 uppercase tracking-wider flex items-center justify-between">
                <span>Detail Keanggotaan Member</span>
                <span className="capitalize font-semibold text-green-700 bg-white px-2 py-0.5 rounded-md border border-green-200">
                  Tipe: {memberData.type}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white rounded-xl p-2.5 border border-green-100 text-center">
                  <div className="text-[10px] text-ink-faint uppercase font-bold">Sisa Sesi</div>
                  <div className="text-xl font-bold font-mono text-green-700">
                    {memberData.remaining_sessions ?? "—"}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-green-100 text-center">
                  <div className="text-[10px] text-ink-faint uppercase font-bold">Total Sesi</div>
                  <div className="text-xl font-bold font-mono text-ink">
                    {memberData.total_sessions ?? "—"}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-green-100 text-center col-span-2 sm:col-span-2">
                  <div className="text-[10px] text-ink-faint uppercase font-bold">Afiliasi Sekolah</div>
                  <div className="text-sm font-semibold text-ink truncate mt-0.5">
                    {memberData.school?.name ?? "Non-Afiliasi"}
                  </div>
                </div>
              </div>

              {/* Enrolled classes */}
              {memberData.member_classes && memberData.member_classes.length > 0 && (
                <div className="pt-2 border-t border-green-200/60">
                  <div className="text-[11px] font-bold text-green-900 mb-1.5">Kelas yang Diikuti:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {memberData.member_classes.map((mc, idx) => (
                      <span
                        key={mc.class?.id || idx}
                        className="bg-white px-2.5 py-1 rounded-lg border border-green-200 text-xs font-semibold text-green-800"
                      >
                        🏊 {mc.class?.name}{" "}
                        {mc.class?.time_start && (
                          <span className="font-normal text-green-600 text-[11px]">
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
            <div className="border border-wave-200 bg-wave-50/30 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-wave-900 uppercase tracking-wider">
                Kelas &amp; Sertifikasi Pelatih
              </div>
              {coachClasses.length > 0 ? (
                <div>
                  <div className="text-[11px] font-bold text-wave-900 mb-1.5">Kelas yang Dilatih:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {coachClasses.map((c) => (
                      <span
                        key={c.id}
                        className="bg-white px-2.5 py-1 rounded-lg border border-wave-200 text-xs font-semibold text-wave-900"
                      >
                        ⏱️ {c.name}{" "}
                        {c.branch?.name && (
                          <span className="font-normal text-ink-mute text-[11px]">· {c.branch.name}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-mute italic">Belum ada kelas renang yang ditugaskan.</p>
              )}

              {certifications.length > 0 && (
                <div className="pt-2 border-t border-wave-200/60">
                  <div className="text-[11px] font-bold text-wave-900 mb-1.5">Sertifikasi Resmi:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {certifications.map((cert) => (
                      <span
                        key={cert.id}
                        className="bg-white px-2.5 py-1 rounded-lg border border-wave-200 text-xs font-semibold text-wave-800"
                      >
                        📜 {cert.title || cert.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow
              icon="mail"
              label={t("owner.accountDetail.emailLabel")}
              value={account.email ?? "—"}
              onCopy={
                account.email
                  ? () => copyToClipboard(account.email!, t("owner.accountDetail.emailLabel"))
                  : undefined
              }
            />
            <InfoRow
              icon="phone"
              label={t("owner.accountDetail.phoneLabel")}
              value={account.phone ?? "—"}
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
                account.gender === "male"
                  ? t("owner.accountDetail.genderMale")
                  : account.gender === "female"
                  ? t("owner.accountDetail.genderFemale")
                  : "—"
              }
            />
            <InfoRow
              icon="calendar"
              label={t("owner.accountDetail.birthDateLabel")}
              value={
                account.birth_date
                  ? `${fmtDate(account.birth_date)}${age !== null ? ` (${age} thn)` : ""}`
                  : "—"
              }
            />
            <InfoRow
              icon="pin"
              label={t("owner.accountDetail.branchLabel")}
              value={account.branch?.name ?? "—"}
            />
            <InfoRow
              icon="home"
              label={t("owner.accountDetail.addressLabel")}
              value={account.address ?? "—"}
            />
            {account.specialization && (
              <InfoRow
                icon="star"
                label={t("owner.accountDetail.specializationLabel")}
                value={account.specialization}
              />
            )}
            {account.bio && (
              <InfoRow icon="clipboard" label={t("owner.accountDetail.bioLabel")} value={account.bio} />
            )}
          </div>

          {account.role === "school" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
              <Icon name="info" className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{t("owner.accountDetail.schoolSettingsHint")}</span>
            </div>
          )}

          {/* Bank Account */}
          <div className="rounded-xl border border-line bg-paper-tint p-4">
            <p className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">
              {t("owner.accountDetail.bankAccountTitle")}
            </p>
            {account.bank_account ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-bold text-ink">{account.bank_name ?? "—"}</div>
                  <div className="font-mono text-ocean-700 text-lg font-bold mt-0.5">
                    {account.bank_account}
                  </div>
                  <div className="text-sm text-ink-mute">
                    {t("owner.accountDetail.accountHolderPrefix")} {account.bank_holder ?? "—"}
                  </div>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(account.bank_account!, t("owner.accountDetail.fieldBankAccount"))
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
  onCopy,
}: {
  icon: string;
  label: string;
  value: string;
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
        <div className="text-sm text-ink font-medium truncate">{value}</div>
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
