"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import { Field, Textarea } from "@/components/ui/FormFields";
import ProofViewer from "@/components/ui/ProofViewer";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { PayslipHook } from "./index";

export default function InvoiceDetailModal({ hook }: { hook: PayslipHook }) {
  const { t } = useLocale();
  const {
    invoiceDetail, setInvoiceDetail, printInvoice, approveInvoice, approvingId,
    setRejectModal, rejectModal, rejectReason, setRejectReason, rejectingId, rejectInvoice,
  } = hook;

  return (
    <>
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
    </>
  );
}
