"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { parseUserApiError } from "../../_utils";
import type { Database } from "@/types/database";
import { EMPTY_COACH_FORM } from "./_types";
import { toDbDate } from "./_utils";

export function useCoachCreate(branchId: string, load: () => void) {
  const toast = useToast();
  const { t } = useLocale();

  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_COACH_FORM);
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [coachCredential, setCoachCredential] = useState<{ full_name: string; email: string; password: string; phone: string } | null>(null);
  const [showCoachPwd, setShowCoachPwd] = useState(false);
  const [createCerts, setCreateCerts] = useState<{ title: string; issuer: string; valid_from: string; valid_until: string; no_expiry: boolean }[]>([]);

  const createCoach = async () => {
    if (!form.full_name || !form.email || !form.password) return toast.error(t("admin.coaches.nameEmailPasswordRequired"));
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "coach", branch_id: branchId }),
    });
    const json = await res.json() as { user_id?: string; error?: string; code?: string };
    if (!res.ok) { const [errT, errS, errD] = parseUserApiError(json, t); toast.error(errT, errS, errD); setSaving(false); return; }

    const uid = json.user_id!;
    const db = createClient();

    // Save extended profile fields
    const extraFields: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (form.nick_name) extraFields.nick_name = form.nick_name;
    if (form.gender) extraFields.gender = form.gender;
    if (form.birth_date) extraFields.birth_date = form.birth_date;
    if (form.address) extraFields.address = form.address;
    if (form.bio) extraFields.bio = form.bio;
    if (form.education_level) extraFields.education_level = form.education_level;
    if (form.education_institution) extraFields.education_institution = form.education_institution;
    if (form.bank_name) extraFields.bank_name = form.bank_name;
    if (form.bank_account) extraFields.bank_account = form.bank_account;
    if (form.bank_holder) extraFields.bank_holder = form.bank_holder;
    if (Object.keys(extraFields).length > 0) {
      await db.from("profiles").update(extraFields).eq("id", uid);
    }

    // Insert certifications if any
    if (createCerts.length > 0) {
      const certRows: Database["public"]["Tables"]["certifications"]["Insert"][] = createCerts.filter(c => c.title).map(c => ({
        coach_id: uid, name: c.title, title: c.title,
        issuer: c.issuer || null,
        valid_from: c.valid_from ? toDbDate(c.valid_from) : null,
        valid_until: c.no_expiry ? null : (c.valid_until ? toDbDate(c.valid_until) : null),
        no_expiry: c.no_expiry,
        status: "pending" as Database["public"]["Enums"]["cert_status"],
      }));
      if (certRows.length > 0) await db.from("certifications").insert(certRows);
    }

    // Upload avatar if selected
    if (createAvatarFile) {
      try {
        const fd = new FormData();
        fd.append("file", createAvatarFile);
        fd.append("profile_id", uid);
        await fetch("/api/upload/avatar", { method: "POST", body: fd });
      } catch { /* non-fatal */ }
    }

    setSaving(false);
    setOpenAdd(false);
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
    setCreateCerts([]);
    setCoachCredential({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone });
    setForm(EMPTY_COACH_FORM);
    load();
  };

  return {
    openAdd, setOpenAdd, saving, form, setForm, createAvatarFile, setCreateAvatarFile,
    createAvatarPreview, setCreateAvatarPreview, coachCredential, setCoachCredential,
    showCoachPwd, setShowCoachPwd, createCerts, setCreateCerts, createCoach,
  };
}
