"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
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
  branch?: { name: string } | null;
  class_coaches?: { profile: { full_name: string } | null }[];
}

interface CoachRate {
  id: string;
  class_id: string;
  coach_id: string | null;
  rate_per_session: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  bank_info: string | null;
  submitted_at: string;
  branch?: { name: string } | null;
  coach?: { full_name: string } | null;
  items_count?: number;
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
    const yes = await confirm(`Arsipkan cabang "${b.name}"?`, "Data tidak akan dihapus, hanya disembunyikan dari panel aktif.");
    if (!yes) return;
    const { error } = await supabase.from("branches").update({ status: "archived" }).eq("id", b.id);
    if (error) return toast.error("Gagal mengarsipkan", error.message);
    toast.success("Cabang diarsipkan");
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
      const json = await res.json() as { error?: string };
      if (!res.ok) { toast.error("Gagal membuat admin", json.error); setSaving(false); return; }
      toast.success("Admin dibuat", "Akun langsung aktif");
      setSaving(false);
      setShowAdd(false);
      load();
    }
  };

  const removeAdmin = async (a: AdminProfile) => {
    const yes = await confirm(`Hapus akun admin ${a.full_name}?`, "Akun login dan data profil akan dihapus permanen.");
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">Admin</th>
                <th className="text-left py-3 font-bold">Email</th>
                <th className="text-left py-3 font-bold">WhatsApp</th>
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
                      <div className="font-semibold">{a.full_name}</div>
                    </div>
                  </td>
                  <td className="text-ink-mute">{a.email}</td>
                  <td className="text-ink-mute">{a.phone ?? "—"}</td>
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
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 karakter" />
          </Field>}
        </div>
      </Modal>
    </div>
  );
}

