"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { fmtDate, parseSwimTime } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompetitionRow {
  id: string;
  name: string;
  organizer: string | null;
  location: string | null;
  city: string | null;
  start_date: string;
  end_date: string | null;
  level: string;
  description: string | null;
  created_by_id: string | null;
  created_at: string;
  participations_count?: number;
  medals_count?: number;
}

export interface ParticipationRow {
  id: string;
  competition_id: string;
  member_id: string;
  branch_id: string;
  coach_id: string | null;
  category: string;
  stroke: string | null;
  distance_meters: number | null;
  age_group: string | null;
  time_seconds: number | null;
  time_formatted: string | null;
  rank: number | null;
  result_status: string;
  award: string;
  custom_award_label: string | null;
  notes: string | null;
  created_at: string;
  member?: {
    id: string;
    profile?: { full_name: string; avatar_url: string | null } | null;
  } | null;
  branch?: { name: string } | null;
  coach?: { full_name: string } | null;
}

export interface CompetitionDocumentRow {
  id: string;
  competition_id: string;
  member_id: string;
  document_url: string;
  content_type: string | null;
}

export interface MemberOption {
  id: string;
  full_name: string;
  branch_name?: string;
  branch_id: string;
  type: string;
  member_no: string | null;
}

// Computed inside the component (needs t()) — see getMemberTypeLabels/getAwardLabels below.
export interface CoachOption {
  id: string;
  full_name: string;
}

const getMemberTypeLabels = (t: (key: string) => string): Record<string, string> => ({
  reguler: t("admin.competition.memberTypeReguler"),
  private: t("admin.competition.memberTypePrivate"),
  school_affiliate: t("admin.competition.memberTypeSchoolAffiliate"),
});

