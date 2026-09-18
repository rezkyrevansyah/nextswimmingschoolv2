"use client";
import { Stat } from "@/components/ui/Card";
import { fmtIDR } from "@/lib/utils";
import type { FinancialHook } from "./index";

export default function MoneyFlow({ hook }: { hook: FinancialHook }) {
  const { loadingBills, loadingExpenses, moneyFlowData } = hook;

  const mfMax = Math.max(1, ...moneyFlowData.map(m => Math.max(m.income, m.expense)));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label={"Total Income (12 mo)"} value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.income, 0))} icon="invoice" tone="ok" />
        <Stat label={"Total Expenses (12 mo)"} value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.expense, 0))} icon="wallet" tone="warn" />
        <Stat label={"Net (12 mo)"} value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.net, 0))} icon="chart" tone="ocean" />
      </div>

      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {loadingBills || loadingExpenses ? (
          <div className="p-10 text-center text-ink-mute text-sm">{"Loading data…"}</div>
        ) : moneyFlowData.length === 0 ? (
          <div className="p-10 text-center text-ink-mute text-sm">{"No transaction data yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-9 border-b border-line bg-paper-deep text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <th className="text-left px-4 py-2">{"Month"}</th>
                  <th className="text-right px-4 py-2">{"Income"}</th>
                  <th className="text-right px-4 py-2">{"Expenses"}</th>
                  <th className="text-right px-4 py-2">{"Net"}</th>
                  <th className="px-4 py-2 w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {moneyFlowData.map((m) => (
                  <tr key={m.key} className="hover:bg-paper-tint transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink text-xs">{m.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ok-700">{fmtIDR(m.income)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-warn-700">{fmtIDR(m.expense)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${m.net >= 0 ? "text-ocean-700" : "text-danger-700"}`}>{fmtIDR(m.net)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 h-4">
                        <div className="flex-1 h-2.5 rounded-full bg-paper-deep overflow-hidden">
                          <div className="h-full bg-ok-400" style={{ width: `${(m.income / mfMax) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 h-4 mt-0.5">
                        <div className="flex-1 h-2.5 rounded-full bg-paper-deep overflow-hidden">
                          <div className="h-full bg-warn-400" style={{ width: `${(m.expense / mfMax) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
