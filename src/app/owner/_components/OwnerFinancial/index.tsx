"use client";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { Branch } from "../../_types";
import type { FinancialTab } from "./_types";
import { useFinancialData } from "./useFinancialData";
import { useFinancialComputed } from "./useFinancialComputed";
import { usePayrollComputed } from "./usePayrollComputed";
import { useFinancialExport } from "./useFinancialExport";
import FinancialFilterBar from "./FinancialFilterBar";
import Overview from "./Overview";
import Income from "./Income";
import Expenses from "./Expenses";
import Payroll from "./Payroll";
import MoneyFlow from "./MoneyFlow";
import ManualTxnModal from "./ManualTxnModal";
import ExpenseDetailModal from "./ExpenseDetailModal";
import InvoiceDetailModal from "./InvoiceDetailModal";
import StaffSalaryModal from "./StaffSalaryModal";
import CategoryManagerModal from "./CategoryManagerModal";

export type FinancialHook =
  ReturnType<typeof useFinancialData> &
  ReturnType<typeof useFinancialComputed> &
  ReturnType<typeof usePayrollComputed> &
  ReturnType<typeof useFinancialExport>;

export default function OwnerFinancial({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const data = useFinancialData({ branches, userId, userName });
  const computed = useFinancialComputed(data);
  const payroll = usePayrollComputed(data, computed);
  const exportHook = useFinancialExport(data, computed);
  const hook: FinancialHook = { ...data, ...computed, ...payroll, ...exportHook };

  const { tab, setTab, categoriesByKind, manualTxns, showCategoryManager, setShowCategoryManager, loadCategories } = hook;

  const FTABS: { id: FinancialTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "income", label: "Income", icon: "wallet" },
    { id: "expenses", label: "Expenses", icon: "invoice" },
    { id: "payroll", label: "Payroll (Coach & Staff)", icon: "users" },
    { id: "moneyflow", label: "Money Flow", icon: "chart" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl text-ink">{"Financial"}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{"Income, expenses & payroll across all centers."}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {FTABS.map(ft => (
          <button
            key={ft.id}
            onClick={() => setTab(ft.id)}
            className={cn(
              "h-10 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2",
              tab === ft.id
                ? "bg-ocean-600 text-white shadow-xs"
                : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
            )}
          >
            <Icon name={ft.icon} className={cn("w-4 h-4", tab === ft.id ? "text-white" : "text-ink-mute")} />
            {ft.label}
          </button>
        ))}
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-ocean-50 border border-ocean-200/60 text-ocean-800 text-xs">
        <Icon name="info" className="w-4 h-4 text-ocean-600 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          Rentang tanggal memfilter seluruh data: ringkasan metrik, daftar transaksi pendapatan/pengeluaran, payroll, hingga ekspor Excel.
        </div>
      </div>

      {/* Unified date-range filter — applies to every sub-tab above */}
      <FinancialFilterBar hook={hook} />

      {tab === "overview" && <Overview hook={hook} />}
      {tab === "income" && <Income hook={hook} />}
      {tab === "expenses" && <Expenses hook={hook} />}
      {tab === "payroll" && <Payroll hook={hook} />}
      {tab === "moneyflow" && <MoneyFlow hook={hook} />}

      <ManualTxnModal hook={hook} />
      <ExpenseDetailModal hook={hook} />
      <InvoiceDetailModal hook={hook} />
      <StaffSalaryModal hook={hook} />
      <CategoryManagerModal
        kind={showCategoryManager}
        categories={showCategoryManager ? categoriesByKind(showCategoryManager) : []}
        manualTxns={manualTxns}
        onClose={() => setShowCategoryManager(null)}
        onChanged={loadCategories}
      />
    </div>
  );
}
