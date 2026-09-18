"use client";
import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useUpload } from "@/hooks/useUpload";
import { calcAge } from "../../_utils";
import type { Database } from "@/types/database";
import { fmtDate } from "@/lib/utils";
import type { CoachFull } from "./_types";
import { toDbDate } from "./_utils";

export function useCoachDetailActions(load: () => void) {
  const toast = useToast();
  const confirm = useConfirm();
  const { upload } = useUpload();

  // detail panel
  const [detail, setDetail] = useState<CoachFull | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);

  // edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", nick_name: "", gender: "", birth_date: "", phone: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  // add cert from detail panel
  const [openAddCert, setOpenAddCert] = useState(false);
  const [certForm, setCertForm] = useState({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
  const [certPhotoFile, setCertPhotoFile] = useState<File | null>(null);
  const certPhotoInputRef = useRef<HTMLInputElement>(null);
  const [savingCert, setSavingCert] = useState(false);

  // suspend
  const [suspendTarget, setSuspendTarget] = useState<CoachFull | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [suspendForm, setSuspendForm] = useState({ reason: "", until: "" });

  // reset password
  const [openReset, setOpenReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const saveEdit = async () => {
    if (!detail) return;
    if (!editForm.full_name) return toast.error("Name is required");
    setEditSaving(true);
    const { error } = await createClient().from("profiles")
      .update({
        full_name: editForm.full_name,
        nick_name: editForm.nick_name || null,
        gender: editForm.gender || null,
        birth_date: editForm.birth_date || null,
        phone: editForm.phone || null,
        specialization: editForm.specialization || null,
        bio: editForm.bio || null,
        address: editForm.address || null,
        education_level: editForm.education_level || null,
        education_institution: editForm.education_institution || null,
        bank_name: editForm.bank_name || null,
        bank_account: editForm.bank_account || null,
        bank_holder: editForm.bank_holder || null,
      })
      .eq("id", detail.id);
    if (error) { setEditSaving(false); return toast.error("Failed to save", error.message); }

    // Upload avatar if changed
    if (editAvatarFile) {
      try {
        const fd = new FormData();
        fd.append("file", editAvatarFile);
        fd.append("profile_id", detail.id);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    setEditSaving(false);
    toast.success("Coach data updated");
    setOpenEdit(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setDetail(prev => prev ? { ...prev, ...editForm } : prev);
    load();
  };

  const addCert = async () => {
    if (!detail) return toast.error("Coach data not loaded, try refreshing");
    setSavingCert(true);
    const title = certForm.title.trim();
    const { data, error } = await createClient().from("certifications").insert({
      coach_id: detail.id, name: title || "Sertifikasi", title: title || null,
      issuer: certForm.issuer || null,
      valid_from: certForm.issued_at ? toDbDate(certForm.issued_at) : null,
      valid_until: certForm.no_expiry ? null : (certForm.expires_at ? toDbDate(certForm.expires_at) : null),
      no_expiry: certForm.no_expiry,
      status: "pending",
    }).select("id, name, title, status, valid_from, valid_until").single();
    if (error || !data) { setSavingCert(false); return toast.error("Failed to add certification", error?.message ?? "Data not saved"); }
    if (certPhotoFile) {
      try { await upload.cert(certPhotoFile, data.id); } catch { /* non-fatal */ }
    }
    setSavingCert(false);
    toast.success("Certification added");
    setOpenAddCert(false);
    setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
    setCertPhotoFile(null);
    setDetail(prev => prev ? { ...prev, certifications: [...(prev.certifications ?? []), data as { id: string; name: string; title: string | null; status: string; valid_from: string | null; valid_until: string | null }] } : prev);
  };

  const deleteCert = async (certId: string) => {
    if (!detail) return;
    const ok = await confirm({ body: "Delete this certification?" });
    if (!ok) return;
    const { error } = await createClient().from("certifications").delete().eq("id", certId);
    if (error) return toast.error("Failed to delete certification", error.message);
    toast.success("Certification deleted");
    setDetail(prev => prev ? { ...prev, certifications: (prev.certifications ?? []).filter(c => c.id !== certId) } : prev);
  };

  const doSuspend = async () => {
    if (!suspendTarget || !suspendForm.reason || !suspendForm.until) return toast.error("Reason and end date are required");
    setSuspending(true);
    const { error } = await createClient().from("profiles").update({ suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", suspendTarget.id);
    setSuspending(false);
    if (error) return toast.error("Failed to suspend coach", error.message);
    toast.success(`${suspendTarget.full_name} suspended until ${fmtDate(suspendForm.until)}`);
    setSuspendTarget(null);
    if (detail?.id === suspendTarget.id) setDetail(prev => prev ? { ...prev, suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } : prev);
    load();
  };

  const liftSuspend = async (c: CoachFull) => {
    const { error } = await createClient().from("profiles").update({ suspend_until: null, suspend_reason: null } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error("Failed to end suspend", error.message);
    toast.success("Suspend ended");
    if (detail?.id === c.id) setDetail(prev => prev ? { ...prev, suspend_until: null, suspend_reason: null } : prev);
    load();
  };

  const toggleArchive = async (c: CoachFull) => {
    const archiving = !c.is_archived;
    const ok = await confirm({ body: archiving ? `Archive coach ${c.full_name}? The coach will no longer appear in the active list.` : `Reactivate coach ${c.full_name}?` });
    if (!ok) return;
    const { error } = await createClient().from("profiles").update({ is_archived: archiving } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error("Failed to change status", error.message);
    toast.success(archiving ? "Coach archived" : "Coach reactivated");
    if (detail?.id === c.id) { setDetail(prev => prev ? { ...prev, is_archived: archiving } : prev); }
    load();
  };

  const deleteCoach = async (c: CoachFull) => {
    const ok = await confirm({ body: `Permanently delete coach account ${c.full_name}? This action cannot be undone.`, danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      return toast.error("Failed to delete coach", j.error);
    }
    toast.success("Coach deleted");
    setDetail(null);
    load();
  };

  const resetPassword = async () => {
    if (!detail || !newPassword || newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setResetSaving(true);
    const res = await fetch(`/api/admin/users/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const j = await res.json() as { error?: string };
    setResetSaving(false);
    if (!res.ok) return toast.error("Failed to reset password", j.error);
    toast.success("Password reset successfully");
    setOpenReset(false);
    setNewPassword("");
    setShowNewPassword(false);
  };

  return {
    detail, setDetail, photoView, setPhotoView,
    openEdit, setOpenEdit, editForm, setEditForm, editSaving, editAvatarFile, setEditAvatarFile, editAvatarPreview, setEditAvatarPreview,
    openAddCert, setOpenAddCert, certForm, setCertForm, certPhotoFile, setCertPhotoFile, certPhotoInputRef, savingCert,
    suspendTarget, setSuspendTarget, suspending, suspendForm, setSuspendForm,
    openReset, setOpenReset, newPassword, setNewPassword, resetSaving, showNewPassword, setShowNewPassword,
    saveEdit, addCert, deleteCert, doSuspend, liftSuspend, toggleArchive, deleteCoach, resetPassword,
    calcAge,
  };
}
