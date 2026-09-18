"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import ProofViewer from "@/components/ui/ProofViewer";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { FinancialHook } from "./index";

export default function InvoiceDetailModal({ hook }: { hook: FinancialHook }) {
  const { selectedInvoiceDetail, setSelectedInvoiceDetail } = hook;

  if (!selectedInvoiceDetail) return null;
  const inv = selectedInvoiceDetail;
  const items = inv.coach_invoice_items ?? [];

  return (
    <Modal
      open={!!selectedInvoiceDetail}
      onClose={() => setSelectedInvoiceDetail(null)}
      title={(<>{"Invoice Details: "}<NoTranslate>{inv.invoice_number}</NoTranslate></>)}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Btn variant="ghost" onClick={() => setSelectedInvoiceDetail(null)}>{"Close"}</Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-paper-tint border border-line rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">{"Coach"}</span>
            <span className="font-bold text-ink text-sm"><NoTranslate>{inv.coach?.full_name ?? "—"}</NoTranslate></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">{"Center"}</span>
            <span className="text-xs text-ink-mute"><NoTranslate>{inv.branch?.name ?? "—"}</NoTranslate></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">{"Period"}</span>
            <span className="text-xs text-ink-mute font-mono"><NoTranslate>{inv.period_label}</NoTranslate></span>
          </div>
        </div>

        <div className="border border-line rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-paper-deep text-[10px] uppercase font-bold text-ink-faint">
                <th className="text-left px-3 py-2">{"Class / Detail"}</th>
                <th className="text-right px-3 py-2">{"Sessions"}</th>
                <th className="text-right px-3 py-2">{"Rate / Value"}</th>
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
            <tfoot>
              <tr className="bg-ocean-50/50">
                <td colSpan={3} className="px-3 py-2 text-right font-bold text-ocean-900">{"Total Payment Amount"}</td>
                <td className="px-3 py-2 text-right font-mono font-extrabold text-ocean-900">{fmtIDR(inv.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {items.some(it => it.proof_url) && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-faint">{"View proof"}</div>
            {items.filter(it => it.proof_url).map(it => (
              <ProofViewer key={it.id} proofUrl={it.proof_url} label={it.class?.name ?? it.description ?? undefined} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
