"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR, fmtDate } from "@/lib/utils";
import type { useStaffData } from "./useStaffData";

export default function StaffExpenses({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const { t } = useLocale();
  const { expenses, setShowExpenseModal } = hook;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle sub={t("staff.expenses.sub")}>
          {t("staff.expenses.title")}
        </SectionTitle>
        <Btn variant="primary" icon="plus" size="sm" onClick={() => setShowExpenseModal(true)}>
          {t("staff.expenses.submitNewBtn")}
        </Btn>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-4">{t("staff.expenses.colSubmitDate")}</th>
              <th className="text-left py-3 px-4">{t("staff.expenses.colDescription")}</th>
              <th className="text-right py-3 px-4">{t("staff.expenses.colAmount")}</th>
              <th className="text-center py-3 px-4">{t("staff.expenses.colProof")}</th>
              <th className="text-center py-3 px-4">{t("staff.expenses.colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {expenses.map(exp => (
              <tr key={exp.id} className="hover:bg-paper-tint">
                <td className="py-3.5 px-4 text-ink-soft">{fmtDate(exp.submitted_at)}</td>
                <td className="py-3.5 px-4 font-semibold text-ink max-w-xs truncate">{exp.description}</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-ink">{fmtIDR(exp.amount)}</td>
                <td className="py-3.5 px-4 text-center">
                  {exp.proof_url ? (
                    <a
                      href={exp.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-ocean-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Icon name="link" className="w-3.5 h-3.5" /> {t("staff.expenses.viewProof")}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-mute">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Status kind={exp.status === "paid" ? "paid" : exp.status === "approved" ? "approved" : exp.status === "rejected" ? "rejected" : exp.status === "cancelled" ? "inactive" : "pending"}>
                    {exp.status === "paid" ? t("staff.expenses.statusPaid") :
                     exp.status === "approved" ? t("staff.expenses.statusApproved") :
                     exp.status === "rejected" ? t("staff.expenses.statusRejected") :
                     exp.status === "cancelled" ? t("staff.expenses.statusCancelled") : t("staff.expenses.statusPending")}
                  </Status>
                  {exp.status === "rejected" && exp.rejection_reason && (
                    <div className="text-[10px] text-danger-500 mt-0.5">{exp.rejection_reason}</div>
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-ink-mute">
                  {t("staff.expenses.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {expenses.map(exp => (
          <div key={exp.id} className="p-3.5 rounded-xl border border-line bg-white shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-ink-mute">{fmtDate(exp.submitted_at)}</div>
                <div className="font-bold text-sm text-ink line-clamp-2 mt-0.5">{exp.description}</div>
              </div>
              <Status kind={exp.status === "paid" ? "paid" : exp.status === "approved" ? "approved" : exp.status === "rejected" ? "rejected" : exp.status === "cancelled" ? "inactive" : "pending"}>
                {exp.status === "paid" ? t("staff.expenses.statusPaid") :
                 exp.status === "approved" ? t("staff.expenses.statusApproved") :
                 exp.status === "rejected" ? t("staff.expenses.statusRejected") :
                 exp.status === "cancelled" ? t("staff.expenses.statusCancelled") : t("staff.expenses.statusPending")}
              </Status>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-line/60">
              <span className="text-xs text-ink-mute">Nominal</span>
              <span className="font-mono font-bold text-sm text-ink">{fmtIDR(exp.amount)}</span>
            </div>

            {exp.proof_url && (
              <div className="pt-0.5">
                <a
                  href={exp.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1"
                >
                  <Icon name="link" className="w-3.5 h-3.5" /> {t("staff.expenses.viewProof")}
                </a>
              </div>
            )}

            {exp.status === "rejected" && exp.rejection_reason && (
              <div className="text-xs text-danger-600 bg-danger-50 p-2 rounded-lg">
                <span className="font-bold">Alasan ditolak:</span> {exp.rejection_reason}
              </div>
            )}
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="py-8 text-center text-xs text-ink-mute">
            {t("staff.expenses.empty")}
          </div>
        )}
      </div>
    </Card>
  );
}
