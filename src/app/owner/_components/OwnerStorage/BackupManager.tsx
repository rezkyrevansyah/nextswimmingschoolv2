"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useOwnerStorage } from "./useOwnerStorage";
import { BACKUP_CATEGORIES } from "./_utils";

type Hook = ReturnType<typeof useOwnerStorage>;

export default function BackupManager({ hook }: { hook: Hook }) {
  const {
    backupList, backupLoading, backupLoaded, setBackupLoaded, setBackupList,
    selectedCats, setSelectedCats, toggleCat,
    downloading, downloadProgress, downloadBackup,
    selectMode, setSelectMode, selectedFiles, setSelectedFiles,
    deleting, deletingKey, loadBackupList, toggleFile, deleteSelected, deleteSingle,
    totalBackupPages, safeBackupPage, paginatedBackup, backupByCat, setBackupPage,
  } = hook;

  return (
    <div className="bg-paper rounded-2xl border border-line shadow-xs p-5 space-y-5">
      <div>
        <h3 className="font-display font-bold text-base text-ink">{"File Manager & Backup"}</h3>
        <p className="text-xs text-ink-mute mt-0.5">{"Manage, delete, and download files stored in Supabase Storage"}</p>
      </div>

      {/* Category selector pills */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">{"Select Category"}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setSelectedCats(new Set(["all"])); setBackupLoaded(false); setBackupList([]); setSelectMode(false); setSelectedFiles(new Set()); }}
            className={`h-9 px-4 rounded-xl text-xs font-semibold border transition-all ${
              selectedCats.has("all")
                ? "bg-ocean-600 text-white border-ocean-600 shadow-xs"
                : "bg-paper border-line text-ink-soft hover:bg-paper-tint hover:border-ocean-300"
            }`}
          >
            {"All Categories"}
          </button>
          {BACKUP_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => toggleCat(cat.key)}
              className={`h-9 px-4 rounded-xl text-xs font-semibold border transition-all ${
                !selectedCats.has("all") && selectedCats.has(cat.key)
                  ? "bg-ocean-600 text-white border-ocean-600 shadow-xs"
                  : "bg-paper border-line text-ink-soft hover:bg-paper-tint hover:border-ocean-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action bar & buttons */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-line">
        <Btn variant="soft" size="sm" icon="eye" disabled={backupLoading} onClick={loadBackupList}>
          {backupLoading ? "Loading…" : "View File List"}
        </Btn>
        {backupLoaded && backupList.length > 0 && !selectMode && (
          <Btn variant="outline" size="sm" icon="check" onClick={() => setSelectMode(true)}>
            {"Select Files"}
          </Btn>
        )}

        {downloadProgress ? (
          <div className="flex-1 min-w-64 max-w-md bg-paper-deep rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-ink">
              <span>{"Downloading files…"}</span>
              <span className="tabular-nums">{downloadProgress.done}/{downloadProgress.total}</span>
            </div>
            <div className="h-1.5 bg-paper rounded-full overflow-hidden">
              <div
                className="h-full bg-ocean-600 rounded-full transition-all duration-200"
                style={{ width: `${(downloadProgress.done / downloadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <Btn
            variant="primary"
            size="sm"
            icon="download"
            disabled={!backupLoaded || backupList.length === 0 || downloading}
            onClick={downloadBackup}
          >
            {downloading ? "Processing…" : (backupLoaded ? `Download Backup ZIP (${backupList.length} files)` : "Download Backup ZIP")}
          </Btn>
        )}

        {backupLoaded && (
          <span className="text-xs text-ink-mute ml-auto">
            {`${backupList.length} files found`}
            {Object.keys(backupByCat).length > 1 && (
              <> · {Object.entries(backupByCat).map(([cat, n]) => `${cat} (${n})`).join(", ")}</>
            )}
          </span>
        )}
      </div>

      {/* Select-mode toolbar banner */}
      {selectMode && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 rounded-xl bg-ocean-50 border border-ocean-200/60 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-ocean-800">{`${selectedFiles.size} files selected`}</span>
            <Btn variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set(backupList.map(f => f.key)))}>
              {"Select All"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelectedFiles(new Set()); }}>
              {"Cancel"}
            </Btn>
          </div>
          <Btn
            variant="danger"
            size="sm"
            icon="trash"
            disabled={selectedFiles.size === 0 || deleting}
            onClick={deleteSelected}
          >
            {deleting ? "Deleting…" : "Delete Selected"}
          </Btn>
        </div>
      )}

      {/* File list preview table */}
      {backupLoaded && backupList.length > 0 && (
        <div className="border border-line rounded-2xl overflow-hidden shadow-xs">
          <div className="divide-y divide-line max-h-96 overflow-y-auto">
            {paginatedBackup.map((f, i) => (
              <div
                key={`${f.key}-${i}`}
                className={`flex items-center gap-3.5 px-5 py-3 transition-colors ${selectMode ? "cursor-pointer" : ""} ${selectMode && selectedFiles.has(f.key) ? "bg-ocean-50/80" : "hover:bg-paper-tint/60"}`}
                onClick={() => selectMode && toggleFile(f.key)}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(f.key)}
                    onChange={() => toggleFile(f.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-line text-ocean-600 focus:ring-ocean-500 shrink-0"
                  />
                )}
                <div className="w-8 h-8 rounded-xl bg-paper-deep flex items-center justify-center text-ink-faint shrink-0">
                  <Icon name="archive" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate"><NoTranslate>{f.label}</NoTranslate></div>
                  <div className="text-[11px] text-ink-faint truncate font-mono">{f.key}</div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-paper-deep text-ink-soft border border-line shrink-0">
                  {f.category}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                  f.bucket === "next-storage-private"
                    ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                    : "bg-wave-50 text-wave-700 border border-wave-200/50"
                }`}>
                  {f.bucket === "next-storage-private" ? "Private" : "Public"}
                </span>
                {!selectMode && (
                  <button
                    type="button"
                    title={"Delete this file"}
                    onClick={(e) => { e.stopPropagation(); deleteSingle(f); }}
                    disabled={deletingKey === f.key}
                    className="w-8 h-8 rounded-xl border border-line bg-paper hover:bg-danger-50 text-ink-mute hover:text-danger-600 flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
                  >
                    {deletingKey === f.key ? (
                      <Icon name="refresh" className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
          {totalBackupPages > 1 && (
            <div className="px-5 py-3 border-t border-line flex items-center justify-between bg-paper-deep/50">
              <span className="text-xs text-ink-mute font-medium">
                {`${backupList.length} files · page ${safeBackupPage + 1}/${totalBackupPages}`}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={safeBackupPage === 0}
                  onClick={() => setBackupPage(p => p - 1)}
                  className="h-8 px-3 rounded-lg border border-line bg-paper text-xs font-semibold disabled:opacity-40 hover:bg-paper-tint transition shadow-xs"
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  disabled={safeBackupPage === totalBackupPages - 1}
                  onClick={() => setBackupPage(p => p + 1)}
                  className="h-8 px-3 rounded-lg border border-line bg-paper text-xs font-semibold disabled:opacity-40 hover:bg-paper-tint transition shadow-xs"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {backupLoaded && backupList.length === 0 && (
        <div className="py-12 text-center text-sm text-ink-mute bg-paper-tint/40 rounded-2xl border border-dashed border-line">
          <Icon name="archive" className="w-8 h-8 text-ink-faint mx-auto mb-2" />
          <p className="font-semibold text-ink">{"No files found for the selected category"}</p>
        </div>
      )}
    </div>
  );
}
