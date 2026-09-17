// The 3 "save draft payslip" branches extracted from the Generate modal's submit
// handler — one plain async function per mode, each doing its own DB writes and
// returning a simple ok/error result so the calling hook can toast + refresh.
import { generatePayslip, type DeductionInput, type LoanCandidate } from "@/lib/payroll";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { parsePeriodToMonth } from "../../_utils";
import type { Branch } from "../../_types";
import type { CoachInvoiceRow, ProfileOption } from "./_types";

type Supabase = ReturnType<typeof createClient>;
type Toast = ReturnType<typeof useToast>;

interface SaveCommon {
  supabase: Supabase;
  toast: Toast;
  t: (key: string, vars?: Record<string, string | number>) => string;
  userId: string;
  userName: string;
  branches: Branch[];
  genPeriod: string;
  genNotes: string;
  manualDescription: string;
  effectiveTaxForMode: number;
  genLoanCandidates: LoanCandidate[];
  genLoanIncluded: Record<string, boolean>;
  genLoanAmounts: Record<string, string>;
  otherDeductionAmount: number;
  currentGross: number;
  includedLoanTotal: number;
}

function buildLoanDeductions(ctx: SaveCommon): DeductionInput[] {
  const deductions: DeductionInput[] = [];
  for (const c of ctx.genLoanCandidates) {
    if (!ctx.genLoanIncluded[c.loan.id]) continue;
    const amount = Number(ctx.genLoanAmounts[c.loan.id] || 0);
    if (amount <= 0) continue;
    deductions.push({
      type: "loan",
      label: ctx.t("owner.payslip.loanInstallmentDeductionLabel", {
        number: c.next.installmentNumber,
        total: c.loan.tenor_months,
      }),
      amount,
      loan_id: c.loan.id,
      installment_number: c.next.installmentNumber,
      period_label: ctx.genPeriod.trim(),
    });
  }
  return deductions;
}

export async function saveFromInvoice(
  ctx: SaveCommon,
  extra: { invoicesEligible: CoachInvoiceRow[]; genInvoiceId: string; genTaxOverride: string | null }
): Promise<boolean> {
  const { supabase, toast, t, branches, genPeriod, genNotes, effectiveTaxForMode, otherDeductionAmount, currentGross, userId, userName } = ctx;
  if (!extra.genInvoiceId) {
    toast.error(t("owner.payslip.selectInvoiceRequired"));
    return false;
  }
  const inv = extra.invoicesEligible.find((e) => e.id === extra.genInvoiceId);
  if (!inv || !inv.coach?.id) {
    toast.error(t("owner.payslip.invoiceNotFound"));
    return false;
  }

  const deductions: DeductionInput[] = [];
  if (effectiveTaxForMode > 0) {
    deductions.push({
      type: "tax",
      label: t("owner.payslip.incomeTaxDeductionLabel"),
      amount: effectiveTaxForMode,
      meta: { overridden: extra.genTaxOverride != null },
    });
  }
  deductions.push(...buildLoanDeductions(ctx));
  if (otherDeductionAmount > 0) {
    deductions.push({
      type: "other",
      label: t("owner.payslip.otherDeductionDeductionLabel"),
      amount: otherDeductionAmount,
    });
  }

  const defaultNotes = (inv.coach_invoice_items ?? [])
    .map((it) => it.description?.trim())
    .filter(Boolean)
    .join(", ");

  const result = await generatePayslip(supabase, {
    coach_id: inv.coach.id,
    branch_id: inv.branch_id ?? branches[0]?.id ?? "",
    invoice_id: extra.genInvoiceId,
    period_label: genPeriod.trim(),
    gross_amount: currentGross,
    deductions,
    notes: genNotes.trim() || defaultNotes || null,
    created_by: userId,
  });

  if ("error" in result) {
    toast.error(t("owner.payslip.saveFailed"), result.error);
    return false;
  }

  toast.success(t("owner.payslip.generated"));
  logActivity(supabase, {
    userId,
    userRole: "owner",
    userName,
    entityType: "payslips",
    entityId: inv.coach.id,
    entityLabel: inv.coach.full_name,
    action: "create",
    label: t("owner.payslip.activityGenerated", { coach: inv.coach.full_name, period: genPeriod.trim() }),
  });
  return true;
}

