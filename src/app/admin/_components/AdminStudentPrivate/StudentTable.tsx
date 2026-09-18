"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useStudentPrivateData } from "./useStudentPrivateData";

type StudentPrivateDataHook = ReturnType<typeof useStudentPrivateData>;

export default function StudentTable({ hook }: { hook: StudentPrivateDataHook }) {
  const {
    branches, coaches, loading,
    search, setSearch, filterBranchId, setFilterBranchId, filterCoachId, setFilterCoachId,
    showFilters, setShowFilters, activeFilterCount, filterLocationType, setFilterLocationType, resetFilters,
    filtered, openCreate, setDetailTarget, openAddSesi, openEdit, deleteStudent,
    scheduleSummary, locationSummary, coachName,
  } = hook;

  return (
    <>
      {/* Top Toolbar matching pen.dev o9hxIV */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          <div className="relative w-64">
            <Icon name="search" className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={"Search by name…"}
              className="w-full h-10 pl-9 pr-3 text-sm bg-paper border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
            />
          </div>

          {branches && (
            <select
              value={filterBranchId}
              onChange={e => setFilterBranchId(e.target.value)}
              className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
            >
              <option value="">{"All centers"}</option>
              {branches.map(b => <option key={b.id} value={b.id} translate="no">{b.name}</option>)}
            </select>
          )}

          <select
            value={filterCoachId}
            onChange={e => setFilterCoachId(e.target.value)}
            className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
          >
            <option value="">{"All coaches"}</option>
            {coaches.map(c => <option key={c.id} value={c.id} translate="no">{c.full_name}</option>)}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-10 rounded-xl border transition-colors ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-paper border-line text-ink-soft hover:bg-paper-tint hover:border-line-strong"}`}
          >
            <Icon name="settings" className="w-4 h-4" />
            {"Filter"}
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <Btn variant="primary" icon="plus" onClick={openCreate} className="!h-10 !rounded-xl">
          {"Add Private Student"}
        </Btn>
      </div>

      {showFilters && (
        <div className="bg-paper border border-line rounded-2xl p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{"Location"}</div>
            <select
              value={filterLocationType}
              onChange={e => setFilterLocationType(e.target.value)}
              className="w-full h-9 text-sm border border-line rounded-xl px-3 bg-paper outline-none focus:border-ocean-500"
            >
              <option value="">{"All locations"}</option>
              <option value="branch">{"This center's pool"}</option>
              <option value="external">{"Somewhere else"}</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-2 flex items-end justify-end pb-1">
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">
                {"Reset all filters"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {filterBranchId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 font-semibold ring-1 ring-ocean-200">
              <NoTranslate>{branches?.find(b => b.id === filterBranchId)?.name ?? "—"}</NoTranslate>
              <button type="button" onClick={() => setFilterBranchId("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterCoachId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 font-semibold ring-1 ring-ocean-200">
              <NoTranslate>{coaches.find(c => c.id === filterCoachId)?.full_name ?? "—"}</NoTranslate>
              <button type="button" onClick={() => setFilterCoachId("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterLocationType && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 font-semibold ring-1 ring-ocean-200">
              {filterLocationType === "branch" ? "This center's pool" : "Somewhere else"}
              <button type="button" onClick={() => setFilterLocationType("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          <button type="button" onClick={resetFilters} className="text-ink-mute hover:text-danger-600 transition ml-1">
            {"Clear all"}
          </button>
        </div>
      )}

      {/* Card matching pen.dev e97zeW */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="font-display font-bold text-base text-ink">{"Private Students"}</h3>
          <p className="text-xs text-ink-mute mt-0.5">{"Manage every private (1-on-1) student in one place — schedule, location, coach, and session count."}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
              <tr>
                <th className="px-5 py-2">{"Student"}</th>
                {branches && <th className="px-5 py-2">{"Center"}</th>}
                <th className="px-5 py-2">{"Coach"}</th>
                <th className="px-5 py-2">{"Schedule"}</th>
                <th className="px-5 py-2">{"Sessions"}</th>
                <th className="px-5 py-2 text-right">{"Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-paper-tint/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.profile?.full_name ?? "?"} size={32} />
                      <div>
                        <div className="font-semibold text-ink text-sm"><NoTranslate>{row.profile?.full_name}</NoTranslate></div>
                        <div className="text-[11px] font-mono text-ink-mute"><NoTranslate>{row.student_no || row.profile?.email || "—"}</NoTranslate></div>
                      </div>
                    </div>
                  </td>
                  {branches && (
                    <td className="px-5 py-3 text-ink-soft text-sm">
                      <NoTranslate>{row.branch?.name ?? "—"}</NoTranslate>
                    </td>
                  )}
                  <td className="px-5 py-3 text-ink-soft text-sm">
                    {coachName(row)}
                  </td>
                  <td className="px-5 py-3 text-ink-soft text-xs font-mono">
                    <div>{scheduleSummary(row)}</div>
                    {locationSummary(row) && <div className="text-[11px] text-ink-mute font-sans mt-0.5">{locationSummary(row)}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono font-bold text-ink text-sm">{row.remaining_sessions ?? 0}</span>
                    <span className="font-mono text-ink-faint text-xs"> / {row.total_sessions ?? 0}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailTarget(row)}
                        title={"Detail"}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors"
                      >
                        <Icon name="qr" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddSesi(row)}
                        title={"Add Sessions"}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-ocean-50 text-ocean-600 flex items-center justify-center transition-colors"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        title={"Edit"}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStudent(row)}
                        title={"Delete"}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-danger-50 text-ink-mute hover:text-danger-600 flex items-center justify-center transition-colors"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={branches ? 6 : 5} className="px-5 py-12 text-center text-ink-mute text-sm">
                    {"No private students yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
