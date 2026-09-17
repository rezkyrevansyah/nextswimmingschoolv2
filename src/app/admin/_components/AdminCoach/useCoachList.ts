"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { CoachFull } from "./_types";

const PAGE_SIZE = 10;

export function useCoachList(branchId: string) {
  const [coaches, setCoaches] = useState<CoachFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    // Load coach_ids in this branch from junction table, then load profiles for those coaches
    const { data: cbData } = await createClient().from("coach_branches").select("coach_id").eq("branch_id", branchId);
    const coachIds = (cbData ?? []).map((r: { coach_id: string }) => r.coach_id);
    if (coachIds.length === 0) { setCoaches([]); setLoading(false); return; }
    const { data, error } = await createClient().from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, qr_code, suspend_until, suspend_reason, is_archived, certifications!certifications_coach_id_fkey(id, name, title, status, valid_from, valid_until), class_coaches(class_id, role, class:classes(id, name, branch_id, time_start, time_end, schedule_days, branches(name, city))), coach_branches!coach_branches_coach_id_fkey(branch_id, branches(name, city), is_primary, joined_at)")
      .eq("role", "coach").in("id", coachIds).order("full_name");
    if (error) return;
    if (data) setCoaches(data as unknown as CoachFull[]);
    setLoading(false);
  }, [branchId]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isSuspended = (c: CoachFull) => !c.is_archived && !!c.suspend_until && new Date(c.suspend_until) >= new Date();
  const isArchived = (c: CoachFull) => !!c.is_archived;

  const coachStatus = (c: CoachFull) => {
    if (isArchived(c)) return "archived";
    if (isSuspended(c)) return "suspended";
    return "active";
  };

  const visibleCoaches = showArchived ? coaches : coaches.filter(c => !c.is_archived);

  const [page, setPage] = useState(0);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPage(0); }, [showArchived]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const totalPages = Math.max(1, Math.ceil(visibleCoaches.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedCoaches = visibleCoaches.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return {
    coaches, loading, showArchived, setShowArchived, load,
    isSuspended, isArchived, coachStatus,
    visibleCoaches, page, setPage, totalPages, safePage, pagedCoaches,
  };
}
