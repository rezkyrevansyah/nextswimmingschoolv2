"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import type { useActivityLogData } from "./useActivityLogData";

type ActivityLogDataHook = ReturnType<typeof useActivityLogData>;

export default function ActivityLogFilterBar({ hook }: { hook: ActivityLogDataHook }) {
  const { t } = useLocale();
  const {
    branches, total, statsToday, statsWeek,
    filterBranch, setFilterBranch, filterEntity, setFilterEntity, filterAction, setFilterAction,
    filterRole, setFilterRole, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    search, setSearch, showFilters, setShowFilters,
    activeFilterCount, resetFilters, entityLabel, actionLabel,
  } = hook;

  return (
    <>
      {/* ── Stat Cards (frame Kt583) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: TODAY */}
        <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">
              {t("owner.activityLog.statToday")}
            </div>
            <div className="font-display font-extrabold text-2xl text-ocean-600 mt-1 tabular-nums">
              {statsToday.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-xs text-ink-mute mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ocean-500 shrink-0" />
            <span>Aktivitas log hari ini</span>
          </div>
        </div>

        {/* Card 2: LAST 7 DAYS */}
        <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">
              {t("owner.activityLog.statWeek")}
            </div>
            <div className="font-display font-extrabold text-2xl text-wave-600 mt-1 tabular-nums">
              {statsWeek.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-xs text-ink-mute mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-wave-500 shrink-0" />
            <span>7 hari terakhir</span>
          </div>
        </div>

        {/* Card 3: TOTAL */}
        <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">
              {t("owner.activityLog.statTotal")}
            </div>
            <div className="font-display font-extrabold text-2xl text-ok-600 mt-1 tabular-nums">
              {total.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-xs text-ink-mute mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ok-500 shrink-0" />
            <span>Total log terekam</span>
          </div>
        </div>
      </div>

      {/* ── Search + Filter Bar (frame XfBMN) ── */}
      <div className="bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex gap-2.5 flex-wrap items-center">
          <div className="flex-1 min-w-56 relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("owner.activityLog.searchPlaceholder")}
              className="w-full h-10 pl-10 pr-3 text-sm rounded-xl border border-line bg-paper-tint/50 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 focus:bg-paper transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(f => !f)}
            className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
              showFilters
                ? "bg-ocean-50 border-ocean-300 text-ocean-700 shadow-xs"
                : "border-line bg-paper text-ink-soft hover:bg-paper-tint hover:border-ocean-200"
            }`}
          >
            <Icon name="filter" className="w-4 h-4" />
            <span>{t("owner.activityLog.filterBtn")}</span>
            {activeFilterCount > 0 && (
              <span className="bg-ocean-600 text-white text-[11px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 text-xs font-semibold text-ocean-600 hover:text-ocean-700 px-3 hover:underline transition-colors"
            >
              {t("owner.activityLog.resetBtn")}
            </button>
          )}

          <span className="text-xs text-ink-mute font-medium self-center ml-auto">
            {t("owner.activityLog.activityCount", { count: total })}
          </span>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-3 border-t border-line">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterBranch")}</label>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterEntity")}</label>
              <select
                value={filterEntity}
                onChange={e => setFilterEntity(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allEntities")}</option>
                {Object.entries(entityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterAction")}</label>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allActions")}</option>
                {Object.entries(actionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterRole")}</label>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allRoles")}</option>
                <option value="owner">{t("owner.activityLog.roleOwner")}</option>
                <option value="admin">{t("owner.activityLog.roleAdmin")}</option>
                <option value="coach">{t("owner.activityLog.roleCoach")}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterDateFrom")}</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink px-3 focus:outline-none focus:border-ocean-500"
              >
              </input>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterDateTo")}</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink px-3 focus:outline-none focus:border-ocean-500"
              >
              </input>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
