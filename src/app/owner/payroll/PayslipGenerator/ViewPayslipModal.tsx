"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import ProofViewer from "@/components/ui/ProofViewer";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { PayslipHook } from "./index";

export default function ViewPayslipModal({ hook }: { hook: PayslipHook }) {
  const { t, tNode } = useLocale();
  const {
    viewSlip, setViewSlip, viewDeductions, loadingViewDeductions, printPayslip,
    coachInvoices, setInvoiceDetail,
  } = hook;

  return (
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
  );
}
