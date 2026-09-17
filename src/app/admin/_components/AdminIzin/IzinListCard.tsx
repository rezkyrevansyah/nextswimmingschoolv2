"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { fmtDate } from "@/lib/utils";
import type { useIzinData } from "./useIzinData";

type IzinDataHook = ReturnType<typeof useIzinData>;

export default function IzinListCard({ hook }: { hook: IzinDataHook }) {
  const {
    t, typeLabel, statusLabel, tab, setTab, leaves, loading, paginatedLeaves,
    decide, setDetailTarget, totalPages, safePage, setPage,
  } = hook;

  return (
    <Card padded={false}>
      <div className="px-5 py-3 border-b border-line flex items-center gap-2">
        <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1">
          {[["coach", t("admin.izin.tabCoachLeave")], ["member", t("admin.izin.tabMemberLeave")]].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
          ))}
        </div>
      </div>
      {loading ? <div className="p-10 text-center text-ink-mute">{t("admin.izin.loadingData")}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
              <th className="text-left py-3 px-5 font-bold">{t("admin.izin.colName")}</th>
              <th className="text-left py-3 font-bold">{t("admin.izin.colType")}</th><th className="text-left py-3 font-bold hidden sm:table-cell">{t("admin.izin.colStart")}</th>
              <th className="text-left py-3 font-bold hidden sm:table-cell">{t("admin.izin.colEnd")}</th><th className="text-left py-3 font-bold">{t("admin.izin.colStatus")}</th><th className="text-left py-3 font-bold hidden md:table-cell">{t("admin.izin.colSubstitute")}</th><th className="px-5" />
            </tr></thead>
            <tbody className="divide-y divide-line">
              {paginatedLeaves.map((l) => (
                <tr key={l.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => setDetailTarget(l)}>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={l.profile?.full_name ?? "?"} size={34} />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">{l.profile?.full_name ?? "—"}</div>
                        {l.reason && <div className="text-xs text-ink-faint truncate max-w-[140px] sm:max-w-[220px]">{l.reason}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="capitalize text-sm">{typeLabel(l.type)}</td>
                  <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_from)}</td>
                  <td className="text-ink-soft hidden sm:table-cell">{fmtDate(l.date_to)}</td>
                  <td><Status kind={l.status as "pending" | "approved" | "rejected"}>{statusLabel(l.status)}</Status></td>
                  <td className="text-ink-soft text-xs hidden md:table-cell">
                    {(() => {
                      const hasPerClass = l.coach_leave_classes && l.coach_leave_classes.length > 0;
                      if (hasPerClass) {
                        const filled = l.coach_leave_classes!.filter(lc => lc.substitute_id).length;
                        const total = l.coach_leave_classes!.length;
                        return <span className={filled === total ? "text-ok-600 font-semibold" : "text-warn-600"}>{t("admin.izin.classesCountSuffix", { filled, total })}</span>;
                      }
                      return l.substitute_profile?.full_name ?? "—";
                    })()}
                  </td>
                  <td className="px-5" onClick={e => e.stopPropagation()}>
                    {l.status === "pending" ? (
                      <div className="flex gap-1 justify-end">
                        <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => decide(l.id, "rejected")}>{t("common.actions.reject")}</Btn>
                        <Btn variant="soft" size="sm" icon="check" onClick={() => decide(l.id, "approved")}>{t("common.actions.approve")}</Btn>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button className="p-1.5 text-ink-mute hover:text-ocean-600 rounded-lg transition-colors" onClick={() => setDetailTarget(l)}>
                          <Icon name="eye" className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-mute">{t("admin.izin.emptyLeaveRequests")}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-line flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-ink-mute tabular-nums">
            {t("admin.izin.itemsPageLabel2", { count: leaves.length, page: safePage + 1, total: totalPages })}
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
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`e${idx}`} className="px-2 text-xs text-ink-faint">…</span>
                ) : (
                  <button key={item} type="button" onClick={() => setPage(item as number)}
                    className={`min-w-[32px] py-1.5 rounded-lg border text-xs transition
                      ${safePage === item ? "bg-ocean-600 border-ocean-600 text-white font-bold" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
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
