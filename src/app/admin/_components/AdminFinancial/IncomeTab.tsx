"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
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
  const { t } = useLocale();
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
        <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("income")}>{t("admin.financial.addIncomeBtn")}</Btn>
      </div>

      {/* Summary stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={t("admin.financial.statPaid")} value={paidBills.length + manualIncome.length} icon="check" tone="ok" sub={fmtIDR(totalPaid)} />
        <Stat label={t("admin.financial.statUnpaid")} value={unpaidBills.length} icon="warning" tone="warn" sub={fmtIDR(totalUnpaid)} />
        <Stat label={t("admin.financial.statDiscountGiven")} value={bills.filter(b => b.discount > 0).length} icon="invoice" tone="ocean" sub={fmtIDR(totalDiscount)} />
        <Stat label={t("admin.financial.statThisMonthPaid")} value={thisMonthPaid.length + thisMonthManual.length} icon="calendar" tone="ocean" sub={fmtIDR(thisMonthTotal)} />
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Input placeholder={t("admin.financial.searchIncomePlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? "bg-ocean-50 border-ocean-300 text-ocean-700" : "border-line text-ink-soft hover:border-ocean-300"}`}>
            <Icon name="settings" className="w-4 h-4" />
            {t("admin.financial.filterBtn")}
            {activeFilterCount > 0 && <span className="bg-ocean-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-line text-sm font-semibold text-danger-600 hover:bg-danger-50 transition-colors">
              <Icon name="x" className="w-4 h-4" />{t("admin.financial.resetBtn")}
            </button>
          )}
        </div>

        {showFilters && (
          <Card padded={false}>
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label={t("admin.financial.fieldStatus")}>
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">{t("admin.financial.allStatusesOpt2")}</option>
                  <option value="paid">{t("admin.pembayaran.statusPaid")}</option>
                  <option value="unpaid">{t("admin.pembayaran.statusUnpaid")}</option>
                  <option value="partial">{t("admin.pembayaran.statusPartial")}</option>
                  <option value="school_covered">{t("admin.pembayaran.statusSchoolCovered")}</option>
                  <option value="free">{t("admin.pembayaran.statusFree")}</option>
                </Select>
              </Field>
              <Field label={t("admin.financial.fieldType")}>
                <Select value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">{t("admin.financial.allTypesOpt")}</option>
                  <option value="monthly">{t("admin.pembayaran.typeMonthly")}</option>
                  <option value="session_pack">{t("admin.pembayaran.typeSessionPack")}</option>
                  <option value="custom">{t("admin.pembayaran.typeCustom")}</option>
                </Select>
              </Field>
              <Field label={t("admin.financial.fieldClassFilter")}>
                <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                  <option value="">{t("admin.financial.allClassesOpt2")}</option>
                  {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label={t("admin.financial.fieldPaymentMethod")}>
                <Select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                  <option value="">{t("admin.financial.allMethodsOpt")}</option>
                  <option value="transfer">{t("admin.financial.methodTransfer")}</option>
                  <option value="cash">{t("admin.financial.methodCash")}</option>
                  <option value="qris">{t("admin.financial.methodQris")}</option>
                </Select>
              </Field>
              <Field label={t("admin.financial.fieldDateFrom")}>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="font-mono" />
              </Field>
              <Field label={t("admin.financial.fieldDateTo")}>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="font-mono" />
              </Field>
            </div>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("admin.financial.loadingData")}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-tint">
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("admin.financial.colMember")}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden md:table-cell">{t("admin.financial.colClassCol")}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("admin.financial.colPeriod")}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden lg:table-cell">{t("admin.financial.colType")}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide hidden lg:table-cell">{t("admin.financial.colMethodCol")}</th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">
                      <SortBtn hook={hook} col="paid_at" label={t("admin.financial.colDateCol")} />
                    </th>
                    <th className="text-right px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">
                      <SortBtn hook={hook} col="total" label={t("admin.financial.colTotalCol")} />
                    </th>
                    <th className="text-left px-3 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("admin.financial.colStatusCol")}</th>
                    <th className="px-3 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-ink-mute">{t("admin.financial.noData")}</td></tr>
                  ) : paginated.map(row => row.source === "manual" ? (
                    <tr key={row.id} className="hover:bg-paper-tint/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink text-sm">
                          {row.description}
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">{t("admin.financial.manualBadge")}</span>
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
                        <Status kind="paid" dot={false}>{t("admin.financial.recordedStatus")}</Status>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title={t("common.actions.edit")}><Icon name="edit" className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={t("common.actions.delete")}><Icon name="trash" className="w-3.5 h-3.5" /></button>
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
              <div className="text-ink-mute text-xs">{t("admin.financial.txnCountLabel", { count: filtered.length, page: safePage + 1, total: totalPages })}</div>
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