export async function saveManualCoach(
  ctx: SaveCommon,
  extra: { coachList: ProfileOption[]; manualCoachId: string; manualCoachBranchId: string; manualCoachTaxOverride: string | null }
): Promise<boolean> {
  const { supabase, toast, t, branches, genPeriod, genNotes, manualDescription, effectiveTaxForMode, otherDeductionAmount, currentGross, userId, userName } = ctx;
  if (!extra.manualCoachId) {
    toast.error(t("owner.payslip.selectCoachRequired"));
    return false;
  }
  if (currentGross <= 0) {
    toast.error(t("owner.payslip.grossRequired"));
    return false;
  }

  const coach = extra.coachList.find((c) => c.id === extra.manualCoachId);
  const branchId = extra.manualCoachBranchId || coach?.branch_id || branches[0]?.id || "";

  // 1. Create a synchronized coach invoice
  const invoiceNumber = `INV-M-${Date.now().toString(36).toUpperCase()}`;
  const { data: invRow, error: invError } = await supabase
    .from("coach_invoices")
    .insert({
      coach_id: extra.manualCoachId,
      branch_id: branchId,
      period_label: genPeriod.trim(),
      invoice_number: invoiceNumber,
      total_amount: currentGross,
      status: "approved",
      approved_at: new Date().toISOString(),
      bank_info: {
        bank_name: coach?.bank_name,
        bank_account: coach?.bank_account,
        bank_holder: coach?.bank_holder,
      },
    })
    .select("id")
    .single();

  if (invError || !invRow) {
    toast.error(t("owner.payslip.invoiceCreateFailed"), invError?.message);
    return false;
  }

  const finalCoachNotes = manualDescription.trim()
    ? (genNotes.trim() ? `${manualDescription.trim()} — ${genNotes.trim()}` : manualDescription.trim())
    : (genNotes.trim() || null);

  // 2. Create invoice item
  await supabase.from("coach_invoice_items").insert({
    invoice_id: invRow.id,
    item_type: "manual_fee",
    session_count: 1,
    rate: currentGross,
    description: manualDescription.trim() || `Coach Honor (${genPeriod.trim()})`,
  });

  // 3. Build deductions
  const deductions: DeductionInput[] = [];
  if (effectiveTaxForMode > 0) {
    deductions.push({
      type: "tax",
      label: t("owner.payslip.incomeTaxDeductionLabel"),
      amount: effectiveTaxForMode,
      meta: { overridden: extra.manualCoachTaxOverride != null },
    });
  }
  deductions.push(...buildLoanDeductions(ctx));
  if (otherDeductionAmount > 0) {
    deductions.push({
      type: "other",
      label: t("owner.payslip.otherDeductionDeductionLabel"),
      amount: otherDeductionAmount,
    });
  }

  const result = await generatePayslip(supabase, {
    coach_id: extra.manualCoachId,
    branch_id: branchId,
    invoice_id: invRow.id,
    period_label: genPeriod.trim(),
    gross_amount: currentGross,
    deductions,
    notes: finalCoachNotes,
    created_by: userId,
  });

  if ("error" in result) {
    toast.error(t("owner.payslip.saveFailed"), result.error);
    return false;
  }

  toast.success(t("owner.payslip.generated"));
  logActivity(supabase, {
    userId,
    userRole: "owner",
    userName,
    entityType: "payslips",
    entityId: extra.manualCoachId,
    entityLabel: coach?.full_name,
    action: "create",
    label: `Manual payslip & invoice created for ${coach?.full_name} period ${genPeriod.trim()}`,
  });
  return true;
}

