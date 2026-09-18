"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { useAdminFinancialData } from "./useAdminFinancialData";

type AdminFinancialDataHook = ReturnType<typeof useAdminFinancialData>;

function SortBtn({ hook, col, label }: { hook: AdminFinancialDataHook; col: "paid_at" | "created_at" | "total"; label: string }) {
  const { sortBy, setSortBy, sortDir, setSortDir } = hook;
  return (
    <button onClick={() => { if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("desc"); } }}
      className="flex items-center gap-1 hover:text-ocean-600 transition-colors">
      {label}
      <span className="text-[10px]">{sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

export default function IncomeTab({ hook }: { hook: AdminFinancialDataHook }) {
  const {
    bills, manualIncome, loading,
    search, setSearch, filterStatus, setFilterStatus, filterType, setFilterType, filterClass, setFilterClass,
    filterMethod, setFilterMethod, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    showFilters, setShowFilters, setPage, classList,
    paginated, totalPages, safePage, filtered,
    activeFilterCount, resetFilters,
    paidBills, unpaidBills, totalPaid, totalUnpaid, totalDiscount, thisMonthPaid, thisMonthManual, thisMonthTotal,
    typeLabel, statusKind, statusLabel,
    openAddTxn, openEditTxn, deleteTxn,
  } = hook;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("income")}>{"Add Income"}</Btn>
      </div>

      {/* Summary stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={"Paid"} value={paidBills.length + manualIncome.length} icon="check" tone="ok" sub={fmtIDR(totalPaid)} />
        <Stat label={"Unpaid"} value={unpaidBills.length} icon="warning" tone="warn" sub={fmtIDR(totalUnpaid)} />
        <Stat label={"Discount Given"} value={bills.filter(b => b.discount > 0).length} icon="invoice" tone="ocean" sub={fmtIDR(totalDiscount)} />
        <Stat label={"This Month (Paid)"} value={thisMonthPaid.length + thisMonthManual.length} icon="calendar" tone="ocean" sub={fmtIDR(thisMonthTotal)} />
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Input placeholder={"Search student name, period, class, description…"} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? "bg-ocean-50 border-ocean-300 text-ocean-700" : "border-line text-ink-soft hover:border-ocean-300"}`}>
            <Icon name="settings" className="w-4 h-4" />
            {"Filter"}
            {activeFilterCount > 0 && <span className="bg-ocean-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-line text-sm font-semibold text-danger-600 hover:bg-danger-50 transition-colors">
              <Icon name="x" className="w-4 h-4" />{"Reset"}
            </button>
          )}
        </div>

        {showFilters && (
          <Card padded={false}>
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label={"Status"}>
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">{"— All statuses —"}</option>
                  <option value="paid">{"Paid"}</option>
                  <option value="unpaid">{"Unpaid"}</option>
                  <option value="partial">{"Partial"}</option>
                  <option value="school_covered">{"School"}</option>
                  <option value="free">{"Free"}</option>
                </Select>
              </Field>
              <Field label={"Type"}>
                <Select value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">{"— All types —"}</option>
                  <option value="monthly">{"Monthly"}</option>
                  <option value="session_pack">{"Session Pack"}</option>
                  <option value="custom">{"Custom"}</option>
                </Select>
              </Field>
              <Field label={"Class"}>
                <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                  <option value="">{"— All classes —"}</option>
                  {classList.map(c => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
                </Select>
              </Field>
              <Field label={"Payment Method"}>
                <Select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                  <option value="">{"— All methods —"}</option>
                  <option value="transfer">{"Transfer"}</option>
                  <option value="cash">{"Cash"}</option>
                  <option value="qris">{"QRIS"}</option>
                </Select>
              </Field>
              <Field label={"Date from"}>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="font-mono" />
              </Field>
              <Field label={"Date to"}>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="font-mono" />
              </Field>
            </div>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{"Loading data…"}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-tint">
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{"Student"}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden md:table-cell">{"Class"}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{"Period"}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden lg:table-cell">{"Type"}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden lg:table-cell">{"Method"}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">
                      <SortBtn hook={hook} col="paid_at" label={"Date"} />
                    </th>
                    <th className="text-right px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">
                      <SortBtn hook={hook} col="total" label={"Total"} />
                    </th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{"Status"}</th>
                    <th className="px-3 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-ink-mute">{"No data."}</td></tr>
                  ) : paginated.map(row => row.source === "manual" ? (
                    <tr key={row.id} className="hover:bg-paper-tint/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink text-sm">
                          <NoTranslate>{row.description}</NoTranslate>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">{"Manual"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-soft hidden md:table-cell">—</td>
                      <td className="px-3 py-3 text-ink-soft"><NoTranslate>{row.category ?? "—"}</NoTranslate></td>
                      <td className="px-3 py-3 hidden lg:table-cell">—</td>
                      <td className="px-3 py-3 hidden lg:table-cell">—</td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-soft">{row.occurred_at.slice(0, 10)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-mono font-bold text-ink">{fmtIDR(row.amount)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Status kind="paid" dot={false}>{"Recorded"}</Status>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title={"Edit"}><Icon name="edit" className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={"Delete"}><Icon name="trash" className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="hover:bg-paper-tint/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink text-sm"><NoTranslate>{row.member?.profile?.full_name ?? "—"}</NoTranslate></div>
                      </td>
                      <td className="px-3 py-3 text-ink-soft hidden md:table-cell">{row.class?.name ? <NoTranslate>{row.class.name}</NoTranslate> : <span className="text-ink-faint">—</span>}</td>
                      <td className="px-3 py-3 text-ink-soft"><NoTranslate>{row.period_label}</NoTranslate></td>
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
              <div className="text-ink-mute text-xs">{`${filtered.length} transactions · page ${safePage + 1} of ${totalPages}`}</div>
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
