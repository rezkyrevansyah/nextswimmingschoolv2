"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useUpload } from "@/hooks/useUpload";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import type { Database } from "@/types/database";
import { calcAge, parseUserApiError } from "../_utils";
import { logActivity } from "@/lib/activityLog";
import { fmtDate, fmtDateLong, waLink } from "@/lib/utils";

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

export default function AdminApprovement({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const upload = useUpload();
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailReg, setDetailReg] = useState<RegistrationRow | null>(null);
  const [editReg, setEditReg] = useState<RegistrationRow | null>(null);
  const [editRegForm, setEditRegForm] = useState<Partial<RegistrationRow>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<RegistrationRow | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  // Cert detail popup
  const [detailCert, setDetailCert] = useState<CertRow | null>(null);
  // Reject with reason — cert
  const [rejectCertTarget, setRejectCertTarget] = useState<CertRow | null>(null);
  const [certRejectReason, setCertRejectReason] = useState("");
  const [rejectingCert, setRejectingCert] = useState(false);
  // Reject with reason — registration
  const [rejectRegTarget, setRejectRegTarget] = useState<RegistrationRow | null>(null);
  const [regRejectReason, setRegRejectReason] = useState("");
  const [rejectingReg, setRejectingReg] = useState(false);

  // Suppress unused import warning
  void (deletingId);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      supabase.from("registrations").select("id, full_name, email, birth_date, gender, phone, phone_owner, parent_name, parent_phone, address, health_notes, status, created_at").eq("branch_id", branchId).eq("status", "pending").order("created_at")
        .then(({ data }) => { if (data) setRegistrations(data as RegistrationRow[]); }),
      supabase.from("certifications").select("id, name, title, issuer, valid_from, valid_until, no_expiry, photo_url, status, profile:profiles!certifications_coach_id_fkey(full_name, branch_id)").eq("status", "pending")
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
    setDeletingId(r.id);
    await supabase.from("registrations").delete().eq("id", r.id);
    setDeletingId(null);
    setDetailReg(null);
    toast.success("Registrasi dihapus");
    load();
  };

  const openApproveReg = (r: RegistrationRow) => {
    setApproveTarget(r);
    setProofFile(null);
  };

  const rejectReg = (r: RegistrationRow) => {
    setRejectRegTarget(r);
    setRegRejectReason("");
  };

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

    // Upload bukti transfer jika ada
    let proofUrl: string | null = null;
    if (proofFile) {
      proofUrl = await upload.upload.paymentProof(proofFile, r.id);
    }

    // Gunakan email dari form registrasi
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
      body: JSON.stringify({
        email: memberEmail,
        password: tempPassword,
        full_name: r.full_name,
        role: "member",
        branch_id: branchId,
        phone: r.phone,
        birth_date: r.birth_date || null,
        gender: r.gender || null,
        address: r.address || null,
        health_notes: r.health_notes || null,
        member_type: "reguler",
        school_id: null,
        class_id: null,
        total_sessions: null,
        proof_url: proofUrl,
      }),
    });

    const json = await res.json() as { user_id?: string; member_id?: string; error?: string; code?: string };
    if (!res.ok) {
      const [t, s, d] = parseUserApiError(json);
      toast.error(t, s, d);
      setApprovingId(null);
      return;
    }

    // Update status registrasi + simpan bukti transfer + link member_id
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

  if (loading) return <div className="p-10 text-center text-ink-mute">Memuat data…</div>;

  return (
    <div className="space-y-5">
      <div><h2 className="font-display font-bold text-2xl">Approvement</h2><p className="text-ink-mute text-sm mt-0.5">Registrasi dan sertifikasi pending.</p></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle sub="Dari halaman /register">Registrasi Baru ({registrations.length})</SectionTitle>
          {registrations.length === 0 ? <p className="text-ink-mute text-sm">Tidak ada pendaftaran baru.</p> : (
            <div className="space-y-2">
              {registrations.map((r) => {
                const age = r.birth_date ? calcAge(r.birth_date) : null;
                const contactPhone = r.phone_owner === "parent" ? r.parent_phone : r.phone;
                const isApproving = approvingId === r.id;
                return (
                  <div key={r.id} className="flex items-center gap-2 p-3 rounded-xl border border-line hover:border-ocean-200 transition-colors">
                    <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setDetailReg(r)}>
                      <Avatar name={r.full_name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm truncate">{r.full_name}</div>
                        <div className="text-xs text-ink-mute">{age ? `${age} thn` : ""}{age && r.phone ? " · " : ""}{r.phone ?? ""}</div>
                      </div>
                    </button>
                    <div className="flex gap-1.5 shrink-0">
                      <a href={waLink(`Halo ${r.full_name}, terima kasih telah mendaftar di Next Swimming School. Kami sedang memproses pendaftaran Anda.`, contactPhone)} target="_blank" rel="noreferrer">
                        <Btn variant="wa" size="sm" icon="whatsapp" />
                      </a>
                      <Btn variant="primary" size="sm" icon="check" disabled={isApproving} onClick={() => openApproveReg(r)}>
                        {isApproving ? "…" : "Approve"}
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle sub="Wajib verifikasi">Sertifikasi ({certs.length})</SectionTitle>
          {certs.length === 0 ? <p className="text-ink-mute text-sm">Tidak ada sertifikasi pending.</p> : (
            <div className="space-y-2">
              {certs.map((c) => (
                <button key={c.id} onClick={() => setDetailCert(c)}
                  className="flex items-center gap-3 w-full text-left p-3 rounded-xl border border-line hover:border-ocean-300 hover:bg-ocean-50/30 transition-colors">
                  <Avatar name={c.profile?.full_name ?? "?"} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm truncate">{c.title ?? c.name}</div>
                    <div className="text-xs text-ink-mute truncate">{c.profile?.full_name} · {c.issuer ?? "—"}</div>
                  </div>
                  <Icon name="chevron-right" className="w-4 h-4 text-ink-faint shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Detail Registrasi Modal */}
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

      {/* ── Detail Sertifikasi Modal ── */}
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
                ["Berlaku dari", detailCert.valid_from ? fmtDate(detailCert.valid_from) : "—"],
                ["Berlaku sampai", detailCert.no_expiry ? "Tidak kedaluwarsa" : detailCert.valid_until ? fmtDate(detailCert.valid_until) : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                  <span className="text-ink-mute">{label}</span>
                  <span className="text-ink font-medium break-words">{value}</span>
                </div>
              ))}
            </div>
            {detailCert.photo_url && (
              <a href={detailCert.photo_url} target="_blank" rel="noreferrer" className="block">
                <img src={detailCert.photo_url} alt="Foto sertifikat" className="w-full rounded-xl object-cover max-h-64 border border-line" />
                <span className="text-xs text-ocean-600 mt-1 block text-center">Klik untuk buka ukuran penuh</span>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* ── Tolak Sertifikasi Modal ── */}
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

      {/* ── Tolak Registrasi Modal ── */}
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

      {/* ── Edit Registrasi Modal ── */}
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

      {/* ── Approve + Bukti Transfer Modal ── */}
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
              <label className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${proofFile ? "border-ocean-400 bg-ocean-50" : "border-line hover:border-wave-300 hover:bg-paper-tint"}`}>
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${proofFile ? "bg-ocean-100 text-ocean-600" : "bg-paper-deep text-ink-faint"}`}>
                  <Icon name={proofFile ? "check" : "upload"} className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
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
                  <button type="button" onClick={e => { e.preventDefault(); setProofFile(null); }}
                    className="shrink-0 w-6 h-6 rounded-full bg-danger-50 text-danger-400 hover:bg-danger-100 flex items-center justify-center transition-colors">
                    <Icon name="x" className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                )}
              </label>
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
