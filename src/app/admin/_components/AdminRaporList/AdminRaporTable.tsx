"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useAdminRaporData } from "./useAdminRaporData";

type AdminRaporDataHook = ReturnType<typeof useAdminRaporData>;

export default function AdminRaporTable({ hook }: { hook: AdminRaporDataHook }) {
  const {
    periods, setSelectedPeriodId, students, loading, setOpen,
    search, setSearch, filterClass, setFilterClass, filterCoach, setFilterCoach, filterStatus, setFilterStatus, setPage,
    selectMode, setSelectMode, selected, setSelected, downloadingId, bulkDownloading,
    effectivePeriodId,
    classList, coachList, activeFilterCount, resetFilters,
    filteredSorted, totalPages, safePage, paginated, totalDone,
    handleDownloadOne, handleDownloadZip,
  } = hook;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <SectionTitle sub={`${students.length} students · ${totalDone} report cards available`}>{"Student Report List"}</SectionTitle>
        {periods.length > 0 && (
          <select
            value={effectivePeriodId}
            onChange={e => { setSelectedPeriodId(e.target.value); setSelectMode(false); setSelected(new Set()); setPage(0); }}
            className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none cursor-pointer hover:border-ocean-400 transition"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.label}{p.is_open ? " (active)" : ""}</option>
            ))}
          </select>
        )}
      </div>

      {!effectivePeriodId ? (
        <Card><p className="text-ink-mute text-sm">{"No report periods for this center yet."}</p></Card>
      ) : (
        <Card padded={false}>
          <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {!selectMode ? (
                totalDone > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectMode(true); setSelected(new Set()); }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-white text-ink-soft hover:border-ocean-400 transition"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    {"Select & Download"}
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink-soft">{`${selected.size} selected`}</span>
                  <button type="button" onClick={() => setSelected(new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)))}
                    className="text-xs font-semibold text-ocean-600 hover:underline">{`Select all (${filteredSorted.filter(s => s.is_filled).length})`}</button>
                  <button type="button" onClick={() => setSelected(new Set())}
                    className="text-xs font-semibold text-ink-mute hover:underline">{"Cancel selection"}</button>
                  <Btn variant="primary" size="sm" icon="download" disabled={selected.size === 0 || bulkDownloading}
                    onClick={() => void handleDownloadZip(students.filter(s => selected.has(s.id) && s.is_filled))}>
                    {bulkDownloading ? "Downloading…" : `Download ZIP (${selected.size})`}
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>{"Done"}</Btn>
                </div>
              )}
              {totalDone > 0 && !selectMode && (
                <Btn variant="soft" size="sm" icon="download" disabled={bulkDownloading}
                  onClick={() => void handleDownloadZip(filteredSorted.filter(s => s.is_filled))}>
                  {bulkDownloading ? "Downloading…" : `Download All (${filteredSorted.filter(s => s.is_filled).length})`}
                </Btn>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-500/10 transition">
                <Icon name="search" className="w-4 h-4 text-ink-faint shrink-0" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder={"Search name, class, or coach…"}
                  className="flex-1 text-sm outline-none bg-transparent min-w-0"
                />
              </div>
              <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(0); }} className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none">
                <option value="">{"All Classes"}</option>
                {classList.map(c => <option key={c} value={c} translate="no">{c}</option>)}
              </select>
              <select value={filterCoach} onChange={e => { setFilterCoach(e.target.value); setPage(0); }} className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none">
                <option value="">{"All Coaches"}</option>
                {coachList.map(c => <option key={c} value={c} translate="no">{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }} className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none">
                <option value="">{"All Statuses"}</option>
                <option value="done">{"Available"}</option>
                <option value="pending">{"Not filled"}</option>
              </select>
              {activeFilterCount > 0 && (
                <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">{"Reset filter"}</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-ink-mute">{"Loading data…"}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                      {selectMode && <th className="w-10 py-3 pl-4">
                        <input
                          type="checkbox"
                          className="rounded border-line accent-ocean-600"
                          checked={filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.filter(s => s.is_filled).every(s => selected.has(s.id))}
                          onChange={e => setSelected(e.target.checked ? new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)) : new Set())}
                        />
                      </th>}
                      <th className="text-left py-3 px-5 font-bold">{"Student"}</th>
                      <th className="text-left py-3 font-bold">{"Class"}</th>
                      <th className="text-left py-3 font-bold">{"Coach"}</th>
                      <th className="text-left py-3 font-bold">{"Report Status"}</th>
                      <th className="text-right py-3 px-5 font-bold">{"Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginated.map(s => {
                      const isChecked = selected.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-paper-tint transition-colors ${selectMode && s.is_filled ? "cursor-pointer" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                          onClick={() => {
                            if (!selectMode || !s.is_filled) return;
                            setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                          }}
                        >
                          {selectMode && (
                            <td className="pl-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-line accent-ocean-600"
                                disabled={!s.is_filled}
                                checked={isChecked}
                                onChange={() => setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}
                              />
                            </td>
                          )}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.full_name} size={36} />
                              <div className="font-semibold text-ink"><NoTranslate>{s.full_name}</NoTranslate></div>
                            </div>
                          </td>
                          <td className="text-ink-soft text-sm"><NoTranslate>{s.class_name}</NoTranslate></td>
                          <td className="text-ink-soft text-sm"><NoTranslate>{s.coach_name}</NoTranslate></td>
                          <td>{s.is_filled ? <Status kind="approved">{"Available"}</Status> : <Status kind="pending">{"Not filled"}</Status>}</td>
                          <td className="text-right px-5">
                            <div className="inline-flex gap-1.5">
                              <Btn variant="soft" size="sm" icon="eye" disabled={!s.is_filled} onClick={() => setOpen(s)}>{"View"}</Btn>
                              <Btn variant="ghost" size="sm" icon="download" disabled={!s.is_filled || downloadingId === s.id} onClick={() => void handleDownloadOne(s)}>
                                {downloadingId === s.id ? "Downloading…" : "Download PDF"}
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSorted.length === 0 && (
                      <tr>
                        <td colSpan={selectMode ? 6 : 5} className="py-14 text-center">
                          <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                          <div className="text-sm font-semibold text-ink-mute">{"No matching students"}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-line">
                  <span className="text-xs text-ink-mute">{`Page ${safePage + 1} of ${totalPages}`}</span>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                      className="p-1.5 rounded-lg border border-line disabled:opacity-40 hover:border-ocean-400 transition">
                      <Icon name="chevron-left" className="w-4 h-4" />
                    </button>
                    <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      className="p-1.5 rounded-lg border border-line disabled:opacity-40 hover:border-ocean-400 transition">
                      <Icon name="chevron-right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
