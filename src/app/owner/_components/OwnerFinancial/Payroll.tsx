"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { FinancialHook } from "./index";

export default function Payroll({ hook }: { hook: FinancialHook }) {
  const { t, tNode } = useLocale();
  const {
    payrollTotalTax, payrollTotalHarusTransfer, payrollUnpaidCount, payrollTotalSudahTransfer, payrollPaidCount,
    payrollTotalGajiPokokDanHonor, payrollTotalReimburse,
    filteredPayrollItems, payrollTotalLoanDeduction,
    loadDetailedInvoices, loadStaffPayroll, loadStaffReimbursements, loadPayslips,
    loadingDetailedInvoices, loadingStaff,
    payrollBranchFilter, setPayrollBranchFilter, branches,
    payrollRecipientFilter, setPayrollRecipientFilter, payrollStatusFilter, setPayrollStatusFilter,
    payrollSearch, setPayrollSearch,
    copyToClipboard, staffList, setSalaryForm, setEditSalaryModal,
    setSelectedExpenseDetail, setSelectedInvoiceDetail,
    markingPaidId, markingStaffSalaryId, markInvoicePaid, markStaffSalaryPaid,
    supabase, toast,
  } = hook;

  return (
    <div className="space-y-4">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">{t("owner.financial.payrollHeading")}</h3>
          <p className="text-xs text-ink-mute mt-0.5">
            {t("owner.financial.payrollSub")}
          </p>
        </div>
        {payrollTotalTax > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warn-50 border border-warn-200 text-xs text-warn-800 shrink-0">
            <span className="font-bold">{t("owner.financial.payrollTaxWithheldBadge")}</span>
            <span className="font-mono font-extrabold">{fmtIDR(payrollTotalTax)}</span>
            <span className="text-[10px] text-warn-600">{t("owner.financial.payrollTaxWithheldNote")}</span>
          </div>
        )}
      </div>

      {/* Smart Financial Cards for Monthly Transfer Planning */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siap Ditransfer (Harus Ditransfer Bulan Ini) */}
        <div className="bg-white border border-warn-300/80 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-card transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warn-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-warn-800">
                {t("owner.financial.payrollCardUnpaidLabel")}
              </span>
            </div>
            <span className="w-8 h-8 rounded-lg bg-warn-50 text-warn-700 border border-warn-200 flex items-center justify-center shrink-0">
              <Icon name="wallet" className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="font-mono font-extrabold text-2xl text-warn-700 tracking-tight">
              {fmtIDR(payrollTotalHarusTransfer)}
            </div>
            <div className="text-xs text-ink-mute mt-1 flex items-center gap-1">
              {t("owner.financial.payrollCardUnpaidSub", { count: payrollUnpaidCount })}
            </div>
          </div>
        </div>

        {/* Card 2: Sudah Ditransfer (Lunas) */}
        <div className="bg-paper border border-line rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-ok-300 hover:shadow-card transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ok-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                {t("owner.financial.payrollCardPaidLabel")}
              </span>
            </div>
            <span className="w-8 h-8 rounded-lg bg-ok-50 text-ok-600 border border-ok-200 flex items-center justify-center shrink-0">
              <Icon name="check" className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="font-mono font-extrabold text-2xl text-ink tracking-tight">
              {fmtIDR(payrollTotalSudahTransfer)}
            </div>
            <div className="text-xs text-ink-mute mt-1 flex items-center gap-1">
              {t("owner.financial.payrollCardPaidSub", { count: payrollPaidCount })}
            </div>
          </div>
        </div>

        {/* Card 3: Total Gaji Pokok & Honor Sesi */}
        <div className="bg-paper border border-line rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-ocean-300 hover:shadow-card transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {t("owner.financial.payrollCardGrossLabel")}
            </span>
            <span className="w-8 h-8 rounded-lg bg-ocean-50 text-ocean-700 border border-ocean-200 flex items-center justify-center shrink-0">
              <Icon name="invoice" className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="font-mono font-extrabold text-2xl text-ink tracking-tight">
              {fmtIDR(payrollTotalGajiPokokDanHonor)}
            </div>
            <div className="text-xs text-ink-mute mt-1">
              {t("owner.financial.payrollCardGrossSub")}
            </div>
          </div>
        </div>

        {/* Card 4: Total Klaim Reimburse */}
        <div className="bg-paper border border-line rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-purple-300 hover:shadow-card transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {t("owner.financial.payrollCardReimburseLabel")}
            </span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
              <Icon name="card" className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="font-mono font-extrabold text-2xl text-purple-700 tracking-tight">
              {fmtIDR(payrollTotalReimburse)}
            </div>
            <div className="text-xs text-ink-mute mt-1">
              {t("owner.financial.payrollCardReimburseSub")}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Payroll Table with Advanced Filters */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {/* Advanced Filter Bar */}
        <div className="p-4 border-b border-line space-y-3 bg-paper-tint/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-sm text-ink">{t("owner.financial.payrollListTitle")}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ocean-50 text-ocean-700 border border-ocean-200">
                {t("owner.financial.payrollRecipientCount", { count: filteredPayrollItems.length })}
              </span>
              {payrollTotalLoanDeduction > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {t("owner.financial.payrollLoanDeductionBadge", { amount: fmtIDR(payrollTotalLoanDeduction) })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Btn
                variant="soft"
                size="sm"
                icon="refresh"
                onClick={() => {
                  loadDetailedInvoices();
                  loadStaffPayroll();
                  loadStaffReimbursements();
                  loadPayslips();
                }}
                disabled={loadingDetailedInvoices || loadingStaff}
              >
                {t("owner.financial.payrollRefreshBtn")}
              </Btn>
            </div>
          </div>

          {/* Filter Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Branch Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                {t("owner.financial.payrollFilterBranch")}
              </label>
              <select
                value={payrollBranchFilter}
                onChange={e => setPayrollBranchFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-line px-2.5 py-1.5 bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
              >
                <option value="all">{t("owner.financial.allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Recipient Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                {t("owner.financial.payrollFilterRecipient")}
              </label>
              <select
                value={payrollRecipientFilter}
                onChange={e => setPayrollRecipientFilter(e.target.value as "all" | "coach" | "staff")}
                className="w-full text-xs rounded-xl border border-line px-2.5 py-1.5 bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
              >
                <option value="all">{t("owner.financial.payrollRecipientAllOption")}</option>
                <option value="coach">{t("owner.financial.payrollRecipientCoachOnlyOption")}</option>
                <option value="staff">{t("owner.financial.payrollRecipientStaffOnlyOption")}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                {t("owner.financial.payrollFilterStatus")}
              </label>
              <select
                value={payrollStatusFilter}
                onChange={e => setPayrollStatusFilter(e.target.value as "all" | "unpaid" | "paid")}
                className="w-full text-xs rounded-xl border border-line px-2.5 py-1.5 bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
              >
                <option value="all">{t("owner.financial.allStatus")}</option>
                <option value="unpaid">{t("owner.financial.payrollStatusUnpaidOption")}</option>
                <option value="paid">{t("owner.financial.payrollStatusPaidOption")}</option>
              </select>
            </div>

            {/* Search Text */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                {t("owner.financial.payrollFilterSearch")}
              </label>
              <input
                value={payrollSearch}
                onChange={e => setPayrollSearch(e.target.value)}
                placeholder={t("owner.financial.payrollSearchPlaceholder")}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-line bg-white text-ink placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-wave-400"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loadingDetailedInvoices || loadingStaff ? (
          <div className="p-12 text-center text-ink-mute text-sm">
            {t("owner.financial.payrollLoadingTable")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-tint text-[11px] uppercase tracking-wider text-ink-faint font-bold">
                  <th className="text-left py-3.5 px-4">{t("owner.financial.payrollColRecipient")}</th>
                  <th className="text-left py-3.5 px-4">{t("owner.financial.payrollColDescPeriod")}</th>
                  <th className="text-left py-3.5 px-4">{t("owner.financial.payrollColBankDest")}</th>
                  <th className="text-right py-3.5 px-4">{t("owner.financial.colGross")}</th>
                  <th className="text-right py-3.5 px-4">{t("owner.financial.colTax")}</th>
                  <th className="text-right py-3.5 px-4 text-purple-700">{t("owner.financial.payrollColLoanDeduction")}</th>
                  <th className="text-right py-3.5 px-4">{t("owner.financial.colOtherDeductions")}</th>
                  <th className="text-right py-3.5 px-4 text-ocean-900 font-extrabold bg-ocean-50/50">
                    {t("owner.financial.colNetTransferred")}
                  </th>
                  <th className="text-center py-3.5 px-4">{t("owner.financial.colStatus")}</th>
                  <th className="text-right py-3.5 px-4">{t("owner.financial.colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPayrollItems.map(item => (
                  <tr key={item.id} className="hover:bg-paper-tint transition-colors">
                    {/* Penerima & Center */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.recipientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink text-sm truncate"><NoTranslate>{item.recipientName}</NoTranslate></div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              item.recipientType === "coach"
                                ? "bg-ocean-50 text-ocean-700 border border-ocean-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}>
                              {item.recipientRole}
                            </span>
                            <span className="text-xs text-ink-mute truncate">· <NoTranslate>{item.branchName}</NoTranslate></span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Keterangan & Periode */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink text-xs"><NoTranslate>{item.title}</NoTranslate></div>
                      <div className="text-[11px] text-ink-mute font-mono mt-0.5">
                        <NoTranslate>{item.periodLabel}</NoTranslate> {item.referenceNo ? <>· <NoTranslate>{item.referenceNo}</NoTranslate></> : ""}
                      </div>
                    </td>

                    {/* Rekening Bank Transfer */}
                    <td className="py-3 px-4">
                      {item.bankAccount ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-ink"><NoTranslate>{item.bankName ?? "Bank"}</NoTranslate></span>
                            <span className="font-mono text-ocean-800 bg-ocean-50 px-1.5 py-0.5 rounded text-xs font-semibold border border-ocean-200/50">
                              {item.bankAccount}
                            </span>
                            <button
                              onClick={() => copyToClipboard(item.bankAccount!, tNode("owner.financial.payrollCopyAccountLabel", { name: item.recipientName }))}
                              className="p-1 rounded hover:bg-paper-tint text-ocean-700 hover:text-ocean-900 transition-colors"
                              title={t("owner.financial.payrollCopyAccountTitle")}
                            >
                              <Icon name="copy" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-ink-mute truncate max-w-xs">
                            a.n. <NoTranslate>{item.bankHolder || item.recipientName}</NoTranslate>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-mute italic">{t("owner.financial.payrollNoBankAccount")}</span>
                      )}
                    </td>

                    {/* Bruto */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-ink">
                      {fmtIDR(item.grossAmount)}
                    </td>

                    {/* Pajak PPh 21 */}
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {item.taxAmount > 0 ? (
                        <span className="text-warn-700 font-semibold">-{fmtIDR(item.taxAmount)}</span>
                      ) : (
                        <span className="text-ink-mute">—</span>
                      )}
                    </td>

                    {/* Potongan Kasbon / Pinjaman */}
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {item.loanDeduction > 0 ? (
                        <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                          -{fmtIDR(item.loanDeduction)}
                        </span>
                      ) : (
                        <span className="text-ink-mute">—</span>
                      )}
                    </td>

                    {/* Potongan Lain */}
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {item.otherDeductions > 0 ? (
                        <span className="text-danger-700 font-semibold">-{fmtIDR(item.otherDeductions)}</span>
                      ) : (
                        <span className="text-ink-mute">—</span>
                      )}
                    </td>

                    {/* Transfer Riil (Net) */}
                    <td className="py-3 px-4 text-right bg-ocean-50/40">
                      <span className="font-mono font-extrabold text-sm text-ocean-900">
                        {fmtIDR(item.netTransferredAmount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        item.isPaid
                          ? "bg-ok-50 text-ok-700 border border-ok-200"
                          : item.status === "approved"
                          ? "bg-ocean-50 text-ocean-700 border border-ocean-200"
                          : "bg-warn-50 text-warn-700 border border-warn-200"
                      }`}>
                        {item.isPaid ? t("owner.financial.payrollStatusPaidBadge") : item.status === "approved" ? t("owner.financial.payrollStatusReadyBadge") : t("owner.financial.payrollStatusPendingBadge")}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            if (item.rawExpense) return setSelectedExpenseDetail(item.rawExpense);
                            if (item.rawInvoice) return setSelectedInvoiceDetail(item.rawInvoice);
                            if (item.rawSalary) {
                              const st = staffList.find(s => s.id === item.recipientId);
                              if (st) {
                                setSalaryForm({
                                  base_salary: String(item.rawSalary.base_salary || ""),
                                  allowances: String(item.rawSalary.allowances || ""),
                                  reimburse: String(item.rawSalary.reimburse_amount || ""),
                                  deductions: String(item.rawSalary.deductions || ""),
                                  notes: item.rawSalary.notes || "",
                                });
                                setEditSalaryModal({ staff: st, salary: item.rawSalary, month: item.periodMonth });
                              }
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-ocean-700 hover:text-ocean-900 bg-ocean-50 hover:bg-ocean-100 rounded-lg border border-ocean-200/60 transition-colors"
                        >
                          {t("owner.financial.payrollDetailBtn")}
                        </button>
                        {!item.isPaid && (
                          <Btn
                            size="sm"
                            onClick={async () => {
                              if (item.rawInvoice) {
                                markInvoicePaid(item.rawInvoice);
                              } else if (item.rawSalary) {
                                markStaffSalaryPaid(item.rawSalary, item.recipientName);
                              } else if (item.itemType === "staff_reimburse" && item.id.startsWith("reimburse_")) {
                                const rId = item.id.replace("reimburse_", "");
                                const { error } = await supabase
                                  .from("staff_reimbursements")
                                  .update({ status: "paid" })
                                  .eq("id", rId);
                                if (!error) {
                                  toast.success(t("owner.financial.payrollReimburseMarkedPaid"));
                                  loadStaffReimbursements();
                                }
                              } else {
                                const st = staffList.find(s => s.id === item.recipientId);
                                if (st) {
                                  setSalaryForm({
                                    base_salary: String(item.baseAmount || ""),
                                    allowances: String(item.allowances || ""),
                                    reimburse: String(item.reimburseAmount || ""),
                                    deductions: String(item.otherDeductions || ""),
                                    notes: "",
                                  });
                                  setEditSalaryModal({ staff: st, salary: null, month: item.periodMonth });
                                }
                              }
                            }}
                            disabled={markingPaidId === item.rawInvoice?.id || markingStaffSalaryId === item.rawSalary?.id}
                            className="bg-ok-600 hover:bg-ok-700 text-white font-semibold"
                          >
                            {t("owner.financial.payrollMarkPaidBtn")}
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayrollItems.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-ink-mute">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Icon name="users" className="w-8 h-8 text-ink-faint" />
                        <span className="font-semibold text-sm text-ink">{t("owner.financial.payrollEmptyTitle")}</span>
                        <span className="text-xs text-ink-mute">{t("owner.financial.payrollEmptyBody")}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
