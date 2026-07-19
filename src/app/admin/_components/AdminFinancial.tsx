"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";

interface FinancialRow {
  id: string;
  member_id: string;
  class_id: string | null;
  period_label: string;
  amount: number;
  discount: number;
  total: number;
  status: string;
  type: string;
  paid_at: string | null;
  paid_method: string | null;
  created_at: string;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

interface ManualTxnRow {
  id: string; branch_id: string; kind: "income" | "expense"; category: string | null;
  description: string; amount: number; occurred_at: string; notes: string | null;
  is_reimburse: boolean; proof_url: string | null;
}

type IncomeRow = (FinancialRow & { source: "bill" }) | (ManualTxnRow & { source: "manual" });

const MANUAL_CATEGORY_OPTIONS = ["Sponsorship", "Sewa", "Listrik", "Perlengkapan", "Lainnya"];

type FinTab = "income" | "expenses";

export default function AdminFinancial({ branchId, userId, userName }: { branchId: string; userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<FinTab>("income");

  const [bills, setBills] = useState<FinancialRow[]>([]);
  const [manualTxns, setManualTxns] = useState<ManualTxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"paid_at" | "created_at" | "total">("paid_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .select("id, member_id, class_id, period_label, amount, discount, total, status, type, paid_at, paid_method, created_at, member:members(profile:profiles(full_name)), class:classes(name)")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (data) setBills(data as unknown as FinancialRow[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadManualTxns = useCallback(async () => {
    const { data } = await supabase.from("manual_transactions")
      .select("id, branch_id, kind, category, description, amount, occurred_at, notes, is_reimburse, proof_url")
      .eq("branch_id", branchId)
      .order("occurred_at", { ascending: false });
    if (data) setManualTxns(data as unknown as ManualTxnRow[]);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    loadManualTxns();
    supabase.from("classes").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setClassList(data as { id: string; name: string }[]); });
  }, [load, loadManualTxns]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset page on any filter change
  useEffect(() => { setPage(0); }, [search, filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo]);

  const manualIncome = useMemo(() => manualTxns.filter(t => t.kind === "income"), [manualTxns]);
  const manualExpense = useMemo(() => manualTxns.filter(t => t.kind === "expense"), [manualTxns]);

