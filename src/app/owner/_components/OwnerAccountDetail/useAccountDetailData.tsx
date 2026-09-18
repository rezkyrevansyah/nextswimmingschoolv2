"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { createClient } from "@/utils/supabase/client";
import { downloadSingleQRCard } from "@/lib/qrCardGenerator";
import type { AccountMemberData, Props } from "./_types";

export function useAccountDetailData({ account, branches, open, onClose, onRefresh }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();

  const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Branch Admin",
    manager_center: "Manager Center",
    coach: "Coach",
    member: "Student",
    school: "School Partner",
    staff: "Branch Staff",
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
    toast.success(`${label} copied!`, text);
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
    if (!form.full_name.trim()) return toast.error("Full name is required");

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
    if (!res.ok) return toast.error("Failed to save", json.error);

    toast.success("Profile updated successfully");
    setEditing(false);
    onRefresh();
  };

  const handleBanToggle = async () => {
    if (!account) return;
    const isCurrentlyBanned = account.is_archived;
    const action = isCurrentlyBanned ? "unban" : "ban";
    const confirmed = await confirm({
      title: isCurrentlyBanned
        ? (<>{"Reactivate "}<NoTranslate>{account.full_name}</NoTranslate>{"'s account?"}</>)
        : (<>{"Deactivate "}<NoTranslate>{account.full_name}</NoTranslate>{"'s account?"}</>),
      body: isCurrentlyBanned
        ? "This account will be reactivated. The user will be able to log in as usual."
        : "This account will be blocked from the system. The user will not be able to log in until reactivated.",
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
    if (!res.ok) return toast.error("Failed to change account status", json.error);
    toast.success(
      isCurrentlyBanned ? "Account reactivated successfully" : "Account deactivated successfully"
    );
    onRefresh();
    onClose();
  };

  const handleResetPassword = async () => {
    if (!account || !newPassword.trim()) return;
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setResettingPwd(true);
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResettingPwd(false);
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return toast.error("Failed to reset password", json.error);
    toast.success(
      "Password reset successfully",
      (<>{"A new password has been set for "}<NoTranslate>{account.full_name}</NoTranslate>{"."}</>)
    );
    setNewPassword("");
    setShowPwdReset(false);
  };

  const handleDelete = async () => {
    if (!account) return;
    const confirmed = await confirm({
      title: (<>{"Delete "}<NoTranslate>{account.full_name}</NoTranslate>{"'s account?"}</>),
      body: "This account will be permanently deleted along with all its data. This action cannot be undone.",
      danger: true,
    });
    if (!confirmed) return;
    const res = await fetch(`/api/admin/users/${account.id}`, { method: "DELETE" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return toast.error("Failed to delete account", json.error);
    toast.success("Account deleted successfully");
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
      toast.success("QR Card downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download QR card");
    }
    setDownloadingQr(false);
  };

  // Calculate age if birth_date exists
  const calcAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return null;
    const dob = new Date(birthDateStr);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  return {
    branches, ROLE_LABELS, account, open, onClose,
    editing, setEditing, saving, banning, resettingPwd, newPassword, setNewPassword,
    showPwdReset, setShowPwdReset, showNewPwd, setShowNewPwd,
    coachClasses, certifications, memberData, schools, downloadingQr,
    linkedStaff, form, setForm,
    copyToClipboard, openEdit, saveEdit, handleBanToggle, handleResetPassword, handleDelete,
    handleDownloadSingleQR, calcAge,
  };
}
