"use client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useFinancialData } from "./useFinancialData";
import type { useFinancialComputed } from "./useFinancialComputed";

type Data = ReturnType<typeof useFinancialData>;
type Computed = ReturnType<typeof useFinancialComputed>;

// Excel export (Summary + Income + Expenses) — reads the same filtered/
// computed state the screen renders, so export can never drift from the UI.
export function useFinancialExport(data: Data, computed: Computed) {
  const { t } = useLocale();
  const toast = useToast();
  const { financialFrom, financialTo, setExportingExcel } = data;
  const {
    totalIncome, totalRealCashOut, netAmount, totalTaxWithheld, totalOtherDeductions, totalGrossExpenses,
    filteredIncome, filteredExpenses,
  } = computed;

  const downloadFinancialExcel = async () => {
    setExportingExcel(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.aoa_to_sheet([
        [t("owner.financial.exportPeriodLabel"), `${financialFrom} s/d ${financialTo}`],
        [],
        [t("owner.financial.statTotalIncome"), totalIncome],
        [t("owner.financial.statNetCashOut"), totalRealCashOut],
        [t("owner.financial.statNet"), netAmount],
        [t("owner.financial.statTaxWithheld"), totalTaxWithheld],
        [t("owner.financial.exportOtherDeductions"), totalOtherDeductions],
        [t("owner.financial.exportGrossExpenses"), totalGrossExpenses],
      ]);
      summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      const incomeRows = filteredIncome.map(row => ({
        [t("owner.financial.exportColDate")]: (row.source === "manual" ? row.occurred_at : (row.paid_at ?? row.created_at))?.slice(0, 10) ?? "-",
        [t("owner.financial.exportColSource")]: row.source === "manual" ? t("owner.financial.exportSourceManual") : t("owner.financial.exportSourceBill"),
        [t("owner.financial.exportColBranch")]: row.branch?.name ?? "-",
        [t("owner.financial.exportColDescription")]: row.source === "manual" ? row.description : (row.member?.profile?.full_name ?? row.period_label),
        [t("owner.financial.exportColAmount")]: row.source === "manual" ? row.amount : row.total,
        [t("owner.financial.exportColStatus")]: row.source === "manual" ? "-" : row.status,
      }));
      const incomeSheet = XLSX.utils.json_to_sheet(incomeRows);
      incomeSheet["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 32 }, { wch: 16 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, incomeSheet, "Income");

      const expenseRows = filteredExpenses.map(e => ({
        [t("owner.financial.exportColDate")]: e.date?.slice(0, 10) ?? "-",
        [t("owner.financial.exportColCategory")]: e.categoryLabel,
        [t("owner.financial.exportColBranch")]: e.branchName,
        [t("owner.financial.exportColReceiver")]: e.receiverName,
        [t("owner.financial.exportColGross")]: e.grossAmount,
        [t("owner.financial.exportColTax")]: e.taxAmount,
        [t("owner.financial.exportColDeductions")]: e.otherDeductions,
        [t("owner.financial.exportColNet")]: e.netTransferredAmount,
        [t("owner.financial.exportColStatus")]: e.status,
      }));
      const expenseSheet = XLSX.utils.json_to_sheet(expenseRows);
      expenseSheet["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

      XLSX.writeFile(wb, `Financial-${financialFrom}-sd-${financialTo}.xlsx`);
      toast.success(t("owner.financial.exportExcelSuccess"));
    } catch (err) {
      toast.error(t("owner.financial.exportExcelFailed"), err instanceof Error ? err.message : undefined);
    } finally {
      setExportingExcel(false);
    }
  };

  return { downloadFinancialExcel };
}
