"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { fmtIDR } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import type { StaffProfile } from "../_types";

interface StaffInvoiceItem {
  id: string;
  item_type: string;
  session_count: number;
  rate: number;
  description: string | null;
  proof_url: string | null;
}

interface StaffPastInvoice {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  rejection_reason?: string | null;
  coach_invoice_items?: StaffInvoiceItem[];
}

export default function StaffInvoice({ staffId, branchId, profile }: { staffId: string; branchId: string; profile: StaffProfile | null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();

  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [manualDescription, setManualDescription] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pastInvoices, setPastInvoices] = useState<StaffPastInvoice[]>([]);

  const load = useCallback(async () => {
    const { data: inv } = await supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, rejection_reason, coach_invoice_items(id, item_type, session_count, rate, description, proof_url)")
      .eq("coach_id", staffId)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false });
    setPastInvoices((inv as unknown as StaffPastInvoice[]) ?? []);
  }, [supabase, staffId]);

  useEffect(() => { load(); }, [load]);

  const requireOpenPeriod = async () => {
    const { data: periodRows } = await supabase
      .from("invoice_periods")
      .select("id")
      .eq("is_open", true)
      .order("date_to", { ascending: true })
      .limit(1);
    return periodRows?.[0]?.id ?? null;
  };

  const bankInfoSnapshot = () =>
    profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null;

  const notifyOwners = async (invoiceNumber: string, periodLabel: string, total: number) => {
    const { data: ownerProfiles } = await supabase.from("profiles").select("id").eq("branch_id", branchId).eq("role", "owner");
    if (ownerProfiles && ownerProfiles.length > 0) {
      await supabase.from("notifications").insert(ownerProfiles.map((op) => ({
        user_id: op.id,
        title: "New staff invoice",
        body: `${profile?.full_name ?? "Staff"} submitted invoice ${invoiceNumber} for ${periodLabel} (${fmtIDR(total)})`,
        icon: "invoice",
        kind: "info",
      })));
    }
  };

  const submitManual = async () => {
    if (!manualDescription.trim()) return toast.error("Description is required");
    const amountNum = Number(manualAmount);
    if (!amountNum || amountNum <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    const activePeriodId = await requireOpenPeriod();
    if (!activePeriodId) {
      setSubmitting(false);
      return toast.error("Reimbursement submission is closed", "Currently there is no open submission period from management.");
    }

    let proofUrl: string | undefined;
    if (manualProofFile) {
      try {
        proofUrl = await upload.paymentProof(manualProofFile, `staff-inv-${staffId}-${Date.now()}`) ?? undefined;
      } catch (err) {
        setSubmitting(false);
        return toast.error("Failed to upload proof", err instanceof Error ? err.message : undefined);
      }
    }

    const invoiceNumber = `INV-S-${Date.now().toString(36).toUpperCase()}`;
    const periodLabel = period;
    const { data: inv, error: invError } = await supabase.from("coach_invoices").insert({
      coach_id: staffId,
      branch_id: branchId,
      invoice_number: invoiceNumber,
      period_label: periodLabel,
      period_id: activePeriodId,
      total_amount: amountNum,
      bank_info: bankInfoSnapshot(),
      status: "pending",
    }).select("id").single();

    if (invError || !inv) {
      setSubmitting(false);
      return toast.error("Failed to submit invoice", invError?.message);
    }

    await supabase.from("coach_invoice_items").insert({
      invoice_id: inv.id,
      item_type: "manual_fee",
      session_count: 1,
      rate: amountNum,
      description: manualDescription.trim(),
      proof_url: proofUrl ?? null,
    });

    await notifyOwners(invoiceNumber, periodLabel, amountNum);
    setSubmitting(false);
    toast.success("Invoice submitted successfully", "Awaiting review from the owner");
    setManualDescription("");
    setManualAmount("");
    setManualProofFile(null);
    load();
  };

  const cancelInvoice = async (invoiceId: string) => {
    const ok = await confirm({
      title: "Cancel Invoice?",
      body: "Cancelled invoice cannot be restored. You can submit a new invoice afterwards.",
      confirmLabel: "Yes, cancel",
      danger: true,
    });
    if (!ok) return;
    setCancelling(invoiceId);
    const { error } = await supabase.rpc("cancel_coach_invoice", { p_invoice_id: invoiceId, p_coach_id: staffId });
    setCancelling(null);
    if (error) return toast.error("Failed to cancel invoice", error.message);
    toast.success("Invoice cancelled");
    load();
  };

  return (
    <Card className="space-y-4">
      <SectionTitle sub={"Submit your invoice to be reviewed and approved by the owner. Can be edited and resubmitted if rejected."}>{"My Invoice"}</SectionTitle>

      <div className="space-y-3">
        <Field label={"Period"}>
          <div className="w-48">
            <MonthYearPicker value={period} onChange={setPeriod} />
          </div>
        </Field>

        <Field label={"Description"} required>
          <Input
            value={manualDescription}
            onChange={e => setManualDescription(e.target.value)}
            placeholder={"E.g.: Base salary, incentive, meal allowance, etc."}
          />
        </Field>

        <Field label={"Amount (Rp)"} required>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={manualAmount}
            onChange={e => setManualAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="Contoh: 3000000"
            className="font-mono"
          />
        </Field>

        <Field label={"Proof (optional)"}>
          <input
            type="file"
            accept="image/*"
            onChange={e => setManualProofFile(e.target.files?.[0] ?? null)}
            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer"
          />
        </Field>

        <Btn variant="primary" onClick={submitManual} disabled={submitting || uploading}>
          {submitting || uploading ? "Submitting…" : "Submit Invoice"}
        </Btn>
      </div>

      <div className="pt-4 border-t border-line space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{"Invoice History"}</div>
        {pastInvoices.length === 0 ? (
          <p className="text-sm text-ink-mute">{"No invoices yet."}</p>
        ) : (
          pastInvoices.map(iv => (
            <div key={iv.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-ocean-700"><NoTranslate>{iv.invoice_number}</NoTranslate></span>
                  <Status kind={iv.status === "paid" ? "paid" : iv.status === "approved" ? "approved" : iv.status === "rejected" ? "rejected" : "pending"}>
                    {iv.status === "paid" ? "Paid" : iv.status === "approved" ? "Approved" : iv.status === "rejected" ? "Rejected" : "Awaiting Review"}
                  </Status>
                </div>
                <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{iv.period_label}</NoTranslate></div>
                {iv.status === "rejected" && iv.rejection_reason && (
                  <div className="text-xs text-danger-500 mt-0.5 flex items-center gap-1">
                    <Icon name="warning" className="w-3 h-3" /><NoTranslate>{iv.rejection_reason}</NoTranslate>
                  </div>
                )}
              </div>
              <div className="font-mono font-bold text-sm shrink-0">{fmtIDR(iv.total_amount)}</div>
              {(iv.status === "pending" || iv.status === "rejected") && (
                <button
                  title={"Cancel invoice"}
                  onClick={() => cancelInvoice(iv.id)}
                  disabled={cancelling === iv.id}
                  className="w-8 h-8 rounded-lg border border-danger-200 hover:bg-danger-50 flex items-center justify-center text-danger-400 hover:text-danger-600 transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
