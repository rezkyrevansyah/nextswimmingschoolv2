"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useUpload } from "@/hooks/useUpload";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import type { Database } from "@/types/database";
import { calcAge, parseUserApiError } from "../_utils";
import { logActivity } from "@/lib/activityLog";
import { fmtDate, fmtDateLong, waLink } from "@/lib/utils";

const MONTHS_LONG_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function fmtMonthYear(val: string | null | undefined): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${MONTHS_LONG_ID[parseInt(m[2]) - 1]} ${m[1]}`;
  return val;
}

interface RegistrationRow {
  id: string; full_name: string; email: string | null; birth_date: string | null; gender: string | null;
  phone: string | null; phone_owner: string | null; parent_name: string | null;
  parent_phone: string | null; address: string | null; health_notes: string | null;
  status: string; created_at: string; branch_id?: string | null;
}

interface CertRow {
  id: string; name: string; title: string | null; issuer: string | null; valid_from: string | null;
  valid_until: string | null; no_expiry: boolean; photo_url: string | null; status: string;
  profile?: { full_name: string } | null;
}

const PAGE_SIZE = 10;

// ── Pagination helpers ──────────────────────────────────────────────────────
function paginate(total: number, current: number, onChange: (p: number) => void) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safe = Math.min(current, totalPages - 1);
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (safe > 2) pages.push("…");
    for (let i = Math.max(1, safe - 1); i <= Math.min(totalPages - 2, safe + 1); i++) pages.push(i);
    if (safe < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
  }
  return { totalPages, safe, pages };
}

export default function AdminApprovement({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const upload = useUpload();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"reg" | "cert">("reg");
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(0);

  // ── Modals: Registrasi ────────────────────────────────────────────────────
  const [detailReg, setDetailReg] = useState<RegistrationRow | null>(null);
  const [editReg, setEditReg] = useState<RegistrationRow | null>(null);
  const [editRegForm, setEditRegForm] = useState<Partial<RegistrationRow>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [approveTarget, setApproveTarget] = useState<RegistrationRow | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [rejectRegTarget, setRejectRegTarget] = useState<RegistrationRow | null>(null);
  const [regRejectReason, setRegRejectReason] = useState("");
  const [rejectingReg, setRejectingReg] = useState(false);

  // ── Modals: Sertifikasi ───────────────────────────────────────────────────
  const [detailCert, setDetailCert] = useState<CertRow | null>(null);
  const detailCertPhotoUrl = useSignedUrl(detailCert?.photo_url);
  const [rejectCertTarget, setRejectCertTarget] = useState<CertRow | null>(null);
  const [certRejectReason, setCertRejectReason] = useState("");
  const [rejectingCert, setRejectingCert] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      supabase.from("registrations")
        .select("id, full_name, email, birth_date, gender, phone, phone_owner, parent_name, parent_phone, address, health_notes, status, created_at")
        .eq("branch_id", branchId).eq("status", "pending").order("created_at")
        .then(({ data }) => { if (data) setRegistrations(data as RegistrationRow[]); }),
      supabase.from("certifications")
        .select("id, name, title, issuer, valid_from, valid_until, no_expiry, photo_url, status, profile:profiles!certifications_coach_id_fkey(full_name, branch_id)")
        .eq("status", "pending")
        .then(({ data }) => {
          if (data) {
            const filtered = (data as unknown as (CertRow & { profile: { full_name: string; branch_id: string | null } | null })[])
              .filter(c => c.profile?.branch_id === branchId);
            setCerts(filtered as unknown as CertRow[]);
          }
        }),
    ]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [tab, search, genderFilter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Filtered / paged data ─────────────────────────────────────────────────
  const filteredRegs = useMemo(() => {
    const q = search.toLowerCase();
    return registrations.filter(r =>
      (!q || r.full_name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q) || (r.phone ?? "").includes(q)) &&
      (!genderFilter || r.gender === genderFilter)
    );
  }, [registrations, search, genderFilter]);

  const filteredCerts = useMemo(() => {
    const q = search.toLowerCase();
    return certs.filter(c =>
      !q ||
      (c.title ?? c.name).toLowerCase().includes(q) ||
      (c.profile?.full_name ?? "").toLowerCase().includes(q) ||
      (c.issuer ?? "").toLowerCase().includes(q)
    );
  }, [certs, search]);

  const activeList = tab === "reg" ? filteredRegs : filteredCerts;
  const { totalPages, safe: safePage, pages: pageNums } = paginate(activeList.length, page, setPage);
  const pagedRegs = filteredRegs.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const pagedCerts = filteredCerts.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // ── Actions: Registrasi ───────────────────────────────────────────────────
  const openEditReg = (r: RegistrationRow) => {
    setEditReg(r);
    setEditRegForm({ full_name: r.full_name, email: r.email, birth_date: r.birth_date, gender: r.gender, phone: r.phone, phone_owner: r.phone_owner, parent_name: r.parent_name, parent_phone: r.parent_phone, address: r.address, health_notes: r.health_notes });
  };

  const saveEditReg = async () => {
    if (!editReg) return;
    setSavingEdit(true);
    const { error } = await supabase.from("registrations").update({
      full_name: editRegForm.full_name ?? editReg.full_name,
      email: editRegForm.email ?? null,
      birth_date: editRegForm.birth_date ?? null,
      gender: editRegForm.gender ?? null,
      phone: editRegForm.phone ?? null,
      phone_owner: editRegForm.phone_owner ?? null,
      parent_name: editRegForm.parent_name ?? null,
      parent_phone: editRegForm.parent_phone ?? null,
      address: editRegForm.address ?? null,
      health_notes: editRegForm.health_notes ?? null,
    }).eq("id", editReg.id);
    setSavingEdit(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Data registrasi diperbarui");
    setEditReg(null);
    load();
  };

  const deleteReg = async (r: RegistrationRow) => {
    const ok = await confirm({ title: `Hapus registrasi "${r.full_name}"?`, body: "Tindakan tidak bisa dibatalkan.", confirmLabel: "Hapus" });
    if (!ok) return;
    await supabase.from("registrations").delete().eq("id", r.id);
    setDetailReg(null);
    toast.success("Registrasi dihapus");
    load();
  };

  const openApproveReg = (r: RegistrationRow) => { setApproveTarget(r); setProofFile(null); };
  const rejectReg = (r: RegistrationRow) => { setRejectRegTarget(r); setRegRejectReason(""); };

  const confirmRejectReg = async () => {
    if (!rejectRegTarget) return;
    if (!regRejectReason.trim()) return toast.error("Alasan penolakan wajib diisi");
    setRejectingReg(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("registrations").update({ status: "rejected", reject_reason: regRejectReason.trim(), reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", rejectRegTarget.id);
    setRejectingReg(false);
    toast.success("Pendaftaran ditolak");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "registrations", entityId: rejectRegTarget.id, entityLabel: rejectRegTarget.full_name, action: "reject", label: `Registrasi ${rejectRegTarget.full_name} ditolak — ${regRejectReason.trim()}`, meta: { reason: regRejectReason.trim() } });
    setRejectRegTarget(null);
    setDetailReg(null);
    load();
  };

  const confirmApproveReg = async () => {
    const r = approveTarget;
    if (!r) return;
    setApprovingId(r.id);
    let proofUrl: string | null = null;
    if (proofFile) proofUrl = await upload.upload.paymentProof(proofFile, r.id);
    const memberEmail = r.email?.trim();
    if (!memberEmail) {
      toast.error("Email belum diisi di data registrasi", "Edit registrasi terlebih dahulu untuk mengisi email.");
      setApprovingId(null);
      return;
    }
    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail, password: tempPassword, full_name: r.full_name, role: "member", branch_id: branchId, phone: r.phone, birth_date: r.birth_date || null, gender: r.gender || null, address: r.address || null, health_notes: r.health_notes || null, member_type: "reguler", school_id: null, class_id: null, total_sessions: null, proof_url: proofUrl }),
    });
    const json = await res.json() as { user_id?: string; member_id?: string; error?: string; code?: string };
    if (!res.ok) {
      const [t, s, d] = parseUserApiError(json);
      toast.error(t, s, d);
      setApprovingId(null);
      return;
    }
    const user = (await supabase.auth.getUser()).data.user;
    const upd: Database["public"]["Tables"]["registrations"]["Update"] = { status: "approved", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), proof_url: proofUrl ?? undefined, member_id: json.member_id ?? undefined };
    await supabase.from("registrations").update(upd).eq("id", r.id);
    toast.success("Pendaftaran diapprove", "Member masuk ke menu Member — lengkapi data & kirim credential.");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "registrations", entityId: r.id, entityLabel: r.full_name, action: "approve", label: `Registrasi ${r.full_name} (${r.email}) disetujui` });
    setApprovingId(null);
    setApproveTarget(null);
    setDetailReg(null);
    load();
  };

  // ── Actions: Sertifikasi ──────────────────────────────────────────────────
  const approveCert = async (id: string) => {
    const cert = certs.find(c => c.id === id);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("certifications").update({ status: "approved", reject_reason: null }).eq("id", id);
    toast.success("Sertifikasi diverifikasi");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "certifications", entityId: id, entityLabel: cert?.profile?.full_name ?? undefined, action: "approve", label: `Sertifikasi '${cert?.title ?? cert?.name ?? id}' coach ${cert?.profile?.full_name ?? "coach"} disetujui` });
    load();
  };

  const confirmRejectCert = async () => {
    if (!rejectCertTarget) return;
    if (!certRejectReason.trim()) return toast.error("Alasan penolakan wajib diisi");
    setRejectingCert(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("certifications").update({ status: "rejected", reject_reason: certRejectReason.trim() }).eq("id", rejectCertTarget.id);
    setRejectingCert(false);
    toast.success("Sertifikasi ditolak");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "certifications", entityId: rejectCertTarget.id, entityLabel: rejectCertTarget.profile?.full_name ?? undefined, action: "reject", label: `Sertifikasi '${rejectCertTarget.title ?? rejectCertTarget.name}' coach ${rejectCertTarget.profile?.full_name ?? "coach"} ditolak`, meta: { reason: certRejectReason.trim() } });
    setRejectCertTarget(null);
    load();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">Approvement</h2>
          <p className="text-ink-mute text-sm mt-0.5">Registrasi dan sertifikasi pending.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {registrations.length > 0 && (
            <span className="text-xs font-bold bg-danger-500 text-white px-2 py-0.5 rounded-full">
              {registrations.length + certs.length} pending
            </span>
          )}
        </div>
      </div>

      {/* Tab + Search + Filter bar */}
      <Card padded={false}>
        {/* Tab strip */}
        <div className="flex border-b border-line px-4">
          {(["reg", "cert"] as const).map(t => {
            const isActive = tab === t;
            const count = t === "reg" ? registrations.length : certs.length;
            return (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${isActive ? "text-ocean-700" : "text-ink-mute hover:text-ink-soft"}`}>
                {t === "reg" ? "Registrasi Baru" : "Sertifikasi"}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-danger-500 text-white" : "bg-danger-100 text-danger-600"}`}>
                    {count}
                  </span>
                )}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ocean-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {/* Search + Filter row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <div className="relative flex-1 max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === "reg" ? "Cari nama, email, no HP…" : "Cari nama, sertifikat, penerbit…"}
              className="w-full pl-9 pr-3 py-2 text-sm bg-paper-tint border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-500/20 transition-all"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint hover:text-ink-soft">
                <Icon name="x" className="w-4 h-4" />
              </button>
            )}
          </div>

          {tab === "reg" && (
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
              className="text-sm border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-500/20 transition-all">
              <option value="">Semua gender</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          )}

          <button type="button" onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-ink-mute border border-line rounded-lg hover:bg-paper-tint hover:text-ink transition-all">
            <Icon name="refresh" className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Table — Registrasi */}
        {tab === "reg" && (
          <>
            {loading ? (
              <div className="py-16 text-center text-ink-mute text-sm">Memuat data…</div>
            ) : filteredRegs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="w-12 h-12 rounded-full bg-paper-tint flex items-center justify-center">
                  <Icon name="users" className="w-6 h-6 text-ink-faint" />
                </span>
                <div>
                  <div className="font-semibold text-ink-soft text-sm">{search || genderFilter ? "Tidak ada hasil ditemukan" : "Tidak ada pendaftaran baru"}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{search || genderFilter ? "Coba ubah filter atau kata kunci pencarian" : "Pendaftaran dari halaman /register akan muncul di sini"}</div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">Pendaftar</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden md:table-cell">Gender</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden lg:table-cell">Tanggal Daftar</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagedRegs.map(r => {
                    const age = r.birth_date ? calcAge(r.birth_date) : null;
                    const contactPhone = r.phone_owner === "parent" ? r.parent_phone : r.phone;
                    return (
                      <tr key={r.id}
                        className="hover:bg-paper-tint cursor-pointer transition-colors"
                        onClick={() => setDetailReg(r)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.full_name} size={36} />
                            <div className="min-w-0">
                              <div className="font-semibold text-ink truncate">{r.full_name}</div>
                              <div className="text-xs text-ink-mute">{r.phone ?? "—"}{age ? ` · ${age} thn` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-ink-soft truncate max-w-[180px] block">{r.email ?? <span className="text-danger-400 font-medium">Belum diisi</span>}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-ink-soft">
                            {r.gender === "male" ? "Laki-laki" : r.gender === "female" ? "Perempuan" : <span className="text-ink-faint">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-ink-mute text-xs">{fmtDate(r.created_at)}</span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 justify-end">
                            <a href={waLink(`Halo ${r.full_name}, terima kasih telah mendaftar di Next Swimming School.`, contactPhone)} target="_blank" rel="noreferrer">
                              <Btn variant="wa" size="sm" icon="whatsapp" />
                            </a>
                            <Btn variant="primary" size="sm" icon="check" disabled={approvingId === r.id} onClick={() => openApproveReg(r)}>
                              {approvingId === r.id ? "…" : "Approve"}
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Table — Sertifikasi */}
        {tab === "cert" && (
          <>
            {loading ? (
              <div className="py-16 text-center text-ink-mute text-sm">Memuat data…</div>
            ) : filteredCerts.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="w-12 h-12 rounded-full bg-paper-tint flex items-center justify-center">
                  <Icon name="shield" className="w-6 h-6 text-ink-faint" />
                </span>
                <div>
                  <div className="font-semibold text-ink-soft text-sm">{search ? "Tidak ada hasil ditemukan" : "Tidak ada sertifikasi pending"}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{search ? "Coba ubah kata kunci pencarian" : "Sertifikasi yang diajukan coach akan muncul di sini"}</div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">Coach</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">Sertifikat</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden sm:table-cell">Penerbit</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden md:table-cell">Berlaku s/d</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagedCerts.map(c => (
                    <tr key={c.id}
                      className="hover:bg-paper-tint cursor-pointer transition-colors"
                      onClick={() => setDetailCert(c)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.profile?.full_name ?? "?"} size={36} />
                          <span className="font-semibold text-ink truncate">{c.profile?.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink truncate max-w-[200px] block">{c.title ?? c.name}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-ink-soft">{c.issuer ?? <span className="text-ink-faint">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.no_expiry ? (
                          <span className="inline-flex items-center gap-1 text-ok-700 text-xs font-semibold">
                            <span className="w-3.5 h-3.5 rounded-full bg-ok-100 flex items-center justify-center shrink-0">
                              <Icon name="check" className="w-2 h-2 text-ok-600" strokeWidth={3} />
                            </span>
                            Seumur hidup
                          </span>
                        ) : (
                          <span className="text-ink-mute text-xs">
                            {c.valid_until ? fmtMonthYear(c.valid_until) : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { setRejectCertTarget(c); setCertRejectReason(""); }}>Tolak</Btn>
                          <Btn variant="primary" size="sm" icon="check" onClick={() => approveCert(c.id)}>Approve</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-line flex items-center justify-between gap-4">
            <span className="text-xs text-ink-mute">
              {activeList.length} item · halaman {safePage + 1} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
              <button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
              {pageNums.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 py-1.5 text-sm text-ink-faint">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p as number)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${safePage === p ? "bg-ocean-600 text-white" : "text-ink-soft hover:bg-paper-tint"}`}>
                    {(p as number) + 1}
                  </button>
                )
              )}
              <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
              <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}
                className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Detail Registrasi Modal ─────────────────────────────────────────── */}
      <Modal open={!!detailReg} onClose={() => setDetailReg(null)} title="Detail Pendaftaran" size="sm"
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={() => detailReg && openEditReg(detailReg)}>Edit</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && deleteReg(detailReg)}>Hapus</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && rejectReg(detailReg)}>Tolak</Btn>
            <div className="flex-1" />
            {detailReg && (
              <a href={waLink(`Halo ${detailReg.full_name}, terima kasih telah mendaftar di Next Swimming School.`, detailReg.phone_owner === "parent" ? detailReg.parent_phone : detailReg.phone)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">Chat WA</Btn>
              </a>
            )}
            <Btn variant="primary" icon="check" disabled={!!approvingId} onClick={() => detailReg && openApproveReg(detailReg)}>
              {approvingId ? "Memproses…" : "Approve"}
            </Btn>
          </div>
        }>
        {detailReg && (() => {
          const age = detailReg.birth_date ? calcAge(detailReg.birth_date) : null;
          const rows: [string, string | null | undefined][] = [
            ["Nama lengkap", detailReg.full_name],
            ["Email", detailReg.email ?? "—"],
            ["Tanggal lahir", detailReg.birth_date ? `${fmtDate(detailReg.birth_date)}${age ? ` (${age} thn)` : ""}` : "—"],
            ["Jenis kelamin", detailReg.gender === "male" ? "Laki-laki" : detailReg.gender === "female" ? "Perempuan" : "—"],
            ["No. HP", detailReg.phone ?? "—"],
            ["Pemilik HP", detailReg.phone_owner === "parent" ? "Orang tua / wali" : "Sendiri"],
            ...(detailReg.phone_owner === "parent" ? [
              ["Nama orang tua", detailReg.parent_name ?? "—"] as [string, string],
              ["No. HP orang tua", detailReg.parent_phone ?? "—"] as [string, string],
            ] : []),
            ["Alamat", detailReg.address ?? "—"],
            ["Catatan kesehatan", detailReg.health_notes ?? "—"],
            ["Tanggal daftar", fmtDateLong(detailReg.created_at)],
          ];
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <Avatar name={detailReg.full_name} size={48} />
                <div>
                  <div className="font-display font-bold text-ink">{detailReg.full_name}</div>
                  <Status kind="pending" className="mt-1">Menunggu review</Status>
                </div>
              </div>
              <div className="divide-y divide-line">
                {rows.map(([label, value]) => (
                  <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                    <span className="text-ink-mute">{label}</span>
                    <span className="text-ink font-medium break-words">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Detail Sertifikasi Modal ────────────────────────────────────────── */}
      <Modal open={!!detailCert} onClose={() => setDetailCert(null)} title="Detail Sertifikasi" size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Btn variant="ghost" className="text-danger-500" onClick={() => { setRejectCertTarget(detailCert!); setDetailCert(null); setCertRejectReason(""); }}>Tolak</Btn>
            <Btn variant="primary" icon="check" className="ml-auto" onClick={() => { approveCert(detailCert!.id); setDetailCert(null); }}>Approve</Btn>
          </div>
        }>
        {detailCert && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <Avatar name={detailCert.profile?.full_name ?? "?"} size={48} />
              <div>
                <div className="font-display font-bold text-ink">{detailCert.profile?.full_name}</div>
                <Status kind="pending" className="mt-1">Menunggu verifikasi</Status>
              </div>
            </div>
            <div className="divide-y divide-line">
              {([
                ["Nama sertifikat", detailCert.title ?? detailCert.name],
                ["Penerbit", detailCert.issuer ?? "—"],
                ["Berlaku dari", detailCert.valid_from ? fmtMonthYear(detailCert.valid_from) : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                  <span className="text-ink-mute">{label}</span>
                  <span className="text-ink font-medium break-words">{value}</span>
                </div>
              ))}
              <div className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm items-center">
                <span className="text-ink-mute">Berlaku sampai</span>
                {detailCert.no_expiry ? (
                  <span className="inline-flex items-center gap-1.5 text-ok-700 font-semibold">
                    <span className="w-4 h-4 rounded-full bg-ok-100 flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-2.5 h-2.5 text-ok-600" strokeWidth={3} />
                    </span>
                    Tidak ada kedaluwarsa
                  </span>
                ) : (
                  <span className="text-ink font-medium">{detailCert.valid_until ? fmtMonthYear(detailCert.valid_until) : "—"}</span>
                )}
              </div>
            </div>
            {detailCertPhotoUrl && (
              <a href={detailCertPhotoUrl} target="_blank" rel="noreferrer" className="block">
                <img src={detailCertPhotoUrl} alt="Foto sertifikat" className="w-full rounded-xl object-cover max-h-64 border border-line" />
                <span className="text-xs text-ocean-600 mt-1 block text-center">Klik untuk buka ukuran penuh</span>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* ── Tolak Sertifikasi ──────────────────────────────────────────────── */}
      <Modal open={!!rejectCertTarget} onClose={() => setRejectCertTarget(null)} title="Tolak Sertifikasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectCertTarget(null)}>Batal</Btn><Btn variant="danger" onClick={confirmRejectCert} disabled={rejectingCert}>{rejectingCert ? "Menolak…" : "Tolak Sertifikasi"}</Btn></>}>
        <div className="space-y-4">
          {rejectCertTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectCertTarget.title ?? rejectCertTarget.name}</div>
              <div className="text-ink-mute">{rejectCertTarget.profile?.full_name}</div>
            </div>
          )}
          <Field label="Alasan penolakan" required>
            <Textarea rows={3} value={certRejectReason} onChange={e => setCertRejectReason(e.target.value)} placeholder="Mis. Sertifikat sudah kedaluwarsa, harap perbarui dengan dokumen terbaru." />
          </Field>
        </div>
      </Modal>

      {/* ── Tolak Registrasi ──────────────────────────────────────────────── */}
      <Modal open={!!rejectRegTarget} onClose={() => setRejectRegTarget(null)} title="Tolak Pendaftaran" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectRegTarget(null)}>Batal</Btn><Btn variant="danger" onClick={confirmRejectReg} disabled={rejectingReg}>{rejectingReg ? "Menolak…" : "Tolak Pendaftaran"}</Btn></>}>
        <div className="space-y-4">
          {rejectRegTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectRegTarget.full_name}</div>
              <div className="text-ink-mute">{rejectRegTarget.phone ?? "—"}</div>
            </div>
          )}
          <Field label="Alasan penolakan" required>
            <Textarea rows={3} value={regRejectReason} onChange={e => setRegRejectReason(e.target.value)} placeholder="Mis. Data tidak lengkap, nomor WA tidak aktif." />
          </Field>
        </div>
      </Modal>

      {/* ── Edit Registrasi ───────────────────────────────────────────────── */}
      <Modal open={!!editReg} onClose={() => setEditReg(null)} title="Edit Data Registrasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditReg(null)}>Batal</Btn><Btn variant="primary" onClick={saveEditReg} disabled={savingEdit}>{savingEdit ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama lengkap" required><Input value={editRegForm.full_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Email" required hint="Akan dipakai sebagai akun login"><Input type="email" placeholder="nama@email.com" value={editRegForm.email ?? ""} onChange={e => setEditRegForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tanggal lahir"><DatePicker value={editRegForm.birth_date ?? ""} onChange={v => setEditRegForm(f => ({ ...f, birth_date: v }))} /></Field>
            <Field label="Jenis kelamin">
              <Select value={editRegForm.gender ?? ""} onChange={e => setEditRegForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </Select>
            </Field>
          </div>
          <Field label="No. HP"><Input value={editRegForm.phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Pemilik HP">
            <Select value={editRegForm.phone_owner ?? "self"} onChange={e => setEditRegForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">Sendiri</option>
              <option value="parent">Orang tua / wali</option>
            </Select>
          </Field>
          {editRegForm.phone_owner === "parent" && <>
            <Field label="Nama orang tua"><Input value={editRegForm.parent_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label="No. HP orang tua"><Input value={editRegForm.parent_phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>}
          <Field label="Alamat"><Textarea rows={2} value={editRegForm.address ?? ""} onChange={e => setEditRegForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label="Catatan kesehatan / alergi"><Input value={editRegForm.health_notes ?? ""} onChange={e => setEditRegForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* ── Approve + Bukti Transfer ──────────────────────────────────────── */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve Pendaftaran" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setApproveTarget(null)}>Batal</Btn><Btn variant="primary" icon="check" onClick={confirmApproveReg} disabled={!!approvingId}>{approvingId ? "Memproses…" : "Approve & Buat Akun"}</Btn></>}>
        {approveTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm">{approveTarget.full_name}</div>
              <div className="text-xs text-ink-mute mt-0.5">{approveTarget.phone ?? "—"}</div>
            </Card>
            <div>
              <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">Bukti transfer</span>
              <div className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl border-2 border-dashed transition-colors ${proofFile ? "border-ocean-400 bg-ocean-50" : "border-line hover:border-wave-300 hover:bg-paper-tint"}`}>
                <input ref={proofInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => proofInputRef.current?.click()}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${proofFile ? "bg-ocean-100 text-ocean-600" : "bg-paper-deep text-ink-faint"}`}>
                  <Icon name={proofFile ? "check" : "upload"} className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => proofInputRef.current?.click()}>
                  {proofFile ? (
                    <>
                      <div className="text-sm font-semibold text-ink truncate">{proofFile.name}</div>
                      <div className="text-xs text-ink-mute">{(proofFile.size / 1024).toFixed(0)} KB</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-ink-soft">Klik untuk upload</div>
                      <div className="text-xs text-ink-faint">JPG, PNG, atau PDF · Opsional</div>
                    </>
                  )}
                </div>
                {proofFile && (
                  <button type="button" onClick={() => setProofFile(null)}
                    className="shrink-0 w-6 h-6 rounded-full bg-danger-50 text-danger-400 hover:bg-danger-100 flex items-center justify-center transition-colors">
                    <Icon name="x" className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <span className="text-xs text-ink-faint mt-1 block">Upload bukti transfer sebelum approve. Opsional jika belum ada.</span>
            </div>
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3 text-xs text-ocean-800">
              Akun member akan dibuat otomatis dengan password sementara. Lengkapi data & kirim credential via WhatsApp dari menu Member.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
