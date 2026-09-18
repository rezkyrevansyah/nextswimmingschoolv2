"use client";
import Icon from "@/components/ui/Icon";
import { Switch } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useOwnerRaporLevels } from "./useOwnerRaporLevels";
import CriteriaModal from "./CriteriaModal";
import BestTimesModal from "./BestTimesModal";
import ClassScopeModal from "./ClassScopeModal";

export default function OwnerRaporLevels() {
  const hook = useOwnerRaporLevels();
  const {
    levels, selectedLevel, setSelectedLevel, loading, newName, setNewName, creating, renaming, setRenaming, reordering,
    addLevel, saveRename, toggleActive, deleteLevel, move,
    setCriteriaLevel, openCriteria,
    criteria, loadingCriteria, kindLabel, savingCriterion, duplicateCriterion, deleteCriterion, setEditingCriterion,
    openBestTimes,
    distances, strokes, targets, loadingBestTimes, cellDrafts, savingCell, targetKey, saveTargetCell, setCellDrafts,
    classOptions, selectedClassIds, setAllClasses, toggleClassSelection,
  } = hook;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Column: Levels List */}
        <div className="w-full lg:w-80 shrink-0 bg-paper rounded-2xl border border-line p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Levels</h3>
            <p className="text-xs text-ink-mute mt-1">Global template, not a student report.</p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-ink-mute text-sm">{"Loading…"}</div>
          ) : levels.length === 0 ? (
            <div className="py-10 text-center text-ink-mute text-sm">{"No levels yet. Add your first level above."}</div>
          ) : (
            <div className="space-y-1.5">
              {levels.map((lvl, i) => {
                const isSelected = selectedLevel?.id === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    className={`h-12 px-3 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-ocean-50 text-ocean-700 border border-ocean-200/60 shadow-xs"
                        : "bg-paper hover:bg-paper-tint text-ink border border-transparent hover:border-line"
                    }`}
                    onClick={() => setSelectedLevel(lvl)}
                  >
                    <div className="flex flex-col shrink-0 text-ink-faint">
                      <button
                        type="button"
                        disabled={i === 0 || reordering === lvl.id}
                        onClick={(e) => { e.stopPropagation(); move(lvl, "up"); }}
                        className="w-3.5 h-3 text-[9px] hover:text-ocean-600 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={i === levels.length - 1 || reordering === lvl.id}
                        onClick={(e) => { e.stopPropagation(); move(lvl, "down"); }}
                        className="w-3.5 h-3 text-[9px] hover:text-ocean-600 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm truncate ${isSelected ? "text-ocean-800" : "text-ink"}`}>
                        <NoTranslate>{lvl.name}</NoTranslate>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <Switch checked={lvl.active} onChange={() => toggleActive(lvl)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-line">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={"E.g. Level A"}
                className="h-9 px-3 text-xs rounded-xl border border-line bg-paper text-ink flex-1 focus:outline-hidden focus:border-ocean-500"
              />
              <button
                type="button"
                onClick={addLevel}
                disabled={creating}
                className="h-9 px-3 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Level Detail */}
        {selectedLevel ? (
          <div className="flex-1 w-full bg-paper rounded-2xl border border-line p-6 space-y-6 shadow-xs">
            {/* Header */}
            <div className="border-b border-line pb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display font-bold text-xl text-ink">
                  <NoTranslate>{selectedLevel.name}</NoTranslate>
                </h2>
                <p className="text-xs text-ink-mute mt-1">
                  Criteria, standard times and which classes this level covers.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRenaming({ id: selectedLevel.id, name: selectedLevel.name })}
                  className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-tint text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                  title={"Rename"}
                >
                  <Icon name="edit" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteLevel(selectedLevel)}
                  className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-rose-50 text-ink-mute hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title={"Delete"}
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {renaming && renaming.id === selectedLevel.id && (
              <div className="p-3 bg-ocean-50 rounded-xl border border-ocean-200 flex items-center gap-2">
                <input
                  type="text"
                  value={renaming.name}
                  onChange={e => setRenaming({ id: selectedLevel.id, name: e.target.value })}
                  className="h-9 px-3 text-sm rounded-lg border border-line bg-paper text-ink flex-1 focus:outline-hidden focus:border-ocean-500"
                />
                <button
                  type="button"
                  onClick={saveRename}
                  className="h-9 px-3 rounded-lg bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {"Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(null)}
                  className="h-9 px-3 rounded-lg border border-line bg-paper hover:bg-paper-tint text-ink-soft text-xs font-semibold cursor-pointer"
                >
                  {"Cancel"}
                </button>
              </div>
            )}

            {/* Section 1: Criteria */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  CRITERIA
                </div>
                <button
                  type="button"
                  onClick={() => openCriteria(selectedLevel)}
                  className="h-8 px-3 rounded-lg border border-line bg-paper hover:bg-paper-tint text-ink-soft text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>Add criterion</span>
                </button>
              </div>

              {loadingCriteria ? (
                <div className="py-6 text-center text-ink-mute text-sm">{"Loading…"}</div>
              ) : criteria.length === 0 ? (
                <div className="space-y-2.5">
                  <div className="h-[130px] rounded-xl border border-line bg-paper-deep flex flex-col items-center justify-center gap-1.5 text-center p-4">
                    <Icon name="checklist" className="w-6 h-6 text-ink-faint" />
                    <div className="text-sm font-semibold text-ink-soft">No criteria yet</div>
                    <div className="text-xs text-ink-mute max-w-sm">
                      Coaches cannot fill this level until at least one criterion exists.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {criteria.map((cr, idx) => (
                    <div
                      key={cr.id}
                      className="h-12 border border-line bg-paper-tint rounded-xl px-3 flex items-center gap-2.5 hover:bg-paper-deep/70 transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-ocean-100 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 font-medium text-sm text-ink truncate">
                        <NoTranslate>{cr.label}</NoTranslate>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-deep text-ink-soft border border-line shrink-0">
                        {kindLabel[cr.kind] ?? cr.kind}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => duplicateCriterion(cr)}
                          disabled={savingCriterion}
                          className="w-7 h-7 rounded-md border border-line bg-paper hover:bg-ocean-50 text-ink-mute hover:text-ocean-700 flex items-center justify-center transition-colors cursor-pointer"
                          title={"Duplicate"}
                        >
                          <Icon name="copy" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCriteriaLevel(selectedLevel);
                            setEditingCriterion({ id: cr.id, label: cr.label, kind: cr.kind, options: cr.options ?? [] });
                          }}
                          className="w-7 h-7 rounded-md border border-line bg-paper hover:bg-paper-tint text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                          title={"Edit"}
                        >
                          <Icon name="edit" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCriterion(cr.id)}
                          className="w-7 h-7 rounded-md border border-line bg-paper hover:bg-rose-50 text-ink-mute hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title={"Delete"}
                        >
                          <Icon name="trash" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Standard Times */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  STANDARD TIMES
                </div>
                <button
                  type="button"
                  onClick={() => openBestTimes(selectedLevel)}
                  className="h-8 px-3 rounded-lg border border-line bg-paper hover:bg-paper-tint text-ink-soft text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Icon name="target" className="w-3.5 h-3.5" />
                  <span>Configure Matrix</span>
                </button>
              </div>

              {loadingBestTimes ? (
                <div className="py-6 text-center text-ink-mute text-sm">{"Loading…"}</div>
              ) : distances.length === 0 || strokes.length === 0 ? (
                <div className="p-4 rounded-xl border border-line bg-paper-deep text-xs text-ink-mute flex items-center justify-between gap-3">
                  <span>Distances: {distances.length} · Strokes: {strokes.length}. Configure distances &amp; strokes to record standard target times.</span>
                  <button
                    type="button"
                    onClick={() => openBestTimes(selectedLevel)}
                    className="text-xs text-ocean-600 hover:text-ocean-700 font-semibold cursor-pointer"
                  >
                    Setup times &rarr;
                  </button>
                </div>
              ) : (
                <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="h-8 bg-paper-deep border-b border-line text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                        <th className="text-left px-3.5 py-1">Stroke</th>
                        {distances.map(d => (
                          <th key={d.id} className="text-center px-2 py-1 font-mono">{d.distance}m</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {strokes.map(s => (
                        <tr key={s.id} className="h-10 hover:bg-paper-tint/50">
                          <td className="px-3.5 py-1 font-medium text-ink text-xs">
                            <NoTranslate>{s.name}</NoTranslate>
                          </td>
                          {distances.map(d => {
                            const key = targetKey(s.id, d.id);
                            const existing = targets.find(tg => tg.stroke_id === s.id && tg.distance_id === d.id);
                            const draft = cellDrafts.get(key);
                            const value = draft !== undefined ? draft : (existing?.target_time_seconds != null ? String(existing.target_time_seconds) : "");
                            return (
                              <td key={d.id} className="px-2 py-1 text-center">
                                <input
                                  inputMode="decimal"
                                  value={value}
                                  placeholder="—"
                                  disabled={savingCell === key}
                                  onChange={e => setCellDrafts(prev => new Map(prev).set(key, e.target.value))}
                                  onBlur={e => saveTargetCell(s.id, d.id, e.target.value)}
                                  className="w-16 h-7 text-center font-mono text-xs rounded-md border border-line bg-paper text-ink focus:outline-hidden focus:border-ocean-500"
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

            {/* Section 3: Scope */}
            <div className="space-y-3 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                SCOPE
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllClasses(true)}
                  className={`h-9 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedLevel.all_classes
                      ? "bg-ocean-600 text-white shadow-xs"
                      : "bg-paper text-ink-soft border border-line hover:bg-paper-tint"
                  }`}
                >
                  All classes
                </button>
                <button
                  type="button"
                  onClick={() => setAllClasses(false)}
                  className={`h-9 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    !selectedLevel.all_classes
                      ? "bg-ocean-600 text-white shadow-xs"
                      : "bg-paper text-ink-soft border border-line hover:bg-paper-tint"
                  }`}
                >
                  Specific classes only
                </button>
              </div>

              {!selectedLevel.all_classes && (
                <div className="pt-1">
                  <div className="max-h-60 overflow-y-auto divide-y divide-line border border-line rounded-xl bg-paper">
                    {classOptions.map(c => (
                      <label key={c.id} className="flex items-center gap-3 px-3.5 py-2 hover:bg-paper-tint cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-line accent-ocean-600 cursor-pointer"
                          checked={selectedClassIds.has(c.id)}
                          onChange={() => toggleClassSelection(c.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-ink"><NoTranslate>{c.name}</NoTranslate></span>
                          {c.branch_name && <span className="text-ink-mute ml-2 font-normal">· <NoTranslate>{c.branch_name}</NoTranslate></span>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-paper rounded-2xl border border-line p-12 flex flex-col items-center justify-center text-ink-mute text-sm min-h-[360px]">
            <Icon name="trophy" className="w-10 h-10 text-ink-faint mb-2" />
            <span>Select a level to view its criteria, standard times and class scope.</span>
          </div>
        )}
      </div>

      <CriteriaModal hook={hook} />
      <BestTimesModal hook={hook} />
      <ClassScopeModal hook={hook} />
    </div>
  );
}
