"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";
import type { AdminCompetitionHook } from "./_hook";

export default function MemberAchievementModal({ hook }: { hook: AdminCompetitionHook }) {
  const {
    t, AWARD_LABELS,
    awardMemberId, setAwardMemberId, awardMemberSearch, setAwardMemberSearch, setMemberParticipations,
    memberParticipations, memberParticipationsLoading, openAddParticipant, openDuplicateParticipant,
    openEditParticipant, handleRemoveParticipant, getDoc, handleViewDoc,
  } = hook;

  if (!awardMemberId) return null;

  return (
    <Modal
      open={!!awardMemberId}
      onClose={() => { setAwardMemberId(""); setAwardMemberSearch(""); setMemberParticipations([]); }}
      title={awardMemberSearch || t("admin.competition.memberAchievementsFallbackTitle")}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-bold text-ink-strong">{t("admin.competition.achievementHistoryTitle")}</div>
            <p className="text-xs text-ink-mute">{t("admin.competition.achievementHistorySub", { count: memberParticipations.length })}</p>
          </div>
          <Btn variant="primary" size="sm" icon="plus" onClick={() => openAddParticipant(awardMemberId)}>
            {t("admin.competition.addAwardBtn")}
          </Btn>
        </div>
        {memberParticipationsLoading ? (
          <div className="py-8 text-center text-ink-mute text-sm">{t("admin.competition.loadingData")}</div>
        ) : memberParticipations.length === 0 ? (
          <div className="py-8 text-center text-ink-mute text-sm border border-dashed border-line rounded-xl">
            {t("admin.competition.noAwardsYet")}
          </div>
        ) : (
          <div className="overflow-x-auto border border-line rounded-2xl">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-line bg-paper-tint text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  <th className="py-3 px-4 min-w-[200px]">Perlombaan</th>
                  <th className="py-3 px-4 min-w-[140px]">{t("admin.competition.colCategory")}</th>
                  <th className="py-3 px-4 w-32 whitespace-nowrap">Waktu</th>
                  <th className="py-3 px-4 text-center w-24 whitespace-nowrap">Peringkat</th>
                  <th className="py-3 px-4 text-center w-36 whitespace-nowrap">Penghargaan</th>
                  <th className="py-3 px-4 text-center w-28 whitespace-nowrap">Sertifikat</th>
                  <th className="py-3 px-4 text-right w-32 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {memberParticipations.map(p => {
                  const awardInfo = AWARD_LABELS[p.award] || AWARD_LABELS.participant;
                  const comp = (p as unknown as { competition?: { name: string; start_date: string; level: string } }).competition;
                  return (
                    <tr key={p.id} className="hover:bg-paper-tint/60 transition-colors">
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="font-bold text-ink-strong line-clamp-1">{comp?.name ?? "—"}</div>
                        {comp?.start_date && <div className="text-xs text-ink-mute mt-0.5">{fmtDate(comp.start_date)}</div>}
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="font-medium text-ink">{p.category}</div>
                        {p.age_group && <div className="text-xs text-ink-mute">{p.age_group}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-ocean-700 font-bold whitespace-nowrap">
                        {p.time_formatted || (p.time_seconds ? `${p.time_seconds}s` : "—")}
                      </td>
                      <td className="py-3 px-4 text-center font-bold whitespace-nowrap">{p.rank ? `#${p.rank}` : "—"}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${awardInfo.style}`}>
                          {awardInfo.icon} {p.award === "custom" && p.custom_award_label ? p.custom_award_label : awardInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {(() => {
                          const doc = getDoc(p.member_id, p.competition_id);
                          return doc ? (
                            <button
                              type="button"
                              onClick={() => handleViewDoc(doc)}
                              className="text-xs font-semibold text-ocean-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                            >
                              <Icon name="eye" className="w-3.5 h-3.5" /> View
                            </button>
                          ) : (
                            <span className="text-xs text-ink-faint">—</span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDuplicateParticipant(p)}
                            title={t("admin.competition.duplicateEntryTitle")}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                          >
                            <Icon name="copy" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditParticipant(p)}
                            title={t("admin.competition.editTitle")}
                            className="w-7 h-7 rounded-lg hover:bg-paper-deep text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                          >
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(p)}
                            title={t("admin.competition.deleteBtn")}
                            className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-mute hover:text-danger-500 flex items-center justify-center transition-colors"
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
