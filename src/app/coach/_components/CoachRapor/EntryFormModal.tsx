"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useCoachRaporData } from "./useCoachRaporData";

export default function EntryFormModal({ hook }: { hook: ReturnType<typeof useCoachRaporData> }) {
  const { t } = useLocale();
  const {
    open, setOpen, setBestTimeMatrix, setOtherRecorded, setRemovedBtIds,
    criteria, scores, setScores,
    levelId, loadingLevelTemplate, visibleLevelOptions, handleLevelChange,
    notes, setNotes, notesStats, notesInvalid,
    levelDistances, levelStrokes, bestTimeMatrix, otherRecorded,
    personality, setPersonality, motivation, setMotivation,
    learningAchievements, setLearningAchievements,
    saving, saveRapor,
  } = hook;

  const close = () => { setOpen(null); setBestTimeMatrix([]); setOtherRecorded([]); setRemovedBtIds([]); };

  return (
    <Modal open={!!open} onClose={close} title={t("coach.rapor.modalTitle", { name: open?.member?.profile?.full_name ?? "" })} size="lg"
      footer={<><Btn variant="ghost" onClick={close}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveRapor} disabled={saving || notesInvalid}>{saving ? t("coach.absen.savingBtn") : t("coach.rapor.saveRaporBtn")}</Btn></>}>
      <div className="space-y-5">
        {criteria.length === 0 && (
          <p className="text-xs text-warn-600">{t("coach.rapor.selectLevelHint")}</p>
        )}
        {criteria.map((c) => (
          <div key={c.id}>
            <div className="font-semibold text-ink text-sm mb-2">{c.label}</div>
            {(c.kind === "score_10" || c.kind === "score_100") && (() => {
              const max = c.kind === "score_10" ? 10 : 100;
              return (
                <>
                  <input type="range" min={0} max={max} value={(scores[c.id] as number) ?? 0}
                    onChange={e => setScores(s => ({ ...s, [c.id]: Number(e.target.value) }))} className="w-full" />
                  <div className="flex justify-between text-[10px] font-mono text-ink-mute mt-1">
                    <span>0</span><span className="font-bold text-ocean-700">{(scores[c.id] as number) ?? 0}/{max}</span><span>{max}</span>
                  </div>
                </>
              );
            })()}
            {c.kind === "choice" && c.options && (
              <div className="flex flex-wrap gap-2">
                {c.options.map((opt) => (
                  <button key={opt} onClick={() => setScores(s => ({ ...s, [c.id]: opt }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${scores[c.id] === opt ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line text-ink-soft hover:border-ocean-300"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {c.kind === "text" && (
              <Textarea rows={2} value={(scores[c.id] as string) ?? ""}
                onChange={e => setScores(s => ({ ...s, [c.id]: e.target.value }))} placeholder={t("coach.rapor.notesPlaceholder")} />
            )}
          </div>
        ))}
        <Field label={t("coach.rapor.fieldLevelMember")} hint={t("coach.rapor.levelHint")}>
          <select
            value={levelId}
            onChange={e => void handleLevelChange(e.target.value)}
            disabled={loadingLevelTemplate}
            className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white disabled:opacity-60"
          >
            <option value="">{t("coach.rapor.selectLevelPlaceholder")}</option>
            {visibleLevelOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field
          label={t("coach.rapor.fieldGeneralNotes")}
          hint={notesInvalid ? undefined : t("coach.rapor.notesHint")}
          error={
            notesStats.hasNewline ? t("coach.rapor.notesErrorNewline") :
            notesStats.sentences > 1 ? t("coach.rapor.notesErrorSentences", { count: notesStats.sentences }) :
            notesStats.words > 50 ? t("coach.rapor.notesErrorWords", { count: notesStats.words }) :
            undefined
          }
        >
          <div className="relative">
            <Textarea
              rows={3}
              value={notes}
              maxLength={289}
              onChange={e => setNotes(e.target.value)}
              placeholder={t("coach.rapor.notesPlaceholder")}
              className={notesInvalid ? "border-danger-400 focus:border-danger-400 focus:ring-danger-100" : undefined}
            />
            <span className={`absolute bottom-2 right-3 text-[10px] font-mono tabular-nums pointer-events-none ${289 - notesStats.chars <= 20 ? "text-danger-500 font-bold" : "text-ink-faint"}`}>
              {notesStats.chars}/289
            </span>
          </div>
        </Field>

        {/* Personal Best Time */}
        <div className="border-t border-line pt-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-mute">{t("coach.bestTime.sectionTitle")}</div>
          {levelDistances.length === 0 || levelStrokes.length === 0 ? (
            <p className="text-xs text-ink-faint italic">{t("coach.bestTime.emptyNoTemplate")}</p>
          ) : (
            <>
              <p className="text-xs text-ink-mute -mt-1">{t("coach.bestTime.hint")}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-1.5 font-bold text-ink-mute uppercase tracking-widest border-b border-line" />
                      {levelDistances.map(d => (
                        <th key={d.id} className="text-center p-1.5 font-bold text-ink-mute uppercase tracking-widest border-b border-line">{d.distance}m</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {levelStrokes.map(s => (
                      <tr key={s.id}>
                        <td className="p-1.5 font-semibold text-ink border-b border-line whitespace-nowrap">{s.name}</td>
                        {levelDistances.map(d => {
                          const idx = bestTimeMatrix.findIndex(c => c.strokeId === s.id && c.distanceId === d.id);
                          const cell = idx >= 0 ? bestTimeMatrix[idx] : null;
                          return (
                            <td key={d.id} className="p-1.5 border-b border-line">
                              <input
                                type="text"
                                value={cell?.time ?? ""}
                                onChange={e => setBestTimeMatrix(prev => prev.map((c, i) => i === idx ? { ...c, time: e.target.value } : c))}
                                placeholder="1:30 atau 45"
                                className="w-full border border-line rounded-lg px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white placeholder:text-ink-faint"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {otherRecorded.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-mute">{t("coach.bestTime.otherRecordedTitle")}</div>
              <p className="text-xs text-ink-mute -mt-1">{t("coach.bestTime.otherRecordedHint")}</p>
              {otherRecorded.map(row => (
                <div key={row.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 font-semibold text-ink">{row.stroke} · {row.distance}m</span>
                  <span className="font-mono text-ink-mute">{row.time_seconds}s</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRemovedBtIds(prev => [...prev, row.id]);
                      setOtherRecorded(prev => prev.filter(r => r.id !== row.id));
                    }}
                    className="w-7 h-7 rounded-lg border border-line hover:bg-danger-50 hover:border-danger-200 flex items-center justify-center text-ink-faint hover:text-danger-500 transition-colors"
                  >
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-line pt-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-mute">{t("coach.rapor.characterEvalTitle")}</div>
          <Field label={t("coach.rapor.fieldPersonality")} hint={t("coach.rapor.personalityHint")}>
            <Input value={personality} onChange={e => setPersonality(e.target.value)} placeholder={t("coach.rapor.personalityPlaceholder")} />
          </Field>
          <Field label={t("coach.rapor.fieldMotivation")} hint={t("coach.rapor.motivationHint")}>
            <Input value={motivation} onChange={e => setMotivation(e.target.value)} placeholder={t("coach.rapor.motivationPlaceholder")} />
          </Field>
          <Field label={t("coach.rapor.fieldLearningAchievements")} hint={t("coach.rapor.learningAchievementsHint")}>
            <Textarea rows={2} value={learningAchievements} onChange={e => setLearningAchievements(e.target.value)} placeholder={t("coach.rapor.learningAchievementsPlaceholder")} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
