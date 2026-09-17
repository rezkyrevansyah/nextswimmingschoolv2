"use client";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { RaporLevel, ClassOption, LevelCriterion, LevelDistanceRow, LevelStrokeRow, BestTimeTargetRow } from "./_types";

export function useOwnerRaporLevels() {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [levels, setLevels] = useState<RaporLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<RaporLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  const [criteriaLevel, setCriteriaLevel] = useState<RaporLevel | null>(null);
  const [bestTimeLevel, setBestTimeLevel] = useState<RaporLevel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("rapor_levels").select("id, name, sort_order, active, all_classes").order("sort_order");
    const list = (data ?? []) as RaporLevel[];
    setLevels(list);
    setSelectedLevel(prev => prev ? list.find(l => l.id === prev.id) || list[0] : list[0] || null);
    setLoading(false);
  }, [supabase]);

  // ── Class scope ──────────────────────────────────────────────────────────────
  const [classScopeLevel, setClassScopeLevel] = useState<RaporLevel | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  const loadClassOptions = useCallback(async () => {
    const { data } = await supabase.from("classes").select("id, name, branch_id, branch:branches(name)").eq("status", "active").order("branch_id").order("name");
    setClassOptions((data ?? []).map(c => ({ id: c.id, name: c.name, branch_id: c.branch_id, branch_name: (c.branch as unknown as { name: string } | null)?.name ?? null })));
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); loadClassOptions(); }, [load, loadClassOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openClassScope = async (lvl: RaporLevel) => {
    setClassScopeLevel(lvl);
    const { data } = await supabase.from("rapor_level_classes").select("class_id").eq("level_id", lvl.id);
    setSelectedClassIds(new Set((data ?? []).map(r => r.class_id)));
  };

  const setAllClasses = async (value: boolean) => {
    if (!classScopeLevel) return;
    const { error } = await supabase.from("rapor_levels").update({ all_classes: value }).eq("id", classScopeLevel.id);
    if (error) return toast.error(t("owner.raporLevels.saveFailed"), error.message);
    setClassScopeLevel(prev => prev ? { ...prev, all_classes: value } : prev);
    setLevels(prev => prev.map(l => l.id === classScopeLevel.id ? { ...l, all_classes: value } : l));
  };

  const toggleClassSelection = async (classId: string) => {
    if (!classScopeLevel) return;
    const checked = selectedClassIds.has(classId);
    if (checked) {
      await supabase.from("rapor_level_classes").delete().eq("level_id", classScopeLevel.id).eq("class_id", classId);
      setSelectedClassIds(prev => { const next = new Set(prev); next.delete(classId); return next; });
    } else {
      await supabase.from("rapor_level_classes").insert({ level_id: classScopeLevel.id, class_id: classId });
      setSelectedClassIds(prev => new Set(prev).add(classId));
    }
  };

  const addLevel = async () => {
    if (!newName.trim()) return toast.error(t("owner.raporLevels.nameRequired"));
    setCreating(true);
    const { error } = await supabase.from("rapor_levels").insert({
      name: newName.trim(), sort_order: levels.length, active: true,
    });
    setCreating(false);
    if (error) return toast.error(t("owner.raporLevels.addFailed"), error.message);
    toast.success(t("owner.raporLevels.added"));
    setNewName("");
    load();
  };

  const saveRename = async () => {
    if (!renaming || !renaming.name.trim()) return toast.error(t("owner.raporLevels.nameRequired"));
    const { error } = await supabase.from("rapor_levels").update({ name: renaming.name.trim() }).eq("id", renaming.id);
    if (error) return toast.error(t("owner.raporLevels.saveFailed"), error.message);
    toast.success(t("owner.raporLevels.renamed"));
    setRenaming(null);
    load();
  };

  const toggleActive = async (lvl: RaporLevel) => {
    const { error } = await supabase.from("rapor_levels").update({ active: !lvl.active }).eq("id", lvl.id);
    if (error) return toast.error(t("owner.raporLevels.statusFailed"), error.message);
    setLevels(prev => prev.map(l => l.id === lvl.id ? { ...l, active: !l.active } : l));
  };

  const deleteLevel = async (lvl: RaporLevel) => {
    const yes = await confirm({ body: tNode("owner.raporLevels.deleteConfirmBody", { name: lvl.name }) });
    if (!yes) return;
    const { error } = await supabase.from("rapor_levels").delete().eq("id", lvl.id);
    if (error) return toast.error(t("owner.raporLevels.deleteFailed"), error.message);
    toast.success(t("owner.raporLevels.deleted"));
    load();
  };

  const move = async (lvl: RaporLevel, direction: "up" | "down") => {
    const idx = levels.findIndex(l => l.id === lvl.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= levels.length) return;
    const other = levels[swapIdx];
    setReordering(lvl.id);
    await Promise.all([
      supabase.from("rapor_levels").update({ sort_order: other.sort_order }).eq("id", lvl.id),
      supabase.from("rapor_levels").update({ sort_order: lvl.sort_order }).eq("id", other.id),
    ]);
    setReordering(null);
    load();
  };

  // ── Criteria ───────────────────────────────────────────────────────────────
  const [criteria, setCriteria] = useState<LevelCriterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const kindLabel: Record<string, string> = {
    score_10: t("owner.raporLevels.kindLabel.score_10"),
    score_100: t("owner.raporLevels.kindLabel.score_100"),
    choice: t("owner.raporLevels.kindLabel.choice"),
    text: t("owner.raporLevels.kindLabel.text"),
  };

  const loadCriteria = useCallback(async (levelId: string) => {
    setLoadingCriteria(true);
    const { data } = await supabase.from("rapor_level_criteria").select("id, label, kind, options, sort_order").eq("level_id", levelId).order("sort_order");
    setCriteria((data ?? []) as LevelCriterion[]);
    setLoadingCriteria(false);
  }, [supabase]);

  const openCriteria = (lvl: RaporLevel) => {
    setCriteriaLevel(lvl);
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    setEditingCriterion(null);
    loadCriteria(lvl.id);
  };

  const addCriterion = async () => {
    if (!criteriaLevel || !criterionForm.label) return toast.error(t("owner.raporLevels.labelRequired"));
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error(t("owner.raporLevels.criterionSaveFailed"), error.message);
    toast.success(t("owner.raporLevels.criterionAdded"));
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    loadCriteria(criteriaLevel.id);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm({ body: t("owner.raporLevels.criterionDeleteConfirmBody") });
    if (!yes) return;
    await supabase.from("rapor_level_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success(t("owner.raporLevels.criterionDeleted"));
  };

  const updateCriterion = async () => {
    if (!editingCriterion || !editingCriterion.label) return toast.error(t("owner.raporLevels.labelRequired"));
    const opts = editingCriterion.kind === "choice" ? editingCriterion.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").update({ label: editingCriterion.label, kind: editingCriterion.kind, options: opts }).eq("id", editingCriterion.id);
    if (error) return toast.error(t("owner.raporLevels.criterionSaveFailed"), error.message);
    setCriteria(prev => prev.map(c => c.id === editingCriterion.id ? { ...c, label: editingCriterion.label, kind: editingCriterion.kind, options: opts } : c));
    setEditingCriterion(null);
    toast.success(t("owner.raporLevels.criterionUpdated"));
  };

  const duplicateCriterion = async (cr: LevelCriterion) => {
    if (!criteriaLevel) return;
    setSavingCriterion(true);
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: cr.label, kind: cr.kind,
      options: cr.options ?? [], sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error(t("owner.raporLevels.duplicateFailed"), error.message);
    toast.success(t("owner.raporLevels.criterionDuplicated"));
    loadCriteria(criteriaLevel.id);
  };

  const applyBulkKind = async () => {
    if (!criteriaLevel || criteria.length === 0) return;
    const yes = await confirm({ body: t("owner.raporLevels.bulkConfirmBody", { count: criteria.length, kind: kindLabel[bulkKind] }) });
    if (!yes) return;
    setApplyingBulk(true);
    const opts = bulkKind === "choice" ? ["Sangat Baik", "Baik", "Cukup", "Perlu Latihan"] : null;
    await Promise.all(criteria.map(cr => supabase.from("rapor_level_criteria").update({ kind: bulkKind, options: opts }).eq("id", cr.id)));
    setApplyingBulk(false);
    loadCriteria(criteriaLevel.id);
    toast.success(t("owner.raporLevels.bulkUpdated"));
  };

  // ── Personal Best Time matrix (distances x strokes x per-cell target) ───────
  const [distances, setDistances] = useState<LevelDistanceRow[]>([]);
  const [strokes, setStrokes] = useState<LevelStrokeRow[]>([]);
  const [targets, setTargets] = useState<BestTimeTargetRow[]>([]);
  const [loadingBestTimes, setLoadingBestTimes] = useState(false);
  const [newDistance, setNewDistance] = useState("");
  const [addingDistance, setAddingDistance] = useState(false);
  const [newStroke, setNewStroke] = useState("");
  const [addingStroke, setAddingStroke] = useState(false);
  const [cellDrafts, setCellDrafts] = useState<Map<string, string>>(new Map());
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const targetKey = (strokeId: string, distanceId: string) => `${strokeId}:${distanceId}`;

  const loadBestTimeMatrix = useCallback(async (levelId: string) => {
    setLoadingBestTimes(true);
    const [{ data: d }, { data: s }, { data: tg }] = await Promise.all([
      supabase.from("rapor_level_distances").select("id, distance, sort_order").eq("level_id", levelId).order("sort_order"),
      supabase.from("rapor_level_strokes").select("id, name, sort_order").eq("level_id", levelId).order("sort_order"),
      supabase.from("rapor_level_best_time_targets").select("id, stroke_id, distance_id, target_time_seconds").eq("level_id", levelId),
    ]);
    setDistances((d ?? []) as LevelDistanceRow[]);
    setStrokes((s ?? []) as LevelStrokeRow[]);
    setTargets((tg ?? []) as BestTimeTargetRow[]);
    setCellDrafts(new Map());
    setLoadingBestTimes(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- sync selection */
  useEffect(() => {
    if (selectedLevel) {
      loadCriteria(selectedLevel.id);
      loadBestTimeMatrix(selectedLevel.id);
      setClassScopeLevel(selectedLevel);
      supabase.from("rapor_level_classes").select("class_id").eq("level_id", selectedLevel.id).then(({ data }) => {
        setSelectedClassIds(new Set((data ?? []).map(r => r.class_id)));
      });
    }
  }, [selectedLevel, loadCriteria, loadBestTimeMatrix, supabase]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openBestTimes = (lvl: RaporLevel) => {
    setBestTimeLevel(lvl);
    setNewDistance("");
    setNewStroke("");
    loadBestTimeMatrix(lvl.id);
  };

  const addDistance = async () => {
    const lvl = bestTimeLevel || selectedLevel;
    if (!lvl) return;
    const distance = parseInt(newDistance);
    if (!newDistance.trim() || isNaN(distance) || distance <= 0) return toast.error(t("owner.raporLevels.distanceRequired"));
    setAddingDistance(true);
    const { error } = await supabase.from("rapor_level_distances").insert({
      level_id: lvl.id, distance, sort_order: distances.length,
    });
    setAddingDistance(false);
    if (error) {
      if (error.code === "23505") return toast.error(t("owner.raporLevels.distanceDuplicate"));
      return toast.error(t("owner.raporLevels.addRowFailed"), error.message);
    }
    toast.success(t("owner.raporLevels.rowAdded"));
    setNewDistance("");
    loadBestTimeMatrix(lvl.id);
  };

  const deleteDistance = async (id: string) => {
    const lvl = bestTimeLevel || selectedLevel;
    const yes = await confirm({ body: t("owner.raporLevels.deleteDistanceConfirmBody") });
    if (!yes) return;
    await supabase.from("rapor_level_distances").delete().eq("id", id);
    if (lvl) loadBestTimeMatrix(lvl.id);
    toast.success(t("owner.raporLevels.rowDeleted"));
  };

  const addStroke = async () => {
    const lvl = bestTimeLevel || selectedLevel;
    if (!lvl) return;
    const name = newStroke.trim();
    if (!name) return toast.error(t("owner.raporLevels.strokeRequired"));
    setAddingStroke(true);
    const { error } = await supabase.from("rapor_level_strokes").insert({
      level_id: lvl.id, name, sort_order: strokes.length,
    });
    setAddingStroke(false);
    if (error) {
      if (error.code === "23505") return toast.error(t("owner.raporLevels.strokeDuplicate"));
      return toast.error(t("owner.raporLevels.addRowFailed"), error.message);
    }
    toast.success(t("owner.raporLevels.rowAdded"));
    setNewStroke("");
    loadBestTimeMatrix(lvl.id);
  };

  const deleteStroke = async (id: string) => {
    const lvl = bestTimeLevel || selectedLevel;
    const yes = await confirm({ body: t("owner.raporLevels.deleteStrokeConfirmBody") });
    if (!yes) return;
    await supabase.from("rapor_level_strokes").delete().eq("id", id);
    if (lvl) loadBestTimeMatrix(lvl.id);
    toast.success(t("owner.raporLevels.rowDeleted"));
  };

  const saveTargetCell = async (strokeId: string, distanceId: string, rawValue: string) => {
    const lvl = bestTimeLevel || selectedLevel;
    if (!lvl) return;
    const key = targetKey(strokeId, distanceId);
    const existing = targets.find(tg => tg.stroke_id === strokeId && tg.distance_id === distanceId);
    const value = rawValue.trim() ? parseFloat(rawValue) : null;
    setSavingCell(key);
    if (value == null) {
      if (existing) await supabase.from("rapor_level_best_time_targets").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("rapor_level_best_time_targets").update({ target_time_seconds: value }).eq("id", existing.id);
    } else {
      await supabase.from("rapor_level_best_time_targets").insert({
        level_id: lvl.id, stroke_id: strokeId, distance_id: distanceId, target_time_seconds: value,
      });
    }
    setSavingCell(null);
    loadBestTimeMatrix(lvl.id);
  };

  return {
    levels, selectedLevel, setSelectedLevel, loading, newName, setNewName, creating, renaming, setRenaming, reordering,
    addLevel, saveRename, toggleActive, deleteLevel, move,
    criteriaLevel, setCriteriaLevel, openCriteria,
    criteria, loadingCriteria, criterionForm, setCriterionForm, savingCriterion, editingCriterion, setEditingCriterion,
    bulkKind, setBulkKind, applyingBulk, kindLabel,
    addCriterion, deleteCriterion, updateCriterion, duplicateCriterion, applyBulkKind,
    bestTimeLevel, setBestTimeLevel, openBestTimes,
    distances, strokes, targets, loadingBestTimes, newDistance, setNewDistance, addingDistance,
    newStroke, setNewStroke, addingStroke, cellDrafts, setCellDrafts, savingCell, targetKey,
    addDistance, deleteDistance, addStroke, deleteStroke, saveTargetCell,
    classScopeLevel, setClassScopeLevel, openClassScope, classOptions, selectedClassIds,
    setAllClasses, toggleClassSelection,
  };
}
