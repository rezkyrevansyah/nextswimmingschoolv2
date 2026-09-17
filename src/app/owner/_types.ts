// Shared types used by multiple Owner panel components.
// Types used only by a single component are defined in that component's file.

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  status: string;
  wa_numbers?: string[];
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  show_payments_to_admin?: boolean;
  color?: string;
  member_count?: number;
  coach_count?: number;
  staff_count?: number;
  class_count?: number;
}

export interface InvoiceItem {
  id: string; item_type: string; class_id: string | null; session_count: number; rate: number;
  description: string | null; proof_url: string | null;
  class?: { name: string } | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  bank_info: string | null;
  submitted_at: string;
  paid_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  branch_id?: string | null;
  branch?: { name: string } | null;
  coach?: { id: string; full_name: string; phone?: string | null; bank_name?: string | null; bank_account?: string | null; bank_holder?: string | null } | null;
  coach_invoice_items?: InvoiceItem[];
}
