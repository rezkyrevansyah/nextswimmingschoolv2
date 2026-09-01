"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const SEARCH_COLS: Record<string, string> = {
  profiles: "full_name",
  branches: "name",
  classes: "name",
  competitions: "name",
  announcements: "title",
  manual_transaction_categories: "name",
  manual_transactions: "description",
  certifications: "title",
};

const ALLOWED_TABLES = [
  "profiles",
  "branches",
  "classes",
  "members",
  "member_classes",
  "member_attendances",
  "coach_attendances",
  "staff_attendances",
  "bills",
  "coach_invoices",
  "payslips",
  "coach_loans",
  "rapor_entries",
  "rapor_periods",
  "announcements",
  "notifications",
  "activity_logs",
  "registrations",
  "trial_bookings",
  "competitions",
  "competition_participations",
  "manual_transactions",
  "manual_transaction_categories",
  "certifications",
  "coach_leaves",
  "member_leaves",
];

export default function OwnerDatabaseManager() {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, locale } = useLocale();

  const [activeTab, setActiveTab] = useState<"browser" | "monitor">("browser");
  const [selectedTable, setSelectedTable] = useState("activity_logs");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [realtimeLogs, setRealtimeLogs] = useState<Record<string, unknown>[]>([]);

  const LIMIT = 50;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    const params = new URLSearchParams({
      table: selectedTable,
      page: String(page),
      limit: String(LIMIT),
    });
    if (search && SEARCH_COLS[selectedTable]) {
      params.set("search", search);
      params.set("search_col", SEARCH_COLS[selectedTable]);
    }
    const res = await fetch(`/api/owner/db?${params}`);
    const json = await res.json() as { data?: Record<string, unknown>[]; count?: number; error?: string };
    setLoading(false);
    if (json.error) { toast.error(json.error); return; }
    setRows(json.data ?? []);
    setTotalCount(json.count ?? 0);
  }, [selectedTable, page, search, toast]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [selectedTable]);

  // Realtime subscription for activity_logs when on monitor tab
  useEffect(() => {
    if (activeTab !== "monitor") return;
    const channel = supabase
      .channel("owner-db-monitor")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, payload => {
        setRealtimeLogs(prev => [payload.new as Record<string, unknown>, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeTab, supabase]);

  const getTableLabel = (tableName: string) => {
    return t(`owner.databaseManager.tables.${tableName}`) || tableName;
  };

  async function handleDelete() {
    if (selectedIds.length === 0) return;
    const label = getTableLabel(selectedTable);
    const ok = await confirm({
      title: `${t("common.actions.delete")} ${selectedIds.length} ${locale === "id" ? "baris" : "rows"}?`,
      body: `${t("common.actions.delete")} ${selectedIds.length} ${locale === "id" ? "baris dari tabel" : "rows from table"} "${label}".`,
      confirmLabel: t("common.actions.delete"),
      danger: true,
    });
    if (!ok) return;
    const res = await fetch("/api/owner/db", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: selectedTable, ids: selectedIds }),
    });
    const json = await res.json() as { deleted?: number; error?: string };
    if (json.error) { toast.error(json.error); return; }
    toast.success(`${json.deleted} ${locale === "id" ? "baris berhasil dihapus" : "rows deleted successfully"}`);
    fetchRows();
  }

  async function handleExport() {
    const params = new URLSearchParams({ table: selectedTable, limit: "5000", page: "1" });
    if (search && SEARCH_COLS[selectedTable]) {
      params.set("search", search);
      params.set("search_col", SEARCH_COLS[selectedTable]);
    }
    const res = await fetch(`/api/owner/db?${params}`);
    const json = await res.json() as { data?: Record<string, unknown>[]; error?: string };
    if (json.error) { toast.error(json.error); return; }
    const ws = XLSX.utils.json_to_sheet(json.data ?? []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedTable.slice(0, 31));
    XLSX.writeFile(wb, `${selectedTable}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(locale === "id" ? "File Excel berhasil diunduh" : "Excel file downloaded successfully");
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]).slice(0, 8) : [];
  const totalPages = Math.ceil(totalCount / LIMIT);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  return (
    <div className="space-y-6">
      <SectionTitle sub={t("owner.databaseManager.sub")}>
        {t("owner.databaseManager.title")}
      </SectionTitle>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-paper-tint rounded-xl w-fit border border-line">
        {(["browser", "monitor"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors",
              activeTab === tab ? "bg-white shadow-card text-ocean-700" : "text-ink-soft hover:text-ink"
            )}
          >
            {tab === "browser" ? t("owner.databaseManager.tabBrowser") : t("owner.databaseManager.tabMonitor")}
          </button>
        ))}
      </div>

      {/* Browser tab */}
      {activeTab === "browser" && (
        <Card>
          <div className="p-5 space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-end">
              <Field label={t("owner.databaseManager.selectTableLabel")} className="w-60">
                <Select
                  value={selectedTable}
                  onChange={e => setSelectedTable(e.target.value)}
                >
                  {ALLOWED_TABLES.map(tabName => (
                    <option key={tabName} value={tabName}>{getTableLabel(tabName)}</option>
                  ))}
                </Select>
              </Field>
              {SEARCH_COLS[selectedTable] && (
                <Field label={t("common.actions.search")} className="flex-1 min-w-[160px]">
                  <Input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder={t("owner.databaseManager.searchTablePlaceholder", { table: getTableLabel(selectedTable) })}
                    type="search"
                  />
                </Field>
              )}
              <Btn variant="outline" size="sm" onClick={handleExport}>
                <Icon name="download" className="w-4 h-4 mr-1" /> {t("owner.databaseManager.exportExcelBtn")}
              </Btn>
              {selectedIds.length > 0 && (
                <Btn variant="danger" size="sm" onClick={handleDelete}>
                  <Icon name="trash" className="w-4 h-4 mr-1" /> {t("common.actions.delete")} ({selectedIds.length})
                </Btn>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span>{t("owner.databaseManager.totalRows", { count: totalCount })} · {locale === "id" ? `halaman ${page} dari ${totalPages || 1}` : `page ${page} of ${totalPages || 1}`}</span>
              {selectedIds.length > 0 && (
                <span className="text-ocean-700 font-semibold">{selectedIds.length} dipilih</span>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-line">
              {loading ? (
                <div className="p-10 text-center text-sm text-ink-mute">{t("owner.databaseManager.loadingTableData")}</div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-center text-sm text-ink-mute">{t("owner.databaseManager.noDataInTable", { table: getTableLabel(selectedTable) })}</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-paper-tint border-b border-line">
                    <tr>
                      <th className="p-2.5 w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={e => setSelectedIds(e.target.checked ? rows.map(r => String(r.id ?? "")).filter(Boolean) : [])}
                          className="w-3.5 h-3.5 rounded accent-ocean-600"
                        />
                      </th>
                      {columns.map(col => (
                        <th key={col} className="p-2.5 text-left font-semibold text-ink-soft whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const rowId = String(row.id ?? i);
                      const isSelected = selectedIds.includes(rowId);
                      return (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-line last:border-0 hover:bg-paper-tint transition-colors",
                            isSelected && "bg-ocean-50/50"
                          )}
                        >
                          <td className="p-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                setSelectedIds(prev =>
                                  e.target.checked ? [...prev, rowId] : prev.filter(x => x !== rowId)
                                );
                              }}
                              className="w-3.5 h-3.5 rounded accent-ocean-600"
                            />
                          </td>
                          {columns.map(col => (
                            <td key={col} className="p-2.5 max-w-[180px] truncate text-ink">
                              {row[col] == null ? (
                                <span className="text-ink-faint italic">null</span>
                              ) : typeof row[col] === "boolean" ? (
                                <span className={row[col] ? "text-ok-700" : "text-danger-700"}>
                                  {row[col] ? "true" : "false"}
                                </span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <Btn variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  ‹ Prev
                </Btn>
                <span className="text-sm text-ink-mute">{page} / {totalPages}</span>
                <Btn variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next ›
                </Btn>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Monitor tab */}
      {activeTab === "monitor" && (
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-ok-500 animate-pulse" />
              <p className="text-sm font-semibold text-ink">Live Activity Log</p>
              <span className="text-xs text-ink-mute">(realtime — maks 100 entri terbaru)</span>
            </div>
            {realtimeLogs.length === 0 ? (
              <div className="py-12 text-center text-sm text-ink-mute border border-dashed border-line rounded-xl">
                Menunggu aktivitas baru...
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-0.5 font-mono text-xs">
                {realtimeLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-3 px-3 py-1.5 rounded hover:bg-paper-tint transition-colors border-b border-line/50 last:border-0"
                  >
                    <span className="text-ink-faint shrink-0 tabular-nums">
                      {String(log.created_at ?? "").slice(0, 19).replace("T", " ")}
                    </span>
                    <span className="text-ocean-600 font-bold shrink-0">
                      [{String(log.action ?? "").toUpperCase()}]
                    </span>
                    <span className="text-ink-soft shrink-0">
                      {String(log.entity_type ?? log.entity ?? "")}
                    </span>
                    <span className="text-ink truncate">
                      {String(log.label ?? log.entity_label ?? log.user_name ?? "")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
