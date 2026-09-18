"use client";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR, fmtDate } from "@/lib/utils";
import type { AdminStudentHook } from "./_hook";

export default function StudentPaymentTab({ hook }: { hook: AdminStudentHook }) {
  const { loadingBills, bills } = hook;

  return (
    <div className="space-y-3">
      {loadingBills ? (
        <div className="py-8 text-center text-ink-mute text-sm">{"Loading…"}</div>
      ) : bills.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{"No payment history yet."}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                <th className="text-left py-2 px-3 font-bold">{"Period"}</th>
                <th className="text-right py-2 font-bold">{"Amount"}</th>
                <th className="text-right py-2 font-bold">{"Discount"}</th>
                <th className="text-right py-2 font-bold">{"Total"}</th>
                <th className="text-left py-2 font-bold">{"Status"}</th>
                <th className="text-left py-2 px-3 font-bold">{"Paid Date"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bills.map(b => (
                <tr key={b.id} className="hover:bg-paper-tint">
                  <td className="py-2 px-3 font-semibold text-ink"><NoTranslate>{b.period_label}</NoTranslate></td>
                  <td className="py-2 text-right font-mono text-ink-soft">{fmtIDR(b.amount)}</td>
                  <td className="py-2 text-right">
                    {b.discount > 0
                      ? <span className="text-ok-600 font-mono" title={b.discount_reason ?? undefined}>-{fmtIDR(b.discount)}</span>
                      : <span className="text-ink-faint">—</span>
                    }
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-ink">{fmtIDR(b.total)}</td>
                  <td className="py-2">
                    {b.status === "paid"
                      ? <Status kind="approved" dot={false}>{"Paid"}</Status>
                      : b.status === "unpaid"
                      ? <Status kind="rejected" dot={false}>{"Unpaid"}</Status>
                      : b.status === "partial"
                      ? <Status kind="pending" dot={false}>{"Partial"}</Status>
                      : b.status === "free"
                      ? <Status kind="archived" dot={false}>{"Free"}</Status>
                      : <Status kind="school_covered" dot={false}>{"School"}</Status>
                    }
                  </td>
                  <td className="py-2 px-3 text-ink-mute whitespace-nowrap">{b.paid_at ? fmtDate(b.paid_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
