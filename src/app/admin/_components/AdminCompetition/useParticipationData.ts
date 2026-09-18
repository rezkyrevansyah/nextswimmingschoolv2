"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { parseSwimTime } from "@/lib/utils";
import type { ParticipationRow, CompetitionDocumentRow, StudentOption } from "./_types";

export function useParticipationData({
  branchId, studentsList, selectedComp, loadCompetitions,
}: {
  branchId: string;
  studentsList: StudentOption[];
  selectedComp: { id: string } | null;
  loadCompetitions: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [participations, setParticipations] = useState<ParticipationRow[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // Add/Edit Participant Modal State
  const [openPartForm, setOpenPartForm] = useState(false);
  const [editPart, setEditPart] = useState<ParticipationRow | null>(null);
  const [partForm, setPartForm] = useState({
    student_id: "",
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

  // Competition documents — one certificate/photo per (student, competition), covers every
  // category that student won at that event. Keyed by `${competition_id}_${student_id}`.
  const [competitionDocs, setCompetitionDocs] = useState<Record<string, CompetitionDocumentRow>>({});
  const docKey = (competitionId: string, studentId: string) => `${competitionId}_${studentId}`;
  const getDoc = useCallback(
    (studentId: string | null | undefined, competitionId: string | null | undefined) =>
      studentId && competitionId ? competitionDocs[docKey(competitionId, studentId)] : undefined,
    [competitionDocs]
  );
  const mergeDocs = useCallback((rows: CompetitionDocumentRow[]) => {
    setCompetitionDocs(prev => {
      const next = { ...prev };
      rows.forEach(d => { next[docKey(d.competition_id, d.student_id)] = d; });
      return next;
    });
  }, []);

  const [studentSearch, setStudentSearch] = useState("");

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

  const [awardStudentId, setAwardStudentId] = useState("");
  const [awardStudentSearch, setAwardStudentSearch] = useState("");
  const [studentParticipations, setStudentParticipations] = useState<ParticipationRow[]>([]);
  const [studentParticipationsLoading, setStudentParticipationsLoading] = useState(false);

  // Participant picker (Awards tab) — search + filter + pagination over studentsList
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTypeFilter, setPickerTypeFilter] = useState<"all" | "reguler" | "private" | "school_affiliate">("all");
  const [pickerBranchFilter, setPickerBranchFilter] = useState("all");
  const [pickerPage, setPickerPage] = useState(0);
  const PICKER_PAGE_SIZE = 10;

  // ── Load Student Participations (for awards tab) ───────────────────────────
  const loadStudentParticipations = useCallback(async (studentId: string) => {
    if (!studentId) { setStudentParticipations([]); return; }
    setStudentParticipationsLoading(true);
    const { data, error } = await supabase
      .from("competition_participations")
      .select(`
        id, competition_id, student_id, branch_id, coach_id, category, stroke, distance_meters, age_group,
        time_seconds, time_formatted, rank, result_status, award, custom_award_label, notes, created_at,
        competition:competitions(id, name, start_date, level),
        student:students(id, profile:profiles(full_name, avatar_url)),
        branch:branches(name),
        coach:profiles!competition_participations_coach_id_fkey(full_name)
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setStudentParticipationsLoading(false);
    if (error) { toast.error(`Failed to load awards: ${error.message}`); return; }
    setStudentParticipations((data as unknown as ParticipationRow[]) ?? []);

    const { data: docs } = await supabase
      .from("competition_documents")
      .select("id, competition_id, student_id, document_url, content_type")
      .eq("student_id", studentId);
    if (docs) mergeDocs(docs as CompetitionDocumentRow[]);
  }, [supabase, toast, mergeDocs]);

  useEffect(() => {
    loadStudentParticipations(awardStudentId);
  }, [awardStudentId, loadStudentParticipations]);

  // ── Load Competition Details ──────────────────────────────────────────────
  const loadParticipations = useCallback(async (compId: string) => {
    setLoadingParts(true);
    const { data, error } = await supabase
      .from("competition_participations")
      .select(`
        id, competition_id, student_id, branch_id, coach_id, category, stroke, distance_meters, age_group,
        time_seconds, time_formatted, rank, result_status, award, custom_award_label, notes, created_at,
        student:students(id, profile:profiles(full_name, avatar_url)),
        branch:branches(name),
        coach:profiles!competition_participations_coach_id_fkey(full_name)
      `)
      .eq("competition_id", compId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load participants: ${error.message}`);
    } else {
      setParticipations((data as unknown as ParticipationRow[]) ?? []);
    }

    const { data: docs } = await supabase
      .from("competition_documents")
      .select("id, competition_id, student_id, document_url, content_type")
      .eq("competition_id", compId);
    if (docs) mergeDocs(docs as CompetitionDocumentRow[]);

    setLoadingParts(false);
  }, [supabase, toast, mergeDocs]);

  // ── Participation Handlers ────────────────────────────────────────────────
  const openAddParticipant = (prefilledStudentId?: string) => {
    setEditPart(null);
    setPartForm({
      student_id: prefilledStudentId ?? "",
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
      student_id: p.student_id,
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
  // stays null, so handleSaveParticipant inserts rather than updates) — for a student who wins
  // several similar categories at once, this is faster than a blank form each time. The
  // certificate/document itself is unaffected either way: it's scoped to (student, competition),
  // not to this individual achievement row, so it stays exactly as already uploaded.
  const openDuplicateParticipant = (p: ParticipationRow) => {
    setEditPart(null);
    setPartForm({
      student_id: p.student_id,
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
      toast.error("Please select a competition first.");
      return;
    }
    if (!partForm.student_id || !partForm.category.trim()) {
      toast.error("Student and event category are required.");
      return;
    }

    setSavingPart(true);
    const parsedTime = parseSwimTime(partForm.time_raw);

    if (editPart) {
      const { error } = await supabase
        .from("competition_participations")
        .update({
          student_id: partForm.student_id,
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
        toast.error(`Failed to update participant result: ${error.message}`);
        setSavingPart(false);
        return;
      }

      toast.success("Participant result updated successfully.");
      setOpenPartForm(false);
      if (selectedComp) loadParticipations(selectedComp.id);
      if (awardStudentId) loadStudentParticipations(awardStudentId);
      loadCompetitions();
    } else {
      const selectedStudent = studentsList.find(m => m.id === partForm.student_id);
      const targetBranchId = branchId || selectedStudent?.branch_id || "";

      const { error } = await supabase
        .from("competition_participations")
        .insert({
          competition_id: effectiveCompId,
          student_id: partForm.student_id,
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
        toast.error(`Failed to add participant: ${error.message}`);
        setSavingPart(false);
        return;
      }

      toast.success("Competition participant added successfully.");
      if (keepOpenForNext) {
        // Student, lomba, coach, and age group stay locked — only the per-category fields reset —
        // so entering the next category win for the same student+lomba needs no re-navigation.
        setPartForm(prev => ({
          student_id: prev.student_id,
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
      if (awardStudentId) loadStudentParticipations(awardStudentId);
      loadCompetitions();
    }
    setSavingPart(false);
  };

  const handleRemoveParticipant = async (p: ParticipationRow) => {
    const ok = await confirm({
      title: "Remove Participant from Competition?",
      body: `${`Remove participation of ${(p.student?.profile as any)?.full_name ?? "Student"} in event ${p.category}?`} ${"(The student's account will NOT be deleted)"}`,
      confirmLabel: "Remove Participant",
      danger: true,
    });

    if (!ok) return;

    const { error } = await supabase.from("competition_participations").delete().eq("id", p.id);
    if (error) {
      toast.error(`Failed to remove participant: ${error.message}`);
    } else {
      toast.success("Participant removed from competition successfully.");
      if (selectedComp) loadParticipations(selectedComp.id);
      if (awardStudentId) loadStudentParticipations(awardStudentId);
      loadCompetitions();
    }
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsList.slice(0, 30);
    return studentsList.filter(m =>
      m.full_name.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 30);
  }, [studentsList, studentSearch]);

  // Participant picker (Awards tab) — branches present in studentsList, for the branch filter (owner/unscoped view only)
  const pickerBranchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    studentsList.forEach(m => { if (m.branch_id && m.branch_name) seen.set(m.branch_id, m.branch_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsList]);

  const pickerFilteredStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return studentsList.filter(m => {
      const matchSearch = !q || m.full_name.toLowerCase().includes(q) || (m.student_no ?? "").toLowerCase().includes(q);
      const matchType = pickerTypeFilter === "all" || m.type === pickerTypeFilter;
      const matchBranch = pickerBranchFilter === "all" || m.branch_id === pickerBranchFilter;
      return matchSearch && matchType && matchBranch;
    });
  }, [studentsList, pickerSearch, pickerTypeFilter, pickerBranchFilter]);

  const pickerTotalPages = Math.max(1, Math.ceil(pickerFilteredStudents.length / PICKER_PAGE_SIZE));
  const pickerSafePage = Math.min(pickerPage, pickerTotalPages - 1);
  const pickerPaginatedStudents = pickerFilteredStudents.slice(pickerSafePage * PICKER_PAGE_SIZE, (pickerSafePage + 1) * PICKER_PAGE_SIZE);

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when picker filters change */
  useEffect(() => { setPickerPage(0); }, [pickerSearch, pickerTypeFilter, pickerBranchFilter]);

  // The (student, competition) pair the achievement form's certificate uploader is scoped to —
  // resolved the same way handleSaveParticipant resolves the competition to save against.
  const formEffectiveStudentId = editPart?.student_id || partForm.student_id;
  const formEffectiveCompId = selectedComp?.id || partForm.competition_id;

  return {
    participations, loadingParts, loadParticipations,
    openPartForm, setOpenPartForm, editPart, partForm, setPartForm, savingPart,
    getDoc, mergeDocs, handleViewDoc, lightboxUrl, setLightboxUrl,
    studentSearch, setStudentSearch, filteredStudents,
    awardStudentId, setAwardStudentId, awardStudentSearch, setAwardStudentSearch,
    studentParticipations, setStudentParticipations, studentParticipationsLoading, loadStudentParticipations,
    pickerSearch, setPickerSearch, pickerTypeFilter, setPickerTypeFilter, pickerBranchFilter, setPickerBranchFilter,
    pickerPage, setPickerPage, pickerBranchOptions, pickerFilteredStudents, pickerTotalPages, pickerSafePage, pickerPaginatedStudents,
    openAddParticipant, openEditParticipant, openDuplicateParticipant, handleSaveParticipant, handleRemoveParticipant,
    formEffectiveStudentId, formEffectiveCompId,
  };
}
