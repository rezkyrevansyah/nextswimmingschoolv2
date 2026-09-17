"use client";
import Btn from "@/components/ui/Btn";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { FinancialPreset } from "./_types";
import { startOfMonthISO, endOfMonthISO } from "./_utils";
import type { FinancialHook } from "./index";

export default function FinancialFilterBar({ hook }: { hook: FinancialHook }) {
  const { t } = useLocale();
  const {
    financialPreset, applyFinancialPreset, financialFrom, setFinancialFrom, financialTo, setFinancialTo,
    downloadFinancialExcel, exportingExcel,
  } = hook;

  return (
    <div className="bg-paper border border-line rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {([
            { id: "this_month", label: t("owner.financial.presetThisMonth") },
            { id: "last_month", label: t("owner.financial.presetLastMonth") },
            { id: "custom", label: t("owner.financial.presetCustom") },
            { id: "multi_month", label: t("owner.financial.presetMultiMonth") },
          ] as { id: FinancialPreset; label: string }[]).map(p => (
            <button
              key={p.id}
              onClick={() => applyFinancialPreset(p.id)}
              className={cn(
                "h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                financialPreset === p.id
                  ? "bg-ocean-600 text-white shadow-xs"
                  : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Btn variant="soft" size="sm" icon="download" onClick={downloadFinancialExcel} disabled={exportingExcel}>
          {exportingExcel ? t("owner.financial.exportingExcel") : t("owner.financial.exportExcelBtn")}
        </Btn>
      </div>

      {financialPreset === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">{t("owner.financial.filterFromLabel")}</label>
            <input type="date" value={financialFrom} onChange={e => setFinancialFrom(e.target.value)}
              className="h-8 text-xs rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500" />
          </div>
          <span className="text-ink-faint text-sm mt-4">—</span>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">{t("owner.financial.filterToLabel")}</label>
            <input type="date" value={financialTo} onChange={e => setFinancialTo(e.target.value)}
              className="h-8 text-xs rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500" />
          </div>
        </div>
      )}
      {financialPreset === "multi_month" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">{t("owner.financial.filterFromLabel")}</label>
            <input type="month" value={financialFrom.slice(0, 7)}
              onChange={e => setFinancialFrom(startOfMonthISO(new Date(e.target.value + "-01")))}
              className="h-8 text-xs rounded-xl border border-line bg-paper px-3 font-mono font-semibold text-ink focus:outline-none focus:border-ocean-500" />
          </div>
          <span className="text-ink-faint text-sm mt-4">—</span>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">{t("owner.financial.filterToLabel")}</label>
            <input type="month" value={financialTo.slice(0, 7)}
              onChange={e => setFinancialTo(endOfMonthISO(new Date(e.target.value + "-01")))}
              className="h-8 text-xs rounded-xl border border-line bg-paper px-3 font-mono font-semibold text-ink focus:outline-none focus:border-ocean-500" />
          </div>
        </div>
      )}
      {(financialPreset === "this_month" || financialPreset === "last_month") && (
        <div className="text-xs text-ink-mute font-medium">{financialFrom} — {financialTo}</div>
      )}
    </div>
  );
}
