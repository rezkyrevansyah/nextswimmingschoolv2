"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useUpload } from "@/hooks/useUpload";
import { parseUserApiError } from "../../_utils";
import { logActivity } from "@/lib/activityLog";
import type { RegistrationRow, CertRow } from "./_types";
import { paginate, PAGE_SIZE } from "./_utils";

export function useApprovementData(branchId: string) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const genderLabel = (g: string | null | undefined) => g === "male" ? "Male" : g === "female" ? "Female" : null;
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
    if (error) return toast.error("Failed to save", error.message);
    toast.success("Registration data updated");
    setEditReg(null);
    load();
  };

  const deleteReg = async (r: RegistrationRow) => {
    const ok = await confirm({ title: `Delete registration "${r.full_name}"?`, body: "This action cannot be undone.", confirmLabel: "Delete" });
    if (!ok) return;
    await supabase.from("registrations").delete().eq("id", r.id);
    setDetailReg(null);
    toast.success("Registration deleted");
    load();
  };

  const openApproveReg = (r: RegistrationRow) => { setApproveTarget(r); setProofFile(null); };
  const rejectReg = (r: RegistrationRow) => { setRejectRegTarget(r); setRegRejectReason(""); };

  const confirmRejectReg = async () => {
    if (!rejectRegTarget) return;
    if (!regRejectReason.trim()) return toast.error("Rejection reason is required");
    setRejectingReg(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("registrations").update({ status: "rejected", reject_reason: regRejectReason.trim(), reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", rejectRegTarget.id);
    setRejectingReg(false);
    toast.success("Registration rejected");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "registrations", entityId: rejectRegTarget.id, entityLabel: rejectRegTarget.full_name, action: "reject", label: `Registration for ${rejectRegTarget.full_name} rejected — ${regRejectReason.trim()}`, meta: { reason: regRejectReason.trim() } });
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
    const studentEmail = r.email?.trim();
    if (!studentEmail) {
      toast.error("Email not filled in registration data", "Edit the registration first to fill in the email.");
      setApprovingId(null);
      return;
    }
    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentEmail, password: tempPassword, full_name: r.full_name, role: "student", branch_id: branchId, phone: r.phone, birth_date: r.birth_date || null, gender: r.gender || null, address: r.address || null, health_notes: r.health_notes || null, student_type: "reguler", school_id: null, class_id: null, total_sessions: null, proof_url: proofUrl, registration_id: r.id }),
    });
    const json = await res.json() as { user_id?: string; student_id?: string; error?: string; code?: string; class_assignment_error?: string };
    if (!res.ok) {
      const [errT, errS, errD] = parseUserApiError(json);
      toast.error(errT, errS, errD);
      setApprovingId(null);
      return;
    }
    // Account creation + registration status update now happen together
    // server-side (see /api/admin/users) so they can't drift out of sync.
    const user = (await supabase.auth.getUser()).data.user;
    toast.success("Registration approved", "Student added to the Student menu — complete data & send credential.");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "registrations", entityId: r.id, entityLabel: r.full_name, action: "approve", label: `Registration for ${r.full_name} (${r.email ?? ""}) approved` });
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
    toast.success("Certification verified");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "certifications", entityId: id, entityLabel: cert?.profile?.full_name ?? undefined, action: "approve", label: `Certification '${cert?.title ?? cert?.name ?? id}' for coach ${cert?.profile?.full_name ?? "coach"} approved` });
    load();
  };

  const confirmRejectCert = async () => {
    if (!rejectCertTarget) return;
    if (!certRejectReason.trim()) return toast.error("Rejection reason is required");
    setRejectingCert(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("certifications").update({ status: "rejected", reject_reason: certRejectReason.trim() }).eq("id", rejectCertTarget.id);
    setRejectingCert(false);
    toast.success("Certification rejected");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "certifications", entityId: rejectCertTarget.id, entityLabel: rejectCertTarget.profile?.full_name ?? undefined, action: "reject", label: `Certification '${rejectCertTarget.title ?? rejectCertTarget.name}' for coach ${rejectCertTarget.profile?.full_name ?? "coach"} rejected`, meta: { reason: certRejectReason.trim() } });
    setRejectCertTarget(null);
    load();
  };

  return {
    monthsLong, genderLabel,
    registrations, certs, loading, load,
    tab, setTab, search, setSearch, genderFilter, setGenderFilter, page, setPage,
    detailReg, setDetailReg, editReg, setEditReg, editRegForm, setEditRegForm, savingEdit,
    approveTarget, setApproveTarget, proofFile, setProofFile, approvingId, proofInputRef,
    rejectRegTarget, setRejectRegTarget, regRejectReason, setRegRejectReason, rejectingReg,
    detailCert, setDetailCert, rejectCertTarget, setRejectCertTarget, certRejectReason, setCertRejectReason, rejectingCert,
    filteredRegs, filteredCerts, activeList, totalPages, safePage, pageNums, pagedRegs, pagedCerts,
    openEditReg, saveEditReg, deleteReg, openApproveReg, rejectReg, confirmRejectReg, confirmApproveReg,
    approveCert, confirmRejectCert,
  };
}
