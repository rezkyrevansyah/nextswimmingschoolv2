"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";
import type { PrintBestTime, PrintCriterion } from "@/lib/printRapor";
import { resolveRaporSigner, type SchoolForSignerConfig } from "@/lib/rapor";
import type { CoachReviewSlot, RaporEntryFull } from "./_types";

export function useMemberRaporData({ memberId, branchId }: { memberId: string; branchId: string }) {
  const { t } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const [raporTab, setRaporTab] = useState<"rapor" | "review">("rapor");
  const [open, setOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RaporEntryFull | null>(null);
  const [entries, setEntries] = useState<RaporEntryFull[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { stars: number; text: string }>>({});
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<(SchoolForSignerConfig & { logo_url: string | null }) | null>(null);
  const [ownerSettings, setOwnerSettings] = useState<{ head_name?: string | null; head_title?: string | null; head_signature_url?: string | null } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [competitionsHistory, setCompetitionsHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!memberId) return;

    // Load owner settings
    supabase.from("owner_settings").select("*").eq("id", "default").maybeSingle().then(({ data: os }) => {
      if (os) setOwnerSettings(os);
    });

    // Load school info if member belongs to a school
    supabase.from("members")
      .select("school:schools(id, name, logo_url, show_coach_sig, show_head_sig, show_school_sig, coach_sig_title, head_sig_title, school_signatures(name, title, image_url, is_active))")
      .eq("id", memberId)
      .single()
      .then(({ data: mem }) => {
        if (mem?.school) {
          setSchoolInfo(mem.school as unknown as SchoolForSignerConfig & { logo_url: string | null });
        }
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("rapor_entries")
      .select("id, scores, notes, personality, motivation, learning_achievements, level, level_id, coach_id, period_id, class_id, rapor_periods(label, is_open), classes(name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url))), coach:profiles!rapor_entries_coach_id_fkey(full_name, signature_url), rapor_levels(rapor_level_criteria(id, label, kind, options, sort_order))")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }) as { data: any[] | null };
    if (!data) return;

    // Load existing reviews (keyed by rapor_id + coach_id, since a class can have multiple coaches)
    const entryIds = data.map((e: any) => e.id);
    const { data: reviews } = entryIds.length
      ? await supabase.from("member_reviews").select("id, rapor_id, coach_id, stars, message").in("rapor_id", entryIds).eq("member_id", memberId)
      : { data: [] };
    const reviewMap = new Map((reviews ?? []).map((r) => [`${r.rapor_id}:${r.coach_id}`, r]));

    // Load best times for this member
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("stroke, distance, time_seconds")
      .eq("member_id", memberId)
      .eq("branch_id", branchId);
    const bestTimesArr: PrintBestTime[] = (btRows ?? []).map(r => ({
      stroke: (r as { stroke: string }).stroke,
      distance: (r as { distance: number }).distance,
      time_seconds: (r as { time_seconds: number }).time_seconds,
    }));

    // Load competition achievements for this member
    const { data: compRows } = await supabase
      .from("competition_participations")
      .select(`
        id, category, age_group, time_formatted, time_seconds, rank, award, custom_award_label, certificate_url, notes,
        competition:competitions(name, start_date, location, organizer)
      `)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCompetitionsHistory((compRows as any[]) ?? []);

    // Load each distinct level's ordered strokes/distances in one batch pair of queries
    const levelIds = [...new Set(data.map((e) => e.level_id).filter(Boolean))];
    const [{ data: levelStrokeRows }, { data: levelDistanceRows }] = levelIds.length
      ? await Promise.all([
          supabase.from("rapor_level_strokes").select("level_id, name, sort_order").in("level_id", levelIds).order("sort_order"),
          supabase.from("rapor_level_distances").select("level_id, distance, sort_order").in("level_id", levelIds).order("sort_order"),
        ])
      : [{ data: [] }, { data: [] }];
    const strokesByLevel = new Map<string, string[]>();
    for (const row of (levelStrokeRows ?? []) as { level_id: string; name: string }[]) {
      strokesByLevel.set(row.level_id, [...(strokesByLevel.get(row.level_id) ?? []), row.name]);
    }
    const distancesByLevel = new Map<string, number[]>();
    for (const row of (levelDistanceRows ?? []) as { level_id: string; distance: number }[]) {
      distancesByLevel.set(row.level_id, [...(distancesByLevel.get(row.level_id) ?? []), row.distance]);
    }

    setEntries(data.map((e) => {
      const p = e.rapor_periods as unknown as { label: string; is_open: boolean } | null;
      const cls = e.classes as unknown as { name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } | null;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const rlCriteria = (e.rapor_levels as unknown as { rapor_level_criteria: { id: string; label: string; kind: string; sort_order: number }[] } | null)?.rapor_level_criteria ?? [];
      const criteria: PrintCriterion[] = [...rlCriteria]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] }));
      const coachReviews: CoachReviewSlot[] = [...(cls?.class_coaches ?? [])]
        .sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0))
        .map(cc => {
          const review = reviewMap.get(`${e.id}:${cc.coach_id}`);
          return {
            coach_id: cc.coach_id,
            coach_name: cc.profile?.full_name ?? "—",
            role: cc.role,
            review_id: review?.id ?? null,
            review_stars: review?.stars ?? null,
            review_message: review?.message ?? null,
          };
        });
      return {
        id: e.id,
        period: p?.label ?? "—",
        period_id: e.period_id,
        period_is_open: p?.is_open ?? false,
        class_name: cls?.name ?? "—",
        class_id: e.class_id,
        coach_name: signer?.full_name ?? "—",
        scores: (e.scores as unknown as Record<string, number | string>) ?? {},
        notes: e.notes,
        personality: (e as unknown as { personality: string | null }).personality ?? null,
        motivation: (e as unknown as { motivation: string | null }).motivation ?? null,
        learning_achievements: (e as unknown as { learning_achievements: string | null }).learning_achievements ?? null,
        level: (e as unknown as { level: string | null }).level ?? null,
        coachReviews,
        criteria,
        best_times: bestTimesArr,
        level_strokes: e.level_id ? (strokesByLevel.get(e.level_id) ?? []) : [],
        level_distances: e.level_id ? (distancesByLevel.get(e.level_id) ?? []) : [],
        coach_signature_url: signer?.signature_url ?? null,
      };
    }));
  }, [memberId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openRapor = (e: RaporEntryFull) => {
    setSelectedEntry(e);
    setOpen(true);
  };

  const draftKey = (entryId: string, coachId: string) => `${entryId}:${coachId}`;

  const getDraft = (entry: RaporEntryFull, slot: CoachReviewSlot) => {
    const key = draftKey(entry.id, slot.coach_id);
    return reviewDrafts[key] ?? { stars: slot.review_stars ?? 5, text: slot.review_message ?? "" };
  };

  const setDraft = (entry: RaporEntryFull, slot: CoachReviewSlot, patch: Partial<{ stars: number; text: string }>) => {
    const key = draftKey(entry.id, slot.coach_id);
    setReviewDrafts(prev => ({ ...prev, [key]: { ...getDraft(entry, slot), ...patch } }));
  };

  const saveReview = async (entry: RaporEntryFull, slot: CoachReviewSlot) => {
    const { data: periodCheck } = await supabase.from("rapor_periods").select("is_open").eq("id", entry.period_id).single();
    if (!periodCheck?.is_open) return toast.error(t("member.rapor.toastPeriodClosedTitle"), t("member.rapor.toastPeriodClosedBody"));
    const draft = getDraft(entry, slot);
    const key = draftKey(entry.id, slot.coach_id);
    setSavingSlot(key);
    const trimmedMsg = (draft.text ?? "").slice(0, 300);
    if (slot.review_id) {
      await supabase.from("member_reviews").update({ stars: draft.stars, message: trimmedMsg }).eq("id", slot.review_id);
    } else {
      await supabase.from("member_reviews").insert({ rapor_id: entry.id, member_id: memberId, coach_id: slot.coach_id, stars: draft.stars, message: trimmedMsg });
    }
    setSavingSlot(null);
    await load();
  };

  return {
    raporTab, setRaporTab, open, setOpen, selectedEntry, entries,
    schoolInfo, ownerSettings, competitionsHistory,
    openRapor, draftKey, getDraft, setDraft, saveReview, savingSlot,
  };
}
