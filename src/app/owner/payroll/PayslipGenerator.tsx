"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { printPayslip as printPayslipUtil } from "@/lib/printPayslip";
import {
  resolveTaxSetting,
  calculateTax,
  loansToDeductFor,
  generatePayslip,
  updatePayslip,
  publishPayslipWithLoanClosure,
  deletePayslipCascade,
  type TaxSetting,
  type LoanCandidate,
  type DeductionInput,
} from "@/lib/payroll";

interface Branch {
  id: string;
  name: string;
}

interface ProfileOption {
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

interface InvoiceItem {
  id: string;
  class_id: string | null;
  session_count: number;
  rate: number;
}

interface InvoiceLike {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  branch_id?: string | null;
  branch?: { name: string } | null;
  coach?: { id: string; full_name: string } | null;
  coach_invoice_items?: InvoiceItem[];
}

interface OwnerPayslipRow {
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
}

interface PayslipDeductionRow {
  id: string;
  type: string;
  label: string;
  amount: number;
}

export default function PayslipGenerator({
  branches,
  userId,
  userName,
  invoices,
  invoicesWithoutSlip,
}: {
  branches: Branch[];
  userId: string;
  userName: string;
  invoices: InvoiceLike[];
  invoicesWithoutSlip: InvoiceLike[];
}) {
  const { t } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [payslips, setPayslips] = useState<OwnerPayslipRow[]>([]);
  const [loadingPayslips, setLoadingPayslips] = useState(true);

  // Profiles for coach & staff selection
  const [coachList, setCoachList] = useState<ProfileOption[]>([]);
  const [staffList, setStaffList] = useState<ProfileOption[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "coach" | "staff">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Tax settings ─────────────────────────────────────────────────────────────
  const [taxMode, setTaxMode] = useState<"percent" | "fixed">("percent");
  const [taxPercent, setTaxPercent] = useState("");
  const [taxFixed, setTaxFixed] = useState("");
  const [taxSettingId, setTaxSettingId] = useState<string | null>(null);
  const [savingTax, setSavingTax] = useState(false);

  const loadTaxSetting = useCallback(async () => {
    const setting = await resolveTaxSetting(supabase);
    if (setting) {
      setTaxSettingId(setting.id);
      setTaxMode(setting.mode);
      setTaxPercent(setting.percent_value != null ? String(setting.percent_value) : "");
      setTaxFixed(setting.fixed_value != null ? String(setting.fixed_value) : "");
    }
  }, [supabase]);

  useEffect(() => {
    loadTaxSetting();
  }, [loadTaxSetting]);

  const saveTaxSetting = async () => {
    if (taxMode === "percent" && (!taxPercent || Number(taxPercent) <= 0))
      return toast.error(t("owner.payslip.invalidTaxPercent"));
    if (taxMode === "fixed" && (!taxFixed || Number(taxFixed) <= 0))
      return toast.error(t("owner.payslip.invalidTaxFixed"));
    setSavingTax(true);
    const payload = {
      coach_id: null,
      mode: taxMode,
      percent_value: taxMode === "percent" ? Number(taxPercent) : null,
      fixed_value: taxMode === "fixed" ? Number(taxFixed) : null,
      is_active: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const op = taxSettingId
      ? supabase.from("tax_settings").update(payload).eq("id", taxSettingId)
      : supabase.from("tax_settings").insert(payload);
    const { error } = await op;
    setSavingTax(false);
    if (error) return toast.error(t("owner.payslip.taxSaveFailed"), error.message);
    toast.success(t("owner.payslip.taxSaved"));
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      entityType: "tax_settings",
      entityId: taxSettingId ?? "new",
      action: "update",
      label: t("owner.payslip.activityTaxUpdated", {
        value: taxMode === "percent" ? `${taxPercent}%` : fmtIDR(Number(taxFixed)),
      }),
    });
    loadTaxSetting();
  };

  // ── Load Profiles & Payslips ──────────────────────────────────────────────────
  const loadProfiles = useCallback(async () => {
    const { data: coaches } = await supabase
      .from("profiles")
      .select("id, full_name, role, branch_id, phone, bank_name, bank_account, bank_holder, avatar_url")
      .eq("role", "coach")
      .order("full_name");
    if (coaches) setCoachList(coaches as ProfileOption[]);

    const { data: staffs } = await supabase
      .from("profiles")
      .select("id, full_name, role, branch_id, phone, bank_name, bank_account, bank_holder, avatar_url")
      .eq("role", "staff")
      .order("full_name");
    if (staffs) setStaffList(staffs as ProfileOption[]);
  }, [supabase]);

  const loadPayslips = useCallback(async () => {
    setLoadingPayslips(true);
    const { data } = await supabase
      .from("payslips")
      .select(
        "id, coach_id, branch_id, invoice_id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, published_by, created_at, coach:profiles!payslips_coach_id_fkey(id, full_name, role, avatar_url), branch:branches(id, name)"
      )
      .order("created_at", { ascending: false });
    if (data) setPayslips(data as unknown as OwnerPayslipRow[]);
    setLoadingPayslips(false);
  }, [supabase]);

  useEffect(() => {
    loadProfiles();
    loadPayslips();
  }, [loadProfiles, loadPayslips]);

  // ── Filtered List ─────────────────────────────────────────────────────────────
  const filteredPayslips = useMemo(() => {
    let r = payslips;
    if (roleFilter !== "all") {
      r = r.filter((p) => {
        const rRole = p.coach?.role || (staffList.some((s) => s.id === p.coach_id) ? "staff" : "coach");
        return rRole === roleFilter;
      });
    }
    if (branchFilter !== "all") {
      r = r.filter((p) => p.branch_id === branchFilter);
    }
    if (statusFilter !== "all") {
      r = r.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.coach?.full_name?.toLowerCase().includes(q) ||
          p.period_label?.toLowerCase().includes(q) ||
          p.branch?.name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [payslips, roleFilter, branchFilter, statusFilter, search, staffList]);

  const invoicesEligible = useMemo(() => {
    const usedInvoiceIds = new Set(payslips.map((p) => p.invoice_id).filter(Boolean));
    return invoicesWithoutSlip.filter((i) => !usedInvoiceIds.has(i.id));
  }, [invoicesWithoutSlip, payslips]);

  // ── Stats Summary ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCount = filteredPayslips.length;
    const totalGross = filteredPayslips.reduce((acc, p) => acc + (p.gross_amount || 0), 0);
    const totalNet = filteredPayslips.reduce((acc, p) => acc + (p.net_amount || 0), 0);
    const publishedCount = filteredPayslips.filter((p) => p.status === "published").length;
    const draftCount = totalCount - publishedCount;
    return { totalCount, totalGross, totalNet, publishedCount, draftCount };
  }, [filteredPayslips]);

  // ── Generate Modal State ──────────────────────────────────────────────────────
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMode, setGenMode] = useState<"from_invoice" | "manual_coach" | "manual_staff">("from_invoice");
  const [savingSlip, setSavingSlip] = useState(false);

