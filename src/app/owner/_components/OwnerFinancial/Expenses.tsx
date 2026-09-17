"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Stat } from "@/components/ui/Card";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { FinancialHook } from "./index";

export default function Expenses({ hook }: { hook: FinancialHook }) {
  const { t } = useLocale();
  const {
    setShowCategoryManager, openAddTxn, manualExpense, branches,
    expenseSearch, setExpenseSearch, expenseBranch, setExpenseBranch,
    expenseCategoryFilter, setExpenseCategoryFilter, expenseStatus, setExpenseStatus,
    filteredExpenses, loadingExpenses, expensePagedRows,
    openEditTxn, deleteTxn, setSelectedExpenseDetail,
    expenseSafePage, expenseTotalPages, setExpensePage,
  } = hook;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Btn variant="soft" icon="settings" size="sm" onClick={() => setShowCategoryManager("expense")}>{t("owner.financial.manageCategoriesBtn")}</Btn>
        <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("expense")}>{t("owner.financial.addExpenseBtn")}</Btn>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Stat label={t("owner.financial.statReimburseAdmin")} value={manualExpense.filter(t => t.is_reimburse).length} icon="invoice" tone="warn"
          sub={fmtIDR(manualExpense.filter(t => t.is_reimburse).reduce((s, t) => s + t.amount, 0))} />
      </div>
      <div className="bg-paper border border-line rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} placeholder={t("owner.financial.searchExpensePlaceholder")} className="w-full pl-9 pr-3 h-10 text-sm rounded-xl border border-line bg-paper text-ink focus:outline-none focus:border-ocean-500 transition" />
          </div>
          <select value={expenseBranch} onChange={e => setExpenseBranch(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="all">{t("owner.financial.allBranches")}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={expenseCategoryFilter} onChange={e => setExpenseCategoryFilter(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="all">{t("owner.financial.filterAllCategories")}</option>
            <option value="coach_salary">{t("owner.financial.filterCoachSalary")}</option>
            <option value="staff_salary">{t("owner.financial.filterStaffSalary")}</option>
            <option value="reimburse">{t("owner.financial.filterReimburse")}</option>
            <option value="manual">{t("owner.financial.filterManual")}</option>
          </select>
          <select value={expenseStatus} onChange={e => setExpenseStatus(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="">{t("owner.financial.allStatus")}</option>
            <option value="paid">{t("owner.financial.statusPaid")}</option>
            <option value="approved">{t("owner.financial.statusApproved")}</option>
            <option value="pending">{t("owner.financial.statusPending")}</option>
          </select>
          {(expenseSearch || expenseStatus || expenseBranch !== "all" || expenseCategoryFilter !== "all") && (
            <button onClick={() => { setExpenseSearch(""); setExpenseStatus(""); setExpenseBranch("all"); setExpenseCategoryFilter("all"); }} className="text-xs text-ocean-600 hover:underline">{t("owner.financial.resetBtn")}</button>
          )}
          <span className="text-xs font-semibold text-ink-mute ml-auto">{t("owner.financial.invoiceCount", { count: filteredExpenses.length })}</span>
        </div>
      </div>

      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {loadingExpenses ? (
          <div className="p-10 text-center text-ink-mute text-sm">{t("owner.financial.loading")}</div>
        ) : expensePagedRows.length === 0 ? (
          <div className="p-10 text-center text-ink-mute text-sm">{t("owner.financial.empty")}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="h-9 border-b border-line bg-paper-deep text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                    <th className="text-left px-4 py-2">{t("owner.financial.colBranch")}</th>
                    <th className="text-left px-4 py-2">{t("owner.financial.colCategory")}</th>
                    <th className="text-left px-4 py-2">{t("owner.financial.colReceiver")}</th>
                    <th className="text-left px-4 py-2">{t("owner.financial.colPeriodRef")}</th>
                    <th className="text-right px-4 py-2">{t("owner.financial.colGross")}</th>
                    <th className="text-right px-4 py-2">{t("owner.financial.colTax")}</th>
                    <th className="text-right px-4 py-2">{t("owner.financial.colOtherDeductions")}</th>
                    <th className="text-right px-4 py-2 text-ocean-800">{t("owner.financial.colNetTransferred")}</th>
                    <th className="text-center px-4 py-2">{t("owner.financial.colStatus")}</th>
                    <th className="text-left px-4 py-2">{t("owner.financial.colDate")}</th>
                    <th className="px-4 py-2 w-24 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {expensePagedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-paper-tint transition-colors">
                      <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.branchName}</NoTranslate></td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          row.categoryKey === "coach_salary" ? "bg-ocean-50 text-ocean-700 border-ocean-200" :
                          row.categoryKey === "staff_salary" ? "bg-purple-50 text-purple-700 border-purple-200" :
                          row.categoryKey === "reimburse" ? "bg-warn-50 text-warn-700 border-warn-200" :
                          "bg-paper-deep text-ink-mute border-line"
                        }`}>
                          <NoTranslate>{row.categoryLabel}</NoTranslate>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-ink">
                        <div><NoTranslate>{row.receiverName}</NoTranslate></div>
                        {row.sourceType === "manual" && row.description !== row.receiverName && (
                          <div className="text-xs text-ink-mute"><NoTranslate>{row.description}</NoTranslate></div>
                        )}
                        {row.proofUrl && (
                          <a href={row.proofUrl} target="_blank" rel="noreferrer" className="block text-xs text-ocean-600 hover:underline mt-0.5 w-fit">
                            <Icon name="link" className="w-3 h-3 inline mr-1" />{t("owner.financial.viewProof")}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-soft">
                        <div><NoTranslate>{row.periodLabel !== "—" ? row.periodLabel : row.referenceNumber}</NoTranslate></div>
                        {row.periodLabel !== "—" && row.referenceNumber !== "—" && (
                          <div className="font-mono text-[11px] text-ink-mute"><NoTranslate>{row.referenceNumber}</NoTranslate></div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-soft">{fmtIDR(row.grossAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {row.taxAmount > 0 ? (
                          <span className="text-warn-700 font-semibold">-{fmtIDR(row.taxAmount)}</span>
                        ) : (
                          <span className="text-ink-mute">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {row.otherDeductions > 0 ? (
                          <span className="text-danger-700 font-semibold">-{fmtIDR(row.otherDeductions)}</span>
                        ) : (
                          <span className="text-ink-mute">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-ocean-700 text-sm">
                        {fmtIDR(row.netTransferredAmount)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.status === "paid" ? "bg-ok-50 text-ok-700" :
                          row.status === "approved" ? "bg-ocean-50 text-ocean-700" :
                          "bg-warn-50 text-warn-700"
                        }`}>
                          {row.status === "paid" ? t("owner.financial.statusPaid") :
                           row.status === "approved" ? t("owner.financial.statusApproved") :
                           t("owner.financial.statusPending")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute">
                        {row.date ? new Date(row.date).toLocaleDateString("id-ID", { dateStyle: "short" }) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          {row.sourceType === "manual" && row.rawManual ? (
                            <>
                              <button onClick={() => openEditTxn(row.rawManual!)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title={t("owner.financial.editBtn")}><Icon name="edit" className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteTxn(row.rawManual!)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={t("owner.financial.deleteBtn")}><Icon name="trash" className="w-3.5 h-3.5" /></button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedExpenseDetail(row)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-line bg-white hover:bg-paper-deep text-ink-soft transition-colors"
                            >
                              {t("owner.financial.detailBtn")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
              <div className="text-ink-mute text-xs">{t("owner.financial.invoicesPage", { count: filteredExpenses.length, page: expenseSafePage + 1, total: expenseTotalPages })}</div>
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
  );
}
