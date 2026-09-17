"use client";
import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Branch, Invoice } from "../../_types";
import type {
  OwnerFinancialBill, OwnerFinancialExpense, ManualTxnRow, FinancialPayslipItem,
  ManualTxnCategory, FinancialTab, FinancialPreset, StaffSalaryRow, StaffReimbursement, StaffListItem,
} from "./_types";
import { startOfMonthISO, endOfMonthISO, monthISO } from "./_utils";

export function useFinancialData({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<FinancialTab>("overview");
  const [exportingExcel, setExportingExcel] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [bills, setBills] = useState<OwnerFinancialBill[]>([]);
  const [expenses, setExpenses] = useState<OwnerFinancialExpense[]>([]);
  const [manualTxns, setManualTxns] = useState<ManualTxnRow[]>([]);
  const [payslips, setPayslips] = useState<FinancialPayslipItem[]>([]);
  const [allStaffSalaries, setAllStaffSalaries] = useState<StaffSalaryRow[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // ── Unified date-range filter (applies uniformly across all 5 sub-tabs) ────
  const [financialPreset, setFinancialPreset] = useState<FinancialPreset>("this_month");
  const [financialFrom, setFinancialFrom] = useState(() => startOfMonthISO(new Date()));
  const [financialTo, setFinancialTo] = useState(() => endOfMonthISO(new Date()));
  // Months (YYYY-MM) intersecting [financialFrom, financialTo], inclusive.
  const monthsInRange = useMemo(() => {
    const months: string[] = [];
    const from = new Date(financialFrom + "T00:00:00");
    const to = new Date(financialTo + "T00:00:00");
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= last) {
      months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months.length ? months : [monthISO(new Date())];
  }, [financialFrom, financialTo]);
  const inFinancialRange = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    return d >= financialFrom && d <= financialTo;
  }, [financialFrom, financialTo]);

  const applyFinancialPreset = (preset: FinancialPreset) => {
    setFinancialPreset(preset);
    const now = new Date();
    if (preset === "this_month") {
      setFinancialFrom(startOfMonthISO(now));
      setFinancialTo(endOfMonthISO(now));
    } else if (preset === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setFinancialFrom(startOfMonthISO(lm));
      setFinancialTo(endOfMonthISO(lm));
    }
    // "custom" and "multi_month" just reveal their own pickers, keeping the current range.
  };

  // ── Unified Payroll (Coach & Staff) state ──────────────────────────────────
  // "Which month a new/edited salary record targets" is now carried per-row by
  // unifiedPayrollItems (one row per staff x month in monthsInRange), not a single
  // page-level month — see editSalaryModal.month.
  const [payrollBranchFilter, setPayrollBranchFilter] = useState("all");
  const [payrollRecipientFilter, setPayrollRecipientFilter] = useState<"all" | "coach" | "staff">("all");
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [payrollSearch, setPayrollSearch] = useState("");
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<import("./_types").UnifiedExpenseItem | null>(null);
  const [detailedInvoices, setDetailedInvoices] = useState<Invoice[]>([]);
  const [loadingDetailedInvoices, setLoadingDetailedInvoices] = useState(false);

  const loadDetailedInvoices = useCallback(async () => {
    setLoadingDetailedInvoices(true);
    const { data } = await supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, branch_id, submitted_at, paid_at, approved_at, rejection_reason, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(id, full_name, role, phone, bank_name, bank_account, bank_holder), coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))")
      .not("status", "eq", "cancelled")
      .order("submitted_at", { ascending: false });
    // This tab is labeled/reported as coach-specific — staff self-invoices are reviewed
    // separately in the Owner's "Staff Invoices" section, so exclude them here.
    const coachOnly = ((data as unknown as (Invoice & { coach?: { role?: string } | null })[]) ?? [])
      .filter((i) => i.coach?.role !== "staff");
    if (data) setDetailedInvoices(coachOnly as unknown as Invoice[]);
    setLoadingDetailedInvoices(false);
  }, [supabase]);

  const loadPayslips = useCallback(async () => {
    const { data } = await supabase
      .from("payslips")
      .select(`
        id, coach_id, branch_id, invoice_id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, created_at,
        coach:profiles!payslips_coach_id_fkey(id, full_name, role, phone, bank_name, bank_account, bank_holder),
        branch:branches(id, name),
        invoice:coach_invoices!payslips_invoice_id_fkey(id, invoice_number, total_amount, bank_info, coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))),
        payslip_deductions(id, type, label, amount)
      `)
      .order("created_at", { ascending: false });
    if (data) setPayslips(data as unknown as FinancialPayslipItem[]);
  }, [supabase]);

  const loadAllStaffSalaries = useCallback(async () => {
    const { data } = await supabase
      .from("staff_salaries")
      .select("id, staff_id, branch_id, period_month, base_salary, allowances, deductions, reimburse_amount, total_salary, status, notes, paid_at, created_at, staff:profiles!staff_salaries_staff_id_fkey(id, full_name, role, phone, bank_name, bank_account, bank_holder), branch:branches(name)")
      .order("created_at", { ascending: false });
    if (data) setAllStaffSalaries(data as unknown as StaffSalaryRow[]);
  }, [supabase]);

  // ── Staff Payroll state ───────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editSalaryModal, setEditSalaryModal] = useState<{ staff: any; salary: StaffSalaryRow | null; month: string } | null>(null);
  const [salaryForm, setSalaryForm] = useState({ base_salary: "", allowances: "", reimburse: "", deductions: "", notes: "" });
  const [savingSalary, setSavingSalary] = useState(false);
  const [markingStaffSalaryId, setMarkingStaffSalaryId] = useState<string | null>(null);

  const loadStaffPayroll = useCallback(async () => {
    setLoadingStaff(true);
    const { data: staffs } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, bank_name, bank_account, bank_holder, branch_id, branch:branches(name)")
      .eq("role", "staff")
      .order("full_name");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (staffs) setStaffList(staffs as any);
    setLoadingStaff(false);
  }, [supabase]);
  // staff_salaries for the currently-filtered months come from allStaffSalaries
  // (loaded unconditionally by loadAllStaffSalaries) — no separate per-month query needed.
  const staffSalaries = useMemo(
    () => allStaffSalaries.filter(s => monthsInRange.includes(s.period_month)),
    [allStaffSalaries, monthsInRange]
  );

  // ── Staff reimbursements (staff_reimbursements table) ────────────────────────
  const [staffReimbursements, setStaffReimbursements] = useState<StaffReimbursement[]>([]);
  const [loadingReimbursements, setLoadingReimbursements] = useState(false);
  const [processingReimburseId, setProcessingReimburseId] = useState<string | null>(null);

  const loadStaffReimbursements = useCallback(async () => {
    setLoadingReimbursements(true);
    const { data } = await supabase
      .from("staff_reimbursements")
      .select("*")
      .neq("status", "cancelled")
      .order("submitted_at", { ascending: false });
    setStaffReimbursements(data ?? []);
    setLoadingReimbursements(false);
  }, [supabase]);

  useEffect(() => {
    loadPayslips();
    loadAllStaffSalaries();
    loadDetailedInvoices();
    loadStaffPayroll();
    loadStaffReimbursements();
  }, [loadPayslips, loadAllStaffSalaries, loadDetailedInvoices, loadStaffPayroll, loadStaffReimbursements]);

  const copyToClipboard = (text: string, label: ReactNode) => {
    navigator.clipboard.writeText(text);
    toast.success(tNode("owner.financial.copiedToast", { label }), text);
  };

  const markInvoicePaid = async (inv: Invoice) => {
    const ok = await confirm({
      title: t("owner.financial.confirmMarkInvoicePaidTitle"),
      body: tNode("owner.financial.confirmMarkInvoicePaidBody", { number: inv.invoice_number, amount: fmtIDR(inv.total_amount), coach: inv.coach?.full_name ?? "" }),
      confirmLabel: t("owner.financial.confirmMarkPaidLabel"),
    });
    if (!ok) return;
    setMarkingPaidId(inv.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("coach_invoices")
      .update({ status: "paid", paid_at: now })
      .eq("id", inv.id);
    setMarkingPaidId(null);
    if (error) return toast.error(t("owner.financial.markInvoicePaidFailed"), error.message);
    toast.success(t("owner.financial.markInvoicePaidSuccess"));
    loadDetailedInvoices();
  };

  const saveStaffSalary = async () => {
    if (!editSalaryModal) return;
    setSavingSalary(true);
    const base = Number(salaryForm.base_salary || 0);
    const allowances = Number(salaryForm.allowances || 0);
    const reimburse = Number(salaryForm.reimburse || 0);
    const deductions = Number(salaryForm.deductions || 0);
    const total = base + allowances + reimburse - deductions;

    const payload = {
      staff_id: editSalaryModal.staff.id,
      branch_id: editSalaryModal.staff.branch_id,
      period_month: editSalaryModal.month,
      base_salary: base,
      allowances: allowances,
      deductions: deductions,
      reimburse_amount: reimburse,
      total_salary: total,
      notes: salaryForm.notes.trim() || null,
      status: editSalaryModal.salary?.status ?? "approved",
    };

    const { error } = editSalaryModal.salary
      ? await supabase.from("staff_salaries").update(payload).eq("id", editSalaryModal.salary.id)
      : await supabase.from("staff_salaries").insert(payload);

    setSavingSalary(false);
    if (error) return toast.error(t("owner.financial.saveStaffSalaryFailed"), error.message);
    toast.success(t("owner.financial.saveStaffSalarySuccess"));
    setEditSalaryModal(null);
    loadStaffPayroll();
  };

  const markStaffSalaryPaid = async (sal: StaffSalaryRow, staffName: string) => {
    const ok = await confirm({
      title: t("owner.financial.confirmMarkSalaryPaidTitle"),
      body: tNode("owner.financial.confirmMarkSalaryPaidBody", { period: sal.period_month, amount: fmtIDR(sal.total_salary), name: staffName }),
      confirmLabel: t("owner.financial.confirmMarkPaidLabel"),
    });
    if (!ok) return;
    setMarkingStaffSalaryId(sal.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("staff_salaries")
      .update({ status: "paid", paid_at: now })
      .eq("id", sal.id);
    setMarkingStaffSalaryId(null);
    if (error) return toast.error(t("owner.financial.markSalaryPaidFailed"), error.message);
    toast.success(t("owner.financial.markSalaryPaidSuccess"));
    loadStaffPayroll();
  };

  const approveReimburse = async (id: string) => {
    setProcessingReimburseId(id);
    const { error } = await supabase.from("staff_reimbursements").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    setProcessingReimburseId(null);
    if (error) return toast.error(t("owner.financial.approveReimburseFailed"), error.message);
    toast.success(t("owner.financial.approveReimburseSuccess"));
    loadStaffReimbursements();
  };

  const rejectReimburse = async (id: string) => {
    const reason = window.prompt(t("owner.financial.rejectReasonPrompt"));
    if (reason == null) return;
    setProcessingReimburseId(id);
    const { error } = await supabase.from("staff_reimbursements").update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason || null }).eq("id", id);
    setProcessingReimburseId(null);
    if (error) return toast.error(t("owner.financial.rejectReimburseFailed"), error.message);
    toast.success(t("owner.financial.rejectReimburseSuccess"));
    loadStaffReimbursements();
  };

  const markReimbursePaid = async (id: string, amount: number) => {
    const ok = await confirm({
      title: t("owner.financial.confirmMarkReimbursePaidTitle"),
      body: t("owner.financial.confirmMarkReimbursePaidBody", { amount: fmtIDR(amount) }),
      confirmLabel: t("owner.financial.confirmMarkPaidLabel"),
    });
    if (!ok) return;
    setProcessingReimburseId(id);
    const { error } = await supabase.from("staff_reimbursements").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    setProcessingReimburseId(null);
    if (error) return toast.error(t("owner.financial.markReimbursePaidFailed"), error.message);
    toast.success(t("owner.financial.markReimbursePaidSuccess"));
    loadStaffReimbursements();
  };

  // ── Income filters ──────────────────────────────────────────────────────────
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeStatus, setIncomeStatus] = useState("");
  const [incomeBranch, setIncomeBranch] = useState("all");
  const [incomeType, setIncomeType] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("");
  const [incomePage, setIncomePage] = useState(0);
  const [incomeSortBy, setIncomeSortBy] = useState<"paid_at" | "total">("paid_at");
  const [incomeSortDir, setIncomeSortDir] = useState<"asc" | "desc">("desc");

  // ── Expenses filters ────────────────────────────────────────────────────────
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatus, setExpenseStatus] = useState("");
  const [expenseBranch, setExpenseBranch] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expensePage, setExpensePage] = useState(0);

  const PAGE_SIZE = 25;

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  useEffect(() => {
    setLoadingBills(true);
    supabase.from("bills")
      .select("id, branch_id, member_id, period_label, amount, discount, total, status, type, paid_at, paid_method, created_at, member:members(profile:profiles(full_name)), class:classes(name), branch:branches(name)")
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => { if (data) setBills(data as unknown as OwnerFinancialBill[]); setLoadingBills(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingExpenses(true);
    supabase.from("coach_invoices")
      .select("id, coach_id, branch_id, period_label, total_amount, status, paid_at, created_at, invoice_number, coach:profiles!coach_invoices_coach_id_fkey(full_name), branch:branches(name)")
      .order("submitted_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => { if (data) setExpenses(data as unknown as OwnerFinancialExpense[]); setLoadingExpenses(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-enable react-hooks/set-state-in-effect */

  const loadManualTxns = useCallback(async () => {
    const { data } = await supabase.from("manual_transactions")
      .select("id, branch_id, kind, category, description, amount, occurred_at, notes, is_reimburse, proof_url, branch:branches(name)")
      .order("occurred_at", { ascending: false });
    if (data) setManualTxns(data as unknown as ManualTxnRow[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadManualTxns(); }, [loadManualTxns]);

  // ── Manual transaction categories (owner CRUD) ──────────────────────────────
  const [categories, setCategories] = useState<ManualTxnCategory[]>([]);
  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from("manual_transaction_categories")
      .select("id, kind, name, sort_order").order("sort_order");
    if (data) setCategories(data as unknown as ManualTxnCategory[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadCategories(); }, [loadCategories]);
  const categoriesByKind = (kind: "income" | "expense") => categories.filter(c => c.kind === kind);
  const [showCategoryManager, setShowCategoryManager] = useState<"income" | "expense" | null>(null);

  // ── Manual transaction CRUD ──────────────────────────────────────────────────
  const [showTxnModal, setShowTxnModal] = useState<{ kind: "income" | "expense"; edit: ManualTxnRow | null } | null>(null);
  const [txnForm, setTxnForm] = useState({ branch_id: "", category: "", categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
  const [savingTxn, setSavingTxn] = useState(false);

  const openAddTxn = (kind: "income" | "expense") => {
    const names = categoriesByKind(kind).map(c => c.name);
    setTxnForm({ branch_id: branches[0]?.id ?? "", category: names[0] ?? "Lainnya", categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
    setShowTxnModal({ kind, edit: null });
  };

  const openEditTxn = (row: ManualTxnRow) => {
    const names = categoriesByKind(row.kind).map(c => c.name);
    const knownCategory = names.includes(row.category ?? "") ? (row.category ?? names[0] ?? "Lainnya") : "Lainnya";
    setTxnForm({
      branch_id: row.branch_id, category: knownCategory, categoryOther: knownCategory === "Lainnya" ? (row.category ?? "") : "",
      description: row.description, amount: String(row.amount), occurred_at: row.occurred_at, notes: row.notes ?? "",
      isReimburse: row.is_reimburse, proofUrl: row.proof_url ?? "",
    });
    setShowTxnModal({ kind: row.kind, edit: row });
  };

  const saveTxn = async () => {
    if (!showTxnModal) return;
    if (!txnForm.branch_id) return toast.error(t("owner.financial.branchRequired"));
    if (!txnForm.description.trim()) return toast.error(t("owner.financial.descriptionRequired"));
    const amount = Number(txnForm.amount || 0);
    if (!amount || amount <= 0) return toast.error(t("owner.financial.invalidAmount"));
    if (txnForm.isReimburse && !txnForm.proofUrl.trim()) return toast.error(t("owner.financial.proofRequired"));
    const category = txnForm.category === "Lainnya" ? (txnForm.categoryOther.trim() || "Lainnya") : txnForm.category;

    setSavingTxn(true);
    const payload = {
      branch_id: txnForm.branch_id, kind: showTxnModal.kind, category, description: txnForm.description.trim(),
      amount, occurred_at: txnForm.occurred_at, notes: txnForm.notes.trim() || null,
      is_reimburse: txnForm.isReimburse, proof_url: txnForm.isReimburse ? txnForm.proofUrl.trim() : null,
    };
    const isEdit = !!showTxnModal.edit;
    const { error } = isEdit
      ? await supabase.from("manual_transactions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", showTxnModal.edit!.id)
      : await supabase.from("manual_transactions").insert({ ...payload, created_by: userId, created_by_role: "owner" });
    setSavingTxn(false);
    if (error) return toast.error(isEdit ? t("owner.financial.saveFailed") : t("owner.financial.addFailed"), error.message);
    toast.success(isEdit ? t("owner.financial.txnUpdated") : t("owner.financial.txnAdded"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, branchId: txnForm.branch_id, entityType: "manual_transactions",
      entityId: showTxnModal.edit?.id ?? "new", action: isEdit ? "update" : "create",
      label: t(isEdit ? "owner.financial.activityTxnUpdated" : "owner.financial.activityTxnAdded", {
        kind: t(showTxnModal.kind === "income" ? "owner.financial.txnKindIncome" : "owner.financial.txnKindExpense"),
        description: txnForm.description.trim(), amount: fmtIDR(amount),
      }),
      meta: { amount, category },
    });
    setShowTxnModal(null);
    loadManualTxns();
  };

  const deleteTxn = async (row: ManualTxnRow) => {
    const ok = await confirm({ title: t("owner.financial.deleteConfirmTitle"), body: tNode("owner.financial.deleteConfirmBody", { description: row.description, amount: fmtIDR(row.amount) }), confirmLabel: t("common.actions.delete"), danger: true });
    if (!ok) return;
    const { error } = await supabase.from("manual_transactions").delete().eq("id", row.id);
    if (error) return toast.error(t("owner.financial.txnDeleteFailed"), error.message);
    toast.success(t("owner.financial.txnDeleted"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, branchId: row.branch_id, entityType: "manual_transactions",
      entityId: row.id, action: "delete", label: t("owner.financial.activityTxnDeleted", {
        kind: t(row.kind === "income" ? "owner.financial.txnKindIncome" : "owner.financial.txnKindExpense"),
        description: row.description, amount: fmtIDR(row.amount),
      }),
    });
    setManualTxns(prev => prev.filter(t => t.id !== row.id));
  };

  return {
    tab, setTab, exportingExcel, setExportingExcel,
    bills, expenses, manualTxns, payslips, allStaffSalaries, loadingBills, loadingExpenses,
    financialPreset, financialFrom, setFinancialFrom, financialTo, setFinancialTo, monthsInRange, inFinancialRange, applyFinancialPreset,
    payrollBranchFilter, setPayrollBranchFilter, payrollRecipientFilter, setPayrollRecipientFilter,
    payrollStatusFilter, setPayrollStatusFilter, payrollSearch, setPayrollSearch,
    markingPaidId, selectedInvoiceDetail, setSelectedInvoiceDetail, selectedExpenseDetail, setSelectedExpenseDetail,
    detailedInvoices, loadingDetailedInvoices, loadDetailedInvoices, loadPayslips, loadAllStaffSalaries,
    staffList, loadingStaff, editSalaryModal, setEditSalaryModal, salaryForm, setSalaryForm, savingSalary, markingStaffSalaryId,
    loadStaffPayroll, staffSalaries,
    staffReimbursements, loadingReimbursements, processingReimburseId, loadStaffReimbursements,
    copyToClipboard, markInvoicePaid, saveStaffSalary, markStaffSalaryPaid, approveReimburse, rejectReimburse, markReimbursePaid,
    incomeSearch, setIncomeSearch, incomeStatus, setIncomeStatus, incomeBranch, setIncomeBranch,
    incomeType, setIncomeType, incomeMethod, setIncomeMethod, incomePage, setIncomePage,
    incomeSortBy, setIncomeSortBy, incomeSortDir, setIncomeSortDir,
    expenseSearch, setExpenseSearch, expenseStatus, setExpenseStatus, expenseBranch, setExpenseBranch,
    expenseCategoryFilter, setExpenseCategoryFilter, expensePage, setExpensePage,
    PAGE_SIZE,
    categories, loadCategories, categoriesByKind, showCategoryManager, setShowCategoryManager,
    showTxnModal, setShowTxnModal, txnForm, setTxnForm, savingTxn,
    openAddTxn, openEditTxn, saveTxn, deleteTxn,
    branches, userId, userName,
    supabase, toast,
  };
}
