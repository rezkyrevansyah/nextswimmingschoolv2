"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useUpload } from "@/hooks/useUpload";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import DatePicker from "@/components/ui/DatePicker";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import Modal from "@/components/ui/Modal";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import type { CoachProfile } from "../_types";
import { calcAge, parseUserApiError } from "../_utils";
import type { Database } from "@/types/database";
import { fmtDate, waLink } from "@/lib/utils";

function fmtMonthYear(val: string | null | undefined, monthsLong: string[]): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${monthsLong[parseInt(m[2]) - 1]} ${m[1]}`;
  return val;
}
function toDbDate(ym: string): string { return ym ? `${ym}-01` : ym; }
function fromDbDate(d: string | null | undefined): string { if (!d) return ""; return d.slice(0, 7); }

interface CoachFull extends CoachProfile {
  suspend_until?: string | null;
  suspend_reason?: string | null;
  is_archived?: boolean | null;
  class_coaches?: { class_id: string; role?: string; class?: { id: string; name: string; branch_id: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null; branches?: { name: string; city: string | null } | null } | null }[];
  coach_branches?: { branch_id: string; branches?: { name: string; city: string | null } | null; is_primary: boolean; joined_at: string }[] | null;
}

const EMPTY_COACH_FORM = { full_name: "", nick_name: "", email: "", phone: "", password: "", gender: "", birth_date: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" };

export default function AdminCoach({ branchId }: { branchId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tArray } = useLocale();
  const monthsLong = tArray("common.months.long");
  const genderLabel = (g: string | null | undefined) => g === "male" ? t("admin.approvement.genderMale") : g === "female" ? t("admin.approvement.genderFemale") : null;
  const { upload } = useUpload();
  const [coaches, setCoaches] = useState<CoachFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // create
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_COACH_FORM);
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [coachCredential, setCoachCredential] = useState<{ full_name: string; email: string; password: string; phone: string } | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);
  const [showCoachPwd, setShowCoachPwd] = useState(false);

  // detail panel
  const [detail, setDetail] = useState<CoachFull | null>(null);

  // edit
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", nick_name: "", gender: "", birth_date: "", phone: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" });
  const [editSaving, setEditSaving] = useState(false);
  // certifications to add during create
  const [createCerts, setCreateCerts] = useState<{ title: string; issuer: string; valid_from: string; valid_until: string; no_expiry: boolean }[]>([]);
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

  // link existing coach
  const [openLink, setOpenLink] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSelectedIds, setLinkSelectedIds] = useState<Set<string>>(new Set());
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkCandidates, setLinkCandidates] = useState<{ id: string; full_name: string; phone: string | null; avatar_url: string | null; branches: { name: string; city: string | null }[] }[]>([]);
  const [linkLoadingCandidates, setLinkLoadingCandidates] = useState(false);
  const [linkShowFilters, setLinkShowFilters] = useState(false);
  const [linkFilterBranch, setLinkFilterBranch] = useState("");
  const [linkFilterCity, setLinkFilterCity] = useState("");

  // assign class
  const [openAssign, setOpenAssign] = useState(false);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null }[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [assignRoles, setAssignRoles] = useState<Record<string, string>>({});
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    // Load coach_ids in this branch from junction table, then load profiles for those coaches
    const { data: cbData } = await createClient().from("coach_branches").select("coach_id").eq("branch_id", branchId);
    const coachIds = (cbData ?? []).map((r: { coach_id: string }) => r.coach_id);
    if (coachIds.length === 0) { setCoaches([]); setLoading(false); return; }
    const { data, error } = await createClient().from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, qr_code, suspend_until, suspend_reason, is_archived, certifications!certifications_coach_id_fkey(id, name, title, status, valid_from, valid_until), class_coaches(class_id, role, class:classes(id, name, branch_id, time_start, time_end, schedule_days, branches(name, city))), coach_branches!coach_branches_coach_id_fkey(branch_id, branches(name, city), is_primary, joined_at)")
      .eq("role", "coach").in("id", coachIds).order("full_name");
    if (error) return;
    if (data) setCoaches(data as unknown as CoachFull[]);
    setLoading(false);
  }, [branchId]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isSuspended = (c: CoachFull) => !c.is_archived && !!c.suspend_until && new Date(c.suspend_until) >= new Date();
  const isArchived = (c: CoachFull) => !!c.is_archived;

  const coachStatus = (c: CoachFull) => {
    if (isArchived(c)) return "archived";
    if (isSuspended(c)) return "suspended";
    return "active";
  };

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

  const saveEdit = async () => {
    if (!detail) return;
    if (!editForm.full_name) return toast.error(t("admin.coaches.nameRequired"));
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
    if (error) { setEditSaving(false); return toast.error(t("admin.approvement.saveFailedGeneric"), error.message); }

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
    toast.success(t("admin.coaches.coachDataUpdatedToast"));
    setOpenEdit(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setDetail(prev => prev ? { ...prev, ...editForm } : prev);
    load();
  };

  const addCert = async () => {
    if (!detail) return toast.error(t("admin.coaches.coachDataNotLoadedError"));
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
    if (error || !data) { setSavingCert(false); return toast.error(t("admin.coaches.addCertFailed"), error?.message ?? t("admin.coaches.dataNotSavedFallback")); }
    if (certPhotoFile) {
      try { await upload.cert(certPhotoFile, data.id); } catch { /* non-fatal */ }
    }
    setSavingCert(false);
    toast.success(t("admin.coaches.certAddedToast"));
    setOpenAddCert(false);
    setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
    setCertPhotoFile(null);
    setDetail(prev => prev ? { ...prev, certifications: [...(prev.certifications ?? []), data as { id: string; name: string; title: string | null; status: string; valid_from: string | null; valid_until: string | null }] } : prev);
  };

  const deleteCert = async (certId: string) => {
    if (!detail) return;
    const ok = await confirm({ body: t("admin.coaches.deleteCertConfirmBody") });
    if (!ok) return;
    const { error } = await createClient().from("certifications").delete().eq("id", certId);
    if (error) return toast.error(t("admin.coaches.deleteCertFailed"), error.message);
    toast.success(t("admin.coaches.certDeletedToast"));
    setDetail(prev => prev ? { ...prev, certifications: (prev.certifications ?? []).filter(c => c.id !== certId) } : prev);
  };

  const doSuspend = async () => {
    if (!suspendTarget || !suspendForm.reason || !suspendForm.until) return toast.error(t("admin.coaches.reasonUntilRequired"));
    setSuspending(true);
    const { error } = await createClient().from("profiles").update({ suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", suspendTarget.id);
    setSuspending(false);
    if (error) return toast.error(t("admin.coaches.suspendFailed"), error.message);
    toast.success(t("admin.coaches.suspendedUntilToast", { name: suspendTarget.full_name, date: fmtDate(suspendForm.until) }));
    setSuspendTarget(null);
    if (detail?.id === suspendTarget.id) setDetail(prev => prev ? { ...prev, suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } : prev);
    load();
  };

  const liftSuspend = async (c: CoachFull) => {
    const { error } = await createClient().from("profiles").update({ suspend_until: null, suspend_reason: null } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error(t("admin.coaches.endSuspendFailed"), error.message);
    toast.success(t("admin.coaches.suspendEndedToast"));
    if (detail?.id === c.id) setDetail(prev => prev ? { ...prev, suspend_until: null, suspend_reason: null } : prev);
    load();
  };

  const toggleArchive = async (c: CoachFull) => {
    const archiving = !c.is_archived;
    const ok = await confirm({ body: archiving ? t("admin.coaches.archiveConfirmBody2", { name: c.full_name }) : t("admin.coaches.reactivateConfirmBody", { name: c.full_name }) });
    if (!ok) return;
    const { error } = await createClient().from("profiles").update({ is_archived: archiving } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error(t("admin.coaches.changeStatusFailed"), error.message);
    toast.success(archiving ? t("admin.coaches.coachArchivedToast") : t("admin.coaches.coachReactivatedToast"));
    if (detail?.id === c.id) { setDetail(prev => prev ? { ...prev, is_archived: archiving } : prev); }
    load();
  };

  const deleteCoach = async (c: CoachFull) => {
    const ok = await confirm({ body: t("admin.coaches.deleteCoachConfirmBody", { name: c.full_name }), danger: true, confirmLabel: t("common.actions.delete") });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      return toast.error(t("admin.coaches.deleteCoachFailed"), j.error);
    }
    toast.success(t("admin.coaches.coachDeletedToast"));
    setDetail(null);
    load();
  };

  const resetPassword = async () => {
    if (!detail || !newPassword || newPassword.length < 6) return toast.error(t("admin.schoolPanel.passwordMinLength"));
    setResetSaving(true);
    const res = await fetch(`/api/admin/users/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const j = await res.json() as { error?: string };
    setResetSaving(false);
    if (!res.ok) return toast.error(t("admin.coaches.resetPasswordFailed"), j.error);
    toast.success(t("admin.coaches.passwordResetToast"));
    setOpenReset(false);
    setNewPassword("");
    setShowNewPassword(false);
  };

  const loadLinkCandidates = async () => {
    setLinkLoadingCandidates(true);
    setLinkCandidates([]);
    const db = createClient();
    // Get all coach_branches entries with branch info, grouped by coach
    // Source of truth: a coach only appears here if they are already registered in at least one branch
    const { data: allLinks } = await db
      .from("coach_branches")
      .select("coach_id, branch_id, branches(name, city), profile:profiles(id, full_name, phone, avatar_url)")
      .order("coach_id");
    if (!allLinks) { setLinkLoadingCandidates(false); return; }
    // IDs already in this branch
    const alreadyLinked = new Set(
      allLinks.filter(r => r.branch_id === branchId).map(r => r.coach_id)
    );
    // Group by coach, collect all their branches
    const byCoach = new Map<string, { id: string; full_name: string; phone: string | null; avatar_url: string | null; branches: { name: string; city: string | null }[] }>();
    for (const row of allLinks) {
      const rawProfile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const p = rawProfile as { id: string; full_name: string; phone: string | null; avatar_url: string | null } | null | undefined;
      if (!p) continue;
      if (alreadyLinked.has(p.id)) continue; // skip coaches already in this branch
      if (!byCoach.has(p.id)) {
        byCoach.set(p.id, { id: p.id, full_name: p.full_name, phone: p.phone, avatar_url: p.avatar_url, branches: [] });
      }
      const rawBranches = Array.isArray(row.branches) ? row.branches[0] : row.branches;
      const br = rawBranches as { name: string; city: string | null } | null | undefined;
      if (br) byCoach.get(p.id)!.branches.push(br);
    }
    const candidates = Array.from(byCoach.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setLinkCandidates(candidates);
    setLinkLoadingCandidates(false);
  };

  const linkFilteredCandidates = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    return linkCandidates.filter(c => {
      if (q && !(c.full_name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))) return false;
      if (linkFilterBranch && !c.branches.some(b => b.name === linkFilterBranch)) return false;
      if (linkFilterCity && !c.branches.some(b => b.city === linkFilterCity)) return false;
      return true;
    });
  }, [linkCandidates, linkSearch, linkFilterBranch, linkFilterCity]);

  const linkBranchOptions = useMemo(
    () => Array.from(new Set(linkCandidates.flatMap(c => c.branches.map(b => b.name)))).sort(),
    [linkCandidates]
  );
  const linkCityOptions = useMemo(
    () => Array.from(new Set(linkCandidates.flatMap(c => c.branches.map(b => b.city).filter((v): v is string => !!v)))).sort(),
    [linkCandidates]
  );
  const linkActiveFilterCount = [linkFilterBranch, linkFilterCity].filter(Boolean).length;

  const linkCoachToBranch = async () => {
    if (linkSelectedIds.size === 0) return;
    setLinkSaving(true);
    const ids = Array.from(linkSelectedIds);
    const outcomes = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/admin/coaches/${id}/branches`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branch_id: branchId }),
        }).then(async res => ({ ok: res.ok, json: await res.json() as { error?: string; code?: string } }))
      )
    );
    setLinkSaving(false);

    let succeeded = 0, alreadyLinked = 0, failed = 0;
    for (const outcome of outcomes) {
      if (outcome.status !== "fulfilled") { failed++; continue; }
      if (outcome.value.ok) succeeded++;
      else if (outcome.value.json.code === "ALREADY_LINKED") alreadyLinked++;
      else failed++;
    }

    const parts = [
      succeeded > 0 ? t("admin.coaches.linkBulkSuccessPart", { count: succeeded }) : null,
      alreadyLinked > 0 ? t("admin.coaches.linkBulkAlreadyPart", { count: alreadyLinked }) : null,
      failed > 0 ? t("admin.coaches.linkBulkFailedPart", { count: failed }) : null,
    ].filter(Boolean).join(", ");
    if (failed > 0 && succeeded === 0) toast.error(t("admin.coaches.linkCoachFailed"), parts);
    else toast.success(parts);

    setOpenLink(false);
    setLinkSearch("");
    setLinkSelectedIds(new Set());
    setLinkCandidates([]);
    setLinkFilterBranch("");
    setLinkFilterCity("");
    load();
  };

  const unlinkCoachFromBranch = async (c: CoachFull, classCount: number) => {
    const ok = await confirm({
      body: classCount > 0
        ? t("admin.coaches.unlinkConfirmBodyWithClasses", { name: c.full_name, count: classCount })
        : t("admin.coaches.unlinkConfirmBody", { name: c.full_name }),
      danger: true,
      confirmLabel: t("admin.coaches.unlinkBtn"),
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/coaches/${c.id}/branches`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch_id: branchId }),
    });
    const j = await res.json() as { error?: string; removedClassAssignments?: number };
    if (!res.ok) return toast.error(t("admin.coaches.unlinkFailed"), j.error);
    setDetail(prev => prev ? {
      ...prev,
      coach_branches: prev.coach_branches?.filter(cb => cb.branch_id !== branchId),
      class_coaches: prev.class_coaches?.filter(cc => cc.class?.branch_id !== branchId),
    } : prev);
    const removed = j.removedClassAssignments ?? 0;
    toast.success(removed > 0
      ? t("admin.coaches.unlinkSuccessWithClassesToast", { name: c.full_name, count: removed })
      : t("admin.coaches.unlinkSuccessToast", { name: c.full_name }));
    load();
  };

  const openAssignModal = async (c: CoachFull) => {
    const { data } = await createClient().from("classes")
      .select("id, name, time_start, time_end, schedule_days").eq("branch_id", branchId).eq("status", "active").order("name");
    if (data) setAllClasses(data as unknown as typeof allClasses);
    setAssignedClassIds(c.class_coaches?.map(cc => cc.class_id) ?? []);
    setAssignRoles(Object.fromEntries((c.class_coaches ?? []).map(cc => [cc.class_id, cc.role ?? "assistant"])));
    setOpenAssign(true);
  };

  const saveAssign = async () => {
    if (!detail) return;
    setAssignSaving(true);
    const current = detail.class_coaches?.map(cc => cc.class_id) ?? [];
    const toAdd = assignedClassIds.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !assignedClassIds.includes(id));
    const toUpdate = assignedClassIds.filter(id => current.includes(id));
    const supabase = createClient();
    // Any class this coach is now "head" of: demote other coaches on that class to assistant first
    const newHeadClassIds = assignedClassIds.filter(id => (assignRoles[id] ?? "assistant") === "head");
    for (const class_id of newHeadClassIds) {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", class_id).neq("coach_id", detail.id);
    }
    if (toAdd.length > 0) {
      await supabase.from("class_coaches").insert(toAdd.map(class_id => ({ class_id, coach_id: detail.id, role: assignRoles[class_id] ?? "assistant" })));
    }
    for (const class_id of toUpdate) {
      await supabase.from("class_coaches").update({ role: assignRoles[class_id] ?? "assistant" }).eq("class_id", class_id).eq("coach_id", detail.id);
    }
    if (toRemove.length > 0) {
      await supabase.from("class_coaches").delete().eq("coach_id", detail.id).in("class_id", toRemove);
    }
    setAssignSaving(false);
    toast.success(t("admin.coaches.classesUpdatedToast"));
    setOpenAssign(false);
    // Update detail state immediately so panel reflects new assignment
    setDetail(prev => prev ? {
      ...prev,
      class_coaches: assignedClassIds.map(class_id => ({
        class_id,
        role: assignRoles[class_id] ?? "assistant",
        class: (allClasses.find(c => c.id === class_id) ?? null) as CoachFull["class_coaches"] extends (infer T)[] ? T extends { class?: infer C } ? C : never : never,
      })),
    } : prev);
    load();
  };

  const visibleCoaches = showArchived ? coaches : coaches.filter(c => !c.is_archived);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPage(0); }, [showArchived]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const totalPages = Math.max(1, Math.ceil(visibleCoaches.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedCoaches = visibleCoaches.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">{t("admin.coaches.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("admin.coaches.pageSub")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {coaches.some(c => c.is_archived) && (
            <Btn variant="ghost" size="sm" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? t("admin.coaches.hideArchivedBtn") : t("admin.coaches.showArchivedBtn", { count: coaches.filter(c => c.is_archived).length })}
            </Btn>
          )}
          <Btn variant="soft" icon="link" onClick={() => { setLinkSearch(""); setLinkSelectedIds(new Set()); setLinkShowFilters(false); setLinkFilterBranch(""); setLinkFilterCity(""); setOpenLink(true); loadLinkCandidates(); }}>{t("admin.coaches.linkExistingCoachBtn")}</Btn>
          <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_COACH_FORM); setCreateAvatarFile(null); setCreateAvatarPreview(null); setOpenAdd(true); }}>{t("admin.coaches.addCoachBtn")}</Btn>
        </div>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("admin.coaches.loadingData")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">{t("admin.coaches.colCoach")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">{t("admin.coaches.colEmail")}</th>
                  <th className="text-left py-3 font-bold">{t("admin.coaches.colStatus")}</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">{t("admin.coaches.colPhone")}</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">{t("admin.coaches.colClasses")}</th>
                  <th className="py-3 px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagedCoaches.map((c) => {
                  const suspended = isSuspended(c);
                  const archived = isArchived(c);
                  const assignedClasses = c.class_coaches?.filter(cc => cc.class) ?? [];
                  return (
                    <tr key={c.id} className={`hover:bg-paper-tint cursor-pointer${archived ? " opacity-60" : ""}`} onClick={() => setDetail(c)}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.full_name} src={c.avatar_url ?? undefined} size={36} />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink truncate">{c.full_name}</div>
                            {c.nick_name && <div className="text-xs text-ink-faint truncate">{c.nick_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-ink-soft hidden sm:table-cell">
                        {c.email ?? <span className="text-ink-faint">—</span>}
                      </td>
                      <td>
                        <Status kind={coachStatus(c) as "active" | "suspended" | "archived"}>
                          {archived ? t("admin.coaches.statusArchived") : suspended ? t("admin.coaches.statusSuspend") : t("admin.coaches.statusActive")}
                        </Status>
                      </td>
                      <td className="text-sm text-ink-soft hidden md:table-cell">
                        {c.phone ?? <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="hidden md:table-cell">
                        {assignedClasses.length > 0
                          ? <span className="text-xs font-semibold bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full">{t("admin.coaches.classesCountBadge", { count: assignedClasses.length })}</span>
                          : <span className="text-xs text-ink-faint">—</span>}
                      </td>
                      <td className="px-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <Btn variant="ghost" size="sm" icon="eye" onClick={() => setDetail(c)}>{t("admin.coaches.detailBtn")}</Btn>
                          {!archived && c.phone && (
                            <a href={waLink(t("admin.coaches.welcomeWaMessage2", { name: c.full_name }), c.phone)} target="_blank" rel="noreferrer">
                              <Btn variant="ghost" size="sm" icon="whatsapp" className="text-ok-600">WA</Btn>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleCoaches.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-ink-mute">
                    {showArchived ? t("admin.coaches.noArchivedCoaches") : t("admin.coaches.noCoachesYet")}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-ink-mute tabular-nums">
              {t("admin.coaches.coachCountPageLabel", { count: visibleCoaches.length, page: safePage + 1, total: totalPages })}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
              <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                .reduce<(number | "...")[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(i); return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`e${idx}`} className="px-2 text-xs text-ink-faint">…</span>
                  ) : (
                    <button key={item} type="button" onClick={() => setPage(item as number)}
                      className={`min-w-[32px] py-1.5 rounded-lg border text-xs transition ${safePage === item ? "bg-ocean-600 border-ocean-600 text-white font-bold" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                      {(item as number) + 1}
                    </button>
                  )
                )}
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
              <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Detail modal ── */}
      {detail && (() => {
        const suspended = isSuspended(detail);
        const archived = isArchived(detail);
        const activeCerts = detail.certifications?.filter(ct => ct.status === "approved") ?? [];
        const assignedClasses = detail.class_coaches?.filter(cc => cc.class) ?? [];
        return (
          <Modal
            size="xl"
            open={!!detail}
            onClose={() => setDetail(null)}
            title={t("admin.coaches.detailModalTitle")}
            footer={
              !archived ? (
                <>
                  <Btn variant="outline" size="sm" icon="edit" onClick={() => { setEditForm({ full_name: detail.full_name, nick_name: detail.nick_name ?? "", gender: detail.gender ?? "", birth_date: detail.birth_date ?? "", phone: detail.phone ?? "", specialization: detail.specialization ?? "", bio: detail.bio ?? "", address: detail.address ?? "", education_level: detail.education_level ?? "", education_institution: detail.education_institution ?? "", bank_name: detail.bank_name ?? "", bank_account: detail.bank_account ?? "", bank_holder: detail.bank_holder ?? "" }); setEditAvatarFile(null); setEditAvatarPreview(null); setOpenEdit(true); }}>{t("admin.coaches.editDataBtn")}</Btn>
                  <Btn variant="outline" size="sm" icon="lock" onClick={() => { setNewPassword(""); setOpenReset(true); }}>{t("admin.coaches.resetPasswordBtn")}</Btn>
                  {suspended
                    ? <Btn variant="soft" size="sm" icon="check" onClick={() => liftSuspend(detail)}>{t("admin.coaches.endSuspendBtn")}</Btn>
                    : <Btn variant="ghost" size="sm" className="text-warn-600" onClick={() => { setSuspendTarget(detail); setSuspendForm({ reason: "", until: "" }); }}>{t("admin.coaches.suspendCoachBtn")}</Btn>
                  }
                  <Btn variant="ghost" size="sm" className="text-ink-mute" onClick={() => toggleArchive(detail)}>{t("admin.coaches.archiveBtn2")}</Btn>
                </>
              ) : (
                <>
                  <Btn variant="soft" size="sm" icon="check" onClick={() => toggleArchive(detail)}>{t("admin.coaches.reactivateBtn")}</Btn>
                  <Btn variant="ghost" size="sm" className="text-danger-600" onClick={() => deleteCoach(detail)}>{t("admin.coaches.deletePermanentlyBtn")}</Btn>
                </>
              )
            }
          >
            <div className="space-y-5">
                {/* Profile summary */}
                <div className="flex items-start gap-4">
                  <button type="button" onClick={() => detail.avatar_url && setPhotoView(detail.avatar_url)} className={detail.avatar_url ? "cursor-zoom-in shrink-0" : "cursor-default shrink-0"}>
                    <Avatar name={detail.full_name} src={detail.avatar_url ?? undefined} size={64} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-xl text-ink">{detail.full_name}</div>
                    {detail.specialization && <div className="text-sm text-ocean-700 font-semibold mt-0.5">{detail.specialization}</div>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Status kind={coachStatus(detail) as "active" | "suspended" | "archived"}>
                        {archived ? t("admin.coaches.statusArchived") : suspended ? t("admin.coaches.statusSuspend") : t("admin.coaches.statusActive")}
                      </Status>
                      {activeCerts.length > 0 && <span className="text-xs text-ok-700 bg-ok-50 px-2 py-0.5 rounded-full font-semibold">{t("admin.coaches.certsCountBadge", { count: activeCerts.length })}</span>}
                    </div>
                  </div>
                </div>

                {/* Suspend banner */}
                {suspended && (
                  <div className="p-3 rounded-xl bg-warn-50 border border-warn-200 space-y-1">
                    <div className="flex items-center gap-2 text-warn-700 font-semibold text-sm"><Icon name="warning" className="w-4 h-4" />{t("admin.coaches.currentlySuspendedLabel")}</div>
                    {detail.suspend_until && <div className="text-xs text-warn-600">{t("admin.coaches.endsLabel")}: {fmtDate(detail.suspend_until)}</div>}
                    {detail.suspend_reason && <div className="text-xs text-warn-600">{t("admin.coaches.reasonLabel2")}: {detail.suspend_reason}</div>}
                  </div>
                )}

                {/* Contact info */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.contactLabel")}</div>
                  <div className="bg-paper-tint rounded-xl divide-y divide-line">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-ink-mute">{t("admin.coaches.fieldEmail2")}</span>
                      <span className="text-sm font-mono text-ink">{detail.email}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-ink-mute">{t("admin.coaches.rowPhoneWa")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink">{detail.phone ?? "—"}</span>
                        {detail.phone && (
                          <a href={waLink(t("admin.coaches.welcomeWaMessage2", { name: detail.full_name }), detail.phone)} target="_blank" rel="noreferrer" className="text-ok-600 hover:text-ok-700">
                            <Icon name="whatsapp" className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extra profile info */}
                {(detail.nick_name || detail.gender || detail.birth_date || detail.address || detail.education_level) && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.personalInfoLabel")}</div>
                    <div className="bg-paper-tint rounded-xl divide-y divide-line">
                      {detail.nick_name && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowNickname")}</span><span className="text-sm text-ink">{detail.nick_name}</span></div>}
                      {detail.gender && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowGender2")}</span><span className="text-sm text-ink">{genderLabel(detail.gender)}</span></div>}
                      {detail.birth_date && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowBirthDate2")}</span><span className="text-sm text-ink">{fmtDate(detail.birth_date)} ({t("admin.approvement.yearsSuffix", { n: calcAge(detail.birth_date) })})</span></div>}
                      {detail.education_level && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowEducation")}</span><span className="text-sm text-ink">{detail.education_level}{detail.education_institution ? ` — ${detail.education_institution}` : ""}</span></div>}
                      {detail.address && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute shrink-0">{t("admin.coaches.rowAddress2")}</span><span className="text-sm text-ink text-right ml-4">{detail.address}</span></div>}
                    </div>
                  </div>
                )}

                {/* Assigned classes — grouped by branch */}
                {(() => {
                  const allClasses = (detail.class_coaches ?? []).filter(cc => cc.class);
                  // Build ordered branch list from coach_branches (preserves primary-first order)
                  const branchOrder = (detail.coach_branches ?? [])
                    .slice()
                    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
                  // Group classes by branch_id
                  const byBranch = new Map<string, typeof allClasses>();
                  for (const cc of allClasses) {
                    const bid = cc.class!.branch_id;
                    if (!byBranch.has(bid)) byBranch.set(bid, []);
                    byBranch.get(bid)!.push(cc);
                  }
                  const isMultiBranch = (detail.coach_branches?.length ?? 0) > 1;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.classesHandledLabel")}</div>
                        {!archived && <button onClick={() => openAssignModal(detail)} className="text-xs text-ocean-600 font-semibold hover:underline">{t("admin.coaches.editAssignBtn")}</button>}
                      </div>
                      {allClasses.length === 0 ? (
                        <div className="p-3 rounded-xl bg-warn-50 border border-warn-100 text-xs text-warn-700 flex items-center gap-2">
                          <Icon name="warning" className="w-4 h-4 shrink-0" />{t("admin.coaches.notAssignedYet")}
                        </div>
                      ) : isMultiBranch ? (
                        /* Multi-branch: group by branch */
                        <div className="space-y-3">
                          {branchOrder.map(cb => {
                            const classes = byBranch.get(cb.branch_id) ?? [];
                            const isCurrentBranch = cb.branch_id === branchId;
                            return (
                              <div key={cb.branch_id} className="rounded-xl border border-line overflow-hidden">
                                <div className={`flex items-center gap-2 px-3 py-2 ${isCurrentBranch ? "bg-ocean-50" : "bg-paper-tint"}`}>
                                  <Icon name="pin" className="w-3.5 h-3.5 text-ink-mute shrink-0" />
                                  <span className="text-xs font-bold text-ink">{cb.branches?.name ?? cb.branch_id}</span>
                                  {cb.branches?.city && <span className="text-xs text-ink-mute">· {cb.branches.city}</span>}
                                  {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-100 px-1.5 py-0.5 rounded ml-auto">{t("admin.coaches.primaryBadge")}</span>}
                                  {isCurrentBranch && !cb.is_primary && <span className="text-[10px] font-bold text-wave-700 bg-wave-50 px-1.5 py-0.5 rounded ml-auto">{t("admin.coaches.thisBranchBadge")}</span>}
                                </div>
                                {classes.length === 0 ? (
                                  <div className="px-3 py-2.5 text-xs text-ink-faint italic">{t("admin.coaches.noClassesInBranch")}</div>
                                ) : (
                                  <div className="divide-y divide-line">
                                    {classes.map(cc => (
                                      <div key={cc.class_id} className="flex items-center gap-3 px-3 py-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-ocean-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
                                            {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide shrink-0">{t("admin.classes.headRoleBtn")}</span>}
                                          </div>
                                          {cc.class?.schedule_days && (
                                            <div className="text-xs text-ink-mute mt-0.5">
                                              {cc.class.schedule_days.join(", ")}{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Single branch: flat list */
                        <div className="space-y-2">
                          {allClasses.map(cc => (
                            <div key={cc.class_id} className="px-4 py-3 bg-paper-tint rounded-xl">
                              <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
                                {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide shrink-0">{t("admin.classes.headRoleBtn")}</span>}
                              </div>
                              {cc.class?.schedule_days && (
                                <div className="text-xs text-ink-mute mt-0.5">
                                  {cc.class.schedule_days.join(", ")}{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Branches summary */}
                {(detail.coach_branches?.length ?? 0) > 1 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.registeredBranchesLabel")}</div>
                    <div className="bg-paper-tint rounded-xl divide-y divide-line">
                      {detail.coach_branches!
                        .slice()
                        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                        .map(cb => {
                          const classCount = (detail.class_coaches ?? []).filter(cc => cc.class?.branch_id === cb.branch_id).length;
                          return (
                            <div key={cb.branch_id} className="flex items-center justify-between px-4 py-2.5">
                              <div>
                                <span className="text-sm text-ink font-semibold">{cb.branches?.name ?? cb.branch_id}</span>
                                {cb.branches?.city && <span className="text-xs text-ink-mute ml-1.5">{cb.branches.city}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-50 px-1.5 py-0.5 rounded">{t("admin.coaches.primaryBadge")}</span>}
                                <span className="text-xs text-ink-faint">{t("admin.coaches.classesCountSince", { count: classCount, date: fmtDate(cb.joined_at) })}</span>
                                {cb.branch_id === branchId && (
                                  <button type="button" onClick={() => unlinkCoachFromBranch(detail, classCount)} className="p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors" title={t("admin.coaches.unlinkBtn")}>
                                    <Icon name="unlink" className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* QR & ID */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.qrCoachLabel")}</div>
                  <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-xl">
                    <QRBox value={(detail as unknown as { qr_code?: string }).qr_code ?? detail.id} size={100} downloadable />
                    <div>
                      <div className="text-xs text-ink-mute mb-1">{t("admin.coaches.coachIdLabel")}</div>
                      <div className="font-mono text-sm font-bold text-ink bg-white px-2 py-1 rounded border border-line">{detail.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {detail.bio && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.bioLabel")}</div>
                    <p className="text-sm text-ink leading-relaxed">{detail.bio}</p>
                  </div>
                )}

                {/* Bank info */}
                {detail.bank_name && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.bankAccountLabel")}</div>
                    <div className="px-4 py-3 bg-paper-tint rounded-xl text-sm">
                      <div className="font-semibold text-ink">{detail.bank_name}</div>
                      <div className="text-ink-mute">{detail.bank_account} · {t("admin.coaches.bankHolderPrefix")} {detail.bank_holder}</div>
                    </div>
                  </div>
                )}

                {/* Certifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.certificationsLabel")}</div>
                    {!archived && (
                      <button onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false }); setCertPhotoFile(null); setOpenAddCert(true); }} className="text-xs text-ocean-600 font-semibold hover:underline">{t("admin.coaches.addShortBtn")}</button>
                    )}
                  </div>
                  {(detail.certifications?.length ?? 0) === 0 ? (
                    <div className="text-xs text-ink-mute italic">{t("admin.coaches.noCertsYet")}</div>
                  ) : (
                    <div className="space-y-2">
                      {detail.certifications!.map((ct) => (
                        <div key={ct.id} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                          <div>
                            <div className="font-semibold text-sm text-ink">{ct.title ?? ct.name}</div>
                            {ct.valid_from && <div className="text-xs text-ink-mute mt-0.5">{fmtMonthYear(ct.valid_from, monthsLong)}{ct.valid_until ? ` – ${fmtMonthYear(ct.valid_until, monthsLong)}` : ` ${t("admin.coaches.noExpiryShort")}`}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Status kind={ct.status === "approved" ? "active" : ct.status === "pending" ? "pending" : "inactive"}>
                              {ct.status === "approved" ? t("admin.coaches.certStatusActive") : ct.status === "pending" ? t("admin.coaches.certStatusReview") : t("common.status.rejected")}
                            </Status>
                            {!archived && (
                              <button type="button" onClick={() => deleteCert(ct.id)} className="p-1 rounded hover:bg-danger-50 text-danger-400 hover:text-danger-600 transition-colors">
                                <Icon name="x" className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── Link existing coach modal ── */}
      <Modal open={openLink} onClose={() => { setOpenLink(false); setLinkSearch(""); setLinkSelectedIds(new Set()); setLinkCandidates([]); }} title={t("admin.coaches.linkModalTitle")} size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setOpenLink(false); setLinkSearch(""); setLinkSelectedIds(new Set()); setLinkCandidates([]); }}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" icon="link" onClick={linkCoachToBranch} disabled={linkSelectedIds.size === 0 || linkSaving}>
              {linkSaving ? t("admin.coaches.linkingBtn") : t("admin.coaches.linkBtnCount", { count: linkSelectedIds.size })}
            </Btn>
          </>
        }>
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">{t("admin.coaches.linkIntroText")}</p>

          <div className="flex items-center gap-2">
            <div className="flex-1"><Input placeholder={t("admin.coaches.searchNameOrPhonePlaceholder")} value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoComplete="off" /></div>
            <button
              type="button"
              onClick={() => setLinkShowFilters(v => !v)}
              className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border transition shrink-0 ${linkShowFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
            >
              <Icon name="settings" className="w-3.5 h-3.5" />
              {t("admin.coaches.linkFilterBtn")}
              {linkActiveFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{linkActiveFilterCount}</span>
              )}
            </button>
          </div>

          {linkShowFilters && (
            <div className="bg-paper-tint border border-line rounded-xl p-3 grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.coaches.linkFilterByBranch")}</div>
                <select value={linkFilterBranch} onChange={e => setLinkFilterBranch(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                  <option value="">{t("admin.coaches.linkAllBranchesOpt")}</option>
                  {linkBranchOptions.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.coaches.linkFilterByCity")}</div>
                <select value={linkFilterCity} onChange={e => setLinkFilterCity(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                  <option value="">{t("admin.coaches.linkAllCitiesOpt")}</option>
                  {linkCityOptions.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              {linkActiveFilterCount > 0 && (
                <div className="sm:col-span-2 flex justify-end">
                  <button type="button" onClick={() => { setLinkFilterBranch(""); setLinkFilterCity(""); }} className="text-xs font-semibold text-danger-600 hover:underline">{t("admin.coaches.linkResetFilterBtn")}</button>
                </div>
              )}
            </div>
          )}

          {linkCandidates.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-mute font-medium">
                {linkSelectedIds.size > 0 ? t("admin.coaches.linkSelectedCount", { count: linkSelectedIds.size }) : ""}
              </span>
              <div className="flex items-center gap-3">
                {linkSelectedIds.size > 0 && (
                  <button type="button" onClick={() => setLinkSelectedIds(new Set())} className="text-xs font-semibold text-ink-mute hover:text-danger-600 transition">{t("admin.coaches.linkClearSelectionBtn")}</button>
                )}
                <button type="button" onClick={() => setLinkSelectedIds(new Set(linkFilteredCandidates.map(c => c.id)))} className="text-xs font-semibold text-ocean-600 hover:underline">
                  {t("admin.coaches.linkSelectAllBtn", { count: linkFilteredCandidates.length })}
                </button>
              </div>
            </div>
          )}

          {linkLoadingCandidates ? (
            <div className="py-6 text-center text-sm text-ink-mute">{t("admin.classes.loadingEllipsis")}</div>
          ) : linkCandidates.length === 0 ? (
            <div className="py-6 text-center text-sm text-ink-mute">{t("admin.coaches.allLinkedOrNoneHint")}</div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
              {linkFilteredCandidates.map(c => {
                const isChecked = linkSelectedIds.has(c.id);
                const toggle = () => setLinkSelectedIds(prev => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; });
                return (
                  <button key={c.id} type="button" onClick={toggle}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${isChecked ? "bg-ocean-50 border-ocean-300" : "bg-paper-tint border-line hover:bg-white hover:border-ocean-300"}`}>
                    <input type="checkbox" checked={isChecked} onChange={toggle} onClick={e => e.stopPropagation()} className="rounded border-line accent-ocean-600 shrink-0" />
                    <Avatar name={c.full_name} src={c.avatar_url ?? undefined} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink">{c.full_name}</div>
                      <div className="text-xs text-ink-mute">{c.phone ?? "—"}</div>
                      {c.branches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.branches.map(b => (
                            <span key={b.name} className="text-[10px] font-semibold bg-ocean-50 text-ocean-700 px-1.5 py-0.5 rounded-full">{b.name}{b.city ? ` · ${b.city}` : ""}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Add coach modal ── */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={t("admin.coaches.addCoachModalTitle")} size="md"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={createCoach} disabled={saving}>{saving ? t("admin.coaches.creatingBtn2") : t("admin.coaches.createAccountBtn")}</Btn></>}>
        <div className="space-y-4">
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar name={form.full_name || "?"} src={createAvatarPreview ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setCreateAvatarFile(f); setCreateAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
            </label>
            <p className="text-xs text-ink-faint">{t("admin.coaches.profilePhotoOptionalHint")}</p>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.personalDataLabel")}</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("admin.coaches.fieldFullName2")} required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder={t("admin.coaches.fullNamePlaceholder")} /></Field>
                <Field label={t("admin.coaches.fieldNickname")} hint={t("admin.izin.optionalHint2")}><Input value={form.nick_name} onChange={e => setForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={t("admin.coaches.nicknamePlaceholder")} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("admin.coaches.fieldGender2")}>
                  <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">{t("admin.coaches.selectEllipsis")}</option>
                    <option value="male">{t("admin.approvement.genderMale")}</option>
                    <option value="female">{t("admin.approvement.genderFemale")}</option>
                  </Select>
                </Field>
                <Field label={t("admin.coaches.fieldBirthDate2")} hint={t("admin.izin.optionalHint2")}><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
              </div>
              <Field label={t("admin.coaches.fieldEmail2")} required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
              <Field label={t("admin.coaches.fieldPhoneWa")}><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
              <Field label={t("admin.coaches.fieldAddress2")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.educationLabel")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.coaches.fieldLastEducation")}>
                <Select value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">{t("admin.coaches.selectEllipsis")}</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t("admin.coaches.fieldInstitutionName")}><Input value={form.education_institution} onChange={e => setForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={t("admin.coaches.institutionPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.coachProfileLabel")}</div>
            <div className="space-y-3">
              <Field label={t("admin.coaches.fieldSpecialization")} hint={t("admin.izin.optionalHint2")}><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder={t("admin.coaches.specializationPlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldBioDesc")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder={t("admin.coaches.bioPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.bankInfoLabel")}</div>
            <div className="space-y-3">
              <Field label={t("admin.coaches.fieldBankName")}><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={t("admin.coaches.bankNamePlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldAccountNumber")}><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={t("admin.coaches.accountNumberPlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldAccountHolder")}><Input value={form.bank_holder} onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={t("admin.coaches.accountHolderPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{t("admin.coaches.certificationsOptionalLabel")}</div>
              <Btn variant="ghost" size="sm" icon="plus" onClick={() => setCreateCerts(cs => [...cs, { title: "", issuer: "", valid_from: "", valid_until: "", no_expiry: false }])}>{t("common.actions.add")}</Btn>
            </div>
            {createCerts.map((c, i) => (
              <div key={i} className="relative border border-line rounded-xl p-3 mb-3 space-y-2">
                <button type="button" onClick={() => setCreateCerts(cs => cs.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors"><Icon name="x" className="w-4 h-4" /></button>
                <Input placeholder={t("admin.coaches.certTitlePlaceholder")} value={c.title} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <Input placeholder={t("admin.coaches.certIssuerPlaceholder")} value={c.issuer} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-ink-mute mb-1 block">{t("admin.coaches.validFromLabel")}</label><MonthYearPicker value={c.valid_from} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_from: v } : x))} /></div>
                  <div><label className="text-xs text-ink-mute mb-1 block">{t("admin.coaches.validUntilLabel")}</label><MonthYearPicker value={c.valid_until} disabled={c.no_expiry} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_until: v } : x))} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                  <input type="checkbox" checked={c.no_expiry} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, no_expiry: e.target.checked, valid_until: "" } : x))} className="rounded" />
                  {t("admin.approvement.noExpiryLabel")}
                </label>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.accountLabel")}</div>
            <Field label={t("admin.coaches.fieldInitialPassword")} required>
              <div className="relative">
                <Input type={showCoachPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
                <button type="button" tabIndex={-1} onClick={() => setShowCoachPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                  <Icon name={showCoachPwd ? "eye-off" : "eye"} className="w-4 h-4" />
                </button>
              </div>
            </Field>
          </div>
        </div>
      </Modal>

      {/* ── Edit coach modal ── */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={t("admin.coaches.editCoachModalTitle")} size="md"
        footer={<><Btn variant="ghost" onClick={() => setOpenEdit(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar name={editForm.full_name || detail?.full_name || ""} src={editAvatarPreview ?? detail?.avatar_url ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setEditAvatarFile(f); setEditAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
            </label>
            <p className="text-xs text-ink-faint">{t("admin.coaches.clickToChangePhotoHint")}</p>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.personalDataLabel")}</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("admin.coaches.fieldFullName2")} required><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
                <Field label={t("admin.coaches.fieldNickname")} hint={t("admin.izin.optionalHint2")}><Input value={editForm.nick_name} onChange={e => setEditForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={t("admin.coaches.nicknamePlaceholder")} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("admin.coaches.fieldGender2")}>
                  <Select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">{t("admin.coaches.selectEllipsis")}</option>
                    <option value="male">{t("admin.approvement.genderMale")}</option>
                    <option value="female">{t("admin.approvement.genderFemale")}</option>
                  </Select>
                </Field>
                <Field label={t("admin.coaches.fieldBirthDate2")} hint={t("admin.izin.optionalHint2")}><DatePicker value={editForm.birth_date} onChange={v => setEditForm(f => ({ ...f, birth_date: v }))} /></Field>
              </div>
              <Field label={t("admin.coaches.fieldPhoneWa")}><Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
              <Field label={t("admin.coaches.fieldAddress2")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.educationLabel")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.coaches.fieldLastEducation")}>
                <Select value={editForm.education_level} onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">{t("admin.coaches.selectEllipsis")}</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label={t("admin.coaches.fieldInstitutionName")}><Input value={editForm.education_institution} onChange={e => setEditForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={t("admin.coaches.institutionPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.coachProfileLabel")}</div>
            <div className="space-y-3">
              <Field label={t("admin.coaches.fieldSpecialization")} hint={t("admin.izin.optionalHint2")}><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} placeholder={t("admin.coaches.specializationPlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldBioDesc")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder={t("admin.coaches.bioPlaceholder")} /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.bankInfoLabel")}</div>
            <div className="space-y-3">
              <Field label={t("admin.coaches.fieldBankName")}><Input value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={t("admin.coaches.bankNamePlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldAccountNumber")}><Input value={editForm.bank_account} onChange={e => setEditForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={t("admin.coaches.accountNumberPlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldAccountHolder")}><Input value={editForm.bank_holder} onChange={e => setEditForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={t("admin.coaches.accountHolderPlaceholder")} /></Field>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Suspend coach modal ── */}
      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={t("admin.coaches.suspendModalTitle", { name: suspendTarget?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspend} disabled={suspending}>{suspending ? t("common.actions.saving") : t("admin.coaches.applySuspendBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>{t("admin.coaches.suspendNoticeText")}</span></div>
          </Card>
          <Field label={t("admin.coaches.fieldSuspendReason")} required>
            <Textarea rows={2} value={suspendForm.reason} onChange={e => setSuspendForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("admin.coaches.suspendReasonPlaceholder")} />
          </Field>
          <Field label={t("admin.coaches.fieldSuspendUntil")} required hint={t("admin.coaches.suspendUntilHint")}>
            <Input type="date" value={suspendForm.until} onChange={e => setSuspendForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* ── Reset password modal ── */}
      <Modal open={openReset} onClose={() => setOpenReset(false)} title={t("admin.coaches.resetPasswordModalTitle", { name: detail?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenReset(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={resetPassword} disabled={resetSaving}>{resetSaving ? t("admin.coaches.resettingBtn") : t("admin.coaches.resetPasswordBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-ocean-50 border-ocean-100">
            <div className="text-xs text-ocean-700">{t("admin.coaches.newPasswordNoticeText")}</div>
          </Card>
          <Field label={t("admin.coaches.fieldNewPassword")} required hint={t("admin.coaches.minCharsHint")}>
            <div className="relative">
              <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showNewPassword ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>

      {/* ── Assign class modal ── */}
      <Modal open={openAssign} onClose={() => setOpenAssign(false)} title={t("admin.coaches.assignClassModalTitle", { name: detail?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAssign(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveAssign} disabled={assignSaving}>{assignSaving ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-3">
          <p className="text-sm text-ink-mute">{t("admin.coaches.assignIntroText")}</p>
          {allClasses.length === 0 ? (
            <div className="text-sm text-ink-mute py-4 text-center">{t("admin.coaches.noActiveClassesInBranch")}</div>
          ) : (
            <div className="space-y-2">
              {allClasses.map(cls => {
                const checked = assignedClassIds.includes(cls.id);
                const role = assignRoles[cls.id] ?? "assistant";
                return (
                  <div key={cls.id}
                    className={`w-full rounded-xl border transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                    <button type="button" onClick={() => setAssignedClassIds(ids => checked ? ids.filter(id => id !== cls.id) : [...ids, cls.id])}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                        {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink">{cls.name}</div>
                        {cls.schedule_days && <div className="text-xs text-ink-mute">{cls.schedule_days.join(", ")}{cls.time_start ? ` · ${cls.time_start.slice(0,5)}${cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}` : ""}</div>}
                      </div>
                    </button>
                    {checked && (
                      <div className="flex items-center gap-2 px-4 pb-3 pl-12">
                        <button type="button" onClick={() => setAssignRoles(r => ({ ...r, [cls.id]: "head" }))}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${role === "head" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                          {t("admin.classes.headRoleBtn")}
                        </button>
                        <button type="button" onClick={() => setAssignRoles(r => ({ ...r, [cls.id]: "assistant" }))}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${role === "assistant" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                          {t("admin.classes.assistantRoleBtn")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Coach credential popup ── */}
      <Modal open={!!coachCredential} onClose={() => setCoachCredential(null)} title={t("admin.coaches.credentialModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setCoachCredential(null)}>{t("common.actions.close")}</Btn>{coachCredential?.phone && <Btn variant="wa" icon="whatsapp" onClick={() => { const num = coachCredential.phone!.replace(/^0/, "").replace(/\D/g, ""); const msg = encodeURIComponent(t("admin.coaches.coachAccountCreatedWaMessage", { name: coachCredential.full_name, email: coachCredential.email, password: coachCredential.password })); window.open(`https://wa.me/62${num}?text=${msg}`, "_blank"); }}>{t("admin.coaches.sendViaWaBtn")}</Btn>}</>}>
        <div className="space-y-3">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-center gap-2 text-ok-700 font-semibold text-sm"><Icon name="check" className="w-4 h-4" />{t("admin.coaches.accountCreatedSuccessfully")}</div>
          </Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{t("admin.coaches.nameLabel")}</span>
              <span className="font-semibold text-sm">{coachCredential?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{t("admin.coaches.fieldEmail2")}</span>
              <span className="font-mono text-sm">{coachCredential?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{t("admin.coaches.fieldInitialPassword")}</span>
              <span className="font-mono text-sm bg-paper-deep px-2 py-0.5 rounded">{coachCredential?.password}</span>
            </div>
          </div>
          <p className="text-xs text-ink-mute">{t("admin.coaches.saveOrSendCredentialHint")}</p>
        </div>
      </Modal>

      {/* ── Add certification modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setCertPhotoFile(null); }} title={t("admin.coaches.addCertModalTitle", { name: detail?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setCertPhotoFile(null); }}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={addCert} disabled={savingCert}>{savingCert ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.coaches.fieldCertName")}><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder={t("admin.coaches.certNamePlaceholder")} /></Field>
          <Field label={t("admin.coaches.fieldIssuingInstitution")}><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder={t("admin.coaches.issuerPlaceholder2")} /></Field>
          <Field label={t("admin.coaches.validFromLabel")}><MonthYearPicker value={certForm.issued_at} onChange={v => setCertForm(f => ({ ...f, issued_at: v }))} placeholder={t("common.monthYearPicker.placeholder")} /></Field>
          <Field label={t("admin.coaches.validUntilLabel")}><MonthYearPicker value={certForm.expires_at} onChange={v => setCertForm(f => ({ ...f, expires_at: v }))} placeholder={t("common.monthYearPicker.placeholder")} disabled={certForm.no_expiry} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, no_expiry: e.target.checked, expires_at: "" }))} className="rounded" />
            {t("admin.approvement.noExpiryLabel")}
          </label>
          <div>
            <div className="text-sm font-semibold text-ink mb-1.5">{t("admin.coaches.certPhotoLabel")} <span className="text-ink-faint font-normal text-xs">{t("admin.coaches.certPhotoOptionalHint")}</span></div>
            {certPhotoFile && (
              <img src={URL.createObjectURL(certPhotoFile)} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => certPhotoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper-tint hover:bg-white hover:border-ocean-400 transition-colors text-sm font-semibold text-ink-soft hover:text-ink">
                <Icon name="camera" className="w-4 h-4" />
                {certPhotoFile ? t("common.photoLightbox.changePhoto") : t("admin.coaches.choosePhotoBtn")}
              </button>
              {certPhotoFile && <span className="text-sm text-ink-mute truncate max-w-[160px]">{certPhotoFile.name}</span>}
              <input ref={certPhotoInputRef} type="file" accept="image/*" className="sr-only" onChange={e => setCertPhotoFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>
      </Modal>

      {photoView && (
        <PhotoLightbox src={photoView} name={detail?.full_name ?? ""} onClose={() => setPhotoView(null)} />
      )}
    </div>
  );
}
