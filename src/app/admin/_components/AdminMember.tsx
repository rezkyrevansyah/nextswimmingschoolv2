"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import QRBox from "@/components/ui/QRBox";
import DatePicker from "@/components/ui/DatePicker";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { fmtIDR, fmtDate } from "@/lib/utils";
import { memberDbToUi, memberStatusKind } from "@/lib/attendance";
import { logActivity } from "@/lib/activityLog";
import { calcAge, parseUserApiError } from "../_utils";
import type { ClassRow, ClassPackage, School } from "../_types";

// ── Private types (AdminMember only) ─────────────────────────────────────────

interface MemberRow {
  id: string; profile_id: string; type: string; status: string;
  date_start: string; qr_code: string | null; school_id: string | null;
  school_grade: string | null;
  member_no: string | null;
  remaining_sessions: number | null; total_sessions: number | null;
  suspend_until?: string | null; suspend_reason?: string | null;
  profile?: {
    full_name: string; birth_date: string | null; phone: string | null;
    gender: string | null; address: string | null; health_notes: string | null;
    email: string | null; avatar_url: string | null;
  } | null;
  member_classes?: { class: { id: string; name: string } | null }[];
}

interface ImportRow {
  nama_lengkap?: unknown;
  email?: unknown;
  password?: unknown;
  tipe_member?: unknown;
  tanggal_lahir?: unknown;
  jenis_kelamin?: unknown;
  no_hp?: unknown;
  alamat?: unknown;
  catatan_kesehatan?: unknown;
  jumlah_sesi?: unknown;
  harga_paket?: unknown;
  jadwal_hari?: unknown;
  jam_mulai?: unknown;
  jam_selesai?: unknown;
  coach_utama_hp?: unknown;
  coach_asisten_hp?: unknown;
  nama_kelas?: unknown;
  nama_sekolah?: unknown;
  kelas_sekolah?: unknown;
}

type ImportRowStatus = "ok" | "warn" | "error";

interface ValidatedRow {
  _rowNum: number;
  _status: ImportRowStatus;
  _errors: string[];
  _warnings: string[];
  // Normalised values
  full_name: string;
  email: string;
  password: string;
  member_type: "reguler" | "private" | "school_affiliate";
  birth_date?: string;
  gender?: string;
  phone?: string;
  address?: string;
  health_notes?: string;
  total_sessions?: number | null;
  class_id?: string | null;
  school_id?: string | null;
  school_grade?: string | null;
  // Private-only
  package_price?: number | null;
  schedule_days?: string[];
  time_start?: string;
  time_end?: string;
  head_coach_id?: string | null;
  assistant_coach_ids?: string[];
  // Display only
  nama_kelas_raw?: string;
  nama_sekolah_raw?: string;
}
// ── Helpers (AdminMember only) ───────────────────────────────────────────────

function parseImportDate(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, mo, y] = dmyMatch;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return undefined;
}

function normalizeGender(raw: unknown): "male" | "female" | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (["l", "laki", "laki-laki", "male", "m"].includes(s)) return "male";
  if (["p", "perempuan", "female", "f", "wanita"].includes(s)) return "female";
  return undefined;
}

function normalizeMemberType(raw: unknown): "reguler" | "private" | "school_affiliate" | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (["reguler", "regular"].includes(s)) return "reguler";
  if (["private"].includes(s)) return "private";
  if (["afiliasi_sekolah", "afiliasi", "school_affiliate", "sekolah"].includes(s)) return "school_affiliate";
  return undefined;
}

const IMPORT_DAY_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function normalizeDayName(raw: string): string | undefined {
  const s = raw.trim().toLowerCase();
  return IMPORT_DAY_OPTS.find(d => d.toLowerCase() === s);
}

function normalizeImportTime(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return undefined;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh > 23 || mm > 59) return undefined;
  return `${String(hh).padStart(2, "0")}:${m[2]}`;
}

