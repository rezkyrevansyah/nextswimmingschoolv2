"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import type { AdminCompetitionHook } from "./_hook";

export default function CompetitionsTab({ hook }: { hook: AdminCompetitionHook }) {
  const {
    search, setSearch, levelFilter, setLevelFilter, openCreateComp,
    loading, filteredComps, setSelectedComp, loadParticipations, openEditComp, handleDeleteComp,
  } = hook;

  return (
    <div className="space-y-4">
      {/* Actions Header & Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          <div className="relative w-64">
            <Icon name="search" className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={"Search competition, organizer, location..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-paper border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
            />
          </div>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
          >
            <option value="all">{"All Levels"}</option>
            <option value="internal">{"Internal"}</option>
            <option value="local">{"Local / City"}</option>
            <option value="regional">{"Regional / Province"}</option>
            <option value="national">{"National"}</option>
            <option value="international">{"International"}</option>
          </select>
        </div>
        <Btn variant="primary" icon="plus" onClick={openCreateComp} className="!h-10 !rounded-xl">
          {"Add Competition"}
        </Btn>
      </div>

      {/* Competitions Table */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-ink-mute text-sm">{"Loading competition data..."}</div>
        ) : filteredComps.length === 0 ? (
          <div className="py-12 text-center text-ink-mute text-sm">
            {"No competitions registered yet. Click Add Competition to record a new event."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                <tr>
                  <th className="py-2 px-5 min-w-[240px]">{"Competition Name"}</th>
                  <th className="py-2 px-5 min-w-[160px] whitespace-nowrap">{"Date & Location"}</th>
                  <th className="py-2 px-5 min-w-[180px]">Penyelenggara</th>
                  <th className="py-2 px-5 text-center w-28 whitespace-nowrap">Level</th>
                  <th className="py-2 px-5 text-center w-20 whitespace-nowrap">Peserta</th>
                  <th className="py-2 px-5 text-center w-24 whitespace-nowrap">Medali</th>
                  <th className="py-2 px-5 text-right w-40 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredComps.map(comp => (
                  <tr key={comp.id} className="hover:bg-paper-tint/60 transition-colors">
                    <td className="py-3 px-5 min-w-[240px]">
                      <div className="font-bold text-ink leading-snug"><NoTranslate>{comp.name}</NoTranslate></div>
                      {comp.description && <div className="text-xs text-ink-mute mt-0.5 line-clamp-1 max-w-md"><NoTranslate>{comp.description}</NoTranslate></div>}
                    </td>
                    <td className="py-3 px-5 min-w-[160px]">
                      <div className="font-medium text-ink whitespace-nowrap flex items-center gap-1.5 text-xs">
                        <Icon name="calendar" className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                        <span>{fmtDate(comp.start_date)}</span>
                        {comp.end_date && comp.end_date !== comp.start_date && (
                          <span className="text-ink-mute font-normal"> – {fmtDate(comp.end_date)}</span>
                        )}
                      </div>
                      {(comp.location || comp.city) && (
                        <div className="text-[11px] text-ink-mute mt-0.5 flex items-center gap-1 line-clamp-1 max-w-[220px]">
                          <Icon name="mapPin" className="w-3 h-3 text-ink-faint shrink-0" />
                          <span className="truncate"><NoTranslate>{comp.location || comp.city}</NoTranslate></span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-5 min-w-[180px] text-ink-soft text-xs leading-relaxed">
                      <span className="line-clamp-2"><NoTranslate>{comp.organizer || "—"}</NoTranslate></span>
                    </td>
                    <td className="py-3 px-5 text-center whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ocean-50 text-ocean-700 border border-ocean-200/80">
                        {comp.level}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center font-bold text-ink whitespace-nowrap font-mono">
                      {comp.participations_count ?? 0}
                    </td>
                    <td className="py-3 px-5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${comp.medals_count ? "bg-amber-50 text-amber-900 border border-amber-300/80" : "text-ink-mute bg-paper-tint border border-line"}`}>
                        🏆 {comp.medals_count ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComp(comp);
                            loadParticipations(comp.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5 text-ink-mute" />
                          <span>Peserta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditComp(comp)}
                          title={"Edit"}
                          className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink inline-flex items-center justify-center transition-colors"
                        >
                          <Icon name="edit" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComp(comp)}
                          title="Delete"
                          className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-danger-50 text-ink-mute hover:text-danger-600 inline-flex items-center justify-center transition-colors"
                        >
                          <Icon name="trash" className="w-3.5 h-3.5" />
                        </button>
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
