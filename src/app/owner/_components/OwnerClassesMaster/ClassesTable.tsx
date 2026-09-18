"use client";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassesTable({ hook }: { hook: OwnerClassesMasterHook }) {
  const {
    dayLabels, loading, filteredClasses, openDetail, openEdit, archiveClass, restoreClass, deleteClass,
  } = hook;

  return (
    <div className="bg-paper rounded-2xl border border-line overflow-hidden shadow-xs">
      {loading ? (
        <div className="py-12 text-center text-ink-mute text-sm">{"Loading classes data…"}</div>
      ) : filteredClasses.length === 0 ? (
        <div className="py-12 text-center text-ink-mute text-sm">{"No classes found."}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-9 bg-paper-deep border-b border-line text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                <th className="text-left py-2 px-5 font-bold">CLASS</th>
                <th className="text-left py-2 px-3 font-bold w-[120px]">CENTER</th>
                <th className="text-left py-2 px-3 font-bold w-[150px]">SCHEDULE</th>
                <th className="text-left py-2 px-3 font-bold w-[140px]">COACH</th>
                <th className="text-left py-2 px-3 font-bold w-[90px]">CAPACITY</th>
                <th className="text-left py-2 px-3 font-bold w-[110px]">MONTHLY</th>
                <th className="text-right py-2 pr-5 font-bold w-[100px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredClasses.map((c) => {
                const coachList = c.class_coaches ?? [];
                const headCoach = coachList.find((cc) => cc.role === "head") ?? coachList[0];
                const otherCoachesCount = coachList.length > 1 ? coachList.length - 1 : 0;
                const isArchived = c.status === "archived";

                const daysStr = (c.schedule_days ?? [])
                  .map((d) => dayLabels[d] ?? d)
                  .slice(0, 2)
                  .join(", ") + ((c.schedule_days ?? []).length > 2 ? ` +${(c.schedule_days ?? []).length - 2}` : "");
                const timeStr = c.time_start
                  ? `${c.time_start.slice(0, 5)} - ${c.time_end ? c.time_end.slice(0, 5) : ""}`
                  : "—";

                return (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className={`h-14 hover:bg-paper-tint/60 cursor-pointer transition-colors ${
                      isArchived ? "opacity-75 bg-paper-tint/30" : ""
                    }`}
                  >
                    <td className="py-2 px-5">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-ink truncate leading-tight">
                          <NoTranslate>{c.name}</NoTranslate>
                        </div>
                        <div className="text-xs text-ink-mute truncate mt-0.5">
                          {isArchived ? "Archived" : c.class_type === "private" ? "Private" : "Regular"}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[13px] text-ink-soft">
                      <NoTranslate>{c.branch?.name ?? "—"}</NoTranslate>
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-xs text-ink-soft leading-tight">
                        <div>{daysStr || "—"}</div>
                        <div className="font-mono text-[11px] text-ink-mute mt-0.5">{timeStr}</div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {headCoach?.profile ? (
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-ink truncate leading-tight">
                            <NoTranslate>{headCoach.profile.full_name}</NoTranslate>
                          </div>
                          <div className="text-[11px] text-ink-mute mt-0.5">
                            {headCoach.role === "head" ? "Head coach" : "Coach"}
                            {otherCoachesCount > 0 && ` (+${otherCoachesCount})`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-mute">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-ink-soft">
                      {c.enrolled || 0}/{c.capacity || "—"}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs font-semibold text-ink">
                      {c.price_monthly ? fmtIDR(c.price_monthly) : c.price_per_session ? `${fmtIDR(c.price_per_session)}/sesi` : "—"}
                    </td>
                    <td className="py-2 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                          title={"Edit"}
                        >
                          <Icon name="edit" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => (isArchived ? restoreClass(c) : archiveClass(c))}
                          className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                          title={isArchived ? "Restore" : "Archive"}
                        >
                          <Icon name={isArchived ? "check" : "archive"} className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteClass(c)}
                          className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-rose-50 text-ink-mute hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title={"Delete"}
                        >
                          <Icon name="trash" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