const getAwardLabels = (t: (key: string) => string): Record<string, { label: string; icon: string; style: string }> => ({
  gold: { label: t("admin.competition.awardGold"), icon: "🥇", style: "bg-amber-100 text-amber-900 border-amber-300 font-bold" },
  silver: { label: t("admin.competition.awardSilver"), icon: "🥈", style: "bg-slate-100 text-slate-800 border-slate-300 font-bold" },
  bronze: { label: t("admin.competition.awardBronze"), icon: "🥉", style: "bg-amber-900/10 text-amber-800 border-amber-800/30 font-bold" },
  fourth_place: { label: t("admin.competition.awardFourthPlace"), icon: "🏅", style: "bg-blue-50 text-blue-800 border-blue-200" },
  finalist: { label: t("admin.competition.awardFinalist"), icon: "⭐", style: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  participant: { label: t("admin.competition.awardParticipant"), icon: "🏊", style: "bg-gray-100 text-gray-700 border-gray-200" },
  custom: { label: t("admin.competition.awardCustom"), icon: "🏆", style: "bg-purple-50 text-purple-800 border-purple-200 font-bold" },
});

// One certificate/document per (member, competition) — covers every category that member
// won at that event, so it's uploaded once here rather than repeated per achievement row.
function CompetitionDocUploader({
  competitionId,
  memberId,
  doc,
  onUploaded,
  onView,
}: {
  competitionId: string;
  memberId: string;
  doc: CompetitionDocumentRow | undefined;
  onUploaded: (doc: CompetitionDocumentRow) => void;
  onView: (doc: CompetitionDocumentRow) => void;
}) {
  const toast = useToast();
  const { t } = useLocale();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("competitionId", competitionId);
    fd.append("memberId", memberId);
    const res = await fetch("/api/upload/competition-doc", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({})) as { url?: string; content_type?: string; error?: string };
    setUploading(false);
    if (!res.ok || !json.url) {
      toast.error(t("admin.competition.docUploadFailed"), json.error);
      return;
    }
    toast.success(t("admin.competition.docUploadedSuccess"));
    onUploaded({ id: doc?.id ?? "", competition_id: competitionId, member_id: memberId, document_url: json.url, content_type: json.content_type ?? null });
  };

  return (
    <Field label={t("admin.competition.docFieldLabel")} hint={t("admin.competition.docFieldHint")}>
      <div className="flex items-center gap-2 flex-wrap">
        {doc && (
          <button
            type="button"
            onClick={() => onView(doc)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ocean-200 bg-ocean-50 text-ocean-700 text-xs font-semibold hover:bg-ocean-100 transition-colors"
          >
            <Icon name="eye" className="w-3.5 h-3.5" /> {t("admin.competition.docViewBtn")}
          </button>
        )}
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-paper-tint transition-colors">
          <Icon name={uploading ? "refresh" : "upload"} className={`w-3.5 h-3.5 ${uploading ? "animate-spin" : ""}`} />
          {uploading ? t("admin.competition.docUploadingBtn") : doc ? t("admin.competition.docChangeBtn") : t("admin.competition.docUploadBtn")}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>
    </Field>
  );
}

export default function AdminCompetition({ branchId }: { branchId: string }) {
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

  // Detail Modal State
  const [selectedComp, setSelectedComp] = useState<CompetitionRow | null>(null);
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

  // Member & Coach options for selector
  const [membersList, setMembersList] = useState<MemberOption[]>([]);
  const [coachesList, setCoachesList] = useState<CoachOption[]>([]);
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

  // Awards tab (member-centric view) — default landing tab, per the member-first redesign.
  const [activeTab, setActiveTab] = useState<"competitions" | "awards">("awards");
  // When true, saving compForm (create/edit Lomba) should feed the result back into partForm's
  // competition dropdown instead of just refreshing the Perlombaan tab — set right before opening
  // compForm from inside the participant/award form's inline "+ Lomba Baru" / edit-lomba buttons.
  const [compFormReturnToPart, setCompFormReturnToPart] = useState(false);
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

  const handleSaveComp = async (e: React.FormEvent) => {
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
            setPartForm(prev => ({ ...prev, competition_id: newComp.id }));
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
    } else {
      toast.success(t("admin.competition.deleted"));
      await triggerLog("delete", comp.id, comp.name, t("admin.competition.activityDeletedComp", { name: comp.name }));
      loadCompetitions();
      if (selectedComp?.id === comp.id) setSelectedComp(null);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* ── Summary Stats matching pen.dev qgz4S ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-paper border border-line rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">{t("admin.competition.statTotalCompetitions")}</div>
          <div className="text-2xl font-extrabold font-display text-ocean-600">{totalComps}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">{t("admin.competition.statTotalParticipations")}</div>
          <div className="text-2xl font-extrabold font-display text-wave-600">{totalParticipations}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">{t("admin.competition.statTotalMedals")}</div>
          <div className="text-2xl font-extrabold font-display text-ok-600">{totalMedals}</div>
        </div>
      </div>

      {/* ── Tab Switcher matching pen.dev fxNZQ ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("awards")}
          className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "awards"
              ? "bg-ocean-600 text-white shadow-xs"
              : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
          }`}
        >
          {t("admin.competition.tabAwards")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("competitions")}
          className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "competitions"
              ? "bg-ocean-600 text-white shadow-xs"
              : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
          }`}
        >
          {t("admin.competition.tabCompetitions")}
        </button>
      </div>

      {/* ── AWARDS TAB: Member-first landing view matching pen.dev CeNt0 & NmdyX ── */}
      {activeTab === "awards" && (
        <div className="space-y-4">
          {/* Toolbar matching pen.dev CeNt0 */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-64">
              <Icon name="search" className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={t("admin.competition.searchMemberPlaceholder")}
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-sm bg-paper border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
              />
            </div>
            <select
              value={pickerTypeFilter}
              onChange={e => setPickerTypeFilter(e.target.value as typeof pickerTypeFilter)}
              className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
            >
              <option value="all">{t("admin.competition.allMemberTypes")}</option>
              <option value="reguler">{MEMBER_TYPE_LABELS.reguler}</option>
              <option value="private">{MEMBER_TYPE_LABELS.private}</option>
              <option value="school_affiliate">{MEMBER_TYPE_LABELS.school_affiliate}</option>
            </select>
            {!branchId && pickerBranchOptions.length > 0 && (
              <select
                value={pickerBranchFilter}
                onChange={e => setPickerBranchFilter(e.target.value)}
                className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
              >
                <option value="all">{t("admin.competition.allBranches")}</option>
                {pickerBranchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>

          {/* Card matching pen.dev NmdyX */}
          <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <tr>
                    <th className="py-2 px-5">{t("admin.competition.colName")}</th>
                    <th className="py-2 px-5">No. Anggota</th>
                    <th className="py-2 px-5">Tipe</th>
                    {!branchId && <th className="py-2 px-5">{t("admin.competition.colBranch")}</th>}
                    <th className="py-2 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pickerPaginatedMembers.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => { setAwardMemberId(m.id); setAwardMemberSearch(m.full_name); }}
                      className="hover:bg-paper-tint/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.full_name} size={32} />
                          <div>
                            <div className="font-semibold text-sm text-ink">{m.full_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-ink-mute font-mono text-xs">{m.member_no ?? "—"}</td>
                      <td className="py-3 px-5 text-ink-soft text-sm">{MEMBER_TYPE_LABELS[m.type] ?? m.type}</td>
                      {!branchId && <td className="py-3 px-5 text-ink-soft text-sm">{m.branch_name || "—"}</td>}
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setAwardMemberId(m.id); setAwardMemberSearch(m.full_name); }}
                          className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink inline-flex items-center justify-center transition-colors"
                        >
                          <Icon name="eye" className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pickerPaginatedMembers.length === 0 && (
                    <tr>
                      <td colSpan={branchId ? 4 : 5} className="text-center py-12 text-ink-mute text-sm">
                        {t("admin.competition.noMemberMatchFilter")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pickerTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-line text-xs text-ink-mute bg-paper-tint/30">
                <span>{pickerFilteredMembers.length} student · hal. {pickerSafePage + 1}/{pickerTotalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pickerSafePage === 0}
                    onClick={() => setPickerPage(p => p - 1)}
                    className="px-3 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
                  >
                    ‹ Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={pickerSafePage >= pickerTotalPages - 1}
                    onClick={() => setPickerPage(p => p + 1)}
                    className="px-3 py-1 rounded-lg border border-line bg-paper text-ink-soft disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition"
                  >
                    Selanjutnya ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Member Achievement Detail (popup opened by clicking a member above) ── */}
      {awardMemberId && (
        <Modal
          open={!!awardMemberId}
          onClose={() => { setAwardMemberId(""); setAwardMemberSearch(""); setMemberParticipations([]); }}
          title={awardMemberSearch || t("admin.competition.memberAchievementsFallbackTitle")}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-bold text-ink-strong">{t("admin.competition.achievementHistoryTitle")}</div>
                <p className="text-xs text-ink-mute">{t("admin.competition.achievementHistorySub", { count: memberParticipations.length })}</p>
              </div>
              <Btn variant="primary" size="sm" icon="plus" onClick={() => openAddParticipant(awardMemberId)}>
                {t("admin.competition.addAwardBtn")}
              </Btn>
            </div>
            {memberParticipationsLoading ? (
              <div className="py-8 text-center text-ink-mute text-sm">{t("admin.competition.loadingData")}</div>
            ) : memberParticipations.length === 0 ? (
              <div className="py-8 text-center text-ink-mute text-sm border border-dashed border-line rounded-xl">
                {t("admin.competition.noAwardsYet")}
              </div>
            ) : (
              <div className="overflow-x-auto border border-line rounded-2xl">
                <table className="w-full text-sm min-w-[780px]">
                  <thead>
                    <tr className="border-b border-line bg-paper-tint text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      <th className="py-3 px-4 min-w-[200px]">Perlombaan</th>
                      <th className="py-3 px-4 min-w-[140px]">{t("admin.competition.colCategory")}</th>
                      <th className="py-3 px-4 w-32 whitespace-nowrap">Waktu</th>
                      <th className="py-3 px-4 text-center w-24 whitespace-nowrap">Peringkat</th>
                      <th className="py-3 px-4 text-center w-36 whitespace-nowrap">Penghargaan</th>
                      <th className="py-3 px-4 text-center w-28 whitespace-nowrap">Sertifikat</th>
                      <th className="py-3 px-4 text-right w-32 whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {memberParticipations.map(p => {
                      const awardInfo = AWARD_LABELS[p.award] || AWARD_LABELS.participant;
                      const comp = (p as unknown as { competition?: { name: string; start_date: string; level: string } }).competition;
                      return (
                        <tr key={p.id} className="hover:bg-paper-tint/60 transition-colors">
                          <td className="py-3 px-4 min-w-[200px]">
                            <div className="font-bold text-ink-strong line-clamp-1">{comp?.name ?? "—"}</div>
                            {comp?.start_date && <div className="text-xs text-ink-mute mt-0.5">{fmtDate(comp.start_date)}</div>}
                          </td>
                          <td className="py-3 px-4 min-w-[140px]">
                            <div className="font-medium text-ink">{p.category}</div>
                            {p.age_group && <div className="text-xs text-ink-mute">{p.age_group}</div>}
                          </td>
                          <td className="py-3 px-4 font-mono text-ocean-700 font-bold whitespace-nowrap">
                            {p.time_formatted || (p.time_seconds ? `${p.time_seconds}s` : "—")}
                          </td>
                          <td className="py-3 px-4 text-center font-bold whitespace-nowrap">{p.rank ? `#${p.rank}` : "—"}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${awardInfo.style}`}>
                              {awardInfo.icon} {p.award === "custom" && p.custom_award_label ? p.custom_award_label : awardInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {(() => {
                              const doc = getDoc(p.member_id, p.competition_id);
                              return doc ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewDoc(doc)}
                                  className="text-xs font-semibold text-ocean-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                                >
                                  <Icon name="eye" className="w-3.5 h-3.5" /> View
                                </button>
                              ) : (
                                <span className="text-xs text-ink-faint">—</span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openDuplicateParticipant(p)}
                                title={t("admin.competition.duplicateEntryTitle")}
                                className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                              >
                                <Icon name="copy" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditParticipant(p)}
                                title={t("admin.competition.editTitle")}
                                className="w-7 h-7 rounded-lg hover:bg-paper-deep text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                              >
                                <Icon name="edit" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(p)}
                                title={t("admin.competition.deleteBtn")}
                                className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-mute hover:text-danger-500 flex items-center justify-center transition-colors"
                              >
                                <Icon name="trash" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── COMPETITIONS TAB ── */}
      {activeTab === "competitions" && (
        <div className="space-y-4">
          {/* Actions Header & Filter */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              <div className="relative w-64">
                <Icon name="search" className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("admin.competition.searchCompPlaceholder")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-sm bg-paper border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
                />
              </div>
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
              >
                <option value="all">{t("admin.competition.allLevels")}</option>
                <option value="internal">{t("admin.competition.levelInternal")}</option>
                <option value="local">{t("admin.competition.levelLocal")}</option>
                <option value="regional">{t("admin.competition.levelRegional")}</option>
                <option value="national">{t("admin.competition.levelNational")}</option>
                <option value="international">{t("admin.competition.levelInternational")}</option>
              </select>
            </div>
            <Btn variant="primary" icon="plus" onClick={openCreateComp} className="!h-10 !rounded-xl">
              {t("admin.competition.addCompBtn")}
            </Btn>
          </div>

          {/* Competitions Table */}
          <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-12 text-center text-ink-mute text-sm">{t("admin.competition.loadingCompData")}</div>
            ) : filteredComps.length === 0 ? (
              <div className="py-12 text-center text-ink-mute text-sm">
                {t("admin.competition.noCompYet")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                    <tr>
                      <th className="py-2 px-5 min-w-[240px]">{t("admin.competition.colCompName")}</th>
                      <th className="py-2 px-5 min-w-[160px] whitespace-nowrap">{t("admin.competition.colDateTime")}</th>
                      <th className="py-2 px-5 min-w-[180px]">Penyelenggara</th>
                      <th className="py-2 px-5 text-center w-28 whitespace-nowrap">Level</th>
                      <th className="py-2 px-5 text-center w-20 whitespace-nowrap">Peserta</th>
                      <th className="py-2 px-5 text-center w-24 whitespace-nowrap">Medali</th>
                      <th className="py-2 px-5 text-right w-40 whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredComps.map(comp => (
                      <tr key={comp.id} className="hover:bg-paper-tint/60 transition-colors">
                        <td className="py-3 px-5 min-w-[240px]">
                          <div className="font-bold text-ink leading-snug">{comp.name}</div>
                          {comp.description && <div className="text-xs text-ink-mute mt-0.5 line-clamp-1 max-w-md">{comp.description}</div>}
                        </td>
                        <td className="py-3 px-5 min-w-[160px]">
                          <div className="font-medium text-ink whitespace-nowrap flex items-center gap-1.5 text-xs">
                            <Icon name="calendar" className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                            <span>{fmtDate(comp.start_date)}</span>
                            {comp.end_date && comp.end_date !== comp.start_date && (
                              <span className="text-ink-mute font-normal"> – {fmtDate(comp.end_date)}</span>
                            )}
                          </div>
                          {(comp.location || comp.city) && (
                            <div className="text-[11px] text-ink-mute mt-0.5 flex items-center gap-1 line-clamp-1 max-w-[220px]">
                              <Icon name="mapPin" className="w-3 h-3 text-ink-faint shrink-0" />
                              <span className="truncate">{comp.location || comp.city}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-5 min-w-[180px] text-ink-soft text-xs leading-relaxed">
                          <span className="line-clamp-2">{comp.organizer || "—"}</span>
                        </td>
                        <td className="py-3 px-5 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ocean-50 text-ocean-700 border border-ocean-200/80">
                            {comp.level}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center font-bold text-ink whitespace-nowrap font-mono">
                          {comp.participations_count ?? 0}
                        </td>
                        <td className="py-3 px-5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${comp.medals_count ? "bg-amber-50 text-amber-900 border border-amber-300/80" : "text-ink-mute bg-paper-tint border border-line"}`}>
                            🏆 {comp.medals_count ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedComp(comp);
                                loadParticipations(comp.id);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <Icon name="eye" className="w-3.5 h-3.5 text-ink-mute" />
                              <span>Peserta</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditComp(comp)}
                              title={t("admin.competition.editTitle")}
                              className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink inline-flex items-center justify-center transition-colors"
                            >
                              <Icon name="edit" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComp(comp)}
                              title="Delete"
                              className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-danger-50 text-ink-mute hover:text-danger-600 inline-flex items-center justify-center transition-colors"
                            >
                              <Icon name="trash" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Create / Edit Competition ── */}
      {openCompForm && (
        <Modal
          open={openCompForm}
          onClose={() => setOpenCompForm(false)}
          title={editComp ? t("admin.competition.editCompModalTitle") : t("admin.competition.addCompModalTitle")}
        >
          <form onSubmit={handleSaveComp} className="space-y-4">
            <Field label={t("admin.competition.fieldName")} required hint={t("admin.competition.fieldNameHint")}>
              <Input
                value={compForm.name}
                onChange={e => setCompForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t("admin.competition.fieldNamePlaceholder")}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.competition.fieldOrganizer")} hint={t("admin.competition.fieldOrganizerHint")}>
                <Input
                  value={compForm.organizer}
                  onChange={e => setCompForm(prev => ({ ...prev, organizer: e.target.value }))}
                  placeholder={t("admin.competition.fieldOrganizerPlaceholder")}
                />
              </Field>
              <Field label={t("admin.competition.fieldLevel")}>
                <Select value={compForm.level} onChange={e => setCompForm(prev => ({ ...prev, level: e.target.value }))}>
                  <option value="internal">{t("admin.competition.levelInternal")}</option>
                  <option value="local">{t("admin.competition.levelLocal")}</option>
                  <option value="regional">{t("admin.competition.levelRegional")}</option>
                  <option value="national">{t("admin.competition.levelNational")}</option>
                  <option value="international">{t("admin.competition.levelInternational")}</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.competition.fieldLocation")}>
                <Input
                  value={compForm.location}
                  onChange={e => setCompForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder={t("admin.competition.fieldLocationPlaceholder")}
                />
              </Field>
              <Field label={t("admin.competition.fieldCity")}>
                <Input
                  value={compForm.city}
                  onChange={e => setCompForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Contoh: Bandung"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.competition.fieldStartDate")} required>
                <DatePicker
                  value={compForm.start_date}
                  onChange={d => setCompForm(prev => ({ ...prev, start_date: d }))}
                />
              </Field>
              <Field label={t("admin.competition.fieldEndDate")}>
                <DatePicker
                  value={compForm.end_date}
                  onChange={d => setCompForm(prev => ({ ...prev, end_date: d }))}
                />
              </Field>
            </div>

            <Field label={t("admin.competition.fieldNotes")}>
              <Textarea
                rows={3}
                value={compForm.description}
                onChange={e => setCompForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t("admin.competition.fieldNotesPlaceholder")}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Btn variant="ghost" onClick={() => setOpenCompForm(false)}>
                Batal
              </Btn>
              <Btn variant="primary" type="submit" disabled={savingComp}>
                {savingComp ? t("admin.competition.savingBtn") : editComp ? t("admin.competition.saveChangesBtn") : t("admin.competition.createCompBtn")}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Competition Detail & Participant Management ── */}
      {selectedComp && (
        <Modal
          open={!!selectedComp}
          onClose={() => setSelectedComp(null)}
          title={`Detail Perlombaan — ${selectedComp.name}`}
          size="xl"
        >
          <div className="space-y-5">
            {/* Comp Header Info Card */}
            <div className="bg-ocean-50/70 border border-ocean-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-bold text-ocean-900 text-base">{selectedComp.name}</div>
                <div className="text-ocean-700 text-xs mt-0.5">
                  📍 {selectedComp.location || selectedComp.city || t("admin.competition.locationNotSetFallback")} | 📅 {fmtDate(selectedComp.start_date)}
                  {selectedComp.organizer && ` | 🏢 ${selectedComp.organizer}`}
                </div>
              </div>
              <Btn variant="primary" size="sm" icon="plus" onClick={() => openAddParticipant()}>
                {t("admin.competition.addMemberResultBtn")}
              </Btn>
            </div>

            {/* Participants Table */}
            <div className="space-y-3">
              <div className="font-bold text-ink-strong flex items-center justify-between">
                <span>Daftar Peserta & Hasil ({participations.length})</span>
              </div>

              {loadingParts ? (
                <div className="py-8 text-center text-ink-mute">{t("admin.competition.loadingParticipants")}</div>
              ) : participations.length === 0 ? (
                <div className="py-8 text-center text-ink-mute border border-dashed border-line rounded-xl">
                  {t("admin.competition.noParticipantsYet")}
                </div>
              ) : (
                <div className="overflow-x-auto border border-line rounded-2xl">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-paper-tint text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-line">
                        <th className="py-3 px-4 min-w-[200px]">{t("admin.competition.colMemberBranch")}</th>
                        <th className="py-3 px-4 min-w-[160px]">{t("admin.competition.colCategoryAgeGroup")}</th>
                        <th className="py-3 px-4 w-32 whitespace-nowrap">Waktu Result</th>
                        <th className="py-3 px-4 text-center w-24 whitespace-nowrap">Peringkat</th>
                        <th className="py-3 px-4 text-center w-36 whitespace-nowrap">Hasil / Medali</th>
                        <th className="py-3 px-4 min-w-[140px]">Coach</th>
                        <th className="py-3 px-4 text-center w-28 whitespace-nowrap">Sertifikat</th>
                        <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-white">
                      {participations.map(p => {
                        const awardInfo = AWARD_LABELS[p.award] || AWARD_LABELS.participant;
                        const memberName = (p.member?.profile as any)?.full_name ?? "Student";
                        const avatarUrl = (p.member?.profile as any)?.avatar_url;

                        return (
                          <tr key={p.id} className="hover:bg-paper-tint/60 transition-colors">
                            <td className="py-3 px-4 min-w-[200px]">
                              <div className="flex items-center gap-2.5">
                                <Avatar src={avatarUrl ?? undefined} name={memberName} size={32} />
                                <div className="min-w-0">
                                  <div className="font-bold text-ink-strong truncate max-w-[180px]">{memberName}</div>
                                  <div className="text-xs text-ink-mute">{p.branch?.name || "Center"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 min-w-[160px]">
                              <div className="font-medium text-ink-strong">{p.category}</div>
                              {p.age_group && <div className="text-xs text-ink-mute">{p.age_group}</div>}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-ocean-700 whitespace-nowrap">
                              {p.time_formatted || (p.time_seconds ? `${p.time_seconds}s` : "—")}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-ink-strong whitespace-nowrap">
                              {p.rank ? `#${p.rank}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${awardInfo.style}`}>
                                {awardInfo.icon} {p.award === "custom" && p.custom_award_label ? p.custom_award_label : awardInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-ink-soft min-w-[140px]">
                              {p.coach?.full_name || "—"}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {(() => {
                                const doc = getDoc(p.member_id, p.competition_id);
                                return doc ? (
                                  <button
                                    type="button"
                                    onClick={() => handleViewDoc(doc)}
                                    className="text-xs font-semibold text-ocean-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                                  >
                                    <Icon name="eye" className="w-3.5 h-3.5" /> Lihat
                                  </button>
                                ) : (
                                  <span className="text-xs text-ink-faint">—</span>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditParticipant(p)}
                                  title={t("admin.competition.editTitle")}
                                  className="w-7 h-7 rounded-lg hover:bg-paper-deep text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                                >
                                  <Icon name="edit" className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveParticipant(p)}
                                  title={t("admin.competition.deleteTitle")}
                                  className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-mute hover:text-danger-500 flex items-center justify-center transition-colors"
                                >
                                  <Icon name="trash" className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Add / Edit Participant Result ── */}
      {openPartForm && (
        <Modal
          open={openPartForm}
          onClose={() => setOpenPartForm(false)}
          title={editPart ? t("admin.competition.editResultModalTitle") : t("admin.competition.addResultModalTitle")}
        >
          <form onSubmit={handleSaveParticipant} className="space-y-4">
            {/* Competition selector — shown only when opened from awards tab (no selectedComp).
                Includes inline Lomba CRUD (create/edit) so the admin never has to leave this
                popup just to register an event that doesn't exist yet or fix a typo in one. */}
            {!selectedComp && !editPart && (
              <Field label={t("admin.competition.fieldCompetition")} required>
                <div className="flex items-center gap-2">
                  <Select
                    value={partForm.competition_id}
                    onChange={e => setPartForm(prev => ({ ...prev, competition_id: e.target.value }))}
                    required
                    className="flex-1"
                  >
                    <option value="">{t("admin.competition.selectCompOption")}</option>
                    {competitions.map(c => {
                      // Native <select> option-list popups size themselves to the widest
                      // option and aren't clipped by the modal's bounds — a long competition
                      // name plus the date suffix can overflow past the modal edge. Truncate
                      // the name so the combined label stays short enough to fit.
                      const shortName = c.name.length > 45 ? `${c.name.slice(0, 45)}…` : c.name;
                      return (
                        <option key={c.id} value={c.id} title={c.name}>
                          {shortName} — {c.start_date ? fmtDate(c.start_date) : ""}
                        </option>
                      );
                    })}
                  </Select>
                  <button
                    type="button"
                    title={t("admin.competition.addNewEventTitle")}
                    onClick={() => { setCompFormReturnToPart(true); openCreateComp(); }}
                    className="shrink-0 w-9 h-9 rounded-lg border border-line hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                  >
                    <Icon name="plus" className="w-4 h-4" />
                  </button>
                  {partForm.competition_id && (
                    <button
                      type="button"
                      title={t("admin.competition.editThisEventTitle")}
                      onClick={() => {
                        const comp = competitions.find(c => c.id === partForm.competition_id);
                        if (comp) { setCompFormReturnToPart(true); openEditComp(comp); }
                      }}
                      className="shrink-0 w-9 h-9 rounded-lg border border-line hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                    >
                      <Icon name="edit" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Field>
            )}

            <Field label={t("admin.competition.selectMemberField")} required>
              {(editPart || (activeTab === "awards" && awardMemberId && !editPart && partForm.member_id === awardMemberId)) ? (
                <div className="p-2.5 bg-paper-tint rounded-lg font-bold text-ink-strong">
                  {editPart
                    ? (editPart.member?.profile as { full_name: string } | null)?.full_name
                    : awardMemberSearch}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder={t("admin.competition.searchMemberInline")}
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                  <Select
                    value={partForm.member_id}
                    onChange={e => setPartForm(prev => ({ ...prev, member_id: e.target.value }))}
                    required
                  >
                    <option value="">{t("admin.competition.selectMemberOption")}</option>
                    {filteredMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.branch_name || "Center"})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.competition.fieldCategoryEvent")} required hint={t("admin.competition.fieldCategoryEventHint")}>
                <Input
                  value={partForm.category}
                  onChange={e => setPartForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="50m Gaya Bebas"
                  required
                />
              </Field>
              <Field label={t("admin.competition.fieldAgeGroup")} hint={t("admin.competition.fieldAgeGroupHint")}>
                <Input
                  value={partForm.age_group}
                  onChange={e => setPartForm(prev => ({ ...prev, age_group: e.target.value }))}
                  placeholder="KU-4 (U-12)"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.competition.fieldStroke")} hint={t("admin.competition.fieldStrokeHint")}>
                <Input
                  value={partForm.stroke}
                  onChange={e => setPartForm(prev => ({ ...prev, stroke: e.target.value }))}
                  placeholder={t("admin.competition.fieldStrokePlaceholder")}
                />
              </Field>
              <Field label={t("admin.competition.fieldDistance")} hint={t("admin.competition.fieldDistanceHint")}>
                <Input
                  type="number" min={0} inputMode="numeric"
                  value={partForm.distance_meters}
                  onChange={e => setPartForm(prev => ({ ...prev, distance_meters: e.target.value }))}
                  placeholder="50"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={t("admin.competition.fieldResultTime")} hint={t("admin.competition.fieldResultTimeHint")}>
                <Input
                  value={partForm.time_raw}
                  onChange={e => setPartForm(prev => ({ ...prev, time_raw: e.target.value }))}
                  placeholder="32.41"
                />
              </Field>
              <Field label={t("admin.competition.fieldRank")} hint={t("admin.competition.fieldRankHint")}>
                <Input
                  type="number"
                  min={1}
                  value={partForm.rank}
                  onChange={e => setPartForm(prev => ({ ...prev, rank: e.target.value }))}
                  placeholder="1"
                />
              </Field>
              <Field label={t("admin.competition.fieldResultStatus")}>
                <Select value={partForm.result_status} onChange={e => setPartForm(prev => ({ ...prev, result_status: e.target.value }))}>
                  <option value="finished">{t("admin.competition.statusFinished")}</option>
                  <option value="finalist">{t("admin.competition.statusFinalist")}</option>
                  <option value="dq">{t("admin.competition.statusDq")}</option>
                  <option value="dns">{t("admin.competition.statusDns")}</option>
                  <option value="dnf">{t("admin.competition.statusDnf")}</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.competition.fieldAwardMedal")}>
                <Select value={partForm.award} onChange={e => setPartForm(prev => ({ ...prev, award: e.target.value }))}>
                  <option value="participant">{t("admin.competition.awardOptionParticipant")}</option>
                  <option value="gold">{t("admin.competition.awardOptionGold")}</option>
                  <option value="silver">{t("admin.competition.awardOptionSilver")}</option>
                  <option value="bronze">{t("admin.competition.awardOptionBronze")}</option>
                  <option value="fourth_place">{t("admin.competition.awardOptionFourthPlace")}</option>
                  <option value="finalist">{t("admin.competition.awardOptionFinalist")}</option>
                  <option value="custom">{t("admin.competition.awardOptionCustom")}</option>
                </Select>
              </Field>
              {partForm.award === "custom" && (
                <Field label={t("admin.competition.fieldCustomAward")}>
                  <Input
                    value={partForm.custom_award_label}
                    onChange={e => setPartForm(prev => ({ ...prev, custom_award_label: e.target.value }))}
                    placeholder={t("admin.competition.fieldCustomAwardPlaceholder")}
                  />
                </Field>
              )}
              <Field label={t("admin.competition.fieldCoach")}>
                <Select value={partForm.coach_id} onChange={e => setPartForm(prev => ({ ...prev, coach_id: e.target.value }))}>
                  <option value="">{t("admin.competition.fieldCoachNone")}</option>
                  {coachesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {formEffectiveMemberId && formEffectiveCompId && (
              <CompetitionDocUploader
                memberId={formEffectiveMemberId}
                competitionId={formEffectiveCompId}
                doc={getDoc(formEffectiveMemberId, formEffectiveCompId)}
                onUploaded={doc => mergeDocs([doc])}
                onView={handleViewDoc}
              />
            )}

            <Field label={t("admin.competition.fieldAdditionalNotes")}>
              <Textarea
                rows={2}
                value={partForm.notes}
                onChange={e => setPartForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t("admin.competition.fieldAdditionalNotesPlaceholder")}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Btn variant="ghost" onClick={() => setOpenPartForm(false)}>
                Batal
              </Btn>
              {!editPart && (
                <Btn variant="outline" type="submit" name="intent" value="keepOpen" disabled={savingPart}>
                  {savingPart ? t("admin.competition.savingBtn") : t("admin.competition.saveAndAddAnotherBtn")}
                </Btn>
              )}
              <Btn variant="primary" type="submit" name="intent" value="close" disabled={savingPart}>
                {savingPart ? t("admin.competition.savingBtn") : t("admin.competition.saveResultBtn")}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Lightbox Preview */}
      {lightboxUrl && (
        <PhotoLightbox
          src={lightboxUrl}
          name={t("admin.competition.certificateProofName")}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}
