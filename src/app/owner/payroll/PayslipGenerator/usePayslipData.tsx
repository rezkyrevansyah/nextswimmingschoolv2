"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { parsePeriodToMonth } from "../../_utils";
import type { Branch } from "../../_types";
import type { CoachInvoiceRow, OwnerPayslipRow, PayslipDeductionRow, ProfileOption, UnifiedPayslipItem } from "./_types";

export function usePayslipData({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
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

  // ── Coach invoices (approve/reject/generate) ────────────────────────────────
  const [coachInvoices, setCoachInvoices] = useState<CoachInvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [unapprovingId, setUnapprovingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<CoachInvoiceRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [invoiceDetail, setInvoiceDetail] = useState<CoachInvoiceRow | null>(null);

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
    if (error) return toast.error("Failed to approve", error.message);
    const inv = coachInvoices.find((i) => i.id === id);
    setCoachInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "approved", approved_at: new Date().toISOString() } : i)));
    if (invoiceDetail?.id === id) setInvoiceDetail((prev) => (prev ? { ...prev, status: "approved" } : prev));
    if (inv?.coach?.id) {
      await supabase.from("notifications").insert({
        user_id: inv.coach.id,
        title: "Invoice approved",
        body: `Invoice ${inv.invoice_number} (${inv.period_label}) has been approved. Awaiting payment.`,
        icon: "check",
        kind: "success",
      });
    }
    toast.success("Invoice approved");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: id,
      entityLabel: inv?.invoice_number ?? id, action: "update",
      label: `Invoice ${inv?.invoice_number ?? id} approved`,
    });
  };

  const rejectInvoice = async (id: string, reason: string) => {
    if (!reason.trim()) return toast.error("Enter a rejection reason");
    setRejectingId(id);
    const { error } = await supabase.from("coach_invoices").update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason.trim() }).eq("id", id);
    setRejectingId(null);
    if (error) return toast.error("Failed to reject", error.message);
    const inv = coachInvoices.find((i) => i.id === id);
    setCoachInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "rejected", rejection_reason: reason } : i)));
    if (invoiceDetail?.id === id) setInvoiceDetail((prev) => (prev ? { ...prev, status: "rejected", rejection_reason: reason } : prev));
    if (inv?.coach?.id) {
      await supabase.from("notifications").insert({
        user_id: inv.coach.id,
        title: "Invoice rejected",
        body: `Invoice ${inv.invoice_number} (${inv.period_label}) was rejected. Reason: ${reason}`,
        icon: "warning",
        kind: "warn",
      });
    }
    setRejectModal(null);
    setRejectReason("");
    toast.success("Invoice rejected");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: id,
      entityLabel: inv?.invoice_number ?? id, action: "update",
      label: `Invoice ${inv?.invoice_number ?? id} rejected: ${reason}`,
    });
  };

  const unapproveInvoice = async (inv: CoachInvoiceRow) => {
    const ok = await confirm({
      title: "Undo Invoice Approval?",
      body: (<><NoTranslate>{inv.coach?.full_name ?? "coach"}</NoTranslate>{"'s invoice will return to \"Awaiting Review\" status so it can be reviewed again."}</>),
      confirmLabel: "Yes, Undo",
      danger: true,
    });
    if (!ok) return;
    setUnapprovingId(inv.id);
    const { error } = await supabase.from("coach_invoices").update({ status: "pending", approved_at: null }).eq("id", inv.id);
    setUnapprovingId(null);
    if (error) return toast.error("Failed to undo approval", error.message);
    setCoachInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: "pending", approved_at: null } : i)));
    if (inv.coach?.id) {
      await supabase.from("notifications").insert({
        user_id: inv.coach.id,
        title: "Invoice approval undone",
        body: `Your invoice ${inv.invoice_number} (${inv.period_label}) approval was undone by the owner and is back under review.`,
        icon: "warning",
        kind: "warn",
      });
    }
    toast.success("Approval undone");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_invoices", entityId: inv.id,
      entityLabel: inv.invoice_number, action: "update",
      label: `Approval undone for invoice ${inv.invoice_number}`,
    });
  };

  const printInvoice = (iv: CoachInvoiceRow) => {
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    const itemMap: Record<string, { name: string; sessions: number; rate: number }> = {};
    (iv.coach_invoice_items ?? []).forEach((item) => {
      const key = item.item_type === "class" ? (item.class_id ?? item.id) : item.id;
      const label = item.item_type === "extra" ? "Extra Session"
        : item.item_type === "reimburse" ? `Reimburse — ${item.description ?? ""}`
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
      <h1>${"Coach Invoice"}</h1>
      <div class="sub">${iv.invoice_number} &nbsp;·&nbsp; <span class="badge">${iv.status === "paid" ? "Paid" : "Pending"}</span></div>
      <div class="section">${"Information"}</div>
      <div class="meta"><b>${"Period"}:</b> ${iv.period_label}<br/><b>${"Coach"}:</b> ${iv.coach?.full_name ?? "—"}<br/><b>${"Center"}:</b> ${iv.branch?.name ?? "—"}<br/><b>${"Bank Account"}:</b> ${iv.bank_info ?? "—"}${iv.paid_at ? `<br/><b>${"Paid"}:</b> ${new Date(iv.paid_at).toLocaleDateString("id-ID", { dateStyle: "long" })}` : ""}</div>
      <div class="section">${"Class Breakdown"}</div>
      ${itemRows || `<div class="row"><span style="color:#94a3b8">${"No breakdown"}</span></div>`}
      <div class="total"><span>${"Total"}</span><span>Rp ${iv.total_amount.toLocaleString("id-ID")}</span></div>
      <footer>${`Next Swimming School · Printed ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`}</footer>
      </body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  // Approved coach invoices with no payslip generated yet — eligible for "Generate Payslip"
  const invoicesEligible = useMemo(() => {
    const usedInvoiceIds = new Set(payslips.map((p) => p.invoice_id).filter(Boolean));
    return coachInvoices.filter((i) => i.status === "approved" && !usedInvoiceIds.has(i.id));
  }, [coachInvoices, payslips]);

  // ── Unified Payslip Item Model ──────────────────────────────────────────────
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

  return {
    supabase, toast, branches, userId, userName,
    payslips, setPayslips, loadingPayslips, loadPayslips,
    coachList, staffList,
    search, setSearch, branchFilter, setBranchFilter, roleFilter, setRoleFilter,
    workflowStatusFilter, setWorkflowStatusFilter, monthFilter, setMonthFilter,
    coachInvoices, setCoachInvoices, loadingInvoices, loadInvoices,
    approvingId, rejectingId, unapprovingId,
    rejectModal, setRejectModal, rejectReason, setRejectReason,
    invoiceDetail, setInvoiceDetail,
    approveInvoice, rejectInvoice, unapproveInvoice, printInvoice,
    invoicesEligible, unifiedPayslipItems, filteredUnifiedItems, summaryCounts,
  };
}
