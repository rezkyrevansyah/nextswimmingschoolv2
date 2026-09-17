"use client";
import Icon from "@/components/ui/Icon";
import type { AdminMemberHook } from "./_hook";
import { genderLabel } from "./_utils";

export default function MembersFilterBar({ hook }: { hook: AdminMemberHook }) {
  const {
    t, search, setSearch, tab, setTab, sortBy, setSortBy, sortDir, setSortDir,
    showFilters, setShowFilters, activeFilterCount,
    filterGender, setFilterGender, filterClass, setFilterClass,
    filterSchool, setFilterSchool, filterSessions, setFilterSessions,
    classes, schoolsList, resetFilters,
  } = hook;

  return (
    <div className="px-5 pt-4 pb-3 border-b border-line space-y-3">
      <div className="flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-500/10 transition">
        <Icon name="search" className="w-4 h-4 text-ink-faint shrink-0" />
        <input
          type="search"
          name="member_search"
          id="member_search_input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("admin.members.searchPlaceholder2")}
          className="flex-1 text-sm outline-none bg-transparent"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="text-ink-mute hover:text-ink transition">
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sort + Filter toggle + Tab row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tabs */}
        <div className="flex gap-1 bg-paper-deep rounded-xl p-1 flex-wrap">
          {[["all", t("admin.members.tabAll")], ["reguler", t("admin.members.tabRegular")], ["private", t("admin.members.tabPrivate")], ["school_affiliate", t("admin.members.tabAffiliate")], ["suspended", t("admin.members.tabSuspended")]].map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sort */}
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={e => { const [col, dir] = e.target.value.split(":"); setSortBy(col); setSortDir(dir as "asc" | "desc"); }}
            className="text-xs font-semibold border border-line rounded-lg px-2.5 py-1.5 bg-white text-ink-soft outline-none cursor-pointer hover:border-ocean-400 transition"
          >
            <option value="created_at:desc">{t("admin.members.sortNewest")}</option>
            <option value="created_at:asc">{t("admin.members.sortOldest")}</option>
            <option value="name:asc">{t("admin.members.sortNameAZ")}</option>
            <option value="name:desc">{t("admin.members.sortNameZA")}</option>
            <option value="date_start:asc">{t("admin.members.sortJoinedOld")}</option>
            <option value="date_start:desc">{t("admin.members.sortJoinedNew")}</option>
            <option value="sessions:asc">{t("admin.members.sortSessionsAsc")}</option>
            <option value="sessions:desc">{t("admin.members.sortSessionsDesc")}</option>
          </select>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
          >
            <Icon name="settings" className="w-3.5 h-3.5" />
            {t("admin.financial.filterBtn")}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-paper-tint border border-line rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldGenderFilter")}</div>
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
              <option value="">{t("admin.members.allOpt")}</option>
              <option value="male">{t("admin.approvement.genderMale")}</option>
              <option value="female">{t("admin.approvement.genderFemale")}</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldClassFilter2")}</div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
              <option value="">{t("admin.members.allClassesOpt3")}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {(tab === "all" || tab === "school_affiliate") && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldSchoolFilter")}</div>
              <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("admin.members.allSchoolsOpt")}</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {(tab === "all" || tab === "private") && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.members.fieldSessionsFilter")}</div>
              <select value={filterSessions} onChange={e => setFilterSessions(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("admin.members.allOpt")}</option>
                <option value="has">{t("admin.members.hasSessionsLeftOpt")}</option>
                <option value="low">{t("admin.members.lowSessionsOpt")}</option>
                <option value="none">{t("admin.members.noSessionsOpt")}</option>
              </select>
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">{t("admin.members.resetAllFiltersBtn")}</button>
            </div>
          )}
        </div>
      )}

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filterGender && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
              {genderLabel(t, filterGender)}
              <button type="button" onClick={() => setFilterGender("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterClass && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
              {classes.find(c => c.id === filterClass)?.name ?? t("admin.members.classPillFallback")}
              <button type="button" onClick={() => setFilterClass("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterSchool && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
              {schoolsList.find(s => s.id === filterSchool)?.name ?? t("admin.members.schoolPillFallback")}
              <button type="button" onClick={() => setFilterSchool("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterSessions && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
              {filterSessions === "has" ? t("admin.members.hasSessionsPill") : filterSessions === "low" ? t("admin.members.lowSessionsPill") : t("admin.members.noSessionsPill")}
              <button type="button" onClick={() => setFilterSessions("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          <button type="button" onClick={resetFilters} className="text-xs text-ink-mute hover:text-danger-600 transition ml-1">{t("admin.members.clearAllBtn")}</button>
        </div>
      )}
    </div>
  );
}
