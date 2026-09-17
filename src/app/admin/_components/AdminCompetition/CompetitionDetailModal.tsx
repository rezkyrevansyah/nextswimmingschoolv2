"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";
import type { AdminCompetitionHook } from "./_hook";

export default function CompetitionDetailModal({ hook }: { hook: AdminCompetitionHook }) {
  const {
    t, AWARD_LABELS, selectedComp, setSelectedComp, participations, loadingParts,
    openAddParticipant, openEditParticipant, handleRemoveParticipant, getDoc, handleViewDoc,
  } = hook;

  if (!selectedComp) return null;

  return (
    <Modal
      open={!!selectedComp}
      onClose={() => setSelectedComp(null)}
      title={`Detail Perlombaan — ${selectedComp.name}`}
      size="xl"
    >
      <div className="space-y-5">
        {/* Comp Header Info Card */}
        <div className="bg-ocean-50/70 border border-ocean-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <div className="font-bold text-ocean-900 text-base">{selectedComp.name}</div>
            <div className="text-ocean-700 text-xs mt-0.5">
              📍 {selectedComp.location || selectedComp.city || t("admin.competition.locationNotSetFallback")} | 📅 {fmtDate(selectedComp.start_date)}
              {selectedComp.organizer && ` | 🏢 ${selectedComp.organizer}`}
            </div>
          </div>
          <Btn variant="primary" size="sm" icon="plus" onClick={() => openAddParticipant()}>
            {t("admin.competition.addMemberResultBtn")}
          </Btn>
        </div>

        {/* Participants Table */}
        <div className="space-y-3">
          <div className="font-bold text-ink-strong flex items-center justify-between">
            <span>Daftar Peserta & Hasil ({participations.length})</span>
          </div>

          {loadingParts ? (
            <div className="py-8 text-center text-ink-mute">{t("admin.competition.loadingParticipants")}</div>
          ) : participations.length === 0 ? (
            <div className="py-8 text-center text-ink-mute border border-dashed border-line rounded-xl">
              {t("admin.competition.noParticipantsYet")}
            </div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-2xl">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-paper-tint text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-line">
                    <th className="py-3 px-4 min-w-[200px]">{t("admin.competition.colMemberBranch")}</th>
                    <th className="py-3 px-4 min-w-[160px]">{t("admin.competition.colCategoryAgeGroup")}</th>
                    <th className="py-3 px-4 w-32 whitespace-nowrap">Waktu Result</th>
                    <th className="py-3 px-4 text-center w-24 whitespace-nowrap">Peringkat</th>
                    <th className="py-3 px-4 text-center w-36 whitespace-nowrap">Hasil / Medali</th>
                    <th className="py-3 px-4 min-w-[140px]">Coach</th>
                    <th className="py-3 px-4 text-center w-28 whitespace-nowrap">Sertifikat</th>
                    <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {participations.map(p => {
                    const awardInfo = AWARD_LABELS[p.award] || AWARD_LABELS.participant;
                    const memberName = (p.member?.profile as any)?.full_name ?? "Student";
                    const avatarUrl = (p.member?.profile as any)?.avatar_url;

                    return (
                      <tr key={p.id} className="hover:bg-paper-tint/60 transition-colors">
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={avatarUrl ?? undefined} name={memberName} size={32} />
                            <div className="min-w-0">
                              <div className="font-bold text-ink-strong truncate max-w-[180px]">{memberName}</div>
                              <div className="text-xs text-ink-mute">{p.branch?.name || "Center"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 min-w-[160px]">
                          <div className="font-medium text-ink-strong">{p.category}</div>
                          {p.age_group && <div className="text-xs text-ink-mute">{p.age_group}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-ocean-700 whitespace-nowrap">
                          {p.time_formatted || (p.time_seconds ? `${p.time_seconds}s` : "—")}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-ink-strong whitespace-nowrap">
                          {p.rank ? `#${p.rank}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${awardInfo.style}`}>
                            {awardInfo.icon} {p.award === "custom" && p.custom_award_label ? p.custom_award_label : awardInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-ink-soft min-w-[140px]">
                          {p.coach?.full_name || "—"}
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
                                <Icon name="eye" className="w-3.5 h-3.5" /> Lihat
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
                              onClick={() => openEditParticipant(p)}
                              title={t("admin.competition.editTitle")}
                              className="w-7 h-7 rounded-lg hover:bg-paper-deep text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                            >
                              <Icon name="edit" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(p)}
                              title={t("admin.competition.deleteTitle")}
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
      </div>
    </Modal>
  );
}
