export interface FinancialRow {
  id: string;
  student_id: string;
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
  student?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

export interface ManualTxnRow {
  id: string; branch_id: string; kind: "income" | "expense"; category: string | null;
  description: string; amount: number; occurred_at: string; notes: string | null;
  is_reimburse: boolean; proof_url: string | null;
}

export type IncomeRow = (FinancialRow & { source: "bill" }) | (ManualTxnRow & { source: "manual" });

export interface ManualTxnCategory { id: string; kind: "income" | "expense"; name: string; sort_order: number }

export type FinTab = "income" | "expenses";
