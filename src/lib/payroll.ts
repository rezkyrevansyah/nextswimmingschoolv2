import type { SupabaseClient } from "@supabase/supabase-js";

export interface TaxSetting {
  id: string;
  mode: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
}

export interface CoachLoan {
  id: string;
  coach_id: string;
  branch_id: string;
  principal_amount: number;
  tenor_months: number;
  installment_amount: number;
  reason: string | null;
  status: "active" | "paid_off" | "written_off" | "cancelled";
  notes: string | null;
  created_at: string;
  closed_at: string | null;
  coach?: { full_name: string } | null;
  branch?: { name: string } | null;
}

export interface NextInstallment {
  amount: number;
  installmentNumber: number;
  isFinal: boolean;
  remainingBefore: number;
}

export interface LoanCandidate {
  loan: CoachLoan;
  next: NextInstallment;
}

export const computeInstallmentAmount = (principal: number, tenorMonths: number): number =>
  Math.ceil(principal / tenorMonths);

export const calculateTax = (grossAmount: number, setting: TaxSetting | null): number => {
  if (!setting) return 0;
  if (setting.mode === "percent") {
    return Math.round(grossAmount * ((setting.percent_value ?? 0) / 100));
  }
  return Math.min(setting.fixed_value ?? 0, grossAmount);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveTaxSetting(supabase: SupabaseClient<any>): Promise<TaxSetting | null> {
  const { data } = await supabase
    .from("tax_settings")
    .select("id, mode, percent_value, fixed_value")
    .is("coach_id", null)
    .eq("is_active", true)
    .maybeSingle();
  return (data as TaxSetting) ?? null;
}

export async function nextInstallmentForLoan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  loan: CoachLoan
): Promise<NextInstallment | null> {
  const { data } = await supabase
    .from("coach_loan_payments")
    .select("amount, installment_number")
    .eq("loan_id", loan.id)
    .eq("kind", "installment");
  const rows = (data ?? []) as { amount: number; installment_number: number }[];
  const paidSoFar = rows.reduce((sum, r) => sum + r.amount, 0);
  const paidCount = rows.length;
  const remaining = loan.principal_amount - paidSoFar;
  if (remaining <= 0) return null;
  const nextNumber = paidCount + 1;
  const isFinal = nextNumber >= loan.tenor_months || remaining <= loan.installment_amount;
  const amount = isFinal ? remaining : loan.installment_amount;
  return { amount, installmentNumber: nextNumber, isFinal, remainingBefore: remaining };
}

export async function loansToDeductFor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  coachId: string
): Promise<LoanCandidate[]> {
  const { data } = await supabase
    .from("coach_loans")
    .select("id, coach_id, branch_id, principal_amount, tenor_months, installment_amount, reason, status, notes, created_at, closed_at")
    .eq("coach_id", coachId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  const loans = (data ?? []) as CoachLoan[];
  const results: LoanCandidate[] = [];
  for (const loan of loans) {
    const next = await nextInstallmentForLoan(supabase, loan);
    if (next) results.push({ loan, next });
  }
  return results;
}

export interface DeductionInput {
  type: "tax" | "loan" | "bpjs" | "absence_penalty" | "other";
  label: string;
  amount: number;
  loan_id?: string;
  installment_number?: number;
  period_label?: string;
  meta?: Record<string, unknown>;
}

export interface GeneratePayslipParams {
  coach_id: string;
  branch_id: string;
  invoice_id: string | null;
  period_label: string;
  gross_amount: number;
  deductions: DeductionInput[];
  notes: string | null;
  created_by: string;
}

export async function generatePayslip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: GeneratePayslipParams
): Promise<{ id: string } | { error: string }> {
  const totalDeductions = params.deductions.reduce((sum, d) => sum + d.amount, 0);
  const netAmount = params.gross_amount - totalDeductions;

  const { data: payslip, error: payslipError } = await supabase
    .from("payslips")
    .insert({
      coach_id: params.coach_id,
      branch_id: params.branch_id,
      invoice_id: params.invoice_id,
      period_label: params.period_label,
      gross_amount: params.gross_amount,
      deductions: totalDeductions,
      net_amount: netAmount,
      notes: params.notes,
      status: "draft",
    })
    .select("id")
    .single();

  if (payslipError || !payslip) return { error: payslipError?.message ?? "Gagal membuat slip gaji" };

  for (const d of params.deductions) {
    let loanPaymentId: string | null = null;

    if (d.type === "loan" && d.loan_id && d.installment_number != null) {
      const { data: paymentRow, error: paymentError } = await supabase
        .from("coach_loan_payments")
        .insert({
          loan_id: d.loan_id,
          payslip_id: payslip.id,
          amount: d.amount,
          installment_number: d.installment_number,
          period_label: d.period_label ?? params.period_label,
          kind: "installment",
          created_by: params.created_by,
        })
        .select("id")
        .single();
      if (paymentError) {
        await supabase.from("payslips").delete().eq("id", payslip.id);
        return { error: paymentError.message };
      }
      loanPaymentId = paymentRow?.id ?? null;
    }

    const { error: deductionError } = await supabase.from("payslip_deductions").insert({
      payslip_id: payslip.id,
      type: d.type,
      label: d.label,
      amount: d.amount,
      loan_id: d.loan_id ?? null,
      loan_payment_id: loanPaymentId,
      meta: d.meta ?? null,
    });
    if (deductionError) {
      await supabase.from("payslips").delete().eq("id", payslip.id);
      return { error: deductionError.message };
    }
  }

  return { id: payslip.id };
}

export async function publishPayslipWithLoanClosure(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  payslipId: string
): Promise<void> {
  const { data: payments } = await supabase
    .from("coach_loan_payments")
    .select("loan_id")
    .eq("payslip_id", payslipId)
    .eq("kind", "installment");

  const loanIds = Array.from(new Set((payments ?? []).map((p: { loan_id: string }) => p.loan_id)));

  for (const loanId of loanIds) {
    const { data: loanRow } = await supabase
      .from("coach_loans")
      .select("id, coach_id, branch_id, principal_amount, tenor_months, installment_amount, reason, status, notes, created_at, closed_at")
      .eq("id", loanId)
      .single();
    if (!loanRow) continue;
    const next = await nextInstallmentForLoan(supabase, loanRow as CoachLoan);
    if (!next) {
      await supabase.from("coach_loans").update({ status: "paid_off", closed_at: new Date().toISOString() }).eq("id", loanId);
    }
  }
}
