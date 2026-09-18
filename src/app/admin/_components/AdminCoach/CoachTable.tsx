"use client";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { waLink } from "@/lib/utils";
import type { useCoachList } from "./useCoachList";

type CoachListHook = ReturnType<typeof useCoachList>;

export default function CoachTable({ hook, onSelect }: { hook: CoachListHook; onSelect: (c: ReturnType<typeof useCoachList>["pagedCoaches"][number]) => void }) {
  const {
    loading, isSuspended, isArchived, coachStatus, visibleCoaches, showArchived,
    pagedCoaches, totalPages, safePage, setPage,
  } = hook;

  return (
    <Card padded={false}>
      {loading ? (
        <div className="p-10 text-center text-ink-mute">{"Loading data…"}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">{"Coach"}</th>
                <th className="text-left py-3 font-bold hidden sm:table-cell">{"Email"}</th>
                <th className="text-left py-3 font-bold">{"Status"}</th>
                <th className="text-left py-3 font-bold hidden md:table-cell">{"Phone"}</th>
                <th className="text-left py-3 font-bold hidden md:table-cell">{"Classes"}</th>
                <th className="py-3 px-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pagedCoaches.map((c) => {
                const suspended = isSuspended(c);
                const archived = isArchived(c);
                const assignedClasses = c.class_coaches?.filter(cc => cc.class) ?? [];
                return (
                  <tr key={c.id} className={`hover:bg-paper-tint cursor-pointer${archived ? " opacity-60" : ""}`} onClick={() => onSelect(c)}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.full_name} src={c.avatar_url ?? undefined} size={36} />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate"><NoTranslate>{c.full_name}</NoTranslate></div>
                          {c.nick_name && <div className="text-xs text-ink-faint truncate"><NoTranslate>{c.nick_name}</NoTranslate></div>}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-ink-soft hidden sm:table-cell">
                      {c.email ? <NoTranslate>{c.email}</NoTranslate> : <span className="text-ink-faint">—</span>}
                    </td>
                    <td>
                      <Status kind={coachStatus(c) as "active" | "suspended" | "archived"}>
                        {archived ? "Archived" : suspended ? "Suspend" : "Active"}
                      </Status>
                    </td>
                    <td className="text-sm text-ink-soft hidden md:table-cell">
                      {c.phone ? <NoTranslate>{c.phone}</NoTranslate> : <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="hidden md:table-cell">
                      {assignedClasses.length > 0
                        ? <span className="text-xs font-semibold bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full">{`${assignedClasses.length} classes`}</span>
                        : <span className="text-xs text-ink-faint">—</span>}
                    </td>
                    <td className="px-5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <Btn variant="ghost" size="sm" icon="eye" onClick={() => onSelect(c)}>{"Detail"}</Btn>
                        {!archived && c.phone && (
                          <a href={waLink(`Hi ${c.full_name}, I'm from Next Swimming School admin.`, c.phone)} target="_blank" rel="noreferrer">
                            <Btn variant="ghost" size="sm" icon="whatsapp" className="text-ok-600">WA</Btn>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleCoaches.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-ink-mute">
                  {showArchived ? "No archived coaches." : "No coaches at this center yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-ink-mute tabular-nums">
            {`${visibleCoaches.length} coach · page ${safePage + 1} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
              className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
            <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
              .reduce<(number | "...")[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(i); return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`e${idx}`} className="px-2 text-xs text-ink-faint">…</span>
                ) : (
                  <button key={item} type="button" onClick={() => setPage(item as number)}
                    className={`min-w-[32px] py-1.5 rounded-lg border text-xs transition ${safePage === item ? "bg-ocean-600 border-ocean-600 text-white font-bold" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                    {(item as number) + 1}
                  </button>
                )
              )}
            <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
            <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
              className="px-2 py-1.5 rounded-lg border border-line text-xs text-ink-mute disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
          </div>
        </div>
      )}
    </Card>
  );
}
