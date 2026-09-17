"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useOwnerRaporLevels } from "./useOwnerRaporLevels";

type Hook = ReturnType<typeof useOwnerRaporLevels>;

export default function CriteriaModal({ hook }: { hook: Hook }) {
  const { t, tNode } = useLocale();
  const {
    criteriaLevel, setCriteriaLevel, setCriterionForm, setEditingCriterion,
    loadingCriteria, criteria, bulkKind, setBulkKind, applyBulkKind, applyingBulk, kindLabel,
    editingCriterion, criterionForm, savingCriterion, duplicateCriterion, deleteCriterion, addCriterion, updateCriterion,
  } = hook;

  const close = () => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); };

  return (
    <Modal open={!!criteriaLevel} onClose={close}
      title={tNode("owner.raporLevels.criteriaModalTitle", { level: criteriaLevel?.name ?? "" })} size="lg"
      footer={<Btn variant="ghost" onClick={close}>{t("common.actions.close")}</Btn>}>
      <div className="space-y-5">
        {loadingCriteria ? <div className="text-ink-mute text-sm text-center py-6">{t("owner.raporLevels.criteriaLoading")}</div> : (
          <>
            {criteria.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 bg-paper-tint rounded-xl border border-line">
                  <span className="text-xs text-ink-mute shrink-0">{t("owner.raporLevels.changeAllTo")}</span>
                  <select value={bulkKind} onChange={e => setBulkKind(e.target.value)}
                    className="flex-1 text-xs border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500">
                    <option value="score_10">{t("owner.raporLevels.kindLabel.score_10")}</option>
                    <option value="score_100">{t("owner.raporLevels.kindLabel.score_100")}</option>
                    <option value="choice">{t("owner.raporLevels.kindLabel.choice")}</option>
                    <option value="text">{t("owner.raporLevels.kindLabel.text")}</option>
                  </select>
                  <Btn variant="outline" size="sm" onClick={applyBulkKind} disabled={applyingBulk}>{applyingBulk ? t("owner.raporLevels.changingAll") : t("owner.raporLevels.applyBtn")}</Btn>
                </div>

                {criteria.map((cr, i) => (
                  <div key={cr.id} className="rounded-xl border border-line overflow-hidden">
                    {editingCriterion?.id === cr.id ? (
                      <div className="p-3 space-y-2 bg-ocean-50/40">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <Field label={t("owner.raporLevels.fieldLabel")}><Input value={editingCriterion.label} onChange={e => setEditingCriterion(v => v ? { ...v, label: e.target.value } : v)} /></Field>
                          <Field label={t("owner.raporLevels.fieldKind")}>
                            <Select value={editingCriterion.kind} onChange={e => setEditingCriterion(v => v ? { ...v, kind: e.target.value } : v)}>
                              <option value="score_10">{t("owner.raporLevels.kindLabel.score_10")}</option>
                              <option value="score_100">{t("owner.raporLevels.kindLabel.score_100")}</option>
                              <option value="choice">{t("owner.raporLevels.kindLabel.choice")}</option>
                              <option value="text">{t("owner.raporLevels.kindLabel.text")}</option>
                            </Select>
                          </Field>
                        </div>
                        {editingCriterion.kind === "choice" && (
                          <Field label={t("owner.raporLevels.fieldOptions")}>
                            <div className="space-y-1.5">
                              {editingCriterion.options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                                  <Input value={opt} onChange={e => setEditingCriterion(v => { if (!v) return v; const opts = [...v.options]; opts[idx] = e.target.value; return { ...v, options: opts }; })} placeholder={t("owner.raporLevels.optionPlaceholder", { number: idx + 1 })} className="flex-1" />
                                  <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: v.options.filter((_, i) => i !== idx) } : v)} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                                </div>
                              ))}
                              <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: [...v.options, ""] } : v)} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                                <Icon name="plus" className="w-3.5 h-3.5" />{t("owner.raporLevels.addOption")}
                              </button>
                            </div>
                          </Field>
                        )}
                        <div className="flex gap-2">
                          <Btn variant="primary" size="sm" onClick={updateCriterion}>{t("owner.raporLevels.saveBtn")}</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => setEditingCriterion(null)}>{t("owner.raporLevels.cancelBtn")}</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                        <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink text-sm"><NoTranslate>{cr.label}</NoTranslate></div>
                          <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? <NoTranslate>{cr.kind}</NoTranslate>}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                        </div>
                        <button onClick={() => duplicateCriterion(cr)} disabled={savingCriterion}
                          className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0 disabled:opacity-50" title={t("owner.raporLevels.duplicateTitle")}>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingCriterion({ id: cr.id, label: cr.label, kind: cr.kind, options: cr.options ?? [] })}
                          className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title={t("owner.raporLevels.editTitle")}>
                          <Icon name="edit" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCriterion(cr.id)}
                          className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title={t("owner.raporLevels.deleteTitle")}>
                          <Icon name="x" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-mute">{t("owner.raporLevels.criteriaEmpty")}</p>
            )}

            <div className="border-t border-line pt-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.addNewCriterionTitle")}</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("owner.raporLevels.fieldLabel")} required><Input value={criterionForm.label} onChange={e => setCriterionForm(f => ({ ...f, label: e.target.value }))} placeholder={t("owner.raporLevels.fieldLabelPlaceholder")} /></Field>
                <Field label={t("owner.raporLevels.fieldKind")}>
                  <Select value={criterionForm.kind} onChange={e => setCriterionForm(f => ({ ...f, kind: e.target.value }))}>
                    <option value="score_10">{t("owner.raporLevels.kindLabel.score_10")}</option>
                    <option value="score_100">{t("owner.raporLevels.kindLabel.score_100")}</option>
                    <option value="choice">{t("owner.raporLevels.kindLabel.choice")}</option>
                    <option value="text">{t("owner.raporLevels.kindLabel.text")}</option>
                  </Select>
                </Field>
              </div>
              {criterionForm.kind === "choice" && (
                <Field label={t("owner.raporLevels.fieldOptions")}>
                  <div className="space-y-1.5">
                    {criterionForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                        <Input value={opt} onChange={e => setCriterionForm(f => { const opts = [...f.options]; opts[idx] = e.target.value; return { ...f, options: opts }; })} placeholder={t("owner.raporLevels.optionPlaceholder", { number: idx + 1 })} className="flex-1" />
                        <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: [...f.options, ""] }))} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                      <Icon name="plus" className="w-3.5 h-3.5" />{t("owner.raporLevels.addOption")}
                    </button>
                  </div>
                </Field>
              )}
              <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? t("owner.raporLevels.savingCriterion") : t("owner.raporLevels.addCriterion")}</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
