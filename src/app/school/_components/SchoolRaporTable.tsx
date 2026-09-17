"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { SchoolRaporHook } from "./schoolRaporHook";

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: "asc" | "desc" }) {
  return (
    <span className={`ml-1 text-[10px] transition-opacity ${sortBy === col ? "opacity-100 text-ocean-500" : "opacity-0 group-hover:opacity-40"}`}>
      {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function SchoolRaporTable({ hook }: { hook: SchoolRaporHook }) {
  const { t } = useLocale();
  const {
    students, loading, search, setSearch, sortBy, sortDir, setPage,
    showFilters, setShowFilters, activeFilterCount, classList, coachList,
    filterClass, setFilterClass, filterCoach, setFilterCoach, filterStatus, setFilterStatus, resetFilters,
    selectMode, setSelectMode, selected, setSelected,
    filteredSorted, paginated, totalPages, safePage, totalDone,
    toggleSort, setOpen, handlePrintSelected, handlePrintOne,
    bulkDownloading, bulkDownloadingLabel, downloadingId,
    setSortBy, setSortDir,
  } = hook;

  return (
    <Card padded={false}>
      {/* Toolbar */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle sub={`${students.length} ${t("school.absensi.colStudent").toLowerCase()}`}>{t("school.rapor.title")}</SectionTitle>
          {/* Bulk select mode toggle */}
          {!selectMode ? (
            <div className="flex items-center gap-2">
              {totalDone > 0 && (
                <button
                  type="button"
                  onClick={() => { setSelectMode(true); setSelected(new Set()); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-white text-ink-soft hover:border-ocean-400 transition"
                >
                  <Icon name="check" className="w-3.5 h-3.5" />
                  {t("school.rapor.downloadAllZipBtn")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink-soft">{selected.size} dipilih</span>
              <button type="button" onClick={() => setSelected(new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)))}
                className="text-xs font-semibold text-ocean-600 hover:underline">Pilih semua ({filteredSorted.filter(s => s.is_filled).length})</button>
              <button type="button" onClick={() => setSelected(new Set())}
                className="text-xs font-semibold text-ink-mute hover:underline">{t("common.actions.cancel")}</button>
              <Btn variant="primary" size="sm" icon="download" disabled={selected.size === 0 || bulkDownloading} onClick={handlePrintSelected}>
                {bulkDownloading ? bulkDownloadingLabel : `${t("school.rapor.downloadPdfBtn")} (${selected.size})`}
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>{t("common.actions.close")}</Btn>
            </div>
          )}
        </div>

        {/* Search + sort + filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-500/10 transition">
            <Icon name="search" className="w-4 h-4 text-ink-faint shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("school.rapor.searchPlaceholder")}
              className="flex-1 text-sm outline-none bg-transparent min-w-0"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-ink-mute hover:text-ink transition shrink-0">
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={e => { const [col, dir] = e.target.value.split(":"); setSortBy(col); setSortDir(dir as "asc" | "desc"); }}
            className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none cursor-pointer hover:border-ocean-400 transition"
          >
            <option value="name:asc">{t("school.absensi.colStudent")} A–Z</option>
            <option value="name:desc">{t("school.absensi.colStudent")} Z–A</option>
            <option value="class:asc">{t("school.absensi.colClass")} A–Z</option>
            <option value="coach:asc">{t("school.rapor.colCoach")} A–Z</option>
            <option value="status:desc">{t("school.rapor.statusComplete")}</option>
            <option value="status:asc">{t("school.rapor.statusIncomplete")}</option>
          </select>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
          >
            <Icon name="settings" className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("common.actions.filter")}</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-paper-tint border border-line rounded-xl p-4 grid sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("school.absensi.colClass")}</div>
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("school.rapor.filterAllClasses")}</option>
                {classList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("school.rapor.colCoach")}</div>
              <select value={filterCoach} onChange={e => setFilterCoach(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("school.rapor.filterAllCoaches")}</option>
                {coachList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("school.rapor.colStatus")}</div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("school.rapor.filterAllStatus")}</option>
                <option value="done">{t("school.rapor.statusComplete")}</option>
                <option value="pending">{t("school.rapor.statusIncomplete")}</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-3 flex justify-end pt-1">
                <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">Reset filter</button>
              </div>
            )}
          </div>
        )}

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterClass && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                {filterClass}
                <button type="button" onClick={() => setFilterClass("")}><Icon name="x" className="w-3 h-3" /></button>
              </span>
            )}
            {filterCoach && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                {filterCoach}
                <button type="button" onClick={() => setFilterCoach("")}><Icon name="x" className="w-3 h-3" /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 text-xs font-semibold ring-1 ring-ocean-200">
                {filterStatus === "done" ? t("school.rapor.statusComplete") : t("school.rapor.statusIncomplete")}
                <button type="button" onClick={() => setFilterStatus("")}><Icon name="x" className="w-3 h-3" /></button>
              </span>
            )}
            <button type="button" onClick={resetFilters} className="text-xs text-ink-mute hover:text-danger-600 transition ml-1">Reset</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-ink-mute">{t("school.shell.loading")}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
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
                  <th className="text-left py-3 px-5 font-bold cursor-pointer select-none group" onClick={() => toggleSort("name")}>
                    {t("school.absensi.colStudent")} <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className="text-left py-3 font-bold">
                    {t("school.rapor.colSchoolGrade")}
                  </th>
                  <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("class")}>
                    {t("school.absensi.colClass")} <SortIcon col="class" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("coach")}>
                    {t("school.rapor.colCoach")} <SortIcon col="coach" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className="text-left py-3 font-bold cursor-pointer select-none group" onClick={() => toggleSort("status")}>
                    {t("school.rapor.colStatus")} <SortIcon col="status" sortBy={sortBy} sortDir={sortDir} />
                  </th>
                  <th className="text-right py-3 px-5 font-bold">{t("school.rapor.colAction")}</th>
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
                          <div className="font-semibold text-ink">{s.full_name}</div>
                        </div>
                      </td>
                      <td className="text-ink-soft text-sm">{s.school_grade ?? "—"}</td>
                      <td className="text-ink-soft text-sm">{s.class_name}</td>
                      <td className="text-ink-soft text-sm">{s.coach_name}</td>
                      <td>{s.is_filled ? <Status kind="approved">{t("school.rapor.statusComplete")}</Status> : <Status kind="pending">{t("school.rapor.statusIncomplete")}</Status>}</td>
                      <td className="text-right px-5">
                        <div className="inline-flex gap-1.5">
                          <Btn variant="soft" size="sm" icon="eye" disabled={!s.is_filled} onClick={() => setOpen(s)}>{t("common.actions.view")}</Btn>
                          <Btn variant="ghost" size="sm" icon="download" disabled={!s.is_filled || downloadingId === s.id} onClick={() => void handlePrintOne(s)}>
                            {downloadingId === s.id ? "…" : t("school.rapor.downloadPdfBtn")}
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={selectMode ? 7 : 6} className="py-14 text-center">
                      <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                      <div className="text-sm font-semibold text-ink-mute">{t("school.rapor.empty")}</div>
                      {(search || activeFilterCount > 0) && (
                        <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">Reset filter</button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-line">
            {paginated.map(s => {
              const isChecked = selected.has(s.id);
              return (
                <div
                  key={s.id}
                  className={`px-4 py-3.5 flex items-center gap-3 ${selectMode && s.is_filled ? "cursor-pointer active:bg-paper-tint" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                  onClick={() => {
                    if (!selectMode || !s.is_filled) return;
                    setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                  }}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="rounded border-line accent-ocean-600 shrink-0"
                      disabled={!s.is_filled}
                      checked={isChecked}
                      onChange={() => setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <Avatar name={s.full_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink truncate">{s.full_name}</div>
                    <div className="text-xs text-ink-mute truncate">
                      {s.school_grade && <>{s.school_grade} · </>}
                      {s.class_name} · {s.coach_name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {s.is_filled ? <Status kind="approved">{t("school.rapor.statusComplete")}</Status> : <Status kind="pending">{t("school.rapor.statusIncomplete")}</Status>}
                    {s.is_filled && !selectMode && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOpen(s)}
                          className="h-8 px-2.5 rounded-lg bg-ocean-50 text-ocean-700 hover:bg-ocean-100 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePrintOne(s)}
                          disabled={downloadingId === s.id}
                          className="h-8 px-2.5 rounded-lg bg-paper-tint text-ink-soft hover:bg-paper-deep text-xs font-semibold flex items-center gap-1 transition active:scale-95 disabled:opacity-60"
                          title={t("school.rapor.downloadPdfBtn")}
                        >
                          <Icon name="download" className="w-3.5 h-3.5" />
                          <span>{downloadingId === s.id ? "…" : "PDF"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSorted.length === 0 && (
              <div className="py-14 text-center">
                <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                <div className="text-sm font-semibold text-ink-mute">{t("school.rapor.empty")}</div>
                {(search || activeFilterCount > 0) && (
                  <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">Reset filter</button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-ink-mute tabular-nums">
                {filteredSorted.length} {t("school.absensi.colStudent").toLowerCase()} · {t("school.absensi.paginationInfo", { page: safePage + 1, total: totalPages })}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
                <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition hidden sm:inline-flex">‹ {t("school.absensi.prevBtn")}</button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                  .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                    if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((item, idx) => item === "…"
                    ? <span key={`e${idx}`} className="px-2 text-ink-faint text-sm">…</span>
                    : <button key={item} type="button" onClick={() => setPage(item as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${safePage === item ? "bg-ocean-600 text-white" : "border border-line text-ink-mute hover:bg-paper-tint"}`}>{(item as number) + 1}</button>
                  )
                }
                <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition hidden sm:inline-flex">{t("school.absensi.nextBtn")} ›</button>
                <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
