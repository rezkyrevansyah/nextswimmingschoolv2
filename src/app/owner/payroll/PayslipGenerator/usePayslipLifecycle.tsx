"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { printPayslip as printPayslipUtil } from "@/lib/printPayslip";
import { logActivity } from "@/lib/activityLog";
import {
  updatePayslip,
  publishPayslipWithLoanClosure,
  deletePayslipCascade,
  type DeductionInput,
} from "@/lib/payroll";
import { parsePeriodToMonth } from "../../_utils";
import type { CoachInvoiceRow, OwnerPayslipRow, PayslipDeductionRow } from "./_types";

interface PayslipDeductionEditRow {
  id: string;
  type: string;
  label: string;
  amount: number;
  loan_id?: string | null;
  installment_number?: number | null;
  meta?: Record<string, unknown> | null;
}

export function usePayslipLifecycle({
  userId,
  userName,
  loadPayslips,
  setPayslips,
  setCoachInvoices,
}: {
  userId: string;
  userName: string;
  loadPayslips: () => void;
  setPayslips: Dispatch<SetStateAction<OwnerPayslipRow[]>>;
  setCoachInvoices: Dispatch<SetStateAction<CoachInvoiceRow[]>>;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  // ── EDIT MODAL STATE ─────────────────────────────────────────────────────────
  const [editSlip, setEditSlip] = useState<OwnerPayslipRow | null>(null);
  const [editPeriod, setEditPeriod] = useState("");
  const [editGross, setEditGross] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDeductions, setEditDeductions] = useState<PayslipDeductionEditRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditSlip = async (p: OwnerPayslipRow) => {
    setEditSlip(p);
    setEditPeriod(p.period_label);
    setEditGross(String(p.gross_amount));
    setEditNotes(p.notes ?? "");
    const { data } = await supabase.from("payslip_deductions").select("id, type, label, amount, loan_id, loan_payment_id, meta").eq("payslip_id", p.id);
    setEditDeductions((data as PayslipDeductionEditRow[]) ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editSlip) return;
    setSavingEdit(true);

    const deductions: DeductionInput[] = editDeductions.map((d) => ({
      type: (d.type as DeductionInput["type"]) || "other",
      label: d.label,
      amount: Number(d.amount || 0),
      loan_id: d.loan_id ?? undefined,
      installment_number: d.installment_number ?? (d.meta?.installment_number as number | undefined) ?? undefined,
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

    toast.success("Payslip updated successfully");
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
      title: "Publish Payslip?",
      body: (<><NoTranslate>{p.coach?.full_name ?? "recipient"}</NoTranslate>{"'s payslip for period "}<NoTranslate>{p.period_label}</NoTranslate>{" will be published and visible to the coach."}</>),
      confirmLabel: "Publish",
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

    if (error) return toast.error("Failed to publish", error.message);
    toast.success("Payslip published");
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      branchId: p.branch_id,
      entityType: "payslips",
      entityId: p.id,
      entityLabel: p.coach?.full_name ?? undefined,
      action: "publish",
      label: `${p.coach?.full_name ?? "recipient"}'s payslip for period ${p.period_label} published`,
      meta: { net_amount: p.net_amount },
    });
    setPayslips((prev) =>
      prev.map((s) => (s.id === p.id ? { ...s, status: "published", published_at: new Date().toISOString() } : s))
    );
  };

  const deletePayslip = async (p: OwnerPayslipRow) => {
    const ok = await confirm({
      title: "Delete Payslip?",
      body: "This draft payslip will be deleted, including any loan installments already recorded on it (they will be recalculated when a new slip is created).",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const cascadeError = await deletePayslipCascade(supabase, p.id);
    if (cascadeError) return toast.error("Failed to delete", cascadeError.error);

    toast.success("Payslip deleted");
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      branchId: p.branch_id,
      entityType: "payslips",
      entityId: p.id,
      entityLabel: p.coach?.full_name ?? undefined,
      action: "delete",
      label: `Draft payslip for ${p.coach?.full_name ?? "recipient"} period ${p.period_label} deleted`,
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

  return {
    editSlip, setEditSlip, editPeriod, setEditPeriod, editGross, setEditGross,
    editNotes, setEditNotes, editDeductions, setEditDeductions, savingEdit,
    openEditSlip, handleSaveEdit,
    publishingId, publishPayslip, deletePayslip, printPayslip,
    viewSlip, setViewSlip, viewDeductions, loadingViewDeductions, openViewSlip,
  };
}
