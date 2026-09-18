"use client";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminMemberHook } from "./_hook";
import { genderLabel } from "./_utils";

export default function MembersFilterBar({ hook }: { hook: AdminMemberHook }) {
  const {
    search, setSearch, tab, setTab, sortBy, setSortBy, sortDir, setSortDir,
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
          placeholder={"Search name, email, or phone number…"}
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
          {[["all", "All"], ["reguler", "Regular"], ["private", "Private"], ["school_affiliate", "Affiliate"], ["suspended", "Suspend"]].map(([id, l]) => (
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
            <option value="created_at:desc">{"Newest"}</option>
            <option value="created_at:asc">{"Oldest"}</option>
            <option value="name:asc">{"Name A–Z"}</option>
            <option value="name:desc">{"Name Z–A"}</option>
            <option value="date_start:asc">{"Joined earliest"}</option>
            <option value="date_start:desc">{"Joined latest"}</option>
            <option value="sessions:asc">{"Sessions left ↑"}</option>
            <option value="sessions:desc">{"Sessions left ↓"}</option>
          </select>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
          >
            <Icon name="settings" className="w-3.5 h-3.5" />
            {"Filter"}
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
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{"Gender"}</div>
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
              <option value="">{"All"}</option>
              <option value="male">{"Male"}</option>
              <option value="female">{"Female"}</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{"Class"}</div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
              <option value="">{"All Classes"}</option>
              {classes.map(c => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
            </select>
          </div>
          {(tab === "all" || tab === "school_affiliate") && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{"School"}</div>
              <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{"All Schools"}</option>
                {schoolsList.map(s => <option key={s.id} value={s.id} translate="no">{s.name}</option>)}
              </select>
            </div>
          )}
          {(tab === "all" || tab === "private") && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{"Sessions"}</div>
              <select value={filterSessions} onChange={e => setFilterSessions(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{"All"}</option>
                <option value="has">{"Has sessions left"}</option>
                <option value="low">{"≤ 3 sessions left"}</option>
                <option value="none">{"Sessions depleted"}</option>
              </select>
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">{"Reset all filters"}</button>
            </div>
          )}
        </div>
      )}

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filterGender && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
              {genderLabel(filterGender)}
              <button type="button" onClick={() => setFilterGender("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterClass && (() => {
            const clsName = classes.find(c => c.id === filterClass)?.name;
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                {clsName ? <NoTranslate>{clsName}</NoTranslate> : "Class"}
                <button type="button" onClick={() => setFilterClass("")}><Icon name="x" className="w-3 h-3" /></button>
              </span>
            );
          })()}
          {filterSchool && (() => {
            const schoolName = schoolsList.find(s => s.id === filterSchool)?.name;
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                {schoolName ? <NoTranslate>{schoolName}</NoTranslate> : "School"}
                <button type="button" onClick={() => setFilterSchool("")}><Icon name="x" className="w-3 h-3" /></button>
              </span>
            );
          })()}
          {filterSessions && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
              {filterSessions === "has" ? "Has sessions" : filterSessions === "low" ? "≤3 left" : "Sessions depleted"}
              <button type="button" onClick={() => setFilterSessions("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          <button type="button" onClick={resetFilters} className="text-xs text-ink-mute hover:text-danger-600 transition ml-1">{"Clear all"}</button>
        </div>
      )}
    </div>
  );
}
