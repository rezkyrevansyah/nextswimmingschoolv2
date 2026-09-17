"use client";
import Status from "@/components/ui/Status";
import { fmtIDR, fmtDate } from "@/lib/utils";
import type { AdminMemberHook } from "./_hook";

export default function MemberPaymentTab({ hook }: { hook: AdminMemberHook }) {
  const { t, loadingBills, bills } = hook;

  return (
    <div className="space-y-3">
      {loadingBills ? (
        <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.loadingEllipsis")}</div>
      ) : bills.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{t("admin.members.noPaymentHistory")}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-ink-faint font-bold border-b border-line bg-paper-tint">
                <th className="text-left py-2 px-3 font-bold">{t("admin.financial.colPeriod")}</th>
                <th className="text-right py-2 font-bold">{t("admin.members.colAmount")}</th>
                <th className="text-right py-2 font-bold">{t("admin.members.colDiscount")}</th>
                <th className="text-right py-2 font-bold">{t("admin.financial.colTotalCol")}</th>
                <th className="text-left py-2 font-bold">{t("admin.financial.colStatusCol")}</th>
                <th className="text-left py-2 px-3 font-bold">{t("admin.members.colPaidDate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bills.map(b => (
                <tr key={b.id} className="hover:bg-paper-tint">
                  <td className="py-2 px-3 font-semibold text-ink">{b.period_label}</td>
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
                      ? <Status kind="approved" dot={false}>{t("admin.pembayaran.statusPaid")}</Status>
                      : b.status === "unpaid"
                      ? <Status kind="rejected" dot={false}>{t("admin.pembayaran.statusUnpaid")}</Status>
                      : b.status === "partial"
                      ? <Status kind="pending" dot={false}>{t("admin.pembayaran.statusPartial")}</Status>
                      : b.status === "free"
                      ? <Status kind="archived" dot={false}>{t("admin.pembayaran.statusFree")}</Status>
                      : <Status kind="school_covered" dot={false}>{t("admin.pembayaran.statusSchoolCovered")}</Status>
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
