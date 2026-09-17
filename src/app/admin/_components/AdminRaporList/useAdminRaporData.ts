"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { downloadRaporPdf, type PrintBestTime } from "@/lib/printRapor";
import { downloadRaporZip } from "@/lib/downloadRaporZip";
import { resolveRaporSigner, buildSchoolRaporSignatures } from "@/lib/rapor";
import type { RaporPeriod, Student } from "./_types";

const PAGE_SIZE = 15;

export function useAdminRaporData(branchId: string, periods: RaporPeriod[]) {
  const supabase = createClient();
  const toast = useToast();
  const { t } = useLocale();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Student | null>(null);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterCoach, setFilterCoach] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Default to active period once periods load (derived, not stored in state)
  const effectivePeriodId = selectedPeriodId || periods.find(p => p.is_open)?.id || periods[0]?.id || "";
  const selectedPeriod = periods.find(p => p.id === effectivePeriodId);

  const load = useCallback(async (periodId: string) => {
    if (!periodId) { setStudents([]); setLoading(false); return; }
    setLoading(true);
    const [{ data }, { data: ownerSettings }] = await Promise.all([
      supabase
        .from("members")
        .select(`
          id, member_no, type, school_id,
          profile:profiles(full_name, avatar_url, birth_date),
          school:schools(
            id, name, logo_url, show_coach_sig, show_head_sig, show_school_sig, coach_sig_title, head_sig_title,
            school_signatures(id, name, title, image_url, is_active)
          ),
          member_classes(
            classes(
              id, name, rapor_signer_coach_id,
              class_coaches(coach_id, role, profile:profiles(full_name, signature_url))
            )
          ),
          rapor_entries(
            id, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id, locked,
            rapor_levels(id, name, rapor_level_criteria(id, label, kind, options, sort_order), rapor_level_strokes(name, sort_order), rapor_level_distances(distance, sort_order))
          )
        `)
        .eq("branch_id", branchId),
      supabase.from("owner_settings").select("*").eq("id", "default").maybeSingle(),
    ]);

    if (!data) { setStudents([]); setLoading(false); return; }

    const memberIds = data.map(m => m.id);
    const { data: btRows } = memberIds.length
      ? await supabase.from("member_best_times").select("member_id, stroke, distance, time_seconds").in("member_id", memberIds).eq("branch_id", branchId)
      : { data: [] };
    const btByMember = new Map<string, PrintBestTime[]>();
    for (const row of (btRows ?? []) as { member_id: string; stroke: string; distance: number; time_seconds: number }[]) {
      const list = btByMember.get(row.member_id) ?? [];
      list.push({ stroke: row.stroke, distance: row.distance, time_seconds: row.time_seconds });
      btByMember.set(row.member_id, list);
    }

    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string; avatar_url: string | null; birth_date: string | null } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const entry = (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; personality: string | null; motivation: string | null; learning_achievements: string | null; level: string | null; period_id: string; locked: boolean; rapor_levels: { id: string; name: string; rapor_level_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[]; rapor_level_strokes: { name: string; sort_order: number }[]; rapor_level_distances: { distance: number; sort_order: number }[] } | null }[])
        ?.find((e) => e.period_id === periodId);
      const criteria = [...(entry?.rapor_levels?.rapor_level_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as Student["criteria"][number]["kind"] }));
      const levelStrokes = [...(entry?.rapor_levels?.rapor_level_strokes ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(s => s.name);
      const levelDistances = [...(entry?.rapor_levels?.rapor_level_distances ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(d => d.distance);

      const school = (m.school as unknown as { id: string; name: string; logo_url: string | null; show_coach_sig?: boolean; show_head_sig?: boolean; show_school_sig?: boolean; coach_sig_title?: string; head_sig_title?: string; school_signatures?: { name: string; title: string; image_url: string; is_active: boolean }[] } | null);
      const coachSig = signer?.signature_url ?? null;
      const signatures = buildSchoolRaporSignatures(school, signer?.full_name ?? "—", coachSig, ownerSettings);

      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        member_no: (m as unknown as { member_no: string | null }).member_no ?? null,
        birth_date: profile?.birth_date ?? null,
        avatar_url: profile?.avatar_url ?? null,
        class_name: cls?.name ?? "—",
        coach_name: signer?.full_name ?? "—",
        coach_signature_url: coachSig,
        is_filled: entry?.locked === true,
        scores: entry?.scores ?? {},
        notes: entry?.notes ?? null,
        personality: entry?.personality ?? null,
        motivation: entry?.motivation ?? null,
        learning_achievements: entry?.learning_achievements ?? null,
        level: entry?.level ?? null,
        criteria,
        best_times: btByMember.get(m.id) ?? [],
        level_strokes: levelStrokes,
        level_distances: levelDistances,
        school_logo_url: school?.logo_url ?? null,
        signatures,
      };
    });
    setStudents(rows);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { if (effectivePeriodId) load(effectivePeriodId); }, [effectivePeriodId, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const classList = useMemo(() => [...new Set(students.map(s => s.class_name).filter(n => n !== "—"))].sort(), [students]);
  const coachList = useMemo(() => [...new Set(students.map(s => s.coach_name).filter(n => n !== "—"))].sort(), [students]);
  const activeFilterCount = [filterClass, filterCoach, filterStatus].filter(Boolean).length;
  const resetFilters = () => { setFilterClass(""); setFilterCoach(""); setFilterStatus(""); };

  const filteredSorted = useMemo(() => {
    let result = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q) ||
        s.coach_name.toLowerCase().includes(q)
      );
    }
    if (filterClass) result = result.filter(s => s.class_name === filterClass);
    if (filterCoach) result = result.filter(s => s.coach_name === filterCoach);
    if (filterStatus === "done") result = result.filter(s => s.is_filled);
    if (filterStatus === "pending") result = result.filter(s => !s.is_filled);
    return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [students, search, filterClass, filterCoach, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filteredSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const totalDone = students.filter(s => s.is_filled).length;

  const toPrintStudent = (s: Student) => ({
    member_id: s.id, period_id: effectivePeriodId,
    full_name: s.full_name, avatar_url: s.avatar_url ?? undefined,
    member_no: s.member_no ?? undefined, birth_date: s.birth_date ?? undefined,
    level: s.level ?? undefined,
    class_name: s.class_name, coach_name: s.coach_name,
    coach_signature_url: s.coach_signature_url,
    school_logo_url: s.school_logo_url,
    signatures: s.signatures,
    period_label: selectedPeriod?.label ?? "—", scores: s.scores, notes: s.notes,
    personality: s.personality, motivation: s.motivation, learning_achievements: s.learning_achievements,
    criteria: s.criteria, best_times: s.best_times,
    level_strokes: s.level_strokes, level_distances: s.level_distances,
  });

  const handleDownloadOne = async (s: Student) => {
    setDownloadingId(s.id);
    try {
      await downloadRaporPdf(toPrintStudent(s));
    } catch {
      toast.error(t("admin.rapor.downloadPdfFailed"), t("admin.rapor.tryAgainGeneric"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadZip = async (targets: Student[]) => {
    if (targets.length === 0) return;
    setBulkDownloading(true);
    try {
      const zipName = `rapor-${(selectedPeriod?.label ?? "periode").replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}`;
      const { success, failed } = await downloadRaporZip(targets.map(toPrintStudent), zipName);
      if (failed === 0) toast.success(t("admin.rapor.reportsDownloadedToast", { count: success }));
      else if (success === 0) toast.error(t("admin.rapor.downloadReportsFailedTitle"), t("admin.rapor.allReportsFailedBody"));
      else toast.error(t("admin.rapor.partialSuccessTitle", { success, failed }), t("admin.rapor.partialSuccessBody"));
      setSelectMode(false);
      setSelected(new Set());
    } catch {
      toast.error(t("admin.rapor.downloadReportsFailedTitle"), t("admin.rapor.tryAgainGeneric"));
    } finally {
      setBulkDownloading(false);
    }
  };

  return {
    periods, selectedPeriodId, setSelectedPeriodId, students, loading, open, setOpen,
    search, setSearch, filterClass, setFilterClass, filterCoach, setFilterCoach, filterStatus, setFilterStatus, page, setPage,
    selectMode, setSelectMode, selected, setSelected, downloadingId, bulkDownloading,
    effectivePeriodId, selectedPeriod,
    classList, coachList, activeFilterCount, resetFilters,
    filteredSorted, totalPages, safePage, paginated, totalDone,
    toPrintStudent, handleDownloadOne, handleDownloadZip,
  };
}
