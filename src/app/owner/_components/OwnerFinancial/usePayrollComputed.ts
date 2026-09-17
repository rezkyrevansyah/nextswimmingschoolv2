"use client";
import { useMemo } from "react";
import { parsePeriodToMonth } from "../../_utils";
import type { UnifiedPayrollItem } from "./_types";
import type { useFinancialData } from "./useFinancialData";
import type { useFinancialComputed } from "./useFinancialComputed";

type Data = ReturnType<typeof useFinancialData>;
type Computed = ReturnType<typeof useFinancialComputed>;

export function usePayrollComputed(data: Data, computed: Computed) {
  const {
    detailedInvoices, payslips, staffList, staffSalaries, staffReimbursements, monthsInRange, branches,
    payrollBranchFilter, payrollRecipientFilter, payrollStatusFilter, payrollSearch,
  } = data;
  const { unifiedExpenses } = computed;

  // ── Unified Payroll items & filtering (Coach & Staff) ───────────────────────
  const unifiedPayrollItems = useMemo(() => {
    const list: UnifiedPayrollItem[] = [];

    // 1. Coach Invoices (Sessions & Reimbursements)
    for (const inv of detailedInvoices) {
      const invMonth = inv.period_label ? parsePeriodToMonth(inv.period_label) : (inv.submitted_at ? inv.submitted_at.slice(0, 7) : "");
      const items = inv.coach_invoice_items ?? [];
      const sessionHonor = items.filter(it => it.item_type === "session" || it.item_type === "extra").reduce((s, it) => s + (it.session_count * it.rate), 0);
      const reimburseTotal = items.filter(it => it.item_type === "reimburse").reduce((s, it) => s + it.rate, 0);

      const matchingSlip = payslips.find(p => p.invoice_id === inv.id);
      const taxAmount = matchingSlip?.payslip_deductions?.filter(d => d.type === "tax").reduce((s, d) => s + d.amount, 0) ?? 0;
      const loanDeduction = matchingSlip?.payslip_deductions?.filter(d => d.type === "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
      const otherDeds = matchingSlip?.payslip_deductions?.filter(d => d.type !== "tax" && d.type !== "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
      const otherDeductions = otherDeds > 0 ? otherDeds : Math.max(0, (matchingSlip?.deductions ?? 0) - taxAmount - loanDeduction);
      const grossAmount = matchingSlip ? matchingSlip.gross_amount : inv.total_amount;
      const netPayout = matchingSlip ? matchingSlip.net_amount : inv.total_amount;
      const isPaid = inv.status === "paid" || matchingSlip?.status === "published";

      let bName = inv.coach?.bank_name;
      let bAcc = inv.coach?.bank_account;
      let bHolder = inv.coach?.bank_holder;
      if ((!bAcc || !bName) && inv.bank_info) {
        try {
          const parsed = JSON.parse(inv.bank_info);
          if (parsed.bank_name) bName = parsed.bank_name;
          if (parsed.bank_account) bAcc = parsed.bank_account;
          if (parsed.bank_holder) bHolder = parsed.bank_holder;
        } catch {}
      }

      const totalSessions = items.filter(it => it.item_type === "session" || it.item_type === "extra").reduce((s, it) => s + it.session_count, 0);

      list.push({
        id: `coach_${inv.id}`,
        itemType: "coach_invoice",
        recipientType: "coach",
        recipientId: inv.coach?.id ?? inv.id,
        recipientName: inv.coach?.full_name ?? "Coach",
        recipientRole: "Coach",
        branchId: inv.branch_id ?? null,
        branchName: inv.branch?.name ?? "Center",
        periodMonth: invMonth,
        periodLabel: inv.period_label || invMonth,
        title: totalSessions > 0 ? `Teaching Fee (${totalSessions} Sessions)` : (reimburseTotal > 0 ? "Coach Reimbursement Claim" : "Coach Honor / Fee"),
        referenceNo: inv.invoice_number,
        bankName: bName ?? null,
        bankAccount: bAcc ?? null,
        bankHolder: bHolder ?? null,
        baseAmount: sessionHonor > 0 ? sessionHonor : (inv.total_amount - reimburseTotal),
        allowances: 0,
        reimburseAmount: reimburseTotal,
        taxAmount: taxAmount,
        loanDeduction: loanDeduction,
        otherDeductions: otherDeductions,
        grossAmount: grossAmount,
        netTransferredAmount: netPayout,
        status: isPaid ? "paid" : (inv.status === "approved" ? "approved" : "pending"),
        isPaid: isPaid,
        paidAt: inv.paid_at ?? matchingSlip?.published_at ?? null,
        rawInvoice: inv,
        rawPayslip: matchingSlip ?? null,
        rawExpense: matchingSlip ? (unifiedExpenses.find(e => e.id === matchingSlip.id) ?? null) : null,
      });
    }

    // 2. Staff Salaries — one row per staff x month in the selected range. For a
    // wide multi-month range, only emit a row where there's actual data (a salary
    // record or matching payslip) to avoid flooding the list with empty drafts;
    // for the common single-month view, still show every staff (incl. no-salary-yet)
    // so the owner can create one.
    for (const month of monthsInRange) {
      for (const st of staffList) {
        const sal = staffSalaries.find(s => s.staff_id === st.id && s.period_month === month);
        const matchingSlip = payslips.find(p => p.coach_id === st.id && parsePeriodToMonth(p.period_label) === month);
        if (!sal && !matchingSlip && monthsInRange.length > 1) continue;

        const base = matchingSlip ? (matchingSlip.gross_amount - (sal?.allowances ?? 0) - (sal?.reimburse_amount ?? 0)) : (sal?.base_salary ?? 0);
        const allowances = sal?.allowances ?? 0;
        const reimburse = sal?.reimburse_amount ?? 0;
        const taxAmount = matchingSlip?.payslip_deductions?.filter(d => d.type === "tax").reduce((s, d) => s + d.amount, 0) ?? 0;
        const loanDeduction = matchingSlip?.payslip_deductions?.filter(d => d.type === "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
        const otherDeds = matchingSlip?.payslip_deductions?.filter(d => d.type !== "tax" && d.type !== "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
        const otherDeductions = otherDeds > 0 ? otherDeds : (matchingSlip ? Math.max(0, matchingSlip.deductions - taxAmount - loanDeduction) : (sal?.deductions ?? 0));
        const grossAmount = matchingSlip ? matchingSlip.gross_amount : (base + allowances + reimburse);
        const netPayout = matchingSlip ? matchingSlip.net_amount : (sal?.total_salary ?? (base + allowances + reimburse - otherDeductions - taxAmount));
        const isPaid = matchingSlip?.status === "published" || sal?.status === "paid";
        const status: "draft" | "pending" | "approved" | "paid" = isPaid ? "paid" : (sal?.status === "approved" ? "approved" : (sal ? "pending" : "draft"));

        list.push({
          id: `staff_${sal?.id ?? `${st.id}_${month}`}`,
          itemType: "staff_salary",
          recipientType: "staff",
          recipientId: st.id,
          recipientName: st.full_name,
          recipientRole: "Staff",
          branchId: st.branch_id,
          branchName: st.branch?.name ?? "Center",
          periodMonth: month,
          periodLabel: month,
          title: "Staff Salary & Allowances",
          referenceNo: sal?.id ? `SAL-${sal.id.slice(0, 8)}` : undefined,
          bankName: st.bank_name ?? null,
          bankAccount: st.bank_account ?? null,
          bankHolder: st.bank_holder ?? null,
          baseAmount: base,
          allowances: allowances,
          reimburseAmount: reimburse,
          taxAmount: taxAmount,
          loanDeduction: loanDeduction,
          otherDeductions: otherDeductions,
          grossAmount: grossAmount,
          netTransferredAmount: netPayout,
          status: status,
          isPaid: isPaid,
          paidAt: sal?.paid_at ?? matchingSlip?.published_at ?? null,
          rawSalary: sal ?? null,
          rawPayslip: matchingSlip ?? null,
          rawExpense: matchingSlip ? (unifiedExpenses.find(e => e.id === matchingSlip.id) ?? null) : null,
        });
      }
    }

    // 3. Standalone Staff Reimbursements
    for (const rb of staffReimbursements) {
      const rbMonth = (rb.paid_at ?? rb.submitted_at)?.slice(0, 7) || monthsInRange[0];
      const st = staffList.find(s => s.id === rb.profile_id);
      const sal = staffSalaries.find(s => s.staff_id === rb.profile_id && s.period_month === rbMonth);
      if (sal && sal.reimburse_amount >= rb.amount && (rb.status === "approved" || rb.status === "paid")) {
        continue;
      }
      const isPaid = rb.status === "paid";
      list.push({
        id: `reimburse_${rb.id}`,
        itemType: "staff_reimburse",
        recipientType: "staff",
        recipientId: rb.profile_id,
        recipientName: st?.full_name ?? "Staff",
        recipientRole: "Staff",
        branchId: rb.branch_id ?? st?.branch_id ?? null,
        branchName: branches.find(b => b.id === (rb.branch_id ?? st?.branch_id))?.name ?? st?.branch?.name ?? "Center",
        periodMonth: rbMonth,
        periodLabel: rbMonth,
        title: `Reimburse: ${rb.description}`,
        referenceNo: rb.invoice_number,
        bankName: st?.bank_name ?? null,
        bankAccount: st?.bank_account ?? null,
        bankHolder: st?.bank_holder ?? null,
        baseAmount: 0,
        allowances: 0,
        reimburseAmount: rb.amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        grossAmount: rb.amount,
        netTransferredAmount: rb.amount,
        status: isPaid ? "paid" : (rb.status === "approved" ? "approved" : "pending"),
        isPaid: isPaid,
        paidAt: null,
        proofUrl: rb.proof_url,
      });
    }

    return list;
  }, [detailedInvoices, payslips, staffList, staffSalaries, staffReimbursements, monthsInRange, branches, unifiedExpenses]);

  const filteredPayrollItems = useMemo(() => {
    const rangeStart = monthsInRange[0];
    const rangeEnd = monthsInRange[monthsInRange.length - 1];
    return unifiedPayrollItems.filter(item => {
      if (item.periodMonth && (item.periodMonth < rangeStart || item.periodMonth > rangeEnd)) {
        return false;
      }
      if (payrollBranchFilter !== "all" && item.branchId !== payrollBranchFilter) {
        return false;
      }
      if (payrollRecipientFilter !== "all" && item.recipientType !== payrollRecipientFilter) {
        return false;
      }
      if (payrollStatusFilter === "unpaid" && item.isPaid) {
        return false;
      }
      if (payrollStatusFilter === "paid" && !item.isPaid) {
        return false;
      }
      if (payrollSearch.trim()) {
        const q = payrollSearch.toLowerCase();
        const matchName = item.recipientName.toLowerCase().includes(q);
        const matchBank = item.bankAccount?.includes(q) || item.bankName?.toLowerCase().includes(q);
        const matchRef = item.referenceNo?.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchBranch = item.branchName.toLowerCase().includes(q);
        if (!matchName && !matchBank && !matchRef && !matchTitle && !matchBranch) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedPayrollItems, monthsInRange, payrollBranchFilter, payrollRecipientFilter, payrollStatusFilter, payrollSearch]);

  const payrollTotalHarusTransfer = filteredPayrollItems.filter(i => !i.isPaid).reduce((s, i) => s + i.netTransferredAmount, 0);
  const payrollUnpaidCount = filteredPayrollItems.filter(i => !i.isPaid).length;
  const payrollTotalSudahTransfer = filteredPayrollItems.filter(i => i.isPaid).reduce((s, i) => s + i.netTransferredAmount, 0);
  const payrollPaidCount = filteredPayrollItems.filter(i => i.isPaid).length;
  const payrollTotalGajiPokokDanHonor = filteredPayrollItems.reduce((s, i) => s + i.baseAmount + i.allowances, 0);
  const payrollTotalReimburse = filteredPayrollItems.reduce((s, i) => s + i.reimburseAmount, 0);
  const payrollTotalTax = filteredPayrollItems.reduce((s, i) => s + i.taxAmount, 0);
  const payrollTotalLoanDeduction = filteredPayrollItems.reduce((s, i) => s + i.loanDeduction, 0);

  return {
    unifiedPayrollItems, filteredPayrollItems,
    payrollTotalHarusTransfer, payrollUnpaidCount, payrollTotalSudahTransfer, payrollPaidCount,
    payrollTotalGajiPokokDanHonor, payrollTotalReimburse, payrollTotalTax, payrollTotalLoanDeduction,
  };
}
