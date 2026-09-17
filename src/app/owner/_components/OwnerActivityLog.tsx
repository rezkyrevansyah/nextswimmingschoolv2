"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/utils/supabase/client";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Branch } from "../_types";

interface ActivityLogRow {
  id: string; user_id: string; user_role: string; user_name: string;
  branch_id: string | null; branch_name: string | null;
  entity_type: string; entity_id: string; entity_label: string | null;
  action: string; label: string; meta: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_BADGE: Record<string, string> = {
  create: "active", update: "manual", delete: "rejected",
  approve: "approved", reject: "rejected", publish: "active",
  archive: "archived", restore: "ok", suspend: "suspend", unsuspend: "ok",
};

const ENTITY_COLORS: Record<string, string> = {
  branches: "bg-ocean-50 text-ocean-700", members: "bg-wave-50 text-wave-700",
  bills: "bg-ok-50 text-ok-700", coach_invoices: "bg-warn-50 text-warn-700",
  payslips: "bg-ok-50 text-ok-700", registrations: "bg-ocean-50 text-ocean-700",
  certifications: "bg-wave-50 text-wave-700", coach_attendances: "bg-paper-deep text-ink-soft",
  classes: "bg-ocean-50 text-ocean-700", announcements: "bg-wave-50 text-wave-700",
};

export default function OwnerActivityLog({ branches }: { branches: Branch[] }) {
  const { t } = useLocale();
  const supabase = createClient();
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsToday, setStatsToday] = useState(0);
  const [statsWeek, setStatsWeek] = useState(0);
  const [detailLog, setDetailLog] = useState<ActivityLogRow | null>(null);

  // Filters
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const activeFilterCount = [filterBranch !== "all", filterEntity !== "all", filterAction !== "all", filterRole !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  const load = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterBranch !== "all")   q = q.eq("branch_id", filterBranch);
    if (filterEntity !== "all")   q = q.eq("entity_type", filterEntity);
    if (filterAction !== "all")   q = q.eq("action", filterAction);
    if (filterRole !== "all")     q = q.eq("user_role", filterRole);
    if (filterDateFrom)           q = q.gte("created_at", new Date(filterDateFrom + "T00:00:00").toISOString());
    if (filterDateTo)             q = q.lte("created_at", new Date(filterDateTo + "T23:59:59.999").toISOString());
    if (search.trim())            q = q.ilike("label", `%${search.trim()}%`);

