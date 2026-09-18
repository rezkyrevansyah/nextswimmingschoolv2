"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { parseUserApiError } from "../../_utils";
import type { ClassRow } from "../../_types";
import type { StudentRow } from "./_types";

export function useStudentEditData({
  detail, setDetail, classes, load,
}: {
  detail: StudentRow | null;
  setDetail: React.Dispatch<React.SetStateAction<StudentRow | null>>;
  classes: ClassRow[];
  load: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [openEditStudent, setOpenEditStudent] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    full_name: "", email: "", birth_date: "", gender: "", phone: "", phone_owner: "self",
    parent_name: "", parent_phone: "", address: "", health_notes: "",
    type: "reguler", school_id: "", school_grade: "", class_ids: [] as string[], student_no: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  const openEdit = (m: StudentRow) => {
    setEditStudentForm({
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
      class_ids: m.student_classes?.map(mc => mc.class?.id).filter(Boolean) as string[] ?? [],
      student_no: m.student_no ?? "",
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setOpenEditStudent(true);
  };

  const saveStudentEdit = async () => {
    if (!detail) return;
    if (!editStudentForm.full_name) return toast.error("Full name is required");
    setSavingEdit(true);

    // Update email di auth jika berubah
    const currentEmail = (detail.profile?.email ?? "").trim().toLowerCase();
    const newEmail = editStudentForm.email.trim().toLowerCase();
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
      full_name: editStudentForm.full_name,
      birth_date: editStudentForm.birth_date || null,
      gender: editStudentForm.gender || null,
      phone: editStudentForm.phone || null,
      address: editStudentForm.address || null,
      health_notes: editStudentForm.health_notes || null,
    }).eq("id", detail.profile_id);
    if (profileErr) { setSavingEdit(false); return toast.error("Failed to update profile", profileErr.message); }

    // Update students row (type, school_id) — student_no is auto-generated at creation, not editable
    await createClient().from("students").update({
      type: editStudentForm.type as "reguler" | "private" | "school_affiliate",
      school_id: editStudentForm.type === "school_affiliate" ? (editStudentForm.school_id || null) : null,
      school_grade: editStudentForm.type === "school_affiliate" ? (editStudentForm.school_grade.trim() || null) : null,
    }).eq("id", detail.id);

    // Sync kelas — add new, remove removed
    const prev = detail.student_classes?.map(mc => mc.class?.id).filter(Boolean) as string[] ?? [];
    const next = editStudentForm.class_ids;
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
      await createClient().from("student_classes").insert(toAdd.map(class_id => ({ student_id: detail.id, class_id, joined_at: new Date().toISOString() })));
    }
    if (toRemove.length > 0) {
      await createClient().from("student_classes").delete().eq("student_id", detail.id).in("class_id", toRemove);
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
    setOpenEditStudent(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    // Update detail state immediately so modal reflects changes without waiting for load()
    setDetail(prev => prev ? {
      ...prev,
      type: editStudentForm.type as StudentRow["type"],
      school_grade: editStudentForm.type === "school_affiliate" ? (editStudentForm.school_grade.trim() || null) : null,
      student_no: editStudentForm.student_no || null,
      profile: prev.profile ? {
        ...prev.profile,
        full_name: editStudentForm.full_name,
        birth_date: editStudentForm.birth_date || null,
        gender: editStudentForm.gender || null,
        phone: editStudentForm.phone || null,
        address: editStudentForm.address || null,
        health_notes: editStudentForm.health_notes || null,
        email: newEmail && newEmail !== currentEmail ? newEmail : prev.profile.email,
        avatar_url: newAvatarUrl ?? prev.profile.avatar_url,
      } : prev.profile,
    } : prev);
    load();
  };

  return {
    openEditStudent, setOpenEditStudent, editStudentForm, setEditStudentForm, savingEdit,
    editAvatarFile, setEditAvatarFile, editAvatarPreview, setEditAvatarPreview,
    openEdit, saveStudentEdit,
  };
}
