"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import { Card, SectionTitle, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { fmtIDR, clampPercent } from "@/lib/utils";
import { fmtSwimTime } from "@/lib/printRapor";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import LandingCMS from "./_components/LandingCMS";
import PayslipGenerator from "./payroll/PayslipGenerator";
import CoachLoans from "./payroll/CoachLoans";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  status: string;
  wa_numbers?: string[];
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  color?: string;
  member_count?: number;
  coach_count?: number;
  class_count?: number;
}

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  branch_id: string | null;
  branch?: { name: string } | null;
}

interface CoachSpreadsheetEntry {
  coach_id: string;
  spreadsheet_url: string;
  updated_at: string;
  coach?: { full_name: string } | null;
}

interface ClassRow {
  id: string;
  name: string;
  branch_id: string;
  status: string;
  capacity: number;
  enrolled: number;
  price_monthly: number;
  schedule_days: string[];
  time_start: string; time_end: string;
  goals: string | null;
  description: string | null;
  spreadsheet_url?: string | null;
  spreadsheet_filled?: boolean;
  rapor_signer_coach_id?: string | null;
  branch?: { name: string } | null;
  class_coaches?: { coach_id: string; role: string; profile: { full_name: string } | null }[];
  coach_spreadsheets?: CoachSpreadsheetEntry[];
}

interface CoachRate {
  id: string;
  class_id: string;
  coach_id: string | null;
  rate_per_session: number;
}

