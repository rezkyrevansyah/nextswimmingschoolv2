"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { CoachFull } from "./_types";

export function useCoachLinkAssign(branchId: string, load: () => void, detail: CoachFull | null, setDetail: (updater: (prev: CoachFull | null) => CoachFull | null) => void) {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();

  // link existing coach
  const [openLink, setOpenLink] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSelectedIds, setLinkSelectedIds] = useState<Set<string>>(new Set());
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkCandidates, setLinkCandidates] = useState<{ id: string; full_name: string; phone: string | null; avatar_url: string | null; branches: { name: string; city: string | null }[] }[]>([]);
  const [linkLoadingCandidates, setLinkLoadingCandidates] = useState(false);
  const [linkShowFilters, setLinkShowFilters] = useState(false);
  const [linkFilterBranch, setLinkFilterBranch] = useState("");
  const [linkFilterCity, setLinkFilterCity] = useState("");

  // assign class
  const [openAssign, setOpenAssign] = useState(false);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null }[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [assignRoles, setAssignRoles] = useState<Record<string, string>>({});
  const [assignSaving, setAssignSaving] = useState(false);

  const loadLinkCandidates = async () => {
    setLinkLoadingCandidates(true);
    setLinkCandidates([]);
    const db = createClient();
    // Get all coach_branches entries with branch info, grouped by coach
    // Source of truth: a coach only appears here if they are already registered in at least one branch
    const { data: allLinks } = await db
      .from("coach_branches")
      .select("coach_id, branch_id, branches(name, city), profile:profiles(id, full_name, phone, avatar_url)")
      .order("coach_id");
    if (!allLinks) { setLinkLoadingCandidates(false); return; }
    // IDs already in this branch
    const alreadyLinked = new Set(
      allLinks.filter(r => r.branch_id === branchId).map(r => r.coach_id)
    );
    // Group by coach, collect all their branches
    const byCoach = new Map<string, { id: string; full_name: string; phone: string | null; avatar_url: string | null; branches: { name: string; city: string | null }[] }>();
    for (const row of allLinks) {
      const rawProfile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const p = rawProfile as { id: string; full_name: string; phone: string | null; avatar_url: string | null } | null | undefined;
      if (!p) continue;
      if (alreadyLinked.has(p.id)) continue; // skip coaches already in this branch
      if (!byCoach.has(p.id)) {
        byCoach.set(p.id, { id: p.id, full_name: p.full_name, phone: p.phone, avatar_url: p.avatar_url, branches: [] });
      }
      const rawBranches = Array.isArray(row.branches) ? row.branches[0] : row.branches;
      const br = rawBranches as { name: string; city: string | null } | null | undefined;
      if (br) byCoach.get(p.id)!.branches.push(br);
    }
    const candidates = Array.from(byCoach.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setLinkCandidates(candidates);
    setLinkLoadingCandidates(false);
  };

  const linkFilteredCandidates = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    return linkCandidates.filter(c => {
      if (q && !(c.full_name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))) return false;
      if (linkFilterBranch && !c.branches.some(b => b.name === linkFilterBranch)) return false;
      if (linkFilterCity && !c.branches.some(b => b.city === linkFilterCity)) return false;
      return true;
    });
  }, [linkCandidates, linkSearch, linkFilterBranch, linkFilterCity]);

  const linkBranchOptions = useMemo(
    () => Array.from(new Set(linkCandidates.flatMap(c => c.branches.map(b => b.name)))).sort(),
    [linkCandidates]
  );
  const linkCityOptions = useMemo(
    () => Array.from(new Set(linkCandidates.flatMap(c => c.branches.map(b => b.city).filter((v): v is string => !!v)))).sort(),
    [linkCandidates]
  );
  const linkActiveFilterCount = [linkFilterBranch, linkFilterCity].filter(Boolean).length;

  const linkCoachToBranch = async () => {
    if (linkSelectedIds.size === 0) return;
    setLinkSaving(true);
    const ids = Array.from(linkSelectedIds);
    const outcomes = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/admin/coaches/${id}/branches`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branch_id: branchId }),
        }).then(async res => ({ ok: res.ok, json: await res.json() as { error?: string; code?: string } }))
      )
    );
    setLinkSaving(false);

    let succeeded = 0, alreadyLinked = 0, failed = 0;
    for (const outcome of outcomes) {
      if (outcome.status !== "fulfilled") { failed++; continue; }
      if (outcome.value.ok) succeeded++;
      else if (outcome.value.json.code === "ALREADY_LINKED") alreadyLinked++;
      else failed++;
    }

    const parts = [
      succeeded > 0 ? t("admin.coaches.linkBulkSuccessPart", { count: succeeded }) : null,
      alreadyLinked > 0 ? t("admin.coaches.linkBulkAlreadyPart", { count: alreadyLinked }) : null,
      failed > 0 ? t("admin.coaches.linkBulkFailedPart", { count: failed }) : null,
    ].filter(Boolean).join(", ");
    if (failed > 0 && succeeded === 0) toast.error(t("admin.coaches.linkCoachFailed"), parts);
    else toast.success(parts);

    setOpenLink(false);
    setLinkSearch("");
    setLinkSelectedIds(new Set());
    setLinkCandidates([]);
    setLinkFilterBranch("");
    setLinkFilterCity("");
    load();
  };

  const unlinkCoachFromBranch = async (c: CoachFull, classCount: number) => {
    const ok = await confirm({
      body: classCount > 0
        ? t("admin.coaches.unlinkConfirmBodyWithClasses", { name: c.full_name, count: classCount })
        : t("admin.coaches.unlinkConfirmBody", { name: c.full_name }),
      danger: true,
      confirmLabel: t("admin.coaches.unlinkBtn"),
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/coaches/${c.id}/branches`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch_id: branchId }),
    });
    const j = await res.json() as { error?: string; removedClassAssignments?: number };
    if (!res.ok) return toast.error(t("admin.coaches.unlinkFailed"), j.error);
    setDetail(prev => prev ? {
      ...prev,
      coach_branches: prev.coach_branches?.filter(cb => cb.branch_id !== branchId),
      class_coaches: prev.class_coaches?.filter(cc => cc.class?.branch_id !== branchId),
    } : prev);
    const removed = j.removedClassAssignments ?? 0;
    toast.success(removed > 0
      ? t("admin.coaches.unlinkSuccessWithClassesToast", { name: c.full_name, count: removed })
      : t("admin.coaches.unlinkSuccessToast", { name: c.full_name }));
    load();
  };

  const openAssignModal = async (c: CoachFull) => {
    const { data } = await createClient().from("classes")
      .select("id, name, time_start, time_end, schedule_days").eq("branch_id", branchId).eq("status", "active").order("name");
    if (data) setAllClasses(data as unknown as typeof allClasses);
    setAssignedClassIds(c.class_coaches?.map(cc => cc.class_id) ?? []);
    setAssignRoles(Object.fromEntries((c.class_coaches ?? []).map(cc => [cc.class_id, cc.role ?? "assistant"])));
    setOpenAssign(true);
  };

  const saveAssign = async () => {
    if (!detail) return;
    setAssignSaving(true);
    const current = detail.class_coaches?.map(cc => cc.class_id) ?? [];
    const toAdd = assignedClassIds.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !assignedClassIds.includes(id));
    const toUpdate = assignedClassIds.filter(id => current.includes(id));
    const supabase = createClient();
    // Any class this coach is now "head" of: demote other coaches on that class to assistant first
    const newHeadClassIds = assignedClassIds.filter(id => (assignRoles[id] ?? "assistant") === "head");
    for (const class_id of newHeadClassIds) {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", class_id).neq("coach_id", detail.id);
    }
    if (toAdd.length > 0) {
      await supabase.from("class_coaches").insert(toAdd.map(class_id => ({ class_id, coach_id: detail.id, role: assignRoles[class_id] ?? "assistant" })));
    }
    for (const class_id of toUpdate) {
      await supabase.from("class_coaches").update({ role: assignRoles[class_id] ?? "assistant" }).eq("class_id", class_id).eq("coach_id", detail.id);
    }
    if (toRemove.length > 0) {
      await supabase.from("class_coaches").delete().eq("coach_id", detail.id).in("class_id", toRemove);
    }
    setAssignSaving(false);
    toast.success(t("admin.coaches.classesUpdatedToast"));
    setOpenAssign(false);
    // Update detail state immediately so panel reflects new assignment
    setDetail(prev => prev ? {
      ...prev,
      class_coaches: assignedClassIds.map(class_id => ({
        class_id,
        role: assignRoles[class_id] ?? "assistant",
        class: (allClasses.find(c => c.id === class_id) ?? null) as CoachFull["class_coaches"] extends (infer T)[] ? T extends { class?: infer C } ? C : never : never,
      })),
    } : prev);
    load();
  };

  return {
    openLink, setOpenLink, linkSearch, setLinkSearch, linkSelectedIds, setLinkSelectedIds, linkSaving,
    linkCandidates, linkLoadingCandidates, linkShowFilters, setLinkShowFilters, linkFilterBranch, setLinkFilterBranch,
    linkFilterCity, setLinkFilterCity, loadLinkCandidates, linkFilteredCandidates, linkBranchOptions, linkCityOptions,
    linkActiveFilterCount, linkCoachToBranch, unlinkCoachFromBranch,
    openAssign, setOpenAssign, allClasses, assignedClassIds, setAssignedClassIds, assignRoles, setAssignRoles,
    assignSaving, openAssignModal, saveAssign,
  };
}
