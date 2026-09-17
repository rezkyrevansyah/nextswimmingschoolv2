// Private types for the Owner "Payslip Generator" screen (invoice review, payslip
// generation across 3 modes, publish/edit/delete lifecycle).

export interface ProfileOption {
  id: string;
  full_name: string;
  role: string;
  branch_id?: string | null;
  phone?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  avatar_url?: string | null;
}

export interface InvoiceItemDetail {
  id: string;
  item_type: string;
  class_id: string | null;
  session_count: number;
  rate: number;
  description: string | null;
  proof_url: string | null;
  class?: { name: string } | null;
}

export interface CoachInvoiceRow {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  bank_info: string | null;
  branch_id?: string | null;
  submitted_at: string;
  paid_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  branch?: { name: string } | null;
  coach?: { id: string; full_name: string; role?: string } | null;
  coach_invoice_items?: InvoiceItemDetail[];
}

export interface PayslipDeductionRow {
  id: string;
  type: string;
  label: string;
  amount: number;
}

export interface OwnerPayslipRow {
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
  published_by: string | null;
  created_at: string;
  coach?: { id: string; full_name: string; role?: string; avatar_url?: string | null } | null;
  branch?: { id: string; name: string } | null;
  payslip_deductions?: PayslipDeductionRow[];
}

export interface UnifiedPayslipItem {
  id: string;
  role: "coach" | "staff";
  recipientId: string;
  recipientName: string;
  avatarLetter: string;
  branchId: string;
  branchName: string;
  title: string;
  periodLabel: string;
  referenceNo: string;
  grossAmount: number;
  taxAmount: number;
  loanDeduction: number;
  otherDeductions: number;
  netAmount: number;
  workflowStatus: "pending" | "approved" | "draft" | "published" | "rejected";
  rawInvoice?: CoachInvoiceRow | null;
  rawPayslip?: OwnerPayslipRow | null;
}

export type GenMode = "from_invoice" | "manual_coach" | "manual_staff";
