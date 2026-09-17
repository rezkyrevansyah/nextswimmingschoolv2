"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Branch } from "../../_types";
import type { ActivityLogRow } from "./_types";

const PAGE_SIZE = 25;

export function useActivityLogData(branches: Branch[]) {
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

  return {
    branches, logs, total, loading, statsToday, statsWeek, detailLog, setDetailLog,
    filterBranch, setFilterBranch, filterEntity, setFilterEntity, filterAction, setFilterAction,
    filterRole, setFilterRole, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    search, setSearch, showFilters, setShowFilters, page, setPage, PAGE_SIZE,
    activeFilterCount, resetFilters, fmtTime, fmtShortDate, branchName, entityLabel, actionLabel, totalPages,
  };
}