export default function AdminMember({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const genderLabel = (g: string | null | undefined) => g === "male" ? t("admin.approvement.genderMale") : g === "female" ? t("admin.approvement.genderFemale") : null;
  const [tab, setTab] = useState("all");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", school_grade: "", email: "", password: "", jumlah_sesi: "" });
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [openAddSesi, setOpenAddSesi] = useState(false);
  const [addSesiForm, setAddSesiForm] = useState({ jumlah: "", generate_bill: false, selectedPackageId: "" });
  const [savingAddSesi, setSavingAddSesi] = useState(false);
  const [privateClassPackages, setPrivateClassPackages] = useState<ClassPackage[]>([]);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [coachesForImport, setCoachesForImport] = useState<{ id: string; phone: string | null }[]>([]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const db = createClient();
    const sel = "id, profile_id, type, status, date_start, qr_code, school_id, school_grade, member_no, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email, avatar_url), member_classes(class:classes(id, name))";
    let q = db.from("members").select(sel).eq("branch_id", branchId).order("created_at", { ascending: false });
    if (tab === "suspended") q = db.from("members").select(sel).eq("branch_id", branchId).eq("status", "suspended") as typeof q;
    else if (tab !== "all") q = q.eq("type", tab as "reguler" | "private" | "school_affiliate");
    const { data } = await q;
    if (data) setMembers(data as unknown as MemberRow[]);
    setLoading(false);
  }, [branchId, tab]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    supabase.from("classes").select("id, name, capacity, enrolled, status, branch_id, schedule_days, time_start, time_end, price_monthly, price_per_session, class_type").eq("branch_id", branchId).eq("status", "active")
      .then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
    supabase.from("schools").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setSchoolsList(data as School[]); });
    supabase.from("profiles").select("id, phone").eq("role", "coach").eq("branch_id", branchId)
      .then(({ data }) => { if (data) setCoachesForImport(data as { id: string; phone: string | null }[]); });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const findCoachByPhone = (phone: string) => coachesForImport.find(c => (c.phone ?? "").replace(/\D/g, "") === phone.replace(/\D/g, "") && phone.trim() !== "");

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
    if (!editMemberForm.full_name) return toast.error(t("admin.members.fullNameRequired2"));
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
        const [errT, errS, errD] = parseUserApiError(j, t);
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
    if (profileErr) { setSavingEdit(false); return toast.error(t("admin.members.updateProfileFailed"), profileErr.message); }

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
          const ok = await confirm({ body: t("admin.members.classFullConfirmBodyAdd", { name: cls.name, enrolled: cls.enrolled, capacity: cls.capacity }) });
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
    toast.success(t("admin.members.memberDataUpdatedToast"));
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

  const resetPassword = async () => {
    if (!detail) return;
    if (!newPwd || newPwd.length < 6) return toast.error(t("admin.schoolPanel.passwordMinLength"));
    const res = await fetch(`/api/admin/users/${detail.profile_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) { toast.success(t("admin.members.passwordResetToast2")); setOpenResetPwd(false); setNewPwd(""); setShowNewPwd(false); }
    else toast.error(t("admin.coaches.resetPasswordFailed"));
  };

  const [suspendMemberTarget, setSuspendMemberTarget] = useState<MemberRow | null>(null);
  const [suspendMemberForm, setSuspendMemberForm] = useState({ reason: "", until: "" });
  const [suspendingMember, setSuspendingMember] = useState(false);
  const [openEditMember, setOpenEditMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    full_name: "", email: "", birth_date: "", gender: "", phone: "", phone_owner: "self",
    parent_name: "", parent_phone: "", address: "", health_notes: "",
    type: "reguler", school_id: "", school_grade: "", class_ids: [] as string[], member_no: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [openResetPwd, setOpenResetPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [photoView, setPhotoView] = useState<string | null>(null);

  const [detailTab, setDetailTab] = useState<"info" | "absensi" | "pembayaran" | "lomba">("info");
  const [attendances, setAttendances] = useState<{ id: string; session_date: string; status: string; method: string; class: { name: string } | null }[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attLoaded, setAttLoaded] = useState(false);
  const [attClassFilter, setAttClassFilter] = useState("");
  const [bills, setBills] = useState<{ id: string; period_label: string; amount: number; discount: number; discount_reason: string | null; total: number; status: string; paid_at: string | null; payment_method: string | null }[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billsLoaded, setBillsLoaded] = useState(false);
  const [regProofUrl, setRegProofUrl] = useState<string | null>(null);
  const [memberComps, setMemberComps] = useState<any[]>([]);
  const [loadingMemberComps, setLoadingMemberComps] = useState(false);
  const [memberCompsLoaded, setMemberCompsLoaded] = useState(false);

  // Import Excel state
  const [openImport, setOpenImport] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "result">("upload");
  const [importRows, setImportRows] = useState<ValidatedRow[]>([]);
  const [importPage, setImportPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: { row: number; email: string; error: string }[]; classWarnings: { row: number; email: string; warning: string }[] } | null>(null);

  // Bulk QR download state
  const [qrSelectMode, setQrSelectMode] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Set<string>>(new Set());
  const [generatingQR, setGeneratingQR] = useState(false);

  // Filter, sort & pagination state
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterSessions, setFilterSessions] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const loadAttendances = async (memberId: string) => {
    setLoadingAtt(true);
    const { data } = await supabase
      .from("member_attendances")
      .select("id, session_date, status, method, class:classes(name)")
      .eq("member_id", memberId)
      .order("session_date", { ascending: false })
      .limit(100);
    setAttendances((data ?? []) as unknown as typeof attendances);
    setAttLoaded(true);
    setLoadingAtt(false);
  };

  const loadBills = async (memberId: string) => {
    setLoadingBills(true);
    const { data } = await supabase
      .from("bills")
      .select("id, period_label, amount, discount, discount_reason, total, status, paid_at, payment_method")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    setBills((data ?? []) as unknown as typeof bills);
    setBillsLoaded(true);
    setLoadingBills(false);
  };

  const loadRegProof = async (memberId: string) => {
    const { data } = await supabase
      .from("registrations")
      .select("proof_url")
      .eq("member_id", memberId)
      .eq("status", "approved")
      .maybeSingle();
    setRegProofUrl((data as { proof_url: string | null } | null)?.proof_url ?? null);
  };

  const validateImportRows = (raw: ImportRow[], classList: ClassRow[], schools: School[]): ValidatedRow[] => {
    return raw.map((r, i) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const full_name = String(r.nama_lengkap ?? "").trim();
      const email = String(r.email ?? "").trim();
      const password = String(r.password ?? "").trim();
      const memberTypeRaw = r.tipe_member;
      const member_type = normalizeMemberType(memberTypeRaw) ?? "reguler";
      const birth_date = parseImportDate(r.tanggal_lahir);
      const gender = normalizeGender(r.jenis_kelamin);
      const phone = r.no_hp ? String(r.no_hp).trim() : undefined;
      const address = r.alamat ? String(r.alamat).trim() : undefined;
      const health_notes = r.catatan_kesehatan ? String(r.catatan_kesehatan).trim() : undefined;
      const nama_kelas_raw = r.nama_kelas ? String(r.nama_kelas).trim() : "";
      const nama_sekolah_raw = r.nama_sekolah ? String(r.nama_sekolah).trim() : "";
      const kelas_sekolah_raw = r.kelas_sekolah ? String(r.kelas_sekolah).trim() : "";

      if (!full_name) errors.push(t("admin.members.fullNameRequired2"));
      if (!email) errors.push(t("admin.members.emailRequiredImport"));
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(t("admin.members.invalidEmailFormat"));
      if (!password) errors.push(t("admin.members.passwordRequiredImport"));
      else if (password.length < 6) errors.push(t("admin.schoolPanel.passwordMinLength"));
      if (memberTypeRaw && !normalizeMemberType(memberTypeRaw)) errors.push(t("admin.members.invalidMemberType", { value: String(memberTypeRaw) }));
      if (r.tanggal_lahir && !birth_date) errors.push(t("admin.members.invalidBirthDateFormat", { value: String(r.tanggal_lahir) }));
      if (r.jenis_kelamin && !gender) errors.push(t("admin.members.invalidGenderFormat", { value: String(r.jenis_kelamin) }));

      let class_id: string | null | undefined = undefined;
      if (member_type !== "private" && nama_kelas_raw) {
        const found = classList.find(c => c.name.trim().toLowerCase() === nama_kelas_raw.toLowerCase());
        if (found) {
          class_id = found.id;
        } else {
          warnings.push(t("admin.members.classNotFoundWarning", { name: nama_kelas_raw }));
          class_id = null;
        }
      }

      let school_id: string | null | undefined = undefined;
      if (member_type === "school_affiliate") {
        if (!nama_sekolah_raw) {
          errors.push(t("admin.members.schoolNameRequiredImport"));
        } else {
          const found = schools.find(s => s.name.trim().toLowerCase() === nama_sekolah_raw.toLowerCase());
          if (found) {
            school_id = found.id;
          } else {
            errors.push(t("admin.members.schoolNotFoundError", { name: nama_sekolah_raw }));
            school_id = null;
          }
        }
      }

      let total_sessions: number | null = null;
      let package_price: number | null = null;
      let schedule_days: string[] | undefined = undefined;
      let time_start: string | undefined = undefined;
      let time_end: string | undefined = undefined;
      let head_coach_id: string | null | undefined = undefined;
      let assistant_coach_ids: string[] | undefined = undefined;

      if (member_type === "private") {
        const sesiRaw = r.jumlah_sesi;
        total_sessions = sesiRaw != null && String(sesiRaw).trim() !== "" ? Math.round(Number(sesiRaw)) : null;
        if (total_sessions === null || isNaN(total_sessions)) errors.push(t("admin.members.sessionCountRequiredForPrivate"));

        const hargaRaw = r.harga_paket;
        package_price = hargaRaw != null && String(hargaRaw).trim() !== "" ? Math.round(Number(hargaRaw)) : null;

        const jadwalRaw = String(r.jadwal_hari ?? "").trim();
        if (!jadwalRaw) {
          errors.push(t("admin.members.scheduleDaysRequiredForPrivate"));
        } else {
          const tokens = jadwalRaw.split(",").map(d => d.trim()).filter(Boolean);
          const normalized = tokens.map(normalizeDayName);
          const invalidToken = tokens.find((_, idx) => !normalized[idx]);
          if (invalidToken) errors.push(t("admin.members.invalidScheduleDay", { value: invalidToken }));
          else schedule_days = normalized as string[];
        }

        time_start = normalizeImportTime(r.jam_mulai);
        if (!time_start) errors.push(t("admin.members.invalidStartTimeForPrivate", { value: String(r.jam_mulai ?? "") }));
        time_end = normalizeImportTime(r.jam_selesai);
        if (!time_end) errors.push(t("admin.members.invalidEndTimeForPrivate", { value: String(r.jam_selesai ?? "") }));

        const headPhone = r.coach_utama_hp ? String(r.coach_utama_hp).trim() : "";
        if (headPhone) {
          const found = findCoachByPhone(headPhone);
          if (found) head_coach_id = found.id;
          else { warnings.push(t("admin.members.coachNotFoundWarning", { value: headPhone })); head_coach_id = null; }
        }
        const assistantPhones = String(r.coach_asisten_hp ?? "").split(",").map(p => p.trim()).filter(Boolean);
        assistant_coach_ids = [];
        for (const p of assistantPhones) {
          const found = findCoachByPhone(p);
          if (found) assistant_coach_ids.push(found.id);
          else warnings.push(t("admin.members.coachNotFoundWarning", { value: p }));
        }
      }

      const status: ImportRowStatus = errors.length > 0 ? "error" : warnings.length > 0 ? "warn" : "ok";
      return {
        _rowNum: i + 2, _status: status, _errors: errors, _warnings: warnings,
        full_name, email, password, member_type, birth_date, gender, phone, address, health_notes,
        total_sessions, package_price, schedule_days, time_start, time_end, head_coach_id, assistant_coach_ids,
        class_id, school_id,
        school_grade: member_type === "school_affiliate" ? (kelas_sekolah_raw || null) : null,
        nama_kelas_raw, nama_sekolah_raw,
      };
    });
  };

  const handleExcelFile = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false, raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "", raw: true });
      if (raw.length === 0) { toast.error(t("admin.members.fileEmptyTitle"), t("admin.members.fileEmptyBody")); return; }
      if (raw.length > 200) { toast.error(t("admin.members.tooManyRowsTitle"), t("admin.members.tooManyRowsBody")); return; }
      const validated = validateImportRows(raw, classes, schoolsList);
      setImportRows(validated);
      setImportPage(0);
      setImportStep("preview");
    } catch {
      toast.error(t("admin.members.readFileFailedTitle"), t("admin.members.readFileFailedBody"));
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ["nama_lengkap", "email", "password", "tipe_member", "tanggal_lahir", "jenis_kelamin", "no_hp", "alamat", "catatan_kesehatan", "jumlah_sesi", "harga_paket", "jadwal_hari", "jam_mulai", "jam_selesai", "coach_utama_hp", "coach_asisten_hp", "nama_kelas", "nama_sekolah", "kelas_sekolah"];
    const exampleRegular = ["Budi Santoso", "budi@gmail.com", "aqua2024", "reguler", "15/06/2010", "L", "08123456789", "Jl. Merdeka No. 1", "", "", "", "", "", "", "", "", "Kelas A Pagi", "", ""];
    const examplePrivate = ["Siti Aminah", "siti@gmail.com", "aqua2024", "private", "10/03/2015", "P", "08129876543", "Jl. Melati No. 5", "", "8", "1500000", "Senin,Rabu", "07:00", "08:00", "08111222333", "", "", "", ""];
    const notes = [
      t("admin.coaches.fieldFullName2"), t("admin.members.emailUniqueNote"), t("admin.members.min6CharsNote"),
      "reguler / private / afiliasi_sekolah", t("admin.members.dateFormatsNote"), t("admin.members.lOrPNote"),
      t("admin.izin.optionalHint2"), t("admin.izin.optionalHint2"), t("admin.izin.optionalHint2"),
      t("admin.members.requiredIfPrivateNote"), t("admin.members.optionalPrivateBillNote"),
      t("admin.members.scheduleDaysNote"), t("admin.members.startTimeNote"), t("admin.members.endTimeNote"),
      t("admin.members.headCoachPhoneNote"), t("admin.members.assistantCoachPhoneNote"),
      t("admin.members.mustMatchClassNameExactly"), t("admin.members.mandatoryIfSchoolAffiliateNote"),
      t("admin.members.schoolGradeOptionalNote"),
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRegular, examplePrivate, notes]);
    ws["!cols"] = headers.map((_, i) => ({ wch: [20, 28, 14, 20, 16, 14, 16, 28, 24, 12, 12, 18, 12, 12, 16, 18, 20, 24, 18][i] }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Import");
    XLSX.writeFile(wb, "template-import-member.xlsx");
  };

  const runImport = async () => {
    const toImport = importRows.filter(r => r._status !== "error");
    if (toImport.length === 0) return;
    const ok = await confirm({ title: t("admin.members.importConfirmTitle"), body: t("admin.members.importConfirmBody", { count: toImport.length }) });
    if (!ok) return;

    const CHUNK = 10;
    const allFailed: { row: number; email: string; error: string }[] = [];
    const allClassWarnings: { row: number; email: string; warning: string }[] = [];
    let totalSuccess = 0;

    setImporting(true);
    setImportProgress({ done: 0, total: toImport.length });

    try {
      for (let i = 0; i < toImport.length; i += CHUNK) {
        const chunk = toImport.slice(i, i + CHUNK);
        const res = await fetch("/api/admin/import-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: branchId,
            rows: chunk.map(r => ({
              email: r.email, password: r.password, full_name: r.full_name,
              member_type: r.member_type, birth_date: r.birth_date, gender: r.gender,
              phone: r.phone, address: r.address, health_notes: r.health_notes,
              total_sessions: r.total_sessions, class_id: r.class_id,
              school_id: r.school_id ?? null,
              school_grade: r.school_grade ?? null,
              package_price: r.package_price ?? null,
              schedule_days: r.schedule_days ?? null,
              time_start: r.time_start ?? null,
              time_end: r.time_end ?? null,
              head_coach_id: r.head_coach_id ?? null,
              assistant_coach_ids: r.assistant_coach_ids ?? null,
            })),
          }),
        });
        const json = await res.json() as { success: number; failed: { row: number; email: string; error: string }[]; classWarnings?: { row: number; email: string; warning: string }[] };
        if (!res.ok) {
          toast.error(t("admin.members.importStoppedTitle"), (json as { error?: string }).error ?? t("admin.members.genericErrorOccurred"));
          break;
        }
        totalSuccess += json.success;
        allFailed.push(...json.failed);
        allClassWarnings.push(...(json.classWarnings ?? []));
        setImportProgress({ done: Math.min(i + CHUNK, toImport.length), total: toImport.length });
      }
    } catch {
      toast.error(t("admin.members.importFailedTitle"), t("admin.members.networkErrorOccurred"));
    }

    setImportResult({ success: totalSuccess, failed: allFailed, classWarnings: allClassWarnings });
    setImportStep("result");
    setImporting(false);
    setImportProgress(null);
    load();
  };

  const bulkDownloadQR = async (memberIds: string[]) => {
    if (memberIds.length === 0) return;
    setGeneratingQR(true);
    try {
      const QRCode = await import("qrcode");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const mid of memberIds) {
        const m = members.find(r => r.id === mid);
        if (!m) continue;
        const qrValue = m.qr_code ?? m.id;
        const name = (m.profile?.full_name ?? mid).replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-");
        const dataUrl: string = await QRCode.toDataURL(qrValue, {
          width: 400,
          margin: 2,
          color: { dark: "#0A2540", light: "#ffffff" },
        });
        // dataUrl = "data:image/png;base64,..."
        const base64 = dataUrl.split(",")[1];
        zip.file(`QR-${name}.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-Student-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setQrSelectMode(false);
      setSelectedQR(new Set());
      toast.success(t("admin.members.downloadCompleteToast"), t("admin.members.qrDownloadedSub", { count: memberIds.length }));
    } catch {
      toast.error(t("admin.members.generateQrFailedTitle"), t("admin.members.generateQrFailedBody"));
    }
    setGeneratingQR(false);
  };

  const doSuspendMember = async () => {
    if (!suspendMemberTarget || !suspendMemberForm.reason || !suspendMemberForm.until) return toast.error(t("admin.coaches.reasonUntilRequired"));
    setSuspendingMember(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("members")
      .update({ status: "suspended", suspend_until: suspendMemberForm.until, suspend_reason: suspendMemberForm.reason })
      .eq("id", suspendMemberTarget.id);
    setSuspendingMember(false);
    if (error) return toast.error(t("admin.members.suspendMemberFailed"), error.message);
    toast.success(t("admin.members.memberSuspendedToast", { name: suspendMemberTarget.profile?.full_name ?? "Student" }));
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "members", entityId: suspendMemberTarget.id, entityLabel: suspendMemberTarget.profile?.full_name ?? undefined, action: "suspend", label: t("admin.members.activityMemberSuspended", { name: suspendMemberTarget.profile?.full_name ?? suspendMemberTarget.id, date: suspendMemberForm.until }), meta: { reason: suspendMemberForm.reason, until: suspendMemberForm.until } });
    setSuspendMemberTarget(null);
    setDetail(null);
    load();
  };

  const deleteMember = async (m: MemberRow) => {
    const ok = await confirm({ body: t("admin.members.deleteMemberConfirmBody", { name: m.profile?.full_name ?? "" }), danger: true, confirmLabel: t("admin.members.deletePermanentlyBtnConfirm") });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${m.profile_id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      return toast.error(t("admin.members.deleteMemberFailed"), j.error);
    }
    toast.success(t("admin.members.memberAccountDeletedToast"));
    setDetail(null);
    load();
  };

  const liftSuspendMember = async (m: MemberRow) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("members")
      .update({ status: "active", suspend_until: null, suspend_reason: null })
      .eq("id", m.id);
    if (error) return toast.error(t("admin.coaches.endSuspendFailed"), error.message);
    toast.success(t("admin.coaches.suspendEndedToast"));
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "members", entityId: m.id, entityLabel: m.profile?.full_name ?? undefined, action: "unsuspend", label: t("admin.members.activityUnsuspended", { name: m.profile?.full_name ?? m.id }) });
    setDetail(null);
    load();
  };

  const doAddSesi = async () => {
    if (!detail) return;
    const jumlah = Number(addSesiForm.jumlah);
    if (!jumlah || jumlah < 1) return toast.error(t("admin.members.invalidSessionCount"));
    setSavingAddSesi(true);
    const db = createClient();
    const newTotal = (detail.total_sessions ?? 0) + jumlah;
    const newRemaining = (detail.remaining_sessions ?? 0) + jumlah;
    const { error } = await db.from("members")
      .update({ total_sessions: newTotal, remaining_sessions: newRemaining })
      .eq("id", detail.id);
    if (error) { setSavingAddSesi(false); return toast.error(t("admin.members.addSessionFailed"), error.message); }

    if (addSesiForm.generate_bill) {
      const selectedPkg = privateClassPackages.find(p => p.id === addSesiForm.selectedPackageId);
      if (selectedPkg) {
        // Use package price
        await db.from("bills").insert({
          member_id: detail.id, branch_id: branchId,
          class_id: detail.member_classes?.[0]?.class?.id ?? null,
          period_label: selectedPkg.name,
          type: "session_pack" as "monthly",
          sessions_total: selectedPkg.sessions,
          sessions_used: 0,
          amount: selectedPkg.price,
          discount: 0,
          total: selectedPkg.price,
          status: "unpaid",
        });
      } else {
        // Fallback: use price_per_session
        const cls = detail.member_classes?.[0]?.class;
        const classRow = cls ? classes.find(c => c.id === cls.id) : null;
        const pricePerSession = classRow?.price_per_session ?? 0;
        if (pricePerSession > 0) {
          await db.from("bills").insert({
            member_id: detail.id, branch_id: branchId,
            period_label: t("admin.members.fallbackBillPeriodLabel", { count: jumlah }),
            type: "session_pack" as "monthly",
            amount: pricePerSession * jumlah,
            discount: 0,
            total: pricePerSession * jumlah,
            status: "unpaid",
          });
        }
      }
    }

    setSavingAddSesi(false);
    toast.success(t("admin.members.sessionsAddedToast", { count: jumlah }));
    setOpenAddSesi(false);
    setAddSesiForm({ jumlah: "", generate_bill: false, selectedPackageId: "" });
    // Refresh detail
    const { data } = await db.from("members")
      .select("id, profile_id, type, status, date_start, qr_code, school_id, school_grade, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email, avatar_url), member_classes(class:classes(id, name))")
      .eq("id", detail.id).single();
    if (data) setDetail(data as unknown as MemberRow);
    load();
  };

  const loadMemberComps = async (memberId: string) => {
    setLoadingMemberComps(true);
    const { data } = await supabase
      .from("competition_participations")
      .select(`
        id, category, age_group, time_seconds, time_formatted, rank, award, custom_award_label, certificate_url, notes, created_at,
        competition:competitions(name, start_date, location, organizer)
      `)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    setMemberComps((data as any[]) ?? []);
    setLoadingMemberComps(false);
    setMemberCompsLoaded(true);
  };

  const stats = {
    all:     members.length,
    reguler: members.filter(m => m.type === "reguler").length,
    private: members.filter(m => m.type === "private").length,
    school:  members.filter(m => m.type === "school_affiliate").length,
  };

  const activeFilterCount = [filterGender, filterClass, filterSchool, filterSessions].filter(Boolean).length;

  const filteredSorted = useMemo(() => {
    // 1. Tab filter
    let result = tab === "suspended"
      ? members.filter(m => m.status === "suspended")
      : tab === "all" ? members : members.filter(m => m.type === tab);

    // 2. Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.profile?.full_name?.toLowerCase().includes(q) ||
        m.profile?.email?.toLowerCase().includes(q) ||
        (m.profile?.phone ?? "").includes(q)
      );
    }

    // 3. Filters
    if (filterGender)   result = result.filter(m => m.profile?.gender === filterGender);
    if (filterClass)    result = result.filter(m => m.member_classes?.some(mc => mc.class?.id === filterClass));
    if (filterSchool)   result = result.filter(m => m.school_id === filterSchool);
    if (filterSessions === "has")  result = result.filter(m => (m.remaining_sessions ?? 0) > 0);
    if (filterSessions === "low")  result = result.filter(m => m.remaining_sessions !== null && m.remaining_sessions <= 3);
    if (filterSessions === "none") result = result.filter(m => m.remaining_sessions !== null && m.remaining_sessions === 0);

    // 4. Sort
    if (sortBy !== "created_at") {
      result = [...result].sort((a, b) => {
        let va: string | number = "", vb: string | number = "";
        if (sortBy === "name")                { va = (a.profile?.full_name ?? "").toLowerCase(); vb = (b.profile?.full_name ?? "").toLowerCase(); }
        else if (sortBy === "date_start")     { va = a.date_start; vb = b.date_start; }
        else if (sortBy === "sessions")       { va = a.remaining_sessions ?? -1; vb = b.remaining_sessions ?? -1; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    } else if (sortDir === "asc") {
      result = [...result].reverse();
    }

    return result;
  }, [members, tab, search, filterGender, filterClass, filterSchool, filterSessions, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  // Clamp page to valid range (auto-resets to 0 when filter shrinks result set)
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filteredSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const resetFilters = () => { setSearch(""); setFilterGender(""); setFilterClass(""); setFilterSchool(""); setFilterSessions(""); };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{t("admin.members.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("admin.members.pageSub")}</p></div>
        <div className="flex flex-wrap gap-2">
          {qrSelectMode ? (
            <>
              <span className="self-center text-sm text-ink-mute font-medium">
                {selectedQR.size > 0 ? t("admin.members.selectedCountQr", { count: selectedQR.size }) : t("admin.members.selectMemberPrompt")}
              </span>
              <Btn variant="ghost" size="sm" onClick={() => { setQrSelectMode(false); setSelectedQR(new Set()); }}>{t("common.actions.cancel")}</Btn>
              <Btn variant="soft" size="sm" onClick={() => { setSelectedQR(new Set(filteredSorted.map(m => m.id))); }}>{t("admin.members.selectAllCountBtn", { count: filteredSorted.length })}</Btn>
              <Btn
                variant="primary"
                icon="download"
                size="sm"
                disabled={selectedQR.size === 0 || generatingQR}
                onClick={() => bulkDownloadQR(Array.from(selectedQR))}
              >
                {generatingQR ? t("admin.members.generatingBtn3") : t("admin.members.downloadQrCountBtn", { count: selectedQR.size })}
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" icon="download" size="sm" onClick={downloadTemplate}>{t("admin.members.downloadTemplateBtn")}</Btn>
              <Btn variant="soft" icon="upload" onClick={() => { setImportStep("upload"); setImportRows([]); setImportResult(null); setOpenImport(true); }}>{t("admin.members.importExcelBtn")}</Btn>
              <Btn variant="outline" icon="qr" size="sm" onClick={() => { setQrSelectMode(true); setSelectedQR(new Set()); }}>{t("admin.members.downloadQrBtn")}</Btn>
              <Btn variant="primary" icon="plus" onClick={() => { setForm({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", school_grade: "", email: "", password: "", jumlah_sesi: "" }); setOpenCreate(true); }}>{t("admin.members.addMemberBtn")}</Btn>
            </>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={t("admin.members.statTotalActive")}      value={stats.all}     icon="users"   tone="ocean" />
        <Stat label={t("admin.members.statRegular")}          value={stats.reguler} icon="grid"    tone="wave"  />
        <Stat label={t("admin.members.statPrivate")}          value={stats.private} icon="sparkle" tone="ocean" />
        <Stat label={t("admin.members.statSchoolAffiliate")}  value={stats.school}  icon="school"  tone="ocean" />
      </div>
      <Card padded={false}>
        {/* Search bar */}
        <div className="px-5 pt-4 pb-3 border-b border-line space-y-3">
          <div className="flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-500/10 transition">
            <Icon name="search" className="w-4 h-4 text-ink-faint shrink-0" />
            <input
              type="search"
              name="member_search"
              id="member_search_input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("admin.members.searchPlaceholder2")}
              className="flex-1 text-sm outline-none bg-transparent"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-ink-mute hover:text-ink transition">
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort + Filter toggle + Tab row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tabs */}
            <div className="flex gap-1 bg-paper-deep rounded-xl p-1 flex-wrap">
              {[["all", t("admin.members.tabAll")], ["reguler", t("admin.members.tabRegular")], ["private", t("admin.members.tabPrivate")], ["school_affiliate", t("admin.members.tabAffiliate")], ["suspended", t("admin.members.tabSuspended")]].map(([id, l]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Sort */}
              <select
                value={`${sortBy}:${sortDir}`}
                onChange={e => { const [col, dir] = e.target.value.split(":"); setSortBy(col); setSortDir(dir as "asc" | "desc"); }}
                className="text-xs font-semibold border border-line rounded-lg px-2.5 py-1.5 bg-white text-ink-soft outline-none cursor-pointer hover:border-ocean-400 transition"
              >
                <option value="created_at:desc">{t("admin.members.sortNewest")}</option>
                <option value="created_at:asc">{t("admin.members.sortOldest")}</option>
                <option value="name:asc">{t("admin.members.sortNameAZ")}</option>
                <option value="name:desc">{t("admin.members.sortNameZA")}</option>
                <option value="date_start:asc">{t("admin.members.sortJoinedOld")}</option>
                <option value="date_start:desc">{t("admin.members.sortJoinedNew")}</option>
                <option value="sessions:asc">{t("admin.members.sortSessionsAsc")}</option>
                <option value="sessions:desc">{t("admin.members.sortSessionsDesc")}</option>
              </select>

              {/* Filter toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
              >
                <Icon name="settings" className="w-3.5 h-3.5" />
                {t("admin.financial.filterBtn")}
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-paper-tint border border-line rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldGenderFilter")}</div>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                  <option value="">{t("admin.members.allOpt")}</option>
                  <option value="male">{t("admin.approvement.genderMale")}</option>
                  <option value="female">{t("admin.approvement.genderFemale")}</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldClassFilter2")}</div>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                  <option value="">{t("admin.members.allClassesOpt3")}</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {(tab === "all" || tab === "school_affiliate") && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldSchoolFilter")}</div>
                  <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">{t("admin.members.allSchoolsOpt")}</option>
                    {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {(tab === "all" || tab === "private") && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldSessionsFilter")}</div>
                  <select value={filterSessions} onChange={e => setFilterSessions(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                    <option value="">{t("admin.members.allOpt")}</option>
                    <option value="has">{t("admin.members.hasSessionsLeftOpt")}</option>
                    <option value="low">{t("admin.members.lowSessionsOpt")}</option>
                    <option value="none">{t("admin.members.noSessionsOpt")}</option>
                  </select>
                </div>
              )}
              {activeFilterCount > 0 && (
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
                  <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">{t("admin.members.resetAllFiltersBtn")}</button>
                </div>
              )}
            </div>
          )}

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterGender && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                  {genderLabel(filterGender)}
                  <button type="button" onClick={() => setFilterGender("")}><Icon name="x" className="w-3 h-3" /></button>
                </span>
              )}
              {filterClass && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                  {classes.find(c => c.id === filterClass)?.name ?? t("admin.members.classPillFallback")}
                  <button type="button" onClick={() => setFilterClass("")}><Icon name="x" className="w-3 h-3" /></button>
                </span>
              )}
              {filterSchool && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                  {schoolsList.find(s => s.id === filterSchool)?.name ?? t("admin.members.schoolPillFallback")}
                  <button type="button" onClick={() => setFilterSchool("")}><Icon name="x" className="w-3 h-3" /></button>
                </span>
              )}
              {filterSessions && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                  {filterSessions === "has" ? t("admin.members.hasSessionsPill") : filterSessions === "low" ? t("admin.members.lowSessionsPill") : t("admin.members.noSessionsPill")}
                  <button type="button" onClick={() => setFilterSessions("")}><Icon name="x" className="w-3 h-3" /></button>
                </span>
              )}
              <button type="button" onClick={resetFilters} className="text-xs text-ink-mute hover:text-danger-600 transition ml-1">{t("admin.members.clearAllBtn")}</button>
            </div>
          )}
        </div>

        {loading ? <div className="p-10 text-center text-ink-mute">{t("admin.members.loadingData2")}</div> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                    {qrSelectMode && <th className="w-10 py-3 pl-4">
                      <input
                        type="checkbox"
                        className="rounded border-line accent-ocean-600"
                        checked={filteredSorted.length > 0 && filteredSorted.every(m => selectedQR.has(m.id))}
                        onChange={e => setSelectedQR(e.target.checked ? new Set(filteredSorted.map(m => m.id)) : new Set())}
                      />
                    </th>}
                    <th
                      className="text-left py-3 px-5 font-bold cursor-pointer select-none group"
                      onClick={() => toggleSort("name")}
                    >
                      <span className="inline-flex items-center gap-1">
                        {t("admin.members.colMember2")}
                        <span className={`transition-opacity ${sortBy === "name" ? "opacity-100 text-ocean-600" : "opacity-0 group-hover:opacity-40"}`}>
                          {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th className="text-left py-3 font-bold hidden sm:table-cell">{t("admin.members.colType2")}</th>
                    <th className="text-left py-3 font-bold hidden md:table-cell">{t("admin.members.colClass2")}</th>
                    <th className="text-left py-3 font-bold">{t("admin.members.colStatus2")}</th>
                    {!qrSelectMode && <th className="px-5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.map((m) => {
                    const cls = m.member_classes?.map(mc => mc.class?.name).filter(Boolean).join(", ") ?? "—";
                    const fullName = m.profile?.full_name ?? "—";
                    const age = m.profile?.birth_date ? calcAge(m.profile.birth_date) : null;
                    const isChecked = selectedQR.has(m.id);
                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-paper-tint cursor-pointer ${qrSelectMode && isChecked ? "bg-ocean-50" : ""}`}
                        onClick={() => {
                          if (qrSelectMode) {
                            setSelectedQR(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; });
                          } else {
                            setDetail(m); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); setAttendances([]); setBills([]); setAttClassFilter(""); setRegProofUrl(null); loadRegProof(m.id);
                          }
                        }}
                      >
                        {qrSelectMode && (
                          <td className="pl-4" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-line accent-ocean-600" checked={isChecked}
                              onChange={() => setSelectedQR(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; })} />
                          </td>
                        )}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={fullName} src={m.profile?.avatar_url ?? undefined} size={38} />
                            <div className="min-w-0">
                              <div className="font-semibold text-ink truncate max-w-[120px] sm:max-w-none">{fullName}</div>
                              {age && <div className="text-xs text-ink-mute">{t("admin.approvement.yearsSuffix", { n: age })}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell"><Status kind={m.type === "private" ? "substitute" : m.type === "school_affiliate" ? "school_covered" : "active"} dot={false}>{m.type === "reguler" ? t("admin.members.typeRegularShort") : m.type === "private" ? t("admin.members.typePrivateShort") : t("admin.members.typeAffiliateShort")}</Status></td>
                        <td className="text-ink-soft text-xs hidden md:table-cell max-w-[150px] truncate">{cls}</td>
                        <td><Status kind={m.status === "suspended" ? "suspended" : "active"}>{m.status === "suspended" ? t("admin.members.statusSuspend2") : t("admin.members.statusActive2")}</Status></td>
                        {!qrSelectMode && <td className="px-5"><button className="text-ink-mute hover:text-ocean-600 p-1.5"><Icon name="eye" className="w-4 h-4" /></button></td>}
                      </tr>
                    );
                  })}
                  {filteredSorted.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-14 text-center">
                        <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                        <div className="text-sm font-semibold text-ink-mute">{t("admin.members.noMatchingMembers")}</div>
                        {(search || activeFilterCount > 0) && (
                          <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">{t("admin.members.clearFiltersBtn")}</button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-ink-mute tabular-nums">
                  {t("admin.members.memberCountPageLabel", { count: filteredSorted.length, page: safePage + 1, total: totalPages })}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={safePage === 0} onClick={() => setPage(0)} className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
                  <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">{t("admin.members.prevBtn")}</button>
                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                    .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                      if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(i);
                      return acc;
                    }, [])
                    .map((item, idx) => item === "…"
                      ? <span key={`e${idx}`} className="px-2 text-ink-faint text-sm">…</span>
                      : <button key={item} type="button" onClick={() => setPage(item as number)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${safePage === item ? "bg-ocean-600 text-white" : "border border-line text-ink-mute hover:bg-paper-tint"}`}>{(item as number) + 1}</button>
                    )
                  }
                  <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">{t("admin.members.nextBtn")}</button>
                  <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)} className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal open={!!detail} onClose={() => { setDetail(null); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); setRegProofUrl(null); }} title={detail?.profile?.full_name ?? ""} size="xl"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setDetail(null); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); setRegProofUrl(null); }}>{t("common.actions.close")}</Btn>
            <Btn variant="outline" icon="edit" onClick={() => detail && openEdit(detail)}>{t("admin.coaches.editDataBtn")}</Btn>
            <Btn variant="outline" icon="refresh" onClick={() => { setOpenResetPwd(true); setNewPwd(""); }}>{t("admin.coaches.resetPasswordBtn")}</Btn>
            {detail?.type === "private" && (
              <Btn variant="accent" icon="plus" onClick={async () => {
                setAddSesiForm({ jumlah: "", generate_bill: false, selectedPackageId: "" });
                // Load packages for this member's private class
                const classId = detail.member_classes?.[0]?.class?.id;
                if (classId) {
                  const db = createClient();
                  const { data: pkgs } = await db.from("class_packages").select("id, name, sessions, price, sort_order, active").eq("class_id", classId).eq("active", true).order("sort_order");
                  setPrivateClassPackages((pkgs ?? []) as ClassPackage[]);
                } else {
                  setPrivateClassPackages([]);
                }
                setOpenAddSesi(true);
              }}>{t("admin.members.addSessionBtn")}</Btn>
            )}
            {detail?.status !== "suspended"
              ? <Btn variant="ghost" className="text-warn-600" onClick={() => { setSuspendMemberTarget(detail); setSuspendMemberForm({ reason: "", until: "" }); }}>{t("admin.members.suspendBtn2")}</Btn>
              : <Btn variant="soft" size="sm" icon="check" onClick={() => detail && liftSuspendMember(detail)}>{t("admin.coaches.endSuspendBtn")}</Btn>
            }
            <Btn variant="ghost" className="text-danger-500" icon="trash" onClick={() => detail && deleteMember(detail)}>{t("admin.coaches.deletePermanentlyBtn")}</Btn>
          </>
        }>
        {detail && (() => {
          const p = detail.profile;
          const age = p?.birth_date ? calcAge(p.birth_date) : null;
          const memberClassNames = detail.member_classes?.map(mc => mc.class?.name).filter(Boolean) as string[] ?? [];
          const filteredAtt = attClassFilter ? attendances.filter(a => a.class?.name === attClassFilter) : attendances;
          return (
            <div className="grid md:grid-cols-3 gap-5">
              {/* Left: avatar + QR */}
              <div className="text-center">
                <div className="flex justify-center">
                  <button type="button" onClick={() => p?.avatar_url && setPhotoView(p.avatar_url)} className={p?.avatar_url ? "cursor-zoom-in" : "cursor-default"}>
                    <Avatar name={p?.full_name ?? ""} src={p?.avatar_url ?? undefined} size={96} />
                  </button>
                </div>
                <div className="font-display font-bold text-lg text-ink mt-3">{p?.full_name ?? "—"}</div>
                {age && <div className="text-xs text-ink-mute">{t("admin.members.yearsOldSuffix", { n: age })}</div>}
                <div className="mt-4 flex justify-center"><QRBox value={detail.qr_code ?? detail.id} size={120} /></div>
                <div className="text-[9px] text-ink-faint font-mono mt-1 break-all">{detail.qr_code ?? detail.id}</div>
                {p?.phone ? (
                  <a href={`https://wa.me/62${p.phone.replace(/^0/, "").replace(/\D/g, "")}?text=${encodeURIComponent(t("admin.members.waGreetingPrefix", { name: p.full_name }))}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                    <Btn variant="wa" size="sm" icon="whatsapp">{t("admin.members.contactMemberBtn")}</Btn>
                  </a>
                ) : (
                  <div className="mt-3 text-xs text-ink-faint">{t("admin.members.phoneNotAvailable")}</div>
                )}
              </div>

              {/* Right: tabbed detail */}
              <div className="md:col-span-2 space-y-4 text-sm">
                {/* Tab bar */}
                <div className="flex gap-1 bg-paper-tint rounded-xl p-1">
                  {([["info", t("admin.members.tabInfo")], ["absensi", t("admin.members.tabAttendance2")], ["pembayaran", t("admin.members.tabPayment2")], ["lomba", "Prestasi & Lomba"]] as const).map(([id, label]) => (
                    <button key={id} type="button"
                      onClick={() => {
                        setDetailTab(id);
                        if (id === "absensi" && !attLoaded) loadAttendances(detail.id);
                        if (id === "pembayaran" && !billsLoaded) loadBills(detail.id);
                        if (id === "lomba" && !memberCompsLoaded) loadMemberComps(detail.id);
                      }}
                      className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${detailTab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab: Info */}
                {detailTab === "info" && (
                  <>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowType2")}</div><div className="font-semibold text-ink capitalize">{detail.type === "reguler" ? t("admin.members.typeRegularFull") : detail.type === "private" ? t("admin.members.typePrivateFull") : t("admin.members.typeAffiliateFull")}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowSince")}</div><div className="font-semibold text-ink">{fmtDate(detail.date_start)}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowSessionsLeft")}</div><div className="font-semibold text-ink">{detail.remaining_sessions != null ? `${detail.remaining_sessions} / ${detail.total_sessions ?? "—"}` : "—"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.rowGender2")}</div><div className="font-semibold text-ink">{genderLabel(p?.gender) ?? "—"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.members.rowBirthDateFull")}</div><div className="font-semibold text-ink">{p?.birth_date ? fmtDate(p.birth_date) : "—"}</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.fieldEmail2")}</div><div className="font-semibold text-ink text-xs break-all">{p?.email ?? "—"}</div></div>
                    </div>
                    <div className="pt-3 border-t border-line grid grid-cols-2 gap-x-4 gap-y-3">
                      <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.approvement.rowPhone")}</div><div className="font-semibold text-ink font-mono text-xs">{p?.phone ?? "—"}</div></div>
                    </div>
                    {(p?.address || p?.health_notes) && (
                      <div className="pt-3 border-t border-line space-y-2">
                        {p?.address && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">{t("admin.coaches.rowAddress2")}</div><div className="text-ink-soft leading-snug">{p.address}</div></div>}
                        {p?.health_notes && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-0.5">{t("admin.approvement.rowHealthNotes")}</div><div className="text-ink-soft leading-snug">{p.health_notes}</div></div>}
                      </div>
                    )}
                    {detail.status === "suspended" && (
                      <div className="pt-3 border-t border-line bg-warn-50 rounded-xl px-3 py-2">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-warn-500">{t("admin.members.suspendUntilLabel")}</div>
                        <div className="font-semibold text-warn-700">{fmtDate(detail.suspend_until ?? "")}</div>
                        {detail.suspend_reason && <div className="text-xs text-warn-600 mt-0.5">{detail.suspend_reason}</div>}
                      </div>
                    )}
                    <div className="pt-3 border-t border-line">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{t("admin.members.classesJoinedLabel")}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.member_classes?.map((mc, i) => mc.class && <span key={i} className="px-2 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold">{mc.class.name}</span>)}
                        {(detail.member_classes?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">{t("admin.members.notAssignedToClass")}</span>}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-line">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{t("admin.members.initialPaymentProofLabel")}</div>
                      {regProofUrl ? (
                        <a href={regProofUrl} target="_blank" rel="noreferrer">
                          <Btn variant="outline" size="sm" icon="eye">{t("admin.members.viewTransferProofBtn")}</Btn>
                        </a>
                      ) : (
                        <span className="text-xs text-ink-faint">{t("admin.members.noProofAvailable")}</span>
                      )}
                    </div>
                  </>
                )}

                {/* Tab: Absensi */}
                {detailTab === "absensi" && (
                  <div className="space-y-3">
                    {memberClassNames.length > 1 && (
                      <Select value={attClassFilter} onChange={e => setAttClassFilter(e.target.value)} className="text-xs">
                        <option value="">{t("admin.members.allClassesLowerOpt")}</option>
                        {memberClassNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    )}
                    {loadingAtt ? (
                      <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.loadingEllipsis")}</div>
                    ) : filteredAtt.length === 0 ? (
                      <div className="py-8 text-center text-ink-mute text-sm">{t("admin.members.noAttendanceHistory")}</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                              <th className="text-left py-2 px-3 font-bold">{t("admin.absensi.colDate")}</th>
                              <th className="text-left py-2 font-bold">{t("admin.absensi.colClass")}</th>
                              <th className="text-left py-2 font-bold">{t("admin.absensi.colStatus")}</th>
                              <th className="text-left py-2 px-3 font-bold">{t("admin.absensi.colMethod")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {filteredAtt.map(a => (
                              <tr key={a.id} className="hover:bg-paper-tint">
                                <td className="py-2 px-3 font-mono whitespace-nowrap">{fmtDate(a.session_date)}</td>
                                <td className="py-2 text-ink-soft">{a.class?.name ?? "—"}</td>
                                <td className="py-2">
                                  {(() => {
                                    const ui = memberDbToUi(a.status);
                                    const label = ui === "present" ? t("admin.absensi.statusPresent")
                                      : ui === "late" ? t("admin.absensi.statusLate")
                                      : ui === "izin" ? t("admin.absensi.statusExcused")
                                      : ui === "sick" ? t("admin.absensi.statusSick")
                                      : t("admin.absensi.statusAbsent");
                                    return <Status kind={memberStatusKind(a.status)} dot={false}>{label}</Status>;
                                  })()}
                                </td>
                                <td className="py-2 px-3 text-ink-mute capitalize">{a.method === "manual" ? t("admin.absensi.methodManual") : a.method === "qr" ? t("admin.absensi.methodQr") : a.method ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Pembayaran */}
                {detailTab === "pembayaran" && (
                  <div className="space-y-3">
                    {loadingBills ? (
                      <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.loadingEllipsis")}</div>
                    ) : bills.length === 0 ? (
                      <div className="py-8 text-center text-ink-mute text-sm">{t("admin.members.noPaymentHistory")}</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                              <th className="text-left py-2 px-3 font-bold">{t("admin.financial.colPeriod")}</th>
                              <th className="text-right py-2 font-bold">{t("admin.members.colAmount")}</th>
                              <th className="text-right py-2 font-bold">{t("admin.members.colDiscount")}</th>
                              <th className="text-right py-2 font-bold">{t("admin.financial.colTotalCol")}</th>
                              <th className="text-left py-2 font-bold">{t("admin.financial.colStatusCol")}</th>
                              <th className="text-left py-2 px-3 font-bold">{t("admin.members.colPaidDate")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {bills.map(b => (
                              <tr key={b.id} className="hover:bg-paper-tint">
                                <td className="py-2 px-3 font-semibold text-ink">{b.period_label}</td>
                                <td className="py-2 text-right font-mono text-ink-soft">{fmtIDR(b.amount)}</td>
                                <td className="py-2 text-right">
                                  {b.discount > 0
                                    ? <span className="text-ok-600 font-mono" title={b.discount_reason ?? undefined}>-{fmtIDR(b.discount)}</span>
                                    : <span className="text-ink-faint">—</span>
                                  }
                                </td>
                                <td className="py-2 text-right font-mono font-bold text-ink">{fmtIDR(b.total)}</td>
                                <td className="py-2">
                                  {b.status === "paid"
                                    ? <Status kind="approved" dot={false}>{t("admin.pembayaran.statusPaid")}</Status>
                                    : b.status === "unpaid"
                                    ? <Status kind="rejected" dot={false}>{t("admin.pembayaran.statusUnpaid")}</Status>
                                    : b.status === "partial"
                                    ? <Status kind="pending" dot={false}>{t("admin.pembayaran.statusPartial")}</Status>
                                    : b.status === "free"
                                    ? <Status kind="archived" dot={false}>{t("admin.pembayaran.statusFree")}</Status>
                                    : <Status kind="school_covered" dot={false}>{t("admin.pembayaran.statusSchoolCovered")}</Status>
                                  }
                                </td>
                                <td className="py-2 px-3 text-ink-mute whitespace-nowrap">{b.paid_at ? fmtDate(b.paid_at) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {/* Tab: Prestasi & Lomba */}
                {detailTab === "lomba" && (
                  <div className="space-y-3">
                    {loadingMemberComps ? (
                      <div className="py-8 text-center text-ink-mute text-sm">Memuat riwayat perlombaan...</div>
                    ) : memberComps.length === 0 ? (
                      <div className="py-8 text-center text-ink-mute text-sm border border-dashed border-line rounded-xl">
                        Belum ada riwayat perlombaan tercatat untuk student ini.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {memberComps.map((item) => {
                          const compName = item.competition?.name || "Perlombaan";
                          const compDate = item.competition?.start_date ? fmtDate(item.competition.start_date) : "—";
                          const compLoc = item.competition?.location || item.competition?.city || "";
                          const medalBadge =
                            item.award === "gold" ? "🥇 Medali Emas" :
                            item.award === "silver" ? "🥈 Medali Perak" :
                            item.award === "bronze" ? "🥉 Medali Perunggu" :
                            item.award === "custom" && item.custom_award_label ? `🏆 ${item.custom_award_label}` :
                            item.rank ? `Juara ${item.rank}` : "🏊 Peserta";

                          return (
                            <div key={item.id} className="p-3 bg-paper-tint/70 rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div>
                                <div className="font-bold text-ink-strong text-sm">{compName}</div>
                                <div className="text-ink-mute mt-0.5">
                                  <span>{compDate}</span>
                                  {compLoc && <span> · {compLoc}</span>}
                                </div>
                                <div className="mt-1 font-semibold text-ocean-700">
                                  {item.category} {item.age_group ? `(${item.age_group})` : ""}
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 text-right">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-ocean-800 border border-line shadow-xs">
                                  {medalBadge}
                                </span>
                                {item.time_formatted && (
                                  <div className="font-mono font-bold text-ocean-700 text-xs">
                                    ⏱️ {item.time_formatted}
                                  </div>
                                )}
                                {item.certificate_url && (
                                  <button
                                    type="button"
                                    onClick={() => setPhotoView(item.certificate_url)}
                                    className="text-[11px] font-semibold text-ocean-600 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <Icon name="eye" className="w-3 h-3" /> Sertifikat
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit member modal */}
      <Modal open={openEditMember} onClose={() => setOpenEditMember(false)} title={t("admin.members.editMemberModalTitle", { name: detail?.profile?.full_name ?? "" })} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditMember(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveMemberEdit} disabled={savingEdit}>{savingEdit ? t("common.actions.saving") : t("admin.members.saveChangesBtn2")}</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Avatar picker */}
          <div className="sm:col-span-2 flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar
                name={editMemberForm.full_name || detail?.profile?.full_name || ""}
                src={editAvatarPreview ?? detail?.profile?.avatar_url ?? undefined}
                size={80}
                className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
              />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setEditAvatarFile(f);
                setEditAvatarPreview(f ? URL.createObjectURL(f) : null);
              }} />
            </label>
            <p className="text-xs text-ink-faint">{t("admin.coaches.clickToChangePhotoHint")}</p>
          </div>
          {/* Identitas */}
          <Field label={t("admin.coaches.fieldFullName2")} required><Input value={editMemberForm.full_name} onChange={e => setEditMemberForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label={t("admin.coaches.fieldEmail2")} hint={t("admin.members.emailLoginChangeHint")}><Input type="email" placeholder="nama@email.com" value={editMemberForm.email} onChange={e => setEditMemberForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label={t("admin.members.fieldMemberNo")} hint={t("admin.members.memberNoHint")}>
            <div className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-paper-tint text-sm font-mono text-ink-soft flex items-center">
              {editMemberForm.member_no || "—"}
            </div>
          </Field>
          <Field label={t("admin.members.rowBirthDateFull")}><DatePicker value={editMemberForm.birth_date} onChange={v => setEditMemberForm(f => ({ ...f, birth_date: v }))} /></Field>
          <Field label={t("admin.coaches.rowGender2")}>
            <Select value={editMemberForm.gender} onChange={e => setEditMemberForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">{t("admin.members.selectDashPlaceholder")}</option>
              <option value="male">{t("admin.approvement.genderMale")}</option>
              <option value="female">{t("admin.approvement.genderFemale")}</option>
            </Select>
          </Field>
          <Field label={t("admin.members.fieldMemberType")} required hint={detail?.type === "private" ? t("admin.members.privateManagedElsewhereHint") : t("admin.members.addPrivateElsewhereHint")}>
            {detail?.type === "private" ? (
              <Select value="private" disabled><option value="private">{t("admin.members.typePrivateFull")}</option></Select>
            ) : (
              <Select value={editMemberForm.type} onChange={e => setEditMemberForm(f => ({ ...f, type: e.target.value }))}>
                <option value="reguler">{t("admin.members.typeRegularFull")}</option>
                <option value="school_affiliate">{t("admin.members.typeAffiliateFull")}</option>
              </Select>
            )}
          </Field>
          {editMemberForm.type === "school_affiliate" && (
            <>
              <Field label={t("admin.members.fieldSchoolAffiliate")}>
                <Select value={editMemberForm.school_id} onChange={e => setEditMemberForm(f => ({ ...f, school_id: e.target.value }))}>
                  <option value="">{t("admin.members.selectSchoolPlaceholder")}</option>
                  {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label={t("admin.members.fieldSchoolGrade")} hint={t("admin.members.fieldSchoolGradeHint")}>
                <Input
                  value={editMemberForm.school_grade}
                  onChange={e => setEditMemberForm(f => ({ ...f, school_grade: e.target.value }))}
                  placeholder={t("admin.members.fieldSchoolGradePlaceholder")}
                />
              </Field>
            </>
          )}
          {/* Kontak */}
          <Field label={t("admin.members.fieldMemberPhone")}><Input type="tel" value={editMemberForm.phone} onChange={e => setEditMemberForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label={t("admin.members.fieldContactOwner")}>
            <Select value={editMemberForm.phone_owner} onChange={e => setEditMemberForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">{t("admin.members.ownedByMemberOpt")}</option>
              <option value="parent">{t("admin.members.ownedByParentOpt")}</option>
            </Select>
          </Field>
          {editMemberForm.phone_owner === "parent" && (
            <>
              <Field label={t("admin.members.fieldParentName2")}><Input value={editMemberForm.parent_name} onChange={e => setEditMemberForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
              <Field label={t("admin.members.fieldParentPhone2")}><Input type="tel" value={editMemberForm.parent_phone} onChange={e => setEditMemberForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
            </>
          )}
          <Field label={t("admin.coaches.fieldAddress2")} className="sm:col-span-2"><Textarea rows={2} value={editMemberForm.address} onChange={e => setEditMemberForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
          <Field label={t("admin.members.fieldHealthNotes3")} className="sm:col-span-2" hint={t("admin.members.healthNotesHint")}><Textarea rows={2} value={editMemberForm.health_notes} onChange={e => setEditMemberForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
          {/* Kelas — multi-select checkboxes */}
          <div className="sm:col-span-2">
            <div className="text-sm font-semibold text-ink mb-2">{t("admin.members.classesJoinedFieldLabel")}</div>
            {detail?.type === "private" ? (
              <div className="space-y-1.5">
                {(detail.member_classes ?? []).length === 0 ? (
                  <div className="text-sm text-ink-mute">{t("admin.coaches.noActiveClassesInBranch")}</div>
                ) : (
                  detail.member_classes!.map(mc => mc.class && (
                    <div key={mc.class.id} className="px-3 py-2.5 rounded-xl border border-line bg-paper-tint text-sm font-semibold text-ink">{mc.class.name}</div>
                  ))
                )}
                <p className="text-xs text-ink-mute">{t("admin.members.privateManagedElsewhereHint")}</p>
              </div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-ink-mute">{t("admin.coaches.noActiveClassesInBranch")}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {classes.map(cls => {
                  const checked = editMemberForm.class_ids.includes(cls.id);
                  return (
                    <button key={cls.id} type="button"
                      onClick={() => setEditMemberForm(f => ({ ...f, class_ids: checked ? f.class_ids.filter(id => id !== cls.id) : [...f.class_ids, cls.id] }))}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                        {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink truncate">{cls.name}</div>
                        <div className="text-xs text-ink-mute">{cls.enrolled}/{cls.capacity} · {cls.time_start?.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={openResetPwd} onClose={() => setOpenResetPwd(false)} title={t("admin.members.resetPasswordModalTitle2", { name: detail?.profile?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenResetPwd(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={resetPassword}>{t("admin.coaches.resetPasswordBtn")}</Btn></>}>
        <Field label={t("admin.coaches.fieldNewPassword")} hint={t("admin.coaches.minCharsHint")}>
          <div className="relative">
            <Input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" className="pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowNewPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
              <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </Modal>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title={t("admin.members.addMemberModalTitle")} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={createMember} disabled={saving}>{saving ? t("common.actions.saving") : t("admin.members.saveAndSendWaBtn")}</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Avatar picker */}
          <div className="sm:col-span-2 flex flex-col items-center gap-2">
            <label className="cursor-pointer group relative inline-block">
              <Avatar
                name={form.full_name || "?"}
                src={createAvatarPreview ?? undefined}
                size={80}
                className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
              />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
                <Icon name="camera" className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setCreateAvatarFile(f);
                setCreateAvatarPreview(f ? URL.createObjectURL(f) : null);
              }} />
            </label>
            <p className="text-xs text-ink-faint">{t("admin.coaches.profilePhotoOptionalHint")}</p>
          </div>
          <Field label={t("admin.coaches.fieldFullName2")} required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label={t("admin.members.rowBirthDateFull")}><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
          <Field label={t("admin.coaches.rowGender2")}>
            <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">{t("admin.members.selectDashPlaceholder")}</option>
              <option value="male">{t("admin.approvement.genderMale")}</option>
              <option value="female">{t("admin.approvement.genderFemale")}</option>
            </Select>
          </Field>
          <Field label={t("admin.members.fieldMemberType")} required hint={t("admin.members.addPrivateElsewhereHint")}>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="reguler">{t("admin.members.typeRegularFull")}</option><option value="school_affiliate">{t("admin.members.typeAffiliateFull")}</option>
            </Select>
          </Field>
          {form.type === "school_affiliate" && (
            <>
              <Field label={t("admin.members.fieldSchoolAffiliate")}>
                <Select value={form.school_id} onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
                  <option value="">{t("admin.members.selectSchoolPlaceholder")}</option>
                  {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label={t("admin.members.fieldSchoolGrade")} hint={t("admin.members.fieldSchoolGradeHint")}>
                <Input
                  value={form.school_grade}
                  onChange={e => setForm(f => ({ ...f, school_grade: e.target.value }))}
                  placeholder={t("admin.members.fieldSchoolGradePlaceholder")}
                />
              </Field>
            </>
          )}
          <Field label={t("admin.members.fieldAssignClass")} hint={form.type === "private" ? t("admin.members.privateClassesOnlyHint") : t("admin.members.regularClassesOnlyHint")}>
            <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">{t("admin.members.dashSelectClassPlaceholder")}</option>
              {classes.filter(c => c.class_type === form.type || (form.type === "school_affiliate" && c.class_type === "reguler")).map(c => <option key={c.id} value={c.id}>{c.name} ({c.enrolled}/{c.capacity})</option>)}
            </Select>
          </Field>
          {form.type === "private" && (
            <Field label={t("admin.members.fieldSessionCount2")} required hint={t("admin.members.pricePerSessionHintPrefix", { price: classes.find(c => c.id === form.class_id)?.price_per_session ? fmtIDR(classes.find(c => c.id === form.class_id)!.price_per_session!) : "—" })}>
              <Input type="number" min="1" value={form.jumlah_sesi} onChange={e => setForm(f => ({ ...f, jumlah_sesi: e.target.value }))} placeholder="Mis. 8" />
            </Field>
          )}
          <Field label={t("admin.members.fieldMemberPhone")}>
            <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label={t("admin.members.fieldContactOwner")}>
            <Select value={form.phone_owner} onChange={e => setForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">{t("admin.members.ownedByMemberOpt")}</option>
              <option value="parent">{t("admin.members.ownedByParentOpt")}</option>
            </Select>
          </Field>
          {form.phone_owner === "parent" && (
            <>
              <Field label={t("admin.members.fieldParentName2")}><Input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
              <Field label={t("admin.members.fieldParentPhone2")}><Input type="tel" value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
            </>
          )}
          <Field label={t("admin.coaches.fieldAddress2")} className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
          <Field label={t("admin.members.fieldHealthNotes3")} className="sm:col-span-2" hint={t("admin.members.healthNotesHint")}><Textarea rows={2} value={form.health_notes} onChange={e => setForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
          <Field label={t("admin.schoolPanel.loginEmailLabel")} required><Input type="email" autoComplete="off" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label={t("admin.members.fieldPassword")} required hint={t("admin.coaches.minCharsHint")}>
            <div className="relative">
              <Input type={showCreatePwd ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowCreatePwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showCreatePwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>

      {/* Suspend member modal */}
      <Modal open={!!suspendMemberTarget} onClose={() => setSuspendMemberTarget(null)} title={t("admin.members.suspendMemberModalTitle", { name: suspendMemberTarget?.profile?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendMemberTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspendMember} disabled={suspendingMember}>{suspendingMember ? t("common.actions.saving") : t("admin.coaches.applySuspendBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>{t("admin.members.suspendMemberNoticeText")}</span></div>
          </Card>
          <Field label={t("admin.coaches.fieldSuspendReason")} required>
            <Textarea rows={2} value={suspendMemberForm.reason} onChange={e => setSuspendMemberForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("admin.members.suspendReasonPlaceholder2")} />
          </Field>
          <Field label={t("admin.coaches.fieldSuspendUntil")} required hint={t("admin.members.suspendUntilHintMember")}>
            <Input type="date" value={suspendMemberForm.until} onChange={e => setSuspendMemberForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* Tambah Sesi modal */}
      <Modal open={openAddSesi} onClose={() => setOpenAddSesi(false)} title={t("admin.members.addSessionModalTitle", { name: detail?.profile?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAddSesi(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? t("common.actions.saving") : t("admin.members.addSessionBtn")}</Btn></>}>
        <div className="space-y-4">
          {privateClassPackages.length > 0 ? (
            <Field label={t("admin.pembayaran.fieldSelectPackage")} required hint={t("admin.members.packageAutoFillHint")}>
              <div className="space-y-2">
                {privateClassPackages.map(pkg => (
                  <button key={pkg.id} type="button" onClick={() => setAddSesiForm(f => ({ ...f, jumlah: String(pkg.sessions), selectedPackageId: pkg.id }))}
                    className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl border-2 text-sm transition ${addSesiForm.selectedPackageId === pkg.id ? "border-ocean-500 bg-ocean-50" : "border-line bg-white hover:border-ocean-300"}`}>
                    <span className="font-semibold text-ink">{pkg.name}</span>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono font-bold text-ocean-700">{fmtIDR(pkg.price)}</div>
                      <div className="text-xs text-ink-mute">{t("admin.pembayaran.sessionsUnit", { n: pkg.sessions })}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label={t("admin.members.fieldSessionsToAdd")} required>
              <Input type="number" min="1" value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} placeholder="Mis. 8" />
            </Field>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-ocean-50/50 border border-ocean-100">
            <div><div className="font-semibold text-ink text-sm">{t("admin.members.generateBillLabel")}</div><div className="text-xs text-ink-mute">{privateClassPackages.length > 0 ? t("admin.members.generateBillFromPackageHint") : t("admin.members.generateBillFromPriceHint")}</div></div>
            <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
          </div>
          {addSesiForm.generate_bill && (() => {
            const selectedPkg = privateClassPackages.find(p => p.id === addSesiForm.selectedPackageId);
            if (selectedPkg) {
              return (
                <div className="bg-paper-tint rounded-xl p-3 text-sm">
                  <div className="text-ink-mute">{t("admin.members.billToBeCreatedLabel")}</div>
                  <div className="font-bold text-ink mt-1">{fmtIDR(selectedPkg.price)}</div>
                  <div className="text-xs text-ink-mute">{selectedPkg.name} · {t("admin.pembayaran.sessionsUnit", { n: selectedPkg.sessions })}</div>
                </div>
              );
            }
            const classRow = classes.find(c => c.id === detail?.member_classes?.[0]?.class?.id);
            const pricePerSession = classRow?.price_per_session;
            const jumlah = Number(addSesiForm.jumlah) || 0;
            return pricePerSession ? (
              <div className="bg-paper-tint rounded-xl p-3 text-sm">
                <div className="text-ink-mute">{t("admin.members.billToBeCreatedLabel")}</div>
                <div className="font-bold text-ink mt-1">{fmtIDR(pricePerSession * jumlah)}</div>
                <div className="text-xs text-ink-mute">{jumlah} × {fmtIDR(pricePerSession)}</div>
              </div>
            ) : (
              <div className="text-xs text-warn-600">{t("admin.members.noPackageOrPriceSet")}</div>
            );
          })()}
        </div>
      </Modal>

      {photoView && (
        <PhotoLightbox src={photoView} name={detail?.profile?.full_name ?? ""} onClose={() => setPhotoView(null)} />
      )}

      {/* ── Import Excel Modal ─────────────────────────────────────────────── */}
      <Modal
        open={openImport}
        onClose={() => setOpenImport(false)}
        title={importStep === "upload" ? t("admin.members.importModalTitleUpload") : importStep === "preview" ? t("admin.members.importModalTitlePreview", { count: importRows.length }) : t("admin.members.importModalTitleResult")}
        size={importStep === "result" ? (importResult && (importResult.failed.length > 0 || importResult.classWarnings.length > 0) ? "lg" : "sm") : "xl"}
        footer={
          importStep === "upload" ? (
            <Btn variant="ghost" onClick={() => setOpenImport(false)}>{t("common.actions.close")}</Btn>
          ) : importStep === "preview" ? (
            importing && importProgress ? (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-ink-soft">{t("admin.members.importingMembersLabel")}</span>
                    <span className="text-xs font-bold text-ocean-600 tabular-nums">
                      {importProgress.done}/{importProgress.total} ({Math.round((importProgress.done / importProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ocean-500 transition-all duration-300"
                      style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Btn variant="ghost" onClick={() => setImportStep("upload")}>{t("admin.members.backBtn")}</Btn>
                <Btn
                  variant="primary"
                  icon="upload"
                  disabled={importRows.filter(r => r._status !== "error").length === 0}
                  onClick={runImport}
                >
                  {t("admin.members.importCountMembersBtn", { count: importRows.filter(r => r._status !== "error").length })}
                </Btn>
              </>
            )
          ) : (
            <>
              {importResult && importResult.failed.length > 0 && (
                <Btn variant="ghost" onClick={() => setImportStep("preview")}>{t("admin.members.viewPreviewDetailBtn")}</Btn>
              )}
              <Btn variant="primary" onClick={() => setOpenImport(false)}>{t("common.actions.close")}</Btn>
            </>
          )
        }
      >
        {/* Step: upload */}
        {importStep === "upload" && (
          <div className="space-y-5">
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-4 text-sm text-ocean-800 space-y-2">
              <div className="font-bold text-ocean-700 mb-1">{t("admin.members.columnsRequiredTitle")}</div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div><span className="font-mono font-bold">nama_lengkap</span> <span className="text-ocean-600">{t("admin.members.requiredBadge")}</span></div>
                <div><span className="font-mono font-bold">email</span> <span className="text-ocean-600">{t("admin.members.requiredBadge")}</span></div>
                <div><span className="font-mono font-bold">password</span> <span className="text-ocean-600">{t("admin.members.requiredMin6Badge")}</span></div>
                <div><span className="font-mono font-bold">tipe_member</span> <span className="text-ink-mute">— reguler / private / afiliasi_sekolah</span></div>
                <div><span className="font-mono font-bold">tanggal_lahir</span> <span className="text-ink-mute">— DD/MM/YYYY</span></div>
                <div><span className="font-mono font-bold">jenis_kelamin</span> <span className="text-ink-mute">{t("admin.members.genderColHint")}</span></div>
                <div><span className="font-mono font-bold">no_hp</span> <span className="text-ink-mute">{t("admin.members.optionalBadge")}</span></div>
                <div><span className="font-mono font-bold">jumlah_sesi</span> <span className="text-ink-mute">{t("admin.members.sessionCountColHint")}</span></div>
                <div><span className="font-mono font-bold">nama_kelas</span> <span className="text-ink-mute">{t("admin.members.classNameColHint")}</span></div>
                <div><span className="font-mono font-bold">nama_sekolah</span> <span className="text-ocean-600">{t("admin.members.schoolNameColHint")}</span></div>
              </div>
              <div className="text-xs text-ocean-700 pt-1 border-t border-ocean-100">{t("admin.members.privateImportColumnsNote")}</div>
            </div>
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-line rounded-2xl p-10 cursor-pointer hover:border-ocean-400 hover:bg-ocean-50/30 transition-colors">
              <Icon name="upload" className="w-10 h-10 text-ink-faint" />
              <div className="text-center">
                <div className="font-semibold text-ink">{t("admin.members.clickToChooseFile")}</div>
                <div className="text-sm text-ink-mute">{t("admin.members.fileTypesHint")}</div>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleExcelFile(f); e.target.value = ""; } }}
              />
            </label>
            <div className="text-center">
              <button type="button" onClick={downloadTemplate} className="text-sm text-ocean-600 hover:underline font-semibold">
                {t("admin.members.downloadExcelTemplateBtn")}
              </button>
            </div>
          </div>
        )}

        {/* Step: preview */}
        {importStep === "preview" && (() => {
          const okCount = importRows.filter(r => r._status === "ok").length;
          const warnCount = importRows.filter(r => r._status === "warn").length;
          const errCount = importRows.filter(r => r._status === "error").length;
          const pageSize = 50;
          const totalPages = Math.ceil(importRows.length / pageSize);
          const pageRows = importRows.slice(importPage * pageSize, (importPage + 1) * pageSize);
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-ok-50 text-ok-700 ring-1 ring-ok-200">{t("admin.members.okBadge", { count: okCount })}</span>
                {warnCount > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-warn-50 text-warn-700 ring-1 ring-warn-200">{t("admin.members.warningBadge", { count: warnCount })}</span>}
                {errCount > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-danger-50 text-danger-700 ring-1 ring-danger-200">{t("admin.members.errorSkippedBadge", { count: errCount })}</span>}
              </div>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-paper-tint border-b border-line text-left">
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-10">#</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colName3")}</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.coaches.colEmail")}</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colType2")}</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colClassImport")}</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colSchoolImport")}</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colStatusImport")}</th>
                      <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colNotesImport")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(r => (
                      <tr
                        key={r._rowNum}
                        className={r._status === "error" ? "bg-danger-50/40 border-b border-danger-100" : r._status === "warn" ? "bg-warn-50/40 border-b border-warn-100" : "border-b border-line"}
                      >
                        <td className="px-3 py-2 text-xs text-ink-mute">{r._rowNum}</td>
                        <td className="px-3 py-2 font-medium text-ink truncate max-w-[140px]">{r.full_name || <span className="text-ink-faint italic">—</span>}</td>
                        <td className="px-3 py-2 text-ink-soft truncate max-w-[160px]">{r.email || <span className="text-ink-faint italic">—</span>}</td>
                        <td className="px-3 py-2 text-xs capitalize">{r.member_type}</td>
                        <td className="px-3 py-2 text-xs text-ink-soft">{r.member_type === "private" ? (r.schedule_days?.length ? `${r.schedule_days.join(",")} ${r.time_start ?? ""}-${r.time_end ?? ""}` : "—") : (r.nama_kelas_raw || "—")}</td>
                        <td className="px-3 py-2 text-xs text-ink-soft">{r.nama_sekolah_raw || "—"}</td>
                        <td className="px-3 py-2">
                          {r._status === "ok" && <span className="text-xs font-bold text-ok-600">OK</span>}
                          {r._status === "warn" && <span className="text-xs font-bold text-warn-600">{t("admin.members.statusWarn")}</span>}
                          {r._status === "error" && <span className="text-xs font-bold text-danger-600">Error</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-ink-mute max-w-[200px]">
                          {[...r._errors, ...r._warnings].join("; ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => setImportPage(p => Math.max(0, p - 1))} disabled={importPage === 0} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute disabled:opacity-40">{t("admin.members.prevBtn")}</button>
                  <span className="text-ink-mute text-xs">{t("admin.rapor.pageOfLabel", { page: importPage + 1, total: totalPages })}</span>
                  <button type="button" onClick={() => setImportPage(p => Math.min(totalPages - 1, p + 1))} disabled={importPage === totalPages - 1} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute disabled:opacity-40">{t("admin.members.nextBtn")}</button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Step: result */}
        {importStep === "result" && importResult && (
          <div className="space-y-5 py-2">
            {importResult.failed.length === 0 && importResult.classWarnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-ok-50/70 border border-ok-200 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-ok-100 text-ok-600 flex items-center justify-center mb-3">
                  <Icon name="check" className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div className="text-4xl font-display font-extrabold text-ok-600">{importResult.success}</div>
                <div className="text-sm font-semibold text-ok-800 mt-1">{t("admin.members.membersCreatedSuccessfully")}</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-ok-50 border border-ok-200 p-4 text-center">
                    <div className="text-3xl font-display font-extrabold text-ok-600">{importResult.success}</div>
                    <div className="text-xs font-semibold text-ok-700 mt-1">{t("admin.members.membersCreatedSuccessfully")}</div>
                  </div>
                  <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 text-center">
                    <div className="text-3xl font-display font-extrabold text-danger-600">{importResult.failed.length}</div>
                    <div className="text-xs font-semibold text-danger-700 mt-1">{t("admin.members.failedToImport")}</div>
                  </div>
                </div>

                {importResult.failed.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-line max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-paper-tint border-b border-line text-left sticky top-0">
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-14">{t("admin.members.colRowImport")}</th>
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.coaches.colEmail")}</th>
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colReasonImport")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.failed.map(f => (
                          <tr key={f.row} className="border-b border-line">
                            <td className="px-3 py-2 text-xs text-ink-mute">{f.row}</td>
                            <td className="px-3 py-2 text-ink-soft">{f.email}</td>
                            <td className="px-3 py-2 text-xs text-danger-700">{f.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {importResult.classWarnings.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-warn-700">{t("admin.members.classFullWarningsTitle", { count: importResult.classWarnings.length })}</div>
                    <div className="overflow-x-auto rounded-xl border border-line max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-paper-tint border-b border-line text-left sticky top-0">
                            <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-14">{t("admin.members.colRowImport")}</th>
                            <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.coaches.colEmail")}</th>
                            <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colReasonImport")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.classWarnings.map(w => (
                            <tr key={w.row} className="border-b border-line">
                              <td className="px-3 py-2 text-xs text-ink-mute">{w.row}</td>
                              <td className="px-3 py-2 text-ink-soft">{w.email}</td>
                              <td className="px-3 py-2 text-xs text-warn-700">{w.warning}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}