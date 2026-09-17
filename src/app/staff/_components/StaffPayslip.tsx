"use client";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR } from "@/lib/utils";
import type { useStaffData } from "./useStaffData";

export default function StaffPayslip({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const { t } = useLocale();
  const { salaries, handlePrintPayslip } = hook;

  return (
    <Card className="space-y-4">
      <SectionTitle sub={t("staff.payslip.sub")}>
        {t("staff.payslip.title")}
      </SectionTitle>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-4">{t("staff.payslip.colPeriod")}</th>
              <th className="text-right py-3 px-4">{t("staff.payslip.colBaseSalary")}</th>
              <th className="text-right py-3 px-4">{t("staff.payslip.colAllowances")}</th>
              <th className="text-right py-3 px-4">{t("staff.payslip.colReimburse")}</th>
              <th className="text-right py-3 px-4">{t("staff.payslip.colDeductions")}</th>
              <th className="text-right py-3 px-4">{t("staff.payslip.colTotalSalary")}</th>
              <th className="text-center py-3 px-4">{t("staff.payslip.colStatus")}</th>
              <th className="text-right py-3 px-4">{t("staff.payslip.colAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {salaries.map(sal => (
              <tr key={sal.id} className="hover:bg-paper-tint">
                <td className="py-3.5 px-4 font-bold text-ink">{sal.period_month}</td>
                <td className="py-3.5 px-4 text-right font-mono text-ink-soft">{fmtIDR(sal.base_salary)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-ok-600">{sal.allowances > 0 ? `+${fmtIDR(sal.allowances)}` : "—"}</td>
                <td className="py-3.5 px-4 text-right font-mono text-ok-600">{sal.reimburse_amount > 0 ? `+${fmtIDR(sal.reimburse_amount)}` : "—"}</td>
                <td className="py-3.5 px-4 text-right font-mono text-danger-600">{sal.deductions > 0 ? `-${fmtIDR(sal.deductions)}` : "—"}</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-ocean-700">{fmtIDR(sal.total_salary)}</td>
                <td className="py-3.5 px-4 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                    sal.status === "paid" ? "bg-ok-50 text-ok-700" :
                    sal.status === "approved" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"
                  }`}>
                    {sal.status === "paid" ? t("staff.payslip.statusPaid") :
                     sal.status === "approved" ? t("staff.payslip.statusApproved") : t("staff.payslip.statusDraft")}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Btn variant="outline" size="sm" icon="print" onClick={() => handlePrintPayslip(sal)}>
                    {t("staff.payslip.printBtn")}
                  </Btn>
                </td>
              </tr>
            ))}
            {salaries.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-ink-mute">
                  {t("staff.payslip.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {salaries.map(sal => (
          <div key={sal.id} className="p-4 rounded-xl border border-line bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-base text-ink">{sal.period_month}</span>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                sal.status === "paid" ? "bg-ok-50 text-ok-700" :
                sal.status === "approved" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"
              }`}>
                {sal.status === "paid" ? t("staff.payslip.statusPaid") :
                 sal.status === "approved" ? t("staff.payslip.statusApproved") : t("staff.payslip.statusDraft")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-paper-tint p-3 rounded-xl">
              <div>
                <div className="text-ink-mute">Gaji Pokok</div>
                <div className="font-mono font-semibold text-ink mt-0.5">{fmtIDR(sal.base_salary)}</div>
              </div>
              <div>
                <div className="text-ink-mute">Tunjangan</div>
                <div className="font-mono font-semibold text-ok-600 mt-0.5">{sal.allowances > 0 ? `+${fmtIDR(sal.allowances)}` : "Rp 0"}</div>
              </div>
              {sal.reimburse_amount > 0 && (
                <div>
                  <div className="text-ink-mute">Reimburse</div>
                  <div className="font-mono font-semibold text-ok-600 mt-0.5">+{fmtIDR(sal.reimburse_amount)}</div>
                </div>
              )}
              {sal.deductions > 0 && (
                <div>
                  <div className="text-ink-mute">Potongan</div>
                  <div className="font-mono font-semibold text-danger-600 mt-0.5">-{fmtIDR(sal.deductions)}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line/60">
              <div>
                <div className="text-[11px] text-ink-mute uppercase tracking-wide">Total Diterima</div>
                <div className="font-mono font-extrabold text-base text-ocean-700">{fmtIDR(sal.total_salary)}</div>
              </div>
              <Btn variant="outline" size="sm" icon="print" onClick={() => handlePrintPayslip(sal)}>
                {t("staff.payslip.printBtn")}
              </Btn>
            </div>
          </div>
        ))}
        {salaries.length === 0 && (
          <div className="py-8 text-center text-xs text-ink-mute">
            {t("staff.payslip.empty")}
          </div>
        )}
      </div>
    </Card>
  );
}