export async function saveManualStaff(
  ctx: SaveCommon,
  extra: {
    staffList: ProfileOption[];
    manualStaffId: string;
    manualStaffBranchId: string;
    manualStaffBaseSalary: string;
    manualStaffAllowances: string;
    manualStaffReimburse: string;
    manualStaffDeductions: string;
    manualStaffTaxOverride: string | null;
  }
): Promise<boolean> {
  const { supabase, toast, t, branches, genPeriod, genNotes, manualDescription, effectiveTaxForMode, currentGross, includedLoanTotal, userId, userName } = ctx;
  if (!extra.manualStaffId) {
    toast.error(t("owner.payslip.selectStaffRequired"));
    return false;
  }
  const staff = extra.staffList.find((s) => s.id === extra.manualStaffId);
  const branchId = extra.manualStaffBranchId || staff?.branch_id || branches[0]?.id || "";
  const baseSalary = Number(extra.manualStaffBaseSalary || 0);
  const allowances = Number(extra.manualStaffAllowances || 0);
  const reimburse = Number(extra.manualStaffReimburse || 0);
  const deductionsVal = Number(extra.manualStaffDeductions || 0);
  const totalSalary = baseSalary + allowances + reimburse - deductionsVal;

  if (baseSalary <= 0 && totalSalary <= 0) {
    toast.error(t("owner.payslip.grossRequired"));
    return false;
  }

  // 1. Sync to staff_salaries
  const monthPeriod = parsePeriodToMonth(genPeriod.trim());
  const totalStaffDeductions = deductionsVal + includedLoanTotal + effectiveTaxForMode;
  const netStaffSalary = Math.max(0, currentGross - totalStaffDeductions);
  const finalStaffNotes = manualDescription.trim()
    ? (genNotes.trim() ? `${manualDescription.trim()} — ${genNotes.trim()}` : manualDescription.trim())
    : (genNotes.trim() ? `${genNotes.trim()} [Staff Salary]` : "Staff Salary");

  const { error: salError } = await supabase
    .from("staff_salaries")
    .upsert(
      {
        staff_id: extra.manualStaffId,
        branch_id: branchId,
        period_month: monthPeriod,
        base_salary: baseSalary,
        allowances: allowances,
        reimburse_amount: reimburse,
        deductions: totalStaffDeductions,
        total_salary: netStaffSalary,
        status: "approved",
        notes: finalStaffNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "staff_id, period_month" }
    )
    .select("id")
    .single();

  if (salError) {
    console.warn("staff_salaries upsert notice:", salError.message);
  }

  // 2. Create payslips unified record
  const deductions: DeductionInput[] = [];
  if (effectiveTaxForMode > 0) {
    deductions.push({
      type: "tax",
      label: t("owner.payslip.incomeTaxDeductionLabel"),
      amount: effectiveTaxForMode,
      meta: { overridden: extra.manualStaffTaxOverride != null },
    });
  }
  deductions.push(...buildLoanDeductions(ctx));
  if (deductionsVal > 0) {
    deductions.push({
      type: "other",
      label: t("owner.payslip.otherDeductionDeductionLabel"),
      amount: deductionsVal,
    });
  }

  const result = await generatePayslip(supabase, {
    coach_id: extra.manualStaffId,
    branch_id: branchId,
    invoice_id: null,
    period_label: genPeriod.trim(),
    gross_amount: currentGross,
    deductions,
    notes: finalStaffNotes,
    created_by: userId,
  });

  if ("error" in result) {
    toast.error(t("owner.payslip.saveFailed"), result.error);
    return false;
  }

  toast.success(t("owner.payslip.generated") + " & " + t("owner.payslip.staffSalarySyncSuccess"));
  logActivity(supabase, {
    userId,
    userRole: "owner",
    userName,
    entityType: "payslips",
    entityId: extra.manualStaffId,
    entityLabel: staff?.full_name,
    action: "create",
    label: `Staff payslip created for ${staff?.full_name} period ${genPeriod.trim()}`,
  });
  return true;
}
