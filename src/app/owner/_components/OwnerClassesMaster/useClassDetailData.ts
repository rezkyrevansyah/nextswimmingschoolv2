"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type {
  ClassRow, CoachProfile, ClassCoachDetail, ClassMemberDetail, CoachAttendanceDetail, MemberAttendanceDetail, DetailTab,
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
  const { t, tNode } = useLocale();

  const [detailClass, setDetailClass] = useState<ClassRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [detailCoaches, setDetailCoaches] = useState<ClassCoachDetail[]>([]);
  const [detailMembers, setDetailMembers] = useState<ClassMemberDetail[]>([]);
  const [detailCoachAtt, setDetailCoachAtt] = useState<CoachAttendanceDetail[]>([]);
  const [detailMemberAtt, setDetailMemberAtt] = useState<MemberAttendanceDetail[]>([]);
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
        if (error) toast.error(t("owner.classes.loadingCoachesFailed"), error.message);
      } else if (tab === "member") {
        const { data, error } = await supabase
          .from("member_classes")
          .select(
            "joined_at, member:members!member_classes_member_id_fkey(id, member_no, status, total_sessions, remaining_sessions, profile:profiles!members_profile_id_fkey(id, full_name, phone, avatar_url, is_archived))"
          )
          .eq("class_id", classId);
        if (data) {
          const list = (
            data as unknown as {
              joined_at?: string;
              member: {
                id: string;
                member_no: string | null;
                status: string;
                total_sessions: number | null;
                remaining_sessions: number | null;
                profile: { id: string; full_name: string; phone: string | null; avatar_url: string | null; is_archived?: boolean } | null;
              } | null;
            }[]
          )
            .filter((r) => !!r.member && !!r.member.profile)
            .map((r) => ({
              id: r.member!.id,
              member_no: r.member!.member_no,
              status: r.member!.status,
              total_sessions: r.member!.total_sessions,
              remaining_sessions: r.member!.remaining_sessions,
              full_name: r.member!.profile?.full_name ?? "—",
              phone: r.member!.profile?.phone ?? null,
              avatar_url: r.member!.profile?.avatar_url ?? null,
              joined_at: r.joined_at,
            }));
          setDetailMembers(list);
        }
        if (error) toast.error(t("owner.classes.loadingMembersFailed"), error.message);
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
        if (error) toast.error(t("owner.classes.loadingCoachAttendanceFailed"), error.message);
      } else if (tab === "att_member") {
        const { data, error } = await supabase
          .from("member_attendances")
          .select(
            "id, session_date, status, method, created_at, member:members!member_attendances_member_id_fkey(id, member_no, profile:profiles!members_profile_id_fkey(full_name))"
          )
          .eq("class_id", classId)
          .order("session_date", { ascending: false })
          .limit(100);
        if (data) setDetailMemberAtt(data as unknown as MemberAttendanceDetail[]);
        if (error) toast.error(t("owner.classes.loadingMemberAttendanceFailed"), error.message);
      }
      setDetailLoading(false);
    },
    [supabase, toast, t]
  );

  const openDetail = (c: ClassRow) => {
    setDetailClass(c);
    setDetailTab("info");
    setDetailCoaches([]);
    setDetailMembers([]);
    setDetailCoachAtt([]);
    setDetailMemberAtt([]);
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
    if (error) return toast.error(t("owner.classes.roleChangeFailed"), error.message);
    toast.success(role === "head" ? t("owner.classes.setAsHeadCoach") : t("owner.classes.setAsAssistantCoach"));
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
      toast.error(t("owner.classes.roleChangeFailed"), error.message);
    } else {
      toast.success(t("owner.classes.coachAssigned"));
      setAddCoachId("");
      loadDetailTab("coach", detailClass.id);
      load();
    }
  };

  const removeCoachFromClass = async (coachId: string, coachName: string) => {
    if (!detailClass) return;
    const ok = await confirm({
      title: t("owner.classes.removeCoachTitle"),
      body: tNode("owner.classes.removeCoachConfirm", { name: coachName }),
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("class_coaches").delete().eq("class_id", detailClass.id).eq("coach_id", coachId);
    if (error) {
      toast.error(t("owner.classes.roleChangeFailed"), error.message);
    } else {
      toast.success(t("owner.classes.coachRemoved"));
      loadDetailTab("coach", detailClass.id);
      load();
    }
  };

  const setRaporSigner = async (classId: string, coachId: string | null) => {
    setSavingSigner(true);
    const { error } = await supabase.from("classes").update({ rapor_signer_coach_id: coachId }).eq("id", classId);
    setSavingSigner(false);
    if (error) return toast.error(t("owner.classes.saveFailed"), error.message);
    toast.success(t("owner.classes.signerSaved"));
    setDetailClass((prev) => (prev && prev.id === classId ? { ...prev, rapor_signer_coach_id: coachId } : prev));
    setClasses((prev) => (prev.map((c) => (c.id === classId ? { ...c, rapor_signer_coach_id: coachId } : c))));
  };

  const availableCoachesForDetail = allCoaches.filter(
    (c) => !detailCoaches.some((dc) => dc.id === c.id)
  );

  return {
    detailClass, setDetailClass, detailTab, detailCoaches, detailMembers, detailCoachAtt, detailMemberAtt,
    detailLoading, settingRole, savingSigner, addCoachId, setAddCoachId, addingCoach,
    openDetail, switchDetailTab, setCoachRole, assignCoachToClass, removeCoachFromClass, setRaporSigner,
    availableCoachesForDetail,
  };
}
