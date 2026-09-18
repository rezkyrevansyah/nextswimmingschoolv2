"use client";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { countTextStats } from "@/lib/utils";
import type { PrintBestTime } from "@/lib/printRapor";
import { buildBestTimeMatrix, findUnmatchedRecordedTimes, parseSwimTimeInput, type LevelDistance, type LevelStroke, type MatrixCell, type RecordedBestTime } from "@/lib/raporLevels";
import type { BestTimeRow, RaporEntry } from "../../_types";
import type { Criterion } from "./_types";

export function useCoachRaporData({ coachId, branchId }: { coachId: string; branchId: string; coachName: string; branchName: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [period, setPeriod] = useState<{ id: string; label: string; date_to: string } | null>(null);
  const [entries, setEntries] = useState<RaporEntry[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<RaporEntry | null>(null);
  const [viewing, setViewing] = useState<RaporEntry | null>(null);
  const [viewBestTimes, setViewBestTimes] = useState<PrintBestTime[]>([]);
  const [scores, setScores] = useState<Record<string, number | string>>({});
  const [notes, setNotes] = useState("");
  const [personality, setPersonality] = useState("");
  const [motivation, setMotivation] = useState("");
  const [learningAchievements, setLearningAchievements] = useState("");
  const [level, setLevel] = useState("");
  const [levelId, setLevelId] = useState("");
  const [levelOptions, setLevelOptions] = useState<{ id: string; name: string; all_classes: boolean; class_ids: string[] }[]>([]);
  const [loadingLevelTemplate, setLoadingLevelTemplate] = useState(false);
  const [levelDistances, setLevelDistances] = useState<LevelDistance[]>([]);
  const [levelStrokes, setLevelStrokes] = useState<LevelStroke[]>([]);
  const [bestTimeMatrix, setBestTimeMatrix] = useState<MatrixCell[]>([]);
  const [otherRecorded, setOtherRecorded] = useState<RecordedBestTime[]>([]);
  const [removedBtIds, setRemovedBtIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [sigUploading, setSigUploading] = useState(false);
  const [ownerSettings, setOwnerSettings] = useState<{ head_name?: string | null; head_title?: string | null; head_signature_url?: string | null } | null>(null);
  const { upload, uploading: fileUploading } = useUpload();
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!branchId || !coachId) return;
    (async () => {
      // Load coach signature (for rapor print) & owner settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: prof }, { data: oSet }] = await Promise.all([
        (supabase as any).from("profiles").select("signature_url").eq("id", coachId).single(),
        supabase.from("owner_settings").select("*").eq("id", "default").maybeSingle(),
      ]);
      if (prof?.signature_url) setSignatureUrl(prof.signature_url as string);
      if (oSet) setOwnerSettings(oSet);

      // Load active rapor levels (owner-managed), with their class scope
      const { data: levelRows } = await supabase
        .from("rapor_levels").select("id, name, all_classes, rapor_level_classes(class_id)").eq("active", true).order("sort_order");
      setLevelOptions((levelRows ?? []).map(l => ({
        id: l.id, name: l.name, all_classes: l.all_classes,
        class_ids: (l.rapor_level_classes as unknown as { class_id: string }[] ?? []).map(r => r.class_id),
      })));

      // 1. Find active period
      const { data: periodData } = await supabase
        .from("rapor_periods").select("id, label, date_to").eq("branch_id", branchId).eq("is_open", true).single();
      if (!periodData) { setLoading(false); return; }
      setPeriod(periodData as { id: string; label: string; date_to: string });

      // 2. Get all members in coach's classes
      const { data: classCoachRows } = await supabase
        .from("class_coaches").select("class_id").eq("coach_id", coachId);
      const myClassIds = (classCoachRows ?? []).map(r => r.class_id);

      if (myClassIds.length === 0) { setLoading(false); return; }

      // Get members enrolled in each of those classes
      const { data: mcRows } = await supabase
        .from("member_classes").select("member_id, class_id").in("class_id", myClassIds);
      const memberClassPairs = (mcRows ?? []) as { member_id: string; class_id: string }[];

      // 3. Insert stubs for any members without an entry yet
      if (memberClassPairs.length > 0) {
        // Fetch existing entry member_ids to avoid duplicates (no unique constraint in DB)
        const { data: existing } = await supabase
          .from("rapor_entries").select("member_id").eq("period_id", periodData.id).eq("coach_id", coachId);
        const existingMemberIds = new Set((existing ?? []).map(e => e.member_id));
        const newStubs = memberClassPairs
          .filter(mc => !existingMemberIds.has(mc.member_id))
          .map(mc => ({
            period_id: periodData.id,
            member_id: mc.member_id,
            class_id: mc.class_id,
            coach_id: coachId,
            locked: false,
          }));
        if (newStubs.length > 0) {
          await supabase.from("rapor_entries").insert(newStubs);
        }
      }

      // 4. Now fetch all entries for this coach + period — via a server route,
      // since the nested member/coach profile names are RLS-blocked from a
      // direct browser query (see /api/coach/rapor-entries for why).
      try {
        const res = await fetch(`/api/coach/rapor-entries?periodId=${periodData.id}`);
        const json = await res.json() as { entries?: unknown[] };
        setEntries((json.entries ?? []) as unknown as RaporEntry[]);
        setPage(0);
      } catch {
        setEntries([]);
      }
      setLoading(false);
    })();
  }, [coachId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLevelTemplate = async (levelIdToLoad: string, existingBestTimes: RecordedBestTime[]) => {
    if (!levelIdToLoad) {
      setCriteria([]);
      setLevelDistances([]);
      setLevelStrokes([]);
      setBestTimeMatrix([]);
      setOtherRecorded(existingBestTimes);
      return;
    }
    setLoadingLevelTemplate(true);
    const [{ data: critRows }, { data: distRows }, { data: strokeRows }] = await Promise.all([
      supabase.from("rapor_level_criteria").select("id, label, kind, options, sort_order").eq("level_id", levelIdToLoad).order("sort_order"),
      supabase.from("rapor_level_distances").select("id, distance, sort_order").eq("level_id", levelIdToLoad).order("sort_order"),
      supabase.from("rapor_level_strokes").select("id, name, sort_order").eq("level_id", levelIdToLoad).order("sort_order"),
    ]);
    const distances = (distRows ?? []) as LevelDistance[];
    const strokes = (strokeRows ?? []) as LevelStroke[];
    setCriteria((critRows ?? []) as Criterion[]);
    setLevelDistances(distances);
    setLevelStrokes(strokes);
    setBestTimeMatrix(buildBestTimeMatrix(distances, strokes, existingBestTimes));
    setOtherRecorded(findUnmatchedRecordedTimes(distances, strokes, existingBestTimes));
    setLoadingLevelTemplate(false);
  };

  const openEntry = async (e: RaporEntry) => {
    // Pre-fill existing scores
    const existing = (e as unknown as { scores?: Record<string, number | string> }).scores ?? {};
    setScores(existing);
    setNotes((e as unknown as { notes?: string }).notes ?? "");
    setPersonality(e.personality ?? "");
    setMotivation(e.motivation ?? "");
    setLearningAchievements(e.learning_achievements ?? "");
    setLevel(e.level ?? "");
    setLevelId(e.level_id ?? "");
    // Load best times for this member, then build the matrix from the level's template (if any)
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("id, stroke, distance, time_seconds")
      .eq("member_id", e.member_id)
      .eq("branch_id", branchId)
      .order("stroke").order("distance");
    await loadLevelTemplate(e.level_id ?? "", (btRows ?? []) as RecordedBestTime[]);
    setRemovedBtIds([]);
    setOpen(e);
  };

  // Levels available for the class of the entry currently open — all_classes
  // levels always show, others only when this class is in their scope.
  const visibleLevelOptions = useMemo(() => {
    if (!open) return levelOptions;
    return levelOptions.filter(l => l.all_classes || l.class_ids.includes(open.class_id));
  }, [levelOptions, open]);

  const handleLevelChange = async (newLevelId: string) => {
    setLevelId(newLevelId);
    const found = levelOptions.find(l => l.id === newLevelId);
    setLevel(found?.name ?? "");
    const existingBestTimes: RecordedBestTime[] = [
      ...bestTimeMatrix.filter(c => c.time.trim()).map(c => ({ id: c.recordedId ?? "", stroke: c.stroke, distance: c.distance, time_seconds: parseSwimTimeInput(c.time) })),
      ...otherRecorded,
    ];
    await loadLevelTemplate(newLevelId, existingBestTimes);
  };

  const openView = async (e: RaporEntry) => {
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("id, stroke, distance, time_seconds")
      .eq("member_id", e.member_id)
      .eq("branch_id", branchId)
      .order("stroke").order("distance");
    setViewBestTimes(
      (btRows ?? []).map((r: BestTimeRow) => ({
        stroke: r.stroke,
        distance: r.distance,
        time_seconds: r.time_seconds,
      }))
    );

    // If e doesn't have criteria loaded, fetch them from DB
    let entryToView = e;
    if (e.level_id && (!e.rapor_levels?.rapor_level_criteria || e.rapor_levels.rapor_level_criteria.length === 0)) {
      const { data: critData } = await supabase
        .from("rapor_level_criteria")
        .select("id, label, kind, options, sort_order")
        .eq("level_id", e.level_id)
        .order("sort_order");
      if (critData) {
        entryToView = {
          ...e,
          rapor_levels: {
            id: e.level_id,
            name: e.level || "",
            rapor_level_criteria: critData,
          } as unknown as typeof e.rapor_levels,
        };
      }
    }
    setViewing(entryToView);
  };

  const saveRapor = async () => {
    if (!open || !period) return;
    // Check period still open
    const today = new Date().toISOString().split("T")[0];
    if (period.date_to < today) return toast.error("Report card period has ended", "Contact admin to extend the period.");
    const { data: periodCheck } = await supabase.from("rapor_periods").select("is_open").eq("id", period.id).single();
    if (!periodCheck?.is_open) return toast.error("Report card period is closed", "Contact admin to reopen the period.");
    setSaving(true);
    const isNew = !open.locked;
    const { error } = await supabase.from("rapor_entries")
      .update({
        scores, notes,
        personality: personality || null,
        motivation: motivation || null,
        learning_achievements: learningAchievements || null,
        level: level || null,
        level_id: levelId || null,
        filled_at: new Date().toISOString(),
        locked: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq("id", open.id);
    if (error) { setSaving(false); return toast.error("Failed to save report card", error.message); }
    // Delete removed best time rows
    for (const id of removedBtIds) {
      await supabase.from("member_best_times").delete().eq("id", id);
    }
    setRemovedBtIds([]);
    // Upsert best times — one row per filled matrix cell
    const savedCells: MatrixCell[] = [...bestTimeMatrix];
    for (let i = 0; i < savedCells.length; i++) {
      const cell = savedCells[i];
      const timeSec = parseSwimTimeInput(cell.time);
      if (!cell.time.trim() || isNaN(timeSec) || timeSec <= 0) continue;
      if (cell.recordedId) {
        await supabase.from("member_best_times")
          .update({ time_seconds: timeSec, coach_id: coachId, recorded_at: today })
          .eq("id", cell.recordedId);
      } else {
        const { data: ins } = await supabase.from("member_best_times")
          .upsert(
            { member_id: open.member_id, branch_id: branchId, stroke: cell.stroke, distance: cell.distance, time_seconds: timeSec, coach_id: coachId, recorded_at: today },
            { onConflict: "member_id,branch_id,stroke,distance" }
          )
          .select("id").single();
        if (ins) {
          savedCells[i] = { ...cell, recordedId: ins.id };
        }
      }
    }
    setBestTimeMatrix(savedCells);
    setSaving(false);
    // Notify member when rapor is first filled (not on updates)
    if (isNew) {
      await supabase.from("notifications").insert({
        user_id: open.member_id,
        title: "Report card available",
        body: `Your report card for period "${period.label}" has been filled in by the coach. Open the Report Card menu to see the results.`,
        icon: "book",
        kind: "info",
      });
    }
    toast.success("Report card saved");
    setOpen(null);
    setRemovedBtIds([]);
    setEntries(prev => prev.map(e => e.id === open.id ? {
      ...e, locked: true, scores, notes,
      personality: personality || null,
      motivation: motivation || null,
      learning_achievements: learningAchievements || null,
      level: level || null,
      level_id: levelId || null,
      rapor_levels: levelId ? {
        id: levelId,
        name: level || "",
        rapor_level_criteria: criteria.map(c => ({
          id: c.id,
          label: c.label,
          kind: c.kind,
          options: c.options ?? null,
          sort_order: c.sort_order ?? 0,
        })),
      } as unknown as typeof e.rapor_levels : e.rapor_levels,
    } : e));
  };

  // Notes validation (derived, used for Save button disabled state)
  const notesStats = countTextStats(notes);
  const notesInvalid = notesStats.words > 50 || notesStats.sentences > 1 || notesStats.hasNewline;

  // Derived values for summary & pagination
  const totalFilled  = entries.filter(e => e.locked).length;
  const totalPending = entries.filter(e => !e.locked).length;
  const pct          = entries.length > 0 ? Math.round(totalFilled / entries.length * 100) : 0;
  const totalPages   = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage     = Math.min(page, Math.max(0, totalPages - 1));
  const paginated    = entries.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return {
    coachId, branchId,
    period, entries, criteria, loading,
    open, setOpen, viewing, setViewing, viewBestTimes, setViewBestTimes,
    scores, setScores, notes, setNotes, personality, setPersonality,
    motivation, setMotivation, learningAchievements, setLearningAchievements,
    level, levelId, loadingLevelTemplate,
    levelDistances, levelStrokes, bestTimeMatrix, setBestTimeMatrix,
    otherRecorded, setOtherRecorded, removedBtIds, setRemovedBtIds,
    saving, page, setPage,
    signatureUrl, setSignatureUrl, sigUploading, setSigUploading, ownerSettings,
    upload, fileUploading,
    visibleLevelOptions, handleLevelChange, openEntry, openView, saveRapor,
    notesStats, notesInvalid,
    totalFilled, totalPending, pct, totalPages, safePage, paginated,
  };
}
