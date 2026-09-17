"use client";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import Avatar from "@/components/ui/Avatar";
import { downloadSingleQRCard } from "@/lib/qrCardGenerator";
import type { useAccountsMasterData } from "./useAccountsMasterData";

type AccountsMasterDataHook = ReturnType<typeof useAccountsMasterData>;

export default function AccountsTable({ hook }: { hook: AccountsMasterDataHook }) {
  const {
    t, loading, qrSelectMode, filtered, isAllFilteredSelected, toggleSelectAllFiltered,
    selectedQRIds, toggleSelectAccount, setSelected, roleLabel, isKnownRole, toQRCardAccount,
  } = hook;

  return (
    <div className="bg-paper rounded-2xl border border-line overflow-hidden shadow-xs">
      {loading ? (
        <div className="p-10 text-center text-ink-mute">{t("owner.accounts.loading")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-9 bg-paper-deep border-b border-line text-[10px] uppercase tracking-wider text-ink-faint font-bold">
                {qrSelectMode && (
                  <th className="py-2 pl-5 pr-2 w-10 text-left">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
                    />
                  </th>
                )}
                <th className="text-left py-2 px-5 font-bold">{t("owner.accounts.colName")}</th>
                <th className="text-left py-2 px-3 font-bold w-[140px]">{t("owner.accounts.colRole")}</th>
                <th className="text-left py-2 px-3 font-bold w-[140px] hidden md:table-cell">{t("owner.accounts.colBranch")}</th>
                <th className="text-left py-2 px-3 font-bold w-[150px] hidden sm:table-cell">ACCOUNT ID</th>
                <th className="text-left py-2 px-3 font-bold w-[100px]">{t("owner.accounts.colStatus")}</th>
                <th className="text-right py-2 pr-5 font-bold w-[110px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((a) => {
                const displayName = a.full_name?.trim() || a.email?.split("@")[0] || roleLabel(a.role) || "—";
                const m = a.members && a.members[0];
                const code = m?.member_no || a.user_no || a.qr_code || a.id.slice(0, 8).toUpperCase();
                const isChecked = selectedQRIds.has(a.id);

                return (
                  <tr
                    key={a.id}
                    className={`h-[58px] hover:bg-paper-tint/60 cursor-pointer transition-colors ${
                      qrSelectMode && isChecked ? "bg-ocean-50/70" : ""
                    }`}
                    onClick={() => {
                      if (qrSelectMode) toggleSelectAccount(a.id);
                      else setSelected(a);
                    }}
                  >
                    {qrSelectMode && (
                      <td className="py-2.5 pl-5 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectAccount(a.id)}
                          className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-2.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={displayName} src={a.avatar_url ?? undefined} size={32} />
                        <div className="min-w-0">
                          <div className="font-semibold text-[13px] text-ink truncate max-w-[160px] sm:max-w-none leading-tight">
                            <NoTranslate>{displayName}</NoTranslate>
                          </div>
                          <div className="text-xs text-ink-mute truncate max-w-[160px] sm:max-w-none">
                            <NoTranslate>{a.email ?? "—"}</NoTranslate>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-deep text-ink-soft">
                          {isKnownRole(a.role) ? roleLabel(a.role) : <NoTranslate>{roleLabel(a.role)}</NoTranslate>}
                        </span>
                        {a.custom_role_label && !a.custom_role_label.includes("@") && (
                          <span className="text-ink-faint text-xs truncate max-w-[80px]">
                            <NoTranslate>{a.custom_role_label}</NoTranslate>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[13px] text-ink-soft hidden md:table-cell">
                      <NoTranslate>{a.branch?.name ?? "—"}</NoTranslate>
                    </td>
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-ink-soft bg-paper-deep px-2 py-0.5 rounded border border-line">
                        <NoTranslate>{code}</NoTranslate>
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {a.is_archived ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {t("owner.accountDetail.inactiveBadge")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ok-50 text-ok-700 border border-ok-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-ok-600" />
                          {t("owner.accountDetail.activeBadge")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => downloadSingleQRCard(toQRCardAccount(a))}
                          className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-ocean-50 text-ink-mute hover:text-ocean-700 flex items-center justify-center transition-colors cursor-pointer"
                          title={t("owner.accountDetail.downloadIdCardPng")}
                        >
                          <Icon name="qr" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelected(a)}
                          className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                          title={t("owner.accountDetail.viewTitle")}
                        >
                          <Icon name="eye" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={qrSelectMode ? 7 : 6} className="text-center py-10 text-ink-mute">
                    {t("owner.accounts.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