  const filtered = useMemo(() => {
    let r: IncomeRow[] = [
      ...bills.map(b => ({ ...b, source: "bill" as const })),
      ...manualIncome.map(t => ({ ...t, source: "manual" as const })),
    ];
    if (filterStatus) r = r.filter(row => row.source === "manual" || row.status === filterStatus);
    if (filterType)   r = r.filter(row => row.source === "manual" || row.type === filterType);
    if (filterClass)  r = r.filter(row => row.source === "manual" || row.class_id === filterClass);
    if (filterMethod) r = r.filter(row => row.source === "manual" || (row.paid_method ?? "").toLowerCase() === filterMethod);
    if (filterDateFrom) r = r.filter(row => (row.source === "manual" ? row.occurred_at : (row.paid_at ?? row.created_at)).slice(0, 10) >= filterDateFrom);
    if (filterDateTo)   r = r.filter(row => (row.source === "manual" ? row.occurred_at : (row.paid_at ?? row.created_at)).slice(0, 10) <= filterDateTo);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(row => row.source === "manual"
        ? row.description.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q)
        : row.member?.profile?.full_name?.toLowerCase().includes(q) || row.period_label.toLowerCase().includes(q) || (row.class?.name ?? "").toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b2) => {
      const va = sortBy === "total" ? (a.source === "manual" ? a.amount : a.total ?? 0) : (a.source === "manual" ? a.occurred_at : (a[sortBy] ?? ""));
      const vb = sortBy === "total" ? (b2.source === "manual" ? b2.amount : b2.total ?? 0) : (b2.source === "manual" ? b2.occurred_at : (b2[sortBy] ?? ""));
      if (va === vb) return 0;
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [bills, manualIncome, search, filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activeFilterCount = [filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo].filter(Boolean).length;
  const resetFilters = () => { setFilterStatus(""); setFilterType(""); setFilterClass(""); setFilterMethod(""); setFilterDateFrom(""); setFilterDateTo(""); };

  // Summary stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const paidBills = bills.filter(b => b.status === "paid");
  const unpaidBills = bills.filter(b => b.status === "unpaid" || b.status === "partial");
  const totalPaid = paidBills.reduce((a, b) => a + (b.total ?? 0), 0) + manualIncome.reduce((a, t) => a + t.amount, 0);
  const totalUnpaid = unpaidBills.reduce((a, b) => a + (b.total ?? 0), 0);
  const totalDiscount = bills.reduce((a, b) => a + (b.discount ?? 0), 0);
  const thisMonthPaid = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(thisMonth));
  const thisMonthManual = manualIncome.filter(t => t.occurred_at.startsWith(thisMonth));
  const thisMonthTotal = thisMonthPaid.reduce((a, b) => a + (b.total ?? 0), 0) + thisMonthManual.reduce((a, t) => a + t.amount, 0);
  const totalExpenseManual = manualExpense.reduce((a, t) => a + t.amount, 0);

  const typeLabel = (t: string) => ({ monthly: "Bulanan", session_pack: "Paket Sesi", custom: "Custom", package: "Paket" }[t] ?? t);
  const statusKind = (s: string): "paid" | "unpaid" | "school_covered" | "pending" => ({ paid: "paid", unpaid: "unpaid", partial: "pending", school_covered: "school_covered", free: "paid" }[s] as "paid" | "unpaid" | "school_covered" | "pending" ?? "unpaid");
  const statusLabel = (s: string) => ({ paid: "Lunas", unpaid: "Belum Bayar", partial: "Sebagian", school_covered: "Sekolah", free: "Gratis" }[s] ?? s);

  const SortBtn = ({ col, label }: { col: "paid_at" | "created_at" | "total"; label: string }) => (
    <button onClick={() => { if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("desc"); } }}
      className="flex items-center gap-1 hover:text-ocean-600 transition-colors">
      {label}
      <span className="text-[10px]">{sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );

  // ── Manual transaction CRUD ──────────────────────────────────────────────────
  const [showTxnModal, setShowTxnModal] = useState<{ kind: "income" | "expense"; edit: ManualTxnRow | null } | null>(null);
  const [txnForm, setTxnForm] = useState({ category: MANUAL_CATEGORY_OPTIONS[0], categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
  const [savingTxn, setSavingTxn] = useState(false);

  const openAddTxn = (kind: "income" | "expense") => {
    setTxnForm({ category: MANUAL_CATEGORY_OPTIONS[0], categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
    setShowTxnModal({ kind, edit: null });
  };

  const openEditTxn = (row: ManualTxnRow) => {
    const knownCategory = MANUAL_CATEGORY_OPTIONS.includes(row.category ?? "") ? (row.category ?? MANUAL_CATEGORY_OPTIONS[0]) : "Lainnya";
    setTxnForm({
      category: knownCategory, categoryOther: knownCategory === "Lainnya" ? (row.category ?? "") : "",
      description: row.description, amount: String(row.amount), occurred_at: row.occurred_at, notes: row.notes ?? "",
      isReimburse: row.is_reimburse, proofUrl: row.proof_url ?? "",
    });
    setShowTxnModal({ kind: row.kind, edit: row });
  };

  const saveTxn = async () => {
    if (!showTxnModal) return;
    if (!txnForm.description.trim()) return toast.error("Deskripsi wajib diisi");
    const amount = Number(txnForm.amount || 0);
    if (!amount || amount <= 0) return toast.error("Masukkan nominal yang valid");
    if (txnForm.isReimburse && !txnForm.proofUrl.trim()) return toast.error("Masukkan link bukti untuk pengeluaran reimburse");
    const category = txnForm.category === "Lainnya" ? (txnForm.categoryOther.trim() || "Lainnya") : txnForm.category;

    setSavingTxn(true);
    const payload = {
      branch_id: branchId, kind: showTxnModal.kind, category, description: txnForm.description.trim(),
      amount, occurred_at: txnForm.occurred_at, notes: txnForm.notes.trim() || null,
      is_reimburse: txnForm.isReimburse, proof_url: txnForm.isReimburse ? txnForm.proofUrl.trim() : null,
    };
    const isEdit = !!showTxnModal.edit;
    const { error } = isEdit
      ? await supabase.from("manual_transactions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", showTxnModal.edit!.id)
      : await supabase.from("manual_transactions").insert({ ...payload, created_by: userId, created_by_role: "admin" });
    setSavingTxn(false);
    if (error) return toast.error(isEdit ? "Gagal menyimpan" : "Gagal menambah", error.message);
    toast.success(isEdit ? "Transaksi diperbarui" : "Transaksi ditambahkan");
    logActivity(supabase, {
      userId, userRole: "admin", userName, branchId, entityType: "manual_transactions",
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
      userId, userRole: "admin", userName, branchId, entityType: "manual_transactions",
      entityId: row.id, action: "delete", label: `${row.kind === "income" ? "Income" : "Expense"} manual "${row.description}" (${fmtIDR(row.amount)}) dihapus`,
    });
    setManualTxns(prev => prev.filter(t => t.id !== row.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Financial</h2>
          <p className="text-ink-mute text-sm mt-0.5">Database keuangan &amp; riwayat pembayaran cabang.</p>
        </div>
        <Btn variant="ghost" icon="refresh" onClick={() => { load(); loadManualTxns(); }}>Refresh</Btn>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap bg-paper-tint border border-line rounded-xl p-1 w-fit">
        {([{ id: "income", label: "Income", icon: "wallet" }, { id: "expenses", label: "Expenses", icon: "invoice" }] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "bg-white text-ocean-700 shadow-card" : "text-ink-soft hover:bg-white/60"}`}>
            <Icon name={t.icon} className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "income" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("income")}>Tambah Income</Btn>
          </div>

          {/* Summary stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Lunas" value={paidBills.length + manualIncome.length} icon="check" tone="ok" sub={fmtIDR(totalPaid)} />
            <Stat label="Belum Lunas" value={unpaidBills.length} icon="warning" tone="warn" sub={fmtIDR(totalUnpaid)} />
            <Stat label="Diskon Diberikan" value={bills.filter(b => b.discount > 0).length} icon="invoice" tone="ocean" sub={fmtIDR(totalDiscount)} />
            <Stat label="Bulan Ini (Lunas)" value={thisMonthPaid.length + thisMonthManual.length} icon="calendar" tone="ocean" sub={fmtIDR(thisMonthTotal)} />
          </div>

          {/* Toolbar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Input placeholder="Cari nama member, periode, kelas, deskripsi…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={() => setShowFilters(f => !f)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? "bg-ocean-50 border-ocean-300 text-ocean-700" : "border-line text-ink-soft hover:border-ocean-300"}`}>
                <Icon name="settings" className="w-4 h-4" />
                Filter
                {activeFilterCount > 0 && <span className="bg-ocean-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
              </button>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-line text-sm font-semibold text-danger-600 hover:bg-danger-50 transition-colors">
                  <Icon name="x" className="w-4 h-4" />Reset
                </button>
              )}
            </div>

            {showFilters && (
              <Card padded={false}>
                <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Status">
                    <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="">— Semua status —</option>
                      <option value="paid">Lunas</option>
                      <option value="unpaid">Belum Bayar</option>
                      <option value="partial">Sebagian</option>
                      <option value="school_covered">Sekolah</option>
                      <option value="free">Gratis</option>
                    </Select>
                  </Field>
                  <Field label="Tipe">
                    <Select value={filterType} onChange={e => setFilterType(e.target.value)}>
                      <option value="">— Semua tipe —</option>
                      <option value="monthly">Bulanan</option>
                      <option value="session_pack">Paket Sesi</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </Field>
                  <Field label="Kelas">
                    <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                      <option value="">— Semua kelas —</option>
                      {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Metode Bayar">
                    <Select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                      <option value="">— Semua metode —</option>
                      <option value="transfer">Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="qris">QRIS</option>
                    </Select>
                  </Field>
                  <Field label="Tanggal dari">
                    <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="font-mono" />
                  </Field>
                  <Field label="Tanggal sampai">
                    <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="font-mono" />
                  </Field>
                </div>
              </Card>
            )}
          </div>

          {/* Table */}
          <Card padded={false}>
            {loading ? (
              <div className="p-10 text-center text-ink-mute">Memuat data…</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Member</th>
                        <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden md:table-cell">Kelas</th>
                        <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Periode</th>
                        <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden lg:table-cell">Tipe</th>
                        <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden lg:table-cell">Metode</th>
                        <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">
                          <SortBtn col="paid_at" label="Tanggal" />
                        </th>
                        <th className="text-right px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">
                          <SortBtn col="total" label="Total" />
                        </th>
                        <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">Status</th>
                        <th className="px-3 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {paginated.length === 0 ? (
                        <tr><td colSpan={9} className="py-12 text-center text-ink-mute">Tidak ada data.</td></tr>
                      ) : paginated.map(row => row.source === "manual" ? (
                        <tr key={row.id} className="hover:bg-paper-tint/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-ink text-sm">
                              {row.description}
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">Manual</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-ink-soft hidden md:table-cell">—</td>
                          <td className="px-3 py-3 text-ink-soft">{row.category ?? "—"}</td>
                          <td className="px-3 py-3 hidden lg:table-cell">—</td>
                          <td className="px-3 py-3 hidden lg:table-cell">—</td>
                          <td className="px-3 py-3 font-mono text-xs text-ink-soft">{row.occurred_at.slice(0, 10)}</td>
                          <td className="px-3 py-3 text-right">
                            <div className="font-mono font-bold text-ink">{fmtIDR(row.amount)}</div>
                          </td>
                          <td className="px-3 py-3">
                            <Status kind="paid" dot={false}>Tercatat</Status>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title="Edit"><Icon name="edit" className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className="hover:bg-paper-tint/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-ink text-sm">{row.member?.profile?.full_name ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3 text-ink-soft hidden md:table-cell">{row.class?.name ?? <span className="text-ink-faint">—</span>}</td>
                          <td className="px-3 py-3 text-ink-soft">{row.period_label}</td>
                          <td className="px-3 py-3 hidden lg:table-cell">
                            <span className="px-2 py-0.5 rounded-md bg-paper-tint border border-line text-xs font-semibold text-ink-soft">{typeLabel(row.type)}</span>
                          </td>
                          <td className="px-3 py-3 text-ink-soft text-xs capitalize hidden lg:table-cell">{row.paid_method ?? <span className="text-ink-faint">—</span>}</td>
                          <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                            {row.paid_at ? row.paid_at.slice(0, 10) : <span className="text-ink-faint">{row.created_at.slice(0, 10)}</span>}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="font-mono font-bold text-ink">{fmtIDR(row.total ?? 0)}</div>
                            {row.discount > 0 && <div className="text-[10px] text-ok-600 font-semibold">−{fmtIDR(row.discount)}</div>}
                          </td>
                          <td className="px-3 py-3">
                            <Status kind={statusKind(row.status)} dot={false}>{statusLabel(row.status)}</Status>
                          </td>
                          <td className="px-3 py-3"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
                  <div className="text-ink-mute text-xs">{filtered.length} transaksi · halaman {safePage + 1} dari {totalPages}</div>
                  <div className="flex gap-1">
                    {[
                      { label: "«", disabled: safePage === 0, action: () => setPage(0) },
                      { label: "‹", disabled: safePage === 0, action: () => setPage(p => Math.max(0, p - 1)) },
                      { label: "›", disabled: safePage >= totalPages - 1, action: () => setPage(p => Math.min(totalPages - 1, p + 1)) },
                      { label: "»", disabled: safePage >= totalPages - 1, action: () => setPage(totalPages - 1) },
                    ].map(({ label, disabled, action }) => (
                      <button key={label} onClick={action} disabled={disabled}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${disabled ? "text-ink-faint cursor-not-allowed" : "text-ink-soft hover:bg-paper-tint hover:text-ocean-600"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("expense")}>Tambah Expense</Btn>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Stat label="Total Expense Manual" value={manualExpense.length} icon="invoice" tone="danger" sub={fmtIDR(totalExpenseManual)} />
            <Stat label="Bulan Ini" value={manualExpense.filter(t => t.occurred_at.startsWith(thisMonth)).length} icon="calendar" tone="ocean" sub={fmtIDR(manualExpense.filter(t => t.occurred_at.startsWith(thisMonth)).reduce((a, t) => a + t.amount, 0))} />
          </div>

          <Card padded={false}>
            {manualExpense.length === 0 ? (
              <div className="p-10 text-center text-ink-mute">
                Belum ada expense manual — klik &ldquo;Tambah Expense&rdquo; di atas buat catat pengeluaran cabang seperti listrik, perlengkapan, dll.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {[...manualExpense].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map(row => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-paper-tint/50">
                    <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-600 flex items-center justify-center shrink-0">
                      <Icon name="invoice" className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink flex items-center gap-1.5">
                        {row.description}
                        {row.is_reimburse && <span className="px-1.5 py-0.5 rounded-full bg-warn-50 text-warn-700 text-[10px] font-semibold">Reimburse</span>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5">{row.category ?? "—"} · {row.occurred_at.slice(0, 10)}</div>
                      {row.notes && <div className="text-xs text-ink-faint mt-0.5">{row.notes}</div>}
                      {row.proof_url && (
                        <a href={row.proof_url} target="_blank" rel="noreferrer" className="text-xs text-ocean-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                          <Icon name="link" className="w-3 h-3" />Lihat bukti
                        </a>
                      )}
                    </div>
                    <div className="font-mono font-bold text-sm text-danger-700 shrink-0">{fmtIDR(row.amount)}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditTxn(row)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                      <button onClick={() => deleteTxn(row)} className="w-8 h-8 rounded-lg border border-line hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
          <Field label="Kategori">
            <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
              {MANUAL_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          {txnForm.category === "Lainnya" && (
            <Field label="Kategori Custom"><Input value={txnForm.categoryOther} onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))} placeholder="Contoh: Donasi alumni" /></Field>
          )}
          <Field label="Deskripsi"><Input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} placeholder="Contoh: Bayar listrik bulan ini" /></Field>
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
