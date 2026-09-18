"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import type { AccountProfile } from "../OwnerAccountDetail";
import {
  downloadBulkQRZip,
  printQRCardSheet,
  type QRCardAccount,
} from "@/lib/qrCardGenerator";
import { EMPTY_FORM, type RoleFilter } from "./_types";

export function useAccountsMasterData(branches: { id: string; name: string }[]) {
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
      owner: "Owner",
      admin: "Branch Admin",
      manager_center: "Manager Center",
      coach: "Coach",
      member: "Student",
      school: "School Partner",
      staff: "Branch Staff",
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
    if (selectedAccounts.length === 0) return toast.error("Select at least 1 account to download.");

    setGeneratingQR(true);
    setQrProgress({ current: 0, total: selectedAccounts.length });

    try {
      const zipName = `NEXT-QR-Selected-${selectedAccounts.length}-Akun-${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadBulkQRZip(selectedAccounts, zipName, (curr, tot) => {
        setQrProgress({ current: curr, total: tot });
      });
      toast.success("ZIP downloaded successfully!", `${selectedAccounts.length} QR code files saved.`);
      setQrSelectMode(false);
      setSelectedQRIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ZIP file");
    }

    setGeneratingQR(false);
    setQrProgress(null);
  };

  const handlePrintSelectedSheet = async () => {
    const selectedAccounts = accounts.filter((a) => selectedQRIds.has(a.id)).map(toQRCardAccount);
    if (selectedAccounts.length === 0) return toast.error("Select at least 1 account to print.");

    try {
      await printQRCardSheet(selectedAccounts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to open print window");
    }
  };

  // ── Quick Preset Downloads ──────────────────────────────────────────────────
  const handleExecuteQuickDownload = async (format: "zip" | "print") => {
    let target = accounts;
    if (quickRole !== "all") target = target.filter((a) => a.role === quickRole);
    if (quickBranch !== "all") target = target.filter((a) => a.branch_id === quickBranch);

    if (target.length === 0) {
      return toast.error("No accounts match the selected filters.");
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
      toast.success("ZIP downloaded successfully!", `${cardAccounts.length} QR code files saved.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ZIP file");
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
      return toast.error("All required fields must be filled in");
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
      toast.error(isEmailTaken ? "Email already registered" : "Failed to create account", json.error);
      setSaving(false);
      return;
    }
    if (json.staff_warning) {
      toast.error("Attention", json.staff_warning);
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
    toast.success("Account created", "The account is active immediately");
    setShowAdd(false);
    load();
  };

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selectedQRIds.has(a.id));

  return {
    branches,
    accounts, loading, roleFilter, setRoleFilter, branchFilter, setBranchFilter, search, setSearch,
    showArchived, setShowArchived, schools,
    selected, setSelected, showAdd, setShowAdd, form, setForm, saving,
    autoCreateStaff, setAutoCreateStaff, staffFullName, setStaffFullName, staffEmail, setStaffEmail,
    staffPassword, setStaffPassword, sameStaffPassword, setSameStaffPassword,
    qrSelectMode, setQrSelectMode, selectedQRIds, setSelectedQRIds, generatingQR, qrProgress,
    showQuickDownloadModal, setShowQuickDownloadModal, quickRole, setQuickRole, quickBranch, setQuickBranch,
    load, roleLabel, isKnownRole, filtered, toQRCardAccount,
    toggleSelectAccount, toggleSelectAllFiltered,
    handleDownloadSelectedZip, handlePrintSelectedSheet, handleExecuteQuickDownload,
    openCreate, saveNewAccount, isAllFilteredSelected,
  };
}
