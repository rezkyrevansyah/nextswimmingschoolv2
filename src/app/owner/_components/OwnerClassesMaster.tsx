"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Placeholder from "@/components/ui/Placeholder";
import TimePicker from "@/components/ui/TimePicker";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { Database, Json } from "@/types/database";
import { fmtIDR } from "@/lib/utils";
import { coachDbToUi, memberDbToUi } from "@/lib/attendance";

export interface ScheduleSlot {
  day: string;
  time_start: string;
  time_end: string;
}

export interface ClassRow {
  id: string;
  branch_id: string;
  name: string;
  class_type: string | null;
  location_type: string | null;
  external_location_name: string | null;
  external_location_address: string | null;
  google_maps_url: string | null;
  schedule_days: string[] | null;
  schedule_times: ScheduleSlot[] | null;
  time_start: string | null;
  time_end: string | null;
  capacity: number | null;
  enrolled: number;
  price_monthly: number | null;
  price_per_session: number | null;
  goals: string | null;
  description: string | null;
  photo_url: string | null;
  status: string;
  spreadsheet_url: string | null;
  spreadsheet_filled: boolean | null;
  rapor_signer_coach_id: string | null;
  branch?: { id: string; name: string } | null;
  class_coaches?: {
    coach_id: string;
    role: string;
    profile?: { id: string; full_name: string; phone: string | null; avatar_url: string | null } | null;
  }[];
  coach_spreadsheets?: {
    coach_id: string;
    spreadsheet_url: string;
    updated_at: string;
    coach?: { full_name: string } | null;
  }[];
}

export interface CoachProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  branch_id?: string | null;
}

export interface ClassCoachDetail {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: "head" | "assistant" | string;
  is_archived?: boolean;
}

export interface ClassMemberDetail {
  id: string;
  member_no: string | null;
  status: string;
  total_sessions: number | null;
  remaining_sessions: number | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  joined_at?: string;
}

export interface CoachAttendanceDetail {
  id: string;
  session_date: string;
  clock_in_time: string | null;
  clock_in_at: string | null;
  status: string;
  distance_meters: number | null;
  is_manual: boolean | null;
  manual_note: string | null;
  profile: { full_name: string | null } | null;
}

export interface MemberAttendanceDetail {
  id: string;
  session_date: string;
  status: string;
  method: string | null;
  created_at: string;
  member: {
    id: string;
    member_no: string | null;
    profile: { full_name: string | null } | null;
  } | null;
}

const EMPTY_CLASS_FORM = {
  branch_id: "",
  name: "",
  class_type: "reguler",
  location_type: "branch",
  external_location_name: "",
  external_location_address: "",
  google_maps_url: "",
  schedule_days: [] as string[],
  schedule_times: [] as ScheduleSlot[],
  same_time_all: true,
  time_start: "",
  time_end: "",
  capacity: "15",
  price_monthly: "",
  price_per_session: "",
  goals: "",
  description: "",
  photo_url: "",
};