  // Common fields
  const [genPeriod, setGenPeriod] = useState("");
  const [genNotes, setGenNotes] = useState("");

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

  // Staff Attendance Calculator
  const [staffPresentDays, setStaffPresentDays] = useState<number | null>(null);
  const [staffDailyRate, setStaffDailyRate] = useState("");
  const [loadingStaffAttendance, setLoadingStaffAttendance] = useState(false);

  const resetGenForm = () => {
    setGenMode("from_invoice");
    setGenInvoiceId("");
    setGenPeriod(() => {
      const now = new Date();
      return now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    });
    setGenGross("");
    setGenOtherDeduction("");
    setGenNotes("");
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
      toast.error("Gagal memeriksa presensi staff", error.message);
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
    if (genMode === "manual_staff") return 0;
    return calculateTax(currentGross, taxSetting);
  }, [currentGross, taxSetting, genMode]);

  const effectiveTaxForMode =
    genMode === "from_invoice"
      ? genTaxOverride != null
        ? Number(genTaxOverride || 0)
        : computedTaxForMode
      : genMode === "manual_coach"
      ? manualCoachTaxOverride != null
        ? Number(manualCoachTaxOverride || 0)
        : computedTaxForMode
      : 0;

  const includedLoanTotal = useMemo(() => {
    if (genMode === "manual_staff") return 0;
    return genLoanCandidates.reduce((sum, c) => {
      if (!genLoanIncluded[c.loan.id]) return sum;
      return sum + Number(genLoanAmounts[c.loan.id] || 0);
    }, 0);
  }, [genLoanCandidates, genLoanIncluded, genLoanAmounts, genMode]);

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

    if (genMode === "from_invoice") {
      if (!genInvoiceId) {
        setSavingSlip(false);
        return toast.error(t("owner.payslip.selectInvoiceRequired"));
      }
      const inv = invoicesEligible.find((e) => e.id === genInvoiceId);
      if (!inv || !inv.coach?.id) {
        setSavingSlip(false);
        return toast.error(t("owner.payslip.invoiceNotFound"));
      }

      const deductions: DeductionInput[] = [];
      if (effectiveTaxForMode > 0) {
        deductions.push({
          type: "tax",
          label: t("owner.payslip.incomeTaxDeductionLabel"),
          amount: effectiveTaxForMode,
          meta: { overridden: genTaxOverride != null },
        });
      }
      for (const c of genLoanCandidates) {
        if (!genLoanIncluded[c.loan.id]) continue;
        const amount = Number(genLoanAmounts[c.loan.id] || 0);
        if (amount <= 0) continue;
        deductions.push({
          type: "loan",
          label: t("owner.payslip.loanInstallmentDeductionLabel", {
            number: c.next.installmentNumber,
            total: c.loan.tenor_months,
          }),
          amount,
          loan_id: c.loan.id,
          installment_number: c.next.installmentNumber,
          period_label: genPeriod.trim(),
        });
      }
      if (otherDeductionAmount > 0) {
        deductions.push({
          type: "other",
          label: t("owner.payslip.otherDeductionDeductionLabel"),
          amount: otherDeductionAmount,
        });
      }

      const result = await generatePayslip(supabase, {
        coach_id: inv.coach.id,
        branch_id: inv.branch_id ?? branches[0]?.id ?? "",
        invoice_id: genInvoiceId,
        period_label: genPeriod.trim(),
        gross_amount: currentGross,
        deductions,
        notes: genNotes.trim() || null,
        created_by: userId,
      });

      setSavingSlip(false);
      if ("error" in result) return toast.error(t("owner.payslip.saveFailed"), result.error);

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
    } else if (genMode === "manual_coach") {
      if (!manualCoachId) {
        setSavingSlip(false);
        return toast.error(t("owner.payslip.selectCoachRequired"));
      }
      if (currentGross <= 0) {
        setSavingSlip(false);
        return toast.error(t("owner.payslip.grossRequired"));
      }

      const coach = coachList.find((c) => c.id === manualCoachId);
      const branchId = manualCoachBranchId || coach?.branch_id || branches[0]?.id || "";

      // 1. Create a synchronized coach invoice
      const invoiceNumber = `INV-M-${Date.now().toString(36).toUpperCase()}`;
      const { data: invRow, error: invError } = await supabase
        .from("coach_invoices")
        .insert({
          coach_id: manualCoachId,
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
        setSavingSlip(false);
        return toast.error("Gagal membuat record invoice", invError?.message);
      }

      // 2. Create invoice item
      await supabase.from("coach_invoice_items").insert({
        invoice_id: invRow.id,
        item_type: "manual_fee",
        session_count: 1,
        rate: currentGross,
        description: `Honor Pelatih (${genPeriod.trim()})`,
      });

      // 3. Build deductions
      const deductions: DeductionInput[] = [];
      if (effectiveTaxForMode > 0) {
        deductions.push({
          type: "tax",
          label: t("owner.payslip.incomeTaxDeductionLabel"),
          amount: effectiveTaxForMode,
          meta: { overridden: manualCoachTaxOverride != null },
        });
      }
      for (const c of genLoanCandidates) {
        if (!genLoanIncluded[c.loan.id]) continue;
        const amount = Number(genLoanAmounts[c.loan.id] || 0);
        if (amount <= 0) continue;
        deductions.push({
          type: "loan",
          label: t("owner.payslip.loanInstallmentDeductionLabel", {
            number: c.next.installmentNumber,
            total: c.loan.tenor_months,
          }),
          amount,
          loan_id: c.loan.id,
          installment_number: c.next.installmentNumber,
          period_label: genPeriod.trim(),
        });
      }
      if (otherDeductionAmount > 0) {
        deductions.push({
          type: "other",
          label: t("owner.payslip.otherDeductionDeductionLabel"),
          amount: otherDeductionAmount,
        });
      }

      const result = await generatePayslip(supabase, {
        coach_id: manualCoachId,
        branch_id: branchId,
        invoice_id: invRow.id,
        period_label: genPeriod.trim(),
        gross_amount: currentGross,
        deductions,
        notes: genNotes.trim() || null,
        created_by: userId,
      });

      setSavingSlip(false);
      if ("error" in result) return toast.error(t("owner.payslip.saveFailed"), result.error);

      toast.success(t("owner.payslip.generated"));
      logActivity(supabase, {
        userId,
        userRole: "owner",
        userName,
        entityType: "payslips",
        entityId: manualCoachId,
        entityLabel: coach?.full_name,
        action: "create",
        label: `Slip gaji & invoice manual dibuat untuk ${coach?.full_name} periode ${genPeriod.trim()}`,
      });
    } else if (genMode === "manual_staff") {
      if (!manualStaffId) {
        setSavingSlip(false);
        return toast.error(t("owner.payslip.selectStaffRequired"));
      }
      const staff = staffList.find((s) => s.id === manualStaffId);
      const branchId = manualStaffBranchId || staff?.branch_id || branches[0]?.id || "";
      const baseSalary = Number(manualStaffBaseSalary || 0);
      const allowances = Number(manualStaffAllowances || 0);
      const reimburse = Number(manualStaffReimburse || 0);
      const deductionsVal = Number(manualStaffDeductions || 0);
      const totalSalary = baseSalary + allowances + reimburse - deductionsVal;

      if (baseSalary <= 0 && totalSalary <= 0) {
        setSavingSlip(false);
        return toast.error(t("owner.payslip.grossRequired"));
      }

      // 1. Sync to staff_salaries
      const monthPeriod = genPeriod.trim().match(/^\d{4}-\d{2}$/)
        ? genPeriod.trim()
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      const { error: salError } = await supabase
        .from("staff_salaries")
        .upsert(
          {
            staff_id: manualStaffId,
            branch_id: branchId,
            period_month: monthPeriod,
            base_salary: baseSalary,
            allowances: allowances,
            reimburse_amount: reimburse,
            deductions: deductionsVal,
            total_salary: totalSalary,
            status: "approved",
            notes: genNotes.trim() || null,
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
      if (deductionsVal > 0) {
        deductions.push({
          type: "other",
          label: t("owner.payslip.otherDeductionDeductionLabel"),
          amount: deductionsVal,
        });
      }

      const result = await generatePayslip(supabase, {
        coach_id: manualStaffId,
        branch_id: branchId,
        invoice_id: null,
        period_label: genPeriod.trim(),
        gross_amount: currentGross,
        deductions,
        notes: genNotes.trim() ? `${genNotes.trim()} [Staff Salary]` : "Staff Salary",
        created_by: userId,
      });

      setSavingSlip(false);
      if ("error" in result) return toast.error(t("owner.payslip.saveFailed"), result.error);

      toast.success(t("owner.payslip.generated") + " & " + t("owner.payslip.staffSalarySyncSuccess"));
      logActivity(supabase, {
        userId,
        userRole: "owner",
        userName,
        entityType: "payslips",
        entityId: manualStaffId,
        entityLabel: staff?.full_name,
        action: "create",
        label: `Slip gaji staff dibuat untuk ${staff?.full_name} periode ${genPeriod.trim()}`,
      });
    }

    setShowGenModal(false);
    resetGenForm();
    loadPayslips();
  };

  // ── EDIT MODAL STATE ─────────────────────────────────────────────────────────
  const [editSlip, setEditSlip] = useState<OwnerPayslipRow | null>(null);
  const [editPeriod, setEditPeriod] = useState("");
  const [editGross, setEditGross] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDeductions, setEditDeductions] = useState<{ id: string; label: string; amount: number; type: string }[]>(
    []
  );
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditSlip = async (p: OwnerPayslipRow) => {
    setEditSlip(p);
    setEditPeriod(p.period_label);
    setEditGross(String(p.gross_amount));
    setEditNotes(p.notes ?? "");
    const { data } = await supabase.from("payslip_deductions").select("id, type, label, amount").eq("payslip_id", p.id);
    setEditDeductions((data as any[]) ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editSlip) return;
    setSavingEdit(true);

    const deductions: DeductionInput[] = editDeductions.map((d) => ({
      type: (d.type as any) || "other",
      label: d.label,
      amount: Number(d.amount || 0),
    }));

    const result = await updatePayslip(supabase, {
      id: editSlip.id,
      period_label: editPeriod.trim(),
      gross_amount: Number(editGross || 0),
      deductions,
      notes: editNotes.trim() || null,
      created_by: userId,
    });

    setSavingEdit(false);
    if ("error" in result) return toast.error(result.error);

    toast.success(t("owner.payslip.updated"));
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      entityType: "payslips",
      entityId: editSlip.id,
      action: "update",
      label: `Update draft slip gaji ${editSlip.coach?.full_name ?? ""} periode ${editPeriod.trim()}`,
    });

    setEditSlip(null);
    loadPayslips();
  };

  // ── PUBLISH & DELETE ─────────────────────────────────────────────────────────
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const publishPayslip = async (p: OwnerPayslipRow) => {
    const ok = await confirm({
      title: t("owner.payslip.publishConfirmTitle"),
      body: t("owner.payslip.publishConfirmBody", { coach: p.coach?.full_name ?? "recipient", period: p.period_label }),
      confirmLabel: t("owner.payslip.publishConfirmLabel"),
    });
    if (!ok) return;

    setPublishingId(p.id);
    const { error } = await supabase
      .from("payslips")
      .update({ status: "published", published_at: new Date().toISOString(), published_by: userId })
      .eq("id", p.id);

    if (!error) {
      await publishPayslipWithLoanClosure(supabase, p.id);
      // If linked to staff, mark staff_salaries as paid/approved
      await supabase
        .from("staff_salaries")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("staff_id", p.coach_id);
    }
    setPublishingId(null);

    if (error) return toast.error(t("owner.payslip.publishFailed"), error.message);
    toast.success(t("owner.payslip.published"));
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      branchId: p.branch_id,
      entityType: "payslips",
      entityId: p.id,
      entityLabel: p.coach?.full_name ?? undefined,
      action: "publish",
      label: t("owner.payslip.activityPublished", { coach: p.coach?.full_name ?? "recipient", period: p.period_label }),
      meta: { net_amount: p.net_amount },
    });
    setPayslips((prev) =>
      prev.map((s) => (s.id === p.id ? { ...s, status: "published", published_at: new Date().toISOString() } : s))
    );
  };

  const deletePayslip = async (p: OwnerPayslipRow) => {
    const ok = await confirm({
      title: t("owner.payslip.deleteConfirmTitle"),
      body: t("owner.payslip.deleteConfirmBody"),
      confirmLabel: t("owner.payslip.deleteConfirmLabel"),
      danger: true,
    });
    if (!ok) return;

    const cascadeError = await deletePayslipCascade(supabase, p.id);
    if (cascadeError) return toast.error(t("owner.payslip.deleteFailed"), cascadeError.error);

    toast.success(t("owner.payslip.deleted"));
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      branchId: p.branch_id,
      entityType: "payslips",
      entityId: p.id,
      entityLabel: p.coach?.full_name ?? undefined,
      action: "delete",
      label: t("owner.payslip.activityDeleted", { coach: p.coach?.full_name ?? "recipient", period: p.period_label }),
    });
    setPayslips((prev) => prev.filter((s) => s.id !== p.id));
  };

  const printPayslip = (p: OwnerPayslipRow) => {
    void printPayslipUtil(supabase, p.id);
  };

  // ── VIEW / DETAIL MODAL ──────────────────────────────────────────────────────
  const [viewSlip, setViewSlip] = useState<OwnerPayslipRow | null>(null);
  const [viewDeductions, setViewDeductions] = useState<PayslipDeductionRow[]>([]);
  const [loadingViewDeductions, setLoadingViewDeductions] = useState(false);

  const openViewSlip = async (p: OwnerPayslipRow) => {
    setViewSlip(p);
    setLoadingViewDeductions(true);
    const { data } = await supabase
      .from("payslip_deductions")
      .select("id, type, label, amount")
      .eq("payslip_id", p.id)
      .order("type");
    if (data) setViewDeductions(data as PayslipDeductionRow[]);
    setLoadingViewDeductions(false);
  };

  void invoices;

  return (
    <div className="space-y-6">
      {/* ── Tax Settings Card ────────────────────────────────────────────────── */}
      <Card className="space-y-3 p-5">
        <div>
          <div className="font-display font-bold text-base text-ink">{t("owner.payslip.taxSettingsTitle")}</div>
          <p className="text-xs text-ink-mute mt-0.5">{t("owner.payslip.taxSettingsSub")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTaxMode("percent")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                taxMode === "percent" ? "bg-ocean-700 text-white shadow-sm" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {t("owner.payslip.taxModePercent")}
            </button>
            <button
              onClick={() => setTaxMode("fixed")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                taxMode === "fixed" ? "bg-ocean-700 text-white shadow-sm" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {t("owner.payslip.taxModeFixed")}
            </button>
          </div>
          <div className="w-40">
            {taxMode === "percent" ? (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                placeholder="5"
                className="font-mono text-sm"
              />
            ) : (
              <Input
                type="text"
                inputMode="numeric"
                value={taxFixed ? Number(taxFixed).toLocaleString("id-ID") : ""}
                onChange={(e) => setTaxFixed(e.target.value.replace(/\D/g, ""))}
                placeholder="50.000"
                className="font-mono text-sm"
              />
            )}
          </div>
          <Btn variant="soft" size="sm" onClick={saveTaxSetting} disabled={savingTax}>
            {savingTax ? "…" : t("common.actions.save")}
          </Btn>
        </div>
      </Card>

      {/* ── Summary Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Total Slip Gaji</div>
          <div className="text-2xl font-bold font-mono text-ink">{stats.totalCount}</div>
          <div className="text-xs text-ink-faint">
            {stats.publishedCount} Terbit · {stats.draftCount} Draft
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Total Gaji Kotor</div>
          <div className="text-2xl font-bold font-mono text-ink-strong">{fmtIDR(stats.totalGross)}</div>
          <div className="text-xs text-ink-faint">Sebelum potongan</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Total Gaji Bersih</div>
          <div className="text-2xl font-bold font-mono text-ok-700">{fmtIDR(stats.totalNet)}</div>
          <div className="text-xs text-ok-600 font-medium">Dana keluar bersih</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">Status Draft</div>
          <div className="text-2xl font-bold font-mono text-warn-600">{stats.draftCount}</div>
          <div className="text-xs text-ink-faint">Menunggu persetujuan / terbit</div>
        </div>
      </div>

      {/* ── Header & Action Toolbar ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-display font-bold text-xl text-ink">{t("owner.payslip.pageTitle")}</div>
            <p className="text-xs text-ink-mute mt-0.5">{t("owner.payslip.pageSub")}</p>
          </div>
          <Btn
            variant="primary"
            icon="plus"
            onClick={() => {
              resetGenForm();
              setShowGenModal(true);
            }}
          >
            {t("owner.payslip.generatePayslip")}
          </Btn>
        </div>

        {/* ── Filters & Search ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Icon name="search" className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("owner.payslip.searchPlaceholder")}
              className="pl-9 text-sm"
            />
          </div>

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="!w-36 shrink-0"
          >
            <option value="all">{t("owner.payslip.filterAllRoles")}</option>
            <option value="coach">{t("owner.payslip.roleCoach")}</option>
            <option value="staff">{t("owner.payslip.roleStaff")}</option>
          </Select>

          <Select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="!w-44 shrink-0"
          >
            <option value="all">{t("owner.payslip.filterAllBranches")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="!w-36 shrink-0"
          >
            <option value="all">{t("owner.payslip.filterAllStatus")}</option>
            <option value="draft">{t("owner.payslip.statusDraft")}</option>
            <option value="published">{t("owner.payslip.statusPublished")}</option>
          </Select>

          <span className="text-xs text-ink-mute self-center ml-auto">
            {t("owner.payslip.slipCount", { count: filteredPayslips.length })}
          </span>
        </div>

        {/* ── Payslips List Table ── */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-xs">
          {loadingPayslips ? (
            <div className="p-12 text-center text-ink-mute text-sm">{t("owner.payslip.loading")}</div>
          ) : filteredPayslips.length === 0 ? (
            <div className="p-12 text-center text-ink-mute text-sm space-y-2">
              <Icon name="invoice" className="w-8 h-8 mx-auto text-ink-faint" />
              <div>{t("owner.payslip.empty")}</div>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {filteredPayslips.map((p) => {
                const isStaff =
                  p.coach?.role === "staff" ||
                  staffList.some((s) => s.id === p.coach_id) ||
                  p.notes?.includes("[Staff Salary]");

                return (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-paper-tint/60 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={p.coach?.avatar_url ?? undefined} name={p.coach?.full_name ?? "User"} size={40} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-ink-strong truncate max-w-[200px]">
                            {p.coach?.full_name ?? "—"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              isStaff
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-ocean-50 text-ocean-700 border border-ocean-200"
                            }`}
                          >
                            {isStaff ? "Staff" : "Coach"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.status === "published"
                                ? "bg-ok-50 text-ok-700 border border-ok-200"
                                : "bg-warn-50 text-warn-700 border border-warn-200"
                            }`}
                          >
                            {p.status === "published" ? t("owner.payslip.statusPublished") : t("owner.payslip.statusDraft")}
                          </span>
                        </div>
                        <div className="text-xs text-ink-mute mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-ink-soft">{p.period_label}</span>
                          <span>·</span>
                          <span>{p.branch?.name ?? "Center"}</span>
                          {p.invoice_id && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px] text-ink-faint">Linked Inv</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-ink-mute mt-0.5">
                          {t("owner.payslip.grossDeductionsNetPrefix", {
                            gross: fmtIDR(p.gross_amount),
                            deductions: fmtIDR(p.deductions),
                          })}
                          <span className="text-ok-700 font-bold font-mono">{fmtIDR(p.net_amount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => openViewSlip(p)}
                        className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                        title={t("owner.payslip.viewPrintTitle")}
                      >
                        <Icon name="eye" className="w-4 h-4" />
                      </button>
                      {p.status === "draft" && (
                        <>
                          <button
                            onClick={() => openEditSlip(p)}
                            className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                            title={t("owner.payslip.editBtn")}
                          >
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <Btn variant="soft" size="sm" onClick={() => publishPayslip(p)} disabled={publishingId === p.id}>
                            {publishingId === p.id ? "…" : t("owner.payslip.publishConfirmLabel")}
                          </Btn>
                          <button
                            onClick={() => deletePayslip(p)}
                            className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600 transition-colors"
                            title={t("owner.payslip.deleteTitle")}
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: GENERATE PAYSLIP (3 MODES) ─────────────────────────────────── */}
      <Modal
        open={showGenModal}
        onClose={() => setShowGenModal(false)}
        title={t("owner.payslip.generateModalTitle")}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowGenModal(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="primary" onClick={handleSavePayslip} disabled={savingSlip || netPreview < 0}>
              {savingSlip ? t("common.actions.saving") : t("owner.payslip.saveAsDraft")}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-line pb-2 gap-2">
            <button
              type="button"
              onClick={() => setGenMode("from_invoice")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                genMode === "from_invoice" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {t("owner.payslip.modeFromInvoice")}
            </button>
            <button
              type="button"
              onClick={() => setGenMode("manual_coach")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                genMode === "manual_coach" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {t("owner.payslip.modeManualCoach")}
            </button>
            <button
              type="button"
              onClick={() => setGenMode("manual_staff")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                genMode === "manual_staff" ? "bg-purple-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {t("owner.payslip.modeManualStaff")}
            </button>
          </div>

          {/* ── MODE 1: FROM INVOICE ── */}
          {genMode === "from_invoice" && (
            <div className="space-y-4">
              <Field label={t("owner.payslip.fieldInvoice")}>
                <Select value={genInvoiceId} onChange={(e) => handleGenInvoiceChange(e.target.value)}>
                  <option value="">{t("owner.payslip.selectInvoicePlaceholder")}</option>
                  {invoicesEligible.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.coach?.full_name ?? "—"} · {inv.period_label} · {fmtIDR(inv.total_amount)} ({inv.branch?.name ?? "—"})
                    </option>
                  ))}
                </Select>
              </Field>
              {invoicesEligible.length === 0 && (
                <p className="text-xs text-ink-mute">{t("owner.payslip.noEligibleInvoices")}</p>
              )}

              {genInvoiceId && (
                <>
                  <Field label={t("owner.payslip.fieldPeriod")}>
                    <Input
                      value={genPeriod}
                      onChange={(e) => setGenPeriod(e.target.value)}
                      placeholder={t("owner.payslip.fieldPeriodPlaceholder")}
                    />
                  </Field>
                  <Field label={t("owner.payslip.fieldGrossSalary")}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={genGross}
                      onChange={(e) => setGenGross(e.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                </>
              )}
            </div>
          )}

          {/* ── MODE 2: MANUAL COACH ── */}
          {genMode === "manual_coach" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("owner.payslip.fieldCoach")} required>
                  <Select value={manualCoachId} onChange={(e) => handleManualCoachChange(e.target.value)}>
                    <option value="">{t("owner.payslip.selectCoachPlaceholder")}</option>
                    {coachList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("owner.payslip.fieldBranch")} required>
                  <Select value={manualCoachBranchId} onChange={(e) => setManualCoachBranchId(e.target.value)}>
                    <option value="">{t("owner.payslip.selectBranchPlaceholder")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("owner.payslip.fieldPeriod")} required>
                  <Input
                    value={genPeriod}
                    onChange={(e) => setGenPeriod(e.target.value)}
                    placeholder={t("owner.payslip.fieldPeriodPlaceholder")}
                  />
                </Field>
                <Field label={t("owner.payslip.fieldGrossSalary")} required>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={manualCoachGross}
                    onChange={(e) => setManualCoachGross(e.target.value.replace(/\D/g, ""))}
                    placeholder="3.500.000"
                    className="font-mono"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ── MODE 3: MANUAL STAFF ── */}
          {genMode === "manual_staff" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("owner.payslip.fieldStaff")} required>
                  <Select value={manualStaffId} onChange={(e) => handleManualStaffChange(e.target.value)}>
                    <option value="">{t("owner.payslip.selectStaffPlaceholder")}</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("owner.payslip.fieldBranch")} required>
                  <Select value={manualStaffBranchId} onChange={(e) => setManualStaffBranchId(e.target.value)}>
                    <option value="">{t("owner.payslip.selectBranchPlaceholder")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label={t("owner.payslip.fieldPeriod")} required>
                <Input
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  placeholder="Contoh: September 2026 atau 2026-09"
                />
              </Field>

              {/* Attendance Calculator Widget */}
              <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <Icon name="checkCircle" className="w-3.5 h-3.5 text-purple-700" />
                    {t("owner.payslip.attendanceCalculator")}
                  </span>
                  <button
                    type="button"
                    onClick={checkStaffAttendance}
                    disabled={loadingStaffAttendance || !manualStaffId}
                    className="text-xs font-semibold text-purple-700 hover:underline"
                  >
                    {loadingStaffAttendance ? "Memeriksa…" : "Hitung Hari Masuk"}
                  </button>
                </div>
                {staffPresentDays !== null && (
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-semibold text-purple-900">
                      {t("owner.payslip.daysPresent", { count: staffPresentDays })}
                    </span>
                    <span>×</span>
                    <div className="w-36">
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={staffDailyRate}
                        onChange={(e) => setStaffDailyRate(e.target.value.replace(/\D/g, ""))}
                        placeholder={t("owner.payslip.dailyRatePlaceholder")}
                        className="text-xs font-mono"
                      />
                    </div>
                    <Btn variant="soft" size="sm" onClick={applyStaffAttendanceSalary} disabled={!staffDailyRate}>
                      {t("owner.payslip.applyAttendanceRate")}
                    </Btn>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <Field label={t("owner.payslip.fieldBaseSalary")} required>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={manualStaffBaseSalary}
                    onChange={(e) => setManualStaffBaseSalary(e.target.value.replace(/\D/g, ""))}
                    placeholder="3.000.000"
                    className="font-mono text-sm"
                  />
                </Field>
                <Field label={t("owner.payslip.fieldAllowances")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={manualStaffAllowances}
                    onChange={(e) => setManualStaffAllowances(e.target.value.replace(/\D/g, ""))}
                    placeholder="500.000"
                    className="font-mono text-sm"
                  />
                </Field>
                <Field label={t("owner.payslip.fieldReimbursements")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={manualStaffReimburse}
                    onChange={(e) => setManualStaffReimburse(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="font-mono text-sm"
                  />
                </Field>
              </div>

              <Field label={t("owner.payslip.fieldOtherDeduction")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manualStaffDeductions}
                  onChange={(e) => setManualStaffDeductions(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="font-mono text-sm"
                />
              </Field>
            </div>
          )}

          {/* ── DEDUCTIONS & LOANS FOR COACH MODES ── */}
          {(genMode === "from_invoice" ? genInvoiceId : genMode === "manual_coach" ? manualCoachId : false) && (
            <>
              {/* Tax Box */}
              <div className="border border-line rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t("owner.payslip.incomeTaxLabel")}</span>
                  {(genMode === "from_invoice" ? genTaxOverride : manualCoachTaxOverride) == null ? (
                    <button
                      type="button"
                      onClick={() =>
                        genMode === "from_invoice"
                          ? setGenTaxOverride(String(computedTaxForMode))
                          : setManualCoachTaxOverride(String(computedTaxForMode))
                      }
                      className="text-xs text-ocean-600 hover:underline flex items-center gap-1"
                    >
                      <Icon name="edit" className="w-3 h-3" /> {t("owner.payslip.editManually")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        genMode === "from_invoice" ? setGenTaxOverride(null) : setManualCoachTaxOverride(null)
                      }
                      className="text-xs text-ink-mute hover:underline"
                    >
                      {t("owner.payslip.useAutomatic")}
                    </button>
                  )}
                </div>
                {(genMode === "from_invoice" ? genTaxOverride : manualCoachTaxOverride) == null ? (
                  <div className="font-mono font-bold text-ink">{fmtIDR(computedTaxForMode)}</div>
                ) : (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={genMode === "from_invoice" ? genTaxOverride ?? "" : manualCoachTaxOverride ?? ""}
                    onChange={(e) =>
                      genMode === "from_invoice"
                        ? setGenTaxOverride(e.target.value.replace(/\D/g, ""))
                        : setManualCoachTaxOverride(e.target.value.replace(/\D/g, ""))
                    }
                    className="font-mono text-sm"
                  />
                )}
              </div>

              {/* Active Loans Installment Box */}
              {loadingLoans ? (
                <div className="text-sm text-ink-mute">{t("owner.payslip.checkingActiveLoans")}</div>
              ) : (
                genLoanCandidates.length > 0 && (
                  <div className="border border-line rounded-xl p-3.5 space-y-3">
                    <span className="text-sm font-semibold text-ink">{t("owner.payslip.loanInstallmentsLabel")}</span>
                    {genLoanCandidates.map((c) => (
                      <div key={c.loan.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!genLoanIncluded[c.loan.id]}
                          onChange={(e) =>
                            setGenLoanIncluded((prev) => ({ ...prev, [c.loan.id]: e.target.checked }))
                          }
                          className="w-4 h-4 rounded accent-ocean-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-ink-soft">
                            {t("owner.payslip.installmentOf", {
                              number: c.next.installmentNumber,
                              total: c.loan.tenor_months,
                              reason: c.loan.reason ? ` · ${c.loan.reason}` : "",
                            })}
                          </div>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={c.next.remainingBefore}
                            disabled={!genLoanIncluded[c.loan.id]}
                            value={genLoanAmounts[c.loan.id] ?? ""}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              const clamped = digits ? String(Math.min(Number(digits), c.next.remainingBefore)) : "";
                              setGenLoanAmounts((prev) => ({ ...prev, [c.loan.id]: clamped }));
                            }}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-ink-faint">{t("owner.payslip.skipInstallmentHint")}</p>
                  </div>
                )
              )}

              {/* Other Deductions */}
              <Field label={t("owner.payslip.fieldOtherDeduction")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={genMode === "from_invoice" ? genOtherDeduction : manualCoachOtherDeduction}
                  onChange={(e) =>
                    genMode === "from_invoice"
                      ? setGenOtherDeduction(e.target.value.replace(/\D/g, ""))
                      : setManualCoachOtherDeduction(e.target.value.replace(/\D/g, ""))
                  }
                  className="font-mono text-sm"
                />
              </Field>
            </>
          )}

          {/* ── Real-time Breakdown Summary Card ── */}
          {currentGross > 0 && (
            <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>{t("owner.payslip.grossSalaryLabel")}</span>
                <span className="font-mono font-semibold">{fmtIDR(currentGross)}</span>
              </div>
              {effectiveTaxForMode > 0 && (
                <div className="flex justify-between text-danger-700">
                  <span>{t("owner.payslip.taxLabel")}</span>
                  <span className="font-mono">- {fmtIDR(effectiveTaxForMode)}</span>
                </div>
              )}
              {includedLoanTotal > 0 && (
                <div className="flex justify-between text-danger-700">
                  <span>{t("owner.payslip.loanInstallmentLabel")}</span>
                  <span className="font-mono">- {fmtIDR(includedLoanTotal)}</span>
                </div>
              )}
              {otherDeductionAmount > 0 && (
                <div className="flex justify-between text-danger-700">
                  <span>{t("owner.payslip.otherDeductionLabel")}</span>
                  <span className="font-mono">- {fmtIDR(otherDeductionAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1.5 border-t border-line">
                <span className={netPreview < 0 ? "text-danger-700" : "text-ok-900"}>{t("owner.payslip.netSalaryLabel")}</span>
                <span className={`font-mono ${netPreview < 0 ? "text-danger-700" : "text-ok-700"}`}>{fmtIDR(netPreview)}</span>
              </div>
            </div>
          )}

          {netPreview < 0 && (
            <div className="flex items-center gap-2 text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
              <Icon name="warning" className="w-4 h-4 shrink-0" />
              Total potongan melebihi gaji kotor! Periksa kembali nilai potongan sebelum menyimpan.
            </div>
          )}

          <Field label={t("owner.payslip.fieldNotes")}>
            <Textarea
              value={genNotes}
              onChange={(e) => setGenNotes(e.target.value)}
              rows={2}
              placeholder={t("owner.payslip.fieldNotesPlaceholder")}
            />
          </Field>
        </div>
      </Modal>

      {/* ── MODAL: EDIT DRAFT PAYSLIP ─────────────────────────────────────────── */}
      <Modal
        open={!!editSlip}
        onClose={() => setEditSlip(null)}
        title={t("owner.payslip.editModalTitle")}
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setEditSlip(null)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="primary" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? t("common.actions.saving") : t("common.actions.save")}
            </Btn>
          </div>
        }
      >
        {editSlip && (
          <div className="space-y-4">
            <div className="bg-paper-tint rounded-xl p-3 text-xs flex justify-between">
              <span className="font-semibold text-ink">{editSlip.coach?.full_name ?? "—"}</span>
              <span className="text-ink-mute">{editSlip.branch?.name ?? "—"}</span>
            </div>

            <Field label={t("owner.payslip.fieldPeriod")} required>
              <Input value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)} />
            </Field>

            <Field label={t("owner.payslip.fieldGrossSalary")} required>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={editGross}
                onChange={(e) => setEditGross(e.target.value.replace(/\D/g, ""))}
                className="font-mono text-sm"
              />
            </Field>

            {/* Deductions Editor */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider">Potongan</div>
              {editDeductions.map((d, idx) => (
                <div key={d.id || idx} className="flex items-center gap-2">
                  <Input
                    value={d.label}
                    onChange={(e) => {
                      const next = [...editDeductions];
                      next[idx].label = e.target.value;
                      setEditDeductions(next);
                    }}
                    placeholder="Nama Potongan"
                    className="text-xs"
                  />
                  <div className="w-36">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={d.amount}
                      onChange={(e) => {
                        const next = [...editDeductions];
                        next[idx].amount = Number(e.target.value.replace(/\D/g, ""));
                        setEditDeductions(next);
                      }}
                      className="text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditDeductions(editDeductions.filter((_, i) => i !== idx))}
                    className="w-7 h-7 rounded-lg text-danger-500 hover:bg-danger-50 flex items-center justify-center shrink-0"
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Btn
                variant="outline"
                size="sm"
                icon="plus"
                onClick={() =>
                  setEditDeductions([...editDeductions, { id: `temp-${Date.now()}`, label: "Potongan Lain", amount: 0, type: "other" }])
                }
              >
                Tambah Baris Potongan
              </Btn>
            </div>

            <Field label={t("owner.payslip.fieldNotes")}>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
            </Field>
          </div>
        )}
      </Modal>

      {/* ── MODAL: VIEW / PRINT SLIP GAJI ────────────────────────────────────── */}
      <Modal
        open={!!viewSlip}
        onClose={() => setViewSlip(null)}
        title={t("owner.payslip.detailModalTitle")}
        size="md"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Btn variant="ghost" icon="print" onClick={() => viewSlip && printPayslip(viewSlip)}>
              {t("common.actions.print")}
            </Btn>
            <Btn variant="ghost" onClick={() => setViewSlip(null)}>
              {t("common.actions.close")}
            </Btn>
          </div>
        }
      >
        {viewSlip && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                  {t("owner.payslip.detailCoach")}
                </div>
                <div className="font-semibold text-ink-strong">{viewSlip.coach?.full_name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                  {t("owner.payslip.detailBranch")}
                </div>
                <div className="font-semibold text-ink">{viewSlip.branch?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                  {t("owner.payslip.detailPeriod")}
                </div>
                <div className="text-ink">{viewSlip.period_label}</div>
              </div>
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                  {t("owner.payslip.detailStatus")}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    viewSlip.status === "published" ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"
                  }`}
                >
                  {viewSlip.status === "published" ? t("owner.payslip.statusPublished") : t("owner.payslip.statusDraft")}
                </span>
              </div>
              {viewSlip.published_at && (
                <div className="col-span-2">
                  <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                    {t("owner.payslip.publishedAt")}
                  </div>
                  <div className="text-ink-soft">
                    {new Date(viewSlip.published_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-line pt-4 space-y-2">
              <div className="flex justify-between py-2 border-b border-line text-sm">
                <span>{t("owner.payslip.grossSalaryLabel")}</span>
                <span className="font-mono font-semibold text-ink">{fmtIDR(viewSlip.gross_amount)}</span>
              </div>
              {loadingViewDeductions ? (
                <div className="text-sm text-ink-mute py-2">{t("owner.payslip.loadingDeductions")}</div>
              ) : viewDeductions.length > 0 ? (
                viewDeductions.map((d) => (
                  <div key={d.id} className="flex justify-between py-2 border-b border-line text-sm text-danger-700">
                    <span>{d.label}</span>
                    <span className="font-mono">- {fmtIDR(d.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between py-2 border-b border-line text-sm text-danger-700">
                  <span>{t("owner.payslip.deductionsFallbackLabel")}</span>
                  <span className="font-mono">- {fmtIDR(viewSlip.deductions)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-base font-bold">
                <span>{t("owner.payslip.netSalaryLabel")}</span>
                <span className="font-mono text-ok-700">{fmtIDR(viewSlip.net_amount)}</span>
              </div>
            </div>

            {viewSlip.notes && (
              <div className="bg-paper-tint rounded-xl p-3 text-sm text-ink-mute">{viewSlip.notes}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
