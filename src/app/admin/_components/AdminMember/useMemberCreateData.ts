"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { parseUserApiError } from "../../_utils";
import type { ClassRow } from "../../_types";

export function useMemberCreateData({
  branchId, classes, load, setSearch,
}: {
  branchId: string;
  classes: ClassRow[];
  load: () => Promise<void>;
  setSearch: (v: string) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", school_grade: "", email: "", password: "", jumlah_sesi: "" });
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  const createMember = async () => {
    if (!form.full_name || !form.email || !form.password) return toast.error(t("admin.coaches.nameEmailPasswordRequired"));
    if (form.type === "private" && !form.jumlah_sesi) return toast.error(t("admin.members.sessionsRequiredPrivate"));
    // Capacity check
    if (form.class_id) {
      const cls = classes.find(c => c.id === form.class_id);
      if (cls && cls.enrolled >= cls.capacity) {
        const ok = await confirm({ body: t("admin.members.classFullConfirmBody", { name: cls.name, enrolled: cls.enrolled, capacity: cls.capacity }) });
        if (!ok) return;
      }
    }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email, password: form.password, full_name: form.full_name,
        role: "member", branch_id: branchId, phone: form.phone,
        birth_date: form.birth_date || null, gender: form.gender || null,
        address: form.address || null, health_notes: form.health_notes || null,
        member_type: form.type,
        school_id: form.type === "school_affiliate" ? form.school_id : null,
        school_grade: form.type === "school_affiliate" ? form.school_grade.trim() || null : null,
        class_id: form.class_id || null,
        total_sessions: form.type === "private" ? (Number(form.jumlah_sesi) || null) : null,
      }),
    });
    const json = await res.json() as { user_id?: string; error?: string; code?: string; class_assignment_error?: string };
    if (!res.ok) { const [errT, errS, errD] = parseUserApiError(json, t); toast.error(errT, errS, errD); setSaving(false); return; }

    // Upload avatar if selected
    if (createAvatarFile && json.user_id) {
      try {
        const fd = new FormData();
        fd.append("file", createAvatarFile);
        fd.append("profile_id", json.user_id);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    if (json.class_assignment_error) {
      toast.error(t("admin.members.memberCreatedToast"), json.class_assignment_error);
    } else {
      toast.success(t("admin.members.memberCreatedToast"), t("admin.members.accountActiveImmediatelySub"));
    }
    setSaving(false);
    setOpenCreate(false);
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
    setForm({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", school_grade: "", email: "", password: "", jumlah_sesi: "" });
    setSearch("");
    load();
  };

  return {
    t,
    openCreate, setOpenCreate, saving, form, setForm,
    createAvatarFile, setCreateAvatarFile, createAvatarPreview, setCreateAvatarPreview,
    showCreatePwd, setShowCreatePwd,
    createMember,
  };
}
