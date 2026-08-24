"use client";
import { useState } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AccountProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  custom_role_label: string | null;
  branch_id: string | null;
  branch?: { name: string } | null;
  avatar_url: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  user_no: string | null;
  is_archived: boolean;
  created_at: string;
  specialization: string | null;
  bio: string | null;
}

interface Props {
  account: AccountProfile | null;
  branches: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-purple-100 text-purple-700 border-purple-200",
  admin:  "bg-ocean-100 text-ocean-700 border-ocean-200",
  coach:  "bg-wave-100 text-wave-700 border-wave-200",
  member: "bg-green-100 text-green-700 border-green-200",
  school: "bg-amber-100 text-amber-700 border-amber-200",
  staff:  "bg-slate-100 text-slate-700 border-slate-200",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function OwnerAccountDetail({ account, branches, open, onClose, onRefresh }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();

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

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
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
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("owner.accountDetail.copiedToast", { label }), text);
  };

  const openEdit = () => {
    if (!account) return;
    setForm({
      full_name: account.full_name ?? "",
      phone: account.phone ?? "",
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
        profile: {
          full_name: form.full_name.trim(),
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
          branch_id: form.branch_id || null,
        },
      }),
    });
    setSaving(false);
    const json = await res.json() as { error?: string };
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
    const json = await res.json() as { error?: string };
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
    const json = await res.json() as { error?: string };
    if (!res.ok) return toast.error(t("owner.accountDetail.resetPasswordFailed"), json.error);
    toast.success(t("owner.accountDetail.passwordResetToast"), t("owner.accountDetail.passwordResetSub", { name: account.full_name }));
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
    const json = await res.json() as { error?: string };
    if (!res.ok) return toast.error(t("owner.accountDetail.deleteFailed"), json.error);
    toast.success(t("owner.accountDetail.deletedToast"));
    onRefresh();
    onClose();
  };

  if (!account) return null;

  const roleLabel = ROLE_LABELS[account.role] ?? account.role;
  const roleColor = ROLE_COLORS[account.role] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <Modal
      open={open}
      onClose={() => { setEditing(false); setShowPwdReset(false); onClose(); }}
      title={editing ? t("owner.accountDetail.editTitle") : t("owner.accountDetail.viewTitle")}
      size="lg"
      footer={
        editing ? (
          <>
            <Btn variant="ghost" onClick={() => setEditing(false)}>{t("owner.accountDetail.cancelBtn")}</Btn>
            <Btn variant="primary" onClick={saveEdit} disabled={saving}>
              {saving ? t("owner.accountDetail.savingBtn") : t("owner.accountDetail.saveBtn")}
            </Btn>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={openEdit}>{t("owner.accountDetail.editBtn")}</Btn>
            <Btn variant="ghost" icon="key" onClick={() => setShowPwdReset(v => !v)}>{t("owner.accountDetail.resetPasswordBtn")}</Btn>
            <Btn
              variant="ghost"
              icon={account.is_archived ? "check" : "x"}
              className={account.is_archived
                ? "text-ok-600 hover:bg-ok-50"
                : "text-warn-600 hover:bg-warn-50"}
              onClick={handleBanToggle}
              disabled={banning}
            >
              {banning ? t("owner.accountDetail.processingBtn") : account.is_archived ? t("owner.accountDetail.reactivateBtn") : t("owner.accountDetail.deactivateBtn")}
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
          <Field label={t("owner.accountDetail.fieldFullName")} required>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("owner.accountDetail.fieldPhone")}>
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="628xxx" />
            </Field>
            <Field label={t("owner.accountDetail.fieldGender")}>
              <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("owner.accountDetail.genderSelectPlaceholder")}</option>
                <option value="male">{t("owner.accountDetail.genderMale")}</option>
                <option value="female">{t("owner.accountDetail.genderFemale")}</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("owner.accountDetail.fieldBirthDate")}>
              <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
            </Field>
            <Field label={t("owner.accountDetail.fieldBranch")}>
              <Select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                <option value="">{t("owner.accountDetail.branchNone")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={t("owner.accountDetail.fieldAddress")}>
            <Textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              rows={2}
              placeholder={t("owner.accountDetail.addressPlaceholder")}
            />
          </Field>
          {(account.role === "staff" || account.role === "admin") && (
            <Field
              label={t("owner.accountDetail.fieldCustomRoleLabel")}
              hint={t("owner.accountDetail.customRoleLabelHint")}
            >
              <Input
                value={form.custom_role_label}
                onChange={e => setForm(f => ({ ...f, custom_role_label: e.target.value }))}
                placeholder={t("owner.accountDetail.customRoleLabelPlaceholder")}
              />
            </Field>
          )}
          {account.role === "coach" && (
            <>
              <Field label={t("owner.accountDetail.fieldSpecialization")}>
                <Input
                  value={form.specialization}
                  onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                  placeholder={t("owner.accountDetail.specializationPlaceholder")}
                />
              </Field>
              <Field label={t("owner.accountDetail.fieldBio")}>
                <Textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
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
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder={t("owner.accountDetail.bankNamePlaceholder")}
                />
              </Field>
              <Field label={t("owner.accountDetail.fieldBankAccount")}>
                <Input
                  value={form.bank_account}
                  onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                  placeholder={t("owner.accountDetail.bankAccountPlaceholder")}
                />
              </Field>
              <Field label={t("owner.accountDetail.fieldBankHolder")}>
                <Input
                  value={form.bank_holder}
                  onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))}
                  placeholder={t("owner.accountDetail.bankHolderPlaceholder")}
                />
              </Field>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {account.avatar_url ? (
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-line shadow-sm">
                  <Image src={account.avatar_url} alt={account.full_name} fill className="object-cover" />
                </div>
              ) : (
                <Avatar name={account.full_name} size={64} className="rounded-2xl text-lg" />
              )}
              {account.is_archived && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full flex items-center justify-center"
                  title={t("owner.accountDetail.inactiveTitleAttr")}
                >
                  <Icon name="x" className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-xl text-ink">{account.full_name}</h3>
                {account.is_archived ? (
                  <Status kind="archived">{t("owner.accountDetail.inactiveBadge")}</Status>
                ) : (
                  <Status kind="active">{t("owner.accountDetail.activeBadge")}</Status>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${roleColor}`}>
                  {roleLabel}
                  {account.custom_role_label && ` · ${account.custom_role_label}`}
                </span>
                {account.user_no && (
                  <span className="font-mono text-xs text-ink-mute bg-paper-deep px-2 py-0.5 rounded-lg border border-line">
                    {account.user_no}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-mute mt-1">
                {t("owner.accountDetail.registeredOn", { date: fmtDate(account.created_at) })}
                {account.branch?.name && ` · ${account.branch.name}`}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow
              icon="mail"
              label={t("owner.accountDetail.emailLabel")}
              value={account.email ?? "—"}
              onCopy={account.email ? () => copyToClipboard(account.email!, t("owner.accountDetail.emailLabel")) : undefined}
            />
            <InfoRow
              icon="phone"
              label={t("owner.accountDetail.phoneLabel")}
              value={account.phone ?? "—"}
              onCopy={account.phone ? () => copyToClipboard(account.phone!, t("owner.accountDetail.phoneLabel")) : undefined}
            />
            <InfoRow
              icon="user"
              label={t("owner.accountDetail.genderLabel")}
              value={account.gender === "male" ? t("owner.accountDetail.genderMale") : account.gender === "female" ? t("owner.accountDetail.genderFemale") : "—"}
            />
            <InfoRow
              icon="calendar"
              label={t("owner.accountDetail.birthDateLabel")}
              value={account.birth_date ? fmtDate(account.birth_date) : "—"}
            />
            <InfoRow icon="pin" label={t("owner.accountDetail.branchLabel")} value={account.branch?.name ?? "—"} />
            <InfoRow icon="home" label={t("owner.accountDetail.addressLabel")} value={account.address ?? "—"} />
            {account.specialization && (
              <InfoRow icon="star" label={t("owner.accountDetail.specializationLabel")} value={account.specialization} />
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
                  <div className="text-sm text-ink-mute">{t("owner.accountDetail.accountHolderPrefix")} {account.bank_holder ?? "—"}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(account.bank_account!, t("owner.accountDetail.fieldBankAccount"))}
                  className="w-10 h-10 rounded-xl border border-ocean-200 bg-ocean-50 text-ocean-700 hover:bg-ocean-100 flex items-center justify-center transition-colors"
                  title={t("owner.accountDetail.copyBankAccountTitleAttr")}
                >
                  <Icon name="copy" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-ink-mute italic">
                {t("owner.accountDetail.bankAccountEmpty")}{" "}
                <button onClick={openEdit} className="text-ocean-600 underline">{t("owner.accountDetail.addBankAccountLink")}</button>
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
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={t("owner.accountDetail.newPasswordPlaceholder")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPwd(v => !v)}
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
                  {resettingPwd ? t("owner.accountDetail.processingBtn") : t("owner.accountDetail.setPasswordBtn")}
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
        <button onClick={onCopy} className="text-ink-mute hover:text-ocean-600 p-0.5 shrink-0 mt-1" title={t("owner.accountDetail.copyIconTitleAttr")}>
          <Icon name="copy" className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
