"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import OwnerAccountDetail, { type AccountProfile } from "./OwnerAccountDetail";

type RoleFilter = "all" | "owner" | "admin" | "coach" | "member" | "school" | "staff";
type CreatableRole = "admin" | "coach" | "member" | "school" | "staff";

const EMPTY_FORM = {
  role: "staff" as CreatableRole,
  full_name: "",
  email: "",
  phone: "",
  branch_id: "",
  password: "",
  custom_role_label: "",
  member_type: "reguler" as "reguler" | "private" | "school_affiliate",
  school_id: "",
  total_sessions: "",
};

export default function OwnerAccountsMaster({ branches }: { branches: { id: string; name: string }[] }) {
  const { t } = useLocale();
  const toast = useToast();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<AccountProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);

  const [selected, setSelected] = useState<AccountProfile | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, custom_role_label, branch_id, avatar_url, birth_date, gender, address, bank_name, bank_account, bank_holder, user_no, is_archived, created_at, specialization, bio, branch:branches(name)")
      .order("full_name");
    if (roleFilter !== "all") q = q.eq("role", roleFilter);
    if (branchFilter) q = q.eq("branch_id", branchFilter);
    const { data } = await q;
    if (data) setAccounts(data as unknown as AccountProfile[]);
    setLoading(false);
  }, [supabase, roleFilter, branchFilter]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from("schools").select("id, name").order("name").then(({ data }) => { if (data) setSchools(data); });
  }, [supabase]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = accounts
    .filter(a => showArchived || !a.is_archived)
    .filter(a => {
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return a.full_name.toLowerCase().includes(s) || (a.email ?? "").toLowerCase().includes(s);
    });

  const roleLabel = (role: string) => ({
    owner: t("owner.accounts.roleOwner"),
    admin: t("owner.accounts.roleAdmin"),
    coach: t("owner.accounts.roleCoach"),
    member: t("owner.accounts.roleMember"),
    school: t("owner.accounts.roleSchool"),
    staff: t("owner.accounts.roleStaff"),
  })[role] ?? role;

  const openCreate = () => { setForm(EMPTY_FORM); setShowAdd(true); };

  const saveNewAccount = async () => {
    if (!form.full_name || !form.email || !form.password || !form.branch_id) {
      return toast.error(t("owner.accounts.allFieldsRequired"));
    }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        branch_id: form.branch_id,
        phone: form.phone || undefined,
        custom_role_label: (form.role === "staff" || form.role === "admin") ? (form.custom_role_label || undefined) : undefined,
        ...(form.role === "member" ? {
          member_type: form.member_type,
          school_id: form.member_type === "school_affiliate" ? (form.school_id || undefined) : undefined,
          total_sessions: form.member_type === "private" ? (Number(form.total_sessions) || undefined) : undefined,
        } : {}),
      }),
    });
    const json = await res.json() as { error?: string; code?: string; user_id?: string };
    if (!res.ok) {
      const isEmailTaken = json.code === "EMAIL_TAKEN";
      toast.error(isEmailTaken ? t("owner.accounts.emailTaken") : t("owner.accounts.createFailed"), json.error);
      setSaving(false);
      return;
    }
    // Schools are represented by their own `schools` row (profile_id + branch_id + name),
    // which /api/admin/users doesn't create — set it up here so the account isn't left half-built.
    if (form.role === "school" && json.user_id) {
      await supabase.from("schools").insert({
        branch_id: form.branch_id,
        profile_id: json.user_id,
        name: form.full_name,
        email: form.email,
      });
    }
    setSaving(false);
    toast.success(t("owner.accounts.created"), t("owner.accounts.createdSub"));
    setShowAdd(false);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("owner.accounts.searchPlaceholder")}
            className="!w-56"
          />
          <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value as RoleFilter)} className="!w-40">
            <option value="all">{t("owner.accounts.roleFilterAll")}</option>
            <option value="owner">{t("owner.accounts.roleOwner")}</option>
            <option value="admin">{t("owner.accounts.roleAdmin")}</option>
            <option value="coach">{t("owner.accounts.roleCoach")}</option>
            <option value="member">{t("owner.accounts.roleMember")}</option>
            <option value="school">{t("owner.accounts.roleSchool")}</option>
            <option value="staff">{t("owner.accounts.roleStaff")}</option>
          </Select>
          <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-40">
            <option value="">{t("owner.accounts.branchFilterAll")}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <label className="flex items-center gap-1.5 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
            {t("owner.accounts.showArchivedToggle")}
          </label>
        </div>
        <Btn variant="primary" icon="plus" onClick={openCreate}>{t("owner.accounts.addAccountBtn")}</Btn>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("owner.accounts.loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">{t("owner.accounts.colName")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.accounts.colRole")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">{t("owner.accounts.colEmail")}</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">{t("owner.accounts.colBranch")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.accounts.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => setSelected(a)}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.full_name} size={36} />
                        <div className="font-semibold truncate max-w-[160px] sm:max-w-none">{a.full_name}</div>
                      </div>
                    </td>
                    <td className="text-ink-soft">
                      {roleLabel(a.role)}
                      {a.custom_role_label && <span className="text-ink-faint"> · {a.custom_role_label}</span>}
                    </td>
                    <td className="text-ink-mute hidden sm:table-cell">{a.email ?? "—"}</td>
                    <td className="text-ink-soft hidden md:table-cell">{a.branch?.name ?? "—"}</td>
                    <td>
                      {a.is_archived
                        ? <Status kind="archived">{t("owner.accountDetail.inactiveBadge")}</Status>
                        : <Status kind="active">{t("owner.accountDetail.activeBadge")}</Status>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-ink-mute">{t("owner.accounts.empty")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OwnerAccountDetail
        account={selected}
        branches={branches}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRefresh={load}
      />

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t("owner.accounts.createModalTitle")}
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={saveNewAccount} disabled={saving}>
              {saving ? t("common.actions.saving") : t("owner.accounts.addAccountBtn")}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("owner.accounts.fieldAccountType")} required>
            <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as CreatableRole }))}>
              <option value="admin">{t("owner.accounts.roleAdmin")}</option>
              <option value="coach">{t("owner.accounts.roleCoach")}</option>
              <option value="member">{t("owner.accounts.roleMember")}</option>
              <option value="school">{t("owner.accounts.roleSchool")}</option>
              <option value="staff">{t("owner.accounts.roleStaff")}</option>
            </Select>
          </Field>
          <Field label={t("owner.accounts.fieldFullName")} required>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label={t("owner.accounts.fieldEmail")} required>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label={t("owner.accounts.fieldPhone")}>
            <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
          </Field>
          <Field label={t("owner.accounts.fieldBranch")} required>
            <Select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="" disabled>{t("owner.accounts.fieldBranchPlaceholder")}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          {(form.role === "staff" || form.role === "admin") && (
            <Field label={t("owner.accounts.fieldCustomRoleLabel")} hint={t("owner.accounts.customRoleLabelHint")}>
              <Input
                value={form.custom_role_label}
                onChange={e => setForm(f => ({ ...f, custom_role_label: e.target.value }))}
                placeholder={t("owner.accounts.customRoleLabelPlaceholder")}
              />
            </Field>
          )}
          {form.role === "member" && (
            <>
              <Field label={t("owner.accounts.fieldMemberType")}>
                <Select value={form.member_type} onChange={e => setForm(f => ({ ...f, member_type: e.target.value as typeof f.member_type }))}>
                  <option value="reguler">{t("owner.accounts.memberTypeRegular")}</option>
                  <option value="private">{t("owner.accounts.memberTypePrivate")}</option>
                  <option value="school_affiliate">{t("owner.accounts.memberTypeSchoolAffiliate")}</option>
                </Select>
              </Field>
              {form.member_type === "school_affiliate" && (
                <Field label={t("owner.accounts.fieldSchool")}>
                  <Select value={form.school_id} onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
                    <option value="">{t("owner.accounts.fieldSchoolPlaceholder")}</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              )}
              {form.member_type === "private" && (
                <Field label={t("owner.accounts.fieldTotalSessions")}>
                  <Input type="number" min={0} value={form.total_sessions} onChange={e => setForm(f => ({ ...f, total_sessions: e.target.value }))} />
                </Field>
              )}
            </>
          )}
          <Field label={t("owner.accounts.fieldPassword")} required hint={t("owner.accounts.fieldPasswordHint")}>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