function Classes({ branches }: { branches: Branch[] }) {
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("all");

   
  useEffect(() => {
    const q = supabase
      .from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, schedule_days, time_start, time_end, branch:branches(name), class_coaches(profile:profiles(full_name))")
      .eq("status", "active")
      .order("name");

    if (branchFilter !== "all") q.eq("branch_id", branchFilter);

    q.then(({ data }) => {
      if (data) setClasses(data as unknown as ClassRow[]);
      setLoading(false);
    });
  }, [branchFilter]); // eslint-disable-line react-hooks/exhaustive-deps
   

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Semua Kelas — Lintas Cabang</h2>
          <p className="text-ink-mute text-sm mt-0.5">View-only. CRUD kelas dilakukan oleh admin cabang masing-masing.</p>
        </div>
        <div className="flex gap-2">
          <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-44">
            <option value="all">Semua cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
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
                  <th className="text-left py-3 px-5 font-bold">Kelas</th>
                  <th className="text-left py-3 font-bold">Cabang</th>
                  <th className="text-left py-3 font-bold">Coach</th>
                  <th className="text-left py-3 font-bold">Jadwal</th>
                  <th className="text-right py-3 font-bold">Kapasitas</th>
                  <th className="text-right py-3 pr-5 font-bold">Harga/bln</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {classes.map((c) => {
                  const coaches = c.class_coaches?.map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
                  const pct = c.enrolled / (c.capacity || 1);
                  return (
                    <tr key={c.id} className="hover:bg-paper-tint">
                      <td className="py-3.5 px-5 font-semibold text-ink">{c.name}</td>
                      <td className="text-ink-soft">{c.branch?.name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {coaches.length > 0 ? (
                            <><Avatar name={coaches[0]!} size={26} /><span className="text-ink-soft text-xs">{coaches[0]}</span></>
                          ) : <span className="text-ink-faint text-xs">—</span>}
                        </div>
                      </td>
                      <td className="text-ink-mute text-xs">
                        <div>{(c.schedule_days ?? []).join(", ")}</div>
                        <div className="font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
                      </td>
                      <td className="text-right">
                        <div className="font-mono font-semibold">{c.enrolled}/{c.capacity}</div>
                        <div className="w-20 h-1 bg-paper-deep rounded-full ml-auto mt-1 overflow-hidden">
                          <div className={`h-full ${pct >= 1 ? "bg-danger-500" : pct > 0.7 ? "bg-warn-500" : "bg-ok-500"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                        </div>
                      </td>
                      <td className="text-right font-mono font-semibold pr-5">{fmtIDR(c.price_monthly)}</td>
                    </tr>
                  );
                })}
                {classes.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-ink-mute">Tidak ada kelas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SettingsTarif({ branches }: { branches: Branch[] }) {
  const toast = useToast();
  const supabase = createClient();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

   
  useEffect(() => {
    if (!branchId) return;
    supabase
      .from("classes")
      .select("id, name, schedule_days, time_start, time_end, branch_id, status, capacity, enrolled, price_monthly")
      .eq("branch_id", branchId)
      .eq("status", "active")
      .order("name")
      .then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });

    supabase
      .from("coach_rates")
      .select("id, class_id, coach_id, rate_per_session")
      .is("coach_id", null)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          (data as CoachRate[]).forEach(r => { map[r.class_id] = r.rate_per_session; });
          setRates(map);
        }
      });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps
   

  const saveRate = async (classId: string) => {
    const val = rates[classId];
    if (!val) return toast.error("Masukkan nominal tarif");
    setSaving(classId);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).is("coach_id", null).single();
    const op = existing
      ? supabase.from("coach_rates").update({ rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: null, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Tarif disimpan");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">Settings Tarif Coach</h2>
        <p className="text-ink-mute text-sm mt-0.5">Set tarif per sesi per kelas.</p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-sm font-semibold text-ink-soft">Cabang:</span>
          <div className="flex gap-1.5 flex-wrap">
            {branches.map((b) => (
              <button key={b.id} onClick={() => setBranchId(b.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${branchId === b.id ? "bg-ocean-700 text-white" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"}`}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map((c) => (
            <Card key={c.id} className="!p-4">
              <div className="font-semibold text-ink">{c.name}</div>
              <div className="text-xs text-ink-mute mt-0.5 mb-3">{(c.schedule_days ?? []).join(", ")} · {c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
              <Field label="Tarif umum (per sesi)">
                <Input
                  type="number"
                  value={rates[c.id] ?? ""}
                  onChange={e => setRates(r => ({ ...r, [c.id]: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="font-mono"
                  placeholder="150000"
                />
              </Field>
              <Btn variant="soft" size="sm" className="mt-2 w-full" onClick={() => saveRate(c.id)} disabled={saving === c.id}>
                {saving === c.id ? "Menyimpan…" : "Simpan tarif"}
              </Btn>
            </Card>
          ))}
          {classes.length === 0 && <p className="text-ink-mute text-sm col-span-3">Tidak ada kelas untuk cabang ini.</p>}
        </div>
      </Card>
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

  const totPaid    = invoices.filter(i => i.status === "paid");
  const totUnpaid  = invoices.filter(i => i.status !== "paid");

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    setLoading(true);
    const q = supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, submitted_at, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(full_name)")
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
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid" } : i));
    toast.success("Invoice ditandai lunas");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl">Invoice Coach</h2>
          <p className="text-ink-mute text-sm mt-0.5">Semua invoice yang di-generate coach dari coach page.</p>
        </div>
        <div className="flex gap-2">
          <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-44">
            <option value="all">Semua cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Total invoice"   value={invoices.length}                     icon="invoice" tone="ocean" />
        <Stat label="Belum dibayar"   value={fmtIDR(totUnpaid.reduce((a,i) => a + i.total_amount, 0))} icon="warning" tone="warn" sub={`${totUnpaid.length} invoice`} />
        <Stat label="Sudah dibayar"   value={fmtIDR(totPaid.reduce((a,i) => a + i.total_amount, 0))}  icon="check"   tone="ok"   sub={`${totPaid.length} invoice`} />
      </div>
      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">Memuat data…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">No. Invoice</th>
                <th className="text-left py-3 font-bold">Coach</th>
                <th className="text-left py-3 font-bold">Cabang</th>
                <th className="text-left py-3 font-bold">Periode</th>
                <th className="text-right py-3 font-bold">Total</th>
                <th className="text-left py-3 font-bold">Rekening</th>
                <th className="text-left py-3 font-bold">Status</th>
                <th className="px-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.map((iv) => (
                <tr key={iv.id} className="hover:bg-paper-tint">
                  <td className="py-3.5 px-5 font-mono text-xs font-bold text-ocean-700">{iv.invoice_number}</td>
                  <td>{iv.coach?.full_name ?? "—"}</td>
                  <td className="text-ink-mute">{iv.branch?.name ?? "—"}</td>
                  <td className="text-ink-mute">{iv.period_label}</td>
                  <td className="text-right font-mono font-bold">{fmtIDR(iv.total_amount)}</td>
                  <td className="text-ink-mute text-xs">{iv.bank_info ?? "—"}</td>
                  <td><Status kind={iv.status === "paid" ? "paid" : iv.status === "pending" ? "pending" : "unpaid"}>{iv.status === "paid" ? "Lunas" : iv.status === "pending" ? "Menunggu" : "Belum"}</Status></td>
                  <td className="px-5">
                    {iv.status !== "paid" && (
                      <Btn variant="soft" size="sm" onClick={() => markPaid(iv.id)} disabled={marking === iv.id}>
                        {marking === iv.id ? "…" : "Tandai Lunas"}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-ink-mute">Tidak ada invoice</td></tr>
              )}
            </tbody>
          </table>
        )}
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
  { section: "Keuangan" },
  { id: "rates",     label: "Tarif Coach",   icon: "settings"},
  { id: "invoices",  label: "Invoice Coach", icon: "invoice" },
];

const TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard",      "Owner overview · semua cabang"],
  branches:  ["Cabang",         "Kelola cabang Next Swimming School"],
  admins:    ["Admin",          "Akun admin per cabang"],
  classes:   ["Kelas",          "Semua kelas lintas cabang"],
  rates:     ["Settings Tarif", "Tarif coach per kelas"],
  invoices:  ["Invoice Coach",  "Invoice masuk dari semua coach"],
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OwnerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [userId, setUserId] = useState("");

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" }); setUserId(user.id); }
    });
  }, [loadBranches]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard branches={branches} />,
    branches:  <Branches branches={branches} onRefresh={loadBranches} />,
    admins:    <Admins branches={branches} />,
    classes:   <Classes branches={branches} />,
    rates:     <SettingsTarif branches={branches} />,
    invoices:  <Invoices branches={branches} />,
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
