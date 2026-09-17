"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ScheduleSlot, ClassRow, CoachProfile, ClassPackage, MemberAttendanceRow } from "../../_types";
import type { Database, Json } from "@/types/database";
import { isMemberPresentLike } from "@/lib/attendance";
import { EMPTY_CLASS_FORM } from "./_utils";

export function useClassData(branchId: string) {
  const supabase = createClient();
  const { upload } = useUpload();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, locale } = useLocale();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const dayLabels: Record<string, string> = {
    Senin: t("admin.classes.dayMon"), Selasa: t("admin.classes.dayTue"), Rabu: t("admin.classes.dayWed"),
    Kamis: t("admin.classes.dayThu"), Jumat: t("admin.classes.dayFri"), Sabtu: t("admin.classes.daySat"), Minggu: t("admin.classes.daySun"),
  };
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit class modal
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(EMPTY_CLASS_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Per-class attendance modal
  const [attClass, setAttClass] = useState<ClassRow | null>(null);
  const [attSessions, setAttSessions] = useState<{ date: string; rows: MemberAttendanceRow[] }[]>([]);
  const [loadingAtt2, setLoadingAtt2] = useState(false);
  const [attExpanded, setAttExpanded] = useState<Set<string>>(new Set());

  // Package management modal
  const [packageClass, setPackageClass] = useState<ClassRow | null>(null);
  const [packages, setPackages] = useState<ClassPackage[]>([]);
  const [pkgForm, setPkgForm] = useState({ name: "", sessions: "", price: "" });
  const [savingPkg, setSavingPkg] = useState(false);

  const load = useCallback(async () => {
    // Private classes are excluded — they're managed exclusively via the
    // dedicated "Member Private" menu now (AdminMemberPrivate.tsx), which
    // keeps the 1:1 class-to-student relationship intact.
    const { data } = await supabase.from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, location_type, external_location_name, external_location_address, google_maps_url, schedule_days, time_start, time_end, schedule_times, goals, description, photo_url, spreadsheet_url, spreadsheet_filled, class_coaches(coach_id, role, profile:profiles(full_name, id)), coach_spreadsheets:class_coach_spreadsheets(coach_id, spreadsheet_url, updated_at, coach:profiles(full_name)), packages:class_packages(id, name, sessions, price, sort_order, active)")
      .eq("branch_id", branchId).neq("class_type", "private").order("name");
    if (data) setClasses(data as unknown as ClassRow[]);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("profiles").select("id, full_name").eq("branch_id", branchId).eq("role", "coach").order("full_name")
      .then(({ data }) => { if (data) setCoaches(data as unknown as CoachProfile[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Coach assign/role controls in class edit modal
  const [addCoachId, setAddCoachId] = useState("");
  const [coachMutating, setCoachMutating] = useState(false);
  const [newHeadCoachId, setNewHeadCoachId] = useState("");
  const [newAssistantCoachIds, setNewAssistantCoachIds] = useState<string[]>([]);

  const patchClassCoaches = (classId: string, next: NonNullable<ClassRow["class_coaches"]>) => {
    setEditTarget(prev => prev && prev.id === classId ? { ...prev, class_coaches: next } : prev);
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, class_coaches: next } : c));
  };

  const addClassCoach = async (classId: string, coachId: string) => {
    if (!coachId) return;
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").insert({ class_id: classId, coach_id: coachId, role: "assistant" });
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.addCoachFailed"), error.message);
    const coach = coaches.find(c => c.id === coachId);
    const current = editTarget?.class_coaches ?? [];
    patchClassCoaches(classId, [...current, { coach_id: coachId, role: "assistant", profile: coach ? { id: coach.id, full_name: coach.full_name } : null }]);
    setAddCoachId("");
    toast.success(t("admin.classes.coachAddedToast"));
  };

  const removeClassCoach = async (classId: string, coachId: string) => {
    const ok = await confirm({ title: t("admin.classes.removeCoachConfirmTitle"), body: t("admin.classes.removeCoachConfirmBody"), danger: true });
    if (!ok) return;
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").delete().eq("class_id", classId).eq("coach_id", coachId);
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.removeCoachFailed"), error.message);
    const current = editTarget?.class_coaches ?? [];
    patchClassCoaches(classId, current.filter(cc => cc.coach_id !== coachId));
    toast.success(t("admin.classes.coachRemovedToast"));
  };

  const setClassCoachRole = async (classId: string, coachId: string, role: "head" | "assistant") => {
    setCoachMutating(true);
    // Promote the target to head FIRST, then demote everyone else — if the
    // second call fails partway through, the class still has a head coach
    // (possibly two, briefly) instead of ending up with zero.
    const { error } = await supabase.from("class_coaches").update({ role }).eq("class_id", classId).eq("coach_id", coachId);
    if (role === "head" && !error) {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", classId).neq("coach_id", coachId);
    }
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.changeRoleFailed"), error.message);
    const current = editTarget?.class_coaches ?? [];
    patchClassCoaches(classId, current.map(cc => role === "head"
      ? { ...cc, role: cc.coach_id === coachId ? "head" : "assistant" }
      : (cc.coach_id === coachId ? { ...cc, role: "assistant" } : cc)));
  };

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
    setForm(EMPTY_CLASS_FORM);
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
    // Detect if all slots share the same time (or no per-day slots set)
    const uniqueTimes = new Set(slots.map(s => `${s.time_start}|${s.time_end}`));
    const sameTime = slots.length === 0 || uniqueTimes.size === 1;
    setForm({
      name: c.name, class_type: c.class_type ?? "reguler",
      location_type: c.location_type ?? "branch",
      external_location_name: c.external_location_name ?? "",
      external_location_address: c.external_location_address ?? "",
      google_maps_url: c.google_maps_url ?? "",
      schedule_days: c.schedule_days ?? [],
      schedule_times: slots.length > 0 ? slots : (c.schedule_days ?? []).map(day => ({ day, time_start: c.time_start ?? "", time_end: c.time_end ?? "" })),
      same_time_all: sameTime,
      time_start: slots[0]?.time_start ?? c.time_start ?? "",
      time_end:   slots[0]?.time_end   ?? c.time_end   ?? "",
      capacity: c.capacity ? String(c.capacity) : "",
      price_monthly: c.price_monthly ? String(c.price_monthly) : "",
      price_per_session: c.price_per_session ? String(c.price_per_session) : "",
      goals: c.goals ?? "", description: c.description ?? "",
      photo_url: c.photo_url ?? "",
    });
    setOpenForm(true);
  };

  const isPrivate = form.class_type === "private";

  const saveClass = async () => {
    if (!form.name) return toast.error(t("admin.classes.classNameRequired"));
    if (!isPrivate && form.schedule_days.length === 0) return toast.error(t("admin.classes.scheduleDaysRequired"));
    if (isPrivate && form.location_type === "external" && !form.external_location_name.trim()) {
      return toast.error(t("admin.classes.externalLocationNameRequired"));
    }
    if (!isPrivate && (!Number(form.capacity) || Number(form.capacity) <= 0)) {
      return toast.error(t("admin.classes.capacityRequired"));
    }
    setSaving(true);
    // Build schedule_times — use per-day slots; derive global time_start/time_end from first slot
    const days = isPrivate ? (form.schedule_days.length > 0 ? form.schedule_days : []) : form.schedule_days;
    const scheduleTimes: ScheduleSlot[] = form.same_time_all
      ? days.map(day => ({ day, time_start: form.time_start, time_end: form.time_end }))
      : form.schedule_times.filter(s => days.includes(s.day));
    const firstSlot = scheduleTimes[0];

    const locType = isPrivate ? form.location_type : "branch";
    const extName = locType === "external" ? (form.external_location_name.trim() || null) : null;
    const extAddr = locType === "external" ? (form.external_location_address.trim() || null) : null;
    const mapsUrl = locType === "external" ? (form.google_maps_url.trim() || null) : null;

    if (editTarget) {
      let nextPhotoUrl = editTarget.photo_url ?? null;
      if (photoFile) {
        try {
          nextPhotoUrl = await upload.classPhoto(photoFile, editTarget.id);
        } catch (err) {
          toast.error(t("admin.classes.updateClassFailed"), (err as Error).message);
        }
      } else if (!photoPreview && editTarget.photo_url) {
        nextPhotoUrl = null;
        await supabase.from("classes").update({ photo_url: null }).eq("id", editTarget.id);
      }

      const updatePayload: Database["public"]["Tables"]["classes"]["Update"] = {
        name: form.name, class_type: form.class_type,
        location_type: locType, external_location_name: extName, external_location_address: extAddr, google_maps_url: mapsUrl,
        schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null,
        time_start: firstSlot?.time_start || form.time_start || undefined, time_end: firstSlot?.time_end || form.time_end || undefined,
        capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0),
        price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null,
        goals: form.goals.trim() || null, description: form.description.trim() || null,
        photo_url: nextPhotoUrl,
      };
      const { error } = await supabase.from("classes").update(updatePayload).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error(t("admin.classes.updateClassFailed"), error.message);
      toast.success(t("admin.classes.classUpdatedToast"));
    } else {
      const insertPayload: Database["public"]["Tables"]["classes"]["Insert"] = {
        name: form.name, class_type: form.class_type,
        location_type: locType, external_location_name: extName, external_location_address: extAddr, google_maps_url: mapsUrl,
        schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null,
        time_start: firstSlot?.time_start || form.time_start || "", time_end: firstSlot?.time_end || form.time_end || "",
        capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0),
        price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null,
        goals: form.goals.trim() || null, description: form.description.trim() || null, branch_id: branchId, status: "active", enrolled: 0,
        photo_url: null,
      };
      const { data: newClass, error } = await supabase.from("classes").insert(insertPayload).select("id").single();
      if (error) { setSaving(false); return toast.error(t("admin.classes.createClassFailed"), error.message); }

      // Upload class cover photo if selected
      if (photoFile && newClass?.id) {
        try {
          await upload.classPhoto(photoFile, newClass.id);
        } catch (photoErr) {
          toast.error("Gagal mengupload foto kelas", (photoErr as Error).message);
        }
      }

      // Assign initial Head & Assistant coaches if selected
      const coachRows: { class_id: string; coach_id: string; role: "head" | "assistant" }[] = [];
      if (newHeadCoachId) {
        coachRows.push({ class_id: newClass.id, coach_id: newHeadCoachId, role: "head" });
      }
      newAssistantCoachIds.forEach(id => {
        if (id !== newHeadCoachId) {
          coachRows.push({ class_id: newClass.id, coach_id: id, role: "assistant" });
        }
      });
      if (coachRows.length > 0) {
        const { error: coachErr } = await supabase.from("class_coaches").insert(coachRows);
        if (coachErr) {
          setSaving(false);
          toast.error(`${t("admin.classes.classCreatedToast")} — Coach assignment failed`, coachErr.message);
          setOpenForm(false);
          load();
          return;
        }
      }

      setSaving(false);
      toast.success(t("admin.classes.classCreatedToast"));
    }
    setOpenForm(false);
    load();
  };

  const archiveClass = async (c: ClassRow) => {
    const yes = await confirm({ body: t("admin.classes.archiveConfirmBody", { name: c.name }) });
    if (!yes) return;
    await supabase.from("classes").update({ status: "archived" }).eq("id", c.id);
    toast.success(t("admin.classes.classArchivedToast"));
    load();
  };

  const restoreClass = async (c: ClassRow) => {
    const yes = await confirm({ body: t("admin.classes.restoreConfirmBody", { name: c.name }) });
    if (!yes) return;
    await supabase.from("classes").update({ status: "active" }).eq("id", c.id);
    toast.success(t("admin.classes.classRestoredToast"));
    load();
  };

  const toggleDay = (d: string) => setForm(f => {
    const selected = f.schedule_days.includes(d);
    const newDays = selected ? f.schedule_days.filter(x => x !== d) : [...f.schedule_days, d];
    // Keep schedule_times in sync with selected days (preserve existing per-day times)
    const newTimes = newDays.map(day => {
      const existing = f.schedule_times.find(s => s.day === day);
      return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
    });
    return { ...f, schedule_days: newDays, schedule_times: newTimes };
  });

  const updateSlotTime = (day: string, field: "time_start" | "time_end", value: string) =>
    setForm(f => ({ ...f, schedule_times: f.schedule_times.map(s => s.day === day ? { ...s, [field]: value } : s) }));

  // ── Packages ───────────────────────────────────────────────────────────────
  const openPackages = (c: ClassRow) => {
    setPackageClass(c);
    setPackages((c.packages ?? []).slice().sort((a, b) => a.sort_order - b.sort_order));
    setPkgForm({ name: "", sessions: "", price: "" });
  };

  const savePackage = async () => {
    if (!packageClass || !pkgForm.sessions || !pkgForm.price) return toast.error(t("admin.classes.sessionsPriceRequired"));
    setSavingPkg(true);
    const name = pkgForm.name.trim() || t("admin.classes.defaultPackageName", { sessions: pkgForm.sessions });
    const { error } = await supabase.from("class_packages").insert({
      class_id: packageClass.id,
      name,
      sessions: Number(pkgForm.sessions),
      price: Number(pkgForm.price),
      sort_order: packages.length,
    });
    setSavingPkg(false);
    if (error) return toast.error(t("admin.classes.savePackageFailed"), error.message);
    toast.success(t("admin.classes.packageAddedToast"));
    const { data } = await supabase.from("class_packages").select("id, name, sessions, price, sort_order, active").eq("class_id", packageClass.id).order("sort_order");
    setPackages((data ?? []) as ClassPackage[]);
    setPkgForm({ name: "", sessions: "", price: "" });
    load();
  };

  const deletePackage = async (pkgId: string) => {
    const yes = await confirm({ body: t("admin.classes.deletePackageConfirmBody") });
    if (!yes) return;
    await supabase.from("class_packages").delete().eq("id", pkgId);
    setPackages(p => p.filter(x => x.id !== pkgId));
    toast.success(t("admin.classes.packageDeletedToast"));
    load();
  };

  const togglePackageActive = async (pkg: ClassPackage) => {
    await supabase.from("class_packages").update({ active: !pkg.active }).eq("id", pkg.id);
    setPackages(p => p.map(x => x.id === pkg.id ? { ...x, active: !x.active } : x));
  };

  const openClassAtt = async (c: ClassRow) => {
    setAttClass(c);
    setAttSessions([]);
    setAttExpanded(new Set());
    setLoadingAtt2(true);
    const { data } = await supabase.from("member_attendances")
      .select("id, member_id, class_id, session_date, status, method, member:members(profile:profiles(full_name))")
      .eq("class_id", c.id)
      .order("session_date", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as unknown as MemberAttendanceRow[];
    // Group by session_date
    const map = new Map<string, MemberAttendanceRow[]>();
    for (const r of rows) {
      if (!map.has(r.session_date)) map.set(r.session_date, []);
      map.get(r.session_date)!.push(r);
    }
    setAttSessions(Array.from(map.entries()).map(([date, rs]) => ({ date, rows: rs })));
    setLoadingAtt2(false);
  };

  const archivedCount = classes.filter(c => c.status === "archived").length;
  const visibleClasses = classes.filter(c => showArchived ? c.status === "archived" : c.status !== "archived");

  return {
    t, dayLabels, localeTag,
    classes, coaches, saving, showArchived, setShowArchived,
    openForm, setOpenForm, editTarget, form, setForm, fileInputRef, photoFile, photoPreview,
    attClass, setAttClass, attSessions, loadingAtt2, attExpanded, setAttExpanded,
    packageClass, setPackageClass, packages, pkgForm, setPkgForm, savingPkg,
    addCoachId, setAddCoachId, coachMutating, newHeadCoachId, setNewHeadCoachId, newAssistantCoachIds, setNewAssistantCoachIds,
    addClassCoach, removeClassCoach, setClassCoachRole,
    handlePhotoChange, handleRemovePhoto, openCreate, openEdit, isPrivate, saveClass, archiveClass, restoreClass,
    toggleDay, updateSlotTime,
    openPackages, savePackage, deletePackage, togglePackageActive, openClassAtt,
    archivedCount, visibleClasses,
    isMemberPresentLike,
  };
}
