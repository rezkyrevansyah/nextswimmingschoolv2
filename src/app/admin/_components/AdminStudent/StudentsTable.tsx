"use client";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { calcAge } from "../../_utils";
import type { AdminStudentHook } from "./_hook";

export default function StudentsTable({ hook }: { hook: AdminStudentHook }) {
  const {
    loading, qrSelectMode, filteredSorted, selectedQR, setSelectedQR, sortBy, toggleSort, sortDir,
    paginated, setDetail, setDetailTab, setAttLoaded, setBillsLoaded, setAttendances, setBills,
    setAttClassFilter, setRegProofUrl, loadRegProof, totalPages, safePage, setPage,
    resetFilters, setSearch, search, activeFilterCount,
  } = hook;

  if (loading) return <div className="p-10 text-center text-ink-mute">{"Loading data…"}</div>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              {qrSelectMode && <th className="w-10 py-3 pl-4">
                <input
                  type="checkbox"
                  className="rounded border-line accent-ocean-600"
                  checked={filteredSorted.length > 0 && filteredSorted.every(m => selectedQR.has(m.id))}
                  onChange={e => setSelectedQR(e.target.checked ? new Set(filteredSorted.map(m => m.id)) : new Set())}
                />
              </th>}
              <th
                className="text-left py-3 px-5 font-bold cursor-pointer select-none group"
                onClick={() => toggleSort("name")}
              >
                <span className="inline-flex items-center gap-1">
                  {"Student"}
                  <span className={`transition-opacity ${sortBy === "name" ? "opacity-100 text-ocean-600" : "opacity-0 group-hover:opacity-40"}`}>
                    {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </span>
              </th>
              <th className="text-left py-3 font-bold hidden sm:table-cell">{"Type"}</th>
              <th className="text-left py-3 font-bold hidden md:table-cell">{"Class"}</th>
              <th className="text-left py-3 font-bold">{"Status"}</th>
              {!qrSelectMode && <th className="px-5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {paginated.map((m) => {
              const cls = m.student_classes?.map(mc => mc.class?.name).filter(Boolean).join(", ") ?? "—";
              const fullName = m.profile?.full_name ?? "—";
              const age = m.profile?.birth_date ? calcAge(m.profile.birth_date) : null;
              const isChecked = selectedQR.has(m.id);
              return (
                <tr
                  key={m.id}
                  className={`hover:bg-paper-tint cursor-pointer ${qrSelectMode && isChecked ? "bg-ocean-50" : ""}`}
                  onClick={() => {
                    if (qrSelectMode) {
                      setSelectedQR(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; });
                    } else {
                      setDetail(m); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); setAttendances([]); setBills([]); setAttClassFilter(""); setRegProofUrl(null); loadRegProof(m.id);
                    }
                  }}
                >
                  {qrSelectMode && (
                    <td className="pl-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-line accent-ocean-600" checked={isChecked}
                        onChange={() => setSelectedQR(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; })} />
                    </td>
                  )}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} src={m.profile?.avatar_url ?? undefined} size={38} />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate max-w-[120px] sm:max-w-none"><NoTranslate>{fullName}</NoTranslate></div>
                        {age && <div className="text-xs text-ink-mute">{`${age} y`}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell"><Status kind={m.type === "private" ? "substitute" : m.type === "school_affiliate" ? "school_covered" : "active"} dot={false}>{m.type === "reguler" ? "Regular" : m.type === "private" ? "Private" : "Affiliate"}</Status></td>
                  <td className="text-ink-soft text-xs hidden md:table-cell max-w-[150px] truncate"><NoTranslate>{cls}</NoTranslate></td>
                  <td><Status kind={m.status === "suspended" ? "suspended" : "active"}>{m.status === "suspended" ? "Suspend" : "Active"}</Status></td>
                  {!qrSelectMode && <td className="px-5"><button className="text-ink-mute hover:text-ocean-600 p-1.5"><Icon name="eye" className="w-4 h-4" /></button></td>}
                </tr>
              );
            })}
            {filteredSorted.length === 0 && (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                  <div className="text-sm font-semibold text-ink-mute">{"No matching students"}</div>
                  {(search || activeFilterCount > 0) && (
                    <button type="button" onClick={() => { resetFilters(); setSearch(""); }} className="mt-2 text-xs text-ocean-600 hover:underline font-semibold">{"Clear all filters"}</button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-ink-mute tabular-nums">
            {`${filteredSorted.length} student · page ${safePage + 1} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(0)} className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
            <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">{"‹ Previous"}</button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) => item === "…"
                ? <span key={`e${idx}`} className="px-2 text-ink-faint text-sm">…</span>
                : <button key={item} type="button" onClick={() => setPage(item as number)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${safePage === item ? "bg-ocean-600 text-white" : "border border-line text-ink-mute hover:bg-paper-tint"}`}>{(item as number) + 1}</button>
              )
            }
            <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">{"Next ›"}</button>
            <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)} className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
          </div>
        </div>
      )}
    </>
  );
}
