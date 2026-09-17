"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { logActivity } from "@/lib/activityLog";
import { getMemberTypeLabels, getAwardLabels, type CompetitionRow, type MemberOption, type CoachOption } from "./_types";

export function useCompetitionData(branchId: string) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const MEMBER_TYPE_LABELS = getMemberTypeLabels(t);
  const AWARD_LABELS = getAwardLabels(t);

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  // Modals state
  const [openCompForm, setOpenCompForm] = useState(false);
  const [editComp, setEditComp] = useState<CompetitionRow | null>(null);
  const [compForm, setCompForm] = useState({
    name: "",
    organizer: "",
    location: "",
    city: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    level: "local",
    description: "",
  });
  const [savingComp, setSavingComp] = useState(false);

  const [selectedComp, setSelectedComp] = useState<CompetitionRow | null>(null);

  // Member & Coach options for selector
  const [membersList, setMembersList] = useState<MemberOption[]>([]);
  const [coachesList, setCoachesList] = useState<CoachOption[]>([]);

  const [activeTab, setActiveTab] = useState<"competitions" | "awards">("awards");
  // When true, saving compForm (create/edit Lomba) should feed the result back into partForm's
  // competition dropdown instead of just refreshing the Perlombaan tab — set right before opening
  // compForm from inside the participant/award form's inline "+ Lomba Baru" / edit-lomba buttons.
  const [compFormReturnToPart, setCompFormReturnToPart] = useState(false);

  // ── Load Competitions ──────────────────────────────────────────────────────
  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    const { data: compsData, error } = await supabase
      .from("competitions")
      .select("id, name, organizer, location, city, start_date, end_date, level, description, created_by_id, created_at")
      .order("start_date", { ascending: false });

    if (error) {
      toast.error(t("admin.competition.loadFailed", { error: error.message }));
      setLoading(false);
      return;
    }

    // Load participation counts — scoped to this branch, same as loadOptions,
    // so a branch admin doesn't see other branches' participants/medals
    // folded into these counts.
    let partsQuery = supabase
      .from("competition_participations")
      .select("competition_id, award");
    if (branchId) partsQuery = partsQuery.eq("branch_id", branchId);
    const { data: parts } = await partsQuery;

    const countsMap: Record<string, { total: number; medals: number }> = {};
    (parts ?? []).forEach(p => {
      if (!countsMap[p.competition_id]) countsMap[p.competition_id] = { total: 0, medals: 0 };
      countsMap[p.competition_id].total++;
      if (["gold", "silver", "bronze", "custom"].includes(p.award)) {
        countsMap[p.competition_id].medals++;
      }
    });

    const enriched = (compsData ?? []).map(c => ({
      ...c,
      participations_count: countsMap[c.id]?.total ?? 0,
      medals_count: countsMap[c.id]?.medals ?? 0,
    }));

    setCompetitions(enriched);
    setLoading(false);
  }, [supabase, toast, branchId]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  // ── Load Members & Coaches Options ──────────────────────────────────────────
  const loadOptions = useCallback(async () => {
    let q = supabase
      .from("members")
      .select("id, branch_id, type, member_no, profile:profiles(full_name), branch:branches(name)")
      .eq("status", "active");

    if (branchId) {
      q = q.eq("branch_id", branchId);
    }

    const [{ data: mData }, { data: cData }] = await Promise.all([
      q,
      supabase.from("profiles").select("id, full_name").eq("role", "coach"),
    ]);

    if (mData) {
      setMembersList(
        mData.map(m => ({
          id: m.id,
          branch_id: m.branch_id,
          full_name: (m.profile as any)?.full_name ?? "Unnamed",
          branch_name: (m.branch as any)?.name ?? "",
          type: m.type,
          member_no: m.member_no,
        }))
      );
    }

    if (cData) {
      setCoachesList(cData.map(c => ({ id: c.id, full_name: c.full_name })));
    }
  }, [supabase, branchId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Helper for logging activity
  const triggerLog = async (action: "create" | "update" | "delete", entityId: string, entityLabel: string, label: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
    await logActivity(supabase, {
      userId: user.id,
      userRole: prof?.role ?? "admin",
      userName: prof?.full_name ?? "Admin",
      branchId: branchId || null,
      entityType: "competitions",
      entityId,
      entityLabel,
      action,
      label,
    });
  };

  // ── Comp Form Handlers ─────────────────────────────────────────────────────
  const openCreateComp = () => {
    setEditComp(null);
    setCompForm({
      name: "",
      organizer: "",
      location: "",
      city: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      level: "local",
      description: "",
    });
    setOpenCompForm(true);
  };

  const openEditComp = (comp: CompetitionRow) => {
    setEditComp(comp);
    setCompForm({
      name: comp.name,
      organizer: comp.organizer ?? "",
      location: comp.location ?? "",
      city: comp.city ?? "",
      start_date: comp.start_date,
      end_date: comp.end_date ?? "",
      level: comp.level ?? "local",
      description: comp.description ?? "",
    });
    setOpenCompForm(true);
  };

  const handleSaveComp = async (e: React.FormEvent, onSaved?: (newCompId: string) => void) => {
    e.preventDefault();
    if (!compForm.name.trim() || !compForm.start_date) {
      toast.error(t("admin.competition.nameDateRequired"));
      return;
    }

    setSavingComp(true);
    const { data: userData } = await supabase.auth.getUser();

    if (editComp) {
      const { error } = await supabase
        .from("competitions")
        .update({
          name: compForm.name.trim(),
          organizer: compForm.organizer.trim() || null,
          location: compForm.location.trim() || null,
          city: compForm.city.trim() || null,
          start_date: compForm.start_date,
          end_date: compForm.end_date || null,
          level: compForm.level,
          description: compForm.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editComp.id);

      if (error) {
        toast.error(t("admin.competition.updateFailed", { error: error.message }));
      } else {
        toast.success(t("admin.competition.updated"));
        await triggerLog("update", editComp.id, compForm.name, t("admin.competition.activityUpdatedComp", { name: compForm.name }));
        setOpenCompForm(false);
        setCompFormReturnToPart(false);
        loadCompetitions();
      }
    } else {
      const { data: newComp, error } = await supabase
        .from("competitions")
        .insert({
          name: compForm.name.trim(),
          organizer: compForm.organizer.trim() || null,
          location: compForm.location.trim() || null,
          city: compForm.city.trim() || null,
          start_date: compForm.start_date,
          end_date: compForm.end_date || null,
          level: compForm.level,
          description: compForm.description.trim() || null,
          created_by_id: userData?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error(t("admin.competition.addFailed", { error: error.message }));
      } else {
        toast.success(t("admin.competition.added"));
        if (newComp) {
          await triggerLog("create", newComp.id, compForm.name, t("admin.competition.activityAddedComp", { name: compForm.name }));
          if (compFormReturnToPart) {
            onSaved?.(newComp.id);
          }
        }
        setOpenCompForm(false);
        setCompFormReturnToPart(false);
        loadCompetitions();
      }
    }
    setSavingComp(false);
  };

  const handleDeleteComp = async (comp: CompetitionRow) => {
    const ok = await confirm({
      title: t("admin.competition.deleteConfirmTitle", { name: comp.name }),
      body: t("admin.competition.deleteConfirmBody", { count: comp.participations_count ?? 0 }),
      confirmLabel: t("admin.competition.deleteConfirmLabel"),
      danger: true,
    });

    if (!ok) return;

    const { error } = await supabase.from("competitions").delete().eq("id", comp.id);
    if (error) {
      toast.error(t("admin.competition.deleteFailed", { error: error.message }));
      return false;
    }
    toast.success(t("admin.competition.deleted"));
    await triggerLog("delete", comp.id, comp.name, t("admin.competition.activityDeletedComp", { name: comp.name }));
    loadCompetitions();
    return true;
  };

  // ── Derived Stats & Filtering ─────────────────────────────────────────────
  const filteredComps = useMemo(() => {
    return competitions.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.organizer ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.location ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLevel = levelFilter === "all" || c.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [competitions, search, levelFilter]);

  const totalComps = competitions.length;
  const totalParticipations = competitions.reduce((acc, c) => acc + (c.participations_count ?? 0), 0);
  const totalMedals = competitions.reduce((acc, c) => acc + (c.medals_count ?? 0), 0);

  return {
    t, branchId, MEMBER_TYPE_LABELS, AWARD_LABELS,
    competitions, loading, search, setSearch, levelFilter, setLevelFilter,
    openCompForm, setOpenCompForm, editComp, compForm, setCompForm, savingComp,
    selectedComp, setSelectedComp,
    membersList, coachesList,
    activeTab, setActiveTab, compFormReturnToPart, setCompFormReturnToPart,
    loadCompetitions,
    openCreateComp, openEditComp, handleSaveComp, handleDeleteComp,
    filteredComps, totalComps, totalParticipations, totalMedals,
  };
}
