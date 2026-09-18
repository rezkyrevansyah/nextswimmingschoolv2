"use client";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR, clampPercent } from "@/lib/utils";
import type { FinancialHook } from "./index";

export default function Overview({ hook }: { hook: FinancialHook }) {
  const {
    totalIncome, rangedPaidBills, totalRealCashOut, netAmount, totalTaxWithheld, totalGrossExpenses,
    chartMonths, setChartMonths, loadingBills, loadingExpenses, barChartData, barMax,
    branches, branchIncomeMap, maxBranchIncome,
  } = hook;

  return (
    <div className="space-y-5">
      {/* Stat cards: 2-Tier Hierarchical Layout for executive clarity and zero clipping */}
      <div className="space-y-3">
        {/* Primary Cash Flow (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Income */}
          <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-ok-300 hover:shadow-card transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ok-500 inline-block" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {"Total Income"}
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-ok-50 text-ok-600 border border-ok-200/60 flex items-center justify-center shrink-0">
                <Icon name="wallet" className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="font-mono font-extrabold text-2xl lg:text-3xl text-ink tracking-tight">
                {fmtIDR(totalIncome)}
              </div>
              <div className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5">
                <span className="inline-block px-1.5 py-0.5 rounded bg-ok-50 text-ok-700 text-[11px] font-semibold">
                  {rangedPaidBills.length} transaksi lunas
                </span>
              </div>
            </div>
          </div>

          {/* Real Cash Outflow */}
          <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-danger-300 hover:shadow-card transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {"Real Cash Outflow"}
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-600 border border-danger-200/60 flex items-center justify-center shrink-0">
                <Icon name="invoice" className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="font-mono font-extrabold text-2xl lg:text-3xl text-danger-700 tracking-tight">
                {fmtIDR(totalRealCashOut)}
              </div>
              <div className="text-xs text-ink-mute mt-1.5">
                Transfer riil ke rekening bank coach & staff
              </div>
            </div>
          </div>

          {/* Net Cashflow (Surplus/Deficit) */}
          <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-ocean-300 hover:shadow-card transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${netAmount >= 0 ? "bg-ok-500" : "bg-warn-500"} inline-block`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {"Net"}
                </span>
              </div>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${netAmount >= 0 ? "bg-ocean-50 text-ocean-700 border border-ocean-200/60" : "bg-warn-50 text-warn-700 border border-warn-200/60"}`}>
                <Icon name="chart" className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className={`font-mono font-extrabold text-2xl lg:text-3xl tracking-tight ${netAmount >= 0 ? "text-ocean-800" : "text-warn-700"}`}>
                {fmtIDR(netAmount)}
              </div>
              <div className="text-xs font-semibold mt-1.5 flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${netAmount >= 0 ? "bg-ok-50 text-ok-700 border border-ok-200" : "bg-danger-50 text-danger-700 border border-danger-200"}`}>
                  {netAmount >= 0 ? "Net Cash Surplus" : "Operating Cash Deficit"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Tax & Gross Breakdown (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tax Withheld PPh 21 */}
          <div className="bg-paper border border-line rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-warn-300 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-warn-50 text-warn-800 border border-warn-200 uppercase tracking-wider">
                  PPh 21
                </span>
                <span className="text-xs font-bold text-ink">
                  {"Income Tax (PPh 21)"}
                </span>
              </div>
              <div className="text-[11px] text-ink-mute">
                Pajak dipotong dari honor coach & staff (titipan untuk kas negara)
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="font-mono font-bold text-lg lg:text-xl text-warn-700">
                {fmtIDR(totalTaxWithheld)}
              </div>
              <div className="text-[10px] font-medium text-warn-600">Disetor ke Kas Negara</div>
            </div>
          </div>

          {/* Total Gross Expenses */}
          <div className="bg-paper border border-line rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-ocean-300 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-ocean-50 text-ocean-800 border border-ocean-200 uppercase tracking-wider">
                  Beban Bruto
                </span>
                <span className="text-xs font-bold text-ink">
                  {"Total Gross Expenses"}
                </span>
              </div>
              <div className="text-[11px] text-ink-mute">
                Total beban operasional & payroll kotor sebelum pemotongan
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="font-mono font-bold text-lg lg:text-xl text-ink">
                {fmtIDR(totalGrossExpenses)}
              </div>
              <div className="text-[10px] font-medium text-ink-mute">Total Payroll & Operasional</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart: Income vs Expenses per month */}
      <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="font-display font-bold text-base text-ink">{"Income vs Expenses"}</div>
            <div className="text-xs text-ink-mute mt-0.5">{`last ${chartMonths} months · income & expense comparison`}</div>
          </div>
          <div className="flex gap-1 shrink-0 bg-paper-tint rounded-xl p-1">
            {([3, 6, 12] as const).map(n => (
              <button
                key={n}
                onClick={() => setChartMonths(n)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${chartMonths === n ? "bg-white shadow-xs text-ocean-700 font-bold" : "text-ink-mute hover:text-ink"}`}
              >
                {`${n}M`}
              </button>
            ))}
          </div>
        </div>

        {loadingBills || loadingExpenses ? (
          <div className="h-48 flex items-center justify-center text-ink-mute text-sm">{"Loading…"}</div>
        ) : (
          <>
            {/* Vertical grouped bar chart */}
            {/* Chart area: fixed height 180px for bars + 36px label row below */}
            <div className="flex gap-1.5 px-1" style={{ height: "216px", alignItems: "flex-end" }}>
              {barChartData.map((m) => {
                const CHART_H = 160;
                const incH = m.income > 0 ? Math.max(4, Math.round((m.income / barMax) * CHART_H)) : 0;
                const expH = m.expense > 0 ? Math.max(4, Math.round((m.expense / barMax) * CHART_H)) : 0;
                const netPositive = m.net >= 0;
                return (
                  <div key={m.key} className="flex-1 group relative flex flex-col justify-end items-center" style={{ height: "216px" }}>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] leading-tight rounded-lg px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-36 shadow-float">
                      <div className="font-semibold mb-1">{m.label}</div>
                      <div className="flex justify-between gap-2"><span className="text-ok-300">{"Income"}</span><span>{fmtIDR(m.income)}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-danger-300">{"Expenses"}</span><span>{fmtIDR(m.expense)}</span></div>
                      <div className={`flex justify-between gap-2 mt-1 pt-1 border-t border-white/20 font-semibold ${netPositive ? "text-ok-300" : "text-danger-300"}`}>
                        <span>{"Net"}</span><span>{netPositive ? "+" : ""}{fmtIDR(m.net)}</span>
                      </div>
                    </div>
                    {/* Bars + labels */}
                    <div className="w-full flex items-end justify-center gap-0.5" style={{ height: `${CHART_H}px` }}>
                      {/* Income bar */}
                      {incH > 0 ? (
                        <div
                          className="flex-1 rounded-t-md bg-ok-500 transition-all duration-500"
                          style={{ height: `${incH}px` }}
                        />
                      ) : (
                        <div className="flex-1 rounded-t-sm bg-ok-50" style={{ height: "3px" }} />
                      )}
                      {/* Expense bar */}
                      {expH > 0 ? (
                        <div
                          className="flex-1 rounded-t-md bg-danger-500 transition-all duration-500"
                          style={{ height: `${expH}px` }}
                        />
                      ) : (
                        <div className="flex-1 rounded-t-sm bg-danger-50" style={{ height: "3px" }} />
                      )}
                    </div>
                    {/* Net dot */}
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${netPositive ? "bg-ok-500" : "bg-danger-500"}`} />
                    {/* Month label */}
                    <div className={`text-[10px] font-semibold text-center leading-tight mt-1 text-ink-mute ${chartMonths === 12 ? "text-[9px]" : ""}`}>{m.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Y-axis guide lines (decorative) */}
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <div className="flex gap-4 text-xs text-ink-mute">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-ok-500 inline-block" />
                  {"Income"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-danger-500 inline-block" />
                  {"Expenses"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-ok-500 inline-block" />
                  {"Net +"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />
                  {"Net −"}
                </span>
              </div>
              <div className="text-xs text-ink-faint">
                {`Max: ${fmtIDR(barMax)}`}
              </div>
            </div>

            {/* Monthly net summary strip */}
            <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(chartMonths, 6)}, 1fr)` }}>
              {barChartData.slice(-Math.min(chartMonths, 6)).map(m => (
                <div key={m.key} className={`rounded-xl px-2.5 py-2 text-center ${m.net >= 0 ? "bg-ok-50" : "bg-danger-50"}`}>
                  <div className="text-[10px] text-ink-mute font-medium">{m.label}</div>
                  <div className={`text-xs font-bold mt-0.5 ${m.net >= 0 ? "text-ok-700" : "text-danger-700"}`}>
                    {m.net >= 0 ? "+" : ""}{fmtIDR(m.net)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Top cabang by income */}
      {branches.length > 0 && (
        <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs">
          <div className="font-display font-bold text-base mb-4">{"Income per Center"}</div>
          <div className="grid gap-3">
            {branches.map(b => {
              const inc = branchIncomeMap[b.id] ?? 0;
              const width = clampPercent(inc, maxBranchIncome);
              return (
                <div key={b.id} className="rounded-2xl border border-line bg-paper-tint/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink break-words"><NoTranslate>{b.name}</NoTranslate></div>
                      <div className="text-[11px] uppercase tracking-widest text-ink-faint mt-0.5">{"Contribution"}</div>
                    </div>
                    <div className="text-sm font-mono font-bold text-ocean-700 whitespace-nowrap">{fmtIDR(inc)}</div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-line bg-paper">
                    <div className="h-full rounded-full bg-gradient-to-r from-ocean-500 to-wave-500 transition-all duration-500" style={{ width: `${width}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-ink-mute">
                    {inc > 0 ? `${Math.round(width)}% of highest center` : "No income yet"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
