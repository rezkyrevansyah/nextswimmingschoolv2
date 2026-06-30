"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { fmtIDR } from "@/lib/utils";

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

export default function AdminFinancial({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const [bills, setBills] = useState<FinancialRow[]>([]);
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

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("classes").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setClassList(data as { id: string; name: string }[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset page on any filter change
  useEffect(() => { setPage(0); }, [search, filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo]);

  const filtered = useMemo(() => {
    let r = bills;
    if (filterStatus) r = r.filter(b => b.status === filterStatus);
    if (filterType)   r = r.filter(b => b.type === filterType);
    if (filterClass)  r = r.filter(b => b.class_id === filterClass);
    if (filterMethod) r = r.filter(b => (b.paid_method ?? "").toLowerCase() === filterMethod);
    if (filterDateFrom) r = r.filter(b => (b.paid_at ?? b.created_at).slice(0, 10) >= filterDateFrom);
    if (filterDateTo)   r = r.filter(b => (b.paid_at ?? b.created_at).slice(0, 10) <= filterDateTo);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(b =>
        b.member?.profile?.full_name?.toLowerCase().includes(q) ||
        b.period_label.toLowerCase().includes(q) ||
        (b.class?.name ?? "").toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b2) => {
      const va = sortBy === "total" ? (a.total ?? 0) : (a[sortBy] ?? "");
      const vb = sortBy === "total" ? (b2.total ?? 0) : (b2[sortBy] ?? "");
      if (va === vb) return 0;
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [bills, search, filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo, sortBy, sortDir]);

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
  const totalPaid = paidBills.reduce((a, b) => a + (b.total ?? 0), 0);
  const totalUnpaid = unpaidBills.reduce((a, b) => a + (b.total ?? 0), 0);
  const totalDiscount = bills.reduce((a, b) => a + (b.discount ?? 0), 0);
  const thisMonthPaid = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(thisMonth));
  const thisMonthTotal = thisMonthPaid.reduce((a, b) => a + (b.total ?? 0), 0);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Financial</h2>
          <p className="text-ink-mute text-sm mt-0.5">Database keuangan & riwayat pembayaran cabang.</p>
        </div>
        <Btn variant="ghost" icon="refresh" onClick={load}>Refresh</Btn>
      </div>

      {/* Summary stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Lunas" value={paidBills.length} icon="check" tone="ok" sub={fmtIDR(totalPaid)} />
        <Stat label="Belum Lunas" value={unpaidBills.length} icon="warning" tone="warn" sub={fmtIDR(totalUnpaid)} />
        <Stat label="Diskon Diberikan" value={bills.filter(b => b.discount > 0).length} icon="invoice" tone="ocean" sub={fmtIDR(totalDiscount)} />
        <Stat label="Bulan Ini (Lunas)" value={thisMonthPaid.length} icon="calendar" tone="ocean" sub={fmtIDR(thisMonthTotal)} />
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Input placeholder="Cari nama member, periode, kelas…" value={search} onChange={e => setSearch(e.target.value)} />
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-ink-mute">Tidak ada data.</td></tr>
                  ) : paginated.map(b => (
                    <tr key={b.id} className="hover:bg-paper-tint/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink text-sm">{b.member?.profile?.full_name ?? "—"}</div>
                      </td>
                      <td className="px-3 py-3 text-ink-soft hidden md:table-cell">{b.class?.name ?? <span className="text-ink-faint">—</span>}</td>
                      <td className="px-3 py-3 text-ink-soft">{b.period_label}</td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded-md bg-paper-tint border border-line text-xs font-semibold text-ink-soft">{typeLabel(b.type)}</span>
                      </td>
                      <td className="px-3 py-3 text-ink-soft text-xs capitalize hidden lg:table-cell">{b.paid_method ?? <span className="text-ink-faint">—</span>}</td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                        {b.paid_at ? b.paid_at.slice(0, 10) : <span className="text-ink-faint">{b.created_at.slice(0, 10)}</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-mono font-bold text-ink">{fmtIDR(b.total ?? 0)}</div>
                        {b.discount > 0 && <div className="text-[10px] text-ok-600 font-semibold">−{fmtIDR(b.discount)}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <Status kind={statusKind(b.status)} dot={false}>{statusLabel(b.status)}</Status>
                      </td>
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
  );
}
