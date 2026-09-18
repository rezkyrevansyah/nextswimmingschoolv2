"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { parseUserApiError } from "../../_utils";
import type { ClassRow } from "../../_types";
import type { MemberRow } from "./_types";

export function useMemberEditData({
  detail, setDetail, classes, load,
}: {
  detail: MemberRow | null;
  setDetail: React.Dispatch<React.SetStateAction<MemberRow | null>>;
  classes: ClassRow[];
  load: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [openEditMember, setOpenEditMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    full_name: "", email: "", birth_date: "", gender: "", phone: "", phone_owner: "self",
    parent_name: "", parent_phone: "", address: "", health_notes: "",
    type: "reguler", school_id: "", school_grade: "", class_ids: [] as string[], member_no: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  const openEdit = (m: MemberRow) => {
    setEditMemberForm({
      full_name: m.profile?.full_name ?? "",
      email: m.profile?.email ?? "",
      birth_date: m.profile?.birth_date ?? "",
      gender: m.profile?.gender ?? "",
      phone: m.profile?.phone ?? "",
      phone_owner: "self",
      parent_name: "",
      parent_phone: "",
      address: m.profile?.address ?? "",
      health_notes: m.profile?.health_notes ?? "",
      type: m.type ?? "reguler",
      school_id: m.school_id ?? "",
      school_grade: m.school_grade ?? "",
      class_ids: m.member_classes?.map(mc => mc.class?.id).filter(Boolean) as string[] ?? [],
      member_no: m.member_no ?? "",
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setOpenEditMember(true);
  };

  const saveMemberEdit = async () => {
    if (!detail) return;
    if (!editMemberForm.full_name) return toast.error("Full name is required");
    setSavingEdit(true);

    // Update email di auth jika berubah
    const currentEmail = (detail.profile?.email ?? "").trim().toLowerCase();
    const newEmail = editMemberForm.email.trim().toLowerCase();
    if (newEmail && newEmail !== currentEmail) {
      const emailRes = await fetch(`/api/admin/users/${detail.profile_id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      if (!emailRes.ok) {
        const j = await emailRes.json() as { error?: string; code?: string };
        const [errT, errS, errD] = parseUserApiError(j);
        setSavingEdit(false);
        return toast.error(errT, errS, errD);
      }
    }

    // Update profiles
    const { error: profileErr } = await createClient().from("profiles").update({
      full_name: editMemberForm.full_name,
      birth_date: editMemberForm.birth_date || null,
      gender: editMemberForm.gender || null,
      phone: editMemberForm.phone || null,
      address: editMemberForm.address || null,
      health_notes: editMemberForm.health_notes || null,
    }).eq("id", detail.profile_id);
    if (profileErr) { setSavingEdit(false); return toast.error("Failed to update profile", profileErr.message); }

    // Update members row (type, school_id) — member_no is auto-generated at creation, not editable
    await createClient().from("members").update({
      type: editMemberForm.type as "reguler" | "private" | "school_affiliate",
      school_id: editMemberForm.type === "school_affiliate" ? (editMemberForm.school_id || null) : null,
      school_grade: editMemberForm.type === "school_affiliate" ? (editMemberForm.school_grade.trim() || null) : null,
    }).eq("id", detail.id);

    // Sync kelas — add new, remove removed
    const prev = detail.member_classes?.map(mc => mc.class?.id).filter(Boolean) as string[] ?? [];
    const next = editMemberForm.class_ids;
    const toAdd = next.filter(id => !prev.includes(id));
    const toRemove = prev.filter(id => !next.includes(id));
    if (toAdd.length > 0) {
      // capacity check for new classes
      for (const cid of toAdd) {
        const cls = classes.find(c => c.id === cid);
        if (cls && cls.enrolled >= cls.capacity) {
          const ok = await confirm({ body: `Class "${cls.name}" is already full (${cls.enrolled}/${cls.capacity}). Add anyway?` });
          if (!ok) { setSavingEdit(false); return; }
        }
      }
      await createClient().from("member_classes").insert(toAdd.map(class_id => ({ member_id: detail.id, class_id, joined_at: new Date().toISOString() })));
    }
    if (toRemove.length > 0) {
      await createClient().from("member_classes").delete().eq("member_id", detail.id).in("class_id", toRemove);
    }

    // Upload avatar if changed
    let newAvatarUrl: string | null = null;
    if (editAvatarFile) {
      try {
        const fd = new FormData();
        fd.append("file", editAvatarFile);
        fd.append("profile_id", detail.profile_id);
        const avatarRes = await fetch("/api/upload/avatar", { method: "POST", body: fd });
        if (avatarRes.ok) {
          const { url } = await avatarRes.json() as { url: string };
          newAvatarUrl = url;
        }
      } catch { /* non-fatal */ }
    }

    setSavingEdit(false);
    toast.success("Student data updated");
    setOpenEditMember(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    // Update detail state immediately so modal reflects changes without waiting for load()
    setDetail(prev => prev ? {
      ...prev,
      type: editMemberForm.type as MemberRow["type"],
      school_grade: editMemberForm.type === "school_affiliate" ? (editMemberForm.school_grade.trim() || null) : null,
      member_no: editMemberForm.member_no || null,
      profile: prev.profile ? {
        ...prev.profile,
        full_name: editMemberForm.full_name,
        birth_date: editMemberForm.birth_date || null,
        gender: editMemberForm.gender || null,
        phone: editMemberForm.phone || null,
        address: editMemberForm.address || null,
        health_notes: editMemberForm.health_notes || null,
        email: newEmail && newEmail !== currentEmail ? newEmail : prev.profile.email,
        avatar_url: newAvatarUrl ?? prev.profile.avatar_url,
      } : prev.profile,
    } : prev);
    load();
  };

  return {
    openEditMember, setOpenEditMember, editMemberForm, setEditMemberForm, savingEdit,
    editAvatarFile, setEditAvatarFile, editAvatarPreview, setEditAvatarPreview,
    openEdit, saveMemberEdit,
  };
}
