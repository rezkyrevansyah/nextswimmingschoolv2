"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, PasswordInput, Select, Switch, SectionLabel } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import OwnerAccountDetail, { type AccountProfile } from "./OwnerAccountDetail";
import {
  downloadBulkQRZip,
  downloadSingleQRCard,
  printQRCardSheet,
  type QRCardAccount,
} from "@/lib/qrCardGenerator";

type RoleFilter = "all" | "owner" | "admin" | "manager_center" | "coach" | "member" | "school" | "staff";
type CreatableRole = "admin" | "manager_center" | "coach" | "member" | "school" | "staff";

/** "budi@sekolah.com" -> "budistaff@sekolah.com"; "" if the email isn't complete yet. */
const deriveStaffEmail = (email: string): string => {
  const at = email.indexOf("@");
  if (at <= 0) return "";
  return `${email.slice(0, at)}staff${email.slice(at)}`;
};

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
  school_grade: "",
  total_sessions: "",
  bank_name: "",
  bank_account: "",
  bank_holder: "",
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
  const [saving, setSaving] = useState(false);
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [sameStaffPassword, setSameStaffPassword] = useState(true);

  // ── Batch QR Download State ──────────────────────────────────────────────────
  const [qrSelectMode, setQrSelectMode] = useState(false);
  const [selectedQRIds, setSelectedQRIds] = useState<Set<string>>(new Set());
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrProgress, setQrProgress] = useState<{ current: number; total: number } | null>(null);

  // Quick Preset Download Modal
  const [showQuickDownloadModal, setShowQuickDownloadModal] = useState(false);
  const [quickRole, setQuickRole] = useState<RoleFilter>("all");
  const [quickBranch, setQuickBranch] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, role, custom_role_label, branch_id, avatar_url, birth_date, gender, address, bank_name, bank_account, bank_holder, user_no, qr_code, is_archived, created_at, specialization, bio, branch:branches(id, name), members:members!members_profile_id_fkey(id, member_no, qr_code, type, status, remaining_sessions, total_sessions, school_id, date_start)"
      )
      .order("full_name");
    if (roleFilter !== "all") q = q.eq("role", roleFilter);
    if (branchFilter) q = q.eq("branch_id", branchFilter);
    const { data } = await q;
    if (data) setAccounts(data as unknown as AccountProfile[]);
    setLoading(false);
  }, [supabase, roleFilter, branchFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from("schools")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSchools(data);
      });
  }, [supabase]);

  const roleLabel = (role: string) =>
    ({
      owner: t("owner.accounts.roleOwner"),
      admin: t("owner.accounts.roleAdmin"),
      manager_center: t("owner.accounts.roleManagerCenter"),
      coach: t("owner.accounts.roleCoach"),
      member: t("owner.accounts.roleMember"),
      school: t("owner.accounts.roleSchool"),
      staff: t("owner.accounts.roleStaff"),
    })[role] ?? role;
  const KNOWN_ROLES = ["owner", "admin", "manager_center", "coach", "member", "school", "staff"];
  const isKnownRole = (role: string) => KNOWN_ROLES.includes(role);

  const filtered = useMemo(() => {
    return accounts
      .filter((a) => showArchived || !a.is_archived)
      .filter((a) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        const nameMatch = (a.full_name ?? "").toLowerCase().includes(s);
        const emailMatch = (a.email ?? "").toLowerCase().includes(s);
        const roleMatch = roleLabel(a.role).toLowerCase().includes(s);
        const branchMatch = (a.branch?.name ?? "").toLowerCase().includes(s);
        const userNoMatch = (a.user_no ?? "").toLowerCase().includes(s);
        const memberNoMatch = (a.members && a.members[0]?.member_no?.toLowerCase().includes(s)) || false;
        return nameMatch || emailMatch || roleMatch || branchMatch || userNoMatch || memberNoMatch;
      });
  }, [accounts, showArchived, search]);

  // Map account to QRCardAccount format
  const toQRCardAccount = (a: AccountProfile): QRCardAccount => {
    const m = a.members && a.members[0];
    return {
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      role: a.role,
      custom_role_label: a.custom_role_label,
      user_no: a.user_no,
      member_no: m?.member_no,
      member_type: m?.type,
      qr_code: m?.qr_code || a.qr_code || m?.member_no || a.user_no || a.id,
      branch: a.branch,
      phone: a.phone,
    };
  };

  // Toggle selection for a single account
  const toggleSelectAccount = (id: string) => {
    setSelectedQRIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all currently filtered accounts
  const toggleSelectAllFiltered = () => {
    if (filtered.length === 0) return;
    const allSelected = filtered.every((a) => selectedQRIds.has(a.id));
    if (allSelected) {
      setSelectedQRIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedQRIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  // ── Batch Downloads ─────────────────────────────────────────────────────────
  const handleDownloadSelectedZip = async () => {
    const selectedAccounts = accounts.filter((a) => selectedQRIds.has(a.id)).map(toQRCardAccount);
    if (selectedAccounts.length === 0) return toast.error(t("owner.accounts.selectMinOneDownload"));

    setGeneratingQR(true);
    setQrProgress({ current: 0, total: selectedAccounts.length });

    try {
      const zipName = `NEXT-QR-Selected-${selectedAccounts.length}-Akun-${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadBulkQRZip(selectedAccounts, zipName, (curr, tot) => {
        setQrProgress({ current: curr, total: tot });
      });
      toast.success(t("owner.accounts.downloadZipSuccess"), t("owner.accounts.downloadZipSuccessSub", { count: selectedAccounts.length }));
      setQrSelectMode(false);
      setSelectedQRIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error(t("owner.accounts.zipCreateFailed"));
    }

    setGeneratingQR(false);
    setQrProgress(null);
  };

  const handlePrintSelectedSheet = async () => {
    const selectedAccounts = accounts.filter((a) => selectedQRIds.has(a.id)).map(toQRCardAccount);
    if (selectedAccounts.length === 0) return toast.error(t("owner.accounts.selectMinOnePrint"));

    try {
      await printQRCardSheet(selectedAccounts);
    } catch (err) {
      console.error(err);
      toast.error(t("owner.accounts.printWindowOpenFailed"));
    }
  };

  // ── Quick Preset Downloads ──────────────────────────────────────────────────
  const handleExecuteQuickDownload = async (format: "zip" | "print") => {
    let target = accounts;
    if (quickRole !== "all") target = target.filter((a) => a.role === quickRole);
    if (quickBranch !== "all") target = target.filter((a) => a.branch_id === quickBranch);

    if (target.length === 0) {
      return toast.error(t("owner.accounts.noAccountsMatchFilter"));
    }

    const cardAccounts = target.map(toQRCardAccount);

    if (format === "print") {
      setShowQuickDownloadModal(false);
      await printQRCardSheet(cardAccounts);
      return;
    }

    setShowQuickDownloadModal(false);
    setGeneratingQR(true);
    setQrProgress({ current: 0, total: cardAccounts.length });

    try {
      const roleStr = quickRole !== "all" ? quickRole.toUpperCase() : "ALL-ROLES";
      const branchObj = branches.find((b) => b.id === quickBranch);
      const branchStr = branchObj ? branchObj.name.replace(/\s+/g, "-") : "ALL-BRANCHES";
      const zipName = `NEXT-QR-${roleStr}-${branchStr}-${new Date().toISOString().slice(0, 10)}.zip`;

      await downloadBulkQRZip(cardAccounts, zipName, (curr, tot) => {
        setQrProgress({ current: curr, total: tot });
      });
      toast.success(t("owner.accounts.downloadZipSuccess"), t("owner.accounts.downloadZipSuccessSub", { count: cardAccounts.length }));
    } catch (err) {
      console.error(err);
      toast.error(t("owner.accounts.zipCreateFailed"));
    }

    setGeneratingQR(false);
    setQrProgress(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setAutoCreateStaff(false);
    setStaffFullName("");
    setStaffEmail("");
    setStaffPassword("");
    setSameStaffPassword(true);
    setShowAdd(true);
  };

  const saveNewAccount = async () => {
    if (!form.full_name || !form.email || !form.password || !form.branch_id) {
      return toast.error(t("owner.accounts.allFieldsRequired"));
    }
    setSaving(true);
    const effectiveStaffPassword = sameStaffPassword ? form.password : staffPassword;
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
        custom_role_label:
          form.role === "staff" || form.role === "admin" || form.role === "manager_center" ? form.custom_role_label || undefined : undefined,
        ...(form.role === "staff"
          ? {
              bank_name: form.bank_name.trim() || undefined,
              bank_account: form.bank_account.trim() || undefined,
              bank_holder: form.bank_holder.trim() || undefined,
            }
          : {}),
        ...(form.role === "member"
          ? {
              member_type: form.member_type,
              school_id: form.member_type === "school_affiliate" ? form.school_id || undefined : undefined,
              school_grade: form.member_type === "school_affiliate" ? form.school_grade.trim() || undefined : undefined,
            }
          : {}),
        ...((form.role === "admin" || form.role === "manager_center") && autoCreateStaff && staffEmail && effectiveStaffPassword
          ? { auto_staff: { email: staffEmail, password: effectiveStaffPassword, full_name: staffFullName.trim() || undefined } }
          : {}),
      }),
    });
    const json = (await res.json()) as { error?: string; code?: string; user_id?: string; staff_warning?: string };
    if (!res.ok) {
      const isEmailTaken = json.code === "EMAIL_TAKEN";
      toast.error(isEmailTaken ? t("owner.accounts.emailTaken") : t("owner.accounts.createFailed"), json.error);
      setSaving(false);
      return;
    }
    if (json.staff_warning) {
      toast.error(t("owner.accounts.attentionTitle"), json.staff_warning);
    }
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

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selectedQRIds.has(a.id));

  return (
    <div className="space-y-4">
      {/* ── Top Action Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("owner.accounts.searchPlaceholder")}
              className="h-10 pl-9 pr-3 w-56 rounded-xl border border-line bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-hidden focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
              <Icon name="search" className="w-4 h-4" />
            </span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            aria-label="Filter role"
            className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
          >
            <option value="all">{t("owner.accounts.roleFilterAll")}</option>
            <option value="owner">{t("owner.accounts.roleOwner")}</option>
            <option value="admin">{t("owner.accounts.roleAdmin")}</option>
            <option value="manager_center">{t("owner.accounts.roleManagerCenter")}</option>
            <option value="coach">{t("owner.accounts.roleCoach")}</option>
            <option value="member">{t("owner.accounts.roleMember")}</option>
            <option value="school">{t("owner.accounts.roleSchool")}</option>
            <option value="staff">{t("owner.accounts.roleStaff")}</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter center"
            className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
          >
            <option value="">{t("owner.accounts.branchFilterAll")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} translate="no" className="notranslate">
                {b.name}
              </option>
            ))}
          </select>

          <label className="h-10 px-3 rounded-xl border border-line bg-paper flex items-center gap-2 text-xs font-medium text-ink-soft cursor-pointer hover:bg-paper-tint transition-colors">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
            />
            {t("owner.accounts.showArchivedToggle")}
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick QR Download Preset Button */}
          <button
            type="button"
            onClick={() => {
              setQuickRole(roleFilter);
              setQuickBranch(branchFilter || "all");
              setShowQuickDownloadModal(true);
            }}
            className="h-10 px-3.5 rounded-xl border border-line bg-paper hover:bg-paper-tint text-ink-soft text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Icon name="qr" className="w-4 h-4 text-ink-mute" />
            <span className="hidden sm:inline">{t("owner.accounts.quickDownloadQr")}</span>
          </button>

          {/* Toggle Checkbox Select Mode */}
          <button
            type="button"
            onClick={() => {
              setQrSelectMode((prev) => !prev);
              if (qrSelectMode) setSelectedQRIds(new Set());
            }}
            className={`h-10 px-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              qrSelectMode
                ? "bg-ocean-50 border-ocean-300 text-ocean-700"
                : "border-line bg-paper hover:bg-paper-tint text-ink-soft"
            }`}
          >
            <Icon name="check" className="w-4 h-4" />
            <span className="hidden sm:inline">{qrSelectMode ? "Done" : "QR Cards"}</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>{t("owner.accounts.addAccountBtn")}</span>
          </button>
        </div>
      </div>

      {/* ── Floating Batch Action Bar (When in QR Select Mode) ── */}
      {qrSelectMode && (
        <div className="bg-ocean-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border border-ocean-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-ocean-800 text-ocean-300 flex items-center justify-center font-bold text-sm">
              {selectedQRIds.size}
            </span>
            <div>
              <div className="font-bold text-sm">
                {selectedQRIds.size > 0
                  ? t("owner.accounts.accountsSelectedCount", { count: selectedQRIds.size })
                  : t("owner.accounts.selectAccountsToDownloadHint")}
              </div>
              <div className="text-xs text-ocean-300">
                {t("owner.accounts.accountsMatchFilter", { count: filtered.length })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="h-8 px-3 rounded-lg bg-ocean-800 hover:bg-ocean-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {isAllFilteredSelected
                ? "Batalkan Pilihan Terfilter"
                : `Pilih Semua Terfilter (${filtered.length})`}
            </button>
            <button
              type="button"
              disabled={selectedQRIds.size === 0 || generatingQR}
              onClick={handleDownloadSelectedZip}
              className="h-8 px-3 rounded-lg bg-ocean-500 hover:bg-ocean-600 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="download" className="w-3.5 h-3.5" />
              <span>{generatingQR ? t("common.actions.saving") : `Download ZIP (${selectedQRIds.size})`}</span>
            </button>
            <button
              type="button"
              disabled={selectedQRIds.size === 0 || generatingQR}
              onClick={handlePrintSelectedSheet}
              className="h-8 px-3 rounded-lg bg-ocean-800 hover:bg-ocean-700 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="print" className="w-3.5 h-3.5" />
              <span>Print A4 Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQrSelectMode(false);
                setSelectedQRIds(new Set());
              }}
              className="text-xs text-ocean-300 hover:text-white underline ml-2 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ── Master Data Accounts Table ── */}
      <div className="bg-paper rounded-2xl border border-line overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("owner.accounts.loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-9 bg-paper-deep border-b border-line text-[10px] uppercase tracking-wider text-ink-faint font-bold">
                  {qrSelectMode && (
                    <th className="py-2 pl-5 pr-2 w-10 text-left">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left py-2 px-5 font-bold">{t("owner.accounts.colName")}</th>
                  <th className="text-left py-2 px-3 font-bold w-[140px]">{t("owner.accounts.colRole")}</th>
                  <th className="text-left py-2 px-3 font-bold w-[140px] hidden md:table-cell">{t("owner.accounts.colBranch")}</th>
                  <th className="text-left py-2 px-3 font-bold w-[150px] hidden sm:table-cell">ACCOUNT ID</th>
                  <th className="text-left py-2 px-3 font-bold w-[100px]">{t("owner.accounts.colStatus")}</th>
                  <th className="text-right py-2 pr-5 font-bold w-[110px]">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((a) => {
                  const displayName = a.full_name?.trim() || a.email?.split("@")[0] || roleLabel(a.role) || "—";
                  const m = a.members && a.members[0];
                  const code = m?.member_no || a.user_no || a.qr_code || a.id.slice(0, 8).toUpperCase();
                  const isChecked = selectedQRIds.has(a.id);

                  return (
                    <tr
                      key={a.id}
                      className={`h-[58px] hover:bg-paper-tint/60 cursor-pointer transition-colors ${
                        qrSelectMode && isChecked ? "bg-ocean-50/70" : ""
                      }`}
                      onClick={() => {
                        if (qrSelectMode) toggleSelectAccount(a.id);
                        else setSelected(a);
                      }}
                    >
                      {qrSelectMode && (
                        <td className="py-2.5 pl-5 pr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectAccount(a.id)}
                            className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={displayName} src={a.avatar_url ?? undefined} size={32} />
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-ink truncate max-w-[160px] sm:max-w-none leading-tight">
                              <NoTranslate>{displayName}</NoTranslate>
                            </div>
                            <div className="text-xs text-ink-mute truncate max-w-[160px] sm:max-w-none">
                              <NoTranslate>{a.email ?? "—"}</NoTranslate>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-deep text-ink-soft">
                            {isKnownRole(a.role) ? roleLabel(a.role) : <NoTranslate>{roleLabel(a.role)}</NoTranslate>}
                          </span>
                          {a.custom_role_label && !a.custom_role_label.includes("@") && (
                            <span className="text-ink-faint text-xs truncate max-w-[80px]">
                              <NoTranslate>{a.custom_role_label}</NoTranslate>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-ink-soft hidden md:table-cell">
                        <NoTranslate>{a.branch?.name ?? "—"}</NoTranslate>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-ink-soft bg-paper-deep px-2 py-0.5 rounded border border-line">
                          <NoTranslate>{code}</NoTranslate>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {a.is_archived ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {t("owner.accountDetail.inactiveBadge")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ok-50 text-ok-700 border border-ok-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-ok-600" />
                            {t("owner.accountDetail.activeBadge")}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadSingleQRCard(toQRCardAccount(a))}
                            className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-ocean-50 text-ink-mute hover:text-ocean-700 flex items-center justify-center transition-colors cursor-pointer"
                            title={t("owner.accountDetail.downloadIdCardPng")}
                          >
                            <Icon name="qr" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelected(a)}
                            className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                            title={t("owner.accountDetail.viewTitle")}
                          >
                            <Icon name="eye" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={qrSelectMode ? 7 : 6} className="text-center py-10 text-ink-mute">
                      {t("owner.accounts.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <OwnerAccountDetail
        account={selected}
        branches={branches}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRefresh={load}
      />

      {/* ── Modal: Quick Batch Download Preset ── */}
      <Modal
        open={showQuickDownloadModal}
        onClose={() => setShowQuickDownloadModal(false)}
        title={t("owner.accounts.quickDownloadModalTitle")}
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowQuickDownloadModal(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="soft" icon="print" onClick={() => handleExecuteQuickDownload("print")}>
              {t("owner.accounts.printA4SheetBtn")}
            </Btn>
            <Btn variant="primary" icon="download" onClick={() => handleExecuteQuickDownload("zip")}>
              {t("owner.accounts.downloadZipBtn")}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {t("owner.accounts.quickDownloadModalHint")}
          </p>

          <Field label={t("owner.accounts.filterRoleLabel")}>
            <Select value={quickRole} onChange={(e) => setQuickRole(e.target.value as RoleFilter)}>
              <option value="all">{t("owner.accounts.filterRoleAll")}</option>
              <option value="coach">{t("owner.accounts.filterRoleCoachOnly")}</option>
              <option value="member">{t("owner.accounts.filterRoleMemberOnly")}</option>
              <option value="staff">{t("owner.accounts.filterRoleStaffOnly")}</option>
              <option value="admin">{t("owner.accounts.filterRoleAdminOnly")}</option>
              <option value="manager_center">{t("owner.accounts.filterRoleManagerCenterOnly")}</option>
              <option value="school">{t("owner.accounts.filterRoleSchoolOnly")}</option>
            </Select>
          </Field>

          <Field label={t("owner.accounts.filterCenterLabel")}>
            <Select value={quickBranch} onChange={(e) => setQuickBranch(e.target.value)}>
              <option value="all">{t("owner.accounts.filterCenterAll")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} translate="no" className="notranslate">
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="p-3 bg-paper-tint rounded-xl border border-line text-xs text-ink-mute space-y-1">
            <div className="font-semibold text-ink">{t("owner.accounts.generatedImageFormatTitle")}</div>
            <div>• {t("owner.accounts.generatedImageFormatBullet1")}</div>
            <div>
              • {t("owner.accounts.generatedImageFormatBullet2")}{" "}
              <code className="font-mono text-ocean-700 bg-white px-1 rounded">
                [ROLE]_[NAME]_[USER_NO].png
              </code>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Batch QR Generation Progress ── */}
      <Modal open={generatingQR && qrProgress !== null} onClose={() => {}} title={t("owner.accounts.creatingZipTitle")} size="sm">
        <div className="py-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center animate-pulse">
            <Icon name="download" className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-ink">
              Generating QR Cards...
            </div>
            <div className="text-xs text-ink-mute mt-1">
              Processing {qrProgress?.current || 0} of {qrProgress?.total || 0} accounts
            </div>
          </div>
          {qrProgress && (
            <div className="w-full bg-paper-deep rounded-full h-2 overflow-hidden border border-line">
              <div
                className="bg-ocean-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(qrProgress.current / qrProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Add New Account ── */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t("owner.accounts.createModalTitle")}
        size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="primary" onClick={saveNewAccount} disabled={saving}>
              {saving ? t("common.actions.saving") : t("owner.accounts.addAccountBtn")}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("owner.accounts.fieldAccountType")} required>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreatableRole }))}
            >
              <option value="admin">{t("owner.accounts.roleAdmin")}</option>
              <option value="manager_center">{t("owner.accounts.roleManagerCenter")}</option>
              <option value="coach">{t("owner.accounts.roleCoach")}</option>
              <option value="member">{t("owner.accounts.roleMember")}</option>
              <option value="school">{t("owner.accounts.roleSchool")}</option>
              <option value="staff">{t("owner.accounts.roleStaff")}</option>
            </Select>
          </Field>

          {/* ── Section 1: Personal Data ── */}
          <SectionLabel>{t("owner.accounts.sectionPersonalData")}</SectionLabel>
          <Field label={t("owner.accounts.fieldFullName")} required>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              autoComplete="off"
            />
          </Field>
          <Field label={t("owner.accounts.fieldPhone")}>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="08xxxxxxxxxx"
              autoComplete="off"
            />
          </Field>
          {(form.role === "staff" || form.role === "admin" || form.role === "manager_center") && (
            <Field
              label={t("owner.accounts.fieldCustomRoleLabel")}
              hint={t("owner.accounts.customRoleLabelHint")}
            >
              <Input
                value={form.custom_role_label}
                onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
                placeholder={t("owner.accounts.customRoleLabelPlaceholder")}
                autoComplete="off"
              />
            </Field>
          )}
          {form.role === "member" && (
            <>
              <Field label={t("owner.accounts.fieldMemberType")}>
                <Select
                  value={form.member_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, member_type: e.target.value as typeof f.member_type }))
                  }
                >
                  <option value="reguler">{t("owner.accounts.memberTypeRegular")}</option>
                  <option value="school_affiliate">{t("owner.accounts.memberTypeSchoolAffiliate")}</option>
                </Select>
              </Field>
              {form.member_type === "school_affiliate" && (
                <>
                  <Field label={t("owner.accounts.fieldSchool")}>
                    <Select
                      value={form.school_id}
                      onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
                    >
                      <option value="">{t("owner.accounts.fieldSchoolPlaceholder")}</option>
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
                      autoComplete="off"
                    />
                  </Field>
                </>
              )}
            </>
          )}
          {form.role === "staff" && (
            <div className="rounded-xl border border-line bg-paper-tint p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-ink">{t("owner.accountDetail.bankAccountTitle")}</p>
                <p className="text-xs text-ink-mute mt-0.5">{t("owner.accounts.bankSectionHint")}</p>
              </div>
              <Field label={t("owner.accountDetail.fieldBankName")}>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  placeholder={t("owner.accountDetail.bankNamePlaceholder")}
                  autoComplete="off"
                />
              </Field>
              <Field label={t("owner.accountDetail.fieldBankAccount")}>
                <Input
                  value={form.bank_account}
                  onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                  placeholder={t("owner.accountDetail.bankAccountPlaceholder")}
                  autoComplete="off"
                />
              </Field>
              <Field label={t("owner.accountDetail.fieldBankHolder")}>
                <Input
                  value={form.bank_holder}
                  onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                  placeholder={t("owner.accountDetail.bankHolderPlaceholder")}
                  autoComplete="off"
                />
              </Field>
            </div>
          )}

          {/* ── Section 2: Center Login Account ── */}
          <SectionLabel sub={t("owner.accounts.sectionBranchLoginSub")}>{t("owner.accounts.sectionBranchLogin")}</SectionLabel>
          <Field label={t("owner.accounts.fieldBranch")} required>
            <Select
              value={form.branch_id}
              onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="" disabled>
                {t("owner.accounts.fieldBranchPlaceholder")}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} translate="no" className="notranslate">
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("owner.accounts.fieldEmail")} required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
            />
          </Field>
          <Field
            label={t("owner.accounts.fieldPassword")}
            required
            hint={t("owner.accounts.fieldPasswordHint")}
          >
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </Field>

          {/* ── Section 3: Staff Panel Account (admin / manager_center only) ── */}
          {(form.role === "admin" || form.role === "manager_center") && (
            <>
              <SectionLabel sub={t("owner.accounts.sectionStaffPanelSub")}>{t("owner.accounts.sectionStaffPanel")}</SectionLabel>
              <div className="rounded-xl border border-line bg-paper-tint p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Auto-create Staff account</p>
                    <p className="text-xs text-ink-mute mt-0.5">
                      Admin also receives a separate Staff account for attendance &amp; payslips
                    </p>
                  </div>
                  <Switch
                    checked={autoCreateStaff}
                    onChange={(next) => {
                      setAutoCreateStaff(next);
                      if (next) {
                        setStaffEmail((v) => v || deriveStaffEmail(form.email));
                        setSameStaffPassword(true);
                        setStaffPassword("");
                      }
                    }}
                  />
                </div>
                {autoCreateStaff && (
                  <>
                    <Field label={t("owner.accounts.fieldStaffName")} hint={t("owner.accounts.fieldStaffNameHint")}>
                      <Input
                        value={staffFullName}
                        onChange={(e) => setStaffFullName(e.target.value)}
                        placeholder={t("owner.accounts.fieldStaffNamePlaceholder")}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label={t("owner.accounts.fieldStaffEmail")} required hint={t("owner.accounts.fieldStaffEmailHint")}>
                      <Input
                        type="email"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="staff@example.com"
                        autoComplete="off"
                      />
                    </Field>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-ink-soft">{t("owner.accounts.staffPasswordDifferentToggle")}</span>
                      <Switch
                        checked={!sameStaffPassword}
                        onChange={(differs) => {
                          setSameStaffPassword(!differs);
                          setStaffPassword("");
                        }}
                      />
                    </div>
                    {sameStaffPassword ? (
                      <p className="text-xs text-ink-mute">{t("owner.accounts.staffPasswordSameNote")}</p>
                    ) : (
                      <Field label={t("owner.accounts.fieldStaffPassword")} required>
                        <PasswordInput
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          placeholder={t("owner.accounts.fieldStaffPasswordPlaceholder")}
                          autoComplete="new-password"
                        />
                      </Field>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
