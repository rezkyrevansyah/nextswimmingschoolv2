"use client";
import { useState, useEffect, useMemo } from "react";
import { parsePeriodToMonth } from "../../_utils";
import type { UnifiedExpenseItem, IncomeRow } from "./_types";
import type { useFinancialData } from "./useFinancialData";

type Data = ReturnType<typeof useFinancialData>;

export function useFinancialComputed(data: Data) {
  const {
    bills, manualTxns, payslips, detailedInvoices, allStaffSalaries, staffReimbursements, inFinancialRange,
    incomeStatus, incomeBranch, incomeType, incomeMethod, incomeSearch, incomeSortBy, incomeSortDir, incomePage, setIncomePage, PAGE_SIZE,
    expenseStatus, expenseBranch, expenseCategoryFilter, expenseSearch, expensePage, setExpensePage,
    financialFrom, financialTo,
  } = data;

  // "All-time" pools — kept unfiltered because the trend charts (barChartData,
  // moneyFlowData) need history beyond the active filter range. The headline
  // stat cards and list views use the "ranged" variants below instead.
  const manualIncome = useMemo(() => manualTxns.filter(t => t.kind === "income"), [manualTxns]);
  const manualExpense = useMemo(() => manualTxns.filter(t => t.kind === "expense"), [manualTxns]);
  const paidBills = useMemo(() => bills.filter(b => b.status === "paid"), [bills]);

  const rangedPaidBills = useMemo(() => paidBills.filter(b => inFinancialRange(b.paid_at ?? b.created_at)), [paidBills, inFinancialRange]);
  const rangedManualIncome = useMemo(() => manualIncome.filter(t => inFinancialRange(t.occurred_at)), [manualIncome, inFinancialRange]);
  const totalIncome = useMemo(() => rangedPaidBills.reduce((s, b) => s + b.total, 0) + rangedManualIncome.reduce((s, t) => s + t.amount, 0), [rangedPaidBills, rangedManualIncome]);

  // ── Unified Expenses (Payslips + Invoices + Salaries + Reimbursements + Manual)
  const unifiedExpenses = useMemo<UnifiedExpenseItem[]>(() => {
    const list: UnifiedExpenseItem[] = [];
    const usedInvoiceIds = new Set<string>();
    const usedStaffPeriods = new Set<string>(); // key: `${staff_id}_${period_month}`

    // 1. Unified Payslips (Coach & Staff)
    payslips.forEach((p) => {
      if (p.invoice_id) usedInvoiceIds.add(p.invoice_id);
      const isStaff = p.coach?.role === "staff";
      const monthKey = `${p.coach_id}_${parsePeriodToMonth(p.period_label)}`;
      usedStaffPeriods.add(monthKey);

      const deductionsList = p.payslip_deductions ?? [];
      const taxAmount = deductionsList.filter((d) => d.type === "tax").reduce((sum, d) => sum + d.amount, 0);
      const loanDeduction = deductionsList.filter((d) => d.type === "loan").reduce((sum, d) => sum + d.amount, 0);
      const otherDeds = deductionsList.filter((d) => d.type !== "tax" && d.type !== "loan").reduce((sum, d) => sum + d.amount, 0);
      const otherDeductions = otherDeds > 0 ? otherDeds : Math.max(0, p.deductions - taxAmount - loanDeduction);

      let bName = p.coach?.bank_name;
      let bAcc = p.coach?.bank_account;
      let bHolder = p.coach?.bank_holder;
      if ((!bAcc || !bName) && p.invoice?.bank_info) {
        try {
          const parsed = JSON.parse(p.invoice.bank_info);
          if (parsed.bank_name) bName = parsed.bank_name;
          if (parsed.bank_account) bAcc = parsed.bank_account;
          if (parsed.bank_holder) bHolder = parsed.bank_holder;
        } catch {}
      }

      list.push({
        id: p.id,
        sourceType: isStaff ? "staff_payslip" : "coach_payslip",
        categoryKey: isStaff ? "staff_salary" : "coach_salary",
        categoryLabel: isStaff ? "Staff Salary" : "Coach Honor",
        branchId: p.branch_id,
        branchName: p.branch?.name ?? "—",
        receiverId: p.coach_id,
        receiverName: p.coach?.full_name ?? (isStaff ? "Staff" : "Coach"),
        receiverRole: isStaff ? "staff" : "coach",
        referenceNumber: p.invoice?.invoice_number ?? `SLIP-${p.id.slice(0, 8).toUpperCase()}`,
        periodLabel: p.period_label,
        description: isStaff
          ? `Slip Gaji Staff - ${p.coach?.full_name ?? "Staff"} (${p.period_label})`
          : `Slip Gaji Coach - ${p.coach?.full_name ?? "Coach"} (${p.period_label})`,
        grossAmount: p.gross_amount,
        taxAmount,
        loanDeduction,
        otherDeductions,
        netTransferredAmount: p.net_amount,
        status: p.status === "published" ? "paid" : "draft",
        date: p.published_at ?? p.created_at,
        bankInfo: { bankName: bName, bankAccount: bAcc, bankHolder: bHolder },
        rawPayslip: p,
      });
    });

    // 2. Coach Invoices not yet in payslips
    detailedInvoices.forEach((inv) => {
      if (usedInvoiceIds.has(inv.id)) return;
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isStaff = (inv.coach as any)?.role === "staff";
      list.push({
        id: inv.id,
        sourceType: "coach_invoice",
        categoryKey: isStaff ? "staff_salary" : "coach_salary",
        categoryLabel: isStaff ? "Staff Salary" : "Coach Honor",
        branchId: inv.branch_id ?? "",
        branchName: inv.branch?.name ?? "—",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receiverId: (inv as any).coach_id ?? inv.coach?.id ?? null,
        receiverName: inv.coach?.full_name ?? "Coach",
        receiverRole: isStaff ? "staff" : "coach",
        referenceNumber: inv.invoice_number,
        periodLabel: inv.period_label,
        description: `Invoice Coach - ${inv.coach?.full_name ?? "Coach"} (${inv.invoice_number})`,
        grossAmount: inv.total_amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        netTransferredAmount: inv.total_amount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: inv.status as any,
        date: inv.paid_at ?? inv.submitted_at,
        bankInfo: { bankName: bName, bankAccount: bAcc, bankHolder: bHolder },
        rawInvoice: inv,
      });
    });

    // 3. Staff Salaries not yet in payslips
    allStaffSalaries.forEach((sal) => {
      const monthKey = `${sal.staff_id}_${sal.period_month}`;
      if (usedStaffPeriods.has(monthKey)) return;

      const base = Number(sal.base_salary || 0);
      const allowances = Number(sal.allowances || 0);
      const reimburse = Number(sal.reimburse_amount || 0);
      const deductions = Number(sal.deductions || 0);
      const total = Number(sal.total_salary || base + allowances + reimburse - deductions);
      const gross = base + allowances + reimburse;

      list.push({
        id: sal.id,
        sourceType: "staff_salary",
        categoryKey: "staff_salary",
        categoryLabel: "Staff Salary",
        branchId: sal.branch_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        branchName: (sal as any).branch?.name ?? (data.branches.find(b => b.id === sal.branch_id)?.name ?? "—"),
        receiverId: sal.staff_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receiverName: (sal as any).staff?.full_name ?? "Staff",
        receiverRole: "staff",
        referenceNumber: `SAL-${sal.period_month}`,
        periodLabel: sal.period_month,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: `Staff Salary - ${(sal as any).staff?.full_name ?? "Staff"} (${sal.period_month})`,
        grossAmount: gross,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: deductions,
        netTransferredAmount: total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: sal.status as any,
        date: sal.paid_at ?? sal.created_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bankInfo: { bankName: (sal as any).staff?.bank_name, bankAccount: (sal as any).staff?.bank_account, bankHolder: (sal as any).staff?.bank_holder },
        rawSalary: sal,
      });
    });

    // 4. Staff Reimbursements — skip ones already folded into a staff salary's
    // reimburse_amount (see unifiedPayrollItems' identical guard) to avoid double-counting.
    staffReimbursements.forEach((r) => {
      const rMonth = (r.paid_at ?? r.submitted_at).slice(0, 7);
      const sal = allStaffSalaries.find(s => s.staff_id === r.profile_id && s.period_month === rMonth);
      if (sal && sal.reimburse_amount >= r.amount && (r.status === "approved" || r.status === "paid")) return;

      list.push({
        id: r.id,
        sourceType: "staff_reimburse",
        categoryKey: "reimburse",
        categoryLabel: "Reimburse",
        branchId: r.branch_id,
        branchName: "—",
        receiverId: r.profile_id,
        receiverName: "Staff",
        receiverRole: "staff",
        referenceNumber: r.invoice_number ?? "REIMBURSE",
        periodLabel: "—",
        description: r.description || "Klaim Reimburse Staff",
        grossAmount: r.amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        netTransferredAmount: r.amount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: r.status as any,
        date: r.paid_at ?? r.submitted_at,
        proofUrl: r.proof_url,
      });
    });

    // 5. Manual Expenses
    manualExpense.forEach((m) => {
      list.push({
        id: m.id,
        sourceType: "manual",
        categoryKey: m.is_reimburse ? "reimburse" : "manual",
        categoryLabel: m.category ?? (m.is_reimburse ? "Reimburse" : "Operations"),
        branchId: m.branch_id,
        branchName: m.branch?.name ?? "—",
        receiverId: null,
        receiverName: m.description,
        receiverRole: "other",
        referenceNumber: "—",
        periodLabel: "—",
        description: m.description,
        grossAmount: m.amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        netTransferredAmount: m.amount,
        status: "paid",
        date: m.occurred_at,
        proofUrl: m.proof_url,
        rawManual: m,
      });
    });

    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [payslips, detailedInvoices, allStaffSalaries, staffReimbursements, manualExpense, data.branches]);

  // All-time paid expenses — feeds the trend charts below. Headline totals use
  // rangedPaidExpenses instead.
  const paidExpensesList = useMemo(() => unifiedExpenses.filter((e) => e.status === "paid"), [unifiedExpenses]);
  const rangedPaidExpenses = useMemo(() => paidExpensesList.filter(e => inFinancialRange(e.date)), [paidExpensesList, inFinancialRange]);
  const totalGrossExpenses = useMemo(() => rangedPaidExpenses.reduce((s, e) => s + e.grossAmount, 0), [rangedPaidExpenses]);
  const totalTaxWithheld = useMemo(() => rangedPaidExpenses.reduce((s, e) => s + e.taxAmount, 0), [rangedPaidExpenses]);
  const totalOtherDeductions = useMemo(() => rangedPaidExpenses.reduce((s, e) => s + e.otherDeductions, 0), [rangedPaidExpenses]);
  const totalRealCashOut = useMemo(() => rangedPaidExpenses.reduce((s, e) => s + e.netTransferredAmount, 0), [rangedPaidExpenses]);
  const totalExpenses = totalRealCashOut;
  const netAmount = totalIncome - totalRealCashOut;

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
      const expense = paidExpensesList.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.netTransferredAmount, 0);
      months.push({ label, key, income, expense, net: income - expense });
    }
    return months;
  }, [paidBills, manualIncome, paidExpensesList, chartMonths]);

  const barMax = useMemo(() => Math.max(1, ...barChartData.map(m => Math.max(m.income, m.expense))), [barChartData]);

  // ── Branch income breakdown ─────────────────────────────────────────────────
  const branchIncomeMap = useMemo(() => {
    const map: Record<string, number> = {};
    rangedPaidBills.forEach(b => { map[b.branch_id] = (map[b.branch_id] ?? 0) + b.total; });
    rangedManualIncome.forEach(t => { map[t.branch_id] = (map[t.branch_id] ?? 0) + t.amount; });
    return map;
  }, [rangedPaidBills, rangedManualIncome]);
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
    r = r.filter(row => inFinancialRange(incomeSortDate(row)));
    if (incomeSearch) {
      const q = incomeSearch.toLowerCase();
      r = r.filter(row => row.source === "manual"
        ? row.description.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
        : row.student?.profile?.full_name?.toLowerCase().includes(q) || row.period_label.toLowerCase().includes(q) || row.class?.name?.toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b) => {
      const va = incomeSortBy === "total" ? incomeSortAmount(a) : incomeSortDate(a);
      const vb = incomeSortBy === "total" ? incomeSortAmount(b) : incomeSortDate(b);
      return incomeSortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [bills, manualIncome, incomeStatus, incomeBranch, incomeType, incomeMethod, inFinancialRange, incomeSearch, incomeSortBy, incomeSortDir]);

  useEffect(() => { setIncomePage(0); }, [incomeStatus, incomeBranch, incomeType, incomeMethod, financialFrom, financialTo, incomeSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const incomeTotalPages = Math.max(1, Math.ceil(filteredIncome.length / PAGE_SIZE));
  const incomeSafePage = Math.min(incomePage, Math.max(0, incomeTotalPages - 1));
  const incomePagedRows = filteredIncome.slice(incomeSafePage * PAGE_SIZE, (incomeSafePage + 1) * PAGE_SIZE);

  // ── Expenses table filtered (Unified: Payslips + Invoices + Salaries + Reimburse + Manual)
  const filteredExpenses = useMemo(() => {
    let r = unifiedExpenses.filter(e => inFinancialRange(e.date));
    if (expenseStatus) r = r.filter(e => e.status === expenseStatus);
    if (expenseBranch !== "all") r = r.filter(e => e.branchId === expenseBranch);
    if (expenseCategoryFilter !== "all") r = r.filter(e => e.categoryKey === expenseCategoryFilter);
    if (expenseSearch) {
      const q = expenseSearch.toLowerCase();
      r = r.filter(e =>
        e.receiverName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.referenceNumber.toLowerCase().includes(q) ||
        e.periodLabel.toLowerCase().includes(q) ||
        e.branchName.toLowerCase().includes(q)
      );
    }
    return r;
  }, [unifiedExpenses, inFinancialRange, expenseStatus, expenseBranch, expenseCategoryFilter, expenseSearch]);

  useEffect(() => { setExpensePage(0); }, [financialFrom, financialTo, expenseStatus, expenseBranch, expenseCategoryFilter, expenseSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const expenseTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const expenseSafePage = Math.min(expensePage, Math.max(0, expenseTotalPages - 1));
  const expensePagedRows = filteredExpenses.slice(expenseSafePage * PAGE_SIZE, (expenseSafePage + 1) * PAGE_SIZE);

  // ── Money Flow monthly data ─────────────────────────────────────────────────
  const moneyFlowData = useMemo(() => {
    const months: { label: string; key: string; income: number; expense: number; grossExpense: number; taxWithheld: number; net: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const income = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(key)).reduce((s, b) => s + b.total, 0)
        + manualIncome.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      const mExpenses = paidExpensesList.filter(e => e.date.startsWith(key));
      const expense = mExpenses.reduce((s, e) => s + e.netTransferredAmount, 0);
      const grossExpense = mExpenses.reduce((s, e) => s + e.grossAmount, 0);
      const taxWithheld = mExpenses.reduce((s, e) => s + e.taxAmount, 0);
      months.push({ label, key, income, expense, grossExpense, taxWithheld, net: income - expense });
    }
    return months.filter(m => m.income > 0 || m.expense > 0);
  }, [paidBills, manualIncome, paidExpensesList]);

  return {
    manualIncome, manualExpense, paidBills, rangedPaidBills, rangedManualIncome, totalIncome,
    unifiedExpenses, paidExpensesList, rangedPaidExpenses,
    totalGrossExpenses, totalTaxWithheld, totalOtherDeductions, totalRealCashOut, totalExpenses, netAmount,
    chartMonths, setChartMonths, barChartData, barMax,
    branchIncomeMap, maxBranchIncome,
    filteredIncome, incomeTotalPages, incomeSafePage, incomePagedRows,
    filteredExpenses, expenseTotalPages, expenseSafePage, expensePagedRows,
    moneyFlowData,
  };
}
