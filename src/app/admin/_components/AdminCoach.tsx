"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
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

const MONTHS_LONG_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function fmtMonthYear(val: string | null | undefined): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${MONTHS_LONG_ID[parseInt(m[2]) - 1]} ${m[1]}`;
  return val;
}
function toDbDate(ym: string): string { return ym ? `${ym}-01` : ym; }
function fromDbDate(d: string | null | undefined): string { if (!d) return ""; return d.slice(0, 7); }

interface CoachFull extends CoachProfile {
  suspend_until?: string | null;
  suspend_reason?: string | null;
  is_archived?: boolean | null;
  class_coaches?: { class_id: string; class?: { id: string; name: string; branch_id: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null; branches?: { name: string; city: string | null } | null } | null }[];
  coach_branches?: { branch_id: string; branches?: { name: string; city: string | null } | null; is_primary: boolean; joined_at: string }[] | null;
}

const EMPTY_COACH_FORM = { full_name: "", nick_name: "", email: "", phone: "", password: "", gender: "", birth_date: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" };

export default function AdminCoach({ branchId }: { branchId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
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
  const [linkResult, setLinkResult] = useState<{ id: string; full_name: string } | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkCandidates, setLinkCandidates] = useState<{ id: string; full_name: string; phone: string | null; avatar_url: string | null; branches: { name: string; city: string | null }[] }[]>([]);
  const [linkLoadingCandidates, setLinkLoadingCandidates] = useState(false);

  // assign class
  const [openAssign, setOpenAssign] = useState(false);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null }[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    // Load coach_ids in this branch from junction table, then load profiles for those coaches
    const { data: cbData } = await createClient().from("coach_branches").select("coach_id").eq("branch_id", branchId);
    const coachIds = (cbData ?? []).map((r: { coach_id: string }) => r.coach_id);
    if (coachIds.length === 0) { setCoaches([]); setLoading(false); return; }
    const { data, error } = await createClient().from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, suspend_until, suspend_reason, is_archived, certifications!certifications_coach_id_fkey(id, name, title, status, valid_from, valid_until), class_coaches(class_id, class:classes(id, name, branch_id, time_start, time_end, schedule_days, branches(name, city))), coach_branches!coach_branches_coach_id_fkey(branch_id, branches(name, city), is_primary, joined_at)")
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
    if (!form.full_name || !form.email || !form.password) return toast.error("Nama, email, dan password wajib diisi");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "coach", branch_id: branchId }),
    });
    const json = await res.json() as { user_id?: string; error?: string; code?: string };
    if (!res.ok) { const [t, s, d] = parseUserApiError(json); toast.error(t, s, d); setSaving(false); return; }

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
    if (!editForm.full_name) return toast.error("Nama wajib diisi");
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
    if (error) { setEditSaving(false); return toast.error("Gagal menyimpan", error.message); }

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
    toast.success("Data coach diperbarui");
    setOpenEdit(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setDetail(prev => prev ? { ...prev, ...editForm } : prev);
    load();
  };

  const addCert = async () => {
    if (!detail) return toast.error("Data coach belum dimuat, coba refresh");
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
    if (error || !data) { setSavingCert(false); return toast.error("Gagal menambah sertifikasi", error?.message ?? "Data tidak tersimpan"); }
    if (certPhotoFile) {
      try { await upload.cert(certPhotoFile, data.id); } catch { /* non-fatal */ }
    }
    setSavingCert(false);
    toast.success("Sertifikasi ditambahkan");
    setOpenAddCert(false);
    setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
    setCertPhotoFile(null);
    setDetail(prev => prev ? { ...prev, certifications: [...(prev.certifications ?? []), data as { id: string; name: string; title: string | null; status: string; valid_from: string | null; valid_until: string | null }] } : prev);
  };

  const deleteCert = async (certId: string) => {
    if (!detail) return;
    const ok = await confirm({ body: "Hapus sertifikasi ini?" });
    if (!ok) return;
    const { error } = await createClient().from("certifications").delete().eq("id", certId);
    if (error) return toast.error("Gagal menghapus sertifikasi", error.message);
    toast.success("Sertifikasi dihapus");
    setDetail(prev => prev ? { ...prev, certifications: (prev.certifications ?? []).filter(c => c.id !== certId) } : prev);
  };

  const doSuspend = async () => {
    if (!suspendTarget || !suspendForm.reason || !suspendForm.until) return toast.error("Alasan dan tanggal berakhir wajib diisi");
    setSuspending(true);
    const { error } = await createClient().from("profiles").update({ suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", suspendTarget.id);
    setSuspending(false);
    if (error) return toast.error("Gagal suspend coach", error.message);
    toast.success(`${suspendTarget.full_name} di-suspend hingga ${fmtDate(suspendForm.until)}`);
    setSuspendTarget(null);
    if (detail?.id === suspendTarget.id) setDetail(prev => prev ? { ...prev, suspend_until: suspendForm.until, suspend_reason: suspendForm.reason } : prev);
    load();
  };

  const liftSuspend = async (c: CoachFull) => {
    const { error } = await createClient().from("profiles").update({ suspend_until: null, suspend_reason: null } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error("Gagal mengakhiri suspend", error.message);
    toast.success("Suspend diakhiri");
    if (detail?.id === c.id) setDetail(prev => prev ? { ...prev, suspend_until: null, suspend_reason: null } : prev);
    load();
  };

  const toggleArchive = async (c: CoachFull) => {
    const archiving = !c.is_archived;
    const ok = await confirm({ body: archiving ? `Arsipkan coach ${c.full_name}? Coach tidak akan muncul di daftar aktif.` : `Aktifkan kembali coach ${c.full_name}?` });
    if (!ok) return;
    const { error } = await createClient().from("profiles").update({ is_archived: archiving } satisfies Database["public"]["Tables"]["profiles"]["Update"]).eq("id", c.id);
    if (error) return toast.error("Gagal mengubah status", error.message);
    toast.success(archiving ? "Coach diarsipkan" : "Coach diaktifkan kembali");
    if (detail?.id === c.id) { setDetail(prev => prev ? { ...prev, is_archived: archiving } : prev); }
    load();
  };

  const deleteCoach = async (c: CoachFull) => {
    const ok = await confirm({ body: `Hapus permanen akun coach ${c.full_name}? Tindakan ini tidak bisa dibatalkan.`, danger: true, confirmLabel: "Hapus" });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      return toast.error("Gagal menghapus coach", j.error);
    }
    toast.success("Coach dihapus");
    setDetail(null);
    load();
  };

  const resetPassword = async () => {
    if (!detail || !newPassword || newPassword.length < 6) return toast.error("Password minimal 6 karakter");
    setResetSaving(true);
    const res = await fetch(`/api/admin/users/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const j = await res.json() as { error?: string };
    setResetSaving(false);
    if (!res.ok) return toast.error("Gagal reset password", j.error);
    toast.success("Password berhasil direset");
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
      const p = row.profile as { id: string; full_name: string; phone: string | null; avatar_url: string | null } | null;
      if (!p) continue;
      if (alreadyLinked.has(p.id)) continue; // skip coaches already in this branch
      if (!byCoach.has(p.id)) {
        byCoach.set(p.id, { id: p.id, full_name: p.full_name, phone: p.phone, avatar_url: p.avatar_url, branches: [] });
      }
      const br = row.branches as { name: string; city: string | null } | null;
      if (br) byCoach.get(p.id)!.branches.push(br);
    }
    const candidates = Array.from(byCoach.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setLinkCandidates(candidates);
    setLinkLoadingCandidates(false);
  };

  const linkCoachToBranch = async () => {
    if (!linkResult) return;
    setLinkSaving(true);
    const res = await fetch(`/api/admin/coaches/${linkResult.id}/branches`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch_id: branchId }),
    });
    const j = await res.json() as { error?: string; code?: string };
    setLinkSaving(false);
    if (!res.ok) {
      if (j.code === "ALREADY_LINKED") return toast.error("Coach sudah terdaftar di cabang ini");
      return toast.error("Gagal menghubungkan coach", j.error);
    }
    toast.success(`${linkResult.full_name} berhasil ditambahkan ke cabang ini`);
    setOpenLink(false);
    setLinkSearch("");
    setLinkResult(null);
    setLinkCandidates([]);
    load();
  };

  const openAssignModal = async (c: CoachFull) => {
    const { data } = await createClient().from("classes")
      .select("id, name, time_start, time_end, schedule_days").eq("branch_id", branchId).eq("status", "active").order("name");
    if (data) setAllClasses(data as unknown as typeof allClasses);
    setAssignedClassIds(c.class_coaches?.map(cc => cc.class_id) ?? []);
    setOpenAssign(true);
  };

  const saveAssign = async () => {
    if (!detail) return;
    setAssignSaving(true);
    const current = detail.class_coaches?.map(cc => cc.class_id) ?? [];
    const toAdd = assignedClassIds.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !assignedClassIds.includes(id));
    if (toAdd.length > 0) {
      await createClient().from("class_coaches").insert(toAdd.map(class_id => ({ class_id, coach_id: detail.id, role: "assistant" })));
    }
    if (toRemove.length > 0) {
      await createClient().from("class_coaches").delete().eq("coach_id", detail.id).in("class_id", toRemove);
    }
    setAssignSaving(false);
    toast.success("Kelas berhasil diperbarui");
    setOpenAssign(false);
    // Update detail state immediately so panel reflects new assignment
    setDetail(prev => prev ? {
      ...prev,
      class_coaches: assignedClassIds.map(class_id => ({
        class_id,
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
          <h2 className="font-display font-bold text-2xl">Manajemen Coach</h2>
          <p className="text-ink-mute text-sm mt-0.5">Coach cabang Anda.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {coaches.some(c => c.is_archived) && (
            <Btn variant="ghost" size="sm" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? "Sembunyikan Arsip" : `Tampilkan Arsip (${coaches.filter(c => c.is_archived).length})`}
            </Btn>
          )}
          <Btn variant="soft" icon="link" onClick={() => { setLinkSearch(""); setLinkResult(null); setOpenLink(true); loadLinkCandidates(); }}>Link Coach Existing</Btn>
          <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_COACH_FORM); setCreateAvatarFile(null); setCreateAvatarPreview(null); setOpenAdd(true); }}>Tambah Coach</Btn>
        </div>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">Memuat data…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">Coach</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">Email</th>
                  <th className="text-left py-3 font-bold">Status</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">No HP</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">Kelas</th>
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
                          {archived ? "Diarsipkan" : suspended ? "Suspend" : "Aktif"}
                        </Status>
                      </td>
                      <td className="text-sm text-ink-soft hidden md:table-cell">
                        {c.phone ?? <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="hidden md:table-cell">
                        {assignedClasses.length > 0
                          ? <span className="text-xs font-semibold bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full">{assignedClasses.length} kelas</span>
                          : <span className="text-xs text-ink-faint">—</span>}
                      </td>
                      <td className="px-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <Btn variant="ghost" size="sm" icon="eye" onClick={() => setDetail(c)}>Detail</Btn>
                          {!archived && c.phone && (
                            <a href={waLink(`Halo ${c.full_name}, saya dari admin Next Swimming School.`, c.phone)} target="_blank" rel="noreferrer">
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
                    {showArchived ? "Tidak ada coach diarsipkan." : "Belum ada coach di cabang ini."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-ink-mute tabular-nums">
              {visibleCoaches.length} coach · halaman {safePage + 1} dari {totalPages}
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
            title="Detail Coach"
            footer={
              !archived ? (
                <>
                  <Btn variant="outline" size="sm" icon="edit" onClick={() => { setEditForm({ full_name: detail.full_name, nick_name: detail.nick_name ?? "", gender: detail.gender ?? "", birth_date: detail.birth_date ?? "", phone: detail.phone ?? "", specialization: detail.specialization ?? "", bio: detail.bio ?? "", address: detail.address ?? "", education_level: detail.education_level ?? "", education_institution: detail.education_institution ?? "", bank_name: detail.bank_name ?? "", bank_account: detail.bank_account ?? "", bank_holder: detail.bank_holder ?? "" }); setEditAvatarFile(null); setEditAvatarPreview(null); setOpenEdit(true); }}>Edit Data</Btn>
                  <Btn variant="outline" size="sm" icon="lock" onClick={() => { setNewPassword(""); setOpenReset(true); }}>Reset Password</Btn>
                  {suspended
                    ? <Btn variant="soft" size="sm" icon="check" onClick={() => liftSuspend(detail)}>Akhiri Suspend</Btn>
                    : <Btn variant="ghost" size="sm" className="text-warn-600" onClick={() => { setSuspendTarget(detail); setSuspendForm({ reason: "", until: "" }); }}>Suspend Coach</Btn>
                  }
                  <Btn variant="ghost" size="sm" className="text-ink-mute" onClick={() => toggleArchive(detail)}>Arsipkan</Btn>
                </>
              ) : (
                <>
                  <Btn variant="soft" size="sm" icon="check" onClick={() => toggleArchive(detail)}>Aktifkan Kembali</Btn>
                  <Btn variant="ghost" size="sm" className="text-danger-600" onClick={() => deleteCoach(detail)}>Hapus Permanen</Btn>
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
                        {archived ? "Diarsipkan" : suspended ? "Suspend" : "Aktif"}
                      </Status>
                      {activeCerts.length > 0 && <span className="text-xs text-ok-700 bg-ok-50 px-2 py-0.5 rounded-full font-semibold">{activeCerts.length} Sertifikat</span>}
                    </div>
                  </div>
                </div>

                {/* Suspend banner */}
                {suspended && (
                  <div className="p-3 rounded-xl bg-warn-50 border border-warn-200 space-y-1">
                    <div className="flex items-center gap-2 text-warn-700 font-semibold text-sm"><Icon name="warning" className="w-4 h-4" />Sedang Disuspend</div>
                    {detail.suspend_until && <div className="text-xs text-warn-600">Berakhir: {fmtDate(detail.suspend_until)}</div>}
                    {detail.suspend_reason && <div className="text-xs text-warn-600">Alasan: {detail.suspend_reason}</div>}
                  </div>
                )}

                {/* Contact info */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kontak</div>
                  <div className="bg-paper-tint rounded-xl divide-y divide-line">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-ink-mute">Email</span>
                      <span className="text-sm font-mono text-ink">{detail.email}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-ink-mute">No HP / WA</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink">{detail.phone ?? "—"}</span>
                        {detail.phone && (
                          <a href={waLink(`Halo ${detail.full_name}, saya dari admin Next Swimming School.`, detail.phone)} target="_blank" rel="noreferrer" className="text-ok-600 hover:text-ok-700">
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
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Info Pribadi</div>
                    <div className="bg-paper-tint rounded-xl divide-y divide-line">
                      {detail.nick_name && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Nama panggilan</span><span className="text-sm text-ink">{detail.nick_name}</span></div>}
                      {detail.gender && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Jenis kelamin</span><span className="text-sm text-ink">{detail.gender === "male" ? "Laki-laki" : "Perempuan"}</span></div>}
                      {detail.birth_date && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Tgl lahir</span><span className="text-sm text-ink">{fmtDate(detail.birth_date)} ({calcAge(detail.birth_date)} thn)</span></div>}
                      {detail.education_level && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">Pendidikan</span><span className="text-sm text-ink">{detail.education_level}{detail.education_institution ? ` — ${detail.education_institution}` : ""}</span></div>}
                      {detail.address && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute shrink-0">Alamat</span><span className="text-sm text-ink text-right ml-4">{detail.address}</span></div>}
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
                        <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kelas yang Dihandle</div>
                        {!archived && <button onClick={() => openAssignModal(detail)} className="text-xs text-ocean-600 font-semibold hover:underline">Edit Assign</button>}
                      </div>
                      {allClasses.length === 0 ? (
                        <div className="p-3 rounded-xl bg-warn-50 border border-warn-100 text-xs text-warn-700 flex items-center gap-2">
                          <Icon name="warning" className="w-4 h-4 shrink-0" />Belum diassign ke kelas manapun
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
                                  {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-100 px-1.5 py-0.5 rounded ml-auto">Utama</span>}
                                  {isCurrentBranch && !cb.is_primary && <span className="text-[10px] font-bold text-wave-700 bg-wave-50 px-1.5 py-0.5 rounded ml-auto">Cabang ini</span>}
                                </div>
                                {classes.length === 0 ? (
                                  <div className="px-3 py-2.5 text-xs text-ink-faint italic">Tidak ada kelas di cabang ini</div>
                                ) : (
                                  <div className="divide-y divide-line">
                                    {classes.map(cc => (
                                      <div key={cc.class_id} className="flex items-center gap-3 px-3 py-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-ocean-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
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
                              <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
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
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Cabang Terdaftar</div>
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
                                {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-50 px-1.5 py-0.5 rounded">Utama</span>}
                                <span className="text-xs text-ink-faint">{classCount} kelas · Sejak {fmtDate(cb.joined_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* QR & ID */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">QR Coach</div>
                  <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-xl">
                    <QRBox size={80} />
                    <div>
                      <div className="text-xs text-ink-mute mb-1">ID Coach</div>
                      <div className="font-mono text-sm font-bold text-ink bg-white px-2 py-1 rounded border border-line">{detail.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {detail.bio && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Bio</div>
                    <p className="text-sm text-ink leading-relaxed">{detail.bio}</p>
                  </div>
                )}

                {/* Bank info */}
                {detail.bank_name && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Rekening</div>
                    <div className="px-4 py-3 bg-paper-tint rounded-xl text-sm">
                      <div className="font-semibold text-ink">{detail.bank_name}</div>
                      <div className="text-ink-mute">{detail.bank_account} · a/n {detail.bank_holder}</div>
                    </div>
                  </div>
                )}

                {/* Certifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Sertifikasi</div>
                    {!archived && (
                      <button onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false }); setCertPhotoFile(null); setOpenAddCert(true); }} className="text-xs text-ocean-600 font-semibold hover:underline">+ Tambah</button>
                    )}
                  </div>
                  {(detail.certifications?.length ?? 0) === 0 ? (
                    <div className="text-xs text-ink-mute italic">Belum ada sertifikasi.</div>
                  ) : (
                    <div className="space-y-2">
                      {detail.certifications!.map((ct) => (
                        <div key={ct.id} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                          <div>
                            <div className="font-semibold text-sm text-ink">{ct.title ?? ct.name}</div>
                            {ct.valid_from && <div className="text-xs text-ink-mute mt-0.5">{fmtMonthYear(ct.valid_from)}{ct.valid_until ? ` – ${fmtMonthYear(ct.valid_until)}` : " · Tidak kedaluwarsa"}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Status kind={ct.status === "approved" ? "active" : ct.status === "pending" ? "pending" : "inactive"}>
                              {ct.status === "approved" ? "Aktif" : ct.status === "pending" ? "Review" : "Ditolak"}
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
      <Modal open={openLink} onClose={() => { setOpenLink(false); setLinkSearch(""); setLinkResult(null); setLinkCandidates([]); }} title="Hubungkan Coach ke Cabang Ini" size="sm"
        footer={
          linkResult
            ? <><Btn variant="ghost" onClick={() => { setOpenLink(false); setLinkSearch(""); setLinkResult(null); setLinkCandidates([]); }}>Batal</Btn><Btn variant="primary" icon="link" onClick={linkCoachToBranch} disabled={linkSaving}>{linkSaving ? "Menghubungkan…" : "Hubungkan"}</Btn></>
            : <Btn variant="ghost" onClick={() => { setOpenLink(false); setLinkSearch(""); setLinkResult(null); setLinkCandidates([]); }}>Tutup</Btn>
        }>
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">Pilih coach yang sudah aktif di cabang lain. Coach akan bisa mengelola kelas di cabang ini dalam 1 akun yang sama.</p>
          {linkResult ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-ok-50 border border-ok-200">
              <Avatar name={linkResult.full_name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink text-sm">{linkResult.full_name}</div>
                <div className="text-xs text-ok-700">Siap dihubungkan ke cabang ini</div>
              </div>
              <button type="button" onClick={() => setLinkResult(null)} className="p-1 rounded hover:bg-ok-100 text-ok-600 transition-colors shrink-0">
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Input placeholder="Cari nama atau no HP…" value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoComplete="off" />
              {linkLoadingCandidates ? (
                <div className="py-6 text-center text-sm text-ink-mute">Memuat…</div>
              ) : linkCandidates.length === 0 ? (
                <div className="py-6 text-center text-sm text-ink-mute">Semua coach sudah terdaftar di cabang ini, atau belum ada coach lain di sistem.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
                  {linkCandidates
                    .filter(c => {
                      const q = linkSearch.trim().toLowerCase();
                      if (!q) return true;
                      return c.full_name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
                    })
                    .map(c => (
                      <button key={c.id} type="button" onClick={() => setLinkResult({ id: c.id, full_name: c.full_name })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line bg-paper-tint hover:bg-white hover:border-ocean-300 transition-colors text-left">
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
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* ── Add coach modal ── */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Coach" size="md"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={createCoach} disabled={saving}>{saving ? "Membuat…" : "Buat Akun"}</Btn></>}>
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
            <p className="text-xs text-ink-faint">Foto profil (opsional)</p>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Data Pribadi</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama lengkap" required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Mis. Reza Fahlevi" /></Field>
                <Field label="Nama panggilan" hint="Opsional"><Input value={form.nick_name} onChange={e => setForm(f => ({ ...f, nick_name: e.target.value }))} placeholder="Mis. Kak Reza" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Jenis kelamin">
                  <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Pilih…</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </Select>
                </Field>
                <Field label="Tanggal lahir" hint="Opsional"><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
              </div>
              <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
              <Field label="No HP / WA"><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
              <Field label="Alamat" hint="Opsional"><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Mis. Jl. Anggrek No. 12, Bekasi" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Pendidikan (Opsional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Pendidikan terakhir">
                <Select value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">Pilih…</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Nama instansi"><Input value={form.education_institution} onChange={e => setForm(f => ({ ...f, education_institution: e.target.value }))} placeholder="Mis. Universitas Indonesia" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Profil Pelatih</div>
            <div className="space-y-3">
              <Field label="Spesialisasi" hint="Opsional"><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Teknik renang anak" /></Field>
              <Field label="Bio / Deskripsi" hint="Opsional"><Textarea rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Mis. Berpengalaman 5 tahun melatih renang anak usia dini dengan pendekatan bermain." /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Informasi Rekening (Opsional)</div>
            <div className="space-y-3">
              <Field label="Nama bank"><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Mis. BCA, BRI, Mandiri" /></Field>
              <Field label="Nomor rekening"><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Mis. 1234567890" /></Field>
              <Field label="Atas nama"><Input value={form.bank_holder} onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Mis. Reza Fahlevi" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">Sertifikasi (Opsional)</div>
              <Btn variant="ghost" size="sm" icon="plus" onClick={() => setCreateCerts(cs => [...cs, { title: "", issuer: "", valid_from: "", valid_until: "", no_expiry: false }])}>Tambah</Btn>
            </div>
            {createCerts.map((c, i) => (
              <div key={i} className="relative border border-line rounded-xl p-3 mb-3 space-y-2">
                <button type="button" onClick={() => setCreateCerts(cs => cs.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors"><Icon name="x" className="w-4 h-4" /></button>
                <Input placeholder="Mis. Lifeguard Level 2" value={c.title} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <Input placeholder="Mis. PMI / PRSI" value={c.issuer} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-ink-mute mb-1 block">Berlaku dari</label><MonthYearPicker value={c.valid_from} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_from: v } : x))} /></div>
                  <div><label className="text-xs text-ink-mute mb-1 block">Berlaku sampai</label><MonthYearPicker value={c.valid_until} disabled={c.no_expiry} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_until: v } : x))} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                  <input type="checkbox" checked={c.no_expiry} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, no_expiry: e.target.checked, valid_until: "" } : x))} className="rounded" />
                  Tidak ada kedaluwarsa
                </label>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Akun</div>
            <Field label="Password awal" required>
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
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Edit Data Coach" size="md"
        footer={<><Btn variant="ghost" onClick={() => setOpenEdit(false)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
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
            <p className="text-xs text-ink-faint">Klik untuk ganti foto (opsional)</p>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Data Pribadi</div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama lengkap" required><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
                <Field label="Nama panggilan" hint="Opsional"><Input value={editForm.nick_name} onChange={e => setEditForm(f => ({ ...f, nick_name: e.target.value }))} placeholder="Mis. Kak Reza" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Jenis kelamin">
                  <Select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Pilih…</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </Select>
                </Field>
                <Field label="Tanggal lahir" hint="Opsional"><DatePicker value={editForm.birth_date} onChange={v => setEditForm(f => ({ ...f, birth_date: v }))} /></Field>
              </div>
              <Field label="No HP / WA"><Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
              <Field label="Alamat" hint="Opsional"><Textarea rows={2} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Mis. Jl. Anggrek No. 12, Bekasi" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Pendidikan (Opsional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Pendidikan terakhir">
                <Select value={editForm.education_level} onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">Pilih…</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Nama instansi"><Input value={editForm.education_institution} onChange={e => setEditForm(f => ({ ...f, education_institution: e.target.value }))} placeholder="Mis. Universitas Indonesia" /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Profil Pelatih</div>
            <div className="space-y-3">
              <Field label="Spesialisasi" hint="Opsional"><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Teknik renang anak" /></Field>
              <Field label="Bio / Deskripsi" hint="Opsional"><Textarea rows={2} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Mis. Berpengalaman 5 tahun melatih renang anak usia dini dengan pendekatan bermain." /></Field>
            </div>
          </div>

          <div className="pt-1 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Informasi Rekening (Opsional)</div>
            <div className="space-y-3">
              <Field label="Nama bank"><Input value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Mis. BCA, BRI, Mandiri" /></Field>
              <Field label="Nomor rekening"><Input value={editForm.bank_account} onChange={e => setEditForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Mis. 1234567890" /></Field>
              <Field label="Atas nama"><Input value={editForm.bank_holder} onChange={e => setEditForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Mis. Reza Fahlevi" /></Field>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Suspend coach modal ── */}
      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={`Suspend Coach — ${suspendTarget?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendTarget(null)}>Batal</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspend} disabled={suspending}>{suspending ? "Menyimpan…" : "Terapkan Suspend"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>Coach tetap bisa login tapi tidak bisa melakukan aktivitas (Clock In, input rapor, dll) selama masa suspend.</span></div>
          </Card>
          <Field label="Alasan suspend" required>
            <Textarea rows={2} value={suspendForm.reason} onChange={e => setSuspendForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Pelanggaran prosedur kehadiran." />
          </Field>
          <Field label="Suspend berakhir" required hint="Coach otomatis aktif kembali setelah tanggal ini">
            <Input type="date" value={suspendForm.until} onChange={e => setSuspendForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* ── Reset password modal ── */}
      <Modal open={openReset} onClose={() => setOpenReset(false)} title={`Reset Password — ${detail?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenReset(false)}>Batal</Btn><Btn variant="primary" onClick={resetPassword} disabled={resetSaving}>{resetSaving ? "Mereset…" : "Reset Password"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-ocean-50 border-ocean-100">
            <div className="text-xs text-ocean-700">Password baru langsung aktif tanpa konfirmasi email. Sampaikan password baru ke coach.</div>
          </Card>
          <Field label="Password baru" required hint="Minimal 6 karakter">
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
      <Modal open={openAssign} onClose={() => setOpenAssign(false)} title={`Assign Kelas — ${detail?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAssign(false)}>Batal</Btn><Btn variant="primary" onClick={saveAssign} disabled={assignSaving}>{assignSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-3">
          <p className="text-sm text-ink-mute">Pilih kelas yang akan dihandle oleh coach ini.</p>
          {allClasses.length === 0 ? (
            <div className="text-sm text-ink-mute py-4 text-center">Belum ada kelas aktif di cabang ini.</div>
          ) : (
            <div className="space-y-2">
              {allClasses.map(cls => {
                const checked = assignedClassIds.includes(cls.id);
                return (
                  <button key={cls.id} onClick={() => setAssignedClassIds(ids => checked ? ids.filter(id => id !== cls.id) : [...ids, cls.id])}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                      {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink">{cls.name}</div>
                      {cls.schedule_days && <div className="text-xs text-ink-mute">{cls.schedule_days.join(", ")}{cls.time_start ? ` · ${cls.time_start.slice(0,5)}${cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}` : ""}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Coach credential popup ── */}
      <Modal open={!!coachCredential} onClose={() => setCoachCredential(null)} title="Akun Coach Dibuat" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setCoachCredential(null)}>Tutup</Btn>{coachCredential?.phone && <Btn variant="wa" icon="whatsapp" onClick={() => { const num = coachCredential.phone!.replace(/^0/, "").replace(/\D/g, ""); const msg = encodeURIComponent(`Halo ${coachCredential.full_name}, akun coach Anda telah dibuat.\n\nEmail: ${coachCredential.email}\nPassword: ${coachCredential.password}\n\nSilakan login di aplikasi Next Swimming School.`); window.open(`https://wa.me/62${num}?text=${msg}`, "_blank"); }}>Kirim via WA</Btn>}</>}>
        <div className="space-y-3">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-center gap-2 text-ok-700 font-semibold text-sm"><Icon name="check" className="w-4 h-4" />Akun berhasil dibuat</div>
          </Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">Nama</span>
              <span className="font-semibold text-sm">{coachCredential?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">Email</span>
              <span className="font-mono text-sm">{coachCredential?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">Password</span>
              <span className="font-mono text-sm bg-paper-deep px-2 py-0.5 rounded">{coachCredential?.password}</span>
            </div>
          </div>
          <p className="text-xs text-ink-mute">Simpan atau kirim kredensial ini ke coach. Password tidak bisa dilihat lagi setelah modal ini ditutup.</p>
        </div>
      </Modal>

      {/* ── Add certification modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setCertPhotoFile(null); }} title={`Tambah Sertifikasi — ${detail?.full_name ?? ""}`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setCertPhotoFile(null); }}>Batal</Btn><Btn variant="primary" onClick={addCert} disabled={savingCert}>{savingCert ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sertifikasi"><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder="Mis. Renang Gaya Bebas Tingkat Lanjut" /></Field>
          <Field label="Lembaga penerbit"><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Mis. PRSI, FINA" /></Field>
          <Field label="Berlaku dari"><MonthYearPicker value={certForm.issued_at} onChange={v => setCertForm(f => ({ ...f, issued_at: v }))} placeholder="Pilih bulan & tahun" /></Field>
          <Field label="Berlaku sampai"><MonthYearPicker value={certForm.expires_at} onChange={v => setCertForm(f => ({ ...f, expires_at: v }))} placeholder="Pilih bulan & tahun" disabled={certForm.no_expiry} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, no_expiry: e.target.checked, expires_at: "" }))} className="rounded" />
            Tidak ada kedaluwarsa
          </label>
          <div>
            <div className="text-sm font-semibold text-ink mb-1.5">Foto sertifikat <span className="text-ink-faint font-normal text-xs">(opsional, bantu proses verifikasi)</span></div>
            {certPhotoFile && (
              <img src={URL.createObjectURL(certPhotoFile)} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => certPhotoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper-tint hover:bg-white hover:border-ocean-400 transition-colors text-sm font-semibold text-ink-soft hover:text-ink">
                <Icon name="camera" className="w-4 h-4" />
                {certPhotoFile ? "Ganti foto" : "Pilih foto"}
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
