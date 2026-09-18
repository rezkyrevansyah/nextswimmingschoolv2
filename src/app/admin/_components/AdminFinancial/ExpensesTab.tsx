"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, Stat } from "@/components/ui/Card";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { useAdminFinancialData } from "./useAdminFinancialData";

type AdminFinancialDataHook = ReturnType<typeof useAdminFinancialData>;

export default function ExpensesTab({ hook }: { hook: AdminFinancialDataHook }) {
  const { manualExpense, thisMonth, totalExpenseManual, openAddTxn, openEditTxn, deleteTxn } = hook;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("expense")}>{"Add Expense"}</Btn>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Stat label={"Total Manual Expense"} value={manualExpense.length} icon="invoice" tone="danger" sub={fmtIDR(totalExpenseManual)} />
        <Stat label={"This Month"} value={manualExpense.filter(tx => tx.occurred_at.startsWith(thisMonth)).length} icon="calendar" tone="ocean" sub={fmtIDR(manualExpense.filter(tx => tx.occurred_at.startsWith(thisMonth)).reduce((a, tx) => a + tx.amount, 0))} />
      </div>

      <Card padded={false}>
        {manualExpense.length === 0 ? (
          <div className="p-10 text-center text-ink-mute">
            {"No manual expenses yet — click \"Add Expense\" above to record center expenses like electricity, supplies, etc."}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {[...manualExpense].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map(row => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-paper-tint/50">
                <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-600 flex items-center justify-center shrink-0">
                  <Icon name="invoice" className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink flex items-center gap-1.5">
                    <NoTranslate>{row.description}</NoTranslate>
                    {row.is_reimburse && <span className="px-1.5 py-0.5 rounded-full bg-warn-50 text-warn-700 text-[10px] font-semibold">{"Reimburse"}</span>}
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{row.category ?? "—"}</NoTranslate> · {row.occurred_at.slice(0, 10)}</div>
                  {row.notes && <div className="text-xs text-ink-faint mt-0.5"><NoTranslate>{row.notes}</NoTranslate></div>}
                  {row.proof_url && (
                    <a href={row.proof_url} target="_blank" rel="noreferrer" className="text-xs text-ocean-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                      <Icon name="link" className="w-3 h-3" />{"View proof"}
                    </a>
                  )}
                </div>
                <div className="font-mono font-bold text-sm text-danger-700 shrink-0">{fmtIDR(row.amount)}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditTxn(row)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600" title={"Edit"}><Icon name="edit" className="w-4 h-4" /></button>
                  <button onClick={() => deleteTxn(row)} className="w-8 h-8 rounded-lg border border-line hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={"Delete"}><Icon name="trash" className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
