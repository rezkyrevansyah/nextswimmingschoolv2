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

// Deletes a payslip along with its dependent rows (payslip_deductions,
// coach_loan_payments) first — neither FK has ON DELETE CASCADE, so deleting
// the payslip row directly while children exist fails silently if the error
// isn't checked, leaving an orphaned/undeletable draft behind.
export async function deletePayslipCascade(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  payslipId: string
): Promise<{ error: string } | null> {
  // Capture any loans affected by this payslip before deleting payments
  const { data: payments } = await supabase
    .from("coach_loan_payments")
    .select("loan_id")
    .eq("payslip_id", payslipId);
  const affectedLoanIds = Array.from(new Set((payments ?? []).map((p: { loan_id: string }) => p.loan_id)));

  const { error: loanPaymentsError } = await supabase
    .from("coach_loan_payments")
    .delete()
    .eq("payslip_id", payslipId);
  if (loanPaymentsError) return { error: loanPaymentsError.message };

  const { error: deductionsError } = await supabase
    .from("payslip_deductions")
    .delete()
    .eq("payslip_id", payslipId);
  if (deductionsError) return { error: deductionsError.message };

  const { error: payslipError } = await supabase.from("payslips").delete().eq("id", payslipId);
  if (payslipError) return { error: payslipError.message };

  // If any affected loan was previously closed (paid_off), check if it should be reactivated
  for (const loanId of affectedLoanIds) {
    const { data: loanRow } = await supabase
      .from("coach_loans")
      .select("id, coach_id, branch_id, principal_amount, tenor_months, installment_amount, reason, status, notes, created_at, closed_at")
      .eq("id", loanId)
      .single();
    if (loanRow && loanRow.status === "paid_off") {
      const next = await nextInstallmentForLoan(supabase, loanRow as CoachLoan);
      if (next) {
        await supabase
          .from("coach_loans")
          .update({ status: "active", closed_at: null })
          .eq("id", loanId);
      }
    }
  }

  return null;
}

export async function generatePayslip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: GeneratePayslipParams
): Promise<{ id: string } | { error: string }> {
  if (!params.period_label || !params.period_label.trim()) {
    return { error: "Label periode tidak boleh kosong." };
  }

  const totalDeductions = params.deductions.reduce((sum, d) => sum + d.amount, 0);
  const netAmount = params.gross_amount - totalDeductions;

  if (netAmount < 0) {
    return { error: "Total potongan melebihi gaji kotor. Periksa kembali nilai potongan." };
  }

  // Guard: prevent duplicate payslip for the same invoice
  if (params.invoice_id) {
    const { data: existing } = await supabase
      .from("payslips")
      .select("id, status")
      .eq("invoice_id", params.invoice_id)
      .maybeSingle();
    if (existing) {
      return { error: `Payslip sudah ada untuk invoice ini (status: ${existing.status}). Tidak bisa membuat duplikat.` };
    }
  }

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
        await deletePayslipCascade(supabase, payslip.id);
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
      await deletePayslipCascade(supabase, payslip.id);
      return { error: deductionError.message };
    }
  }

  return { id: payslip.id };
}

export interface UpdatePayslipParams {
  id: string;
  period_label: string;
  gross_amount: number;
  deductions: DeductionInput[];
  notes: string | null;
  created_by: string;
}

export async function updatePayslip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: UpdatePayslipParams
): Promise<{ id: string } | { error: string }> {
  if (!params.period_label || !params.period_label.trim()) {
    return { error: "Label periode tidak boleh kosong." };
  }

  const totalDeductions = params.deductions.reduce((sum, d) => sum + d.amount, 0);
  const netAmount = params.gross_amount - totalDeductions;

  if (netAmount < 0) {
    return { error: "Total potongan melebihi gaji kotor. Periksa kembali nilai potongan." };
  }

  // 1. Remove previous loan payments & deductions for this draft payslip
  await supabase.from("coach_loan_payments").delete().eq("payslip_id", params.id);
  await supabase.from("payslip_deductions").delete().eq("payslip_id", params.id);

  // 2. Update payslip main record
  const { error: updateError } = await supabase
    .from("payslips")
    .update({
      period_label: params.period_label,
      gross_amount: params.gross_amount,
      deductions: totalDeductions,
      net_amount: netAmount,
      notes: params.notes,
    })
    .eq("id", params.id);

  if (updateError) return { error: updateError.message };

  // 3. Re-insert deductions
  for (const d of params.deductions) {
    let loanPaymentId: string | null = null;
    if (d.type === "loan" && d.loan_id && d.installment_number != null) {
      const { data: paymentRow, error: paymentError } = await supabase
        .from("coach_loan_payments")
        .insert({
          loan_id: d.loan_id,
          payslip_id: params.id,
          amount: d.amount,
          installment_number: d.installment_number,
          period_label: d.period_label ?? params.period_label,
          kind: "installment",
          created_by: params.created_by,
        })
        .select("id")
        .single();
      if (!paymentError && paymentRow) {
        loanPaymentId = paymentRow.id;
      }
    }

    await supabase.from("payslip_deductions").insert({
      payslip_id: params.id,
      type: d.type,
      label: d.label,
      amount: d.amount,
      loan_id: d.loan_id ?? null,
      loan_payment_id: loanPaymentId,
      meta: d.meta ?? null,
    });
  }

  return { id: params.id };
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
