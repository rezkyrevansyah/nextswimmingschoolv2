// Private types for the Owner "Financial" screen (income, expenses, payroll, money flow).
import type { Invoice } from "../../_types";

export interface OwnerFinancialBill {
  id: string; branch_id: string; member_id: string; period_label: string;
  amount: number; discount: number; total: number; status: string; type: string;
  paid_at: string | null; paid_method: string | null; created_at: string;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
  branch?: { name: string } | null;
}

export interface OwnerFinancialExpense {
  id: string; coach_id: string; branch_id: string; period_label: string;
  total_amount: number; status: string; paid_at: string | null; created_at: string;
  invoice_number: string | null;
  coach?: { full_name: string } | null;
  branch?: { name: string } | null;
}

export interface ManualTxnRow {
  id: string; branch_id: string; kind: "income" | "expense"; category: string | null;
  description: string; amount: number; occurred_at: string; notes: string | null;
  is_reimburse: boolean; proof_url: string | null;
  branch?: { name: string } | null;
}

export type IncomeRow = (OwnerFinancialBill & { source: "bill" }) | (ManualTxnRow & { source: "manual" });
export type ExpenseRow = (OwnerFinancialExpense & { source: "invoice" }) | (ManualTxnRow & { source: "manual" });

export interface FinancialPayslipItem {
  id: string;
  coach_id: string;
  branch_id: string;
  invoice_id: string | null;
  period_label: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  notes: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  coach?: { id: string; full_name: string; role?: string; bank_name?: string | null; bank_account?: string | null; bank_holder?: string | null; phone?: string | null } | null;
  branch?: { id: string; name: string } | null;
  invoice?: { id: string; invoice_number: string; total_amount: number; bank_info: string | null; coach_invoice_items?: Invoice["coach_invoice_items"] } | null;
  payslip_deductions?: { id: string; type: string; label: string; amount: number }[];
}

export interface UnifiedExpenseItem {
  id: string;
  sourceType: "coach_payslip" | "staff_payslip" | "coach_invoice" | "staff_salary" | "staff_reimburse" | "manual";
  categoryKey: "coach_salary" | "staff_salary" | "manual" | "reimburse";
  categoryLabel: string;
  branchId: string;
  branchName: string;
  receiverId: string | null;
  receiverName: string;
  receiverRole: "coach" | "staff" | "other";
  referenceNumber: string;
  periodLabel: string;
  description: string;
  grossAmount: number;
  taxAmount: number;
  loanDeduction: number;
  otherDeductions: number;
  netTransferredAmount: number;
  status: "paid" | "approved" | "pending" | "draft" | "rejected";
  date: string;
  proofUrl?: string | null;
  bankInfo?: { bankName?: string | null; bankAccount?: string | null; bankHolder?: string | null };
  rawPayslip?: FinancialPayslipItem | null;
  rawInvoice?: Invoice | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawSalary?: any | null;
  rawManual?: ManualTxnRow | null;
}

export interface ManualTxnCategory { id: string; kind: "income" | "expense"; name: string; sort_order: number }

export type FinancialTab = "overview" | "income" | "expenses" | "payroll" | "moneyflow";
export type FinancialPreset = "this_month" | "last_month" | "custom" | "multi_month";

export interface StaffSalaryRow {
  id: string;
  staff_id: string;
  branch_id: string;
  period_month: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  reimburse_amount: number;
  total_salary: number;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface UnifiedPayrollItem {
  id: string;
  itemType: "coach_invoice" | "staff_salary" | "staff_reimburse";
  recipientType: "coach" | "staff";
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  branchId: string | null;
  branchName: string;
  periodMonth: string;
  periodLabel: string;
  title: string;
  referenceNo?: string;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  baseAmount: number;
  allowances: number;
  reimburseAmount: number;
  taxAmount: number;
  loanDeduction: number;
  otherDeductions: number;
  grossAmount: number;
  netTransferredAmount: number;
  status: "draft" | "pending" | "approved" | "paid";
  isPaid: boolean;
  paidAt?: string | null;
  proofUrl?: string | null;
  rawInvoice?: Invoice | null;
  rawSalary?: StaffSalaryRow | null;
  rawPayslip?: FinancialPayslipItem | null;
  rawExpense?: UnifiedExpenseItem | null;
}

export interface StaffReimbursement {
  id: string; profile_id: string; branch_id: string; invoice_number: string;
  description: string; amount: number; proof_url: string | null; status: string;
  submitted_at: string; paid_at: string | null; rejection_reason: string | null;
}

export interface StaffListItem {
  id: string; full_name: string; email: string; phone: string | null;
  bank_name: string | null; bank_account: string | null; bank_holder: string | null;
  branch_id: string | null; branch?: { name: string } | null;
}
