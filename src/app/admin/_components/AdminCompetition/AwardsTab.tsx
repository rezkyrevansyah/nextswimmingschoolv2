"use client";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminCompetitionHook } from "./_hook";

export default function AwardsTab({ hook }: { hook: AdminCompetitionHook }) {
  const {
    branchId, MEMBER_TYPE_LABELS,
    pickerSearch, setPickerSearch, pickerTypeFilter, setPickerTypeFilter,
    pickerBranchFilter, setPickerBranchFilter, pickerBranchOptions,
    pickerPaginatedMembers, pickerFilteredMembers, pickerTotalPages, pickerSafePage, setPickerPage,
    setAwardMemberId, setAwardMemberSearch,
  } = hook;

  return (
    <div className="space-y-4">
      {/* Toolbar matching pen.dev CeNt0 */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative w-64">
          <Icon name="search" className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={"Search name or student number..."}
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm bg-paper border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
          />
        </div>
        <select
          value={pickerTypeFilter}
          onChange={e => setPickerTypeFilter(e.target.value as typeof pickerTypeFilter)}
          className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
        >
          <option value="all">{"All student types"}</option>
          <option value="reguler">{MEMBER_TYPE_LABELS.reguler}</option>
          <option value="private">{MEMBER_TYPE_LABELS.private}</option>
          <option value="school_affiliate">{MEMBER_TYPE_LABELS.school_affiliate}</option>
        </select>
        {!branchId && pickerBranchOptions.length > 0 && (
          <select
            value={pickerBranchFilter}
            onChange={e => setPickerBranchFilter(e.target.value)}
            className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
          >
            <option value="all">{"All centers"}</option>
            {pickerBranchOptions.map(b => <option key={b.id} value={b.id} translate="no">{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Card matching pen.dev NmdyX */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
              <tr>
                <th className="py-2 px-5">{"Name"}</th>
                <th className="py-2 px-5">No. Anggota</th>
                <th className="py-2 px-5">Tipe</th>
                {!branchId && <th className="py-2 px-5">{"Center"}</th>}
                <th className="py-2 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pickerPaginatedMembers.map(m => (
                <tr
                  key={m.id}
                  onClick={() => { setAwardMemberId(m.id); setAwardMemberSearch(m.full_name); }}
                  className="hover:bg-paper-tint/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.full_name} size={32} />
                      <div>
                        <div className="font-semibold text-sm text-ink"><NoTranslate>{m.full_name}</NoTranslate></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-ink-mute font-mono text-xs"><NoTranslate>{m.member_no ?? "—"}</NoTranslate></td>
                  <td className="py-3 px-5 text-ink-soft text-sm">{MEMBER_TYPE_LABELS[m.type] ?? m.type}</td>
                  {!branchId && <td className="py-3 px-5 text-ink-soft text-sm"><NoTranslate>{m.branch_name || "—"}</NoTranslate></td>}
                  <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setAwardMemberId(m.id); setAwardMemberSearch(m.full_name); }}
                      className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink inline-flex items-center justify-center transition-colors"
                    >
                      <Icon name="eye" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pickerPaginatedMembers.length === 0 && (
                <tr>
                  <td colSpan={branchId ? 4 : 5} className="text-center py-12 text-ink-mute text-sm">
                    {"No students match this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pickerTotalPages > 1 && (
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-line text-xs text-ink-mute bg-paper-tint/30">
            <span>{pickerFilteredMembers.length} student · hal. {pickerSafePage + 1}/{pickerTotalPages}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pickerSafePage === 0}
                onClick={() => setPickerPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
              >
                ‹ Sebelumnya
              </button>
              <button
                type="button"
                disabled={pickerSafePage >= pickerTotalPages - 1}
                onClick={() => setPickerPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
              >
                Selanjutnya ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
