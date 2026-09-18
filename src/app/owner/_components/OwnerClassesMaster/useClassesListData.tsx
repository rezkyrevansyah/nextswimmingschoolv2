"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { Database, Json } from "@/types/database";
import { EMPTY_CLASS_FORM, type ClassRow, type CoachProfile, type ScheduleSlot } from "./_types";

export function useClassesListData(branches: { id: string; name: string }[]) {
  const supabase = createClient();
  const { upload } = useUpload();
  const toast = useToast();
  const confirm = useConfirm();
  const localeTag = "en-US";

  const dayLabels: Record<string, string> = {
    Senin: "Monday",
    Selasa: "Tuesday",
    Rabu: "Wednesday",
    Kamis: "Thursday",
    Jumat: "Friday",
    Sabtu: "Saturday",
    Minggu: "Sunday",
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

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("classes")
      .select(
        "id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, location_type, external_location_name, external_location_address, google_maps_url, schedule_days, time_start, time_end, schedule_times, goals, description, photo_url, spreadsheet_url, spreadsheet_filled, rapor_signer_coach_id, branch:branches(id, name), class_coaches(coach_id, role, profile:profiles(id, full_name, phone, avatar_url)), coach_spreadsheets:class_coach_spreadsheets(coach_id, spreadsheet_url, updated_at, coach:profiles(full_name))"
      )
      // Private classes are excluded — they're managed exclusively via the
      // dedicated "Student Private" menu now, which keeps the 1:1
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
    if (error) toast.error("Loading classes data…", error.message);
    setLoading(false);
  }, [supabase, statusFilter, branchFilter, toast]);

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
    if (!form.branch_id) return toast.error("Select Center…");
    if (!form.name.trim()) return toast.error("Class name is required");
    if (!isPrivate && form.schedule_days.length === 0) return toast.error("Session days are required for regular classes");
    if (isPrivate && form.location_type === "external" && !form.external_location_name.trim()) {
      return toast.error("The external location name (e.g. apartment/pool name) is required for external private classes.");
    }
    if (!isPrivate && (!Number(form.capacity) || Number(form.capacity) <= 0)) {
      return toast.error("Capacity must be greater than 0");
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
          toast.error("Failed to save class", (err as Error).message);
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
      if (error) return toast.error("Failed to save class", error.message);
      toast.success("Class updated successfully");
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
        return toast.error("Failed to save class", error.message);
      }

      if (photoFile && newClass?.id) {
        try {
          await upload.classPhoto(photoFile, newClass.id);
        } catch (photoErr) {
          toast.error("Failed to upload class photo", (photoErr as Error).message);
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
      toast.success("Class created successfully");
    }

    setOpenForm(false);
    load();
  };

  const archiveClass = async (c: ClassRow) => {
    const yes = await confirm({
      title: "Archive Class?",
      body: (<>{"Class \""}<NoTranslate>{c.name}</NoTranslate>{"\" will be archived and hidden from schedules."}</>),
    });
    if (!yes) return;
    const { error } = await supabase.from("classes").update({ status: "archived" }).eq("id", c.id);
    if (error) return toast.error("Failed to save class", error.message);
    toast.success("Class archived successfully");
    load();
  };

  const restoreClass = async (c: ClassRow) => {
    const yes = await confirm({
      title: "Restore Class?",
      body: (<>{"Class \""}<NoTranslate>{c.name}</NoTranslate>{"\" will be reactivated."}</>),
    });
    if (!yes) return;
    const { error } = await supabase.from("classes").update({ status: "active" }).eq("id", c.id);
    if (error) return toast.error("Failed to save class", error.message);
    toast.success("Class restored successfully");
    load();
  };

  const deleteClass = async (c: ClassRow) => {
    const yes = await confirm({
      title: "Delete Class?",
      body: (<>{"Are you sure you want to permanently delete class \""}<NoTranslate>{c.name}</NoTranslate>{"\"? This action cannot be undone."}</>),
      danger: true,
    });
    if (!yes) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return toast.error("Failed to save class", error.message);
    toast.success("Class deleted successfully");
    load();
  };

  return {
    localeTag, branches, dayLabels,
    classes, setClasses, allCoaches, loading,
    statusFilter, setStatusFilter, branchFilter, setBranchFilter, coachFilter, setCoachFilter, search, setSearch,
    openForm, setOpenForm, editTarget, form, setForm, saving, fileInputRef, photoFile, photoPreview,
    newHeadCoachId, setNewHeadCoachId, newAssistantCoachIds, setNewAssistantCoachIds,
    load, filteredClasses, groupedBranches,
    handlePhotoChange, handleRemovePhoto, openCreate, openEdit, isPrivate, toggleDay, updateSlotTime,
    saveClass, archiveClass, restoreClass, deleteClass,
  };
}
