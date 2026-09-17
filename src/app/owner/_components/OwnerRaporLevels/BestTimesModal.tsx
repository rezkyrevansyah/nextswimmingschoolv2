"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useOwnerRaporLevels } from "./useOwnerRaporLevels";

type Hook = ReturnType<typeof useOwnerRaporLevels>;

export default function BestTimesModal({ hook }: { hook: Hook }) {
  const { t, tNode } = useLocale();
  const {
    bestTimeLevel, setBestTimeLevel, loadingBestTimes, distances, strokes, targets,
    newDistance, setNewDistance, addingDistance, addDistance, deleteDistance,
    newStroke, setNewStroke, addingStroke, addStroke, deleteStroke,
    cellDrafts, setCellDrafts, savingCell, targetKey, saveTargetCell,
  } = hook;

  const close = () => setBestTimeLevel(null);

  return (
    <Modal open={!!bestTimeLevel} onClose={close}
      title={tNode("owner.raporLevels.bestTimeModalTitle", { level: bestTimeLevel?.name ?? "" })} size="lg"
      footer={<Btn variant="ghost" onClick={close}>{t("common.actions.close")}</Btn>}>
      <div className="space-y-6">
        <p className="text-xs text-ink-mute">{t("owner.raporLevels.bestTimeHint")}</p>
        {loadingBestTimes ? <div className="text-ink-mute text-sm text-center py-6">{t("owner.raporLevels.criteriaLoading")}</div> : (
          <>
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.distancesTitle")}</div>
              {distances.length === 0 && <p className="text-sm text-ink-mute">{t("owner.raporLevels.distancesEmpty")}</p>}
              <div className="flex flex-wrap gap-2">
                {distances.map(d => (
                  <span key={d.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-ocean-50 text-ocean-700 text-sm font-semibold">
                    {d.distance}m
                    <button type="button" onClick={() => deleteDistance(d.id)} className="w-5 h-5 rounded-full hover:bg-danger-100 text-ocean-700 hover:text-danger-600 flex items-center justify-center">
                      <Icon name="x" className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input inputMode="numeric" value={newDistance} onChange={e => setNewDistance(e.target.value)} placeholder={t("owner.raporLevels.addDistancePlaceholder")} className="max-w-[140px]" />
                <Btn variant="outline" size="sm" icon="plus" onClick={addDistance} disabled={addingDistance}>{t("owner.raporLevels.addDistanceBtn")}</Btn>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.strokesTitle")}</div>
              {strokes.length === 0 && <p className="text-sm text-ink-mute">{t("owner.raporLevels.strokesEmpty")}</p>}
              <div className="flex flex-wrap gap-2">
                {strokes.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-wave-50 text-wave-700 text-sm font-semibold">
                    <NoTranslate>{s.name}</NoTranslate>
                    <button type="button" onClick={() => deleteStroke(s.id)} className="w-5 h-5 rounded-full hover:bg-danger-100 text-wave-700 hover:text-danger-600 flex items-center justify-center">
                      <Icon name="x" className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input value={newStroke} onChange={e => setNewStroke(e.target.value)} placeholder={t("owner.raporLevels.addStrokePlaceholder")} className="max-w-[220px]" />
                <Btn variant="outline" size="sm" icon="plus" onClick={addStroke} disabled={addingStroke}>{t("owner.raporLevels.addStrokeBtn")}</Btn>
              </div>
            </div>

            <div className="space-y-2 border-t border-line pt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.targetsTitle")}</div>
              <p className="text-xs text-ink-mute">{t("owner.raporLevels.targetsHint")}</p>
              {distances.length === 0 || strokes.length === 0 ? (
                <p className="text-sm text-ink-mute">{t("owner.raporLevels.targetsEmptyNeedBoth")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-2 text-xs uppercase tracking-widest text-ink-faint font-bold border-b border-line">{t("owner.raporLevels.strokesTitle")}</th>
                        {distances.map(d => (
                          <th key={d.id} className="text-center p-2 text-xs uppercase tracking-widest text-ink-faint font-bold border-b border-line">{d.distance}m</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {strokes.map(s => (
                        <tr key={s.id}>
                          <td className="p-2 font-semibold text-ink border-b border-line"><NoTranslate>{s.name}</NoTranslate></td>
                          {distances.map(d => {
                            const key = targetKey(s.id, d.id);
                            const existing = targets.find(tg => tg.stroke_id === s.id && tg.distance_id === d.id);
                            const draft = cellDrafts.get(key);
                            const value = draft !== undefined ? draft : (existing?.target_time_seconds != null ? String(existing.target_time_seconds) : "");
                            return (
                              <td key={d.id} className="p-2 border-b border-line">
                                <Input
                                  inputMode="decimal"
                                  value={value}
                                  placeholder={t("owner.raporLevels.targetPlaceholder")}
                                  disabled={savingCell === key}
                                  onChange={e => setCellDrafts(prev => new Map(prev).set(key, e.target.value))}
                                  onBlur={e => saveTargetCell(s.id, d.id, e.target.value)}
                                  className="text-center"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
