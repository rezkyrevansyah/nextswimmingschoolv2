"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { parseSwimTime } from "@/lib/utils";
import type { ParticipationRow, CompetitionDocumentRow, MemberOption } from "./_types";

export function useParticipationData({
  branchId, membersList, selectedComp, loadCompetitions,
}: {
  branchId: string;
  membersList: MemberOption[];
  selectedComp: { id: string } | null;
  loadCompetitions: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();

  const [participations, setParticipations] = useState<ParticipationRow[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // Add/Edit Participant Modal State
  const [openPartForm, setOpenPartForm] = useState(false);
  const [editPart, setEditPart] = useState<ParticipationRow | null>(null);
  const [partForm, setPartForm] = useState({
    member_id: "",
    coach_id: "",
    category: "",
    stroke: "",
    distance_meters: "",
    age_group: "",
    time_raw: "",
    rank: "",
    result_status: "finished",
    award: "participant",
    custom_award_label: "",
    notes: "",
    competition_id: "",
  });
  const [savingPart, setSavingPart] = useState(false);

  // Competition documents — one certificate/photo per (member, competition), covers every
  // category that member won at that event. Keyed by `${competition_id}_${member_id}`.
  const [competitionDocs, setCompetitionDocs] = useState<Record<string, CompetitionDocumentRow>>({});
  const docKey = (competitionId: string, memberId: string) => `${competitionId}_${memberId}`;
  const getDoc = useCallback(
    (memberId: string | null | undefined, competitionId: string | null | undefined) =>
      memberId && competitionId ? competitionDocs[docKey(competitionId, memberId)] : undefined,
    [competitionDocs]
  );
  const mergeDocs = useCallback((rows: CompetitionDocumentRow[]) => {
    setCompetitionDocs(prev => {
      const next = { ...prev };
      rows.forEach(d => { next[docKey(d.competition_id, d.member_id)] = d; });
      return next;
    });
  }, []);

  const [memberSearch, setMemberSearch] = useState("");

  // Lightbox — PDFs can't render inside an <img>, so route those to a new tab instead
  // of the image lightbox based on the document's stored content type.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const handleViewDoc = (doc: CompetitionDocumentRow) => {
    if (doc.content_type === "application/pdf") {
      window.open(doc.document_url, "_blank", "noopener,noreferrer");
    } else {
      setLightboxUrl(doc.document_url);
    }
  };

  const [awardMemberId, setAwardMemberId] = useState("");
  const [awardMemberSearch, setAwardMemberSearch] = useState("");
  const [memberParticipations, setMemberParticipations] = useState<ParticipationRow[]>([]);
  const [memberParticipationsLoading, setMemberParticipationsLoading] = useState(false);

  // Participant picker (Awards tab) — search + filter + pagination over membersList
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTypeFilter, setPickerTypeFilter] = useState<"all" | "reguler" | "private" | "school_affiliate">("all");
  const [pickerBranchFilter, setPickerBranchFilter] = useState("all");
  const [pickerPage, setPickerPage] = useState(0);
  const PICKER_PAGE_SIZE = 10;

  // ── Load Member Participations (for awards tab) ───────────────────────────
  const loadMemberParticipations = useCallback(async (memberId: string) => {
    if (!memberId) { setMemberParticipations([]); return; }
    setMemberParticipationsLoading(true);
    const { data, error } = await supabase
      .from("competition_participations")
      .select(`
        id, competition_id, member_id, branch_id, coach_id, category, stroke, distance_meters, age_group,
        time_seconds, time_formatted, rank, result_status, award, custom_award_label, notes, created_at,
        competition:competitions(id, name, start_date, level),
        member:members(id, profile:profiles(full_name, avatar_url)),
        branch:branches(name),
        coach:profiles!competition_participations_coach_id_fkey(full_name)
      `)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    setMemberParticipationsLoading(false);
    if (error) { toast.error(t("admin.competition.loadAwardsFailed", { error: error.message })); return; }
    setMemberParticipations((data as unknown as ParticipationRow[]) ?? []);

    const { data: docs } = await supabase
      .from("competition_documents")
      .select("id, competition_id, member_id, document_url, content_type")
      .eq("member_id", memberId);
    if (docs) mergeDocs(docs as CompetitionDocumentRow[]);
  }, [supabase, toast, mergeDocs]);

  useEffect(() => {
    loadMemberParticipations(awardMemberId);
  }, [awardMemberId, loadMemberParticipations]);

  // ── Load Competition Details ──────────────────────────────────────────────
  const loadParticipations = useCallback(async (compId: string) => {
    setLoadingParts(true);
    const { data, error } = await supabase
      .from("competition_participations")
      .select(`
        id, competition_id, member_id, branch_id, coach_id, category, stroke, distance_meters, age_group,
        time_seconds, time_formatted, rank, result_status, award, custom_award_label, notes, created_at,
        member:members(id, profile:profiles(full_name, avatar_url)),
        branch:branches(name),
        coach:profiles!competition_participations_coach_id_fkey(full_name)
      `)
      .eq("competition_id", compId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("admin.competition.loadParticipantsFailed", { error: error.message }));
    } else {
      setParticipations((data as unknown as ParticipationRow[]) ?? []);
    }

    const { data: docs } = await supabase
      .from("competition_documents")
      .select("id, competition_id, member_id, document_url, content_type")
      .eq("competition_id", compId);
    if (docs) mergeDocs(docs as CompetitionDocumentRow[]);

    setLoadingParts(false);
  }, [supabase, toast, mergeDocs]);

  // ── Participation Handlers ────────────────────────────────────────────────
  const openAddParticipant = (prefilledMemberId?: string) => {
    setEditPart(null);
    setPartForm({
      member_id: prefilledMemberId ?? "",
      coach_id: "",
      category: "",
      stroke: "",
      distance_meters: "",
      age_group: "",
      time_raw: "",
      rank: "",
      result_status: "finished",
      award: "participant",
      custom_award_label: "",
      notes: "",
      competition_id: "",
    });
    setOpenPartForm(true);
  };

  const openEditParticipant = (p: ParticipationRow) => {
    setEditPart(p);
    setPartForm({
      member_id: p.member_id,
      coach_id: p.coach_id ?? "",
      category: p.category,
      stroke: p.stroke ?? "",
      distance_meters: p.distance_meters != null ? String(p.distance_meters) : "",
      age_group: p.age_group ?? "",
      time_raw: p.time_formatted || (p.time_seconds ? `${p.time_seconds}` : ""),
      rank: p.rank ? `${p.rank}` : "",
      result_status: p.result_status || "finished",
      award: p.award || "participant",
      custom_award_label: p.custom_award_label ?? "",
      notes: p.notes ?? "",
      competition_id: p.competition_id ?? "",
    });
    setOpenPartForm(true);
  };

  // Pre-fills the award form from an existing entry as a starting point for a NEW row (editPart
  // stays null, so handleSaveParticipant inserts rather than updates) — for a member who wins
  // several similar categories at once, this is faster than a blank form each time. The
  // certificate/document itself is unaffected either way: it's scoped to (member, competition),
  // not to this individual achievement row, so it stays exactly as already uploaded.
  const openDuplicateParticipant = (p: ParticipationRow) => {
    setEditPart(null);
    setPartForm({
      member_id: p.member_id,
      coach_id: p.coach_id ?? "",
      category: p.category,
      stroke: p.stroke ?? "",
      distance_meters: p.distance_meters != null ? String(p.distance_meters) : "",
      age_group: p.age_group ?? "",
      time_raw: p.time_formatted || (p.time_seconds ? `${p.time_seconds}` : ""),
      rank: p.rank ? `${p.rank}` : "",
      result_status: p.result_status || "finished",
      award: p.award || "participant",
      custom_award_label: p.custom_award_label ?? "",
      notes: p.notes ?? "",
      competition_id: p.competition_id ?? "",
    });
    setOpenPartForm(true);
  };

  const handleSaveParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Which button triggered submission — lets "Simpan & Tambah Lagi" reuse the same validation
    // and insert logic as the normal Simpan button while still keeping the form open afterwards.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const keepOpenForNext = submitter?.value === "keepOpen";
    const effectiveCompId = selectedComp?.id ?? partForm.competition_id;
    if (!effectiveCompId) {
      toast.error(t("admin.competition.selectCompRequired"));
      return;
    }
    if (!partForm.member_id || !partForm.category.trim()) {
      toast.error(t("admin.competition.memberCategoryRequired"));
      return;
    }

    setSavingPart(true);
    const parsedTime = parseSwimTime(partForm.time_raw);

    if (editPart) {
      const { error } = await supabase
        .from("competition_participations")
        .update({
          member_id: partForm.member_id,
          coach_id: partForm.coach_id || null,
          category: partForm.category.trim(),
          stroke: partForm.stroke.trim() || null,
          distance_meters: partForm.distance_meters ? parseInt(partForm.distance_meters, 10) : null,
          age_group: partForm.age_group.trim() || null,
          time_seconds: parsedTime.seconds,
          time_formatted: parsedTime.formatted || null,
          rank: partForm.rank ? parseInt(partForm.rank, 10) : null,
          result_status: partForm.result_status,
          award: partForm.award,
          custom_award_label: partForm.award === "custom" ? partForm.custom_award_label.trim() : null,
          notes: partForm.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editPart.id);

      if (error) {
        toast.error(t("admin.competition.updateParticipantFailed", { error: error.message }));
        setSavingPart(false);
        return;
      }

      toast.success(t("admin.competition.participantUpdated"));
      setOpenPartForm(false);
      if (selectedComp) loadParticipations(selectedComp.id);
      if (awardMemberId) loadMemberParticipations(awardMemberId);
      loadCompetitions();
    } else {
      const selectedMember = membersList.find(m => m.id === partForm.member_id);
      const targetBranchId = branchId || selectedMember?.branch_id || "";

      const { error } = await supabase
        .from("competition_participations")
        .insert({
          competition_id: effectiveCompId,
          member_id: partForm.member_id,
          branch_id: targetBranchId,
          coach_id: partForm.coach_id || null,
          category: partForm.category.trim(),
          stroke: partForm.stroke.trim() || null,
          distance_meters: partForm.distance_meters ? parseInt(partForm.distance_meters, 10) : null,
          age_group: partForm.age_group.trim() || null,
          time_seconds: parsedTime.seconds,
          time_formatted: parsedTime.formatted || null,
          rank: partForm.rank ? parseInt(partForm.rank, 10) : null,
          result_status: partForm.result_status,
          award: partForm.award,
          custom_award_label: partForm.award === "custom" ? partForm.custom_award_label.trim() : null,
          notes: partForm.notes.trim() || null,
        });

      if (error) {
        toast.error(t("admin.competition.addParticipantFailed", { error: error.message }));
        setSavingPart(false);
        return;
      }

      toast.success(t("admin.competition.participantAdded"));
      if (keepOpenForNext) {
        // Member, lomba, coach, and age group stay locked — only the per-category fields reset —
        // so entering the next category win for the same member+lomba needs no re-navigation.
        setPartForm(prev => ({
          member_id: prev.member_id,
          coach_id: prev.coach_id,
          category: "",
          stroke: "",
          distance_meters: "",
          age_group: prev.age_group,
          time_raw: "",
          rank: "",
          result_status: "finished",
          award: "participant",
          custom_award_label: "",
          notes: "",
          competition_id: prev.competition_id,
        }));
      } else {
        setOpenPartForm(false);
      }
      if (selectedComp) loadParticipations(selectedComp.id);
      if (awardMemberId) loadMemberParticipations(awardMemberId);
      loadCompetitions();
    }
    setSavingPart(false);
  };

  const handleRemoveParticipant = async (p: ParticipationRow) => {
    const ok = await confirm({
      title: t("admin.competition.deleteParticipantConfirmTitle"),
      body: `${t("admin.competition.deleteParticipantConfirmBody", { name: (p.member?.profile as any)?.full_name ?? "Student", category: p.category })} ${t("admin.competition.deleteParticipantConfirmNote")}`,
      confirmLabel: t("admin.competition.deleteParticipantConfirmLabel"),
      danger: true,
    });

    if (!ok) return;

    const { error } = await supabase.from("competition_participations").delete().eq("id", p.id);
    if (error) {
      toast.error(t("admin.competition.deleteParticipantFailed", { error: error.message }));
    } else {
      toast.success(t("admin.competition.participantDeleted"));
      if (selectedComp) loadParticipations(selectedComp.id);
      if (awardMemberId) loadMemberParticipations(awardMemberId);
      loadCompetitions();
    }
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return membersList.slice(0, 30);
    return membersList.filter(m =>
      m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
    ).slice(0, 30);
  }, [membersList, memberSearch]);

  // Participant picker (Awards tab) — branches present in membersList, for the branch filter (owner/unscoped view only)
  const pickerBranchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    membersList.forEach(m => { if (m.branch_id && m.branch_name) seen.set(m.branch_id, m.branch_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [membersList]);

  const pickerFilteredMembers = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return membersList.filter(m => {
      const matchSearch = !q || m.full_name.toLowerCase().includes(q) || (m.member_no ?? "").toLowerCase().includes(q);
      const matchType = pickerTypeFilter === "all" || m.type === pickerTypeFilter;
      const matchBranch = pickerBranchFilter === "all" || m.branch_id === pickerBranchFilter;
      return matchSearch && matchType && matchBranch;
    });
  }, [membersList, pickerSearch, pickerTypeFilter, pickerBranchFilter]);

  const pickerTotalPages = Math.max(1, Math.ceil(pickerFilteredMembers.length / PICKER_PAGE_SIZE));
  const pickerSafePage = Math.min(pickerPage, pickerTotalPages - 1);
  const pickerPaginatedMembers = pickerFilteredMembers.slice(pickerSafePage * PICKER_PAGE_SIZE, (pickerSafePage + 1) * PICKER_PAGE_SIZE);

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when picker filters change */
  useEffect(() => { setPickerPage(0); }, [pickerSearch, pickerTypeFilter, pickerBranchFilter]);

  // The (member, competition) pair the achievement form's certificate uploader is scoped to —
  // resolved the same way handleSaveParticipant resolves the competition to save against.
  const formEffectiveMemberId = editPart?.member_id || partForm.member_id;
  const formEffectiveCompId = selectedComp?.id || partForm.competition_id;

  return {
    participations, loadingParts, loadParticipations,
    openPartForm, setOpenPartForm, editPart, partForm, setPartForm, savingPart,
    getDoc, mergeDocs, handleViewDoc, lightboxUrl, setLightboxUrl,
    memberSearch, setMemberSearch, filteredMembers,
    awardMemberId, setAwardMemberId, awardMemberSearch, setAwardMemberSearch,
    memberParticipations, setMemberParticipations, memberParticipationsLoading, loadMemberParticipations,
    pickerSearch, setPickerSearch, pickerTypeFilter, setPickerTypeFilter, pickerBranchFilter, setPickerBranchFilter,
    pickerPage, setPickerPage, pickerBranchOptions, pickerFilteredMembers, pickerTotalPages, pickerSafePage, pickerPaginatedMembers,
    openAddParticipant, openEditParticipant, openDuplicateParticipant, handleSaveParticipant, handleRemoveParticipant,
    formEffectiveMemberId, formEffectiveCompId,
  };
}
