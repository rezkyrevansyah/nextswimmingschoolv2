"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { useAdminFinancialData } from "./useAdminFinancialData";
import IncomeTab from "./IncomeTab";
import ExpensesTab from "./ExpensesTab";
import TxnModal from "./TxnModal";

export default function AdminFinancial({ branchId, userId, userName }: { branchId: string; userId: string; userName: string }) {
  const { t } = useLocale();
  const hook = useAdminFinancialData({ branchId, userId, userName });
  const { tab, setTab, load, loadManualTxns } = hook;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">{t("admin.financial.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("admin.financial.pageSub")}</p>
        </div>
        <Btn variant="ghost" icon="refresh" onClick={() => { load(); loadManualTxns(); }}>{t("admin.financial.refreshBtn")}</Btn>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap bg-paper-tint border border-line rounded-xl p-1 w-fit">
        {([{ id: "income", label: t("admin.financial.tabIncome"), icon: "wallet" }, { id: "expenses", label: t("admin.financial.tabExpenses"), icon: "invoice" }] as const).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === tb.id ? "bg-white text-ocean-700 shadow-card" : "text-ink-soft hover:bg-white/60"}`}>
            <Icon name={tb.icon} className="w-4 h-4" /> {tb.label}
          </button>
        ))}
      </div>

      {tab === "income" && <IncomeTab hook={hook} />}
      {tab === "expenses" && <ExpensesTab hook={hook} />}

      {/* ── Modal: Tambah/Edit Transaksi Manual ─────────────────────────────── */}
      <TxnModal hook={hook} />
    </div>
  );
}