const DAY_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function OwnerClassesMaster({ branches }: { branches: { id: string; name: string }[] }) {
  const supabase = createClient();
  const { upload } = useUpload();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tNode, locale } = useLocale();
  const localeTag = locale === "id" ? "id-ID" : "en-US";

  const dayLabels: Record<string, string> = {
    Senin: t("admin.classes.dayMon"),
    Selasa: t("admin.classes.dayTue"),
    Rabu: t("admin.classes.dayWed"),
    Kamis: t("admin.classes.dayThu"),
    Jumat: t("admin.classes.dayFri"),
    Sabtu: t("admin.classes.daySat"),
    Minggu: t("admin.classes.daySun"),
  };

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [allCoaches, setAllCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [coachFilter, setCoachFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Create / Edit modal
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newHeadCoachId, setNewHeadCoachId] = useState("");
  const [newAssistantCoachIds, setNewAssistantCoachIds] = useState<string[]>([]);

  // Detail modal
  const [detailClass, setDetailClass] = useState<ClassRow | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "coach" | "member" | "att_coach" | "att_member">("info");
  const [detailCoaches, setDetailCoaches] = useState<ClassCoachDetail[]>([]);
  const [detailMembers, setDetailMembers] = useState<ClassMemberDetail[]>([]);
  const [detailCoachAtt, setDetailCoachAtt] = useState<CoachAttendanceDetail[]>([]);
  const [detailMemberAtt, setDetailMemberAtt] = useState<MemberAttendanceDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settingRole, setSettingRole] = useState<string | null>(null);
  const [savingSigner, setSavingSigner] = useState(false);
  const [addCoachId, setAddCoachId] = useState("");
  const [addingCoach, setAddingCoach] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("classes")
      .select(
        "id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, location_type, external_location_name, external_location_address, google_maps_url, schedule_days, time_start, time_end, schedule_times, goals, description, photo_url, spreadsheet_url, spreadsheet_filled, rapor_signer_coach_id, branch:branches(id, name), class_coaches(coach_id, role, profile:profiles(id, full_name, phone, avatar_url)), coach_spreadsheets:class_coach_spreadsheets(coach_id, spreadsheet_url, updated_at, coach:profiles(full_name))"
      )
      // Private classes are excluded — they're managed exclusively via the
      // dedicated "Member Private" menu now, which keeps the 1:1
      // class-to-student relationship intact.
      .neq("class_type", "private")
      .order("branch_id")
      .order("name");

    if (statusFilter !== "all") {
      q = q.eq("status", statusFilter);
    }
    if (branchFilter) {
      q = q.eq("branch_id", branchFilter);
    }

    const { data, error } = await q;
    if (data) setClasses(data as unknown as ClassRow[]);
    if (error) toast.error(t("owner.classes.loading"), error.message);
    setLoading(false);
  }, [supabase, statusFilter, branchFilter, toast, t]);

  useEffect(() => {
    load();
    supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, branch_id")
      .eq("role", "coach")
      .order("full_name")
      .then(({ data }) => {
        if (data) setAllCoaches(data as CoachProfile[]);
      });
  }, [load, supabase]);

  // Filtered classes by search and coach
  const filteredClasses = classes.filter((c) => {
    if (coachFilter) {
      const hasCoach = (c.class_coaches ?? []).some((cc) => cc.coach_id === coachFilter);
      if (!hasCoach) return false;
    }
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    const nameMatch = (c.name ?? "").toLowerCase().includes(s);
    const branchMatch = (c.branch?.name ?? "").toLowerCase().includes(s);
    const coachMatch = (c.class_coaches ?? []).some((cc) =>
      (cc.profile?.full_name ?? "").toLowerCase().includes(s)
    );
    return nameMatch || branchMatch || coachMatch;
  });

  // Group classes by branch
  const groupedBranches = branches
    .map((b) => ({
      branch: b,
      classes: filteredClasses.filter((c) => c.branch_id === b.id),
    }))
    .filter((g) => (branchFilter ? g.branch.id === branchFilter : g.classes.length > 0));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({
      ...EMPTY_CLASS_FORM,
      branch_id: branchFilter || branches[0]?.id || "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setNewHeadCoachId("");
    setNewAssistantCoachIds([]);
    setOpenForm(true);
  };

  const openEdit = (c: ClassRow) => {
    setEditTarget(c);
    setPhotoFile(null);
    setPhotoPreview(c.photo_url ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const slots = c.schedule_times ?? [];
    const uniqueTimes = new Set(slots.map((s) => `${s.time_start}|${s.time_end}`));
    const sameTime = slots.length === 0 || uniqueTimes.size === 1;

    setForm({
      branch_id: c.branch_id,
      name: c.name,
      class_type: c.class_type ?? "reguler",
      location_type: c.location_type ?? "branch",
      external_location_name: c.external_location_name ?? "",
      external_location_address: c.external_location_address ?? "",
      google_maps_url: c.google_maps_url ?? "",
      schedule_days: c.schedule_days ?? [],
      schedule_times:
        slots.length > 0
          ? slots
          : (c.schedule_days ?? []).map((day) => ({
              day,
              time_start: c.time_start ?? "",
              time_end: c.time_end ?? "",
            })),
      same_time_all: sameTime,
      time_start: slots[0]?.time_start ?? c.time_start ?? "",
      time_end: slots[0]?.time_end ?? c.time_end ?? "",
      capacity: c.capacity ? String(c.capacity) : "15",
      price_monthly: c.price_monthly ? String(c.price_monthly) : "",
      price_per_session: c.price_per_session ? String(c.price_per_session) : "",
      goals: c.goals ?? "",
      description: c.description ?? "",
      photo_url: c.photo_url ?? "",
    });
    setOpenForm(true);
  };

  const isPrivate = form.class_type === "private";

  const toggleDay = (d: string) =>
    setForm((f) => {
      const selected = f.schedule_days.includes(d);
      const newDays = selected ? f.schedule_days.filter((x) => x !== d) : [...f.schedule_days, d];
      const newTimes = newDays.map((day) => {
        const existing = f.schedule_times.find((s) => s.day === day);
        return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
      });
      return { ...f, schedule_days: newDays, schedule_times: newTimes };
    });

  const updateSlotTime = (day: string, field: "time_start" | "time_end", val: string) => {
    setForm((f) => ({
      ...f,
      schedule_times: f.schedule_times.map((s) => (s.day === day ? { ...s, [field]: val } : s)),
    }));
  };

  const saveClass = async () => {
    if (!form.branch_id) return toast.error(t("owner.classes.fieldBranchPlaceholder"));
    if (!form.name.trim()) return toast.error(t("owner.classes.classNameRequired"));
    if (!isPrivate && form.schedule_days.length === 0) return toast.error(t("owner.classes.scheduleDaysRequired"));
    if (isPrivate && form.location_type === "external" && !form.external_location_name.trim()) {
      return toast.error(t("owner.classes.externalLocationNameRequired"));
    }
    if (!isPrivate && (!Number(form.capacity) || Number(form.capacity) <= 0)) {
      return toast.error(t("owner.classes.capacityRequired"));
    }

    setSaving(true);
    const days = isPrivate ? (form.schedule_days.length > 0 ? form.schedule_days : []) : form.schedule_days;
    const scheduleTimes: ScheduleSlot[] = form.same_time_all
      ? days.map((day) => ({ day, time_start: form.time_start, time_end: form.time_end }))
      : form.schedule_times.filter((s) => days.includes(s.day));
    const firstSlot = scheduleTimes[0];

    const locType = isPrivate ? form.location_type : "branch";
    const extName = locType === "external" ? form.external_location_name.trim() || null : null;
    const extAddr = locType === "external" ? form.external_location_address.trim() || null : null;
    const mapsUrl = locType === "external" ? form.google_maps_url.trim() || null : null;

    if (editTarget) {
      let nextPhotoUrl = editTarget.photo_url ?? null;
      if (photoFile) {
        try {
          nextPhotoUrl = await upload.classPhoto(photoFile, editTarget.id);
        } catch (err) {
          toast.error(t("owner.classes.saveFailed"), (err as Error).message);
        }
      } else if (!photoPreview && editTarget.photo_url) {
        nextPhotoUrl = null;
        await supabase.from("classes").update({ photo_url: null }).eq("id", editTarget.id);
      }

      const updatePayload: Database["public"]["Tables"]["classes"]["Update"] = {
        branch_id: form.branch_id,
        name: form.name.trim(),
        class_type: form.class_type,
        location_type: locType,
        external_location_name: extName,
        external_location_address: extAddr,
        google_maps_url: mapsUrl,
        schedule_days: days,
        schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null,
        time_start: firstSlot?.time_start || form.time_start || undefined,
        time_end: firstSlot?.time_end || form.time_end || undefined,
        capacity: isPrivate ? 1 : Number(form.capacity) || 0,
        price_monthly: isPrivate ? 0 : Number(form.price_monthly) || 0,
        price_per_session: isPrivate ? Number(form.price_per_session) || null : null,
        goals: form.goals.trim() || null,
        description: form.description.trim() || null,
        photo_url: nextPhotoUrl,
      };

      const { error } = await supabase.from("classes").update(updatePayload).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error(t("owner.classes.saveFailed"), error.message);
      toast.success(t("owner.classes.updated"));
    } else {
      const insertPayload: Database["public"]["Tables"]["classes"]["Insert"] = {
        branch_id: form.branch_id,
        name: form.name.trim(),
        class_type: form.class_type,
        location_type: locType,
        external_location_name: extName,
        external_location_address: extAddr,
        google_maps_url: mapsUrl,
        schedule_days: days,
        schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null,
        time_start: firstSlot?.time_start || form.time_start || "",
        time_end: firstSlot?.time_end || form.time_end || "",
        capacity: isPrivate ? 1 : Number(form.capacity) || 0,
        price_monthly: isPrivate ? 0 : Number(form.price_monthly) || 0,
        price_per_session: isPrivate ? Number(form.price_per_session) || null : null,
        goals: form.goals.trim() || null,
        description: form.description.trim() || null,
        status: "active",
        enrolled: 0,
        photo_url: null,
      };

      const { data: newClass, error } = await supabase.from("classes").insert(insertPayload).select("id").single();
      if (error) {
        setSaving(false);
        return toast.error(t("owner.classes.saveFailed"), error.message);
      }

      if (photoFile && newClass?.id) {
        try {
          await upload.classPhoto(photoFile, newClass.id);
        } catch (photoErr) {
          toast.error(t("owner.classes.uploadPhotoFailed"), (photoErr as Error).message);
        }
      }

      // Initial coach assignments
      const coachRows: { class_id: string; coach_id: string; role: "head" | "assistant" }[] = [];
      if (newHeadCoachId) {
        coachRows.push({ class_id: newClass.id, coach_id: newHeadCoachId, role: "head" });
      }
      newAssistantCoachIds.forEach((id) => {
        if (id !== newHeadCoachId) {
          coachRows.push({ class_id: newClass.id, coach_id: id, role: "assistant" });
        }
      });
      if (coachRows.length > 0) {
        await supabase.from("class_coaches").insert(coachRows);
      }

      setSaving(false);
      toast.success(t("owner.classes.created"));
    }

    setOpenForm(false);
    load();
  };

  const archiveClass = async (c: ClassRow) => {
    const yes = await confirm({
      title: t("owner.classes.archiveConfirmTitle"),
      body: tNode("owner.classes.archiveConfirmBody", { name: c.name }),
    });
    if (!yes) return;
    const { error } = await supabase.from("classes").update({ status: "archived" }).eq("id", c.id);
    if (error) return toast.error(t("owner.classes.saveFailed"), error.message);
    toast.success(t("owner.classes.archived"));
    load();
  };

  const restoreClass = async (c: ClassRow) => {
    const yes = await confirm({
      title: t("owner.classes.restoreConfirmTitle"),
      body: tNode("owner.classes.restoreConfirmBody", { name: c.name }),
    });
    if (!yes) return;
    const { error } = await supabase.from("classes").update({ status: "active" }).eq("id", c.id);
    if (error) return toast.error(t("owner.classes.saveFailed"), error.message);
    toast.success(t("owner.classes.restored"));
    load();
  };

  const deleteClass = async (c: ClassRow) => {
    const yes = await confirm({
      title: t("owner.classes.deleteConfirmTitle"),
      body: tNode("owner.classes.deleteConfirmBody", { name: c.name }),
      danger: true,
    });
    if (!yes) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return toast.error(t("owner.classes.saveFailed"), error.message);
    toast.success(t("owner.classes.deleted"));
    load();
  };

  // Detail Modal Tab Loader
  const loadDetailTab = useCallback(
    async (tab: typeof detailTab, classId: string) => {
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

  const switchDetailTab = async (tab: typeof detailTab) => {
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

  return (
    <div className="space-y-4">
      {/* Notice Banner */}
      <div className="bg-ocean-50 rounded-xl p-3 sm:px-4 flex items-center gap-3 text-xs text-ocean-800 border border-ocean-200/60">
        <Icon name="info" className="w-4 h-4 text-ocean-600 shrink-0" />
        <span className="flex-1">
          Session packages are not on this screen. They belong to Admin Class. Private lessons are not here either, they live in Private Students with their own package.
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class"
              className="h-10 pl-9 pr-3 w-56 rounded-xl border border-line bg-paper text-sm text-ink placeholder:text-ink-faint focus:outline-hidden focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
              <Icon name="search" className="w-4 h-4" />
            </span>
          </div>

          {/* Center / Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter center"
            className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
          >
            <option value="">All centers</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} translate="no" className="notranslate">
                {b.name}
              </option>
            ))}
          </select>

          {/* Coach Filter */}
          <select
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            aria-label="Filter coach"
            className="h-10 px-3 rounded-xl border border-line bg-paper text-sm text-ink-soft focus:outline-hidden focus:border-ocean-500"
          >
            <option value="">All coaches</option>
            {allCoaches.map((c) => (
              <option key={c.id} value={c.id} translate="no" className="notranslate">
                {c.full_name}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="h-10 px-1 bg-paper border border-line rounded-xl flex items-center gap-1">
            {(["active", "archived", "all"] as const).map((st) => {
              const label =
                st === "active"
                  ? "Active"
                  : st === "archived"
                  ? "Archived"
                  : "All";
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-ocean-50 text-ocean-700 font-bold"
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>New class</span>
          </button>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-paper rounded-2xl border border-line overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-ink-mute text-sm">{t("owner.classes.loading")}</div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-12 text-center text-ink-mute text-sm">{t("owner.classes.empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-9 bg-paper-deep border-b border-line text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <th className="text-left py-2 px-5 font-bold">CLASS</th>
                  <th className="text-left py-2 px-3 font-bold w-[120px]">CENTER</th>
                  <th className="text-left py-2 px-3 font-bold w-[150px]">SCHEDULE</th>
                  <th className="text-left py-2 px-3 font-bold w-[140px]">COACH</th>
                  <th className="text-left py-2 px-3 font-bold w-[90px]">CAPACITY</th>
                  <th className="text-left py-2 px-3 font-bold w-[110px]">MONTHLY</th>
                  <th className="text-right py-2 pr-5 font-bold w-[100px]">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredClasses.map((c) => {
                  const coachList = c.class_coaches ?? [];
                  const headCoach = coachList.find((cc) => cc.role === "head") ?? coachList[0];
                  const otherCoachesCount = coachList.length > 1 ? coachList.length - 1 : 0;
                  const isArchived = c.status === "archived";

                  const daysStr = (c.schedule_days ?? [])
                    .map((d) => dayLabels[d] ?? d)
                    .slice(0, 2)
                    .join(", ") + ((c.schedule_days ?? []).length > 2 ? ` +${(c.schedule_days ?? []).length - 2}` : "");
                  const timeStr = c.time_start
                    ? `${c.time_start.slice(0, 5)} - ${c.time_end ? c.time_end.slice(0, 5) : ""}`
                    : "—";

                  return (
                    <tr
                      key={c.id}
                      onClick={() => openDetail(c)}
                      className={`h-14 hover:bg-paper-tint/60 cursor-pointer transition-colors ${
                        isArchived ? "opacity-75 bg-paper-tint/30" : ""
                      }`}
                    >
                      <td className="py-2 px-5">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-ink truncate leading-tight">
                            <NoTranslate>{c.name}</NoTranslate>
                          </div>
                          <div className="text-xs text-ink-mute truncate mt-0.5">
                            {isArchived ? "Archived" : c.class_type === "private" ? "Private" : "Regular"}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[13px] text-ink-soft">
                        <NoTranslate>{c.branch?.name ?? "—"}</NoTranslate>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-xs text-ink-soft leading-tight">
                          <div>{daysStr || "—"}</div>
                          <div className="font-mono text-[11px] text-ink-mute mt-0.5">{timeStr}</div>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {headCoach?.profile ? (
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-ink truncate leading-tight">
                              <NoTranslate>{headCoach.profile.full_name}</NoTranslate>
                            </div>
                            <div className="text-[11px] text-ink-mute mt-0.5">
                              {headCoach.role === "head" ? "Head coach" : "Coach"}
                              {otherCoachesCount > 0 && ` (+${otherCoachesCount})`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-mute">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-ink-soft">
                        {c.enrolled || 0}/{c.capacity || "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs font-semibold text-ink">
                        {c.price_monthly ? fmtIDR(c.price_monthly) : c.price_per_session ? `${fmtIDR(c.price_per_session)}/sesi` : "—"}
                      </td>
                      <td className="py-2 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                            title={t("owner.classes.editBtn")}
                          >
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => (isArchived ? restoreClass(c) : archiveClass(c))}
                            className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                            title={isArchived ? t("owner.classes.restoreBtn") : t("owner.classes.archiveBtn")}
                          >
                            <Icon name={isArchived ? "check" : "archive"} className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteClass(c)}
                            className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-rose-50 text-ink-mute hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            title={t("owner.classes.deleteBtn")}
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

      {/* Create / Edit Class Modal */}
      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editTarget ? tNode("owner.classes.editModalTitleFull", { name: editTarget.name }) : t("owner.classes.addModalTitle")}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenForm(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="primary" onClick={saveClass} disabled={saving}>
              {saving ? t("owner.classes.savingBtn") : t("owner.classes.saveClassBtn")}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {/* Branch / Center Selector */}
          <Field label={t("owner.classes.fieldBranch")} required>
            <Select
              value={form.branch_id}
              onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="">{t("owner.classes.fieldBranchPlaceholder")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} translate="no">
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Optional Cover Photo */}
          <Field label={t("owner.classes.fieldPhoto")} hint={t("owner.classes.photoHint")}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-line bg-paper-tint group aspect-video max-h-52 w-full flex items-center justify-center">
                <img
                  src={photoPreview}
                  alt="Class cover preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                  <Btn
                    type="button"
                    variant="primary"
                    size="sm"
                    icon="edit"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t("owner.classes.changePhotoBtn")}
                  </Btn>
                  <Btn
                    type="button"
                    variant="danger"
                    size="sm"
                    icon="trash"
                    onClick={handleRemovePhoto}
                  >
                    {t("owner.classes.removePhotoBtn")}
                  </Btn>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-line hover:border-ocean-400 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-paper-tint hover:bg-ocean-50/40 group"
              >
                <div className="w-10 h-10 rounded-xl bg-paper-deep text-ink-mute group-hover:text-ocean-600 group-hover:bg-white flex items-center justify-center mx-auto mb-2 transition-colors">
                  <Icon name="upload" className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-ink group-hover:text-ocean-700 transition-colors">
                  {t("owner.classes.uploadPhotoBtn")}
                </p>
                <p className="text-[11px] text-ink-mute mt-0.5">{t("owner.classes.photoHint")}</p>
              </div>
            )}
          </Field>

          {/* Private classes are no longer created/edited here — see the
              dedicated "Member Private" menu, which creates the member and
              its class slot together and keeps the 1:1 relationship intact.
              This screen now only ever manages regular (shared) classes. */}

          {/* Private class location settings */}
          {isPrivate && (
            <div className="space-y-3 bg-paper-tint/60 border border-line rounded-xl p-3.5">
              <Field label={t("owner.classes.fieldPrivateLocation")}>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, location_type: "branch" }))}
                    className={`flex-1 p-2.5 rounded-lg border text-left text-xs font-bold transition-colors ${
                      form.location_type === "branch" ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line bg-white text-ink-soft hover:bg-paper-tint"
                    }`}
                  >
                    {t("owner.classes.locationBranch")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, location_type: "external" }))}
                    className={`flex-1 p-2.5 rounded-lg border text-left text-xs font-bold transition-colors ${
                      form.location_type === "external" ? "border-wave-500 bg-wave-50 text-wave-700" : "border-line bg-white text-ink-soft hover:bg-paper-tint"
                    }`}
                  >
                    {t("owner.classes.locationExternal")}
                  </button>
                </div>
              </Field>

              {form.location_type === "external" && (
                <div className="space-y-3 pt-1">
                  <Field label={t("owner.classes.fieldExtName")} required>
                    <Input
                      value={form.external_location_name}
                      onChange={(e) => setForm((f) => ({ ...f, external_location_name: e.target.value }))}
                      placeholder="e.g. Oakwood Apartment Pool"
                    />
                  </Field>
                  <Field label={t("owner.classes.fieldExtAddress")}>
                    <Textarea
                      value={form.external_location_address}
                      onChange={(e) => setForm((f) => ({ ...f, external_location_address: e.target.value }))}
                      placeholder="e.g. Jl. Dr. Satrio No. 1"
                      rows={2}
                    />
                  </Field>
                  <Field label={t("owner.classes.fieldMapsUrl")}>
                    <Input
                      value={form.google_maps_url}
                      onChange={(e) => setForm((f) => ({ ...f, google_maps_url: e.target.value }))}
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Name, Capacity, Price */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("owner.classes.fieldClassName")} required className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Beginner Class A"
              />
            </Field>
            {!isPrivate ? (
              <>
                <Field label={t("owner.classes.fieldCapacity")} required>
                  <Input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                    placeholder="15"
                    min="1"
                  />
                </Field>
                <Field
                  label={t("owner.classes.fieldMonthlyPrice")}
                  required
                  hint={form.price_monthly ? fmtIDR(Number(form.price_monthly)) : undefined}
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.price_monthly ? Number(form.price_monthly).toLocaleString("id-ID") : ""}
                    onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value.replace(/\D/g, "") }))}
                    className="font-mono"
                    placeholder="500.000"
                  />
                </Field>
              </>
            ) : (
              <Field
                label={t("owner.classes.fieldSessionPrice")}
                hint={form.price_per_session ? fmtIDR(Number(form.price_per_session)) : undefined}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.price_per_session ? Number(form.price_per_session).toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm((f) => ({ ...f, price_per_session: e.target.value.replace(/\D/g, "") }))}
                  className="font-mono"
                  placeholder="150.000"
                />
              </Field>
            )}
          </div>

          {/* Schedule Days & Times */}
          <div>
            <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">
              {t("owner.classes.fieldScheduleDays")}
              {!isPrivate && <span className="text-danger-500 ml-0.5">*</span>}
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAY_OPTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    form.schedule_days.includes(d)
                      ? "bg-ocean-700 text-white border-ocean-700"
                      : "border-line text-ink-soft hover:bg-paper-tint"
                  }`}
                >
                  {(dayLabels[d] ?? d).slice(0, 3)}
                </button>
              ))}
            </div>

            {form.schedule_days.length > 0 && (
              <div className="mt-3 rounded-xl border border-line overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-paper-tint border-b border-line">
                  <span className="text-xs font-semibold text-ink-mute">{t("owner.classes.timeSettingsLabel")}</span>
                  <div className="flex rounded-lg border border-line overflow-hidden text-xs font-bold">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          same_time_all: true,
                          time_start: f.schedule_times[0]?.time_start || f.time_start,
                          time_end: f.schedule_times[0]?.time_end || f.time_end,
                          schedule_times: f.schedule_times.map((s) => ({
                            ...s,
                            time_start: f.schedule_times[0]?.time_start || f.time_start,
                            time_end: f.schedule_times[0]?.time_end || f.time_end,
                          })),
                        }))
                      }
                      className={`px-2.5 py-1 transition-colors ${
                        form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"
                      }`}
                    >
                      {t("owner.classes.sameAllDaysBtn")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          same_time_all: false,
                          schedule_times: f.schedule_days.map((day) => {
                            const existing = f.schedule_times.find((s) => s.day === day);
                            return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
                          }),
                        }))
                      }
                      className={`px-2.5 py-1 transition-colors ${
                        !form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"
                      }`}
                    >
                      {t("owner.classes.diffPerDayBtn")}
                    </button>
                  </div>
                </div>

                {form.same_time_all ? (
                  <div className="px-3 py-3 flex gap-3 items-end flex-wrap">
                    <Field label={t("owner.classes.fieldStartTime")} className="flex-1 min-w-[120px]">
                      <TimePicker
                        value={form.time_start}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            time_start: v,
                            schedule_times: f.schedule_times.map((s) => ({ ...s, time_start: v })),
                          }))
                        }
                      />
                    </Field>
                    <Field label={t("owner.classes.fieldEndTime")} className="flex-1 min-w-[120px]">
                      <TimePicker
                        value={form.time_end}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            time_end: v,
                            schedule_times: f.schedule_times.map((s) => ({ ...s, time_end: v })),
                          }))
                        }
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {DAY_OPTS.filter((d) => form.schedule_days.includes(d)).map((day) => {
                      const slot = form.schedule_times.find((s) => s.day === day) ?? {
                        day,
                        time_start: "",
                        time_end: "",
                      };
                      return (
                        <div key={day} className="px-3 py-2.5 flex items-center gap-3">
                          <span className="w-12 text-xs font-bold text-ink-soft shrink-0">
                            {(dayLabels[day] ?? day).slice(0, 3)}
                          </span>
                          <div className="flex gap-2 flex-1">
                            <TimePicker
                              value={slot.time_start}
                              className="flex-1"
                              onChange={(v) => updateSlotTime(day, "time_start", v)}
                            />
                            <span className="text-ink-faint self-center text-xs">–</span>
                            <TimePicker
                              value={slot.time_end}
                              className="flex-1"
                              onChange={(v) => updateSlotTime(day, "time_end", v)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Initial Coach Assignment for new classes */}
          {!editTarget && allCoaches.length > 0 && (
            <div className="border-t border-line pt-3 space-y-3">
              <Field label={t("owner.classes.fieldHeadCoach")}>
                <Select value={newHeadCoachId} onChange={(e) => setNewHeadCoachId(e.target.value)}>
                  <option value="">-- {t("owner.classes.fieldHeadCoach")} --</option>
                  {allCoaches.map((c) => (
                    <option key={c.id} value={c.id} translate="no">
                      {c.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("owner.classes.fieldAssistantCoaches")}>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-line rounded-xl p-2.5 bg-paper-tint">
                  {allCoaches
                    .filter((c) => c.id !== newHeadCoachId)
                    .map((c) => {
                      const isSelected = newAssistantCoachIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-paper-deep cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setNewAssistantCoachIds((prev) =>
                                isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                              );
                            }}
                            className="rounded border-line-strong text-ocean-600 focus:ring-ocean-500"
                          />
                          <span className="font-semibold text-ink"><NoTranslate>{c.full_name}</NoTranslate></span>
                        </label>
                      );
                    })}
                </div>
              </Field>
            </div>
          )}

          {/* Goals & Description */}
          <Field label={t("owner.classes.fieldGoals")} hint={t("owner.classes.fieldGoalsHint")}>
            <Textarea
              rows={2}
              value={form.goals}
              onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
              placeholder={t("owner.classes.fieldGoalsPlaceholder")}
            />
          </Field>
          <Field label={t("owner.classes.fieldDescription")}>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t("owner.classes.fieldDescriptionPlaceholder")}
            />
          </Field>
        </div>
      </Modal>

      {/* Class Detail Modal (5 Tabs) */}
      <Modal
        open={!!detailClass}
        onClose={() => setDetailClass(null)}
        title={tNode("owner.classes.detailModalTitle", { name: detailClass?.name ?? "" })}
        size="xl"
        footer={
          <Btn variant="ghost" onClick={() => setDetailClass(null)}>
            {t("owner.classes.closeBtn")}
          </Btn>
        }
      >
        {detailClass && (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-1 flex-wrap border-b border-line pb-2">
              {(["info", "coach", "member", "att_coach", "att_member"] as const).map((tab) => {
                const labels: Record<string, string> = {
                  info: t("owner.classes.tabInfo"),
                  coach: t("owner.classes.tabCoach"),
                  member: t("owner.classes.tabMember"),
                  att_coach: t("owner.classes.tabAttCoach"),
                  att_member: t("owner.classes.tabAttMember"),
                };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => switchDetailTab(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      detailTab === tab ? "bg-ocean-600 text-white shadow-sm" : "text-ink-mute hover:bg-paper-tint hover:text-ink"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* TAB: INFO */}
            {detailTab === "info" && (
              <div className="space-y-4">
                {/* Photo banner if available */}
                {detailClass.photo_url && (
                  <div className="aspect-video max-h-48 w-full rounded-2xl overflow-hidden border border-line bg-paper-deep">
                    <img
                      src={detailClass.photo_url}
                      alt={detailClass.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                      {t("owner.classes.infoBranch")}
                    </div>
                    <div className="font-semibold text-ink text-sm">
                      {(detailClass.branch as { name: string } | null | undefined)?.name ?? "—"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                      {t("owner.classes.infoStatus")}
                    </div>
                    <div>
                      <Status kind={detailClass.status === "active" ? "active" : "archived"}>
                        {detailClass.status === "active" ? t("common.status.active") : t("owner.classes.filterStatusArchived")}
                      </Status>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                      {t("owner.classes.infoSchedule")}
                    </div>
                    <div className="text-xs text-ink">
                      {(detailClass.schedule_days ?? []).map((d) => dayLabels[d] ?? d).join(", ")}{" "}
                      {detailClass.time_start && (
                        <span className="font-mono font-bold">
                          {detailClass.time_start.slice(0, 5)}
                          {detailClass.time_end ? `–${detailClass.time_end.slice(0, 5)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                      {t("owner.classes.infoCapacity")}
                    </div>
                    <div className="text-xs font-mono font-bold text-ink">
                      {detailClass.enrolled}/{detailClass.capacity} {t("owner.classes.infoCapacityParticipants")}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                      {t("owner.classes.infoMonthlyPrice")}
                    </div>
                    <div className="text-xs font-bold text-ocean-700">
                      {detailClass.price_monthly != null
                        ? fmtIDR(detailClass.price_monthly)
                        : detailClass.price_per_session != null
                        ? `${fmtIDR(detailClass.price_per_session)}/sesi`
                        : "—"}
                    </div>
                  </div>

                  {detailClass.location_type === "external" && (
                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                        {t("owner.classes.infoLocation")}
                      </div>
                      <div className="text-xs text-ink">
                        🏡 <NoTranslate>{detailClass.external_location_name || "—"}</NoTranslate> (<NoTranslate>{detailClass.external_location_address || "—"}</NoTranslate>)
                        {detailClass.google_maps_url && (
                          <a
                            href={detailClass.google_maps_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 text-ocean-600 font-semibold hover:underline"
                          >
                            Maps ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {(detailClass.coach_spreadsheets ?? []).length > 0 && (
                    <div className="space-y-2 sm:col-span-2">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
                        {t("owner.classes.infoSpreadsheetProgram")}
                      </div>
                      <div className="space-y-1.5">
                        {detailClass.coach_spreadsheets!.map((s) => (
                          <div key={s.coach_id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-line bg-paper-tint">
                            <Avatar name={s.coach?.full_name ?? "?"} size={24} />
                            <span className="flex-1 text-xs font-semibold text-ink truncate"><NoTranslate>{s.coach?.full_name ?? "—"}</NoTranslate></span>
                            <a
                              href={s.spreadsheet_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-ocean-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Icon name="link" className="w-3 h-3" />
                              {t("owner.classes.infoOpenLink")}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {detailClass.goals && (
                  <div className="border-t border-line pt-3">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
                      {t("owner.classes.goalsLabel")}
                    </div>
                    <p className="text-xs text-ink-soft leading-relaxed"><NoTranslate as="span">{detailClass.goals}</NoTranslate></p>
                  </div>
                )}

                {detailClass.description && (
                  <div className="border-t border-line pt-3">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
                      {t("owner.classes.descriptionLabel")}
                    </div>
                    <p className="text-xs text-ink-soft leading-relaxed"><NoTranslate as="span">{detailClass.description}</NoTranslate></p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: COACH */}
            {detailTab === "coach" && (
              <div className="space-y-4">
                {detailLoading ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachLoading")}</div>
                ) : (
                  <>
                    {/* Add Coach Selector */}
                    {availableCoachesForDetail.length > 0 && (
                      <div className="p-3 bg-paper-tint rounded-xl border border-line flex items-center gap-2">
                        <select
                          value={addCoachId}
                          onChange={(e) => setAddCoachId(e.target.value)}
                          className="flex-1 text-xs rounded-lg border border-line pl-3 pr-8 py-2 bg-white text-ink appearance-none cursor-pointer focus:outline-none focus:border-ocean-500"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23577496' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>")`,
                            backgroundPosition: "right 10px center",
                            backgroundSize: "12px",
                            backgroundRepeat: "no-repeat",
                          }}
                        >
                          <option value="">{t("owner.classes.selectCoachPlaceholder")}</option>
                          {availableCoachesForDetail.map((c) => (
                            <option key={c.id} value={c.id} translate="no">
                              {c.full_name}
                            </option>
                          ))}
                        </select>
                        <Btn variant="primary" size="sm" disabled={!addCoachId || addingCoach} onClick={assignCoachToClass}>
                          {t("owner.classes.addCoachBtn")}
                        </Btn>
                      </div>
                    )}

                    {detailCoaches.length === 0 ? (
                      <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachEmpty")}</div>
                    ) : (
                      <div className="divide-y divide-line border rounded-xl overflow-hidden">
                        {detailCoaches.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 bg-white hover:bg-paper-tint transition-colors">
                            <Avatar name={c.full_name} size={32} />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-ink text-xs"><NoTranslate>{c.full_name}</NoTranslate></div>
                              <div className="text-[11px] text-ink-mute">{c.phone ?? "—"}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => detailClass && setCoachRole(detailClass.id, c.id, "head")}
                                disabled={settingRole === c.id}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                  c.role === "head"
                                    ? "bg-ocean-700 text-white"
                                    : "bg-paper-deep text-ink-soft hover:bg-paper-deep/80"
                                }`}
                              >
                                {t("owner.classes.headCoachBtn")}
                              </button>
                              <button
                                type="button"
                                onClick={() => detailClass && setCoachRole(detailClass.id, c.id, "assistant")}
                                disabled={settingRole === c.id}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                  c.role === "assistant"
                                    ? "bg-ocean-700 text-white"
                                    : "bg-paper-deep text-ink-soft hover:bg-paper-deep/80"
                                }`}
                              >
                                {t("owner.classes.assistantBtn")}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCoachFromClass(c.id, c.full_name)}
                                className="p-1 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                              >
                                <Icon name="trash" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rapor Signer Coach Override */}
                    <div className="border-t border-line pt-3">
                      <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">
                        {t("owner.classes.raporSignerTitle")}
                      </div>
                      <Select
                        value={detailClass?.rapor_signer_coach_id ?? ""}
                        disabled={savingSigner}
                        onChange={(e) => detailClass && setRaporSigner(detailClass.id, e.target.value || null)}
                      >
                        <option value="">{t("owner.classes.raporSignerAuto")}</option>
                        {detailCoaches.map((c) => (
                          <option key={c.id} value={c.id} translate="no">
                            {c.full_name}
                          </option>
                        ))}
                      </Select>
                      <p className="text-[11px] text-ink-faint mt-1">{t("owner.classes.raporSignerHint")}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: MEMBER */}
            {detailTab === "member" && (
              <div>
                {detailLoading ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachLoading")}</div>
                ) : detailMembers.length === 0 ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.memberEmpty")}</div>
                ) : (
                  <div className="divide-y divide-line border rounded-xl overflow-hidden">
                    {detailMembers.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-white hover:bg-paper-tint transition-colors">
                        <Avatar name={m.full_name} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-ink text-xs"><NoTranslate>{m.full_name}</NoTranslate></div>
                          <div className="text-[11px] text-ink-mute">
                            No: {m.member_no ?? "—"} · Telp: {m.phone ?? "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <Status kind={m.status === "active" ? "active" : "suspend"}>
                            {m.status === "active" ? t("common.status.active") : m.status}
                          </Status>
                          {m.remaining_sessions != null && (
                            <div className="text-[10px] text-ink-mute font-mono mt-0.5">
                              Sisa {m.remaining_sessions}/{m.total_sessions ?? "—"} sesi
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: COACH ATTENDANCE */}
            {detailTab === "att_coach" && (
              <div>
                {detailLoading ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachLoading")}</div>
                ) : detailCoachAtt.length === 0 ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.attCoachEmpty")}</div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-paper-tint border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colDate")}</th>
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colCoach")}</th>
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colStatus")}</th>
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colNote")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-white">
                        {detailCoachAtt.map((a) => (
                          <tr key={a.id} className="hover:bg-paper-tint/50">
                            <td className="py-2 px-3 font-mono font-semibold text-ink">
                              {a.session_date} {a.clock_in_time && <span className="text-ink-mute">({a.clock_in_time})</span>}
                            </td>
                            <td className="py-2 px-3 font-bold text-ink"><NoTranslate>{a.profile?.full_name ?? "—"}</NoTranslate></td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  coachDbToUi(a.status) === "present"
                                    ? "bg-ok-50 text-ok-700"
                                    : coachDbToUi(a.status) === "absent"
                                    ? "bg-danger-50 text-danger-700"
                                    : "bg-warn-50 text-warn-700"
                                }`}
                              >
                                {t(`owner.classes.attStatus.${coachDbToUi(a.status)}`) || a.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-ink-mute">
                              {a.is_manual ? (
                                <>
                                  Manual: <NoTranslate>{a.manual_note || "—"}</NoTranslate>
                                </>
                              ) : a.distance_meters ? (
                                `${a.distance_meters}m`
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: MEMBER ATTENDANCE */}
            {detailTab === "att_member" && (
              <div>
                {detailLoading ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.coachLoading")}</div>
                ) : detailMemberAtt.length === 0 ? (
                  <div className="text-center py-8 text-ink-mute text-sm">{t("owner.classes.attMemberEmpty")}</div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-paper-tint border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colDate")}</th>
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colMember")}</th>
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colStatus")}</th>
                          <th className="text-left py-2.5 px-3 font-bold">{t("owner.classes.colMethod")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-white">
                        {detailMemberAtt.map((a) => (
                          <tr key={a.id} className="hover:bg-paper-tint/50">
                            <td className="py-2 px-3 font-mono font-semibold text-ink">{a.session_date}</td>
                            <td className="py-2 px-3 font-bold text-ink">
                              <NoTranslate>{a.member?.profile?.full_name ?? a.member?.member_no ?? "—"}</NoTranslate>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  memberDbToUi(a.status) === "present"
                                    ? "bg-ok-50 text-ok-700"
                                    : memberDbToUi(a.status) === "absent"
                                    ? "bg-danger-50 text-danger-700"
                                    : "bg-warn-50 text-warn-700"
                                }`}
                              >
                                {t(`owner.classes.attStatus.${memberDbToUi(a.status)}`) || a.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-ink-mute uppercase font-mono text-[10px]">
                              {a.method ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
