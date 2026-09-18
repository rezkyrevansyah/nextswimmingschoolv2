"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type {
  ClassRow, CoachProfile, ClassCoachDetail, ClassStudentDetail, CoachAttendanceDetail, StudentAttendanceDetail, DetailTab,
} from "./_types";

export function useClassDetailData({
  allCoaches, load, setClasses,
}: {
  allCoaches: CoachProfile[];
  load: () => void;
  setClasses: (updater: (prev: ClassRow[]) => ClassRow[]) => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [detailClass, setDetailClass] = useState<ClassRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [detailCoaches, setDetailCoaches] = useState<ClassCoachDetail[]>([]);
  const [detailStudents, setDetailStudents] = useState<ClassStudentDetail[]>([]);
  const [detailCoachAtt, setDetailCoachAtt] = useState<CoachAttendanceDetail[]>([]);
  const [detailStudentAtt, setDetailStudentAtt] = useState<StudentAttendanceDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settingRole, setSettingRole] = useState<string | null>(null);
  const [savingSigner, setSavingSigner] = useState(false);
  const [addCoachId, setAddCoachId] = useState("");
  const [addingCoach, setAddingCoach] = useState(false);

  // Detail Modal Tab Loader
  const loadDetailTab = useCallback(
    async (tab: DetailTab, classId: string) => {
      setDetailLoading(true);
      if (tab === "coach") {
        const { data, error } = await supabase
          .from("class_coaches")
          .select("role, is_primary, profile:profiles!class_coaches_coach_id_fkey(id, full_name, phone, avatar_url, is_archived)")
          .eq("class_id", classId);
        if (data) {
          const list = (
            data as unknown as {
              role: string;
              profile: { id: string; full_name: string; phone: string | null; avatar_url: string | null; is_archived?: boolean } | null;
            }[]
          )
            .filter((r) => !!r.profile)
            .map((r) => ({
              ...r.profile!,
              role: r.role,
            }));
          setDetailCoaches(list);
        }
        if (error) toast.error("Error loading coaches", error.message);
      } else if (tab === "student") {
        const { data, error } = await supabase
          .from("student_classes")
          .select(
            "joined_at, student:students!student_classes_student_id_fkey(id, student_no, status, total_sessions, remaining_sessions, profile:profiles!students_profile_id_fkey(id, full_name, phone, avatar_url, is_archived))"
          )
          .eq("class_id", classId);
        if (data) {
          const list = (
            data as unknown as {
              joined_at?: string;
              student: {
                id: string;
                student_no: string | null;
                status: string;
                total_sessions: number | null;
                remaining_sessions: number | null;
                profile: { id: string; full_name: string; phone: string | null; avatar_url: string | null; is_archived?: boolean } | null;
              } | null;
            }[]
          )
            .filter((r) => !!r.student && !!r.student.profile)
            .map((r) => ({
              id: r.student!.id,
              student_no: r.student!.student_no,
              status: r.student!.status,
              total_sessions: r.student!.total_sessions,
              remaining_sessions: r.student!.remaining_sessions,
              full_name: r.student!.profile?.full_name ?? "—",
              phone: r.student!.profile?.phone ?? null,
              avatar_url: r.student!.profile?.avatar_url ?? null,
              joined_at: r.joined_at,
            }));
          setDetailStudents(list);
        }
        if (error) toast.error("Error loading students", error.message);
      } else if (tab === "att_coach") {
        const { data, error } = await supabase
          .from("coach_attendances")
          .select(
            "id, session_date, clock_in_time, clock_in_at, status, distance_meters, is_manual, manual_note, profile:profiles!coach_attendances_coach_id_fkey(full_name)"
          )
          .eq("class_id", classId)
          .order("session_date", { ascending: false })
          .limit(100);
        if (data) setDetailCoachAtt(data as unknown as CoachAttendanceDetail[]);
        if (error) toast.error("Error loading coach attendances", error.message);
      } else if (tab === "att_student") {
        const { data, error } = await supabase
          .from("student_attendances")
          .select(
            "id, session_date, status, method, created_at, student:students!student_attendances_student_id_fkey(id, student_no, profile:profiles!students_profile_id_fkey(full_name))"
          )
          .eq("class_id", classId)
          .order("session_date", { ascending: false })
          .limit(100);
        if (data) setDetailStudentAtt(data as unknown as StudentAttendanceDetail[]);
        if (error) toast.error("Error loading student attendances", error.message);
      }
      setDetailLoading(false);
    },
    [supabase, toast]
  );

  const openDetail = (c: ClassRow) => {
    setDetailClass(c);
    setDetailTab("info");
    setDetailCoaches([]);
    setDetailStudents([]);
    setDetailCoachAtt([]);
    setDetailStudentAtt([]);
    setAddCoachId("");
  };

  const switchDetailTab = async (tab: DetailTab) => {
    setDetailTab(tab);
    if (!detailClass || tab === "info") return;
    loadDetailTab(tab, detailClass.id);
  };

  const setCoachRole = async (classId: string, coachId: string, role: "head" | "assistant") => {
    setSettingRole(coachId);
    if (role === "head") {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", classId).eq("role", "head");
    }
    const { error } = await supabase.from("class_coaches").update({ role }).eq("class_id", classId).eq("coach_id", coachId);
    setSettingRole(null);
    if (error) return toast.error("Failed to change role", error.message);
    toast.success(role === "head" ? "Set as Head Coach" : "Set as Assistant Coach");
    setDetailCoaches((prev) =>
      prev.map((c) =>
        c.id === coachId ? { ...c, role } : role === "head" ? { ...c, role: c.role === "head" ? "assistant" : c.role } : c
      )
    );
    load();
  };

  const assignCoachToClass = async () => {
    if (!detailClass || !addCoachId) return;
    setAddingCoach(true);
    const { error } = await supabase.from("class_coaches").insert({
      class_id: detailClass.id,
      coach_id: addCoachId,
      role: "assistant",
    });
    setAddingCoach(false);
    if (error) {
      toast.error("Failed to change role", error.message);
    } else {
      toast.success("Coach assigned successfully");
      setAddCoachId("");
      loadDetailTab("coach", detailClass.id);
      load();
    }
  };

  const removeCoachFromClass = async (coachId: string, coachName: string) => {
    if (!detailClass) return;
    const ok = await confirm({
      title: "Remove Coach from Class",
      body: (<>{"Remove coach \""}<NoTranslate>{coachName}</NoTranslate>{"\" from this class?"}</>),
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("class_coaches").delete().eq("class_id", detailClass.id).eq("coach_id", coachId);
    if (error) {
      toast.error("Failed to change role", error.message);
    } else {
      toast.success("Coach removed from class");
      loadDetailTab("coach", detailClass.id);
      load();
    }
  };

  const setRaporSigner = async (classId: string, coachId: string | null) => {
    setSavingSigner(true);
    const { error } = await supabase.from("classes").update({ rapor_signer_coach_id: coachId }).eq("id", classId);
    setSavingSigner(false);
    if (error) return toast.error("Failed to save class", error.message);
    toast.success("Report signature coach saved");
    setDetailClass((prev) => (prev && prev.id === classId ? { ...prev, rapor_signer_coach_id: coachId } : prev));
    setClasses((prev) => (prev.map((c) => (c.id === classId ? { ...c, rapor_signer_coach_id: coachId } : c))));
  };

  const availableCoachesForDetail = allCoaches.filter(
    (c) => !detailCoaches.some((dc) => dc.id === c.id)
  );

  return {
    detailClass, setDetailClass, detailTab, detailCoaches, detailStudents, detailCoachAtt, detailStudentAtt,
    detailLoading, settingRole, savingSigner, addCoachId, setAddCoachId, addingCoach,
    openDetail, switchDetailTab, setCoachRole, assignCoachToClass, removeCoachFromClass, setRaporSigner,
    availableCoachesForDetail,
  };
}
