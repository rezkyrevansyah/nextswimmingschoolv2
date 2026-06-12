"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import { fmtIDR } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import LandingCMS from "./_components/LandingCMS";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  status: string;
  wa_numbers?: string[];
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
  branch?: { name: string } | null;
  class_coaches?: { profile: { full_name: string } | null }[];
}

interface CoachRate {
  id: string;
  class_id: string;
  coach_id: string | null;
  rate_per_session: number;
}

interface InvoiceItem {
  id: string; class_id: string; session_count: number; rate: number;
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
  branch?: { name: string } | null;
  coach?: { full_name: string } | null;
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

function Branches({ branches, onRefresh }: { branches: Branch[]; onRefresh: () => void }) {
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
  const [waNumbers, setWaNumbers] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setName(""); setCity(""); setAddress(""); setWaNumbers([""]); setEditItem(null); setShowAdd(true); };
  const openEdit = (b: Branch) => { setName(b.name); setCity(b.city); setAddress(b.address); setWaNumbers(b.wa_numbers?.length ? b.wa_numbers : [""]); setEditItem(b); setShowAdd(true); };

  const save = async () => {
    if (!name || !city) return toast.error("Nama dan kota wajib diisi");
    setSaving(true);
    const cleanWa = waNumbers.map(n => n.trim()).filter(Boolean);
    if (editItem) {
      const { error } = await supabase.from("branches").update({ name, city, address, wa_numbers: cleanWa }).eq("id", editItem.id);
      if (error) { toast.error("Gagal menyimpan", error.message); setSaving(false); return; }
      toast.success("Cabang diperbarui");
    } else {
      const { error } = await supabase.from("branches").insert({ name, city, address, wa_numbers: cleanWa, status: "active" });
      if (error) { toast.error("Gagal membuat cabang", error.message); setSaving(false); return; }
      toast.success("Cabang baru dibuat");
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
            <div className="space-y-2">
              {waNumbers.map((num, i) => (
                <div key={i} className="flex gap-2">
                  <Input type="tel" value={num} onChange={e => setWaNumbers(prev => prev.map((n, j) => j === i ? e.target.value : n))} placeholder="081234567890" className="flex-1 font-mono" />
                  {waNumbers.length > 1 && (
                    <button onClick={() => setWaNumbers(prev => prev.filter((_, j) => j !== i))} className="w-9 h-9 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center border border-line shrink-0">
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Btn variant="ghost" size="sm" icon="plus" onClick={() => setWaNumbers(prev => [...prev, ""])}>Tambah nomor</Btn>
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
          <Field label="Nomor WhatsApp"><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0812…" /></Field>
          <Field label="Cabang" required>
            <Select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="" disabled>Pilih cabang…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          {!editTarget && <Field label="Password awal" required hint="Admin bisa ganti setelah login">
            <div className="relative">
              <Input type={showAdminPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 karakter" className="pr-10" />
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

interface Criterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}
const kindLabel: Record<string, string> = { score_10: "Nilai 1–10", score_100: "Nilai 1–100", choice: "Pilihan ganda", text: "Teks bebas" };

interface ClassCoachRow { id: string; full_name: string; phone: string | null; status: string; }
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

  // Criteria (aspek penilaian)
  const [criteriaClass, setCriteriaClass] = useState<ClassRow | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: "" });
  const [savingCriterion, setSavingCriterion] = useState(false);

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
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, schedule_days, time_start, time_end, goals, description, spreadsheet_url, spreadsheet_filled, branch:branches(name), class_coaches(profile:profiles(full_name))")
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

  const openCriteria = async (c: ClassRow) => {
    setCriteriaClass(c);
    setLoadingCriteria(true);
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", c.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
    setLoadingCriteria(false);
  };

  const addCriterion = async () => {
    if (!criteriaClass || !criterionForm.label) return toast.error("Label wajib diisi");
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.split("\n").map(s => s.trim()).filter(Boolean) : null;
    const { error } = await supabase.from("class_criteria").insert({
      class_id: criteriaClass.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menambah aspek", error.message);
    toast.success("Aspek penilaian ditambahkan");
    setCriterionForm({ label: "", kind: "score_10", options: "" });
    const { data } = await supabase.from("class_criteria").select("id, label, kind, options, sort_order").eq("class_id", criteriaClass.id).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm({ body: "Hapus aspek penilaian ini? Data rapor yang sudah diisi tidak akan terpengaruh." });
    if (!yes) return;
    await supabase.from("class_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success("Aspek penilaian dihapus");
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
        .select("profile:profiles(id, full_name, phone, status)")
        .eq("class_id", classId);
      setDetailCoaches(
        ((data ?? []) as unknown as { profile: { id: string; full_name: string; phone: string | null; status: string } | null }[])
          .map(r => r.profile).filter((p): p is ClassCoachRow => !!p)
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
                const coaches = c.class_coaches?.map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
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
                        <Btn variant="ghost" size="sm" icon="book" onClick={() => openCriteria(c)}>Aspek</Btn>
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
                      <div className="flex items-center gap-3 text-xs text-ink-mute">
                        {coaches.length > 0
                          ? <><Avatar name={coaches[0]!} size={20} /><span>{coaches[0]}</span></>
                          : <span className="text-ink-faint">Belum ada coach</span>
                        }
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`font-mono font-semibold ${pct >= 1 ? "text-danger-600" : pct > 0.7 ? "text-warn-600" : "text-ok-600"}`}>
                          {c.enrolled}/{c.capacity}
                        </span>
                        {c.spreadsheet_filled && c.spreadsheet_url
                          ? <a href={c.spreadsheet_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ok-600 font-semibold hover:underline"><Icon name="link" className="w-3 h-3" />Spreadsheet</a>
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
                  {detailClass.spreadsheet_url && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Spreadsheet</div>
                      <a href={detailClass.spreadsheet_url} target="_blank" rel="noreferrer" className="text-sm text-ocean-600 hover:underline inline-flex items-center gap-1"><Icon name="link" className="w-3 h-3" />Buka Spreadsheet</a>
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
                  : <div className="divide-y divide-line">
                    {detailCoaches.map(c => (
                      <div key={c.id} className="flex items-center gap-3 py-3">
                        <Avatar name={c.full_name} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink text-sm">{c.full_name}</div>
                          <div className="text-xs text-ink-mute">{c.phone ?? "—"}</div>
                        </div>
                        <Status kind={c.status === "active" ? "active" : "inactive"}>{c.status === "active" ? "Aktif" : "Nonaktif"}</Status>
                      </div>
                    ))}
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

      {/* Criteria modal */}
      <Modal open={!!criteriaClass} onClose={() => { setCriteriaClass(null); setCriterionForm({ label: "", kind: "score_10", options: "" }); }}
        title={`Aspek Penilaian — ${criteriaClass?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => { setCriteriaClass(null); setCriterionForm({ label: "", kind: "score_10", options: "" }); }}>Tutup</Btn>}>
        <div className="space-y-5">
          {loadingCriteria ? <div className="text-ink-mute text-sm text-center py-6">Memuat…</div> : (
            <>
              {criteria.length > 0 ? (
                <div className="space-y-2">
                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-paper-tint">
                      <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm">{cr.label}</div>
                        <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? cr.kind}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                      </div>
                      <button onClick={() => deleteCriterion(cr.id)} className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0"><Icon name="x" className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">Belum ada aspek penilaian. Tambahkan di bawah.</p>
              )}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tambah Aspek Baru</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Label aspek" required><Input value={criterionForm.label} onChange={e => setCriterionForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Teknik gaya bebas" /></Field>
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
                  <Field label="Pilihan jawaban" hint="Satu pilihan per baris">
                    <Textarea rows={3} value={criterionForm.options} onChange={e => setCriterionForm(f => ({ ...f, options: e.target.value }))} placeholder={"Sangat Baik\nBaik\nCukup\nPerlu Latihan"} />
                  </Field>
                )}
                <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? "Menyimpan…" : "Tambah Aspek"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

interface TarifClassRow {
  id: string; name: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null;
  class_coaches: { profile: { id: string; full_name: string } | null }[];
}

function SettingsTarif({ branches }: { branches: Branch[] }) {
  const toast = useToast();
  const supabase = createClient();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [classes, setClasses] = useState<TarifClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  // tarif umum: classId → rate string
  const [generalRates, setGeneralRates] = useState<Record<string, string>>({});
  // tarif khusus: `${classId}:${coachId}` → rate string
  const [coachRates, setCoachRates] = useState<Record<string, string>>({});
  // saving key: classId for general, `${classId}:${coachId}` for coach-specific
  const [saving, setSaving] = useState<string | null>(null);

  const loadData = useCallback(async (bid: string) => {
    setLoading(true);
    // Load classes with their coaches
    const { data: clsData } = await supabase
      .from("classes")
      .select("id, name, schedule_days, time_start, time_end, class_coaches(profile:profiles(id, full_name))")
      .eq("branch_id", bid)
      .eq("status", "active")
      .order("name");
    if (clsData) setClasses(clsData as unknown as TarifClassRow[]);

    // Load all rates for classes in this branch at once
    const classIds = (clsData ?? []).map((c: { id: string }) => c.id);
    if (classIds.length > 0) {
      const { data: rateData } = await supabase
        .from("coach_rates")
        .select("class_id, coach_id, rate_per_session")
        .in("class_id", classIds);
      if (rateData) {
        const gen: Record<string, string> = {};
        const cch: Record<string, string> = {};
        (rateData as CoachRate[]).forEach(r => {
          if (!r.coach_id) {
            gen[r.class_id] = String(r.rate_per_session ?? "");
          } else {
            cch[`${r.class_id}:${r.coach_id}`] = String(r.rate_per_session ?? "");
          }
        });
        setGeneralRates(gen);
        setCoachRates(cch);
      }
    } else {
      setGeneralRates({});
      setCoachRates({});
    }
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { if (branchId) loadData(branchId); }, [branchId, loadData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveGeneral = async (classId: string) => {
    const val = Number(generalRates[classId]);
    if (!val || val <= 0) return toast.error("Masukkan nominal tarif yang valid");
    const key = classId;
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).is("coach_id", null).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: null, rate: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Tarif umum disimpan");
  };

  const saveCoachRate = async (classId: string, coachId: string) => {
    const key = `${classId}:${coachId}`;
    const rawVal = coachRates[key];
    // empty = clear the override
    if (!rawVal || rawVal === "") {
      setSaving(key);
      await supabase.from("coach_rates").delete().eq("class_id", classId).eq("coach_id", coachId);
      setSaving(null);
      setCoachRates(prev => { const n = { ...prev }; delete n[key]; return n; });
      toast.success("Tarif khusus dihapus — akan pakai tarif umum");
      return;
    }
    const val = Number(rawVal);
    if (!val || val <= 0) return toast.error("Masukkan nominal tarif yang valid");
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: coachId, rate: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Tarif khusus disimpan");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">Settings Tarif Coach</h2>
        <p className="text-ink-mute text-sm mt-0.5">Set tarif umum per sesi per kelas, dan opsional tarif khusus per coach yang override tarif umum.</p>
      </div>

      {/* Branch selector */}
      {branches.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {branches.map((b) => (
            <button key={b.id} onClick={() => setBranchId(b.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${branchId === b.id ? "bg-ocean-700 text-white" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"}`}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card><div className="py-10 text-center text-ink-mute text-sm">Memuat data…</div></Card>
      ) : classes.length === 0 ? (
        <Card><div className="py-10 text-center text-ink-mute text-sm">Tidak ada kelas aktif untuk cabang ini.</div></Card>
      ) : (
        <div className="space-y-4">
          {classes.map((c) => {
            const coaches = (c.class_coaches ?? []).map(cc => cc.profile).filter(Boolean) as { id: string; full_name: string }[];
            return (
              <Card key={c.id} className="space-y-4">
                {/* Class header */}
                <div>
                  <div className="font-display font-bold text-ink">{c.name}</div>
                  <div className="text-xs text-ink-mute mt-0.5">
                    {(c.schedule_days ?? []).join(", ")}
                    {c.time_start && <span className="font-mono"> · {c.time_start.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</span>}
                  </div>
                </div>

                {/* Tarif umum */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="Tarif umum (per sesi)" hint="Berlaku untuk semua coach di kelas ini, kecuali yang punya tarif khusus">
                      <Input
                        type="number"
                        value={generalRates[c.id] ?? ""}
                        onChange={e => setGeneralRates(r => ({ ...r, [c.id]: e.target.value }))}
                        className="font-mono"
                        placeholder="150000"
                      />
                    </Field>
                  </div>
                  <Btn variant="soft" size="sm" onClick={() => saveGeneral(c.id)} disabled={saving === c.id}>
                    {saving === c.id ? "…" : "Simpan"}
                  </Btn>
                </div>

                {/* Tarif khusus per coach */}
                {coaches.length > 0 && (
                  <div className="border-t border-line pt-3 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tarif Khusus per Coach <span className="normal-case font-normal text-ink-faint">(opsional — override tarif umum)</span></div>
                    {coaches.map(coach => {
                      const key = `${c.id}:${coach.id}`;
                      const isSaving = saving === key;
                      return (
                        <div key={coach.id} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 w-36 shrink-0">
                            <Avatar name={coach.full_name} size={24} />
                            <span className="text-xs text-ink-soft truncate">{coach.full_name}</span>
                          </div>
                          <div className="flex-1">
                            <Input
                              type="number"
                              value={coachRates[key] ?? ""}
                              onChange={e => setCoachRates(r => ({ ...r, [key]: e.target.value }))}
                              className="font-mono text-sm"
                              placeholder={generalRates[c.id] ? `Pakai umum (${Number(generalRates[c.id]).toLocaleString("id-ID")})` : "Belum ada tarif umum"}
                            />
                          </div>
                          <Btn variant="soft" size="sm" onClick={() => saveCoachRate(c.id, coach.id)} disabled={isSaving}>
                            {isSaving ? "…" : coachRates[key] ? "Simpan" : "Hapus"}
                          </Btn>
                        </div>
                      );
                    })}
                    <p className="text-[11px] text-ink-faint">Kosongkan input untuk menghapus tarif khusus dan kembali ke tarif umum.</p>
                  </div>
                )}

                {coaches.length === 0 && (
                  <p className="text-xs text-ink-faint italic">Belum ada coach di kelas ini.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Invoices({ branches }: { branches: Branch[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("all");
  const [marking, setMarking] = useState<string | null>(null);
  const [detail, setDetail] = useState<Invoice | null>(null);

  const totPaid   = invoices.filter(i => i.status === "paid");
  const totUnpaid = invoices.filter(i => i.status !== "paid");

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    setLoading(true);
    const q = supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, submitted_at, paid_at, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(full_name), coach_invoice_items(id, class_id, session_count, rate, class:classes(name))")
      .order("submitted_at", { ascending: false });
    if (branchFilter !== "all") q.eq("branch_id", branchFilter);
    q.then(({ data }) => {
      if (data) setInvoices(data as unknown as Invoice[]);
      setLoading(false);
    });
  }, [branchFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const markPaid = async (id: string) => {
    setMarking(id);
    const { error } = await supabase.from("coach_invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    setMarking(null);
    if (error) return toast.error("Gagal update", error.message);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid", paid_at: new Date().toISOString() } : i));
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: "paid", paid_at: new Date().toISOString() } : prev);
    toast.success("Invoice ditandai lunas");
  };

  const printInvoice = (iv: Invoice) => {
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    // Group items by class
    const itemMap: Record<string, { name: string; sessions: number; rate: number }> = {};
    (iv.coach_invoice_items ?? []).forEach(item => {
      if (!itemMap[item.class_id]) itemMap[item.class_id] = { name: item.class?.name ?? item.class_id, sessions: 0, rate: item.rate };
      itemMap[item.class_id].sessions += item.session_count;
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
          <h2 className="font-display font-bold text-2xl">Invoice Coach</h2>
          <p className="text-ink-mute text-sm mt-0.5">Semua invoice yang di-generate coach dari coach page.</p>
        </div>
        <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-44">
          <option value="all">Semua cabang</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Total invoice"  value={invoices.length}                                              icon="invoice" tone="ocean" />
        <Stat label="Belum dibayar"  value={fmtIDR(totUnpaid.reduce((a, i) => a + i.total_amount, 0))}   icon="warning" tone="warn"  sub={`${totUnpaid.length} invoice`} />
        <Stat label="Sudah dibayar"  value={fmtIDR(totPaid.reduce((a, i) => a + i.total_amount, 0))}     icon="check"   tone="ok"    sub={`${totPaid.length} invoice`} />
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
                    <Status kind={iv.status === "paid" ? "paid" : "pending"}>{iv.status === "paid" ? "Lunas" : "Pending"}</Status>
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
                  {iv.status !== "paid" && (
                    <Btn variant="soft" size="sm" onClick={() => markPaid(iv.id)} disabled={marking === iv.id}>
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
              {detail?.status !== "paid" && (
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
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Status</div><Status kind={detail.status === "paid" ? "paid" : "pending"}>{detail.status === "paid" ? "Lunas" : "Pending"}</Status></div>
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
                  {/* Group by class */}
                  {(() => {
                    const map: Record<string, { name: string; sessions: number; rate: number }> = {};
                    (detail.coach_invoice_items ?? []).forEach(item => {
                      if (!map[item.class_id]) map[item.class_id] = { name: item.class?.name ?? item.class_id, sessions: 0, rate: item.rate };
                      map[item.class_id].sessions += item.session_count;
                    });
                    return Object.values(map).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-line text-sm">
                        <div>
                          <div className="font-semibold text-ink">{item.name}</div>
                          <div className="text-xs text-ink-mute">{item.sessions} sesi × {fmtIDR(item.rate)}</div>
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
  { section: "Keuangan" },
  { id: "rates",     label: "Tarif Coach",   icon: "settings"},
  { id: "invoices",  label: "Invoice Coach", icon: "invoice" },
  { section: "Konten" },
  { id: "landing",   label: "Landing Page",  icon: "star"    },
];

const TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard",      "Owner overview · semua cabang"],
  branches:  ["Cabang",         "Kelola cabang Next Swimming School"],
  admins:    ["Admin",          "Akun admin per cabang"],
  classes:   ["Kelas",          "Semua kelas lintas cabang"],
  rates:     ["Settings Tarif", "Tarif coach per kelas"],
  invoices:  ["Invoice Coach",  "Invoice masuk dari semua coach"],
  landing:   ["Landing Page",   "Kelola konten halaman depan"],
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
      supabase.from("branches").select("id, name, city, address, status, wa_numbers").order("name"),
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

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard branches={branches} />,
    branches:  <Branches branches={branches} onRefresh={loadBranches} />,
    admins:    <Admins branches={branches} />,
    classes:   <Classes branches={branches} />,
    rates:     <SettingsTarif branches={branches} />,
    invoices:  <Invoices branches={branches} />,
    landing:   <LandingCMS />,
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

    </div>
  );
}
