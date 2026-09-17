"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Input } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import type { AdminCoachHook } from "./_hook";

export default function LinkCoachModal({ hook }: { hook: AdminCoachHook }) {
  const {
    t, openLink, setOpenLink, linkSearch, setLinkSearch, linkSelectedIds, setLinkSelectedIds, linkSaving,
    linkCandidates, linkLoadingCandidates, linkShowFilters, setLinkShowFilters, linkFilterBranch, setLinkFilterBranch,
    linkFilterCity, setLinkFilterCity, linkFilteredCandidates, linkBranchOptions, linkCityOptions,
    linkActiveFilterCount, linkCoachToBranch,
  } = hook;

  return (
    <Modal open={openLink} onClose={() => { setOpenLink(false); setLinkSearch(""); setLinkSelectedIds(new Set()); }} title={t("admin.coaches.linkModalTitle")} size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={() => { setOpenLink(false); setLinkSearch(""); setLinkSelectedIds(new Set()); }}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" icon="link" onClick={linkCoachToBranch} disabled={linkSelectedIds.size === 0 || linkSaving}>
            {linkSaving ? t("admin.coaches.linkingBtn") : t("admin.coaches.linkBtnCount", { count: linkSelectedIds.size })}
          </Btn>
        </>
      }>
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">{t("admin.coaches.linkIntroText")}</p>

        <div className="flex items-center gap-2">
          <div className="flex-1"><Input placeholder={t("admin.coaches.searchNameOrPhonePlaceholder")} value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoComplete="off" /></div>
          <button
            type="button"
            onClick={() => setLinkShowFilters(v => !v)}
            className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border transition shrink-0 ${linkShowFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-white border-line text-ink-soft hover:border-ocean-400"}`}
          >
            <Icon name="settings" className="w-3.5 h-3.5" />
            {t("admin.coaches.linkFilterBtn")}
            {linkActiveFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{linkActiveFilterCount}</span>
            )}
          </button>
        </div>

        {linkShowFilters && (
          <div className="bg-paper-tint border border-line rounded-xl p-3 grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.coaches.linkFilterByBranch")}</div>
              <select value={linkFilterBranch} onChange={e => setLinkFilterBranch(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("admin.coaches.linkAllBranchesOpt")}</option>
                {linkBranchOptions.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.coaches.linkFilterByCity")}</div>
              <select value={linkFilterCity} onChange={e => setLinkFilterCity(e.target.value)} className="w-full text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white outline-none">
                <option value="">{t("admin.coaches.linkAllCitiesOpt")}</option>
                {linkCityOptions.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            {linkActiveFilterCount > 0 && (
              <div className="sm:col-span-2 flex justify-end">
                <button type="button" onClick={() => { setLinkFilterBranch(""); setLinkFilterCity(""); }} className="text-xs font-semibold text-danger-600 hover:underline">{t("admin.coaches.linkResetFilterBtn")}</button>
              </div>
            )}
          </div>
        )}

        {linkCandidates.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-mute font-medium">
              {linkSelectedIds.size > 0 ? t("admin.coaches.linkSelectedCount", { count: linkSelectedIds.size }) : ""}
            </span>
            <div className="flex items-center gap-3">
              {linkSelectedIds.size > 0 && (
                <button type="button" onClick={() => setLinkSelectedIds(new Set())} className="text-xs font-semibold text-ink-mute hover:text-danger-600 transition">{t("admin.coaches.linkClearSelectionBtn")}</button>
              )}
              <button type="button" onClick={() => setLinkSelectedIds(new Set(linkFilteredCandidates.map(c => c.id)))} className="text-xs font-semibold text-ocean-600 hover:underline">
                {t("admin.coaches.linkSelectAllBtn", { count: linkFilteredCandidates.length })}
              </button>
            </div>
          </div>
        )}

        {linkLoadingCandidates ? (
          <div className="py-6 text-center text-sm text-ink-mute">{t("admin.classes.loadingEllipsis")}</div>
        ) : linkCandidates.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink-mute">{t("admin.coaches.allLinkedOrNoneHint")}</div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
            {linkFilteredCandidates.map(c => {
              const isChecked = linkSelectedIds.has(c.id);
              const toggle = () => setLinkSelectedIds(prev => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; });
              return (
                <button key={c.id} type="button" onClick={toggle}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${isChecked ? "bg-ocean-50 border-ocean-300" : "bg-paper-tint border-line hover:bg-white hover:border-ocean-300"}`}>
                  <input type="checkbox" checked={isChecked} onChange={toggle} onClick={e => e.stopPropagation()} className="rounded border-line accent-ocean-600 shrink-0" />
                  <Avatar name={c.full_name} src={c.avatar_url ?? undefined} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink">{c.full_name}</div>
                    <div className="text-xs text-ink-mute">{c.phone ?? "—"}</div>
                    {c.branches.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.branches.map(b => (
                          <span key={b.name} className="text-[10px] font-semibold bg-ocean-50 text-ocean-700 px-1.5 py-0.5 rounded-full">{b.name}{b.city ? ` · ${b.city}` : ""}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
