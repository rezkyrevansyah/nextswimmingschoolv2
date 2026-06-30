"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import type { School } from "../_types";
import { parseUserApiError } from "../_utils";
import { waLink } from "@/lib/utils";

const EMPTY_SCHOOL_FORM = { name: "", email: "", password: "", pic_name: "", pic_phone: "" };

export default function AdminSchoolPanel({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_SCHOOL_FORM);
  const [createdCredential, setCreatedCredential] = useState<{ name: string; email: string; password: string; pic_phone: string } | null>(null);
  const [showSchoolPwd, setShowSchoolPwd] = useState(false);
  // Detail / edit
  const [detailTarget, setDetailTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", pic_name: "", pic_phone: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("schools").select("id, name, email, profile_id, pic_name, pic_phone").eq("branch_id", branchId).order("name");
    if (data) setSchools(data as School[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const create = async () => {
    if (!form.name || !form.email || !form.password) return toast.error("Nama, email, dan password wajib diisi");
    if (form.password.length < 6) return toast.error("Password minimal 6 karakter");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.name, role: "school", branch_id: branchId }),
    });
    const json = await res.json() as { user_id?: string; error?: string; code?: string };
    if (!res.ok) { const [t, s, d] = parseUserApiError(json); toast.error(t, s, d); setSaving(false); return; }

    const { error } = await supabase.from("schools").insert({
      branch_id: branchId, name: form.name, email: form.email,
      profile_id: json.user_id ?? null,
      pic_name: form.pic_name || null, pic_phone: form.pic_phone || null,
    });
    setSaving(false);
    if (error) return toast.error("Gagal menambah sekolah", error.message);
    toast.success("Sekolah ditambahkan & akun login dibuat");
    setCreatedCredential({ name: form.name, email: form.email, password: form.password, pic_phone: form.pic_phone });
    setOpenAdd(false);
    setForm(EMPTY_SCHOOL_FORM);
    load();
  };

  const openEdit = (s: School) => {
    setEditTarget(s);
    setEditForm({ name: s.name, email: s.email ?? "", pic_name: s.pic_name ?? "", pic_phone: s.pic_phone ?? "" });
  };

  const saveEdit = async () => {
    if (!editTarget || !editForm.name) return toast.error("Nama sekolah wajib diisi");
    setEditSaving(true);
    const { error } = await supabase.from("schools").update({
      name: editForm.name, email: editForm.email || null,
      pic_name: editForm.pic_name || null, pic_phone: editForm.pic_phone || null,
    }).eq("id", editTarget.id);
    setEditSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Data sekolah diperbarui");
    setEditTarget(null);
    // Refresh detail jika sedang dibuka
    if (detailTarget?.id === editTarget.id) {
      setDetailTarget(s => s ? { ...s, ...editForm, email: editForm.email || null, pic_name: editForm.pic_name || null, pic_phone: editForm.pic_phone || null } : null);
    }
    load();
  };

  const deleteSchool = async (s: School) => {
    const ok = await confirm({ title: "Hapus sekolah?", body: `Hapus "${s.name}"? Data member afiliasi tidak ikut terhapus.`, confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    // Hapus auth.users jika ada profile terkait
    if (s.profile_id) {
      await fetch(`/api/admin/users/${s.profile_id}`, { method: "DELETE" });
    } else {
      const { error } = await supabase.from("schools").delete().eq("id", s.id);
      if (error) return toast.error("Gagal menghapus", error.message);
    }
    toast.success("Sekolah dihapus");
    if (detailTarget?.id === s.id) setDetailTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">School Panel (Afiliasi)</h2><p className="text-ink-mute text-sm mt-0.5">Kelola sekolah afiliasi & rekap biaya yang ditanggung.</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_SCHOOL_FORM); setOpenAdd(true); }}>Tambah Sekolah</Btn>
      </div>
      {loading ? <div className="text-ink-mute text-sm">Memuat…</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {schools.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-lift transition" onClick={() => setDetailTarget(s)}>
              <div className="flex items-start gap-3">
                <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center shrink-0"><Icon name="school" className="w-7 h-7" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-ink">{s.name}</div>
                  <div className="text-xs text-ink-mute mt-0.5">{s.email ?? "—"}</div>
                  {s.pic_name && <div className="text-xs text-ink-soft mt-0.5">PIC: {s.pic_name}{s.pic_phone ? ` · ${s.pic_phone}` : ""}</div>}
                  <div className="mt-2.5 flex gap-2">
                    <Status kind={s.profile_id ? "active" : "warn"}>{s.profile_id ? "Akun aktif" : "Belum ada akun"}</Status>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {schools.length === 0 && <p className="text-ink-mute">Belum ada sekolah afiliasi.</p>}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detailTarget && !editTarget} onClose={() => setDetailTarget(null)} title="Detail Sekolah" size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { const s = detailTarget!; setDetailTarget(null); deleteSchool(s); }}>Hapus</Btn>
            <div className="flex-1" />
            <Btn variant="ghost" onClick={() => setDetailTarget(null)}>Tutup</Btn>
            <Btn variant="primary" icon="edit" onClick={() => openEdit(detailTarget!)}>Edit</Btn>
          </div>
        }>
        {detailTarget && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center shrink-0"><Icon name="school" className="w-7 h-7" /></span>
              <div>
                <div className="font-display font-bold text-lg text-ink">{detailTarget.name}</div>
                <Status kind={detailTarget.profile_id ? "active" : "warn"}>{detailTarget.profile_id ? "Akun aktif" : "Belum ada akun"}</Status>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-ink-mute">Email login</span>
                <span className="font-mono text-ink">{detailTarget.email ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-ink-mute">Nama PIC</span>
                <span className="font-semibold text-ink">{detailTarget.pic_name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-ink-mute">No. HP PIC</span>
                <span className="font-semibold text-ink">{detailTarget.pic_phone ?? "—"}</span>
              </div>
            </div>
            {detailTarget.pic_phone && (
              <a href={waLink(`Halo ${detailTarget.pic_name ?? ""}, berikut akses login School Panel Next Swimming School untuk ${detailTarget.name}.\n\nEmail: ${detailTarget.email ?? ""}\n\nSilakan login di: ${typeof window !== "undefined" ? window.location.origin : ""}/login`, detailTarget.pic_phone)} target="_blank" rel="noreferrer" className="block">
                <Btn variant="wa" icon="whatsapp" className="w-full">Hubungi PIC via WA</Btn>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Sekolah" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditTarget(null)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sekolah" required><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email login"><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama PIC"><Input value={editForm.pic_name} onChange={e => setEditForm(f => ({ ...f, pic_name: e.target.value }))} placeholder="Mis. Pak Budi" /></Field>
            <Field label="No. HP PIC"><Input value={editForm.pic_phone} onChange={e => setEditForm(f => ({ ...f, pic_phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
        </div>
      </Modal>

      {/* Add school modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Sekolah Afiliasi" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? "Menyimpan…" : "Buat Sekolah & Akun"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sekolah" required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mis. SMAN 4 Bekasi" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama PIC"><Input value={form.pic_name} onChange={e => setForm(f => ({ ...f, pic_name: e.target.value }))} placeholder="Mis. Pak Budi" /></Field>
            <Field label="No. HP PIC" hint="WA credential dikirim ke sini"><Input value={form.pic_phone} onChange={e => setForm(f => ({ ...f, pic_phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
          <Field label="Email login" required hint="Digunakan untuk login ke school page"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Password" required hint="Min. 6 karakter">
            <div className="relative">
              <Input type={showSchoolPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowSchoolPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showSchoolPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>

      {/* Credential popup after create */}
      <Modal open={!!createdCredential} onClose={() => setCreatedCredential(null)} title="Sekolah Berhasil Ditambahkan" size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Btn variant="ghost" onClick={() => setCreatedCredential(null)}>Tutup</Btn>
            <div className="flex-1" />
            {createdCredential?.pic_phone && (
              <a href={waLink(`Halo, berikut akses login School Panel Next Swimming School untuk ${createdCredential.name}:\n\nEmail: ${createdCredential.email}\nPassword: ${createdCredential.password}\n\nLogin di: ${typeof window !== "undefined" ? window.location.origin : ""}/login`)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">Kirim ke WA PIC</Btn>
              </a>
            )}
          </div>
        }>
        <div className="space-y-4">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-start gap-2.5 text-sm text-ok-700"><Icon name="check" className="w-5 h-5 shrink-0 mt-0.5" /><span>Akun login berhasil dibuat. Kirimkan credential ini ke pihak sekolah.</span></div>
          </Card>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">Sekolah</span><span className="font-semibold text-ink">{createdCredential?.name}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">Email</span><span className="font-mono text-ink">{createdCredential?.email}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">Password</span><span className="font-mono text-ink">{createdCredential?.password}</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
