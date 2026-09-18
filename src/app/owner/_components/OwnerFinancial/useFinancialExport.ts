"use client";
import { useToast } from "@/components/providers/ToastProvider";
import type { useFinancialData } from "./useFinancialData";
import type { useFinancialComputed } from "./useFinancialComputed";

type Data = ReturnType<typeof useFinancialData>;
type Computed = ReturnType<typeof useFinancialComputed>;

// Excel export (Summary + Income + Expenses) — reads the same filtered/
// computed state the screen renders, so export can never drift from the UI.
export function useFinancialExport(data: Data, computed: Computed) {
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
        ["Period", `${financialFrom} s/d ${financialTo}`],
        [],
        ["Total Income", totalIncome],
        ["Real Cash Outflow", totalRealCashOut],
        ["Net", netAmount],
        ["Income Tax (PPh 21)", totalTaxWithheld],
        ["Other Deductions", totalOtherDeductions],
        ["Gross Expenses", totalGrossExpenses],
      ]);
      summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      const incomeRows = filteredIncome.map(row => ({
        ["Date"]: (row.source === "manual" ? row.occurred_at : (row.paid_at ?? row.created_at))?.slice(0, 10) ?? "-",
        ["Source"]: row.source === "manual" ? "Manual" : "Bill",
        ["Branch"]: row.branch?.name ?? "-",
        ["Description"]: row.source === "manual" ? row.description : (row.student?.profile?.full_name ?? row.period_label),
        ["Amount"]: row.source === "manual" ? row.amount : row.total,
        ["Status"]: row.source === "manual" ? "-" : row.status,
      }));
      const incomeSheet = XLSX.utils.json_to_sheet(incomeRows);
      incomeSheet["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 32 }, { wch: 16 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, incomeSheet, "Income");

      const expenseRows = filteredExpenses.map(e => ({
        ["Date"]: e.date?.slice(0, 10) ?? "-",
        ["Category"]: e.categoryLabel,
        ["Branch"]: e.branchName,
        ["Receiver"]: e.receiverName,
        ["Gross"]: e.grossAmount,
        ["Tax"]: e.taxAmount,
        ["Deductions"]: e.otherDeductions,
        ["Net"]: e.netTransferredAmount,
        ["Status"]: e.status,
      }));
      const expenseSheet = XLSX.utils.json_to_sheet(expenseRows);
      expenseSheet["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

      XLSX.writeFile(wb, `Financial-${financialFrom}-sd-${financialTo}.xlsx`);
      toast.success("Financial data exported to Excel");
    } catch (err) {
      toast.error("Failed to export Excel", err instanceof Error ? err.message : undefined);
    } finally {
      setExportingExcel(false);
    }
  };

  return { downloadFinancialExcel };
}
