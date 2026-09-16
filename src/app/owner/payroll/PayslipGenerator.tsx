"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { printPayslip as printPayslipUtil } from "@/lib/printPayslip";
import ProofViewer from "@/components/ui/ProofViewer";
import { NoTranslate } from "@/components/ui/NoTranslate";
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

interface InvoiceItemDetail {
  id: string;
  item_type: string;
  class_id: string | null;
  session_count: number;
  rate: number;
  description: string | null;
  proof_url: string | null;
  class?: { name: string } | null;
}

interface CoachInvoiceRow {
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
  payslip_deductions?: PayslipDeductionRow[];
}

interface PayslipDeductionRow {
  id: string;
  type: string;
  label: string;
  amount: number;
}

export function parsePeriodToMonth(period: string): string {
  const trimmed = period.trim();
  const directMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (directMatch) return trimmed;

  const months: Record<string, string> = {
    januari: "01", january: "01", jan: "01",
    februari: "02", february: "02", feb: "02",
    maret: "03", march: "03", mar: "03",
    april: "04", apr: "04",
    mei: "05", may: "05",
    juni: "06", june: "06", jun: "06",
    juli: "07", july: "07", jul: "07",
    agustus: "08", august: "08", aug: "08",
    september: "09", sep: "09", sept: "09",
    oktober: "10", october: "10", okt: "10", oct: "10",
    november: "11", nov: "11",
    desember: "12", december: "12", des: "12", dec: "12",
  };

  const lower = trimmed.toLowerCase();
  for (const [name, mm] of Object.entries(months)) {
    if (lower.includes(name)) {
      const yearMatch = lower.match(/\b(20\d\d)\b/);
      const yyyy = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      return `${yyyy}-${mm}`;
    }
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayslipGenerator({
  branches,
  userId,
  userName,
}: {
  branches: Branch[];
  userId: string;
  userName: string;
}) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [payslips, setPayslips] = useState<OwnerPayslipRow[]>([]);
  const [loadingPayslips, setLoadingPayslips] = useState(true);

  // Profiles for coach & staff selection
  const [coachList, setCoachList] = useState<ProfileOption[]>([]);
  const [staffList, setStaffList] = useState<ProfileOption[]>([]);

  // ── Unified Filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "coach" | "staff">("all");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [showTaxModal, setShowTaxModal] = useState(false);

  // ── Coach invoices (approve/reject/generate) ────────────────────────────────
  const [coachInvoices, setCoachInvoices] = useState<CoachInvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [unapprovingId, setUnapprovingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<CoachInvoiceRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [invoiceDetail, setInvoiceDetail] = useState<CoachInvoiceRow | null>(null);

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
    setShowTaxModal(false);
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
        "id, coach_id, branch_id, invoice_id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, published_by, created_at, coach:profiles!payslips_coach_id_fkey(id, full_name, role, avatar_url), branch:branches(id, name), payslip_deductions(id, type, label, amount)"
      )
      .order("created_at", { ascending: false });
    if (data) setPayslips(data as unknown as OwnerPayslipRow[]);
    setLoadingPayslips(false);
  }, [supabase]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    const { data } = await supabase
      .from("coach_invoices")
      .select(
        "id, invoice_number, period_label, total_amount, status, bank_info, branch_id, submitted_at, paid_at, approved_at, rejected_at, rejection_reason, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(id, full_name, role), coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))"
      )
      .not("status", "eq", "cancelled")
      .order("submitted_at", { ascending: false });
    if (data) setCoachInvoices(data as unknown as CoachInvoiceRow[]);
    setLoadingInvoices(false);
  }, [supabase]);

  useEffect(() => {
    loadProfiles();
    loadPayslips();
    loadInvoices();
  }, [loadProfiles, loadPayslips, loadInvoices]);

  // ── Approve / Reject / Un-approve (coach invoices) ──────────────────────────
  const approveInvoice = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase.from("coach_invoices").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    setApprovingId(null);
    if (error) return toast.error(t("owner.invoices.approveFailed"), error.message);
    const inv = coachInvoices.find((i) => i.id === id);
    setCoachInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "approved", approved_at: new Date().toISOString() } : i)));
    if (invoiceDetail?.id === id) setInvoiceDetail((prev) => (prev ? { ...prev, status: "approved" } : prev));
    if (inv?.coach?.id) {
      await supabase.from("notifications").insert({
        user_id: inv.coach.id,
        title: t("owner.invoices.notifApprovedTitle"),
        body: t("owner.invoices.notifApprovedBody", { number: inv.invoice_number, period: inv.period_label }),
        icon: "check",
        kind: "success",
      });
    }
    toast.success(t("owner.invoices.approved"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: id,
      entityLabel: inv?.invoice_number ?? id, action: "update",
      label: t("owner.invoices.activityApproved", { number: inv?.invoice_number ?? id }),
    });
  };

  const rejectInvoice = async (id: string, reason: string) => {
    if (!reason.trim()) return toast.error(t("owner.invoices.reasonRequired"));
    setRejectingId(id);
    const { error } = await supabase.from("coach_invoices").update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason.trim() }).eq("id", id);
    setRejectingId(null);
    if (error) return toast.error(t("owner.invoices.rejectFailed"), error.message);
    const inv = coachInvoices.find((i) => i.id === id);
    setCoachInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "rejected", rejection_reason: reason } : i)));
    if (invoiceDetail?.id === id) setInvoiceDetail((prev) => (prev ? { ...prev, status: "rejected", rejection_reason: reason } : prev));
    if (inv?.coach?.id) {
      await supabase.from("notifications").insert({
        user_id: inv.coach.id,
        title: t("owner.invoices.notifRejectedTitle"),
        body: t("owner.invoices.notifRejectedBody", { number: inv.invoice_number, period: inv.period_label, reason }),
        icon: "warning",
        kind: "warn",
      });
    }
    setRejectModal(null);
    setRejectReason("");
    toast.success(t("owner.invoices.rejected"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: id,
      entityLabel: inv?.invoice_number ?? id, action: "update",
      label: t("owner.invoices.activityRejected", { number: inv?.invoice_number ?? id, reason }),
    });
  };

  const unapproveInvoice = async (inv: CoachInvoiceRow) => {
    const ok = await confirm({
      title: t("owner.payslip.unapproveConfirmTitle"),
      body: tNode("owner.payslip.unapproveConfirmBody", { coach: inv.coach?.full_name ?? "coach" }),
      confirmLabel: t("owner.payslip.unapproveConfirmLabel"),
      danger: true,
    });
    if (!ok) return;
    setUnapprovingId(inv.id);
    const { error } = await supabase.from("coach_invoices").update({ status: "pending", approved_at: null }).eq("id", inv.id);
    setUnapprovingId(null);
    if (error) return toast.error(t("owner.payslip.unapproveFailed"), error.message);
    setCoachInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: "pending", approved_at: null } : i)));
    if (inv.coach?.id) {
      await supabase.from("notifications").insert({
        user_id: inv.coach.id,
        title: t("owner.payslip.notifUnapprovedTitle"),
        body: t("owner.payslip.notifUnapprovedBody", { number: inv.invoice_number, period: inv.period_label }),
        icon: "warning",
        kind: "warn",
      });
    }
    toast.success(t("owner.payslip.unapproved"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: inv.id,
      entityLabel: inv.invoice_number, action: "update",
      label: t("owner.payslip.activityUnapproved", { number: inv.invoice_number }),
    });
  };

  const printInvoice = (iv: CoachInvoiceRow) => {
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    const itemMap: Record<string, { name: string; sessions: number; rate: number }> = {};
    (iv.coach_invoice_items ?? []).forEach((item) => {
      const key = item.item_type === "class" ? (item.class_id ?? item.id) : item.id;
      const label = item.item_type === "extra" ? t("owner.invoices.printItemExtra")
        : item.item_type === "reimburse" ? t("owner.invoices.printItemReimburse", { description: item.description ?? "" })
        : (item.class?.name ?? item.class_id ?? "—");
      if (!itemMap[key]) itemMap[key] = { name: label, sessions: 0, rate: item.rate };
      itemMap[key].sessions += item.session_count;
    });
    const itemRows = Object.values(itemMap).map((item) =>
      `<div class="row"><span>${item.name}</span><span>${item.sessions} sesi × Rp ${item.rate.toLocaleString("id-ID")} = <b>Rp ${(item.sessions * item.rate).toLocaleString("id-ID")}</b></span></div>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>${iv.invoice_number}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#0f172a;max-width:640px;margin:auto}
      h1{font-size:22px;font-weight:700;margin-bottom:2px}.sub{font-size:13px;color:#64748b;margin-bottom:20px}
      .section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:20px 0 6px}
      .meta{background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.8}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
      .total{display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:4px}
      .badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${iv.status === "paid" ? "#dcfce7" : "#fef9c3"};color:${iv.status === "paid" ? "#166534" : "#854d0e"}}
      footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
      </style></head><body>
      <h1>${t("owner.invoices.printHeading")}</h1>
      <div class="sub">${iv.invoice_number} &nbsp;·&nbsp; <span class="badge">${iv.status === "paid" ? t("owner.invoices.printStatusPaid") : t("owner.invoices.printStatusPending")}</span></div>
      <div class="section">${t("owner.invoices.printInfoSectionTitle")}</div>
      <div class="meta"><b>${t("owner.invoices.printPeriodLabel")}:</b> ${iv.period_label}<br/><b>${t("owner.invoices.printCoachLabel")}:</b> ${iv.coach?.full_name ?? "—"}<br/><b>${t("owner.invoices.printBranchLabel")}:</b> ${iv.branch?.name ?? "—"}<br/><b>${t("owner.invoices.printBankLabel")}:</b> ${iv.bank_info ?? "—"}${iv.paid_at ? `<br/><b>${t("owner.invoices.printPaidLabel")}:</b> ${new Date(iv.paid_at).toLocaleDateString("id-ID", { dateStyle: "long" })}` : ""}</div>
      <div class="section">${t("owner.invoices.printItemsSectionTitle")}</div>
      ${itemRows || `<div class="row"><span style="color:#94a3b8">${t("owner.invoices.printNoItems")}</span></div>`}
      <div class="total"><span>${t("owner.invoices.printTotalLabel")}</span><span>Rp ${iv.total_amount.toLocaleString("id-ID")}</span></div>
      <footer>${t("owner.invoices.printFooter", { date: new Date().toLocaleDateString("id-ID", { dateStyle: "long" }) })}</footer>
      </body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  // Approved coach invoices with no payslip generated yet — eligible for "Generate Payslip"
  const invoicesEligible = useMemo(() => {
    const usedInvoiceIds = new Set(payslips.map((p) => p.invoice_id).filter(Boolean));
    return coachInvoices.filter((i) => i.status === "approved" && !usedInvoiceIds.has(i.id));
  }, [coachInvoices, payslips]);

  // ── Unified Payslip Item Model ──────────────────────────────────────────────
  interface UnifiedPayslipItem {
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

  const unifiedPayslipItems = useMemo<UnifiedPayslipItem[]>(() => {
    const items: UnifiedPayslipItem[] = [];
    const handledPayslipIds = new Set<string>();

    // 1. From coach invoices (Coach & Staff invoices)
    for (const inv of coachInvoices) {
      const isStaff = inv.coach?.role === "staff";
      const matchingSlip = payslips.find((p) => p.invoice_id === inv.id);
      if (matchingSlip) handledPayslipIds.add(matchingSlip.id);

      let workflowStatus: UnifiedPayslipItem["workflowStatus"] = "pending";
      if (matchingSlip) {
        workflowStatus = matchingSlip.status === "published" ? "published" : "draft";
      } else if (inv.status === "rejected") {
        workflowStatus = "rejected";
      } else if (inv.status === "approved") {
        workflowStatus = "approved";
      } else {
        workflowStatus = "pending";
      }

      const deductionsList: PayslipDeductionRow[] = matchingSlip?.payslip_deductions ?? [];
      const taxAmount = deductionsList.filter((d: PayslipDeductionRow) => d.type === "tax").reduce((s: number, d: PayslipDeductionRow) => s + d.amount, 0);
      const loanDeduction = deductionsList.filter((d: PayslipDeductionRow) => d.type === "loan").reduce((s: number, d: PayslipDeductionRow) => s + d.amount, 0);
      const otherDeds = deductionsList.filter((d: PayslipDeductionRow) => d.type !== "tax" && d.type !== "loan").reduce((s: number, d: PayslipDeductionRow) => s + d.amount, 0);
      const otherDeductions = otherDeds > 0 ? otherDeds : Math.max(0, (matchingSlip?.deductions ?? 0) - taxAmount - loanDeduction);

      const grossAmount = matchingSlip ? matchingSlip.gross_amount : inv.total_amount;
      const netAmount = matchingSlip ? matchingSlip.net_amount : Math.max(0, grossAmount - taxAmount - loanDeduction - otherDeductions);

      const sessionItems = (inv.coach_invoice_items ?? []).filter((it) => it.item_type === "session" || it.item_type === "extra");
      const sessionCount = sessionItems.reduce((s, it) => s + it.session_count, 0);

      const manualItem = (inv.coach_invoice_items ?? []).find((it) => it.item_type === "manual_fee" || it.description);
      const invoiceDesc = manualItem?.description?.trim();
      const slipNotes = matchingSlip?.notes?.trim();

      const title = sessionCount > 0
        ? `Teaching Fee (${sessionCount} Sessions)`
        : slipNotes
        ? slipNotes
        : invoiceDesc
        ? invoiceDesc
        : isStaff
        ? "Staff Salary Submission"
        : "Coach Honor / Fee";

      items.push({
        id: `inv_${inv.id}`,
        role: isStaff ? "staff" : "coach",
        recipientId: inv.coach?.id ?? "",
        recipientName: inv.coach?.full_name ?? (isStaff ? "Staff" : "Coach"),
        avatarLetter: (inv.coach?.full_name ?? (isStaff ? "S" : "C")).charAt(0).toUpperCase(),
        branchId: inv.branch_id ?? "",
        branchName: inv.branch?.name ?? "Center",
        title,
        periodLabel: inv.period_label,
        referenceNo: inv.invoice_number,
        grossAmount,
        taxAmount,
        loanDeduction,
        otherDeductions,
        netAmount,
        workflowStatus,
        rawInvoice: inv,
        rawPayslip: matchingSlip ?? null,
      });
    }

    // 2. Standalone Payslips (manual payslips with no invoice_id)
    for (const p of payslips) {
      if (handledPayslipIds.has(p.id)) continue;
      const isStaff = p.coach?.role === "staff";
      const deductionsList: PayslipDeductionRow[] = p.payslip_deductions ?? [];
      const taxAmount = deductionsList.filter((d: PayslipDeductionRow) => d.type === "tax").reduce((s: number, d: PayslipDeductionRow) => s + d.amount, 0);
      const loanDeduction = deductionsList.filter((d: PayslipDeductionRow) => d.type === "loan").reduce((s: number, d: PayslipDeductionRow) => s + d.amount, 0);
      const otherDeds = deductionsList.filter((d: PayslipDeductionRow) => d.type !== "tax" && d.type !== "loan").reduce((s: number, d: PayslipDeductionRow) => s + d.amount, 0);
      const otherDeductions = otherDeds > 0 ? otherDeds : Math.max(0, p.deductions - taxAmount - loanDeduction);
      const netAmount = p.net_amount;

      items.push({
        id: `slip_${p.id}`,
        role: isStaff ? "staff" : "coach",
        recipientId: p.coach_id,
        recipientName: p.coach?.full_name ?? (isStaff ? "Staff" : "Coach"),
        avatarLetter: (p.coach?.full_name ?? (isStaff ? "S" : "C")).charAt(0).toUpperCase(),
        branchId: p.branch_id,
        branchName: p.branch?.name ?? "Center",
        title: p.notes?.trim() ? p.notes.trim() : isStaff ? "Staff Salary & Allowance Payslip" : "Coach Payslip (Manual)",
        periodLabel: p.period_label,
        referenceNo: `SLIP-${p.id.slice(0, 8).toUpperCase()}`,
        grossAmount: p.gross_amount,
        taxAmount,
        loanDeduction,
        otherDeductions,
        netAmount,
        workflowStatus: p.status === "published" ? "published" : "draft",
        rawInvoice: null,
        rawPayslip: p,
      });
    }

    // Sort order: pending -> approved -> draft -> published -> rejected
    const rank = { pending: 1, approved: 2, draft: 3, published: 4, rejected: 5 };
    return items.sort((a, b) => {
      if (rank[a.workflowStatus] !== rank[b.workflowStatus]) {
        return rank[a.workflowStatus] - rank[b.workflowStatus];
      }
      return b.id.localeCompare(a.id);
    });
  }, [coachInvoices, payslips]);

  const filteredUnifiedItems = useMemo(() => {
    return unifiedPayslipItems.filter((item) => {
      if (branchFilter !== "all" && item.branchId !== branchFilter) return false;
      if (roleFilter !== "all" && item.role !== roleFilter) return false;
      if (workflowStatusFilter !== "all" && item.workflowStatus !== workflowStatusFilter) return false;
      if (monthFilter && item.periodLabel) {
        const itemMonth = parsePeriodToMonth(item.periodLabel);
        if (itemMonth && itemMonth !== monthFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.recipientName.toLowerCase().includes(q);
        const matchRef = item.referenceNo.toLowerCase().includes(q);
        const matchBranch = item.branchName.toLowerCase().includes(q);
        const matchPeriod = item.periodLabel.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchBranch && !matchPeriod && !matchTitle) return false;
      }
      return true;
    });
  }, [unifiedPayslipItems, branchFilter, roleFilter, workflowStatusFilter, monthFilter, search]);

  const summaryCounts = useMemo(() => {
    return {
      pending: unifiedPayslipItems.filter((i) => i.workflowStatus === "pending").length,
      approved: unifiedPayslipItems.filter((i) => i.workflowStatus === "approved").length,
      draft: unifiedPayslipItems.filter((i) => i.workflowStatus === "draft").length,
      published: unifiedPayslipItems.filter((i) => i.workflowStatus === "published").length,
    };
  }, [unifiedPayslipItems]);

  // ── Generate Modal State ──────────────────────────────────────────────────────
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMode, setGenMode] = useState<"from_invoice" | "manual_coach" | "manual_staff">("manual_coach");
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

      const defaultNotes = (inv.coach_invoice_items ?? [])
        .map((it) => it.description?.trim())
        .filter(Boolean)
        .join(", ");

      const result = await generatePayslip(supabase, {
        coach_id: inv.coach.id,
        branch_id: inv.branch_id ?? branches[0]?.id ?? "",
        invoice_id: genInvoiceId,
        period_label: genPeriod.trim(),
        gross_amount: currentGross,
        deductions,
        notes: genNotes.trim() || defaultNotes || null,
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
        return toast.error(t("owner.payslip.invoiceCreateFailed"), invError?.message);
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
        notes: finalCoachNotes,
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
        label: `Manual payslip & invoice created for ${coach?.full_name} period ${genPeriod.trim()}`,
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
            staff_id: manualStaffId,
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
          meta: { overridden: manualStaffTaxOverride != null },
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
        notes: finalStaffNotes,
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
        label: `Staff payslip created for ${staff?.full_name} period ${genPeriod.trim()}`,
      });
    }

    setShowGenModal(false);
    resetGenForm();
    loadPayslips();
    loadInvoices();
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
    const { data } = await supabase.from("payslip_deductions").select("id, type, label, amount, loan_id, loan_payment_id, meta").eq("payslip_id", p.id);
    setEditDeductions((data as any[]) ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editSlip) return;
    setSavingEdit(true);

    const deductions: DeductionInput[] = editDeductions.map((d: any) => ({
      type: (d.type as any) || "other",
      label: d.label,
      amount: Number(d.amount || 0),
      loan_id: d.loan_id ?? undefined,
      installment_number: d.installment_number ?? d.meta?.installment_number ?? undefined,
      period_label: editPeriod.trim(),
      meta: d.meta ?? undefined,
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
      label: `Update draft payslip for ${editSlip.coach?.full_name ?? ""} period ${editPeriod.trim()}`,
    });

    setEditSlip(null);
    loadPayslips();
  };

  // ── PUBLISH & DELETE ─────────────────────────────────────────────────────────
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const publishPayslip = async (p: OwnerPayslipRow) => {
    const ok = await confirm({
      title: t("owner.payslip.publishConfirmTitle"),
      body: tNode("owner.payslip.publishConfirmBody", { coach: p.coach?.full_name ?? "recipient", period: p.period_label }),
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
      if (p.invoice_id) {
        // Any invoice-driven payslip — coach or staff (including a staff self-invoice
        // from the attendance/manual flow) — the invoice is the source of truth here,
        // so publishing the payslip is the real "money sent" event: mark it paid.
        // Without this, invoices created by the "manual coach fee" generator mode
        // (which inserts them directly at status "approved") never reach "paid" and
        // are permanently invisible to the Financial tab's expense totals.
        await supabase
          .from("coach_invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", p.invoice_id)
          .neq("status", "paid");
        setCoachInvoices((prev) =>
          prev.map((i) => (i.id === p.invoice_id ? { ...i, status: "paid", paid_at: new Date().toISOString() } : i))
        );
      } else if (p.coach?.role === "staff") {
        // manual_staff mode — no invoice involved, staff_salaries is the source of
        // truth for that period. Scoped to both staff_id AND period (not just
        // staff_id) so publishing one period's payslip doesn't retroactively mark
        // every other period "paid" as well.
        const monthPeriod = parsePeriodToMonth(p.period_label);
        await supabase
          .from("staff_salaries")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("staff_id", p.coach_id)
          .eq("period_month", monthPeriod);
      }
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

  return (
    <div className="space-y-6">

      {/* ── HEADER & ACTIONS ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">
            {t("owner.payslip.pageTitle") || "Staff Payroll & Payslips"}
          </h2>
          <p className="text-xs text-ink-mute mt-0.5">
            Manage invoice verification, salary approvals, loan deductions, and official payslip generation for Coaches & Staff.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="soft" icon="settings" onClick={() => setShowTaxModal(true)}>
            Tax Settings (PPh 21)
          </Btn>
          <Btn variant="primary" icon="plus" onClick={() => openGenerateManual("manual_coach")}>
            + Manual Entry
          </Btn>
        </div>
      </div>

      {/* ── 4 SUMMARY STAT CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">{t("owner.payslip.statPendingLabel")}</div>
          <div className="text-2xl font-bold font-mono text-warn-600">{summaryCounts.pending}</div>
          <div className="text-xs text-ink-faint">{t("owner.payslip.statPendingSub")}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">{t("owner.payslip.statReadyLabel")}</div>
          <div className="text-2xl font-bold font-mono text-ocean-700">{summaryCounts.approved}</div>
          <div className="text-xs text-ink-faint">{t("owner.payslip.statReadySub")}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">{t("owner.payslip.statDraftLabel")}</div>
          <div className="text-2xl font-bold font-mono text-purple-700">{summaryCounts.draft}</div>
          <div className="text-xs text-ink-faint">{t("owner.payslip.statDraftSub")}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">{t("owner.payslip.statPublishedStatLabel")}</div>
          <div className="text-2xl font-bold font-mono text-ok-700">{summaryCounts.published}</div>
          <div className="text-xs text-ink-faint">{t("owner.payslip.statPublishedSub")}</div>
        </div>
      </div>

      {/* ── UNIFIED TABLE & TOOLBAR ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("owner.payslip.searchUnifiedPlaceholder")}
              className="pl-9 text-sm"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500"
            />
            {monthFilter && (
              <button
                type="button"
                onClick={() => setMonthFilter("")}
                className="px-2 py-2 text-xs font-medium text-ink-mute hover:text-ink bg-paper-tint rounded-xl hover:bg-paper-deep transition-colors"
                title={t("owner.payslip.showAllPeriodsTitle")}
              >
                {t("owner.payslip.allPeriodsBtn")}
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="!w-44 shrink-0">
            <option value="all">{t("owner.payslip.filterAllCenters")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="!w-44 shrink-0">
            <option value="all">{t("owner.payslip.filterAllRoles")}</option>
            <option value="coach">{t("owner.payslip.filterCoachOnly")}</option>
            <option value="staff">{t("owner.payslip.filterStaffOnly")}</option>
          </Select>

          {/* Status Filter */}
          <Select value={workflowStatusFilter} onChange={(e) => setWorkflowStatusFilter(e.target.value)} className="!w-48 shrink-0">
            <option value="all">{t("owner.payslip.filterAllStatus")}</option>
            <option value="pending">{t("owner.payslip.statusPendingReview")}</option>
            <option value="approved">{t("owner.payslip.statusReadyToGenerate")}</option>
            <option value="draft">{t("owner.payslip.statusDraftSlip")}</option>
            <option value="published">{t("owner.payslip.statusPublishedPaid")}</option>
            <option value="rejected">{t("owner.payslip.statusRejected")}</option>
          </Select>
        </div>

        {/* Unified Table Card */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-xs">
          {loadingInvoices || loadingPayslips ? (
            <div className="p-12 text-center text-ink-mute text-sm">{t("owner.payslip.loadingUnified")}</div>
          ) : filteredUnifiedItems.length === 0 ? (
            <div className="p-12 text-center text-ink-mute text-sm space-y-2">
              <Icon name="invoice" className="w-8 h-8 mx-auto text-ink-faint" />
              <div>No payslips or invoices match the filter.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-paper-tint border-b border-line text-xs font-bold text-ink-mute uppercase tracking-wider">
                    <th className="py-3 px-4">Penerima & Role</th>
                    <th className="py-3 px-4">Description & Reference</th>
                    <th className="py-3 px-4 text-right">Bruto</th>
                    <th className="py-3 px-4 text-right">Tax (PPh 21)</th>
                    <th className="py-3 px-4 text-right text-purple-700">Pot. Kasbon</th>
                    <th className="py-3 px-4 text-right">Pot. Lain</th>
                    <th className="py-3 px-4 text-right text-ocean-800">Transfer Riil (Net)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {filteredUnifiedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-paper-tint/60 transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.rawPayslip && item.workflowStatus === "published") {
                          openViewSlip(item.rawPayslip);
                        } else if (item.rawInvoice) {
                          setInvoiceDetail(item.rawInvoice);
                        } else if (item.rawPayslip) {
                          openEditSlip(item.rawPayslip);
                        }
                      }}
                    >
                      {/* Penerima & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={item.recipientName} size={34} />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-ink"><NoTranslate>{item.recipientName}</NoTranslate></span>
                              {item.role === "coach" ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-ocean-50 text-ocean-700 border border-ocean-200">
                                  Coach
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                  Staff
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{item.branchName}</NoTranslate></div>
                          </div>
                        </div>
                      </td>

                      {/* Keterangan & Referensi */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-xs text-ink"><NoTranslate>{item.title}</NoTranslate></div>
                        <div className="text-xs text-ink-mute flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-ocean-700 font-medium"><NoTranslate>{item.referenceNo}</NoTranslate></span>
                          <span>·</span>
                          <span><NoTranslate>{item.periodLabel}</NoTranslate></span>
                        </div>
                        {item.workflowStatus === "rejected" && item.rawInvoice?.rejection_reason && (
                          <div className="text-xs text-danger-600 mt-0.5 flex items-center gap-1">
                            <Icon name="warning" className="w-3 h-3 shrink-0" />
                            <span><NoTranslate>{item.rawInvoice.rejection_reason}</NoTranslate></span>
                          </div>
                        )}
                      </td>

                      {/* Bruto */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-ink">
                        {fmtIDR(item.grossAmount)}
                      </td>

                      {/* PPh 21 */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {item.taxAmount > 0 ? (
                          <span className="text-warn-700 font-semibold">- {fmtIDR(item.taxAmount)}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Pot. Kasbon */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {item.loanDeduction > 0 ? (
                          <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                            - {fmtIDR(item.loanDeduction)}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Pot. Lain */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {item.otherDeductions > 0 ? (
                          <span className="text-danger-700 font-semibold">- {fmtIDR(item.otherDeductions)}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Net */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-extrabold text-sm text-ocean-900 bg-ocean-50/70 border border-ocean-200/50 px-2 py-1 rounded-lg inline-block">
                          {fmtIDR(item.netAmount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Status
                          kind={
                            item.workflowStatus === "published"
                              ? "paid"
                              : item.workflowStatus === "rejected"
                              ? "rejected"
                              : item.workflowStatus === "pending"
                              ? "pending"
                              : item.workflowStatus === "draft"
                              ? "active"
                              : "approved"
                          }
                        >
                          {item.workflowStatus === "published"
                            ? t("owner.payslip.statusPublishedPaid")
                            : item.workflowStatus === "rejected"
                            ? t("owner.payslip.statusRejected")
                            : item.workflowStatus === "pending"
                            ? t("owner.payslip.statusPendingReview")
                            : item.workflowStatus === "draft"
                            ? t("owner.payslip.statusDraftSlip")
                            : t("owner.payslip.statusReadyToGenerate")}
                        </Status>
                      </td>

                      {/* Aksi Kontekstual */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Case 1: Pending */}
                          {item.workflowStatus === "pending" && item.rawInvoice && (
                            <>
                              <Btn
                                variant="soft"
                                size="sm"
                                onClick={() => approveInvoice(item.rawInvoice!.id)}
                                disabled={approvingId === item.rawInvoice.id}
                              >
                                {approvingId === item.rawInvoice.id ? "…" : t("owner.payslip.approveBtn")}
                              </Btn>
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRejectModal(item.rawInvoice!);
                                  setRejectReason("");
                                }}
                              >
                                {t("owner.payslip.rejectBtn")}
                              </Btn>
                              <button
                                type="button"
                                onClick={() => setInvoiceDetail(item.rawInvoice!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={t("owner.payslip.viewBreakdownTitle")}
                              >
                                <Icon name="eye" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 2: Approved (Siap Buat Slip) */}
                          {item.workflowStatus === "approved" && item.rawInvoice && (
                            <>
                              <Btn
                                variant="primary"
                                size="sm"
                                onClick={() => openGenerateForInvoice(item.rawInvoice!)}
                              >
                                {t("owner.payslip.generatePayslip")}
                              </Btn>
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() => unapproveInvoice(item.rawInvoice!)}
                                disabled={unapprovingId === item.rawInvoice.id}
                                title={t("owner.payslip.unapproveBtn")}
                              >
                                {unapprovingId === item.rawInvoice.id ? "…" : <Icon name="undo" className="w-3.5 h-3.5" />}
                              </Btn>
                              <button
                                type="button"
                                onClick={() => setInvoiceDetail(item.rawInvoice!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={t("owner.payslip.viewDetailsTitle")}
                              >
                                <Icon name="eye" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 3: Draft Slip */}
                          {item.workflowStatus === "draft" && item.rawPayslip && (
                            <>
                              <Btn
                                variant="soft"
                                size="sm"
                                onClick={() => publishPayslip(item.rawPayslip!)}
                                disabled={publishingId === item.rawPayslip.id}
                              >
                                {publishingId === item.rawPayslip.id ? "…" : t("owner.payslip.publishBtn")}
                              </Btn>
                              <button
                                type="button"
                                onClick={() => openEditSlip(item.rawPayslip!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={t("owner.payslip.editDraftSlipTitle")}
                              >
                                <Icon name="edit" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePayslip(item.rawPayslip!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600 transition-colors"
                                title={t("owner.payslip.deleteDraftSlipTitle")}
                              >
                                <Icon name="trash" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 4: Published (Resmi / Lunas) */}
                          {item.workflowStatus === "published" && item.rawPayslip && (
                            <>
                              <button
                                type="button"
                                onClick={() => printPayslip(item.rawPayslip!)}
                                className="px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-paper-tint text-xs font-semibold text-ink-mute hover:text-ocean-700 flex items-center gap-1.5 transition-colors"
                                title={t("owner.payslip.printPayslipTitle")}
                              >
                                <Icon name="print" className="w-3.5 h-3.5" />
                                <span>{t("owner.payslip.printBtn")}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openViewSlip(item.rawPayslip!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={t("owner.payslip.viewPayslipBreakdownTitle")}
                              >
                                <Icon name="eye" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 5: Rejected */}
                          {item.workflowStatus === "rejected" && item.rawInvoice && (
                            <button
                              type="button"
                              onClick={() => setInvoiceDetail(item.rawInvoice!)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100 flex items-center gap-1 transition-colors"
                            >
                              <Icon name="warning" className="w-3 h-3" />
                              <span>{t("owner.payslip.reasonBtn")}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: TAX SETTINGS (PPh 21) ──────────────────────────────────────── */}
      <Modal
        open={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        title={t("owner.payslip.taxSettingsTitle")}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowTaxModal(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="primary" onClick={saveTaxSetting} disabled={savingTax}>
              {savingTax ? t("owner.payslip.savingLabel") : t("owner.payslip.saveSettingsBtn")}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-mute">
            {t("owner.payslip.taxSettingsModalSub")}
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaxMode("percent")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  taxMode === "percent" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
                }`}
              >
                {t("owner.payslip.taxModePercent")}
              </button>
              <button
                type="button"
                onClick={() => setTaxMode("fixed")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  taxMode === "fixed" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
                }`}
              >
                {t("owner.payslip.taxModeFixed")}
              </button>
            </div>
            <div>
              {taxMode === "percent" ? (
                <Field label={t("owner.payslip.fieldTaxPercentageRate")}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.01"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    placeholder={t("owner.payslip.fieldTaxPercentagePlaceholder")}
                    className="font-mono text-sm"
                  />
                </Field>
              ) : (
                <Field label={t("owner.payslip.fieldTaxFixedAmount")}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={taxFixed ? Number(taxFixed).toLocaleString("id-ID") : ""}
                    onChange={(e) => setTaxFixed(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("owner.payslip.fieldTaxFixedPlaceholder")}
                    className="font-mono text-sm"
                  />
                </Field>
              )}
            </div>
          </div>
        </div>
      </Modal>

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
          {/* Mode Switcher Tabs — hidden when generating from a locked invoice row */}
          {!modalLockedInvoice && (
            <div className="flex border-b border-line pb-2 gap-2">
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
          )}

          {/* ── MODE 1: FROM INVOICE (row-initiated, always locked) ── */}
          {genMode === "from_invoice" && modalLockedInvoice && (
            <div className="space-y-4">
              <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 text-sm">
                <div className="text-xs text-ink-mute font-bold uppercase tracking-widest mb-1">{t("owner.payslip.lockedInvoiceLabel")}</div>
                <div className="font-mono font-semibold text-ink"><NoTranslate>{modalLockedInvoice.invoice_number}</NoTranslate></div>
                <div className="text-xs text-ink-mute"><NoTranslate>{modalLockedInvoice.coach?.full_name}</NoTranslate> · <NoTranslate>{modalLockedInvoice.period_label}</NoTranslate> · {fmtIDR(modalLockedInvoice.total_amount)}</div>
              </div>

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

              <Field label={t("owner.payslip.fieldDescription")} hint="Salary purpose or description">
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder={t("owner.payslip.fieldDescriptionPlaceholderCoach")}
                />
              </Field>
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

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("owner.payslip.fieldPeriod")} required>
                  <Input
                    value={genPeriod}
                    onChange={(e) => setGenPeriod(e.target.value)}
                    placeholder={t("owner.payslip.periodFreeformPlaceholder")}
                  />
                </Field>
                <Field label={t("owner.payslip.fieldDescription")} hint="Salary purpose or description">
                  <Input
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder={t("owner.payslip.fieldDescriptionPlaceholderStaff")}
                  />
                </Field>
              </div>

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
                    {loadingStaffAttendance ? t("owner.payslip.calculating") : t("owner.payslip.attendanceCheckBtn")}
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

          {/* ── DEDUCTIONS & LOANS ── */}
          {(genMode === "from_invoice" ? !!genInvoiceId : genMode === "manual_coach" ? !!manualCoachId : !!manualStaffId) && (
            <>
              {/* Tax Box */}
              <div className="border border-line rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t("owner.payslip.incomeTaxLabel")}</span>
                  {(genMode === "from_invoice" ? genTaxOverride : genMode === "manual_coach" ? manualCoachTaxOverride : manualStaffTaxOverride) == null ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (genMode === "from_invoice") setGenTaxOverride(String(computedTaxForMode));
                        else if (genMode === "manual_coach") setManualCoachTaxOverride(String(computedTaxForMode));
                        else setManualStaffTaxOverride(String(computedTaxForMode));
                      }}
                      className="text-xs text-ocean-600 hover:underline flex items-center gap-1"
                    >
                      <Icon name="edit" className="w-3 h-3" /> {t("owner.payslip.editManually")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (genMode === "from_invoice") setGenTaxOverride(null);
                        else if (genMode === "manual_coach") setManualCoachTaxOverride(null);
                        else setManualStaffTaxOverride(null);
                      }}
                      className="text-xs text-ink-mute hover:underline"
                    >
                      {t("owner.payslip.useAutomatic")}
                    </button>
                  )}
                </div>
                {(genMode === "from_invoice" ? genTaxOverride : genMode === "manual_coach" ? manualCoachTaxOverride : manualStaffTaxOverride) == null ? (
                  <div className="font-mono font-bold text-ink">{fmtIDR(computedTaxForMode)}</div>
                ) : (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={genMode === "from_invoice" ? genTaxOverride ?? "" : genMode === "manual_coach" ? manualCoachTaxOverride ?? "" : manualStaffTaxOverride ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (genMode === "from_invoice") setGenTaxOverride(v);
                      else if (genMode === "manual_coach") setManualCoachTaxOverride(v);
                      else setManualStaffTaxOverride(v);
                    }}
                    className="font-mono text-sm"
                  />
                )}
              </div>

              {/* Active Loans Installment Box (Coach & Staff) */}
              {loadingLoans ? (
                <div className="text-sm text-ink-mute">{t("owner.payslip.checkingActiveLoans")}</div>
              ) : (
                genLoanCandidates.length > 0 && (
                  <div className="border border-line rounded-xl p-3.5 space-y-3 bg-paper-tint/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{t("owner.payslip.loanInstallmentsLabel")}</span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {t("owner.payslip.activeLoanDeductions")}
                      </span>
                    </div>
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
                          <div className="text-xs text-ink-soft font-medium">
                            {tNode("owner.payslip.installmentOf", {
                              number: c.next.installmentNumber,
                              total: c.loan.tenor_months,
                              reason: c.loan.reason ? ` · ${c.loan.reason}` : "",
                            })}
                          </div>
                          <div className="text-[11px] text-ink-faint font-mono">
                            {t("owner.payslip.remainingLabel")}: {fmtIDR(c.next.remainingBefore)}
                          </div>
                        </div>
                        <div className="w-28">
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

              {/* Other Deductions (Coach only, staff has it above) */}
              {genMode !== "manual_staff" && (
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
              )}
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
              {t("owner.payslip.excessDeductionsWarning")}
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

      {/* ── MODAL: INVOICE DETAIL ─────────────────────────────────────────────── */}
      <Modal open={!!invoiceDetail} onClose={() => setInvoiceDetail(null)} title={invoiceDetail?.invoice_number ?? t("owner.invoices.detailModalTitle")} size="md"
        footer={
          <div className="flex items-center gap-2 justify-between w-full">
            <Btn variant="ghost" icon="print" onClick={() => invoiceDetail && printInvoice(invoiceDetail)}>{t("owner.invoices.printBtn")}</Btn>
            <div className="flex gap-2">
              {invoiceDetail?.status === "pending" && (
                <>
                  <Btn variant="primary" onClick={() => invoiceDetail && approveInvoice(invoiceDetail.id)} disabled={approvingId === invoiceDetail?.id}>
                    {approvingId === invoiceDetail?.id ? "…" : t("owner.invoices.approveBtn")}
                  </Btn>
                  <Btn variant="ghost" onClick={() => { setRejectModal(invoiceDetail); setInvoiceDetail(null); }}>{t("owner.invoices.rejectBtn")}</Btn>
                </>
              )}
              <Btn variant="ghost" onClick={() => setInvoiceDetail(null)}>{t("owner.invoices.closeBtn")}</Btn>
            </div>
          </div>
        }>
        {invoiceDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.metaCoach")}</div><div className="font-semibold"><NoTranslate>{invoiceDetail.coach?.full_name ?? "—"}</NoTranslate></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.metaBranch")}</div><div className="font-semibold"><NoTranslate>{invoiceDetail.branch?.name ?? "—"}</NoTranslate></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.metaPeriod")}</div><div><NoTranslate>{invoiceDetail.period_label}</NoTranslate></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.metaStatus")}</div><Status kind={invoiceDetail.status === "paid" ? "paid" : invoiceDetail.status === "approved" ? "approved" : invoiceDetail.status === "rejected" ? "rejected" : "pending"}>{invoiceDetail.status === "paid" ? t("owner.invoices.statusPaid") : invoiceDetail.status === "approved" ? t("owner.invoices.statusApproved") : invoiceDetail.status === "rejected" ? t("owner.invoices.statusRejected") : t("owner.invoices.statusPending")}</Status></div>
              <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.metaBankInfo")}</div><div className="font-mono text-sm"><NoTranslate>{invoiceDetail.bank_info ?? "—"}</NoTranslate></div></div>
              {invoiceDetail.rejection_reason && (
                <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.fieldRejectReason")}</div><div className="text-sm text-danger-600"><NoTranslate>{invoiceDetail.rejection_reason}</NoTranslate></div></div>
              )}
              {invoiceDetail.paid_at && <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.invoices.metaPaidAt")}</div><div>{new Date(invoiceDetail.paid_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</div></div>}
            </div>

            <div className="border-t border-line pt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{t("owner.invoices.itemsBreakdownTitle")}</div>
              {(invoiceDetail.coach_invoice_items ?? []).length === 0 ? (
                <p className="text-sm text-ink-mute">{t("owner.invoices.itemsEmpty")}</p>
              ) : (
                <div className="space-y-1.5">
                  {(() => {
                    const map: Record<string, { name: string; sessions: number; rate: number; proofUrl: string | null }> = {};
                    (invoiceDetail.coach_invoice_items ?? []).forEach(item => {
                      const key = item.item_type === "class" ? (item.class_id ?? item.id) : item.id;
                      const label = item.item_type === "manual_fee"
                        ? (item.description || t("owner.payslip.manualHonorFallback"))
                        : item.item_type === "extra"
                        ? t("owner.invoices.printItemExtra")
                        : item.item_type === "reimburse"
                        ? t("owner.invoices.printItemReimburse", { description: item.description ?? "" })
                        : (item.class?.name ?? item.class_id ?? (item.description || "—"));
                      if (!map[key]) map[key] = { name: label, sessions: 0, rate: item.rate, proofUrl: item.proof_url };
                      map[key].sessions += item.session_count;
                    });
                    return Object.values(map).map((item, i) => (
                      <div key={i} className="py-2.5 border-b border-line text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-ink"><NoTranslate>{item.name}</NoTranslate></div>
                            <div className="text-xs text-ink-mute">{t("owner.payslip.sessionsTimesRate", { count: item.sessions, rate: fmtIDR(item.rate) })}</div>
                          </div>
                          <div className="font-mono font-bold">{fmtIDR(item.sessions * item.rate)}</div>
                        </div>
                        {item.proofUrl && (
                          <div className="mt-2 bg-paper-tint/60 p-2.5 rounded-xl border border-line/70">
                            <div className="text-[11px] font-bold text-ink-mute uppercase tracking-wider mb-1">
                              {t("owner.payslip.submissionProofAttachment")}
                            </div>
                            <ProofViewer proofUrl={item.proofUrl} label={item.name} size="md" />
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                  <div className="flex items-center justify-between pt-2 font-bold text-sm">
                    <span>{t("owner.invoices.totalLabel")}</span>
                    <span className="font-mono text-ocean-700 text-base">{fmtIDR(invoiceDetail.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: REJECT INVOICE ─────────────────────────────────────────────── */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(""); }} title={t("owner.invoices.rejectModalTitle")} size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setRejectModal(null); setRejectReason(""); }}>{t("common.actions.cancel")}</Btn>
            <Btn variant="danger" onClick={() => rejectModal && rejectInvoice(rejectModal.id, rejectReason)} disabled={!!rejectingId}>
              {rejectingId ? t("owner.invoices.rejecting") : t("owner.invoices.rejectConfirmBtn")}
            </Btn>
          </>
        }>
        {rejectModal && (
          <div className="space-y-4">
            <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 text-sm">
              <div className="text-xs text-ink-mute font-bold uppercase tracking-widest mb-1">{t("owner.invoices.rejectModalInvoiceLabel")}</div>
              <div className="font-mono font-semibold text-ink"><NoTranslate>{rejectModal.invoice_number}</NoTranslate></div>
              <div className="text-xs text-ink-mute"><NoTranslate>{rejectModal.coach?.full_name}</NoTranslate> · <NoTranslate>{rejectModal.period_label}</NoTranslate> · {fmtIDR(rejectModal.total_amount)}</div>
            </div>
            <Field label={t("owner.invoices.fieldRejectReason")}>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={t("owner.invoices.fieldRejectReasonPlaceholder")} rows={3} />
            </Field>
          </div>
        )}
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
              <span className="font-semibold text-ink"><NoTranslate>{editSlip.coach?.full_name ?? "—"}</NoTranslate></span>
              <span className="text-ink-mute"><NoTranslate>{editSlip.branch?.name ?? "—"}</NoTranslate></span>
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
              <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider">{t("owner.payslip.deductionHeader")}</div>
              {editDeductions.map((d, idx) => (
                <div key={d.id || idx} className="flex items-center gap-2">
                  <Input
                    value={d.label}
                    onChange={(e) => {
                      const next = [...editDeductions];
                      next[idx].label = e.target.value;
                      setEditDeductions(next);
                    }}
                    placeholder={t("owner.payslip.deductionNamePlaceholder")}
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
                  setEditDeductions([...editDeductions, { id: `temp-${Date.now()}`, label: t("owner.payslip.otherDeductionsLabel"), amount: 0, type: "other" }])
                }
              >
                {t("owner.payslip.addDeductionRowBtn")}
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
                <div className="font-semibold text-ink-strong"><NoTranslate>{viewSlip.coach?.full_name ?? "—"}</NoTranslate></div>
              </div>
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                  {t("owner.payslip.detailBranch")}
                </div>
                <div className="font-semibold text-ink"><NoTranslate>{viewSlip.branch?.name ?? "—"}</NoTranslate></div>
              </div>
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">
                  {t("owner.payslip.detailPeriod")}
                </div>
                <div className="text-ink"><NoTranslate>{viewSlip.period_label}</NoTranslate></div>
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

            {(() => {
              const linkedInv = viewSlip.invoice_id
                ? coachInvoices.find((inv) => inv.id === viewSlip.invoice_id)
                : null;
              const items = linkedInv?.coach_invoice_items ?? [];
              const effectiveNotes = viewSlip.notes?.trim() || items.map((it) => it.description?.trim()).filter(Boolean).join(", ");

              return (
                <div className="space-y-3 pt-2">
                  {effectiveNotes && (
                    <div className="bg-paper-tint rounded-xl p-3 border border-line text-sm">
                      <div className="text-[11px] font-bold text-ink-mute uppercase tracking-wider mb-1">
                        {t("owner.payslip.descriptionNotes")}
                      </div>
                      <div className="text-ink font-semibold"><NoTranslate>{effectiveNotes}</NoTranslate></div>
                    </div>
                  )}

                  {linkedInv && items.length > 0 && (
                    <div className="border border-line rounded-xl overflow-hidden">
                      <div className="bg-paper-tint/80 px-3 py-2 text-xs font-bold text-ink-mute uppercase tracking-wider border-b border-line flex items-center justify-between">
                        <span>{tNode("owner.payslip.submissionBreakdown", { number: linkedInv.invoice_number })}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceDetail(linkedInv);
                            setViewSlip(null);
                          }}
                          className="text-ocean-600 hover:text-ocean-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5" />
                          <span>{t("owner.payslip.openFullModal")}</span>
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {items.map((it) => (
                          <div key={it.id} className="text-xs pb-2 last:pb-0 border-b last:border-0 border-line/60">
                            <div className="flex items-center justify-between font-semibold text-ink">
                              <NoTranslate as="span">
                                {it.description?.trim() ||
                                  (it.item_type === "manual_fee"
                                    ? t("owner.payslip.staffBaseSalaryHonor")
                                    : it.class?.name || it.item_type)}
                              </NoTranslate>
                              <span className="font-mono">{fmtIDR(it.session_count * it.rate)}</span>
                            </div>
                            <div className="text-ink-mute text-[11px] mt-0.5">
                              {t("owner.payslip.sessionsTimesRate", { count: it.session_count, rate: fmtIDR(it.rate) })}
                            </div>
                            {it.proof_url && (
                              <div className="mt-2">
                                <ProofViewer proofUrl={it.proof_url} label={it.description || t("owner.payslip.submissionProof")} size="sm" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
