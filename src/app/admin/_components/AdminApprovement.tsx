"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
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

function fmtMonthYear(val: string | null | undefined, monthsLong: string[]): string {
  if (!val) return "";
  const m = val.match(/^(\d{4})-(\d{2})/);
  if (m) return `${monthsLong[parseInt(m[2]) - 1]} ${m[1]}`;
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
  const { t, tArray } = useLocale();
  const monthsLong = tArray("common.months.long");
  const genderLabel = (g: string | null | undefined) => g === "male" ? t("admin.approvement.genderMale") : g === "female" ? t("admin.approvement.genderFemale") : null;
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
    if (error) return toast.error(t("admin.approvement.saveFailedGeneric"), error.message);
    toast.success(t("admin.approvement.regDataUpdatedToast"));
    setEditReg(null);
    load();
  };

  const deleteReg = async (r: RegistrationRow) => {
    const ok = await confirm({ title: t("admin.approvement.deleteConfirmTitle", { name: r.full_name }), body: t("admin.approvement.deleteConfirmBody2"), confirmLabel: t("common.actions.delete") });
    if (!ok) return;
    await supabase.from("registrations").delete().eq("id", r.id);
    setDetailReg(null);
    toast.success(t("admin.approvement.registrationDeletedToast"));
    load();
  };

  const openApproveReg = (r: RegistrationRow) => { setApproveTarget(r); setProofFile(null); };
  const rejectReg = (r: RegistrationRow) => { setRejectRegTarget(r); setRegRejectReason(""); };

  const confirmRejectReg = async () => {
    if (!rejectRegTarget) return;
    if (!regRejectReason.trim()) return toast.error(t("admin.approvement.reasonRequired"));
    setRejectingReg(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("registrations").update({ status: "rejected", reject_reason: regRejectReason.trim(), reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", rejectRegTarget.id);
    setRejectingReg(false);
    toast.success(t("admin.approvement.registrationRejectedToast"));
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "registrations", entityId: rejectRegTarget.id, entityLabel: rejectRegTarget.full_name, action: "reject", label: t("admin.approvement.activityRegRejected", { name: rejectRegTarget.full_name, reason: regRejectReason.trim() }), meta: { reason: regRejectReason.trim() } });
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
      toast.error(t("admin.approvement.emailNotFilledTitle"), t("admin.approvement.editRegFirstHint"));
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
      const [errT, errS, errD] = parseUserApiError(json, t);
      toast.error(errT, errS, errD);
      setApprovingId(null);
      return;
    }
    const user = (await supabase.auth.getUser()).data.user;
    const upd: Database["public"]["Tables"]["registrations"]["Update"] = { status: "approved", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), proof_url: proofUrl ?? undefined, member_id: json.member_id ?? undefined };
    await supabase.from("registrations").update(upd).eq("id", r.id);
    toast.success(t("admin.approvement.registrationApprovedToast"), t("admin.approvement.memberInMenuHint"));
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "registrations", entityId: r.id, entityLabel: r.full_name, action: "approve", label: t("admin.approvement.activityRegApproved", { name: r.full_name, email: r.email ?? "" }) });
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
    toast.success(t("admin.approvement.certVerifiedToast"));
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "certifications", entityId: id, entityLabel: cert?.profile?.full_name ?? undefined, action: "approve", label: t("admin.approvement.activityCertApproved", { title: cert?.title ?? cert?.name ?? id, name: cert?.profile?.full_name ?? "coach" }) });
    load();
  };

  const confirmRejectCert = async () => {
    if (!rejectCertTarget) return;
    if (!certRejectReason.trim()) return toast.error(t("admin.approvement.reasonRequired"));
    setRejectingCert(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("certifications").update({ status: "rejected", reject_reason: certRejectReason.trim() }).eq("id", rejectCertTarget.id);
    setRejectingCert(false);
    toast.success(t("admin.approvement.certRejectedToast"));
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "certifications", entityId: rejectCertTarget.id, entityLabel: rejectCertTarget.profile?.full_name ?? undefined, action: "reject", label: t("admin.approvement.activityCertRejected", { title: rejectCertTarget.title ?? rejectCertTarget.name, name: rejectCertTarget.profile?.full_name ?? "coach" }), meta: { reason: certRejectReason.trim() } });
    setRejectCertTarget(null);
    load();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">{t("admin.approvement.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("admin.approvement.pageSub")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {registrations.length > 0 && (
            <span className="text-xs font-bold bg-danger-500 text-white px-2 py-0.5 rounded-full">
              {t("admin.approvement.pendingSuffix", { count: registrations.length + certs.length })}
            </span>
          )}
        </div>
      </div>

      {/* Tab + Search + Filter bar */}
      <Card padded={false}>
        {/* Tab strip */}
        <div className="flex border-b border-line px-4">
          {(["reg", "cert"] as const).map(tb => {
            const isActive = tab === tb;
            const count = tb === "reg" ? registrations.length : certs.length;
            return (
              <button key={tb} type="button" onClick={() => setTab(tb)}
                className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${isActive ? "text-ocean-700" : "text-ink-mute hover:text-ink-soft"}`}>
                {tb === "reg" ? t("admin.approvement.tabRegistration") : t("admin.approvement.tabCertification")}
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
              placeholder={tab === "reg" ? t("admin.approvement.searchRegPlaceholder") : t("admin.approvement.searchCertPlaceholder")}
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
              <option value="">{t("admin.approvement.allGenders")}</option>
              <option value="male">{t("admin.approvement.genderMale")}</option>
              <option value="female">{t("admin.approvement.genderFemale")}</option>
            </select>
          )}

          <button type="button" onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-ink-mute border border-line rounded-lg hover:bg-paper-tint hover:text-ink transition-all">
            <Icon name="refresh" className="w-4 h-4" />
            <span className="hidden sm:inline">{t("admin.approvement.refreshBtn")}</span>
          </button>
        </div>

        {/* Table — Registrasi */}
        {tab === "reg" && (
          <>
            {loading ? (
              <div className="py-16 text-center text-ink-mute text-sm">{t("admin.approvement.loadingData")}</div>
            ) : filteredRegs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="w-12 h-12 rounded-full bg-paper-tint flex items-center justify-center">
                  <Icon name="users" className="w-6 h-6 text-ink-faint" />
                </span>
                <div>
                  <div className="font-semibold text-ink-soft text-sm">{search || genderFilter ? t("admin.approvement.noResultsFound") : t("admin.approvement.noNewRegistrations")}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{search || genderFilter ? t("admin.approvement.tryDifferentFilter") : t("admin.approvement.regFromPageHint")}</div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">{t("admin.approvement.colApplicant")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden sm:table-cell">{t("admin.approvement.colEmail")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden md:table-cell">{t("admin.approvement.colGender")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden lg:table-cell">{t("admin.approvement.colRegDate")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide text-right">{t("admin.approvement.colActions")}</th>
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
                              <div className="text-xs text-ink-mute">{r.phone ?? "—"}{age ? ` · ${t("admin.approvement.yearsSuffix", { n: age })}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-ink-soft truncate max-w-[180px] block">{r.email ?? <span className="text-danger-400 font-medium">{t("admin.approvement.notFilledYet")}</span>}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-ink-soft">
                            {genderLabel(r.gender) ?? <span className="text-ink-faint">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-ink-mute text-xs">{fmtDate(r.created_at)}</span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 justify-end">
                            <a href={waLink(t("admin.approvement.welcomeWaMessage", { name: r.full_name }), contactPhone)} target="_blank" rel="noreferrer">
                              <Btn variant="wa" size="sm" icon="whatsapp" />
                            </a>
                            <Btn variant="primary" size="sm" icon="check" disabled={approvingId === r.id} onClick={() => openApproveReg(r)}>
                              {approvingId === r.id ? "…" : t("common.actions.approve")}
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
              <div className="py-16 text-center text-ink-mute text-sm">{t("admin.approvement.loadingData")}</div>
            ) : filteredCerts.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="w-12 h-12 rounded-full bg-paper-tint flex items-center justify-center">
                  <Icon name="shield" className="w-6 h-6 text-ink-faint" />
                </span>
                <div>
                  <div className="font-semibold text-ink-soft text-sm">{search ? t("admin.approvement.noResultsFound") : t("admin.approvement.noPendingCert")}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{search ? t("admin.approvement.tryDifferentSearch") : t("admin.approvement.certFromCoachHint")}</div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">{t("admin.approvement.colCoach")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">{t("admin.approvement.colCertificate")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden sm:table-cell">{t("admin.approvement.colIssuer")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden md:table-cell">{t("admin.approvement.colValidUntil")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide text-right">{t("admin.approvement.colActions")}</th>
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
                            {t("admin.approvement.lifetimeLabel")}
                          </span>
                        ) : (
                          <span className="text-ink-mute text-xs">
                            {c.valid_until ? fmtMonthYear(c.valid_until, monthsLong) : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { setRejectCertTarget(c); setCertRejectReason(""); }}>{t("common.actions.reject")}</Btn>
                          <Btn variant="primary" size="sm" icon="check" onClick={() => approveCert(c.id)}>{t("common.actions.approve")}</Btn>
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
              {t("admin.approvement.itemsPageLabel", { count: activeList.length, page: safePage + 1, total: totalPages })}
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
      <Modal open={!!detailReg} onClose={() => setDetailReg(null)} title={t("admin.approvement.detailRegModalTitle")} size="sm"
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={() => detailReg && openEditReg(detailReg)}>{t("common.actions.edit")}</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && deleteReg(detailReg)}>{t("common.actions.delete")}</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && rejectReg(detailReg)}>{t("common.actions.reject")}</Btn>
            <div className="flex-1" />
            {detailReg && (
              <a href={waLink(t("admin.approvement.welcomeWaMessage", { name: detailReg.full_name }), detailReg.phone_owner === "parent" ? detailReg.parent_phone : detailReg.phone)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">{t("admin.approvement.chatWaBtn")}</Btn>
              </a>
            )}
            <Btn variant="primary" icon="check" disabled={!!approvingId} onClick={() => detailReg && openApproveReg(detailReg)}>
              {approvingId ? t("admin.approvement.processingBtn") : t("common.actions.approve")}
            </Btn>
          </div>
        }>
        {detailReg && (() => {
          const age = detailReg.birth_date ? calcAge(detailReg.birth_date) : null;
          const rows: [string, string | null | undefined][] = [
            [t("admin.approvement.rowFullName"), detailReg.full_name],
            [t("admin.approvement.rowEmail"), detailReg.email ?? "—"],
            [t("admin.approvement.rowBirthDate"), detailReg.birth_date ? `${fmtDate(detailReg.birth_date)}${age ? ` (${t("admin.approvement.yearsSuffix", { n: age })})` : ""}` : "—"],
            [t("admin.approvement.rowGender"), genderLabel(detailReg.gender) ?? "—"],
            [t("admin.approvement.rowPhone"), detailReg.phone ?? "—"],
            [t("admin.approvement.rowPhoneOwner"), detailReg.phone_owner === "parent" ? t("admin.approvement.phoneOwnerParent") : t("admin.approvement.phoneOwnerSelf")],
            ...(detailReg.phone_owner === "parent" ? [
              [t("admin.approvement.rowParentName"), detailReg.parent_name ?? "—"] as [string, string],
              [t("admin.approvement.rowParentPhone"), detailReg.parent_phone ?? "—"] as [string, string],
            ] : []),
            [t("admin.approvement.rowAddress"), detailReg.address ?? "—"],
            [t("admin.approvement.rowHealthNotes"), detailReg.health_notes ?? "—"],
            [t("admin.approvement.rowRegDate"), fmtDateLong(detailReg.created_at)],
          ];
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <Avatar name={detailReg.full_name} size={48} />
                <div>
                  <div className="font-display font-bold text-ink">{detailReg.full_name}</div>
                  <Status kind="pending" className="mt-1">{t("admin.approvement.waitingReviewStatus")}</Status>
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
      <Modal open={!!detailCert} onClose={() => setDetailCert(null)} title={t("admin.approvement.detailCertModalTitle")} size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Btn variant="ghost" className="text-danger-500" onClick={() => { setRejectCertTarget(detailCert!); setDetailCert(null); setCertRejectReason(""); }}>{t("common.actions.reject")}</Btn>
            <Btn variant="primary" icon="check" className="ml-auto" onClick={() => { approveCert(detailCert!.id); setDetailCert(null); }}>{t("common.actions.approve")}</Btn>
          </div>
        }>
        {detailCert && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <Avatar name={detailCert.profile?.full_name ?? "?"} size={48} />
              <div>
                <div className="font-display font-bold text-ink">{detailCert.profile?.full_name}</div>
                <Status kind="pending" className="mt-1">{t("admin.approvement.waitingVerificationStatus")}</Status>
              </div>
            </div>
            <div className="divide-y divide-line">
              {([
                [t("admin.approvement.rowCertName"), detailCert.title ?? detailCert.name],
                [t("admin.approvement.rowIssuer"), detailCert.issuer ?? "—"],
                [t("admin.approvement.rowValidFrom"), detailCert.valid_from ? fmtMonthYear(detailCert.valid_from, monthsLong) : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                  <span className="text-ink-mute">{label}</span>
                  <span className="text-ink font-medium break-words">{value}</span>
                </div>
              ))}
              <div className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm items-center">
                <span className="text-ink-mute">{t("admin.approvement.rowValidUntil")}</span>
                {detailCert.no_expiry ? (
                  <span className="inline-flex items-center gap-1.5 text-ok-700 font-semibold">
                    <span className="w-4 h-4 rounded-full bg-ok-100 flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-2.5 h-2.5 text-ok-600" strokeWidth={3} />
                    </span>
                    {t("admin.approvement.noExpiryLabel")}
                  </span>
                ) : (
                  <span className="text-ink font-medium">{detailCert.valid_until ? fmtMonthYear(detailCert.valid_until, monthsLong) : "—"}</span>
                )}
              </div>
            </div>
            {detailCertPhotoUrl && (
              <a href={detailCertPhotoUrl} target="_blank" rel="noreferrer" className="block">
                <img src={detailCertPhotoUrl} alt={t("admin.approvement.certPhotoAlt")} className="w-full rounded-xl object-cover max-h-64 border border-line" />
                <span className="text-xs text-ocean-600 mt-1 block text-center">{t("admin.approvement.clickToOpenFull")}</span>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* ── Tolak Sertifikasi ──────────────────────────────────────────────── */}
      <Modal open={!!rejectCertTarget} onClose={() => setRejectCertTarget(null)} title={t("admin.approvement.rejectCertModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectCertTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="danger" onClick={confirmRejectCert} disabled={rejectingCert}>{rejectingCert ? t("admin.approvement.rejectingBtn") : t("admin.approvement.rejectCertBtn")}</Btn></>}>
        <div className="space-y-4">
          {rejectCertTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectCertTarget.title ?? rejectCertTarget.name}</div>
              <div className="text-ink-mute">{rejectCertTarget.profile?.full_name}</div>
            </div>
          )}
          <Field label={t("admin.approvement.fieldRejectReason")} required>
            <Textarea rows={3} value={certRejectReason} onChange={e => setCertRejectReason(e.target.value)} placeholder={t("admin.approvement.certRejectReasonPlaceholder")} />
          </Field>
        </div>
      </Modal>

      {/* ── Tolak Registrasi ──────────────────────────────────────────────── */}
      <Modal open={!!rejectRegTarget} onClose={() => setRejectRegTarget(null)} title={t("admin.approvement.rejectRegModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectRegTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="danger" onClick={confirmRejectReg} disabled={rejectingReg}>{rejectingReg ? t("admin.approvement.rejectingBtn") : t("admin.approvement.rejectRegBtn")}</Btn></>}>
        <div className="space-y-4">
          {rejectRegTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectRegTarget.full_name}</div>
              <div className="text-ink-mute">{rejectRegTarget.phone ?? "—"}</div>
            </div>
          )}
          <Field label={t("admin.approvement.fieldRejectReason")} required>
            <Textarea rows={3} value={regRejectReason} onChange={e => setRegRejectReason(e.target.value)} placeholder={t("admin.approvement.regRejectReasonPlaceholder")} />
          </Field>
        </div>
      </Modal>

      {/* ── Edit Registrasi ───────────────────────────────────────────────── */}
      <Modal open={!!editReg} onClose={() => setEditReg(null)} title={t("admin.approvement.editRegModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditReg(null)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveEditReg} disabled={savingEdit}>{savingEdit ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.approvement.rowFullName")} required><Input value={editRegForm.full_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label={t("admin.approvement.rowEmail")} required hint={t("admin.approvement.emailLoginHint")}><Input type="email" placeholder="nama@email.com" value={editRegForm.email ?? ""} onChange={e => setEditRegForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.approvement.rowBirthDate")}><DatePicker value={editRegForm.birth_date ?? ""} onChange={v => setEditRegForm(f => ({ ...f, birth_date: v }))} /></Field>
            <Field label={t("admin.approvement.rowGender")}>
              <Select value={editRegForm.gender ?? ""} onChange={e => setEditRegForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">{t("admin.approvement.genderMale")}</option>
                <option value="female">{t("admin.approvement.genderFemale")}</option>
              </Select>
            </Field>
          </div>
          <Field label={t("admin.approvement.rowPhone")}><Input value={editRegForm.phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label={t("admin.approvement.rowPhoneOwner")}>
            <Select value={editRegForm.phone_owner ?? "self"} onChange={e => setEditRegForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">{t("admin.approvement.phoneOwnerSelf")}</option>
              <option value="parent">{t("admin.approvement.phoneOwnerParent")}</option>
            </Select>
          </Field>
          {editRegForm.phone_owner === "parent" && <>
            <Field label={t("admin.approvement.rowParentName")}><Input value={editRegForm.parent_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={t("admin.approvement.rowParentPhone")}><Input value={editRegForm.parent_phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>}
          <Field label={t("admin.approvement.rowAddress")}><Textarea rows={2} value={editRegForm.address ?? ""} onChange={e => setEditRegForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label={t("admin.approvement.fieldHealthNotes")}><Input value={editRegForm.health_notes ?? ""} onChange={e => setEditRegForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* ── Approve + Bukti Transfer ──────────────────────────────────────── */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title={t("admin.approvement.approveRegModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setApproveTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" icon="check" onClick={confirmApproveReg} disabled={!!approvingId}>{approvingId ? t("admin.approvement.processingBtn") : t("admin.approvement.approveCreateAccountBtn")}</Btn></>}>
        {approveTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm">{approveTarget.full_name}</div>
              <div className="text-xs text-ink-mute mt-0.5">{approveTarget.phone ?? "—"}</div>
            </Card>
            <div>
              <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">{t("admin.approvement.proofOfTransferLabel")}</span>
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
                      <div className="text-sm font-semibold text-ink-soft">{t("admin.approvement.clickToUploadGeneric")}</div>
                      <div className="text-xs text-ink-faint">{t("admin.approvement.fileTypeOptionalHint")}</div>
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
              <span className="text-xs text-ink-faint mt-1 block">{t("admin.approvement.uploadProofHint")}</span>
            </div>
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3 text-xs text-ocean-800">
              {t("admin.approvement.autoAccountNotice")}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
