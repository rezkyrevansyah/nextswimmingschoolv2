"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { FinancialHook } from "./index";

export default function Income({ hook }: { hook: FinancialHook }) {
  const {
    setShowCategoryManager, openAddTxn, branches,
    incomeSearch, setIncomeSearch, incomeBranch, setIncomeBranch, incomeStatus, setIncomeStatus,
    incomeType, setIncomeType, incomeMethod, setIncomeMethod,
    filteredIncome, loadingBills, incomePagedRows, incomeSortBy, setIncomeSortBy, incomeSortDir, setIncomeSortDir,
    openEditTxn, deleteTxn, incomeSafePage, incomeTotalPages, setIncomePage,
  } = hook;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Btn variant="soft" icon="settings" size="sm" onClick={() => setShowCategoryManager("income")}>{"Manage Categories"}</Btn>
        <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("income")}>{"Add Income"}</Btn>
      </div>
      {/* Filters */}
      <div className="bg-paper border border-line rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input value={incomeSearch} onChange={e => setIncomeSearch(e.target.value)} placeholder={"Search student, class, period, description…"} className="w-full pl-9 pr-3 h-10 text-sm rounded-xl border border-line bg-paper text-ink focus:outline-none focus:border-ocean-500 transition" />
          </div>
          <select value={incomeBranch} onChange={e => setIncomeBranch(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="all">{"All Centers"}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={incomeStatus} onChange={e => setIncomeStatus(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="">{"All Statuses"}</option>
            <option value="unpaid">{"Unpaid"}</option>
            <option value="paid">{"Paid"}</option>
            <option value="partial">{"Partial"}</option>
            <option value="school_covered">{"School"}</option>
            <option value="free">{"Free"}</option>
          </select>
          <select value={incomeType} onChange={e => setIncomeType(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="">{"All Types"}</option>
            <option value="monthly">{"Monthly"}</option>
            <option value="session_pack">{"Session Pack"}</option>
            <option value="custom">{"Custom"}</option>
          </select>
          <select value={incomeMethod} onChange={e => setIncomeMethod(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="">{"All Methods"}</option>
            <option value="transfer">{"Transfer"}</option>
            <option value="cash">{"Cash"}</option>
            <option value="qris">{"QRIS"}</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {(incomeSearch || incomeStatus || incomeBranch !== "all" || incomeType || incomeMethod) && (
            <button onClick={() => { setIncomeSearch(""); setIncomeStatus(""); setIncomeBranch("all"); setIncomeType(""); setIncomeMethod(""); }} className="text-xs text-ocean-600 hover:underline">{"Reset filter"}</button>
          )}
          <span className="text-xs font-semibold text-ink-mute ml-auto">{`${filteredIncome.length} rows`}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {loadingBills ? (
          <div className="p-10 text-center text-ink-mute text-sm">{"Loading data…"}</div>
        ) : incomePagedRows.length === 0 ? (
          <div className="p-10 text-center text-ink-mute text-sm">{"No data."}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="h-9 border-b border-line bg-paper-deep text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                    <th className="text-left px-4 py-2">{"Center"}</th>
                    <th className="text-left px-4 py-2">{"Student"}</th>
                    <th className="text-left px-4 py-2">{"Class"}</th>
                    <th className="text-left px-4 py-2">{"Period"}</th>
                    <th className="text-left px-4 py-2">{"Type"}</th>
                    <th className="text-left px-4 py-2">{"Method"}</th>
                    <th className="text-left px-4 py-2 cursor-pointer select-none hover:text-ocean-600" onClick={() => { setIncomeSortBy("paid_at"); setIncomeSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                      {"Date"} {incomeSortBy === "paid_at" ? (incomeSortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-right px-4 py-2 cursor-pointer select-none hover:text-ocean-600" onClick={() => { setIncomeSortBy("total"); setIncomeSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                      {"Total"} {incomeSortBy === "total" ? (incomeSortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-left px-4 py-2">{"Status"}</th>
                    <th className="px-4 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {incomePagedRows.map(row => row.source === "manual" ? (
                    <tr key={row.id} className="hover:bg-paper-tint">
                      <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.branch?.name ?? "—"}</NoTranslate></td>
                      <td className="px-4 py-2.5 font-medium">
                        <NoTranslate>{row.description}</NoTranslate>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">{"Manual"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.category ?? "—"}</NoTranslate></td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute">{new Date(row.occurred_at).toLocaleDateString("id-ID", { dateStyle: "short" })}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmtIDR(row.amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ok-50 text-ok-700">{"Recorded"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title={"Edit"}><Icon name="edit" className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={"Delete"}><Icon name="trash" className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="hover:bg-paper-tint">
                      <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.branch?.name ?? "—"}</NoTranslate></td>
                      <td className="px-4 py-2.5 font-medium"><NoTranslate>{row.member?.profile?.full_name ?? "—"}</NoTranslate></td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.class?.name ?? "—"}</NoTranslate></td>
                      <td className="px-4 py-2.5 text-xs"><NoTranslate>{row.period_label}</NoTranslate></td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-ocean-50 text-ocean-700 font-semibold">{row.type === "monthly" ? "Monthly" : row.type === "session_pack" ? "Session Pack" : row.type === "custom" ? "Custom" : row.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute capitalize">{row.paid_method ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-ink-mute">{row.paid_at ? new Date(row.paid_at).toLocaleDateString("id-ID", { dateStyle: "short" }) : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmtIDR(row.total)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === "paid" ? "bg-ok-50 text-ok-700" : row.status === "unpaid" ? "bg-warn-50 text-warn-700" : row.status === "partial" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"}`}>
                          {row.status === "paid" ? "Paid" : row.status === "unpaid" ? "Unpaid" : row.status === "partial" ? "Partial" : row.status === "school_covered" ? "School" : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
              <div className="text-ink-mute text-xs">{`${filteredIncome.length} rows · page ${incomeSafePage + 1}/${incomeTotalPages}`}</div>
              <div className="flex gap-1">
                {[{ label: "«", act: () => setIncomePage(0) }, { label: "‹", act: () => setIncomePage(p => Math.max(0, p - 1)) }, { label: "›", act: () => setIncomePage(p => Math.min(incomeTotalPages - 1, p + 1)) }, { label: "»", act: () => setIncomePage(incomeTotalPages - 1) }].map((btn, i) => (
                  <button key={i} onClick={btn.act} disabled={(i < 2 && incomeSafePage === 0) || (i >= 2 && incomeSafePage >= incomeTotalPages - 1)} className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">{btn.label}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
