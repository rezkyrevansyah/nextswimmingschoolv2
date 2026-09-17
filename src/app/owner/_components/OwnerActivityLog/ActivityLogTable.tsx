"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { ACTION_BADGE, ENTITY_COLORS } from "./_types";
import type { useActivityLogData } from "./useActivityLogData";

type ActivityLogDataHook = ReturnType<typeof useActivityLogData>;

export default function ActivityLogTable({ hook }: { hook: ActivityLogDataHook }) {
  const { t } = useLocale();
  const {
    logs, loading, setDetailLog, page, setPage, PAGE_SIZE, total, totalPages,
    fmtTime, fmtShortDate, branchName, entityLabel, actionLabel,
  } = hook;

  return (
    <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
      {loading ? (
        <div className="p-16 text-center text-ink-mute space-y-3">
          <Icon name="refresh" className="w-7 h-7 text-ocean-600 animate-spin mx-auto" />
          <p className="text-sm font-medium">{t("owner.activityLog.loading")}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-paper-deep flex items-center justify-center mx-auto mb-3 text-ink-faint">
            <Icon name="clipboard" className="w-6 h-6" />
          </div>
          <div className="font-display font-bold text-ink text-base">{t("owner.activityLog.empty")}</div>
          <p className="text-xs text-ink-mute mt-1 max-w-sm mx-auto">{t("owner.activityLog.emptySub")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-10 bg-paper-deep border-b border-line text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <th className="px-5">{t("owner.activityLog.colTime")}</th>
                  <th className="px-5">{t("owner.activityLog.colBy")}</th>
                  <th className="px-5">{t("owner.activityLog.colAction")}</th>
                  <th className="px-5">{t("owner.activityLog.colEntity")}</th>
                  <th className="px-5">{t("owner.activityLog.colBranch")}</th>
                  <th className="px-5">{t("owner.activityLog.colDescription")}</th>
                  <th className="px-5 text-center w-14"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="h-14 hover:bg-paper-tint/60 transition-colors cursor-pointer"
                    onClick={() => setDetailLog(log)}
                  >
                    <td className="px-5 py-3 shrink-0 whitespace-nowrap">
                      <div className="text-xs font-semibold text-ink">{fmtShortDate(log.created_at)}</div>
                      <div className="text-[11px] text-ink-faint font-mono">{fmtTime(log.created_at)}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={log.user_name} size={28} />
                        <div>
                          <div className="text-xs font-semibold text-ink leading-tight"><NoTranslate>{log.user_name}</NoTranslate></div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            log.user_role === "owner" ? "text-ocean-600" : log.user_role === "admin" ? "text-wave-600" : "text-ink-mute"
                          }`}>
                            {log.user_role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Status kind={ACTION_BADGE[log.action] ?? "manual"}>
                        {actionLabel[log.action] ?? <NoTranslate>{log.action}</NoTranslate>}
                      </Status>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[log.entity_type] ?? "bg-paper-deep text-ink-soft border border-line"}`}>
                        {entityLabel[log.entity_type] ?? <NoTranslate>{log.entity_type}</NoTranslate>}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-soft font-medium whitespace-nowrap">
                      <NoTranslate>{branchName(log)}</NoTranslate>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <span className="text-sm font-medium text-ink truncate block">
                        <NoTranslate>{log.label}</NoTranslate>
                      </span>
                      {log.entity_label && (
                        <span className="text-xs text-ink-mute truncate block">
                          <NoTranslate>{log.entity_label}</NoTranslate>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors shadow-xs"
                        onClick={(e) => { e.stopPropagation(); setDetailLog(log); }}
                        title="Lihat Detail"
                      >
                        <Icon name="eye" className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-line">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-paper-tint/60 transition-colors cursor-pointer space-y-2.5" onClick={() => setDetailLog(log)}>
                <div className="flex items-start gap-3">
                  <Avatar name={log.user_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ink"><NoTranslate>{log.user_name}</NoTranslate></span>
                      <span className="text-[11px] text-ink-faint">{fmtShortDate(log.created_at)} {fmtTime(log.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Status kind={ACTION_BADGE[log.action] ?? "manual"}>{actionLabel[log.action] ?? <NoTranslate>{log.action}</NoTranslate>}</Status>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ENTITY_COLORS[log.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                        {entityLabel[log.entity_type] ?? <NoTranslate>{log.entity_type}</NoTranslate>}
                      </span>
                      <span className="text-xs text-ink-mute"><NoTranslate>{branchName(log)}</NoTranslate></span>
                    </div>
                    <div className="text-sm font-medium text-ink mt-1.5 leading-snug"><NoTranslate>{log.label}</NoTranslate></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-line bg-paper-deep/40 text-xs">
            <div className="text-ink-mute font-medium">
              {t("owner.activityLog.paginationSummary", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total, page: page + 1, total_pages: totalPages })}
            </div>
            <div className="flex gap-1.5">
              {[
                { label: "«", act: () => setPage(0),               dis: page === 0 },
                { label: "‹", act: () => setPage(p => p - 1),      dis: page === 0 },
                { label: "›", act: () => setPage(p => p + 1),      dis: page >= totalPages - 1 },
                { label: "»", act: () => setPage(totalPages - 1),   dis: page >= totalPages - 1 },
              ].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={btn.act}
                  disabled={btn.dis}
                  className="h-8 min-w-8 px-2 rounded-lg border border-line bg-paper text-xs font-semibold text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper-tint transition-all shadow-xs"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
