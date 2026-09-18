"use client";
import Icon from "@/components/ui/Icon";
import type { useAccountsMasterData } from "./useAccountsMasterData";
import type { RoleFilter } from "./_types";

type AccountsMasterDataHook = ReturnType<typeof useAccountsMasterData>;

export default function AccountsToolbar({ hook }: { hook: AccountsMasterDataHook }) {
  const {
    branches, search, setSearch, roleFilter, setRoleFilter, branchFilter, setBranchFilter,
    showArchived, setShowArchived,
    setQuickRole, setQuickBranch, setShowQuickDownloadModal,
    qrSelectMode, setQrSelectMode, setSelectedQRIds, openCreate,
    filtered, selectedQRIds, generatingQR, toggleSelectAllFiltered, isAllFilteredSelected,
    handleDownloadSelectedZip, handlePrintSelectedSheet,
  } = hook;

  return (
    <>
      {/* ── Top Action Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={"Search by name or email…"}
              className="h-10 pl-9 pr-3 w-56 rounded-xl border border-line bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-hidden focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
              <Icon name="search" className="w-4 h-4" />
            </span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            aria-label="Filter role"
            className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
          >
            <option value="all">{"All roles"}</option>
            <option value="owner">{"Owner"}</option>
            <option value="admin">{"Branch Admin"}</option>
            <option value="manager_center">{"Manager Center"}</option>
            <option value="coach">{"Coach"}</option>
            <option value="student">{"Student"}</option>
            <option value="school">{"School Partner"}</option>
            <option value="staff">{"Branch Staff"}</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter center"
            className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
          >
            <option value="">{"All centers"}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} translate="no" className="notranslate">
                {b.name}
              </option>
            ))}
          </select>

          <label className="h-10 px-3 rounded-xl border border-line bg-paper flex items-center gap-2 text-xs font-medium text-ink-soft cursor-pointer hover:bg-paper-tint transition-colors">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
            />
            {"Show inactive accounts"}
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick QR Download Preset Button */}
          <button
            type="button"
            onClick={() => {
              setQuickRole(roleFilter);
              setQuickBranch(branchFilter || "all");
              setShowQuickDownloadModal(true);
            }}
            className="h-10 px-3.5 rounded-xl border border-line bg-paper hover:bg-paper-tint text-ink-soft text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Icon name="qr" className="w-4 h-4 text-ink-mute" />
            <span className="hidden sm:inline">{"Quick Download QR"}</span>
          </button>

          {/* Toggle Checkbox Select Mode */}
          <button
            type="button"
            onClick={() => {
              setQrSelectMode((prev) => !prev);
              if (qrSelectMode) setSelectedQRIds(new Set());
            }}
            className={`h-10 px-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              qrSelectMode
                ? "bg-ocean-50 border-ocean-300 text-ocean-700"
                : "border-line bg-paper hover:bg-paper-tint text-ink-soft"
            }`}
          >
            <Icon name="check" className="w-4 h-4" />
            <span className="hidden sm:inline">{qrSelectMode ? "Done" : "QR Cards"}</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>{"Add Account"}</span>
          </button>
        </div>
      </div>

      {/* ── Floating Batch Action Bar (When in QR Select Mode) ── */}
      {qrSelectMode && (
        <div className="bg-ocean-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border border-ocean-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-ocean-800 text-ocean-300 flex items-center justify-center font-bold text-sm">
              {selectedQRIds.size}
            </span>
            <div>
              <div className="font-bold text-sm">
                {selectedQRIds.size > 0
                  ? `${selectedQRIds.size} Accounts Selected`
                  : "Select accounts in the table to download their QR Code"}
              </div>
              <div className="text-xs text-ocean-300">
                {`${filtered.length} accounts match current filter`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="h-8 px-3 rounded-lg bg-ocean-800 hover:bg-ocean-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {isAllFilteredSelected
                ? "Batalkan Pilihan Terfilter"
                : `Pilih Semua Terfilter (${filtered.length})`}
            </button>
            <button
              type="button"
              disabled={selectedQRIds.size === 0 || generatingQR}
              onClick={handleDownloadSelectedZip}
              className="h-8 px-3 rounded-lg bg-ocean-500 hover:bg-ocean-600 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="download" className="w-3.5 h-3.5" />
              <span>{generatingQR ? "Saving…" : `Download ZIP (${selectedQRIds.size})`}</span>
            </button>
            <button
              type="button"
              disabled={selectedQRIds.size === 0 || generatingQR}
              onClick={handlePrintSelectedSheet}
              className="h-8 px-3 rounded-lg bg-ocean-800 hover:bg-ocean-700 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="print" className="w-3.5 h-3.5" />
              <span>Print A4 Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQrSelectMode(false);
                setSelectedQRIds(new Set());
              }}
              className="text-xs text-ocean-300 hover:text-white underline ml-2 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
