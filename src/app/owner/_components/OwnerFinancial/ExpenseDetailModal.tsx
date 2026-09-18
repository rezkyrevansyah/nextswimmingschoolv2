"use client";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import ProofViewer from "@/components/ui/ProofViewer";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { FinancialHook } from "./index";

export default function ExpenseDetailModal({ hook }: { hook: FinancialHook }) {
  const { selectedExpenseDetail, setSelectedExpenseDetail, copyToClipboard } = hook;

  if (!selectedExpenseDetail) return null;
  const d = selectedExpenseDetail;
  const items = d.rawInvoice?.coach_invoice_items ?? [];

  return (
    <Modal
      open={!!selectedExpenseDetail}
      onClose={() => setSelectedExpenseDetail(null)}
      title={"Payroll Expense Breakdown"}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Btn variant="ghost" onClick={() => setSelectedExpenseDetail(null)}>{"Close"}</Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-paper-tint border border-line rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink text-sm"><NoTranslate>{d.receiverName}</NoTranslate></span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
              d.status === "paid" ? "bg-ok-50 text-ok-700 border border-ok-200" :
              d.status === "approved" ? "bg-ocean-50 text-ocean-700 border border-ocean-200" :
              "bg-warn-50 text-warn-700 border border-warn-200"
            }`}>
              {d.status === "paid" ? "Paid" : d.status === "approved" ? "Approved" : "Pending"}
            </span>
          </div>
          <div className="text-xs text-ink-mute">
            <NoTranslate>{d.categoryLabel}</NoTranslate> · <NoTranslate>{d.branchName}</NoTranslate>
          </div>
          <div className="text-xs text-ink-mute font-mono">
            <NoTranslate>{d.periodLabel}</NoTranslate> {d.referenceNumber !== "—" ? <>· <NoTranslate>{d.referenceNumber}</NoTranslate></> : ""}
          </div>
          {d.description && (
            <div className="text-xs text-ink-soft pt-1"><NoTranslate>{d.description}</NoTranslate></div>
          )}
        </div>

        {items.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-2">{"Session & Invoice Claim Breakdown"}</div>
            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-paper-deep text-[10px] uppercase font-bold text-ink-faint">
                    <th className="text-left px-3 py-2">{"Type / Description"}</th>
                    <th className="text-right px-3 py-2">{"Sessions"}</th>
                    <th className="text-right px-3 py-2">{"Rate"}</th>
                    <th className="text-right px-3 py-2">{"Subtotal"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-ink"><NoTranslate>{it.class?.name ?? it.description ?? it.item_type}</NoTranslate></td>
                      <td className="px-3 py-2 text-right font-mono">{it.session_count}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtIDR(it.rate)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{fmtIDR(it.session_count * it.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <div className="border border-line rounded-xl divide-y divide-line text-sm">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-ink-mute">{"Gross Total"}</span>
              <span className="font-mono font-semibold text-ink">{fmtIDR(d.grossAmount)}</span>
            </div>
            {d.taxAmount > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-ink-mute">{"Income Tax (PPh 21)"}</span>
                <span className="font-mono text-warn-700">-{fmtIDR(d.taxAmount)}</span>
              </div>
            )}
            {d.loanDeduction > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-ink-mute">{"Loan / Cash Advance Deduction"}</span>
                <span className="font-mono text-purple-700">-{fmtIDR(d.loanDeduction)}</span>
              </div>
            )}
            {d.otherDeductions > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-ink-mute">{"Other Deductions"}</span>
                <span className="font-mono text-danger-700">-{fmtIDR(d.otherDeductions)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2 bg-ocean-50/50">
              <span className="font-bold text-ocean-900">{"Real Transferred (Net)"}</span>
              <span className="font-mono font-extrabold text-ocean-900">{fmtIDR(d.netTransferredAmount)}</span>
            </div>
          </div>
        </div>

        {d.bankInfo?.bankAccount && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-2">{"Destination Bank Account"}</div>
            <div className="border border-line rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-ink"><NoTranslate>{d.bankInfo.bankName ?? "Bank"}</NoTranslate></div>
                <div className="font-mono text-ocean-800 text-sm">{d.bankInfo.bankAccount}</div>
                <div className="text-xs text-ink-mute">a.n. <NoTranslate>{d.bankInfo.bankHolder || d.receiverName}</NoTranslate></div>
              </div>
              <button
                onClick={() => copyToClipboard(d.bankInfo!.bankAccount!, d.receiverName)}
                className="p-2 rounded-lg hover:bg-paper-tint text-ocean-700 hover:text-ocean-900 transition-colors"
                title={"Copy Account Number"}
              >
                <Icon name="copy" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {d.proofUrl && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-2">{"View proof"}</div>
            <ProofViewer proofUrl={d.proofUrl} label={d.receiverName} />
          </div>
        )}
      </div>
    </Modal>
  );
}