    const { data, count } = await q;
    if (data) setLogs(data as ActivityLogRow[]);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [supabase, page, filterBranch, filterEntity, filterAction, filterRole, filterDateFrom, filterDateTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = useCallback(async () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayStr = todayDate.toISOString();

    const weekAgoDate = new Date(todayDate);
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgoStr = weekAgoDate.toISOString();

    const [td, wk] = await Promise.all([
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStr),
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgoStr),
    ]);
    setStatsToday(td.count ?? 0);
    setStatsWeek(wk.count ?? 0);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(0); }, [filterBranch, filterEntity, filterAction, filterRole, filterDateFrom, filterDateTo, search]);

  const resetFilters = () => {
    setFilterBranch("all"); setFilterEntity("all"); setFilterAction("all");
    setFilterRole("all"); setFilterDateFrom(""); setFilterDateTo(""); setSearch("");
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const branchName = (log: ActivityLogRow) =>
    log.branch_name ?? branches.find(b => b.id === log.branch_id)?.name ?? t("owner.activityLog.crossBranch");

  const entityLabel: Record<string, string> = {
    branches: t("owner.activityLog.entityLabel.branches"), members: t("owner.activityLog.entityLabel.members"), member_classes: t("owner.activityLog.entityLabel.member_classes"),
    classes: t("owner.activityLog.entityLabel.classes"), class_packages: t("owner.activityLog.entityLabel.class_packages"), bills: t("owner.activityLog.entityLabel.bills"),
    coach_attendances: t("owner.activityLog.entityLabel.coach_attendances"), coach_invoices: t("owner.activityLog.entityLabel.coach_invoices"),
    coach_leaves: t("owner.activityLog.entityLabel.coach_leaves"), certifications: t("owner.activityLog.entityLabel.certifications"),
    announcements: t("owner.activityLog.entityLabel.announcements"), payslips: t("owner.activityLog.entityLabel.payslips"),
    registrations: t("owner.activityLog.entityLabel.registrations"), rapor_periods: t("owner.activityLog.entityLabel.rapor_periods"),
    schools: t("owner.activityLog.entityLabel.schools"), coach_rates: t("owner.activityLog.entityLabel.coach_rates"), profiles: t("owner.activityLog.entityLabel.profiles"),
  };

  const actionLabel: Record<string, string> = {
    create: t("owner.activityLog.actionLabel.create"), update: t("owner.activityLog.actionLabel.update"), delete: t("owner.activityLog.actionLabel.delete"),
    approve: t("owner.activityLog.actionLabel.approve"), reject: t("owner.activityLog.actionLabel.reject"), publish: t("owner.activityLog.actionLabel.publish"),
    archive: t("owner.activityLog.actionLabel.archive"), restore: t("owner.activityLog.actionLabel.restore"), suspend: t("owner.activityLog.actionLabel.suspend"), unsuspend: t("owner.activityLog.actionLabel.unsuspend"),
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* ── Stat Cards (frame Kt583) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: TODAY */}
        <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">
              {t("owner.activityLog.statToday")}
            </div>
            <div className="font-display font-extrabold text-2xl text-ocean-600 mt-1 tabular-nums">
              {statsToday.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-xs text-ink-mute mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ocean-500 shrink-0" />
            <span>Aktivitas log hari ini</span>
          </div>
        </div>

        {/* Card 2: LAST 7 DAYS */}
        <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">
              {t("owner.activityLog.statWeek")}
            </div>
            <div className="font-display font-extrabold text-2xl text-wave-600 mt-1 tabular-nums">
              {statsWeek.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-xs text-ink-mute mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-wave-500 shrink-0" />
            <span>7 hari terakhir</span>
          </div>
        </div>

        {/* Card 3: TOTAL */}
        <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">
              {t("owner.activityLog.statTotal")}
            </div>
            <div className="font-display font-extrabold text-2xl text-ok-600 mt-1 tabular-nums">
              {total.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="text-xs text-ink-mute mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ok-500 shrink-0" />
            <span>Total log terekam</span>
          </div>
        </div>
      </div>

      {/* ── Search + Filter Bar (frame XfBMN) ── */}
      <div className="bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex gap-2.5 flex-wrap items-center">
          <div className="flex-1 min-w-56 relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("owner.activityLog.searchPlaceholder")}
              className="w-full h-10 pl-10 pr-3 text-sm rounded-xl border border-line bg-paper-tint/50 text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 focus:bg-paper transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(f => !f)}
            className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
              showFilters
                ? "bg-ocean-50 border-ocean-300 text-ocean-700 shadow-xs"
                : "border-line bg-paper text-ink-soft hover:bg-paper-tint hover:border-ocean-200"
            }`}
          >
            <Icon name="filter" className="w-4 h-4" />
            <span>{t("owner.activityLog.filterBtn")}</span>
            {activeFilterCount > 0 && (
              <span className="bg-ocean-600 text-white text-[11px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 text-xs font-semibold text-ocean-600 hover:text-ocean-700 px-3 hover:underline transition-colors"
            >
              {t("owner.activityLog.resetBtn")}
            </button>
          )}

          <span className="text-xs text-ink-mute font-medium self-center ml-auto">
            {t("owner.activityLog.activityCount", { count: total })}
          </span>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-3 border-t border-line">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterBranch")}</label>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterEntity")}</label>
              <select
                value={filterEntity}
                onChange={e => setFilterEntity(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allEntities")}</option>
                {Object.entries(entityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterAction")}</label>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allActions")}</option>
                {Object.entries(actionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterRole")}</label>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink pl-3 pr-8 focus:outline-none focus:border-ocean-500"
              >
                <option value="all">{t("owner.activityLog.allRoles")}</option>
                <option value="owner">{t("owner.activityLog.roleOwner")}</option>
                <option value="admin">{t("owner.activityLog.roleAdmin")}</option>
                <option value="coach">{t("owner.activityLog.roleCoach")}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterDateFrom")}</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink px-3 focus:outline-none focus:border-ocean-500"
              >
              </input>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">{t("owner.activityLog.filterDateTo")}</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-line bg-paper-tint/50 text-ink px-3 focus:outline-none focus:border-ocean-500"
              >
              </input>
            </div>
          </div>
        )}
      </div>

      {/* ── Activity Table (frame fVBkx) ── */}
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

      {/* Detail modal */}
      <Modal
        open={!!detailLog}
        onClose={() => setDetailLog(null)}
        title={t("owner.activityLog.detailModalTitle")}
        size="md"
        footer={<Btn variant="ghost" onClick={() => setDetailLog(null)}>{t("common.actions.close")}</Btn>}
      >
        {detailLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailTime")}</div>
                <div className="font-semibold text-ink">{fmtShortDate(detailLog.created_at)} {fmtTime(detailLog.created_at)}</div>
              </div>
              <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailBranch")}</div>
                <div className="font-semibold text-ink"><NoTranslate>{branchName(detailLog)}</NoTranslate></div>
              </div>
              <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailBy")}</div>
                <div className="font-semibold text-ink">
                  <NoTranslate>{detailLog.user_name}</NoTranslate>{" "}
                  <span className="text-xs text-ink-mute font-normal">({detailLog.user_role})</span>
                </div>
              </div>
              <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailEntity")}</div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[detailLog.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                  {entityLabel[detailLog.entity_type] ?? <NoTranslate>{detailLog.entity_type}</NoTranslate>}
                </span>
              </div>
              <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailAction")}</div>
                <Status kind={ACTION_BADGE[detailLog.action] ?? "manual"}>
                  {actionLabel[detailLog.action] ?? <NoTranslate>{detailLog.action}</NoTranslate>}
                </Status>
              </div>
              {detailLog.entity_label && (
                <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                  <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailSubject")}</div>
                  <div className="font-semibold text-ink"><NoTranslate>{detailLog.entity_label}</NoTranslate></div>
                </div>
              )}
            </div>

            <div className="border-t border-line pt-3">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1.5">{t("owner.activityLog.detailDescription")}</div>
              <p className="text-sm font-medium text-ink leading-relaxed bg-paper-tint/30 rounded-xl p-3 border border-line/50">
                <NoTranslate>{detailLog.label}</NoTranslate>
              </p>
            </div>

            {detailLog.meta && Object.keys(detailLog.meta).length > 0 && (
              <div>
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1.5">{t("owner.activityLog.detailMeta")}</div>
                <pre className="bg-paper-deep rounded-xl p-3 text-xs font-mono overflow-auto text-ink-soft max-h-48 border border-line/60">
                  {JSON.stringify(detailLog.meta, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
