"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  resolveTaxSetting,
  calculateTax,
  loansToDeductFor,
  type TaxSetting,
  type LoanCandidate,
} from "@/lib/payroll";
import type { Branch } from "../../_types";
import type { CoachInvoiceRow, GenMode, ProfileOption } from "./_types";
import { saveFromInvoice, saveManualCoach, saveManualStaff } from "./savePayslipModes";

export function useGeneratePayslipForm({
  branches,
  userId,
  userName,
  coachList,
  staffList,
  invoicesEligible,
  loadPayslips,
  loadInvoices,
}: {
  branches: Branch[];
  userId: string;
  userName: string;
  coachList: ProfileOption[];
  staffList: ProfileOption[];
  invoicesEligible: CoachInvoiceRow[];
  loadPayslips: () => void;
  loadInvoices: () => void;
}) {
  const { t } = useLocale();
  const supabase = createClient();
  const toast = useToast();

  const [showGenModal, setShowGenModal] = useState(false);
  const [genMode, setGenMode] = useState<GenMode>("manual_coach");
  const [modalLockedInvoice, setModalLockedInvoice] = useState<CoachInvoiceRow | null>(null);
  const [savingSlip, setSavingSlip] = useState(false);

  // Common fields
  const [genPeriod, setGenPeriod] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  // Mode 1: From Invoice
  const [genInvoiceId, setGenInvoiceId] = useState("");
  const [genGross, setGenGross] = useState("");
  const [genOtherDeduction, setGenOtherDeduction] = useState("");
  const [genTaxOverride, setGenTaxOverride] = useState<string | null>(null);
  const [genLoanCandidates, setGenLoanCandidates] = useState<LoanCandidate[]>([]);
  const [genLoanIncluded, setGenLoanIncluded] = useState<Record<string, boolean>>({});
  const [genLoanAmounts, setGenLoanAmounts] = useState<Record<string, string>>({});
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [taxSetting, setTaxSettingForGen] = useState<TaxSetting | null>(null);

  // Mode 2: Manual Coach
  const [manualCoachId, setManualCoachId] = useState("");
  const [manualCoachBranchId, setManualCoachBranchId] = useState("");
  const [manualCoachGross, setManualCoachGross] = useState("");
  const [manualCoachTaxOverride, setManualCoachTaxOverride] = useState<string | null>(null);
  const [manualCoachOtherDeduction, setManualCoachOtherDeduction] = useState("");

  // Mode 3: Manual Staff
  const [manualStaffId, setManualStaffId] = useState("");
  const [manualStaffBranchId, setManualStaffBranchId] = useState("");
  const [manualStaffBaseSalary, setManualStaffBaseSalary] = useState("");
  const [manualStaffAllowances, setManualStaffAllowances] = useState("");
  const [manualStaffReimburse, setManualStaffReimburse] = useState("");
  const [manualStaffDeductions, setManualStaffDeductions] = useState("");
  const [manualStaffTaxOverride, setManualStaffTaxOverride] = useState<string | null>(null);

  // Staff Attendance Calculator
  const [staffPresentDays, setStaffPresentDays] = useState<number | null>(null);
  const [staffDailyRate, setStaffDailyRate] = useState("");
  const [loadingStaffAttendance, setLoadingStaffAttendance] = useState(false);

  const resetGenForm = () => {
    setModalLockedInvoice(null);
    setGenInvoiceId("");
    setGenPeriod(() => {
      const now = new Date();
      return now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    });
    setGenGross("");
    setGenOtherDeduction("");
    setGenNotes("");
    setManualDescription("");
    setGenTaxOverride(null);
    setGenLoanCandidates([]);
    setGenLoanIncluded({});
    setGenLoanAmounts({});

    setManualCoachId("");
    setManualCoachBranchId("");
    setManualCoachGross("");
    setManualCoachTaxOverride(null);
    setManualCoachOtherDeduction("");

    setManualStaffId("");
    setManualStaffBranchId("");
    setManualStaffBaseSalary("");
    setManualStaffAllowances("");
    setManualStaffReimburse("");
    setManualStaffDeductions("");
    setManualStaffTaxOverride(null);
    setStaffPresentDays(null);
    setStaffDailyRate("");
  };

  // When changing invoice in Mode 1
  const handleGenInvoiceChange = async (invoiceId: string) => {
    const inv = invoicesEligible.find((e) => e.id === invoiceId);
    if (!inv || !inv.coach?.id) {
      setGenInvoiceId(invoiceId);
      return;
    }
    setGenInvoiceId(invoiceId);
    setGenPeriod(inv.period_label);
    setGenGross(String(inv.total_amount));
    setGenOtherDeduction("");
    setGenTaxOverride(null);

    const descriptions = (inv.coach_invoice_items ?? [])
      .map((it) => it.description?.trim())
      .filter(Boolean);
    if (descriptions.length > 0) {
      setGenNotes(descriptions.join(", "));
    }

    setLoadingLoans(true);
    const [setting, candidates] = await Promise.all([
      resolveTaxSetting(supabase),
      loansToDeductFor(supabase, inv.coach.id),
    ]);
    setTaxSettingForGen(setting);
    setGenLoanCandidates(candidates);
    const included: Record<string, boolean> = {};
    const amounts: Record<string, string> = {};
    candidates.forEach((c) => {
      included[c.loan.id] = true;
      amounts[c.loan.id] = String(c.next.amount);
    });
    setGenLoanIncluded(included);
    setGenLoanAmounts(amounts);
    setLoadingLoans(false);
  };

  // Row-initiated: "Generate Payslip" on an approved, not-yet-generated invoice
  const openGenerateForInvoice = (inv: CoachInvoiceRow) => {
    resetGenForm();
    setModalLockedInvoice(inv);
    setGenMode("from_invoice");
    setShowGenModal(true);
    const descriptions = (inv.coach_invoice_items ?? [])
      .map((it) => it.description?.trim())
      .filter(Boolean);
    if (descriptions.length > 0) {
      setGenNotes(descriptions.join(", "));
    }
    handleGenInvoiceChange(inv.id);
  };

  // Toolbar-initiated: ad-hoc manual entry (no invoice involved)
  const openGenerateManual = (mode: "manual_coach" | "manual_staff") => {
    resetGenForm();
    setGenMode(mode);
    setShowGenModal(true);
  };

  // When changing Coach in Mode 2
  const handleManualCoachChange = async (coachId: string) => {
    setManualCoachId(coachId);
    const selected = coachList.find((c) => c.id === coachId);
    if (selected?.branch_id) {
      setManualCoachBranchId(selected.branch_id);
    } else if (branches.length > 0) {
      setManualCoachBranchId(branches[0].id);
    }

    if (!coachId) {
      setGenLoanCandidates([]);
      return;
    }

    setLoadingLoans(true);
    const [setting, candidates] = await Promise.all([
      resolveTaxSetting(supabase),
      loansToDeductFor(supabase, coachId),
    ]);
    setTaxSettingForGen(setting);
    setGenLoanCandidates(candidates);
    const included: Record<string, boolean> = {};
    const amounts: Record<string, string> = {};
    candidates.forEach((c) => {
      included[c.loan.id] = true;
      amounts[c.loan.id] = String(c.next.amount);
    });
    setGenLoanIncluded(included);
    setGenLoanAmounts(amounts);
    setLoadingLoans(false);
  };

  // When changing Staff in Mode 3
  const handleManualStaffChange = async (staffId: string) => {
    setManualStaffId(staffId);
    const selected = staffList.find((s) => s.id === staffId);
    if (selected?.branch_id) {
      setManualStaffBranchId(selected.branch_id);
    } else if (branches.length > 0) {
      setManualStaffBranchId(branches[0].id);
    }
    setStaffPresentDays(null);

    if (!staffId) {
      setGenLoanCandidates([]);
      return;
    }

    setLoadingLoans(true);
    const [setting, candidates] = await Promise.all([
      resolveTaxSetting(supabase),
      loansToDeductFor(supabase, staffId),
    ]);
    setTaxSettingForGen(setting);
    setGenLoanCandidates(candidates);
    const included: Record<string, boolean> = {};
    const amounts: Record<string, string> = {};
    candidates.forEach((c) => {
      included[c.loan.id] = true;
      amounts[c.loan.id] = String(c.next.amount);
    });
    setGenLoanIncluded(included);
    setGenLoanAmounts(amounts);
    setLoadingLoans(false);
  };

  // Attendance check for staff
  const checkStaffAttendance = async () => {
    if (!manualStaffId) return toast.error(t("owner.payslip.selectStaffRequired"));
    setLoadingStaffAttendance(true);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const monthStart = `${y}-${m}-01`;
    const monthEnd = new Date(y, Number(m), 0).toISOString().split("T")[0];

    const { count, error } = await supabase
      .from("staff_attendances")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", manualStaffId)
      .eq("status", "present")
      .gte("attendance_date", monthStart)
      .lte("attendance_date", monthEnd);

    setLoadingStaffAttendance(false);
    if (error) {
      toast.error(t("owner.payslip.attendanceCheckFailed"), error.message);
      return;
    }
    setStaffPresentDays(count ?? 0);
  };

  const applyStaffAttendanceSalary = () => {
    const rate = Number(staffDailyRate);
    if (!rate || staffPresentDays == null) return;
    setManualStaffBaseSalary(String(rate * staffPresentDays));
  };

  // Calculations for Mode 1 & 2
  const currentGross =
    genMode === "from_invoice"
      ? Number(genGross || 0)
      : genMode === "manual_coach"
      ? Number(manualCoachGross || 0)
      : Number(manualStaffBaseSalary || 0) + Number(manualStaffAllowances || 0) + Number(manualStaffReimburse || 0);

  const computedTaxForMode = useMemo(() => {
    return calculateTax(currentGross, taxSetting);
  }, [currentGross, taxSetting]);

  const effectiveTaxForMode =
    genMode === "from_invoice"
      ? genTaxOverride != null
        ? Number(genTaxOverride || 0)
        : computedTaxForMode
      : genMode === "manual_coach"
      ? manualCoachTaxOverride != null
        ? Number(manualCoachTaxOverride || 0)
        : computedTaxForMode
      : manualStaffTaxOverride != null
      ? Number(manualStaffTaxOverride || 0)
      : computedTaxForMode;

  const includedLoanTotal = useMemo(() => {
    return genLoanCandidates.reduce((sum, c) => {
      if (!genLoanIncluded[c.loan.id]) return sum;
      return sum + Number(genLoanAmounts[c.loan.id] || 0);
    }, 0);
  }, [genLoanCandidates, genLoanIncluded, genLoanAmounts]);

  const otherDeductionAmount =
    genMode === "from_invoice"
      ? Number(genOtherDeduction || 0)
      : genMode === "manual_coach"
      ? Number(manualCoachOtherDeduction || 0)
      : Number(manualStaffDeductions || 0);

  const totalDeductionsPreview = effectiveTaxForMode + includedLoanTotal + otherDeductionAmount;
  const netPreview = currentGross - totalDeductionsPreview;

  // ── SAVE PAYSLIP (Draft) ──────────────────────────────────────────────────────
  const handleSavePayslip = async () => {
    if (!genPeriod.trim()) return toast.error(t("owner.payslip.periodRequired"));
    setSavingSlip(true);

    const common = {
      supabase, toast, t, userId, userName, branches,
      genPeriod, genNotes, manualDescription,
      effectiveTaxForMode, genLoanCandidates, genLoanIncluded, genLoanAmounts,
      otherDeductionAmount, currentGross, includedLoanTotal,
    };

    let ok = false;
    if (genMode === "from_invoice") {
      ok = await saveFromInvoice(common, { invoicesEligible, genInvoiceId, genTaxOverride });
    } else if (genMode === "manual_coach") {
      ok = await saveManualCoach(common, { coachList, manualCoachId, manualCoachBranchId, manualCoachTaxOverride });
    } else {
      ok = await saveManualStaff(common, {
        staffList, manualStaffId, manualStaffBranchId,
        manualStaffBaseSalary, manualStaffAllowances, manualStaffReimburse, manualStaffDeductions,
        manualStaffTaxOverride,
      });
    }

    setSavingSlip(false);
    if (!ok) return;

    setShowGenModal(false);
    resetGenForm();
    loadPayslips();
    loadInvoices();
  };

  return {
    showGenModal, setShowGenModal, genMode, setGenMode, modalLockedInvoice, savingSlip,
    genPeriod, setGenPeriod, genNotes, setGenNotes, manualDescription, setManualDescription,
    genInvoiceId, genGross, setGenGross, genOtherDeduction, setGenOtherDeduction,
    genTaxOverride, setGenTaxOverride, genLoanCandidates, genLoanIncluded, setGenLoanIncluded,
    genLoanAmounts, setGenLoanAmounts, loadingLoans,
    manualCoachId, manualCoachBranchId, setManualCoachBranchId, manualCoachGross, setManualCoachGross,
    manualCoachTaxOverride, setManualCoachTaxOverride, manualCoachOtherDeduction, setManualCoachOtherDeduction,
    manualStaffId, manualStaffBranchId, setManualStaffBranchId,
    manualStaffBaseSalary, setManualStaffBaseSalary, manualStaffAllowances, setManualStaffAllowances,
    manualStaffReimburse, setManualStaffReimburse, manualStaffDeductions, setManualStaffDeductions,
    manualStaffTaxOverride, setManualStaffTaxOverride,
    staffPresentDays, staffDailyRate, setStaffDailyRate, loadingStaffAttendance,
    openGenerateForInvoice, openGenerateManual, handleManualCoachChange, handleManualStaffChange,
    checkStaffAttendance, applyStaffAttendanceSalary,
    currentGross, computedTaxForMode, effectiveTaxForMode, includedLoanTotal, otherDeductionAmount, netPreview,
    handleSavePayslip,
  };
}