interface InvoiceItem {
  id: string; item_type: string; class_id: string | null; session_count: number; rate: number;
  description: string | null; proof_url: string | null;
  class?: { name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  bank_info: string | null;
  submitted_at: string;
  paid_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  branch_id?: string | null;
  branch?: { name: string } | null;
  coach?: { id: string; full_name: string } | null;
  coach_invoice_items?: InvoiceItem[];
}

// ── Sub-pages ──────────────────────────────────────────────────────────────────

function Dashboard({ branches }: { branches: Branch[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const supabase = createClient();

   
  useEffect(() => {
    supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, submitted_at, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(full_name)")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(4)
      .then(({ data }) => { if (data) setInvoices(data as unknown as Invoice[]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
   

  const totalMembers = branches.reduce((a, b) => a + (b.member_count ?? 0), 0);
  const totalCoaches = branches.reduce((a, b) => a + (b.coach_count ?? 0), 0);
  const totalClasses = branches.reduce((a, b) => a + (b.class_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-ocean-700 text-white rounded-2xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-wave-500/30 blur-3xl" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">Pagi, Owner</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-4xl mt-1.5 leading-tight">
            {branches.length} cabang, {totalMembers} member,<br className="hidden lg:block" /> {totalCoaches} coach aktif.
          </h2>
          <p className="text-white/70 mt-3 max-w-2xl">
            {invoices.length > 0 ? `${invoices.length} invoice coach menunggu review.` : "Semua sistem berjalan normal."}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Member aktif"     value={totalMembers}    icon="users"   tone="ocean" sub="Lintas semua cabang" />
        <Stat label="Coach aktif"      value={totalCoaches}    icon="swim"    tone="wave"  sub="Semua cabang" />
        <Stat label="Kelas aktif"      value={totalClasses}    icon="grid"    tone="ocean" sub="Semua cabang" />
        <Stat label="Invoice pending"  value={invoices.length} icon="invoice" tone="warn"  sub="Menunggu review" />
      </div>

      <Card>
        <SectionTitle sub="Performa per cabang">Breakdown per cabang</SectionTitle>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-2.5 font-bold">Cabang</th>
                <th className="text-left py-2.5 font-bold">Lokasi</th>
                <th className="text-right py-2.5 font-bold">Member</th>
                <th className="text-right py-2.5 font-bold">Coach</th>
                <th className="text-right py-2.5 font-bold">Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-paper-tint">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-ocean-600 text-white">
                        <Icon name="pin" className="w-4 h-4" />
                      </span>
                      <div className="font-semibold text-ink">{b.name}</div>
                    </div>
                  </td>
                  <td className="text-ink-mute">{b.address}</td>
                  <td className="text-right font-mono font-semibold">{b.member_count ?? 0}</td>
                  <td className="text-right font-mono font-semibold">{b.coach_count ?? 0}</td>
                  <td className="text-right font-mono font-semibold">{b.class_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {invoices.length > 0 && (
        <Card>
          <SectionTitle sub="Menunggu review">Invoice masuk</SectionTitle>
          <div className="space-y-2">
            {invoices.map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 p-3 rounded-xl bg-paper-tint">
                <Avatar name={iv.coach?.full_name ?? "?"} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">{iv.coach?.full_name}</div>
                  <div className="text-[11px] text-ink-mute">{iv.period_label} · {iv.branch?.name}</div>
                </div>
                <div className="text-sm font-bold text-ink font-mono">{fmtIDR(iv.total_amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Branches({ branches, onRefresh, userId, userName }: { branches: Branch[]; onRefresh: () => void; userId: string; userName: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const supabase = createClient();

  const openAdminPanel = (b: Branch) => {
    sessionStorage.setItem("ownerPreviewBranch", JSON.stringify({ id: b.id, name: b.name }));
    router.push("/admin");
  };
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setName(""); setCity(""); setAddress(""); setWaPhone(""); setBankName(""); setBankAccount(""); setBankHolder(""); setEditItem(null); setShowAdd(true); };
  const openEdit = (b: Branch) => { setName(b.name); setCity(b.city); setAddress(b.address); setWaPhone(b.wa_numbers?.[0] ?? ""); setBankName(b.bank_name ?? ""); setBankAccount(b.bank_account ?? ""); setBankHolder(b.bank_holder ?? ""); setEditItem(b); setShowAdd(true); };

  const save = async () => {
    if (!name || !city) return toast.error("Nama dan kota wajib diisi");
    setSaving(true);
    const cleanWa = waPhone.trim() ? [waPhone.trim()] : [];
    const bankFields = {
      bank_name: bankName.trim() || null,
      bank_account: bankAccount.trim() || null,
      bank_holder: bankHolder.trim() || null,
    };
    if (editItem) {
      const { error } = await supabase.from("branches").update({ name, city, address, wa_numbers: cleanWa, ...bankFields }).eq("id", editItem.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
      toast.success("Cabang diperbarui");
      logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: editItem.id, entityLabel: name, action: "update", label: `Cabang ${name} diperbarui` });
    } else {
      const { data: inserted, error } = await supabase.from("branches").insert({ name, city, address, wa_numbers: cleanWa, status: "active", ...bankFields }).select("id").single();
      if (error) { toast.error("Gagal membuat cabang", error.message); setSaving(false); return; }
      toast.success("Cabang baru dibuat");
      logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: inserted?.id ?? "new", entityLabel: name, action: "create", label: `Cabang ${name} (${city}) dibuat` });
    }
    setSaving(false);
    setShowAdd(false);
    onRefresh();
  };

  const archive = async (b: Branch) => {
    const yes = await confirm({ title: `Arsipkan cabang "${b.name}"?`, body: "Data tidak akan dihapus, hanya disembunyikan dari panel aktif." });
    if (!yes) return;
    const { error } = await supabase.from("branches").update({ status: "archived" }).eq("id", b.id);
    if (error) return toast.error("Gagal mengarsipkan", error.message);
    toast.success("Cabang diarsipkan");
    logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: b.id, entityLabel: b.name, action: "archive", label: `Cabang ${b.name} diarsipkan` });
    onRefresh();
  };

  const deleteBranch = async (b: Branch) => {
    const yes = await confirm({
      title: `Hapus permanen cabang "${b.name}"?`,
      body: `⚠️ PERINGATAN: Semua data cabang ini akan terhapus secara permanen — termasuk kelas, member, coach, absensi, tagihan, rapor, invoice, dan semua akun login terkait. Tindakan ini tidak bisa dibatalkan.`,
      danger: true,
    });
    if (!yes) return;

    const res = await fetch(`/api/owner/branches/${b.id}`, { method: "DELETE" });
    const json = await res.json() as { error?: string; deleted_auth_users?: number };

    if (!res.ok) return toast.error("Gagal menghapus cabang", json.error ?? "Unknown error");
    toast.success(`Cabang "${b.name}" dihapus — ${json.deleted_auth_users ?? 0} akun login ikut dihapus`);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl">Manajemen Cabang</h2>
          <p className="text-ink-mute text-sm mt-0.5">Buat, edit, dan kelola cabang Next Swimming School.</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={openAdd}>Tambah Cabang</Btn>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        {branches.map((b) => (
          <Card key={b.id} padded={false} className="overflow-hidden">
            <div className="h-32 relative bg-gradient-to-br from-ocean-700 to-ocean-500">
              <div className="caustics absolute inset-0" />
              <div className="absolute inset-0 grid-faint opacity-15" />
              <div className="relative p-5 h-full flex items-end text-white">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">Cabang</div>
                  <div className="font-display font-bold text-xl">{b.name}</div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-sm text-ink-mute">
                <Icon name="pin" className="w-4 h-4 text-ocean-500" />{b.address || b.city}
              </div>
              {b.bank_name && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-mute">
                  <Icon name="card" className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono">{b.bank_name} · {b.bank_account}</span>
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-paper-tint"><div className="font-display font-bold text-lg text-ink">{b.member_count ?? 0}</div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Member</div></div>
                <div className="p-2.5 rounded-xl bg-paper-tint"><div className="font-display font-bold text-lg text-ink">{b.coach_count ?? 0}</div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Coach</div></div>
                <div className="p-2.5 rounded-xl bg-paper-tint"><div className="font-display font-bold text-lg text-ink">{b.class_count ?? 0}</div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kelas</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn variant="primary" size="sm" icon="grid" onClick={() => openAdminPanel(b)}>Buka Admin Panel</Btn>
                <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEdit(b)}>Edit</Btn>
                {b.status !== "archived" && (
                  <Btn variant="ghost" size="sm" icon="archive" onClick={() => archive(b)}>Arsip</Btn>
                )}
                <Btn variant="danger" size="sm" icon="trash" onClick={() => deleteBranch(b)}>Hapus</Btn>
              </div>
            </div>
          </Card>
        ))}
        <button onClick={openAdd} className="rounded-2xl border-2 border-dashed border-line hover:border-ocean-300 hover:bg-ocean-50/40 transition flex flex-col items-center justify-center min-h-[280px] text-ink-mute hover:text-ocean-600 group">
          <span className="w-14 h-14 rounded-2xl bg-paper-tint group-hover:bg-white flex items-center justify-center mb-3">
            <Icon name="plus" className="w-6 h-6" />
          </span>
          <div className="font-semibold">Tambah Cabang Baru</div>
        </button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editItem ? "Edit Cabang" : "Tambah Cabang"} size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Batal</Btn>
            <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama cabang" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Cabang Jakarta Selatan" /></Field>
          <Field label="Kota" required><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Jakarta" /></Field>
          <Field label="Alamat"><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Jl. Sudirman No. 1" /></Field>
          <Field label="Nomor WhatsApp Admin" hint="Dipakai di tombol hubungi admin. Format: 081234567890.">
            <Input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="081234567890" className="font-mono" />
          </Field>
          <Field label="Informasi Rekening" hint="Ditampilkan ke member di halaman tagihan saat ada tagihan aktif.">
            <div className="space-y-2">
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Nama Bank (contoh: BCA)" />
              <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Nomor Rekening" className="font-mono" />
              <Input value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder="Atas Nama" />
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Admins({ branches }: { branches: Branch[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", branch_id: "", password: "" });
  const [showAdminPwd, setShowAdminPwd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, branch_id, branch:branches(name)")
      .eq("role", "admin")
      .order("full_name");
    if (data) setAdmins(data as unknown as AdminProfile[]);
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openEdit = (a: AdminProfile) => {
    setEditTarget(a);
    setForm({ full_name: a.full_name, email: a.email, phone: a.phone ?? "", branch_id: a.branch_id ?? "", password: "" });
    setShowAdd(true);
  };

  const saveAdmin = async () => {
    if (editTarget) {
      // Edit mode — update via server route to bypass RLS
      if (!form.branch_id) return toast.error("Cabang wajib dipilih");
      setSaving(true);
      const res = await fetch(`/api/admin/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { full_name: form.full_name, phone: form.phone || null, branch_id: form.branch_id },
        }),
      });
      setSaving(false);
      const json = await res.json() as { error?: string };
      if (!res.ok) return toast.error("Gagal menyimpan", json.error);
      toast.success("Data admin diperbarui");
      setShowAdd(false);
      setEditTarget(null);
      load();
    } else {
      // Create mode
      if (!form.full_name || !form.email || !form.password || !form.branch_id) {
        return toast.error("Semua field wajib diisi");
      }
      setSaving(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "admin" }),
      });
      const json = await res.json() as { error?: string; code?: string };
      if (!res.ok) {
        const isEmailTaken = json.code === "EMAIL_TAKEN";
        toast.error(
          isEmailTaken ? "Email sudah terdaftar" : "Gagal membuat admin",
          json.error,
          isEmailTaken ? 7000 : 4000
        );
        setSaving(false); return;
      }
      toast.success("Admin dibuat", "Akun langsung aktif");
      setSaving(false);
      setShowAdd(false);
      load();
    }
  };

  const removeAdmin = async (a: AdminProfile) => {
    const yes = await confirm({ title: `Hapus akun admin ${a.full_name}?`, body: "Akun login dan data profil akan dihapus permanen.", danger: true });
    if (!yes) return;
    const res = await fetch(`/api/admin/users/${a.id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json() as { error?: string }; return toast.error("Gagal hapus", j.error); }
    toast.success("Akun admin dihapus");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Akun Admin</h2>
          <p className="text-ink-mute text-sm mt-0.5">Buat akun admin per cabang.</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ full_name: "", email: "", phone: "", branch_id: "", password: "" }); setShowAdd(true); }}>Tambah Admin</Btn>
      </div>
      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">Memuat data…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  <th className="text-left py-3 px-5 font-bold">Admin</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">Email</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">WhatsApp</th>
                  <th className="text-left py-3 font-bold">Cabang</th>
                  <th className="text-left py-3 font-bold">Status</th>
                  <th className="text-right py-3 px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {admins.map((a) => (
                  <tr key={a.id} className="hover:bg-paper-tint">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.full_name} size={36} />
                        <div className="font-semibold truncate max-w-[120px] sm:max-w-none">{a.full_name}</div>
                      </div>
                    </td>
                    <td className="text-ink-mute hidden sm:table-cell">{a.email}</td>
                    <td className="text-ink-mute hidden md:table-cell">{a.phone ?? "—"}</td>
                    <td className="text-ink-soft">{a.branch?.name ?? "—"}</td>
                    <td><Status kind="active">Aktif</Status></td>
                    <td className="text-right px-5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="text-ink-mute hover:text-ocean-600 p-1.5"><Icon name="edit" className="w-4 h-4" /></button>
                        <button onClick={() => removeAdmin(a)} className="text-ink-mute hover:text-danger-500 p-1.5"><Icon name="trash" className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-ink-mute">Belum ada akun admin</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTarget(null); }} title={editTarget ? "Edit Admin" : "Tambah Admin Cabang"} size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditTarget(null); }}>Batal</Btn>
            <Btn variant="primary" onClick={saveAdmin} disabled={saving}>{saving ? "Menyimpan…" : editTarget ? "Simpan" : "Buat Akun"}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama lengkap" required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} disabled={!!editTarget} /></Field>
          {!editTarget && <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>}
          <Field label="Nomor WhatsApp"><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Mis. 081234567890" /></Field>
          <Field label="Cabang" required>
            <Select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="" disabled>Pilih cabang…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          {!editTarget && <Field label="Password awal" required hint="Admin bisa ganti setelah login">
            <div className="relative">
              <Input type={showAdminPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowAdminPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showAdminPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>}
        </div>
      </Modal>
    </div>
  );
}

interface ClassCoachRow { id: string; full_name: string; phone: string | null; status: string; role: string; }
interface ClassMemberRow { id: string; full_name: string; phone: string | null; status: string; }
interface CoachAttRow { id: string; date: string; status: string; note: string | null; profile: { full_name: string } | null; }
interface MemberAttRow { id: string; date: string; status: string; note: string | null; profile: { full_name: string } | null; }

const ATT_STATUS_LABEL: Record<string, string> = {
  present: "Hadir", absent: "Absen", leave: "Izin", holiday: "Libur", substitute: "Substitusi",
};

function Classes({ branches }: { branches: Branch[] }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [editForm, setEditForm] = useState({ goals: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailClass, setDetailClass] = useState<ClassRow | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "coach" | "member" | "att_coach" | "att_member">("info");
  const [detailCoaches, setDetailCoaches] = useState<ClassCoachRow[]>([]);
  const [detailMembers, setDetailMembers] = useState<ClassMemberRow[]>([]);
  const [detailCoachAtt, setDetailCoachAtt] = useState<CoachAttRow[]>([]);
  const [detailMemberAtt, setDetailMemberAtt] = useState<MemberAttRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, schedule_days, time_start, time_end, goals, description, spreadsheet_url, spreadsheet_filled, rapor_signer_coach_id, branch:branches(name), class_coaches(coach_id, role, profile:profiles(full_name)), coach_spreadsheets:class_coach_spreadsheets(coach_id, spreadsheet_url, updated_at, coach:profiles(full_name))")
      .eq("status", "active")
      .order("branch_id")
      .order("name");
    if (data) setClasses(data as unknown as ClassRow[]);
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openEdit = (c: ClassRow) => {
    setEditTarget(c);
    setEditForm({ goals: c.goals ?? "", description: c.description ?? "" });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase.from("classes")
      .update({ goals: editForm.goals.trim() || null, description: editForm.description.trim() || null })
      .eq("id", editTarget.id);
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Kelas diperbarui");
    setEditTarget(null);
    load();
  };

  const openDetail = async (c: ClassRow) => {
    setDetailClass(c);
    setDetailTab("info");
    setDetailCoaches([]); setDetailMembers([]); setDetailCoachAtt([]); setDetailMemberAtt([]);
  };

  const loadDetailTab = useCallback(async (tab: typeof detailTab, classId: string) => {
    setDetailLoading(true);
    if (tab === "coach") {
      const { data } = await supabase
        .from("class_coaches")
        .select("role, profile:profiles(id, full_name, phone, status)")
        .eq("class_id", classId);
      setDetailCoaches(
        ((data ?? []) as unknown as { role: string; profile: { id: string; full_name: string; phone: string | null; status: string } | null }[])
          .filter(r => !!r.profile)
          .map(r => ({ ...r.profile!, role: r.role }))
      );
    } else if (tab === "member") {
      const { data } = await supabase
        .from("member_classes")
        .select("member:members(id, profile:profiles(full_name, phone, status))")
        .eq("class_id", classId);
      setDetailMembers(
        ((data ?? []) as unknown as { member: { id: string; profile: { full_name: string; phone: string | null; status: string } | null } | null }[])
          .map(r => r.member)
          .filter((m): m is { id: string; profile: { full_name: string; phone: string | null; status: string } | null } => !!m)
          .map(m => ({ id: m.id, full_name: m.profile?.full_name ?? "—", phone: m.profile?.phone ?? null, status: m.profile?.status ?? "active" }))
      );
    } else if (tab === "att_coach") {
      const { data } = await supabase
        .from("coach_attendances")
        .select("id, date, status, note, profile:profiles(full_name)")
        .eq("class_id", classId)
        .order("date", { ascending: false })
        .limit(100);
      setDetailCoachAtt((data ?? []) as unknown as CoachAttRow[]);
    } else if (tab === "att_member") {
      const { data } = await supabase
        .from("member_attendances")
        .select("id, date, status, note, profile:profiles(full_name)")
        .eq("class_id", classId)
        .order("date", { ascending: false })
        .limit(100);
      setDetailMemberAtt((data ?? []) as unknown as MemberAttRow[]);
    }
    setDetailLoading(false);
  }, [supabase]);

  const switchDetailTab = async (tab: typeof detailTab) => {
    setDetailTab(tab);
    if (!detailClass) return;
    if (tab === "info") return;
    loadDetailTab(tab, detailClass.id);
  };

  const [settingRole, setSettingRole] = useState<string | null>(null);
  const setCoachRole = async (classId: string, coachId: string, role: "head" | "assistant") => {
    setSettingRole(coachId);
    if (role === "head") {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", classId).eq("role", "head");
    }
    const { error } = await supabase.from("class_coaches").update({ role }).eq("class_id", classId).eq("coach_id", coachId);
    setSettingRole(null);
    if (error) return toast.error("Gagal mengubah role", error.message);
    toast.success(role === "head" ? "Ditetapkan sebagai Head Coach" : "Ditetapkan sebagai Assistant Coach");
    setDetailCoaches(prev => prev.map(c => c.id === coachId ? { ...c, role } : role === "head" ? { ...c, role: c.role === "head" ? "assistant" : c.role } : c));
    setClasses(prev => prev.map(c => c.id !== classId ? c : {
      ...c,
      class_coaches: (c.class_coaches ?? []).map(cc => cc.coach_id === coachId ? { ...cc, role } : role === "head" ? { ...cc, role: cc.role === "head" ? "assistant" : cc.role } : cc),
    }));
  };

  const [savingSigner, setSavingSigner] = useState(false);
  const setRaporSigner = async (classId: string, coachId: string | null) => {
    setSavingSigner(true);
    const { error } = await supabase.from("classes").update({ rapor_signer_coach_id: coachId }).eq("id", classId);
    setSavingSigner(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Penanggung jawab TTD rapor disimpan");
    setDetailClass(prev => prev && prev.id === classId ? { ...prev, rapor_signer_coach_id: coachId } : prev);
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, rapor_signer_coach_id: coachId } : c));
  };

  // Group by branch
  const grouped = branches.map(b => ({
    branch: b,
    classes: classes.filter(c => c.branch_id === b.id),
  })).filter(g => g.classes.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">Semua Kelas</h2>
        <p className="text-ink-mute text-sm mt-0.5">Owner dapat mengedit tujuan dan deskripsi kelas. Konfigurasi lainnya dikelola admin cabang.</p>
      </div>

      {loading ? (
        <Card><div className="py-10 text-center text-ink-mute text-sm">Memuat data…</div></Card>
      ) : grouped.length === 0 ? (
        <Card><div className="py-10 text-center text-ink-mute text-sm">Belum ada kelas aktif.</div></Card>
      ) : (
        grouped.map(({ branch, classes: bClasses }) => (
          <div key={branch.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="font-display font-bold text-lg text-ink">{branch.name}</div>
              <div className="text-xs text-ink-faint font-semibold">{bClasses.length} kelas</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {bClasses.map((c) => {
                const coachList = c.class_coaches ?? [];
                const headCoach = coachList.find(cc => cc.role === "head") ?? coachList[0];
                const pct = c.enrolled / (c.capacity || 1);
                return (
                  <Card key={c.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-ink">{c.name}</div>
                        <div className="text-xs text-ink-mute mt-0.5">
                          {(c.schedule_days ?? []).join(", ")}
                          {c.time_start && <span className="font-mono"> · {c.time_start.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Btn variant="ghost" size="sm" icon="eye" onClick={() => openDetail(c)}>Detail</Btn>
                        <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEdit(c)}>Edit</Btn>
                      </div>
                    </div>

                    {/* Goals & Description */}
                    {(c.goals || c.description) ? (
                      <div className="space-y-1.5">
                        {c.goals && (
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tujuan</div>
                            <p className="text-xs text-ink-soft mt-0.5">{c.goals}</p>
                          </div>
                        )}
                        {c.description && (
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Deskripsi</div>
                            <p className="text-xs text-ink-soft mt-0.5">{c.description}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-faint italic">Tujuan & deskripsi belum diisi.</p>
                    )}

                    <div className="border-t border-line pt-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-xs text-ink-mute">
                        {headCoach?.profile?.full_name
                          ? <>
                              <Avatar name={headCoach.profile.full_name} size={20} />
                              <span>{headCoach.profile.full_name}</span>
                              {headCoach.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-50 text-ocean-700 text-[10px] font-bold uppercase tracking-wide">Head</span>}
                            </>
                          : <span className="text-ink-faint">Belum ada coach</span>
                        }
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`font-mono font-semibold ${pct >= 1 ? "text-danger-600" : pct > 0.7 ? "text-warn-600" : "text-ok-600"}`}>
                          {c.enrolled}/{c.capacity}
                        </span>
                        {(c.coach_spreadsheets ?? []).length > 0
                          ? <span className="inline-flex items-center gap-1 text-ok-600 font-semibold"><Icon name="link" className="w-3 h-3" />{c.coach_spreadsheets!.length} spreadsheet</span>
                          : <span className="text-warn-500 font-semibold">Belum ada spreadsheet</span>
                        }
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Detail modal — Info | Coach | Member | Absensi Coach | Absensi Member */}
      <Modal open={!!detailClass} onClose={() => setDetailClass(null)}
        title={`Detail Kelas — ${detailClass?.name ?? ""}`} size="xl"
        footer={<Btn variant="ghost" onClick={() => setDetailClass(null)}>Tutup</Btn>}>
        {detailClass && (
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex gap-1 flex-wrap border-b border-line pb-2">
              {(["info", "coach", "member", "att_coach", "att_member"] as const).map(tab => {
                const labels: Record<string, string> = { info: "Info", coach: "Coach", member: "Member", att_coach: "Absensi Coach", att_member: "Absensi Member" };
                return (
                  <button key={tab} onClick={() => switchDetailTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${detailTab === tab ? "bg-ocean-600 text-white" : "text-ink-mute hover:bg-paper-tint"}`}>
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab: Info */}
            {detailTab === "info" && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Cabang</div>
                    <div className="font-semibold text-ink">{(detailClass.branch as { name: string } | null | undefined)?.name ?? "—"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Status</div>
                    <Status kind={detailClass.status === "active" ? "active" : "inactive"}>{detailClass.status === "active" ? "Aktif" : "Nonaktif"}</Status>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Jadwal</div>
                    <div className="text-sm text-ink">{(detailClass.schedule_days ?? []).join(", ")} {detailClass.time_start && <span className="font-mono">{detailClass.time_start.slice(0,5)}{detailClass.time_end ? `–${detailClass.time_end.slice(0,5)}` : ""}</span>}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Kapasitas</div>
                    <div className="text-sm font-mono text-ink">{detailClass.enrolled}/{detailClass.capacity} peserta</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Harga Bulanan</div>
                    <div className="text-sm font-mono text-ink">{detailClass.price_monthly != null ? `Rp ${Number(detailClass.price_monthly).toLocaleString("id-ID")}` : "—"}</div>
                  </div>
                  {(detailClass.coach_spreadsheets ?? []).length > 0 && (
                    <div className="space-y-2 sm:col-span-2">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Spreadsheet Program</div>
                      <div className="space-y-1.5">
                        {detailClass.coach_spreadsheets!.map(s => (
                          <div key={s.coach_id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-line bg-paper-tint">
                            <Avatar name={s.coach?.full_name ?? "?"} size={24} />
                            <span className="flex-1 text-sm font-medium text-ink truncate">{s.coach?.full_name ?? "—"}</span>
                            <a href={s.spreadsheet_url} target="_blank" rel="noreferrer"
                              className="text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
                              <Icon name="link" className="w-3 h-3" />Buka
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {detailClass.goals && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">Tujuan</div>
                    <p className="text-sm text-ink-soft">{detailClass.goals}</p>
                  </div>
                )}
                {detailClass.description && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">Deskripsi</div>
                    <p className="text-sm text-ink-soft">{detailClass.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Coach */}
            {detailTab === "coach" && (
              detailLoading ? <div className="text-center py-10 text-ink-mute text-sm">Memuat…</div> : (
                detailCoaches.length === 0
                  ? <div className="text-center py-10 text-ink-mute text-sm">Belum ada coach di kelas ini.</div>
                  : <div className="space-y-4">
                    <div className="divide-y divide-line">
                      {detailCoaches.map(c => (
                        <div key={c.id} className="flex items-center gap-3 py-3">
                          <Avatar name={c.full_name} size={36} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm">{c.full_name}</div>
                            <div className="text-xs text-ink-mute">{c.phone ?? "—"}</div>
                          </div>
                          <Status kind={c.status === "active" ? "active" : "inactive"}>{c.status === "active" ? "Aktif" : "Nonaktif"}</Status>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => detailClass && setCoachRole(detailClass.id, c.id, "head")} disabled={settingRole === c.id}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${c.role === "head" ? "bg-ocean-700 text-white" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"}`}>
                              Head Coach
                            </button>
                            <button onClick={() => detailClass && setCoachRole(detailClass.id, c.id, "assistant")} disabled={settingRole === c.id}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${c.role === "assistant" ? "bg-ocean-700 text-white" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"}`}>
                              Assistant
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-line pt-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">Penanggung Jawab TTD Rapor</div>
                      <Select value={detailClass?.rapor_signer_coach_id ?? ""} disabled={savingSigner}
                        onChange={e => detailClass && setRaporSigner(detailClass.id, e.target.value || null)}>
                        <option value="">Otomatis (ikut Head Coach)</option>
                        {detailCoaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </Select>
                      <p className="text-[11px] text-ink-faint mt-1.5">Label cetak di rapor tetap tertulis &ldquo;Head Coach&rdquo; apa pun coach yang dipilih di sini.</p>
                    </div>
                  </div>
              )
            )}

            {/* Tab: Member */}
            {detailTab === "member" && (
              detailLoading ? <div className="text-center py-10 text-ink-mute text-sm">Memuat…</div> : (
                detailMembers.length === 0
                  ? <div className="text-center py-10 text-ink-mute text-sm">Belum ada member aktif di kelas ini.</div>
                  : <div className="divide-y divide-line">
                    {detailMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-3">
                        <Avatar name={m.full_name} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink text-sm">{m.full_name}</div>
                          <div className="text-xs text-ink-mute">{m.phone ?? "—"}</div>
                        </div>
                        <Status kind={m.status === "active" ? "active" : "suspend"}>{m.status === "active" ? "Aktif" : m.status}</Status>
                      </div>
                    ))}
                  </div>
              )
            )}

            {/* Tab: Absensi Coach */}
            {detailTab === "att_coach" && (
              detailLoading ? <div className="text-center py-10 text-ink-mute text-sm">Memuat…</div> : (
                detailCoachAtt.length === 0
                  ? <div className="text-center py-10 text-ink-mute text-sm">Belum ada data absensi coach.</div>
                  : <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs uppercase tracking-widest text-ink-faint">
                          <th className="text-left py-2 pr-4 font-semibold">Tanggal</th>
                          <th className="text-left py-2 pr-4 font-semibold">Coach</th>
                          <th className="text-left py-2 pr-4 font-semibold">Status</th>
                          <th className="text-left py-2 font-semibold">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {detailCoachAtt.map(a => (
                          <tr key={a.id} className="hover:bg-paper-tint">
                            <td className="py-2.5 pr-4 font-mono text-xs">{a.date}</td>
                            <td className="py-2.5 pr-4">{a.profile?.full_name ?? "—"}</td>
                            <td className="py-2.5 pr-4">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                a.status === "present" ? "bg-ok-50 text-ok-700" :
                                a.status === "absent" ? "bg-danger-50 text-danger-700" :
                                a.status === "leave" ? "bg-warn-50 text-warn-700" :
                                "bg-paper-tint text-ink-mute"
                              }`}>{ATT_STATUS_LABEL[a.status] ?? a.status}</span>
                            </td>
                            <td className="py-2.5 text-ink-mute text-xs">{a.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )
            )}

            {/* Tab: Absensi Member */}
            {detailTab === "att_member" && (
              detailLoading ? <div className="text-center py-10 text-ink-mute text-sm">Memuat…</div> : (
                detailMemberAtt.length === 0
                  ? <div className="text-center py-10 text-ink-mute text-sm">Belum ada data absensi member.</div>
                  : <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs uppercase tracking-widest text-ink-faint">
                          <th className="text-left py-2 pr-4 font-semibold">Tanggal</th>
                          <th className="text-left py-2 pr-4 font-semibold">Member</th>
                          <th className="text-left py-2 pr-4 font-semibold">Status</th>
                          <th className="text-left py-2 font-semibold">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {detailMemberAtt.map(a => (
                          <tr key={a.id} className="hover:bg-paper-tint">
                            <td className="py-2.5 pr-4 font-mono text-xs">{a.date}</td>
                            <td className="py-2.5 pr-4">{a.profile?.full_name ?? "—"}</td>
                            <td className="py-2.5 pr-4">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                a.status === "present" ? "bg-ok-50 text-ok-700" :
                                a.status === "absent" ? "bg-danger-50 text-danger-700" :
                                a.status === "leave" ? "bg-warn-50 text-warn-700" :
                                "bg-paper-tint text-ink-mute"
                              }`}>{ATT_STATUS_LABEL[a.status] ?? a.status}</span>
                            </td>
                            <td className="py-2.5 text-ink-mute text-xs">{a.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal — goals & description only */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}
        title={`Edit Kelas — ${editTarget?.name ?? ""}`} size="md"
        footer={<><Btn variant="ghost" onClick={() => setEditTarget(null)}>Batal</Btn><Btn variant="primary" onClick={saveEdit} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-xs text-ocean-800">
            Owner hanya dapat mengedit tujuan dan deskripsi kelas. Untuk mengubah jadwal, kapasitas, atau harga — gunakan admin panel cabang.
          </div>
          <Field label="Tujuan kelas" hint="Opsional — tampil di coach page dan member page">
            <Textarea rows={2} value={editForm.goals}
              onChange={e => setEditForm(f => ({ ...f, goals: e.target.value }))}
              placeholder="Mis. Pengenalan air, membangun rasa percaya diri di air, blowing bubbles." />
          </Field>
          <Field label="Deskripsi kelas" hint="Opsional — tampil di coach page dan member page">
            <Textarea rows={3} value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mis. Kelas ini dirancang untuk anak usia 4–6 tahun yang baru pertama kali belajar renang dengan pendekatan bermain yang menyenangkan." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

interface TarifClassRow {
  id: string; name: string; branch_id: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null;
  branch?: { name: string } | null;
}

interface TarifCoachRow {
  id: string;
  full_name: string;
  branchIds: string[];
  classCount: number;
  extraRate: number | null;
  hasIncompleteRate: boolean;
}

interface RaporLevel {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

interface LevelCriterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}

interface BestTimeTemplateRow { id: string; stroke: string; distance: number; target_time_seconds: number | null; sort_order: number }

function OwnerRaporLevels() {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [levels, setLevels] = useState<RaporLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  const [criteriaLevel, setCriteriaLevel] = useState<RaporLevel | null>(null);
  const [bestTimeLevel, setBestTimeLevel] = useState<RaporLevel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("rapor_levels").select("id, name, sort_order, active").order("sort_order");
    setLevels((data ?? []) as RaporLevel[]);
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addLevel = async () => {
    if (!newName.trim()) return toast.error("Nama level wajib diisi");
    setCreating(true);
    const { error } = await supabase.from("rapor_levels").insert({
      name: newName.trim(), sort_order: levels.length, active: true,
    });
    setCreating(false);
    if (error) return toast.error("Gagal menambah level", error.message);
    toast.success("Level ditambahkan");
    setNewName("");
    load();
  };

  const saveRename = async () => {
    if (!renaming || !renaming.name.trim()) return toast.error("Nama level wajib diisi");
    const { error } = await supabase.from("rapor_levels").update({ name: renaming.name.trim() }).eq("id", renaming.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Level diperbarui");
    setRenaming(null);
    load();
  };

  const toggleActive = async (lvl: RaporLevel) => {
    const { error } = await supabase.from("rapor_levels").update({ active: !lvl.active }).eq("id", lvl.id);
    if (error) return toast.error("Gagal mengubah status", error.message);
    setLevels(prev => prev.map(l => l.id === lvl.id ? { ...l, active: !l.active } : l));
  };

  const deleteLevel = async (lvl: RaporLevel) => {
    const yes = await confirm({ body: `Hapus level "${lvl.name}"? Kriteria dan tabel waktu untuk level ini akan ikut terhapus. Rapor yang sudah diisi dengan level ini tidak akan terpengaruh.` });
    if (!yes) return;
    const { error } = await supabase.from("rapor_levels").delete().eq("id", lvl.id);
    if (error) return toast.error("Gagal menghapus level", error.message);
    toast.success("Level dihapus");
    load();
  };

  const move = async (lvl: RaporLevel, direction: "up" | "down") => {
    const idx = levels.findIndex(l => l.id === lvl.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= levels.length) return;
    const other = levels[swapIdx];
    setReordering(lvl.id);
    await Promise.all([
      supabase.from("rapor_levels").update({ sort_order: other.sort_order }).eq("id", lvl.id),
      supabase.from("rapor_levels").update({ sort_order: lvl.sort_order }).eq("id", other.id),
    ]);
    setReordering(null);
    load();
  };

  // ── Criteria ───────────────────────────────────────────────────────────────
  const [criteria, setCriteria] = useState<LevelCriterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const kindLabel: Record<string, string> = { score_10: "Nilai 1–10", score_100: "Nilai 1–100", choice: "Pilihan ganda", text: "Teks bebas" };

  const loadCriteria = useCallback(async (levelId: string) => {
    setLoadingCriteria(true);
    const { data } = await supabase.from("rapor_level_criteria").select("id, label, kind, options, sort_order").eq("level_id", levelId).order("sort_order");
    setCriteria((data ?? []) as LevelCriterion[]);
    setLoadingCriteria(false);
  }, [supabase]);

  const openCriteria = (lvl: RaporLevel) => {
    setCriteriaLevel(lvl);
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    setEditingCriterion(null);
    loadCriteria(lvl.id);
  };

  const addCriterion = async () => {
    if (!criteriaLevel || !criterionForm.label) return toast.error("Label wajib diisi");
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Kriteria ditambahkan");
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    loadCriteria(criteriaLevel.id);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm({ body: "Hapus kriteria ini? Rapor yang sudah diisi tidak akan terpengaruh." });
    if (!yes) return;
    await supabase.from("rapor_level_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success("Kriteria dihapus");
  };

  const updateCriterion = async () => {
    if (!editingCriterion || !editingCriterion.label) return toast.error("Label wajib diisi");
    const opts = editingCriterion.kind === "choice" ? editingCriterion.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").update({ label: editingCriterion.label, kind: editingCriterion.kind, options: opts }).eq("id", editingCriterion.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    setCriteria(prev => prev.map(c => c.id === editingCriterion.id ? { ...c, label: editingCriterion.label, kind: editingCriterion.kind, options: opts } : c));
    setEditingCriterion(null);
    toast.success("Kriteria diperbarui");
  };

  const duplicateCriterion = async (cr: LevelCriterion) => {
    if (!criteriaLevel) return;
    setSavingCriterion(true);
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: cr.label, kind: cr.kind,
      options: cr.options ?? [], sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menduplikat", error.message);
    toast.success("Kriteria diduplikat");
    loadCriteria(criteriaLevel.id);
  };

  const applyBulkKind = async () => {
    if (!criteriaLevel || criteria.length === 0) return;
    const yes = await confirm({ body: `Ubah semua ${criteria.length} kriteria ke tipe "${kindLabel[bulkKind]}"? Options pilihan ganda akan dihapus kecuali tipe yang dipilih adalah pilihan ganda.` });
    if (!yes) return;
    setApplyingBulk(true);
    const opts = bulkKind === "choice" ? ["Sangat Baik", "Baik", "Cukup", "Perlu Latihan"] : null;
    await Promise.all(criteria.map(cr => supabase.from("rapor_level_criteria").update({ kind: bulkKind, options: opts }).eq("id", cr.id)));
    setApplyingBulk(false);
    loadCriteria(criteriaLevel.id);
    toast.success("Semua kriteria diperbarui");
  };

  // ── Personal Best Time template ─────────────────────────────────────────────
  const [bestTimeRows, setBestTimeRows] = useState<BestTimeTemplateRow[]>([]);
  const [loadingBestTimes, setLoadingBestTimes] = useState(false);
  const [btForm, setBtForm] = useState({ stroke: "", distance: "", target: "" });
  const [savingBt, setSavingBt] = useState(false);
  const [editingBt, setEditingBt] = useState<{ id: string; stroke: string; distance: string; target: string } | null>(null);

  const loadBestTimes = useCallback(async (levelId: string) => {
    setLoadingBestTimes(true);
    const { data } = await supabase.from("rapor_level_best_times").select("id, stroke, distance, target_time_seconds, sort_order").eq("level_id", levelId).order("sort_order");
    setBestTimeRows((data ?? []) as BestTimeTemplateRow[]);
    setLoadingBestTimes(false);
  }, [supabase]);

  const openBestTimes = (lvl: RaporLevel) => {
    setBestTimeLevel(lvl);
    setBtForm({ stroke: "", distance: "", target: "" });
    setEditingBt(null);
    loadBestTimes(lvl.id);
  };

  const addBestTimeRow = async () => {
    if (!bestTimeLevel) return;
    const stroke = btForm.stroke.trim();
    const distance = parseInt(btForm.distance);
    if (!stroke || !btForm.distance || isNaN(distance) || distance <= 0) return toast.error("Gaya dan jarak wajib diisi dengan benar");
    const target = btForm.target.trim() ? parseFloat(btForm.target) : null;
    setSavingBt(true);
    const { error } = await supabase.from("rapor_level_best_times").insert({
      level_id: bestTimeLevel.id, stroke, distance, target_time_seconds: target, sort_order: bestTimeRows.length,
    });
    setSavingBt(false);
    if (error) return toast.error("Gagal menambah baris", error.message);
    toast.success("Baris waktu ditambahkan");
    setBtForm({ stroke: "", distance: "", target: "" });
    loadBestTimes(bestTimeLevel.id);
  };

  const deleteBestTimeRow = async (id: string) => {
    const yes = await confirm({ body: "Hapus baris tabel waktu ini?" });
    if (!yes) return;
    await supabase.from("rapor_level_best_times").delete().eq("id", id);
    setBestTimeRows(prev => prev.filter(r => r.id !== id));
    toast.success("Baris dihapus");
  };

  const saveBestTimeEdit = async () => {
    if (!editingBt) return;
    const stroke = editingBt.stroke.trim();
    const distance = parseInt(editingBt.distance);
    if (!stroke || !editingBt.distance || isNaN(distance) || distance <= 0) return toast.error("Gaya dan jarak wajib diisi dengan benar");
    const target = editingBt.target.trim() ? parseFloat(editingBt.target) : null;
    const { error } = await supabase.from("rapor_level_best_times").update({ stroke, distance, target_time_seconds: target }).eq("id", editingBt.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    setBestTimeRows(prev => prev.map(r => r.id === editingBt.id ? { ...r, stroke, distance, target_time_seconds: target } : r));
    setEditingBt(null);
    toast.success("Baris diperbarui");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">Level Rapor</h2>
        <p className="text-ink-mute text-sm mt-0.5">Atur level renang (mis. Level A, Level B). Setiap level punya kriteria penilaian dan standar tabel waktu sendiri — coach tinggal memilih level saat mengisi rapor.</p>
      </div>

      <Card padded={false}>
        <div className="p-4 sm:p-5 border-b border-line flex items-center gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Mis. Level A" className="flex-1" />
          <Btn variant="primary" icon="plus" onClick={addLevel} disabled={creating}>{creating ? "Menambah…" : "Tambah Level"}</Btn>
        </div>

        {loading ? (
          <div className="py-10 text-center text-ink-mute text-sm">Memuat…</div>
        ) : levels.length === 0 ? (
          <div className="py-10 text-center text-ink-mute text-sm">Belum ada level. Tambahkan level pertama di atas.</div>
        ) : (
          <div className="divide-y divide-line">
            {levels.map((lvl, i) => (
              <div key={lvl.id} className="flex items-center gap-3 p-4">
                <div className="flex flex-col shrink-0">
                  <button type="button" disabled={i === 0 || reordering === lvl.id} onClick={() => move(lvl, "up")}
                    className="w-6 h-5 text-xs text-ink-faint hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-ink-faint">↑</button>
                  <button type="button" disabled={i === levels.length - 1 || reordering === lvl.id} onClick={() => move(lvl, "down")}
                    className="w-6 h-5 text-xs text-ink-faint hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-ink-faint">↓</button>
                </div>

                {renaming?.id === lvl.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input value={renaming.name} onChange={e => setRenaming(v => v ? { ...v, name: e.target.value } : v)} className="flex-1" />
                    <Btn variant="primary" size="sm" onClick={saveRename}>Simpan</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setRenaming(null)}>Batal</Btn>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm">{lvl.name}</div>
                      {!lvl.active && <div className="text-xs text-ink-faint">Nonaktif</div>}
                    </div>
                    <Btn variant="ghost" size="sm" icon="book" onClick={() => openCriteria(lvl)}>Kriteria</Btn>
                    <Btn variant="ghost" size="sm" icon="target" onClick={() => openBestTimes(lvl)}>Waktu</Btn>
                    <button onClick={() => setRenaming({ id: lvl.id, name: lvl.name })} title="Ubah nama"
                      className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive(lvl)} title={lvl.active ? "Nonaktifkan" : "Aktifkan"}
                      className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name={lvl.active ? "archive" : "check"} className="w-4 h-4" /></button>
                    <button onClick={() => deleteLevel(lvl)} title="Hapus"
                      className="w-8 h-8 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center"><Icon name="x" className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!criteriaLevel} onClose={() => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); }}
        title={`Kriteria Penilaian — ${criteriaLevel?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); }}>Tutup</Btn>}>
        <div className="space-y-5">
          {loadingCriteria ? <div className="text-ink-mute text-sm text-center py-6">Memuat…</div> : (
            <>
              {criteria.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 bg-paper-tint rounded-xl border border-line">
                    <span className="text-xs text-ink-mute shrink-0">Ubah semua ke:</span>
                    <select value={bulkKind} onChange={e => setBulkKind(e.target.value)}
                      className="flex-1 text-xs border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500">
                      <option value="score_10">Nilai 1–10</option>
                      <option value="score_100">Nilai 1–100</option>
                      <option value="choice">Pilihan ganda</option>
                      <option value="text">Teks bebas</option>
                    </select>
                    <Btn variant="outline" size="sm" onClick={applyBulkKind} disabled={applyingBulk}>{applyingBulk ? "Mengubah…" : "Terapkan"}</Btn>
                  </div>

                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="rounded-xl border border-line overflow-hidden">
                      {editingCriterion?.id === cr.id ? (
                        <div className="p-3 space-y-2 bg-ocean-50/40">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <Field label="Label"><Input value={editingCriterion.label} onChange={e => setEditingCriterion(v => v ? { ...v, label: e.target.value } : v)} /></Field>
                            <Field label="Tipe">
                              <Select value={editingCriterion.kind} onChange={e => setEditingCriterion(v => v ? { ...v, kind: e.target.value } : v)}>
                                <option value="score_10">Nilai 1–10</option>
                                <option value="score_100">Nilai 1–100</option>
                                <option value="choice">Pilihan ganda</option>
                                <option value="text">Teks bebas</option>
                              </Select>
                            </Field>
                          </div>
                          {editingCriterion.kind === "choice" && (
                            <Field label="Pilihan jawaban">
                              <div className="space-y-1.5">
                                {editingCriterion.options.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                                    <Input value={opt} onChange={e => setEditingCriterion(v => { if (!v) return v; const opts = [...v.options]; opts[idx] = e.target.value; return { ...v, options: opts }; })} placeholder={`Pilihan ${idx + 1}`} className="flex-1" />
                                    <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: v.options.filter((_, i) => i !== idx) } : v)} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: [...v.options, ""] } : v)} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                                  <Icon name="plus" className="w-3.5 h-3.5" />Tambah pilihan
                                </button>
                              </div>
                            </Field>
                          )}
                          <div className="flex gap-2">
                            <Btn variant="primary" size="sm" onClick={updateCriterion}>Simpan</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setEditingCriterion(null)}>Batal</Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                          <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm">{cr.label}</div>
                            <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? cr.kind}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                          </div>
                          <button onClick={() => duplicateCriterion(cr)} disabled={savingCriterion}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0 disabled:opacity-50" title="Duplikat">
                            <Icon name="copy" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCriterion({ id: cr.id, label: cr.label, kind: cr.kind, options: cr.options ?? [] })}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title="Edit">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCriterion(cr.id)}
                            className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title="Hapus">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">Belum ada kriteria. Tambahkan di bawah.</p>
              )}

              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tambah Kriteria Baru</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Label kriteria" required><Input value={criterionForm.label} onChange={e => setCriterionForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Teknik gaya bebas" /></Field>
                  <Field label="Tipe penilaian">
                    <Select value={criterionForm.kind} onChange={e => setCriterionForm(f => ({ ...f, kind: e.target.value }))}>
                      <option value="score_10">Nilai 1–10</option>
                      <option value="score_100">Nilai 1–100</option>
                      <option value="choice">Pilihan ganda</option>
                      <option value="text">Teks bebas</option>
                    </Select>
                  </Field>
                </div>
                {criterionForm.kind === "choice" && (
                  <Field label="Pilihan jawaban">
                    <div className="space-y-1.5">
                      {criterionForm.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                          <Input value={opt} onChange={e => setCriterionForm(f => { const opts = [...f.options]; opts[idx] = e.target.value; return { ...f, options: opts }; })} placeholder={`Pilihan ${idx + 1}`} className="flex-1" />
                          <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: [...f.options, ""] }))} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                        <Icon name="plus" className="w-3.5 h-3.5" />Tambah pilihan
                      </button>
                    </div>
                  </Field>
                )}
                <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? "Menyimpan…" : "Tambah Kriteria"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!bestTimeLevel} onClose={() => { setBestTimeLevel(null); setBtForm({ stroke: "", distance: "", target: "" }); setEditingBt(null); }}
        title={`Tabel Personal Best Time — ${bestTimeLevel?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => { setBestTimeLevel(null); setBtForm({ stroke: "", distance: "", target: "" }); setEditingBt(null); }}>Tutup</Btn>}>
        <div className="space-y-5">
          <p className="text-xs text-ink-mute">Baris di sini menentukan gaya &amp; jarak yang muncul di tabel Personal Best Time saat coach mengisi rapor untuk level ini. Standar waktu (opsional) tampil sebagai acuan — coach tetap menginput waktu aktual member.</p>
          {loadingBestTimes ? <div className="text-ink-mute text-sm text-center py-6">Memuat…</div> : (
            <>
              {bestTimeRows.length > 0 ? (
                <div className="space-y-2">
                  {bestTimeRows.map((row, i) => (
                    <div key={row.id} className="rounded-xl border border-line overflow-hidden">
                      {editingBt?.id === row.id ? (
                        <div className="p-3 grid grid-cols-3 gap-2 items-end bg-ocean-50/40">
                          <Field label="Gaya"><Input value={editingBt.stroke} onChange={e => setEditingBt(v => v ? { ...v, stroke: e.target.value } : v)} /></Field>
                          <Field label="Jarak (m)"><Input inputMode="numeric" value={editingBt.distance} onChange={e => setEditingBt(v => v ? { ...v, distance: e.target.value } : v)} /></Field>
                          <Field label="Standar (dtk)"><Input inputMode="decimal" value={editingBt.target} onChange={e => setEditingBt(v => v ? { ...v, target: e.target.value } : v)} placeholder="Opsional" /></Field>
                          <div className="col-span-3 flex gap-2">
                            <Btn variant="primary" size="sm" onClick={saveBestTimeEdit}>Simpan</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setEditingBt(null)}>Batal</Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                          <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm">{row.stroke} · {row.distance}m</div>
                            <div className="text-xs text-ink-mute">{row.target_time_seconds != null ? `Standar: ${fmtSwimTime(row.target_time_seconds)}` : "Tanpa standar waktu"}</div>
                          </div>
                          <button onClick={() => setEditingBt({ id: row.id, stroke: row.stroke, distance: String(row.distance), target: row.target_time_seconds != null ? String(row.target_time_seconds) : "" })}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title="Edit">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteBestTimeRow(row.id)}
                            className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title="Hapus">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">Belum ada baris tabel waktu. Tambahkan di bawah.</p>
              )}

              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tambah Baris Baru</div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Gaya" required><Input value={btForm.stroke} onChange={e => setBtForm(f => ({ ...f, stroke: e.target.value }))} placeholder="Mis. Freestyle" /></Field>
                  <Field label="Jarak (m)" required><Input inputMode="numeric" value={btForm.distance} onChange={e => setBtForm(f => ({ ...f, distance: e.target.value }))} placeholder="50" /></Field>
                  <Field label="Standar (dtk)"><Input inputMode="decimal" value={btForm.target} onChange={e => setBtForm(f => ({ ...f, target: e.target.value }))} placeholder="Opsional" /></Field>
                </div>
                <Btn variant="primary" size="sm" icon="plus" onClick={addBestTimeRow} disabled={savingBt}>{savingBt ? "Menyimpan…" : "Tambah Baris"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function SettingsTarif({ branches }: { branches: Branch[] }) {
  const toast = useToast();
  const supabase = createClient();

  const [coaches, setCoaches] = useState<TarifCoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);

  // Per-expanded-coach data
  const [expandedClasses, setExpandedClasses] = useState<TarifClassRow[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [generalRates, setGeneralRates] = useState<Record<string, string>>({});
  const [coachRates, setCoachRates] = useState<Record<string, string>>({});
  const [extraRateInput, setExtraRateInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    const [{ data: profileData }, { data: ccData }, { data: rateData }, { data: extraData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
      supabase.from("class_coaches").select("coach_id, class_id, classes(branch_id)"),
      supabase.from("coach_rates").select("class_id, coach_id"),
      supabase.from("coach_extra_rates").select("coach_id, rate_per_session"),
    ]);

    const ccRows = (ccData ?? []) as unknown as { coach_id: string; class_id: string; classes: { branch_id: string } | null }[];
    const rateRows = (rateData ?? []) as { class_id: string; coach_id: string | null }[];
    const extraMap = new Map((extraData ?? []).map((e: { coach_id: string; rate_per_session: number }) => [e.coach_id, e.rate_per_session]));

    const classesByCoach = new Map<string, Set<string>>();
    const branchesByCoach = new Map<string, Set<string>>();
    ccRows.forEach(r => {
      if (!classesByCoach.has(r.coach_id)) classesByCoach.set(r.coach_id, new Set());
      classesByCoach.get(r.coach_id)!.add(r.class_id);
      if (r.classes?.branch_id) {
        if (!branchesByCoach.has(r.coach_id)) branchesByCoach.set(r.coach_id, new Set());
        branchesByCoach.get(r.coach_id)!.add(r.classes.branch_id);
      }
    });

    // classes that have at least a general rate
    const classesWithGeneralRate = new Set(rateRows.filter(r => !r.coach_id).map(r => r.class_id));
    // (classId, coachId) pairs with a specific override
    const specificRateKeys = new Set(rateRows.filter(r => r.coach_id).map(r => `${r.class_id}:${r.coach_id}`));

    const rows: TarifCoachRow[] = (profileData ?? []).map(p => {
      const myClassIds = Array.from(classesByCoach.get(p.id) ?? []);
      return {
        id: p.id,
        full_name: p.full_name,
        branchIds: Array.from(branchesByCoach.get(p.id) ?? []),
        classCount: myClassIds.length,
        extraRate: extraMap.get(p.id) ?? null,
        hasIncompleteRate: myClassIds.some(cid => !classesWithGeneralRate.has(cid) && !specificRateKeys.has(`${cid}:${p.id}`)),
      };
    });

    setCoaches(rows);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadCoaches(); }, [loadCoaches]);

  const filteredCoaches = useMemo(() => {
    let r = coaches;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c => c.full_name.toLowerCase().includes(q));
    }
    if (filterBranch !== "all") r = r.filter(c => c.branchIds.includes(filterBranch));
    if (filterStatus === "complete") r = r.filter(c => !c.hasIncompleteRate && c.classCount > 0);
    if (filterStatus === "incomplete") r = r.filter(c => c.hasIncompleteRate);
    if (filterStatus === "no_extra") r = r.filter(c => c.extraRate == null);
    return r;
  }, [coaches, search, filterBranch, filterStatus]);

  const toggleExpand = async (coachId: string) => {
    if (expandedCoachId === coachId) { setExpandedCoachId(null); return; }
    setExpandedCoachId(coachId);
    setLoadingExpanded(true);

    const { data: ccData } = await supabase
      .from("class_coaches")
      .select("class:classes(id, name, branch_id, schedule_days, time_start, time_end, branch:branches(name))")
      .eq("coach_id", coachId);
    const myClasses = ((ccData ?? []) as unknown as { class: TarifClassRow | null }[])
      .map(r => r.class).filter((c): c is TarifClassRow => !!c);
    setExpandedClasses(myClasses);

    const classIds = myClasses.map(c => c.id);
    if (classIds.length > 0) {
      const { data: rateData } = await supabase
        .from("coach_rates")
        .select("class_id, coach_id, rate_per_session")
        .in("class_id", classIds);
      const gen: Record<string, string> = {};
      const cch: Record<string, string> = {};
      (rateData as CoachRate[] ?? []).forEach(r => {
        if (!r.coach_id) gen[r.class_id] = String(r.rate_per_session ?? "");
        else if (r.coach_id === coachId) cch[`${r.class_id}:${coachId}`] = String(r.rate_per_session ?? "");
      });
      setGeneralRates(gen);
      setCoachRates(cch);
    } else {
      setGeneralRates({});
      setCoachRates({});
    }

    const { data: extraRow } = await supabase.from("coach_extra_rates").select("rate_per_session").eq("coach_id", coachId).maybeSingle();
    setExtraRateInput(extraRow ? String(extraRow.rate_per_session) : "");
    setLoadingExpanded(false);
  };

  const saveGeneral = async (classId: string) => {
    const val = Number(generalRates[classId]);
    if (!val || val <= 0) return toast.error("Masukkan nominal tarif yang valid");
    const key = `gen:${classId}`;
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).is("coach_id", null).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate: val, rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: null, rate: val, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Tarif umum disimpan");
    loadCoaches();
  };

  const saveCoachRate = async (classId: string, coachId: string) => {
    const key = `spec:${classId}:${coachId}`;
    const rawVal = coachRates[`${classId}:${coachId}`];
    if (!rawVal || rawVal === "") {
      setSaving(key);
      await supabase.from("coach_rates").delete().eq("class_id", classId).eq("coach_id", coachId);
      setSaving(null);
      setCoachRates(prev => { const n = { ...prev }; delete n[`${classId}:${coachId}`]; return n; });
      toast.success("Tarif khusus dihapus — akan pakai tarif umum");
      loadCoaches();
      return;
    }
    const val = Number(rawVal);
    if (!val || val <= 0) return toast.error("Masukkan nominal tarif yang valid");
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate: val, rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: coachId, rate: val, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Tarif khusus disimpan");
    loadCoaches();
  };

  const saveExtraRate = async (coachId: string) => {
    const val = Number(extraRateInput);
    if (!val || val <= 0) return toast.error("Masukkan nominal tarif extra yang valid");
    setSaving("extra");
    const { data: existing } = await supabase.from("coach_extra_rates").select("id").eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_extra_rates").update({ rate_per_session: val, updated_at: new Date().toISOString() }).eq("id", existing.id)
      : supabase.from("coach_extra_rates").insert({ coach_id: coachId, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Tarif extra disimpan");
    loadCoaches();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">Tarif Coach</h2>
        <p className="text-ink-mute text-sm mt-0.5">Kelola tarif per sesi tiap coach — klik baris untuk lihat &amp; atur tarif per kelas, plus tarif extra sesi di luar kelas reguler.</p>
      </div>

      {/* Toolbar filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama coach…" className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-white focus:outline-none focus:ring-1 focus:ring-ocean-400" />
        </div>
        {branches.length > 1 && (
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="text-sm rounded-xl border border-line bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
            <option value="all">Semua Cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm rounded-xl border border-line bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
          <option value="all">Semua Status</option>
          <option value="complete">Tarif Lengkap</option>
          <option value="incomplete">Tarif Belum Lengkap</option>
          <option value="no_extra">Belum Ada Tarif Extra</option>
        </select>
        <span className="text-xs text-ink-mute self-center ml-auto">{filteredCoaches.length} coach</span>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute text-sm">Memuat data…</div>
        ) : filteredCoaches.length === 0 ? (
          <div className="p-10 text-center text-ink-mute text-sm">Tidak ada coach yang cocok dengan filter.</div>
        ) : (
          <div className="divide-y divide-line">
            {filteredCoaches.map(c => {
              const incomplete = c.hasIncompleteRate;
              const isExpanded = expandedCoachId === c.id;
              return (
                <div key={c.id}>
                  <button onClick={() => toggleExpand(c.id)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-paper-tint text-left">
                    <Avatar name={c.full_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink">{c.full_name}</div>
                      <div className="text-xs text-ink-mute mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {c.branchIds.length === 0 ? (
                          <span className="text-ink-faint">Belum ada kelas</span>
                        ) : (
                          c.branchIds.map(bid => (
                            <span key={bid} className="px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold">{branches.find(b => b.id === bid)?.name ?? "—"}</span>
                          ))
                        )}
                        <span>· {c.classCount} kelas</span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      <div className="text-xs text-ink-faint">Tarif Extra</div>
                      <div className="font-mono text-sm font-semibold">{c.extraRate != null ? fmtIDR(c.extraRate) : <span className="text-ink-faint">Belum diisi</span>}</div>
                    </div>
                    {c.classCount > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${incomplete ? "bg-warn-50 text-warn-700" : "bg-ok-50 text-ok-700"}`}>
                        {incomplete ? "Belum Lengkap" : "Lengkap"}
                      </span>
                    )}
                    <Icon name={isExpanded ? "chevronD" : "chevron"} className="w-4 h-4 text-ink-faint shrink-0" />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-paper-tint/60 space-y-4">
                      {loadingExpanded ? (
                        <div className="py-6 text-center text-ink-mute text-sm">Memuat…</div>
                      ) : (
                        <>
                          {expandedClasses.length === 0 ? (
                            <p className="text-xs text-ink-faint italic py-2">Coach ini belum ditugaskan ke kelas manapun.</p>
                          ) : (
                            <div className="space-y-3">
                              {expandedClasses.map(cls => {
                                const genKey = `gen:${cls.id}`;
                                const specKey = `spec:${cls.id}:${c.id}`;
                                return (
                                  <div key={cls.id} className="bg-white border border-line rounded-xl p-3.5 space-y-3">
                                    <div>
                                      <div className="font-semibold text-sm text-ink">{cls.name}</div>
                                      <div className="text-xs text-ink-mute mt-0.5">
                                        {cls.branch?.name ?? "—"}
                                        {cls.time_start && <span className="font-mono"> · {cls.time_start.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</span>}
                                      </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Field label="Tarif Umum" hint="Berlaku semua coach di kelas ini">
                                            <Input type="text" inputMode="numeric"
                                              value={generalRates[cls.id] ? Number(generalRates[cls.id]).toLocaleString("id-ID") : ""}
                                              onChange={e => setGeneralRates(r => ({ ...r, [cls.id]: e.target.value.replace(/\D/g, "") }))}
                                              className="font-mono text-sm" placeholder="150.000" />
                                          </Field>
                                        </div>
                                        <Btn variant="soft" size="sm" onClick={() => saveGeneral(cls.id)} disabled={saving === genKey}>{saving === genKey ? "…" : "Simpan"}</Btn>
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Field label="Tarif Khusus" hint="Override milik coach ini saja">
                                            <Input type="text" inputMode="numeric"
                                              value={coachRates[`${cls.id}:${c.id}`] ? Number(coachRates[`${cls.id}:${c.id}`]).toLocaleString("id-ID") : ""}
                                              onChange={e => setCoachRates(r => ({ ...r, [`${cls.id}:${c.id}`]: e.target.value.replace(/\D/g, "") }))}
                                              className="font-mono text-sm"
                                              placeholder={generalRates[cls.id] ? `Pakai umum (${Number(generalRates[cls.id]).toLocaleString("id-ID")})` : "Belum ada tarif umum"} />
                                          </Field>
                                        </div>
                                        <Btn variant="soft" size="sm" onClick={() => saveCoachRate(cls.id, c.id)} disabled={saving === specKey}>
                                          {saving === specKey ? "…" : coachRates[`${cls.id}:${c.id}`] ? "Simpan" : "Hapus"}
                                        </Btn>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <Card className="!bg-white space-y-2">
                            <div>
                              <div className="text-sm font-bold text-ink">Tarif Extra</div>
                              <p className="text-xs text-ink-mute mt-0.5">Tarif tambahan per 1x sesi extra di luar kelas reguler, berlaku global untuk coach ini.</p>
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1 max-w-56">
                                <Input type="text" inputMode="numeric"
                                  value={extraRateInput ? Number(extraRateInput).toLocaleString("id-ID") : ""}
                                  onChange={e => setExtraRateInput(e.target.value.replace(/\D/g, ""))}
                                  className="font-mono text-sm" placeholder="100.000" />
                              </div>
                              <Btn variant="soft" size="sm" onClick={() => saveExtraRate(c.id)} disabled={saving === "extra"}>{saving === "extra" ? "…" : "Simpan"}</Btn>
                            </div>
                          </Card>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Invoices({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("all");
  const [marking, setMarking] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<Invoice | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detail, setDetail] = useState<Invoice | null>(null);

  const totPending  = invoices.filter(i => i.status === "pending");
  const totApproved = invoices.filter(i => i.status === "approved");
  const totPaid     = invoices.filter(i => i.status === "paid");

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    setLoading(true);
    const q = supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, branch_id, submitted_at, paid_at, approved_at, rejected_at, rejection_reason, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(id, full_name), coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))")
      .not("status", "eq", "cancelled")
      .order("submitted_at", { ascending: false });
    if (branchFilter !== "all") q.eq("branch_id", branchFilter);
    q.then(({ data }) => {
      if (data) setInvoices(data as unknown as Invoice[]);
      setLoading(false);
    });
  }, [branchFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const invoicesWithoutSlip = useMemo(() => {
    return invoices.filter(i => i.status === "paid");
  }, [invoices]);

  const markPaid = async (id: string) => {
    setMarking(id);
    const { error } = await supabase.from("coach_invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    setMarking(null);
    if (error) return toast.error("Gagal update", error.message);
    const inv = invoices.find(i => i.id === id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", paid_at: new Date().toISOString() } : i));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: "paid", paid_at: new Date().toISOString() } : prev);
    toast.success("Invoice ditandai lunas");
    logActivity(supabase, { userId, userRole: "owner", userName, branchId: inv?.branch?.name ? undefined : undefined, entityType: "coach_invoices", entityId: id, entityLabel: inv?.invoice_number ?? id, action: "update", label: `Invoice ${inv?.invoice_number ?? id} — ${inv?.coach?.full_name ?? "coach"} ditandai lunas (${fmtIDR(inv?.total_amount ?? 0)})`, meta: { amount: inv?.total_amount, coach: inv?.coach?.full_name } });
  };

  const approveInvoice = async (id: string) => {
    setApproving(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("coach_invoices").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    setApproving(null);
    if (error) return toast.error("Gagal menyetujui", error.message);
    const inv = invoices.find(i => i.id === id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "approved", approved_at: new Date().toISOString() } : i));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: "approved" } : prev);
    if (inv?.coach?.id) {
      await supabase.from("notifications").insert({ user_id: inv.coach.id, title: "Invoice disetujui", body: `Invoice ${inv.invoice_number} (${inv.period_label}) telah disetujui. Menunggu pembayaran.`, icon: "check", kind: "success" });
    }
    toast.success("Invoice disetujui");
    logActivity(supabase, { userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: id, entityLabel: inv?.invoice_number ?? id, action: "update", label: `Invoice ${inv?.invoice_number ?? id} disetujui` });
  };

  const rejectInvoice = async (id: string, reason: string) => {
    if (!reason.trim()) return toast.error("Isi alasan penolakan");
    setRejecting(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("coach_invoices").update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason.trim() }).eq("id", id);
    setRejecting(null);
    if (error) return toast.error("Gagal menolak", error.message);
    const inv = invoices.find(i => i.id === id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "rejected", rejection_reason: reason } : i));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: "rejected", rejection_reason: reason } : prev);
    if (inv?.coach?.id) {
      await supabase.from("notifications").insert({ user_id: inv.coach.id, title: "Invoice ditolak", body: `Invoice ${inv.invoice_number} (${inv.period_label}) ditolak. Alasan: ${reason}`, icon: "warning", kind: "warn" });
    }
    setRejectModal(null);
    setRejectReason("");
    toast.success("Invoice ditolak");
    logActivity(supabase, { userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: id, entityLabel: inv?.invoice_number ?? id, action: "update", label: `Invoice ${inv?.invoice_number ?? id} ditolak: ${reason}` });
  };

  const printInvoice = (iv: Invoice) => {
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    // Group items by class (or unique per extra/reimburse row)
    const itemMap: Record<string, { name: string; sessions: number; rate: number }> = {};
    (iv.coach_invoice_items ?? []).forEach(item => {
      const key = item.item_type === "class" ? (item.class_id ?? item.id) : item.id;
      const label = item.item_type === "extra" ? "Sesi Extra"
        : item.item_type === "reimburse" ? `Reimburse — ${item.description ?? ""}`
        : (item.class?.name ?? item.class_id ?? "—");
      if (!itemMap[key]) itemMap[key] = { name: label, sessions: 0, rate: item.rate };
      itemMap[key].sessions += item.session_count;
    });
    const itemRows = Object.values(itemMap).map(item =>
      `<div class="row"><span>${item.name}</span><span>${item.sessions} sesi × Rp ${item.rate.toLocaleString("id-ID")} = <b>Rp ${(item.sessions * item.rate).toLocaleString("id-ID")}</b></span></div>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>${iv.invoice_number}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#0f172a;max-width:640px;margin:auto}
      h1{font-size:22px;font-weight:700;margin-bottom:2px}.sub{font-size:13px;color:#64748b;margin-bottom:20px}
      .section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:20px 0 6px}
      .meta{background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.8}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
      .total{display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:4px}
      .badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${iv.status === "paid" ? "#dcfce7" : "#fef9c3"};color:${iv.status === "paid" ? "#166534" : "#854d0e"}}
      footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
      </style></head><body>
      <h1>Invoice Coach</h1>
      <div class="sub">${iv.invoice_number} &nbsp;·&nbsp; <span class="badge">${iv.status === "paid" ? "Lunas" : "Pending"}</span></div>
      <div class="section">Informasi</div>
      <div class="meta"><b>Periode:</b> ${iv.period_label}<br/><b>Coach:</b> ${iv.coach?.full_name ?? "—"}<br/><b>Cabang:</b> ${iv.branch?.name ?? "—"}<br/><b>Rekening:</b> ${iv.bank_info ?? "—"}${iv.paid_at ? `<br/><b>Dibayar:</b> ${new Date(iv.paid_at).toLocaleDateString("id-ID", { dateStyle: "long" })}` : ""}</div>
      <div class="section">Rincian Kelas</div>
      ${itemRows || '<div class="row"><span style="color:#94a3b8">Tidak ada rincian</span></div>'}
      <div class="total"><span>Total</span><span>Rp ${iv.total_amount.toLocaleString("id-ID")}</span></div>
      <footer>Next Swimming School &nbsp;·&nbsp; Dicetak ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</footer>
      </body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl">Slip Gaji</h2>
          <p className="text-ink-mute text-sm mt-0.5">Review invoice coach, setujui, tandai lunas, lalu terbitkan slip gaji — semua dalam satu tempat.</p>
        </div>
        <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-44">
          <option value="all">Semua cabang</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Menunggu review"        value={totPending.length}                                                   icon="invoice" tone="warn"  sub={totPending.length > 0 ? "perlu tindakan" : "tidak ada"} />
        <Stat label="Disetujui / belum lunas" value={fmtIDR(totApproved.reduce((a, i) => a + i.total_amount, 0))}      icon="check"   tone="ocean" sub={`${totApproved.length} invoice`} />
        <Stat label="Sudah dibayar"          value={fmtIDR(totPaid.reduce((a, i) => a + i.total_amount, 0))}            icon="wallet"  tone="ok"    sub={`${totPaid.length} invoice`} />
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">Memuat data…</div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center text-ink-mute">Tidak ada invoice.</div>
        ) : (
          <div className="divide-y divide-line">
            {invoices.map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper-tint">
                <span className="w-9 h-9 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0">
                  <Icon name="invoice" className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetail(iv)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-ocean-700">{iv.invoice_number}</span>
                    <Status kind={iv.status === "paid" ? "paid" : iv.status === "approved" ? "approved" : iv.status === "rejected" ? "rejected" : "pending"}>
                      {iv.status === "paid" ? "Lunas" : iv.status === "approved" ? "Disetujui" : iv.status === "rejected" ? "Ditolak" : "Menunggu Review"}
                    </Status>
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5">
                    {iv.coach?.full_name ?? "—"} · {iv.branch?.name ?? "—"} · {iv.period_label}
                  </div>
                </div>
                <div className="font-mono font-bold text-sm shrink-0">{fmtIDR(iv.total_amount)}</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => printInvoice(iv)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600" title="Cetak PDF">
                    <Icon name="print" className="w-4 h-4" />
                  </button>
                  {iv.status === "pending" && (
                    <>
                      <Btn variant="soft" size="sm" onClick={() => approveInvoice(iv.id)} disabled={approving === iv.id}>
                        {approving === iv.id ? "…" : "Setujui"}
                      </Btn>
                      <Btn variant="ghost" size="sm" onClick={() => { setRejectModal(iv); setRejectReason(""); }}>
                        Tolak
                      </Btn>
                    </>
                  )}
                  {iv.status === "approved" && (
                    <Btn variant="primary" size="sm" onClick={() => markPaid(iv.id)} disabled={marking === iv.id}>
                      {marking === iv.id ? "…" : "Lunas"}
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.invoice_number ?? "Detail Invoice"} size="md"
        footer={
          <div className="flex items-center gap-2 justify-between w-full">
            <Btn variant="ghost" icon="print" onClick={() => detail && printInvoice(detail)}>Cetak PDF</Btn>
            <div className="flex gap-2">
              {detail?.status === "pending" && (
                <>
                  <Btn variant="primary" onClick={() => detail && approveInvoice(detail.id)} disabled={approving === detail?.id}>
                    {approving === detail?.id ? "…" : "Setujui"}
                  </Btn>
                  <Btn variant="ghost" onClick={() => { setRejectModal(detail); setDetail(null); }}>Tolak</Btn>
                </>
              )}
              {detail?.status === "approved" && (
                <Btn variant="primary" onClick={() => detail && markPaid(detail.id)} disabled={marking === detail?.id}>
                  {marking === detail?.id ? "Menyimpan…" : "Tandai Lunas"}
                </Btn>
              )}
              <Btn variant="ghost" onClick={() => setDetail(null)}>Tutup</Btn>
            </div>
          </div>
        }>
        {detail && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Coach</div><div className="font-semibold">{detail.coach?.full_name ?? "—"}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Cabang</div><div className="font-semibold">{detail.branch?.name ?? "—"}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Periode</div><div>{detail.period_label}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Status</div><Status kind={detail.status === "paid" ? "paid" : detail.status === "approved" ? "approved" : detail.status === "rejected" ? "rejected" : "pending"}>{detail.status === "paid" ? "Lunas" : detail.status === "approved" ? "Disetujui" : detail.status === "rejected" ? "Ditolak" : "Menunggu Review"}</Status></div>
              <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Rekening</div><div className="font-mono text-sm">{detail.bank_info ?? "—"}</div></div>
              {detail.paid_at && <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Dibayar pada</div><div>{new Date(detail.paid_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</div></div>}
            </div>

            {/* Items breakdown */}
            <div className="border-t border-line pt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">Rincian Kelas</div>
              {(detail.coach_invoice_items ?? []).length === 0 ? (
                <p className="text-sm text-ink-mute">Tidak ada rincian.</p>
              ) : (
                <div className="space-y-1.5">
                  {/* Group by class (or unique per extra/reimburse row) */}
                  {(() => {
                    const map: Record<string, { name: string; sessions: number; rate: number; proofUrl: string | null }> = {};
                    (detail.coach_invoice_items ?? []).forEach(item => {
                      const key = item.item_type === "class" ? (item.class_id ?? item.id) : item.id;
                      const label = item.item_type === "extra" ? "Sesi Extra"
                        : item.item_type === "reimburse" ? `Reimburse — ${item.description ?? ""}`
                        : (item.class?.name ?? item.class_id ?? "—");
                      if (!map[key]) map[key] = { name: label, sessions: 0, rate: item.rate, proofUrl: item.proof_url };
                      map[key].sessions += item.session_count;
                    });
                    return Object.values(map).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-line text-sm">
                        <div>
                          <div className="font-semibold text-ink">{item.name}</div>
                          <div className="text-xs text-ink-mute">{item.sessions} sesi × {fmtIDR(item.rate)}</div>
                          {item.proofUrl && (
                            <a href={item.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-ocean-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                              <Icon name="link" className="w-3 h-3" />Lihat bukti
                            </a>
                          )}
                        </div>
                        <div className="font-mono font-bold">{fmtIDR(item.sessions * item.rate)}</div>
                      </div>
                    ));
                  })()}
                  <div className="flex items-center justify-between pt-2 font-bold text-sm">
                    <span>Total</span>
                    <span className="font-mono text-ocean-700 text-base">{fmtIDR(detail.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(""); }} title="Tolak Invoice" size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Batal</Btn>
            <Btn variant="danger" onClick={() => rejectModal && rejectInvoice(rejectModal.id, rejectReason)} disabled={!!rejecting}>
              {rejecting ? "Menolak…" : "Tolak Invoice"}
            </Btn>
          </>
        }>
        {rejectModal && (
          <div className="space-y-4">
            <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 text-sm">
              <div className="text-xs text-ink-mute font-bold uppercase tracking-widest mb-1">Invoice</div>
              <div className="font-mono font-semibold text-ink">{rejectModal.invoice_number}</div>
              <div className="text-xs text-ink-mute">{rejectModal.coach?.full_name} · {rejectModal.period_label} · {fmtIDR(rejectModal.total_amount)}</div>
            </div>
            <Field label="Alasan penolakan">
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Contoh: Ada sesi yang belum diverifikasi, mohon periksa kembali." rows={3} />
            </Field>
          </div>
        )}
      </Modal>

      {/* ── SLIP GAJI ───────────────────────────────────────────────────────── */}
      <div className="mt-8 pt-8 border-t border-line">
        <PayslipGenerator branches={branches} userId={userId} userName={userName} invoices={invoices} invoicesWithoutSlip={invoicesWithoutSlip} />
      </div>
    </div>
  );
}

// ── OwnerFinancial ─────────────────────────────────────────────────────────────

interface OwnerFinancialBill {
  id: string; branch_id: string; member_id: string; period_label: string;
  amount: number; discount: number; total: number; status: string; type: string;
  paid_at: string | null; paid_method: string | null; created_at: string;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
  branch?: { name: string } | null;
}

interface OwnerFinancialExpense {
  id: string; coach_id: string; branch_id: string; period_label: string;
  total_amount: number; status: string; paid_at: string | null; created_at: string;
  invoice_number: string | null;
  coach?: { full_name: string } | null;
  branch?: { name: string } | null;
}

interface ManualTxnRow {
  id: string; branch_id: string; kind: "income" | "expense"; category: string | null;
  description: string; amount: number; occurred_at: string; notes: string | null;
  is_reimburse: boolean; proof_url: string | null;
  branch?: { name: string } | null;
}

type IncomeRow = (OwnerFinancialBill & { source: "bill" }) | (ManualTxnRow & { source: "manual" });
type ExpenseRow = (OwnerFinancialExpense & { source: "invoice" }) | (ManualTxnRow & { source: "manual" });

const MANUAL_CATEGORY_OPTIONS = ["Sponsorship", "Sewa", "Listrik", "Perlengkapan", "Lainnya"];

type FinancialTab = "overview" | "income" | "expenses" | "moneyflow";

function OwnerFinancial({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<FinancialTab>("overview");

  // ── Data ────────────────────────────────────────────────────────────────────
  const [bills, setBills] = useState<OwnerFinancialBill[]>([]);
  const [expenses, setExpenses] = useState<OwnerFinancialExpense[]>([]);
  const [manualTxns, setManualTxns] = useState<ManualTxnRow[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // ── Income filters ──────────────────────────────────────────────────────────
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeStatus, setIncomeStatus] = useState("");
  const [incomeBranch, setIncomeBranch] = useState("all");
  const [incomeType, setIncomeType] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("");
  const [incomeDateFrom, setIncomeDateFrom] = useState("");
  const [incomeDateTo, setIncomeDateTo] = useState("");
  const [incomePage, setIncomePage] = useState(0);
  const [incomeSortBy, setIncomeSortBy] = useState<"paid_at" | "total">("paid_at");
  const [incomeSortDir, setIncomeSortDir] = useState<"asc" | "desc">("desc");

  // ── Expenses filters ────────────────────────────────────────────────────────
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatus, setExpenseStatus] = useState("");
  const [expenseBranch, setExpenseBranch] = useState("all");
  const [expenseReimburseFilter, setExpenseReimburseFilter] = useState("all");
  const [expensePage, setExpensePage] = useState(0);

  const PAGE_SIZE = 25;

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  useEffect(() => {
    setLoadingBills(true);
    supabase.from("bills")
      .select("id, branch_id, member_id, period_label, amount, discount, total, status, type, paid_at, paid_method, created_at, member:members(profile:profiles(full_name)), class:classes(name), branch:branches(name)")
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => { if (data) setBills(data as unknown as OwnerFinancialBill[]); setLoadingBills(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingExpenses(true);
    supabase.from("coach_invoices")
      .select("id, coach_id, branch_id, period_label, total_amount, status, paid_at, created_at, invoice_number, coach:profiles!coach_invoices_coach_id_fkey(full_name), branch:branches(name)")
      .order("submitted_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => { if (data) setExpenses(data as unknown as OwnerFinancialExpense[]); setLoadingExpenses(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-enable react-hooks/set-state-in-effect */

  const loadManualTxns = useCallback(async () => {
    const { data } = await supabase.from("manual_transactions")
      .select("id, branch_id, kind, category, description, amount, occurred_at, notes, is_reimburse, proof_url, branch:branches(name)")
      .order("occurred_at", { ascending: false });
    if (data) setManualTxns(data as unknown as ManualTxnRow[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadManualTxns(); }, [loadManualTxns]);

  // ── Manual transaction CRUD ──────────────────────────────────────────────────
  const [showTxnModal, setShowTxnModal] = useState<{ kind: "income" | "expense"; edit: ManualTxnRow | null } | null>(null);
  const [txnForm, setTxnForm] = useState({ branch_id: "", category: MANUAL_CATEGORY_OPTIONS[0], categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
  const [savingTxn, setSavingTxn] = useState(false);

  const openAddTxn = (kind: "income" | "expense") => {
    setTxnForm({ branch_id: branches[0]?.id ?? "", category: MANUAL_CATEGORY_OPTIONS[0], categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
    setShowTxnModal({ kind, edit: null });
  };

  const openEditTxn = (row: ManualTxnRow) => {
    const knownCategory = MANUAL_CATEGORY_OPTIONS.includes(row.category ?? "") ? (row.category ?? MANUAL_CATEGORY_OPTIONS[0]) : "Lainnya";
    setTxnForm({
      branch_id: row.branch_id, category: knownCategory, categoryOther: knownCategory === "Lainnya" ? (row.category ?? "") : "",
      description: row.description, amount: String(row.amount), occurred_at: row.occurred_at, notes: row.notes ?? "",
      isReimburse: row.is_reimburse, proofUrl: row.proof_url ?? "",
    });
    setShowTxnModal({ kind: row.kind, edit: row });
  };

  const saveTxn = async () => {
    if (!showTxnModal) return;
    if (!txnForm.branch_id) return toast.error("Pilih cabang terlebih dahulu");
    if (!txnForm.description.trim()) return toast.error("Deskripsi wajib diisi");
    const amount = Number(txnForm.amount || 0);
    if (!amount || amount <= 0) return toast.error("Masukkan nominal yang valid");
    if (txnForm.isReimburse && !txnForm.proofUrl.trim()) return toast.error("Masukkan link bukti untuk pengeluaran reimburse");
    const category = txnForm.category === "Lainnya" ? (txnForm.categoryOther.trim() || "Lainnya") : txnForm.category;

    setSavingTxn(true);
    const payload = {
      branch_id: txnForm.branch_id, kind: showTxnModal.kind, category, description: txnForm.description.trim(),
      amount, occurred_at: txnForm.occurred_at, notes: txnForm.notes.trim() || null,
      is_reimburse: txnForm.isReimburse, proof_url: txnForm.isReimburse ? txnForm.proofUrl.trim() : null,
    };
    const isEdit = !!showTxnModal.edit;
    const { error } = isEdit
      ? await supabase.from("manual_transactions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", showTxnModal.edit!.id)
      : await supabase.from("manual_transactions").insert({ ...payload, created_by: userId, created_by_role: "owner" });
    setSavingTxn(false);
    if (error) return toast.error(isEdit ? "Gagal menyimpan" : "Gagal menambah", error.message);
    toast.success(isEdit ? "Transaksi diperbarui" : "Transaksi ditambahkan");
    logActivity(supabase, {
      userId, userRole: "owner", userName, branchId: txnForm.branch_id, entityType: "manual_transactions",
      entityId: showTxnModal.edit?.id ?? "new", action: isEdit ? "update" : "create",
      label: `${showTxnModal.kind === "income" ? "Income" : "Expense"} manual "${txnForm.description.trim()}" (${fmtIDR(amount)}) ${isEdit ? "diperbarui" : "ditambahkan"}`,
      meta: { amount, category },
    });
    setShowTxnModal(null);
    loadManualTxns();
  };

  const deleteTxn = async (row: ManualTxnRow) => {
    const ok = await confirm({ title: "Hapus transaksi manual?", body: `"${row.description}" (${fmtIDR(row.amount)}) akan dihapus permanen.`, confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("manual_transactions").delete().eq("id", row.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    toast.success("Transaksi dihapus");
    logActivity(supabase, {
      userId, userRole: "owner", userName, branchId: row.branch_id, entityType: "manual_transactions",
      entityId: row.id, action: "delete", label: `${row.kind === "income" ? "Income" : "Expense"} manual "${row.description}" (${fmtIDR(row.amount)}) dihapus`,
    });
    setManualTxns(prev => prev.filter(t => t.id !== row.id));
  };

  // ── Computed: income summary ────────────────────────────────────────────────
  const manualIncome = useMemo(() => manualTxns.filter(t => t.kind === "income"), [manualTxns]);
  const manualExpense = useMemo(() => manualTxns.filter(t => t.kind === "expense"), [manualTxns]);
  const paidBills = useMemo(() => bills.filter(b => b.status === "paid"), [bills]);
  const totalIncome = useMemo(() => paidBills.reduce((s, b) => s + b.total, 0) + manualIncome.reduce((s, t) => s + t.amount, 0), [paidBills, manualIncome]);
  const totalExpenses = useMemo(() => expenses.filter(e => e.status === "paid").reduce((s, e) => s + e.total_amount, 0) + manualExpense.reduce((s, t) => s + t.amount, 0), [expenses, manualExpense]);
  const netAmount = totalIncome - totalExpenses;

  // ── Chart period selector ────────────────────────────────────────────────────
  const [chartMonths, setChartMonths] = useState<3 | 6 | 12>(6);

  // ── Bar chart data (dynamic period) ─────────────────────────────────────────
  const barChartData = useMemo(() => {
    const months: { label: string; key: string; income: number; expense: number; net: number }[] = [];
    const now = new Date();
    for (let i = chartMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      const income = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(key)).reduce((s, b) => s + b.total, 0)
        + manualIncome.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      const expense = expenses.filter(e => e.status === "paid" && (e.paid_at ?? e.created_at).startsWith(key)).reduce((s, e) => s + e.total_amount, 0)
        + manualExpense.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      months.push({ label, key, income, expense, net: income - expense });
    }
    return months;
  }, [paidBills, expenses, manualIncome, manualExpense, chartMonths]);

  const barMax = useMemo(() => Math.max(1, ...barChartData.map(m => Math.max(m.income, m.expense))), [barChartData]);

  // ── Branch income breakdown ─────────────────────────────────────────────────
  const branchIncomeMap = useMemo(() => {
    const map: Record<string, number> = {};
    paidBills.forEach(b => { map[b.branch_id] = (map[b.branch_id] ?? 0) + b.total; });
    manualIncome.forEach(t => { map[t.branch_id] = (map[t.branch_id] ?? 0) + t.amount; });
    return map;
  }, [paidBills, manualIncome]);
  const maxBranchIncome = useMemo(() => Math.max(1, ...Object.values(branchIncomeMap)), [branchIncomeMap]);

  // ── Income table filtered (merges bills + manual income) ───────────────────
  const incomeSortDate = (r: IncomeRow) => r.source === "manual" ? r.occurred_at : (r.paid_at ?? r.created_at);
  const incomeSortAmount = (r: IncomeRow) => r.source === "manual" ? r.amount : r.total;

  const filteredIncome = useMemo(() => {
    let r: IncomeRow[] = [
      ...bills.map(b => ({ ...b, source: "bill" as const })),
      ...manualIncome.map(t => ({ ...t, source: "manual" as const })),
    ];
    if (incomeStatus) r = r.filter(row => row.source === "manual" || row.status === incomeStatus);
    if (incomeBranch !== "all") r = r.filter(row => row.branch_id === incomeBranch);
    if (incomeType) r = r.filter(row => row.source === "manual" || row.type === incomeType);
    if (incomeMethod) r = r.filter(row => row.source === "manual" || row.paid_method === incomeMethod);
    if (incomeDateFrom) r = r.filter(row => incomeSortDate(row) >= incomeDateFrom);
    if (incomeDateTo) r = r.filter(row => incomeSortDate(row) <= incomeDateTo + "T23:59:59");
    if (incomeSearch) {
      const q = incomeSearch.toLowerCase();
      r = r.filter(row => row.source === "manual"
        ? row.description.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
        : row.member?.profile?.full_name?.toLowerCase().includes(q) || row.period_label.toLowerCase().includes(q) || row.class?.name?.toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b) => {
      const va = incomeSortBy === "total" ? incomeSortAmount(a) : incomeSortDate(a);
      const vb = incomeSortBy === "total" ? incomeSortAmount(b) : incomeSortDate(b);
      return incomeSortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [bills, manualIncome, incomeStatus, incomeBranch, incomeType, incomeMethod, incomeDateFrom, incomeDateTo, incomeSearch, incomeSortBy, incomeSortDir]);

  useEffect(() => { setIncomePage(0); }, [incomeStatus, incomeBranch, incomeType, incomeMethod, incomeDateFrom, incomeDateTo, incomeSearch]);

  const incomeTotalPages = Math.max(1, Math.ceil(filteredIncome.length / PAGE_SIZE));
  const incomeSafePage = Math.min(incomePage, Math.max(0, incomeTotalPages - 1));
  const incomePagedRows = filteredIncome.slice(incomeSafePage * PAGE_SIZE, (incomeSafePage + 1) * PAGE_SIZE);

  // ── Expenses table filtered (merges coach_invoices + manual expense) ───────
  const filteredExpenses = useMemo(() => {
    let r: ExpenseRow[] = [
      ...expenses.map(e => ({ ...e, source: "invoice" as const })),
      ...manualExpense.map(t => ({ ...t, source: "manual" as const })),
    ];
    if (expenseStatus) r = r.filter(row => row.source === "manual" || row.status === expenseStatus);
    if (expenseBranch !== "all") r = r.filter(row => row.branch_id === expenseBranch);
    if (expenseReimburseFilter === "reimburse") r = r.filter(row => row.source === "manual" && row.is_reimburse);
    if (expenseReimburseFilter === "non_reimburse") r = r.filter(row => !(row.source === "manual" && row.is_reimburse));
    if (expenseSearch) {
      const q = expenseSearch.toLowerCase();
      r = r.filter(row => row.source === "manual"
        ? row.description.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
        : row.coach?.full_name?.toLowerCase().includes(q) || row.period_label.toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q) || (row.invoice_number ?? "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [expenses, manualExpense, expenseStatus, expenseBranch, expenseReimburseFilter, expenseSearch]);

  useEffect(() => { setExpensePage(0); }, [expenseStatus, expenseBranch, expenseSearch]);

  const expenseTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const expenseSafePage = Math.min(expensePage, Math.max(0, expenseTotalPages - 1));
  const expensePagedRows = filteredExpenses.slice(expenseSafePage * PAGE_SIZE, (expenseSafePage + 1) * PAGE_SIZE);

  // ── Money Flow monthly data ─────────────────────────────────────────────────
  const moneyFlowData = useMemo(() => {
    const months: { label: string; key: string; income: number; expense: number; net: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const income = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(key)).reduce((s, b) => s + b.total, 0)
        + manualIncome.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      const expense = expenses.filter(e => e.status === "paid" && (e.paid_at ?? e.created_at).startsWith(key)).reduce((s, e) => s + e.total_amount, 0)
        + manualExpense.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      months.push({ label, key, income, expense, net: income - expense });
    }
    return months.filter(m => m.income > 0 || m.expense > 0);
  }, [paidBills, expenses, manualIncome, manualExpense]);

  // ── Sub-tab nav ──────────────────────────────────────────────────────────────
  const FTABS: { id: FinancialTab; label: string; icon: string }[] = [
    { id: "overview",  label: "Overview",    icon: "grid"    },
    { id: "income",    label: "Income",      icon: "wallet"  },
    { id: "expenses",  label: "Expenses",    icon: "invoice" },
    { id: "moneyflow", label: "Money Flow",  icon: "chart"   },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl">Financial</h2>
        <p className="text-ink-mute text-sm mt-0.5">Income, expenses & payroll semua cabang.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap bg-paper-tint border border-line rounded-xl p-1">
        {FTABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "bg-white text-ocean-700 shadow-card" : "text-ink-soft hover:bg-white/60"}`}>
            <Icon name={t.icon} className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Total Income" value={fmtIDR(totalIncome)} icon="wallet" tone="ok" sub={`${paidBills.length} transaksi lunas`} />
            <Stat label="Total Expenses" value={fmtIDR(totalExpenses)} icon="invoice" tone="danger" sub={`${expenses.filter(e=>e.status==="paid").length} invoice coach`} />
            <Stat label="Net" value={fmtIDR(netAmount)} icon="chart" tone={netAmount >= 0 ? "ocean" : "warn"} />
          </div>

          {/* Bar chart: Income vs Expenses per month */}
          <div className="bg-white border border-line rounded-2xl p-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="font-display font-bold text-base text-ink">Income vs Expenses</div>
                <div className="text-xs text-ink-mute mt-0.5">{chartMonths} bulan terakhir · perbandingan pemasukan &amp; pengeluaran</div>
              </div>
              <div className="flex gap-1 shrink-0 bg-paper-tint rounded-xl p-1">
                {([3, 6, 12] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setChartMonths(n)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${chartMonths === n ? "bg-white shadow-card text-ocean-700" : "text-ink-mute hover:text-ink"}`}
                  >
                    {n}B
                  </button>
                ))}
              </div>
            </div>

            {loadingBills || loadingExpenses ? (
              <div className="h-48 flex items-center justify-center text-ink-mute text-sm">Memuat…</div>
            ) : (
              <>
                {/* Vertical grouped bar chart */}
                {/* Chart area: fixed height 180px for bars + 36px label row below */}
                <div className="flex gap-1.5 px-1" style={{ height: "216px", alignItems: "flex-end" }}>
                  {barChartData.map((m) => {
                    const CHART_H = 160;
                    const incH = m.income > 0 ? Math.max(4, Math.round((m.income / barMax) * CHART_H)) : 0;
                    const expH = m.expense > 0 ? Math.max(4, Math.round((m.expense / barMax) * CHART_H)) : 0;
                    const netPositive = m.net >= 0;
                    return (
                      <div key={m.key} className="flex-1 group relative flex flex-col justify-end items-center" style={{ height: "216px" }}>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] leading-tight rounded-lg px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-36 shadow-float">
                          <div className="font-semibold mb-1">{m.label}</div>
                          <div className="flex justify-between gap-2"><span className="text-ok-300">Income</span><span>{fmtIDR(m.income)}</span></div>
                          <div className="flex justify-between gap-2"><span className="text-danger-300">Expenses</span><span>{fmtIDR(m.expense)}</span></div>
                          <div className={`flex justify-between gap-2 mt-1 pt-1 border-t border-white/20 font-semibold ${netPositive ? "text-ok-300" : "text-danger-300"}`}>
                            <span>Net</span><span>{netPositive ? "+" : ""}{fmtIDR(m.net)}</span>
                          </div>
                        </div>
                        {/* Bars + labels */}
                        <div className="w-full flex items-end justify-center gap-0.5" style={{ height: `${CHART_H}px` }}>
                          {/* Income bar */}
                          {incH > 0 ? (
                            <div
                              className="flex-1 rounded-t-md bg-ok-500 transition-all duration-500"
                              style={{ height: `${incH}px` }}
                            />
                          ) : (
                            <div className="flex-1 rounded-t-sm bg-ok-50" style={{ height: "3px" }} />
                          )}
                          {/* Expense bar */}
                          {expH > 0 ? (
                            <div
                              className="flex-1 rounded-t-md bg-danger-500 transition-all duration-500"
                              style={{ height: `${expH}px` }}
                            />
                          ) : (
                            <div className="flex-1 rounded-t-sm bg-danger-50" style={{ height: "3px" }} />
                          )}
                        </div>
                        {/* Net dot */}
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${netPositive ? "bg-ok-500" : "bg-danger-500"}`} />
                        {/* Month label */}
                        <div className={`text-[10px] font-semibold text-center leading-tight mt-1 text-ink-mute ${chartMonths === 12 ? "text-[9px]" : ""}`}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Y-axis guide lines (decorative) */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-ink-mute">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-ok-500 inline-block" />
                      Income
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-danger-500 inline-block" />
                      Expenses
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-ok-500 inline-block" />
                      Net +
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />
                      Net −
                    </span>
                  </div>
                  <div className="text-xs text-ink-faint">
                    Maks: {fmtIDR(barMax)}
                  </div>
                </div>

                {/* Monthly net summary strip */}
                <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(chartMonths, 6)}, 1fr)` }}>
                  {barChartData.slice(-Math.min(chartMonths, 6)).map(m => (
                    <div key={m.key} className={`rounded-xl px-2.5 py-2 text-center ${m.net >= 0 ? "bg-ok-50" : "bg-danger-50"}`}>
                      <div className="text-[10px] text-ink-mute font-medium">{m.label}</div>
                      <div className={`text-xs font-bold mt-0.5 ${m.net >= 0 ? "text-ok-700" : "text-danger-700"}`}>
                        {m.net >= 0 ? "+" : ""}{fmtIDR(m.net)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top cabang by income */}
          {branches.length > 0 && (
            <div className="bg-white border border-line rounded-2xl p-5">
              <div className="font-display font-bold text-base mb-4">Income per Cabang</div>
              <div className="grid gap-3">
                {branches.map(b => {
                  const inc = branchIncomeMap[b.id] ?? 0;
                  const width = clampPercent(inc, maxBranchIncome);
                  return (
                    <div key={b.id} className="rounded-2xl border border-line bg-paper-tint/70 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-ink break-words">{b.name}</div>
                          <div className="text-[11px] uppercase tracking-widest text-ink-faint mt-0.5">Kontribusi</div>
                        </div>
                        <div className="text-sm font-mono font-bold text-ocean-700 whitespace-nowrap">{fmtIDR(inc)}</div>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-line bg-white">
                        <div className="h-full rounded-full bg-gradient-to-r from-ocean-500 to-wave-500 transition-all duration-500" style={{ width: `${width}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-ink-mute">
                        {inc > 0 ? `${Math.round(width)}% dari cabang tertinggi` : "Belum ada pemasukan"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INCOME ──────────────────────────────────────────────────────────── */}
      {tab === "income" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("income")}>Tambah Income</Btn>
          </div>
          {/* Filters */}
          <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                <input value={incomeSearch} onChange={e => setIncomeSearch(e.target.value)} placeholder="Cari member, kelas, periode, deskripsi…" className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper-tint focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              </div>
              <select value={incomeBranch} onChange={e => setIncomeBranch(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua cabang</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={incomeStatus} onChange={e => setIncomeStatus(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">Semua status</option>
                <option value="unpaid">Belum Bayar</option>
                <option value="paid">Lunas</option>
                <option value="partial">Sebagian</option>
                <option value="school_covered">Sekolah</option>
                <option value="free">Gratis</option>
              </select>
              <select value={incomeType} onChange={e => setIncomeType(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">Semua tipe</option>
                <option value="monthly">Bulanan</option>
                <option value="session_pack">Paket Sesi</option>
                <option value="custom">Custom</option>
              </select>
              <select value={incomeMethod} onChange={e => setIncomeMethod(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">Semua metode</option>
                <option value="transfer">Transfer</option>
                <option value="cash">Cash</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input type="date" value={incomeDateFrom} onChange={e => setIncomeDateFrom(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              <span className="text-ink-faint text-sm">—</span>
              <input type="date" value={incomeDateTo} onChange={e => setIncomeDateTo(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              {(incomeSearch || incomeStatus || incomeBranch !== "all" || incomeType || incomeMethod || incomeDateFrom || incomeDateTo) && (
                <button onClick={() => { setIncomeSearch(""); setIncomeStatus(""); setIncomeBranch("all"); setIncomeType(""); setIncomeMethod(""); setIncomeDateFrom(""); setIncomeDateTo(""); }} className="text-xs text-ocean-600 hover:underline">Reset filter</button>
              )}
              <span className="text-xs text-ink-mute ml-auto">{filteredIncome.length} baris</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            {loadingBills ? (
              <div className="p-10 text-center text-ink-mute">Memuat data…</div>
            ) : incomePagedRows.length === 0 ? (
              <div className="p-10 text-center text-ink-mute">Tidak ada data.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Cabang</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Member</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Kelas</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Periode</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Tipe</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Metode</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs cursor-pointer select-none hover:text-ocean-600" onClick={() => { setIncomeSortBy("paid_at"); setIncomeSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                          Tanggal {incomeSortBy === "paid_at" ? (incomeSortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs cursor-pointer select-none hover:text-ocean-600" onClick={() => { setIncomeSortBy("total"); setIncomeSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                          Total {incomeSortBy === "total" ? (incomeSortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Status</th>
                        <th className="px-4 py-2.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {incomePagedRows.map(row => row.source === "manual" ? (
                        <tr key={row.id} className="hover:bg-paper-tint">
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.branch?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 font-medium">
                            {row.description}
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">Manual</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.category ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{new Date(row.occurred_at).toLocaleDateString("id-ID", { dateStyle: "short" })}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmtIDR(row.amount)}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ok-50 text-ok-700">Tercatat</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title="Edit"><Icon name="edit" className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className="hover:bg-paper-tint">
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.branch?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 font-medium">{row.member?.profile?.full_name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.class?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs">{row.period_label}</td>
                          <td className="px-4 py-2.5 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-ocean-50 text-ocean-700 font-semibold">{row.type === "monthly" ? "Bulanan" : row.type === "session_pack" ? "Paket" : row.type === "custom" ? "Custom" : row.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute capitalize">{row.paid_method ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.paid_at ? new Date(row.paid_at).toLocaleDateString("id-ID", { dateStyle: "short" }) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmtIDR(row.total)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === "paid" ? "bg-ok-50 text-ok-700" : row.status === "unpaid" ? "bg-warn-50 text-warn-700" : row.status === "partial" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"}`}>
                              {row.status === "paid" ? "Lunas" : row.status === "unpaid" ? "Belum" : row.status === "partial" ? "Sebagian" : row.status === "school_covered" ? "Sekolah" : "Gratis"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
                  <div className="text-ink-mute text-xs">{filteredIncome.length} baris · hal. {incomeSafePage + 1}/{incomeTotalPages}</div>
                  <div className="flex gap-1">
                    {[{ label: "«", act: () => setIncomePage(0) }, { label: "‹", act: () => setIncomePage(p => Math.max(0, p - 1)) }, { label: "›", act: () => setIncomePage(p => Math.min(incomeTotalPages - 1, p + 1)) }, { label: "»", act: () => setIncomePage(incomeTotalPages - 1) }].map((btn, i) => (
                      <button key={i} onClick={btn.act} disabled={(i < 2 && incomeSafePage === 0) || (i >= 2 && incomeSafePage >= incomeTotalPages - 1)} className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">{btn.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EXPENSES ────────────────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("expense")}>Tambah Expense</Btn>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Stat label="Reimburse Admin" value={manualExpense.filter(t => t.is_reimburse).length} icon="invoice" tone="warn"
              sub={fmtIDR(manualExpense.filter(t => t.is_reimburse).reduce((s, t) => s + t.amount, 0))} />
          </div>
          <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                <input value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} placeholder="Cari coach, periode, nomor invoice, deskripsi…" className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper-tint focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              </div>
              <select value={expenseBranch} onChange={e => setExpenseBranch(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua cabang</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={expenseStatus} onChange={e => setExpenseStatus(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">Semua status</option>
                <option value="pending">Pending</option>
                <option value="paid">Lunas</option>
              </select>
              <select value={expenseReimburseFilter} onChange={e => setExpenseReimburseFilter(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua tipe</option>
                <option value="reimburse">Reimburse saja</option>
                <option value="non_reimburse">Non-Reimburse</option>
              </select>
              {(expenseSearch || expenseStatus || expenseBranch !== "all" || expenseReimburseFilter !== "all") && (
                <button onClick={() => { setExpenseSearch(""); setExpenseStatus(""); setExpenseBranch("all"); setExpenseReimburseFilter("all"); }} className="text-xs text-ocean-600 hover:underline">Reset</button>
              )}
              <span className="text-xs text-ink-mute ml-auto">{filteredExpenses.length} invoice</span>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            {loadingExpenses ? (
              <div className="p-10 text-center text-ink-mute">Memuat data…</div>
            ) : expensePagedRows.length === 0 ? (
              <div className="p-10 text-center text-ink-mute">Tidak ada data.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Cabang</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Coach</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Nomor Invoice</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Periode</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs">Total</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Status</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Dibayar</th>
                        <th className="px-4 py-2.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {expensePagedRows.map(row => row.source === "manual" ? (
                        <tr key={row.id} className="hover:bg-paper-tint">
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.branch?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 font-medium">
                            {row.description}
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">Manual</span>
                            {row.is_reimburse && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-warn-50 text-warn-700 text-[10px] font-semibold align-middle">Reimburse</span>}
                            {row.proof_url && (
                              <a href={row.proof_url} target="_blank" rel="noreferrer" className="block text-xs text-ocean-600 hover:underline mt-0.5 w-fit">
                                <Icon name="link" className="w-3 h-3 inline mr-1" />Lihat bukti
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs">{row.category ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">{fmtIDR(row.amount)}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ok-50 text-ok-700">Tercatat</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{new Date(row.occurred_at).toLocaleDateString("id-ID", { dateStyle: "short" })}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title="Edit"><Icon name="edit" className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className="hover:bg-paper-tint">
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.branch?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 font-medium">{row.coach?.full_name ?? "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-ocean-700">{row.invoice_number ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs">{row.period_label}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">{fmtIDR(row.total_amount)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === "paid" ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
                              {row.status === "paid" ? "Lunas" : "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.paid_at ? new Date(row.paid_at).toLocaleDateString("id-ID", { dateStyle: "short" }) : "—"}</td>
                          <td className="px-4 py-2.5"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
                  <div className="text-ink-mute text-xs">{filteredExpenses.length} invoice · hal. {expenseSafePage + 1}/{expenseTotalPages}</div>
                  <div className="flex gap-1">
                    {[{ label: "«", act: () => setExpensePage(0) }, { label: "‹", act: () => setExpensePage(p => Math.max(0, p - 1)) }, { label: "›", act: () => setExpensePage(p => Math.min(expenseTotalPages - 1, p + 1)) }, { label: "»", act: () => setExpensePage(expenseTotalPages - 1) }].map((btn, i) => (
                      <button key={i} onClick={btn.act} disabled={(i < 2 && expenseSafePage === 0) || (i >= 2 && expenseSafePage >= expenseTotalPages - 1)} className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">{btn.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MONEY FLOW ──────────────────────────────────────────────────────── */}
      {tab === "moneyflow" && (
        <div className="space-y-3">
          {loadingBills || loadingExpenses ? (
            <div className="p-10 text-center text-ink-mute">Memuat data…</div>
          ) : moneyFlowData.length === 0 ? (
            <div className="p-10 text-center text-ink-mute">Belum ada data transaksi.</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <Stat label="Total Income (12 bln)" value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.income, 0))} icon="wallet" tone="ok" />
                <Stat label="Total Expenses (12 bln)" value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.expense, 0))} icon="invoice" tone="danger" />
                <Stat label="Net (12 bln)" value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.net, 0))} icon="chart" tone="ocean" />
              </div>

              <div className="bg-white border border-line rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">Bulan</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ok-700 text-xs">Income</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-danger-700 text-xs">Expenses</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs">Net</th>
                        <th className="px-4 py-2.5 w-48"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...moneyFlowData].reverse().map(m => {
                        const mfMax = Math.max(1, ...moneyFlowData.map(x => Math.max(x.income, x.expense)));
                        return (
                          <tr key={m.key} className="hover:bg-paper-tint">
                            <td className="px-4 py-3 font-semibold text-ink">{m.label}</td>
                            <td className="px-4 py-3 text-right font-mono text-ok-700">{fmtIDR(m.income)}</td>
                            <td className="px-4 py-3 text-right font-mono text-danger-700">{fmtIDR(m.expense)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${m.net >= 0 ? "text-ok-700" : "text-danger-700"}`}>{fmtIDR(m.net)}</td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="h-2 bg-paper-tint rounded-full overflow-hidden">
                                  <div className="h-full bg-ok-500 rounded-full" style={{ width: `${(m.income / mfMax) * 100}%` }} />
                                </div>
                                <div className="h-2 bg-paper-tint rounded-full overflow-hidden">
                                  <div className="h-full bg-danger-500 rounded-full" style={{ width: `${(m.expense / mfMax) * 100}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Tambah/Edit Transaksi Manual ─────────────────────────────── */}
      <Modal open={!!showTxnModal} onClose={() => setShowTxnModal(null)}
        title={showTxnModal?.edit ? `Edit ${showTxnModal.kind === "income" ? "Income" : "Expense"} Manual` : `Tambah ${showTxnModal?.kind === "income" ? "Income" : "Expense"} Manual`}
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowTxnModal(null)}>Batal</Btn>
            <Btn variant="primary" onClick={saveTxn} disabled={savingTxn}>{savingTxn ? "Menyimpan…" : "Simpan"}</Btn>
          </div>
        }>
        <div className="space-y-4">
          <Field label="Cabang">
            <Select value={txnForm.branch_id} onChange={e => setTxnForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">— Pilih cabang —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Kategori">
            <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
              {MANUAL_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          {txnForm.category === "Lainnya" && (
            <Field label="Kategori Custom"><Input value={txnForm.categoryOther} onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))} placeholder="Contoh: Donasi alumni" /></Field>
          )}
          <Field label="Deskripsi"><Input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} placeholder="Contoh: Sponsorship acara renang tahunan" /></Field>
          {showTxnModal?.kind === "expense" && (
            <>
              <Switch checked={txnForm.isReimburse} onChange={v => setTxnForm(f => ({ ...f, isReimburse: v }))} label="Ini pengeluaran reimburse (perlu bukti)" />
              {txnForm.isReimburse && (
                <Field label="Link Bukti (Google Drive)">
                  <Input value={txnForm.proofUrl} onChange={e => setTxnForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder="https://drive.google.com/..." type="url" />
                </Field>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nominal (Rp)"><Input type="number" inputMode="numeric" min={0} value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} /></Field>
            <Field label="Tanggal"><Input type="date" value={txnForm.occurred_at} onChange={e => setTxnForm(f => ({ ...f, occurred_at: e.target.value }))} className="font-mono" /></Field>
          </div>
          <Field label="Catatan (opsional)"><Textarea value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
        </div>
      </Modal>

    </div>
  );
}

// ── OwnerActivityLog ───────────────────────────────────────────────────────────

interface ActivityLogRow {
  id: string; user_id: string; user_role: string; user_name: string;
  branch_id: string | null; branch_name: string | null;
  entity_type: string; entity_id: string; entity_label: string | null;
  action: string; label: string; meta: Record<string, unknown> | null;
  created_at: string;
}

const ENTITY_LABELS: Record<string, string> = {
  branches: "Cabang", members: "Member", member_classes: "Kelas Member",
  classes: "Kelas", class_packages: "Paket", bills: "Tagihan",
  coach_attendances: "Absensi Coach", coach_invoices: "Invoice Coach",
  coach_leaves: "Izin Coach", certifications: "Sertifikasi",
  announcements: "Pengumuman", payslips: "Slip Gaji",
  registrations: "Registrasi", rapor_periods: "Rapor",
  schools: "Sekolah", coach_rates: "Tarif Coach", profiles: "Profil",
};

const ACTION_BADGE: Record<string, string> = {
  create: "active", update: "manual", delete: "rejected",
  approve: "approved", reject: "rejected", publish: "active",
  archive: "archived", restore: "ok", suspend: "suspend", unsuspend: "ok",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Buat", update: "Ubah", delete: "Hapus",
  approve: "Setujui", reject: "Tolak", publish: "Terbitkan",
  archive: "Arsip", restore: "Pulihkan", suspend: "Suspend", unsuspend: "Aktifkan",
};

const ENTITY_COLORS: Record<string, string> = {
  branches: "bg-ocean-50 text-ocean-700", members: "bg-wave-50 text-wave-700",
  bills: "bg-ok-50 text-ok-700", coach_invoices: "bg-warn-50 text-warn-700",
  payslips: "bg-ok-50 text-ok-700", registrations: "bg-ocean-50 text-ocean-700",
  certifications: "bg-wave-50 text-wave-700", coach_attendances: "bg-paper-deep text-ink-soft",
  classes: "bg-ocean-50 text-ocean-700", announcements: "bg-wave-50 text-wave-700",
};

function OwnerActivityLog({ branches }: { branches: Branch[] }) {
  const supabase = createClient();
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsToday, setStatsToday] = useState(0);
  const [statsWeek, setStatsWeek] = useState(0);
  const [detailLog, setDetailLog] = useState<ActivityLogRow | null>(null);

  // Filters
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const activeFilterCount = [filterBranch !== "all", filterEntity !== "all", filterAction !== "all", filterRole !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  const load = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterBranch !== "all")   q = q.eq("branch_id", filterBranch);
    if (filterEntity !== "all")   q = q.eq("entity_type", filterEntity);
    if (filterAction !== "all")   q = q.eq("action", filterAction);
    if (filterRole !== "all")     q = q.eq("user_role", filterRole);
    if (filterDateFrom)           q = q.gte("created_at", filterDateFrom + "T00:00:00");
    if (filterDateTo)             q = q.lte("created_at", filterDateTo + "T23:59:59");
    if (search.trim())            q = q.ilike("label", `%${search.trim()}%`);

    const { data, count } = await q;
    if (data) setLogs(data as ActivityLogRow[]);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [supabase, page, filterBranch, filterEntity, filterAction, filterRole, filterDateFrom, filterDateTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [td, wk] = await Promise.all([
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", today + "T00:00:00"),
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo + "T00:00:00"),
    ]);
    setStatsToday(td.count ?? 0);
    setStatsWeek(wk.count ?? 0);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(0); }, [filterBranch, filterEntity, filterAction, filterRole, filterDateFrom, filterDateTo, search]);

  const resetFilters = () => {
    setFilterBranch("all"); setFilterEntity("all"); setFilterAction("all");
    setFilterRole("all"); setFilterDateFrom(""); setFilterDateTo(""); setSearch("");
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const branchName = (log: ActivityLogRow) =>
    log.branch_name ?? branches.find(b => b.id === log.branch_id)?.name ?? "Lintas cabang";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl">Activity Log</h2>
        <p className="text-ink-mute text-sm mt-0.5">Semua aktivitas CRUD dari semua role lintas cabang.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Hari ini"   value={statsToday} icon="calendar"  tone="ocean" />
        <Stat label="7 hari ini" value={statsWeek}  icon="chart"     tone="wave"  />
        <Stat label="Total log"  value={total}      icon="clipboard" tone="ok"    />
      </div>

      {/* Search + filter bar */}
      <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-52 relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari aktivitas…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper-tint focus:outline-none focus:ring-1 focus:ring-ocean-400" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? "bg-ocean-50 border-ocean-200 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
            <Icon name="filter" className="w-4 h-4" /> Filter
            {activeFilterCount > 0 && <span className="bg-ocean-600 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          {(activeFilterCount > 0 || search) && (
            <button onClick={resetFilters} className="text-xs text-ocean-600 hover:underline px-2">Reset</button>
          )}
          <span className="text-xs text-ink-mute self-center ml-auto">{total} aktivitas</span>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 border-t border-line">
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">Cabang</label>
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua cabang</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">Entitas</label>
              <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua entitas</option>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">Aksi</label>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua aksi</option>
                {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">Role</label>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">Semua role</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="coach">Coach</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">Dari tanggal</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">Sampai tanggal</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
            </div>
          </div>
        )}
      </div>

      {/* Activity feed */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-ink-mute">Memuat data…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="clipboard" className="w-10 h-10 text-ink-faint mx-auto mb-3" />
            <div className="font-display font-bold text-ink">Belum ada aktivitas</div>
            <p className="text-sm text-ink-mute mt-1">Aktivitas akan muncul setelah ada perubahan data.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-tint">
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Waktu</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Cabang</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Oleh</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Entitas</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Aksi</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => setDetailLog(log)}>
                      <td className="px-4 py-3 shrink-0">
                        <div className="text-xs font-semibold text-ink">{fmtShortDate(log.created_at)}</div>
                        <div className="text-xs text-ink-faint">{fmtTime(log.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-mute whitespace-nowrap">{branchName(log)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={log.user_name} size={26} />
                          <div>
                            <div className="text-xs font-semibold leading-tight">{log.user_name}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wide ${log.user_role === "owner" ? "text-ocean-600" : log.user_role === "admin" ? "text-wave-600" : "text-ink-mute"}`}>{log.user_role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[log.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Status kind={ACTION_BADGE[log.action] ?? "manual"}>{ACTION_LABEL[log.action] ?? log.action}</Status>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-sm text-ink truncate block">{log.label}</span>
                        {log.entity_label && <span className="text-xs text-ink-mute">{log.entity_label}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-line">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 hover:bg-paper-tint cursor-pointer" onClick={() => setDetailLog(log)}>
                  <div className="flex items-start gap-3">
                    <Avatar name={log.user_name} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink">{log.user_name}</span>
                        <Status kind={ACTION_BADGE[log.action] ?? "manual"}>{ACTION_LABEL[log.action] ?? log.action}</Status>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${ENTITY_COLORS[log.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </span>
                      </div>
                      <div className="text-sm text-ink mt-0.5 leading-snug">{log.label}</div>
                      <div className="text-xs text-ink-faint mt-1">{branchName(log)} · {fmtShortDate(log.created_at)} {fmtTime(log.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
              <div className="text-xs text-ink-mute">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total} aktivitas · hal. {page + 1}/{totalPages}
              </div>
              <div className="flex gap-1">
                {[
                  { label: "«", act: () => setPage(0),               dis: page === 0 },
                  { label: "‹", act: () => setPage(p => p - 1),      dis: page === 0 },
                  { label: "›", act: () => setPage(p => p + 1),      dis: page >= totalPages - 1 },
                  { label: "»", act: () => setPage(totalPages - 1),   dis: page >= totalPages - 1 },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.act} disabled={btn.dis}
                    className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal open={!!detailLog} onClose={() => setDetailLog(null)} title="Detail Aktivitas" size="md"
        footer={<Btn variant="ghost" onClick={() => setDetailLog(null)}>Tutup</Btn>}>
        {detailLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Waktu</div><div>{fmtShortDate(detailLog.created_at)} {fmtTime(detailLog.created_at)}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Cabang</div><div>{branchName(detailLog)}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Oleh</div><div className="font-semibold">{detailLog.user_name} <span className="text-xs text-ink-mute font-normal">({detailLog.user_role})</span></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Entitas</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[detailLog.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                  {ENTITY_LABELS[detailLog.entity_type] ?? detailLog.entity_type}
                </span>
              </div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Aksi</div><Status kind={ACTION_BADGE[detailLog.action] ?? "manual"}>{ACTION_LABEL[detailLog.action] ?? detailLog.action}</Status></div>
              {detailLog.entity_label && <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Subjek</div><div className="font-semibold">{detailLog.entity_label}</div></div>}
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-1">Keterangan</div>
              <p className="text-sm text-ink leading-relaxed">{detailLog.label}</p>
            </div>
            {detailLog.meta && Object.keys(detailLog.meta).length > 0 && (
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-1">Detail</div>
                <pre className="bg-paper-tint rounded-xl p-3 text-xs font-mono overflow-auto text-ink-soft">{JSON.stringify(detailLog.meta, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── R2 Storage ─────────────────────────────────────────────────────────────────

interface StorageCategory { prefix: string; label: string; icon: string; count: number; size: number }
interface StorageStats { categories: StorageCategory[]; totalSize: number; totalCount: number; fetchedAt: string }
interface BackupFile { key: string; label: string; category: string; url: string }

function fmtBytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " KB";
  return n + " B";
}

function fmtRelTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

const CATEGORY_COLORS = [
  "bg-ocean-500", "bg-wave-500", "bg-ok-500", "bg-warn-500",
  "bg-suspend-500", "bg-manual-500", "bg-danger-500", "bg-archive-500", "bg-ink-soft",
];

const BACKUP_CATEGORIES = [
  { key: "avatars",     label: "Avatar Profil"   },
  { key: "logos",       label: "Logo Cabang"      },
  { key: "classes",     label: "Foto Kelas"       },
  { key: "payments",    label: "Bukti Pembayaran" },
  { key: "certs",       label: "Sertifikat Coach" },
  { key: "attendances", label: "Selfie Absensi"   },
  { key: "qrcodes",     label: "QR Code Member"   },
];

const BACKUP_PAGE_SIZE = 20;

function OwnerStorage({ userId, userName }: { userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();

  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [backupPage, setBackupPage] = useState(0);

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(["all"]));
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await fetch("/api/r2/stats");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as StorageStats;
      setStats(data);
    } catch {
      setStatsError(true);
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadBackupList = async () => {
    setBackupLoading(true);
    setBackupLoaded(false);
    try {
      // Fetch per selected category (or all)
      if (selectedCats.has("all")) {
        const res = await fetch("/api/r2/backup-list?category=all");
        if (!res.ok) throw new Error();
        const data = await res.json() as { files: BackupFile[] };
        setBackupList(data.files);
      } else {
        const allFiles: BackupFile[] = [];
        for (const cat of selectedCats) {
          const res = await fetch(`/api/r2/backup-list?category=${cat}`);
          if (!res.ok) continue;
          const data = await res.json() as { files: BackupFile[] };
          allFiles.push(...data.files);
        }
        setBackupList(allFiles);
      }
      setBackupLoaded(true);
      setBackupPage(0);
    } catch {
      toast.error("Gagal memuat daftar file");
    }
    setBackupLoading(false);
  };

  const toggleCat = (key: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (key === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(key);
      }
      return next;
    });
    setBackupLoaded(false);
    setBackupList([]);
  };

  const downloadBackup = async () => {
    if (backupList.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ done: 0, total: backupList.length });
    let successCount = 0;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < backupList.length; i++) {
        const f = backupList[i];
        try {
          const res = await fetch(`/api/r2?key=${encodeURIComponent(f.key)}&stream=1`);
          if (res.ok) {
            const blob = await res.blob();
            const folder = f.category.replace(/[\s/\\]/g, "_");
            const filename = f.key.split("/").filter(Boolean).pop() ?? f.key;
            zip.file(`${folder}/${filename}`, blob);
            successCount++;
          }
        } catch { /* skip failed file */ }
        setDownloadProgress({ done: i + 1, total: backupList.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `R2-Backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup selesai (${successCount} file berhasil diunduh)`);
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "r2_storage", entityId: "backup",
        action: "create",
        label: `Backup R2 storage diunduh (${successCount}/${backupList.length} file)`,
        meta: { success_count: successCount, total_count: backupList.length },
      });
    } catch {
      toast.error("Backup gagal", "Terjadi kesalahan saat membuat ZIP.");
    }
    setDownloading(false);
    setDownloadProgress(null);
  };

  // Pagination for backup list
  const totalBackupPages = Math.max(1, Math.ceil(backupList.length / BACKUP_PAGE_SIZE));
  const safeBackupPage   = Math.min(backupPage, Math.max(0, totalBackupPages - 1));
  const paginatedBackup  = backupList.slice(safeBackupPage * BACKUP_PAGE_SIZE, (safeBackupPage + 1) * BACKUP_PAGE_SIZE);

  // Group backup list by category for summary
  const backupByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of backupList) map[f.category] = (map[f.category] ?? 0) + 1;
    return map;
  }, [backupList]);

  return (
    <div className="space-y-5">
      {/* ── Stats hero ── */}
      {statsLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-line shadow-card p-5 space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-7 w-14 rounded" />
            </div>
          ))}
        </div>
      ) : statsError ? (
        <Card>
          <div className="flex items-center gap-3 text-danger-600">
            <Icon name="warning" className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Gagal memuat data R2</div>
              <div className="text-xs text-ink-mute mt-0.5">Pastikan env vars R2 sudah dikonfigurasi.</div>
            </div>
            <Btn variant="ghost" size="sm" icon="refresh" onClick={loadStats}>Retry</Btn>
          </div>
        </Card>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-ocean-700 text-white rounded-2xl shadow-card p-5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-wave-500/30 blur-2xl" />
            <div className="relative">
              <div className="text-wave-200 text-[10px] uppercase tracking-widest font-bold">Total Ukuran</div>
              <div className="font-display font-bold text-2xl mt-1">{fmtBytes(stats.totalSize)}</div>
              <div className="text-white/60 text-xs mt-1">R2 Free: 10 GB</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Total File</div>
            <div className="font-display font-bold text-2xl text-ink mt-1 tabular-nums">{stats.totalCount.toLocaleString("id-ID")}</div>
            <div className="text-xs text-ink-mute mt-1">{stats.categories.filter(c => c.count > 0).length} kategori aktif</div>
          </div>
          <div className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Diperbarui</div>
            <div className="font-semibold text-ink text-sm mt-1">{fmtRelTime(stats.fetchedAt)}</div>
            <button
              type="button"
              onClick={loadStats}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ocean-600 hover:underline"
            >
              <Icon name="refresh" className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Distribusi Storage ── */}
      {stats && stats.totalCount > 0 && (
        <Card>
          <SectionTitle sub="Penggunaan storage per kategori file">Distribusi Storage</SectionTitle>
          {/* Stacked bar */}
          <div className="h-4 rounded-full overflow-hidden flex mt-4 mb-5">
            {stats.categories.filter(c => c.size > 0).map((cat, i) => (
              <div
                key={cat.prefix}
                style={{ width: `${(cat.size / stats.totalSize) * 100}%` }}
                className={`h-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} transition-all`}
                title={`${cat.label}: ${fmtBytes(cat.size)}`}
              />
            ))}
          </div>
          {/* Legend + table */}
          <div className="space-y-0">
            <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-widest font-bold text-ink-faint pb-2 border-b border-line">
              <div className="col-span-2">Kategori</div>
              <div className="text-right">File</div>
              <div className="text-right">Ukuran</div>
            </div>
            {stats.categories.map((cat, i) => {
              const pct = stats.totalSize > 0 ? (cat.size / stats.totalSize) * 100 : 0;
              return (
                <div key={cat.prefix} className="grid grid-cols-4 gap-2 py-2.5 border-b border-line last:border-0 items-center">
                  <div className="col-span-2 flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{cat.label}</div>
                      <div className="h-1 bg-paper-deep rounded-full overflow-hidden mt-0.5 w-24">
                        <div className={`h-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-ink-soft tabular-nums">{cat.count.toLocaleString("id-ID")}</div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink tabular-nums">{fmtBytes(cat.size)}</div>
                    <div className="text-[10px] text-ink-faint">{pct.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Backup System ── */}
      <Card>
        <SectionTitle sub="Unduh file R2 tersusun rapi dalam folder per kategori">Backup Files</SectionTitle>

        {/* Category selector */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Pilih Kategori</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setSelectedCats(new Set(["all"])); setBackupLoaded(false); setBackupList([]); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${selectedCats.has("all") ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line text-ink-soft hover:border-ocean-300"}`}
            >
              Semua Kategori
            </button>
            {BACKUP_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCat(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${!selectedCats.has("all") && selectedCats.has(cat.key) ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line text-ink-soft hover:border-ocean-300"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Load preview button */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Btn variant="soft" size="sm" icon="eye" disabled={backupLoading} onClick={loadBackupList}>
            {backupLoading ? "Memuat…" : "Lihat Daftar File"}
          </Btn>
          {backupLoaded && (
            <span className="text-sm text-ink-mute">
              {backupList.length} file ditemukan
              {Object.keys(backupByCat).length > 1 && (
                <> · {Object.entries(backupByCat).map(([cat, n]) => `${cat} (${n})`).join(", ")}</>
              )}
            </span>
          )}
        </div>

        {/* File list preview */}
        {backupLoaded && backupList.length > 0 && (
          <div className="mt-4 border border-line rounded-xl overflow-hidden">
            <div className="divide-y divide-line max-h-72 overflow-y-auto no-scrollbar">
              {paginatedBackup.map((f, i) => (
                <div key={`${f.key}-${i}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper-tint transition-colors">
                  <Icon name="archive" className="w-4 h-4 text-ink-faint shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate font-medium">{f.label}</div>
                    <div className="text-[11px] text-ink-faint truncate font-mono">{f.key}</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ocean-50 text-ocean-700 shrink-0">{f.category}</span>
                </div>
              ))}
            </div>
            {totalBackupPages > 1 && (
              <div className="px-4 py-2.5 border-t border-line flex items-center justify-between bg-paper-tint">
                <span className="text-xs text-ink-mute">{backupList.length} file · hal. {safeBackupPage + 1}/{totalBackupPages}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={safeBackupPage === 0} onClick={() => setBackupPage(p => p - 1)}
                    className="px-2.5 py-1 rounded-lg border border-line text-xs disabled:opacity-40 hover:bg-white transition">‹</button>
                  <button type="button" disabled={safeBackupPage === totalBackupPages - 1} onClick={() => setBackupPage(p => p + 1)}
                    className="px-2.5 py-1 rounded-lg border border-line text-xs disabled:opacity-40 hover:bg-white transition">›</button>
                </div>
              </div>
            )}
          </div>
        )}

        {backupLoaded && backupList.length === 0 && (
          <div className="mt-4 py-8 text-center text-sm text-ink-mute">
            <Icon name="archive" className="w-8 h-8 text-ink-faint mx-auto mb-2" />
            Tidak ada file ditemukan untuk kategori yang dipilih
          </div>
        )}

        {/* Download button + progress */}
        <div className="mt-4 space-y-3">
          {downloadProgress ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-ink">Mengunduh file…</span>
                <span className="text-ink-mute tabular-nums">{downloadProgress.done}/{downloadProgress.total}</span>
              </div>
              <div className="h-2 bg-paper-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-ocean-500 rounded-full transition-all duration-200"
                  style={{ width: `${(downloadProgress.done / downloadProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-ink-mute">ZIP dibuat di browser — jangan tutup tab ini</div>
            </div>
          ) : (
            <Btn
              variant="primary"
              icon="download"
              disabled={!backupLoaded || backupList.length === 0 || downloading}
              onClick={downloadBackup}
            >
              {downloading ? "Memproses…" : `Unduh Backup ZIP${backupLoaded ? ` (${backupList.length} file)` : ""}`}
            </Btn>
          )}
        </div>

        {/* Warning note */}
        <div className="mt-4 p-3.5 bg-warn-50 border border-warn-200 rounded-xl flex items-start gap-2.5">
          <Icon name="warning" className="w-4 h-4 text-warn-600 shrink-0 mt-0.5" />
          <div className="text-xs text-warn-700 leading-relaxed">
            <span className="font-semibold">Perhatian:</span> Backup diproses di browser.
            Kategori selfie absensi bisa sangat banyak dan memakan waktu lama.
            Disarankan backup per-kategori untuk file yang banyak.
            Pastikan RAM browser mencukupi untuk ZIP besar.
          </div>
        </div>
      </Card>

      {/* ── Info card ── */}
      <Card className="bg-wave-50 border-wave-100">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-white text-wave-700 flex items-center justify-center shrink-0">
            <Icon name="info" className="w-5 h-5" />
          </span>
          <div>
            <div className="font-display font-bold text-ink text-sm">Cloudflare R2 Free Tier</div>
            <div className="mt-1.5 space-y-1">
              <div className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">10 GB</span> storage gratis per bulan
              </div>
              <div className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">1 juta</span> operasi Class A (tulis) gratis per bulan
              </div>
              <div className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">10 juta</span> operasi Class B (baca) gratis per bulan
              </div>
            </div>
            <p className="text-xs text-ink-mute mt-2 leading-relaxed">
              Pantau penggunaan aktual via Cloudflare Dashboard → R2 → nama bucket → Metrics.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { section: "Overview" },
  { id: "dashboard", label: "Dashboard",     icon: "grid"    },
  { section: "Manajemen" },
  { id: "branches",  label: "Cabang",        icon: "pin"     },
  { id: "admins",    label: "Admin",         icon: "users"   },
  { id: "classes",   label: "Kelas",         icon: "swim"    },
  { id: "levels",    label: "Level Rapor",   icon: "book"    },
  { section: "Keuangan" },
  { id: "rates",     label: "Tarif Coach",   icon: "settings"},
  { id: "invoices",  label: "Slip Gaji",     icon: "invoice" },
  { id: "loans",     label: "Daftar Pinjaman", icon: "wallet" },
  { id: "financial", label: "Financial",    icon: "chart"   },
  { section: "Konten" },
  { id: "landing",   label: "Landing Page",  icon: "star"      },
  { section: "Sistema" },
  { id: "storage",   label: "R2 Storage",    icon: "archive"   },
  { id: "activity",  label: "Activity Log",  icon: "clipboard" },
];

const TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard",      "Owner overview · semua cabang"],
  branches:  ["Cabang",         "Kelola cabang Next Swimming School"],
  admins:    ["Admin",          "Akun admin per cabang"],
  classes:   ["Kelas",          "Semua kelas lintas cabang"],
  levels:    ["Level Rapor",    "Template kriteria & standar waktu per level renang"],
  rates:     ["Settings Tarif", "Tarif coach per kelas"],
  invoices:  ["Slip Gaji",      "Invoice coach & penerbitan slip gaji"],
  loans:     ["Daftar Pinjaman", "Kelola pinjaman & cicilan coach"],
  financial: ["Financial",      "Income, expenses & payroll semua cabang"],
  landing:   ["Landing Page",   "Kelola konten halaman depan"],
  storage:   ["R2 Storage",     "Monitoring & backup Cloudflare R2 storage"],
  activity:  ["Activity Log",   "Semua aktivitas CRUD lintas cabang"],
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OwnerPage() {
  const supabase = createClient();
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [userId, setUserId] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    const [{ data: branchData }, { data: members }, { data: coaches }, { data: classes }] = await Promise.all([
      supabase.from("branches").select("id, name, city, address, status, wa_numbers, bank_name, bank_account, bank_holder").order("name"),
      supabase.from("members").select("id, branch_id").eq("status", "active"),
      supabase.from("profiles").select("id, branch_id").eq("role", "coach"),
      supabase.from("classes").select("id, branch_id").eq("status", "active"),
    ]);

    if (branchData) {
      const memberMap = (members ?? []).reduce<Record<string, number>>((acc, m) => {
        if (m.branch_id) acc[m.branch_id] = (acc[m.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const coachMap = (coaches ?? []).reduce<Record<string, number>>((acc, c) => {
        if (c.branch_id) acc[c.branch_id] = (acc[c.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const classMap = (classes ?? []).reduce<Record<string, number>>((acc, c) => {
        if (c.branch_id) acc[c.branch_id] = (acc[c.branch_id] ?? 0) + 1;
        return acc;
      }, {});

      const flat = branchData.map((b) => ({
        ...b,
        member_count: memberMap[b.id] ?? 0,
        coach_count:  coachMap[b.id]  ?? 0,
        class_count:  classMap[b.id]  ?? 0,
      })) as Branch[];
      setBranches(flat);
    }
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    loadBranches();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const role = user.user_metadata?.role as string | undefined;
      // Owner: auto-recreate profile row if missing (e.g. after DB reset)
      if (role === "owner") {
        await fetch("/api/owner/init-profile", { method: "POST" });
        setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" });
        setUserId(user.id);
        return;
      }
      // Non-owner somehow on owner page
      const { data: prof } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!prof) {
        setInitError("Data akun tidak ditemukan di database. Kemungkinan data telah direset. Silakan hubungi owner untuk membuat ulang akun Anda.");
        return;
      }
      setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" });
      setUserId(user.id);
    });
  }, [loadBranches]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const ownerName = profile?.full_name ?? "Owner";
  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard branches={branches} />,
    branches:  <Branches branches={branches} onRefresh={loadBranches} userId={userId} userName={ownerName} />,
    admins:    <Admins branches={branches} />,
    classes:   <Classes branches={branches} />,
    levels:    <OwnerRaporLevels />,
    rates:     <SettingsTarif branches={branches} />,
    invoices:  <Invoices branches={branches} userId={userId} userName={ownerName} />,
    loans:     <CoachLoans branches={branches} userId={userId} userName={ownerName} />,
    financial: <OwnerFinancial branches={branches} userId={userId} userName={ownerName} />,
    landing:   <LandingCMS />,
    storage:   <OwnerStorage userId={userId} userName={ownerName} />,
    activity:  <OwnerActivityLog branches={branches} />,
  };

  const [title, sub] = TITLES[active] ?? ["Owner", ""];

  const brand = useMemo(() => (
    <div className="flex items-center gap-2.5">
      <Logo size={36} />
      <div className="min-w-0">
        <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">Owner Panel</div>
        <div className="text-[10px] text-ink-mute tracking-wide">{profile?.full_name ?? "Owner"} · Pemilik</div>
      </div>
    </div>
  ), [profile?.full_name]);

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">Data Tidak Ditemukan</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          Kembali ke Login
        </Btn>
      </div>
    </div>
  );

  return (
    <div className="flex bg-paper-tint min-h-screen">
      <Sidebar
        items={NAV_ITEMS}
        active={active}
        onSelect={(id) => { setActive(id); setMobileNav(false); }}
        brand={brand}
        footer={
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint">
            <Icon name="logout" className="w-4 h-4" /> Logout
          </button>
        }
      />

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-line p-3 overflow-y-auto">
            <div className="px-2 py-2 mb-2">{brand}</div>
            {NAV_ITEMS.map((it) =>
              it.section ? (
                <div key={it.section} className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest font-bold text-ink-faint">{it.section}</div>
              ) : (
                <button key={it.id} onClick={() => { setActive(it.id!); setMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                  <Icon name={it.icon!} className="w-4 h-4" />{it.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          sub={sub}
          search="Cari cabang, admin, invoice…"
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <Bell userId={userId} />
              <Avatar name={profile?.full_name ?? "O"} size={36} />
            </>
          }
        />
        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7">
          {pages[active]}
        </main>
      </div>

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="owner" />}
    </div>
  );
}
