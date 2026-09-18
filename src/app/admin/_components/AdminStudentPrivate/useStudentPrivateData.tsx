"use client";
import { useState, useEffect, useCallback, createElement, Fragment } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { parseUserApiError } from "../../_utils";
import type { CoachProfile } from "../../_types";
import { EMPTY_FORM, type PrivateStudentRow } from "./_types";

export function useStudentPrivateData({ branchId, branches, onBranchesChange }: {
  branchId?: string;
  branches?: { id: string; name: string }[];
  onBranchesChange?: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [students, setStudents] = useState<PrivateStudentRow[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [branchName, setBranchName] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PrivateStudentRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PrivateStudentRow | null>(null);

  const [newHeadCoachId, setNewHeadCoachId] = useState("");
  const [newAssistantCoachIds, setNewAssistantCoachIds] = useState<string[]>([]);
  const [addCoachId, setAddCoachId] = useState("");
  const [coachMutating, setCoachMutating] = useState(false);

  const [addSesiTarget, setAddSesiTarget] = useState<PrivateStudentRow | null>(null);
  const [addSesiForm, setAddSesiForm] = useState({ jumlah: "", generate_bill: false, price: "" });
  const [savingAddSesi, setSavingAddSesi] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterCoachId, setFilterCoachId] = useState("");
  const [filterLocationType, setFilterLocationType] = useState("");

  const load = useCallback(async () => {
    if (!branches && !branchId) return;
    setLoading(true);
    let query = supabase
      .from("students")
      .select(
        "id, profile_id, branch_id, branch:branches(name), status, qr_code, student_no, remaining_sessions, total_sessions, " +
        "profile:profiles(full_name, email, phone, birth_date, gender, address, health_notes, avatar_url), " +
        "student_classes(class:classes(id, name, schedule_days, time_start, time_end, location_type, external_location_name, external_location_address, google_maps_url, custom_location_lat, custom_location_lng, class_coaches(coach_id, role, profile:profiles(id, full_name))))"
      )
      .eq("type", "private");
    if (!branches && branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) { setLoading(false); return toast.error("Failed to load private students", error.message); }

    const rows: PrivateStudentRow[] = ((data ?? []) as unknown as Array<Omit<PrivateStudentRow, "class"> & { student_classes?: { class: PrivateStudentRow["class"] }[] }>).map(m => ({
      ...m,
      class: m.student_classes?.[0]?.class ?? null,
    }));
    setStudents(rows);
    setLoading(false);
  }, [branchId, branches, supabase, toast]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    let coachQuery = supabase.from("profiles").select("id, full_name, email, nick_name, gender, birth_date, phone, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, branch_id").eq("role", "coach").order("full_name");
    if (!branches && branchId) coachQuery = coachQuery.eq("branch_id", branchId);
    coachQuery.then(({ data }) => { if (data) setCoaches(data as unknown as CoachProfile[]); });
    if (!branches && branchId) {
      supabase.from("branches").select("name").eq("id", branchId).single()
        .then(({ data }) => { if (data) setBranchName(data.name); });
    }
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const coachesForBranch = (targetId: string | null) => branches ? coaches.filter(c => c.branch_id === targetId) : coaches;

  const filtered = students.filter(s => {
    if (search.trim() && !(s.profile?.full_name ?? "").toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterBranchId && s.branch_id !== filterBranchId) return false;
    if (filterCoachId && !(s.class?.class_coaches ?? []).some(cc => cc.coach_id === filterCoachId)) return false;
    if (filterLocationType && s.class?.location_type !== filterLocationType) return false;
    return true;
  });

  const activeFilterCount = [filterBranchId, filterCoachId, filterLocationType].filter(Boolean).length;
  const resetFilters = () => { setFilterBranchId(""); setFilterCoachId(""); setFilterLocationType(""); };

  const selectedBranchName = branches
    ? (branches.find(b => b.id === (form.target_branch_id || branchId))?.name ?? "")
    : branchName;

  const editClassId = editTarget?.class?.id ?? null;
  const editClassCoaches = editTarget?.class?.class_coaches ?? [];

  const openCreate = () => {
    onBranchesChange?.();
    setEditTarget(null);
    const defaultBranchId = branchId ?? (branches?.length === 1 ? branches[0].id : "");
    setForm({ ...EMPTY_FORM, target_branch_id: defaultBranchId });
    setNewHeadCoachId("");
    setNewAssistantCoachIds([]);
    setOpenForm(true);
  };

  const openEdit = (row: PrivateStudentRow) => {
    setEditTarget(row);
    setAddCoachId("");
    setForm({
      full_name: row.profile?.full_name ?? "",
      email: row.profile?.email ?? "",
      password: "",
      phone: row.profile?.phone ?? "",
      birth_date: row.profile?.birth_date ?? "",
      gender: row.profile?.gender ?? "",
      address: row.profile?.address ?? "",
      health_notes: row.profile?.health_notes ?? "",
      jumlah_sesi: "",
      package_price: "",
      target_branch_id: row.branch_id,
      schedule_days: row.class?.schedule_days ?? [],
      time_start: row.class?.time_start ?? "",
      time_end: row.class?.time_end ?? "",
      location_type: row.class?.location_type ?? "branch",
      external_location_name: row.class?.external_location_name ?? "",
      external_location_address: row.class?.external_location_address ?? "",
      google_maps_url: row.class?.google_maps_url ?? "",
      external_lat: row.class?.custom_location_lat != null ? String(row.class.custom_location_lat) : "",
      external_lng: row.class?.custom_location_lng != null ? String(row.class.custom_location_lng) : "",
    });
    setOpenForm(true);
  };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      schedule_days: f.schedule_days.includes(day) ? f.schedule_days.filter(d => d !== day) : [...f.schedule_days, day],
    }));
  };

  const patchEditCoaches = (next: NonNullable<PrivateStudentRow["class"]>["class_coaches"]) => {
    setEditTarget(prev => prev && prev.class ? { ...prev, class: { ...prev.class, class_coaches: next } } : prev);
  };

  const addStudentCoach = async (classId: string, coachId: string) => {
    if (!coachId) return;
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").insert({ class_id: classId, coach_id: coachId, role: "assistant" });
    setCoachMutating(false);
    if (error) return toast.error("Failed to add coach", error.message);
    const coach = coaches.find(c => c.id === coachId);
    const current = editTarget?.class?.class_coaches ?? [];
    patchEditCoaches([...current, { coach_id: coachId, role: "assistant", profile: coach ? { id: coach.id, full_name: coach.full_name } : null }]);
    setAddCoachId("");
    toast.success("Coach added to class");
  };

  const removeStudentCoach = async (classId: string, coachId: string) => {
    const ok = await confirm({ title: "Remove coach from class?", body: "The coach will stop handling this class.", danger: true });
    if (!ok) return;
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").delete().eq("class_id", classId).eq("coach_id", coachId);
    setCoachMutating(false);
    if (error) return toast.error("Failed to remove coach", error.message);
    const current = editTarget?.class?.class_coaches ?? [];
    patchEditCoaches(current.filter(cc => cc.coach_id !== coachId));
    toast.success("Coach removed from class");
  };

  const setStudentCoachRole = async (classId: string, coachId: string, role: "head" | "assistant") => {
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").update({ role }).eq("class_id", classId).eq("coach_id", coachId);
    if (role === "head" && !error) {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", classId).neq("coach_id", coachId);
    }
    setCoachMutating(false);
    if (error) return toast.error("Failed to change coach role", error.message);
    const current = editTarget?.class?.class_coaches ?? [];
    patchEditCoaches(current.map(cc => role === "head"
      ? { ...cc, role: cc.coach_id === coachId ? "head" : "assistant" }
      : (cc.coach_id === coachId ? { ...cc, role: "assistant" } : cc)));
  };

  const saveStudent = async () => {
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (form.schedule_days.length === 0) return toast.error("Select at least one day");
    if (!form.time_start || !form.time_end) return toast.error("Start and end time are required");
    if (form.location_type === "external" && !form.external_location_name.trim()) {
      return toast.error("The external location name (e.g. apartment/pool name) is required for external private classes.");
    }

    setSaving(true);
    const locType = form.location_type;
    const extName = locType === "external" ? (form.external_location_name.trim() || null) : null;
    const extAddr = locType === "external" ? (form.external_location_address.trim() || null) : null;
    const mapsUrl = locType === "external" ? (form.google_maps_url.trim() || null) : null;
    const extLat = locType === "external" && form.external_lat ? Number(form.external_lat) : null;
    const extLng = locType === "external" && form.external_lng ? Number(form.external_lng) : null;

    if (editTarget) {
      if (editTarget.class) {
        const { error: classErr } = await supabase.from("classes").update({
          name: `Private - ${form.full_name.trim()}`,
          schedule_days: form.schedule_days,
          time_start: form.time_start,
          time_end: form.time_end,
          location_type: locType,
          external_location_name: extName,
          external_location_address: extAddr,
          google_maps_url: mapsUrl,
          custom_location_lat: extLat,
          custom_location_lng: extLng,
        }).eq("id", editTarget.class.id);
        if (classErr) { setSaving(false); return toast.error("Failed to save schedule/location", classErr.message); }
      }

      const res = await fetch(`/api/admin/users/${editTarget.profile_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim() || undefined,
          profile: {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            birth_date: form.birth_date || null,
            gender: form.gender || null,
            address: form.address.trim() || null,
            health_notes: form.health_notes.trim() || null,
          },
        }),
      });
      setSaving(false);
      const json = await res.json() as { error?: string; code?: string };
      if (!res.ok) { const [errT, errS] = parseUserApiError(json); return toast.error(errT, errS); }
      toast.success("Student updated");
    } else {
      if (!form.email || !form.password) return (setSaving(false), toast.error("Name, email, and password are required"));
      const targetBranchId = form.target_branch_id || branchId;
      if (!targetBranchId) { setSaving(false); return toast.error("Select which center this student belongs to"); }

      // 1. Create the backing private class row first.
      const { data: newClass, error: classErr } = await supabase.from("classes").insert({
        name: `Private - ${form.full_name.trim()}`,
        branch_id: targetBranchId,
        class_type: "private",
        capacity: 1,
        enrolled: 0,
        status: "active",
        price_monthly: 0,
        schedule_days: form.schedule_days,
        time_start: form.time_start,
        time_end: form.time_end,
        location_type: locType,
        external_location_name: extName,
        external_location_address: extAddr,
        google_maps_url: mapsUrl,
        custom_location_lat: extLat,
        custom_location_lng: extLng,
      }).select("id").single();
      if (classErr || !newClass) { setSaving(false); return toast.error("Failed to save schedule/location", classErr?.message); }

      // 2. Create the student, linked to that class (existing route already
      // handles the students insert + student_classes link + capacity check).
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, password: form.password, full_name: form.full_name,
          role: "student", branch_id: targetBranchId, phone: form.phone || undefined,
          birth_date: form.birth_date || null, gender: form.gender || null,
          address: form.address || null, health_notes: form.health_notes || null,
          student_type: "private",
          class_id: newClass.id,
          total_sessions: Number(form.jumlah_sesi) || null,
        }),
      });
      const json = await res.json() as { error?: string; code?: string; user_id?: string };
      if (!res.ok || !json.user_id) {
        // Roll back the orphaned class row since student creation failed.
        await supabase.from("classes").delete().eq("id", newClass.id);
        setSaving(false);
        const [errT, errS] = parseUserApiError(json);
        return toast.error(errT, errS);
      }

      // 3. Assign the initial head + assistant coach(es), if any were picked.
      const coachRows: { class_id: string; coach_id: string; role: "head" | "assistant" }[] = [];
      if (newHeadCoachId) coachRows.push({ class_id: newClass.id, coach_id: newHeadCoachId, role: "head" });
      newAssistantCoachIds.forEach(id => {
        if (id !== newHeadCoachId) coachRows.push({ class_id: newClass.id, coach_id: id, role: "assistant" });
      });
      if (coachRows.length > 0) {
        await supabase.from("class_coaches").insert(coachRows);
      }

      // 4. Record the package price as a bill, so it appears in the
      // student's payment history (student_type "private" bypasses the
      // regular monthly-billing flow, so this is the only bill they get).
      const packagePrice = Number(form.package_price) || 0;
      const sessionCount = Number(form.jumlah_sesi) || 0;
      if (packagePrice > 0) {
        await supabase.from("bills").insert({
          student_id: json.user_id, branch_id: targetBranchId,
          class_id: newClass.id,
          period_label: `Add ${sessionCount} sessions`,
          type: "session_pack" as "monthly",
          sessions_total: sessionCount,
          sessions_used: 0,
          amount: packagePrice,
          discount: 0,
          total: packagePrice,
          status: "unpaid",
        });
      }

      setSaving(false);
      toast.success("Private student created");
    }
    setOpenForm(false);
    load();
  };

  const openAddSesi = (row: PrivateStudentRow) => {
    setAddSesiTarget(row);
    setAddSesiForm({ jumlah: "", generate_bill: false, price: "" });
  };

  const doAddSesi = async () => {
    if (!addSesiTarget) return;
    const jumlah = Number(addSesiForm.jumlah);
    if (!jumlah || jumlah < 1) return toast.error("Invalid session count");
    setSavingAddSesi(true);
    const newTotal = (addSesiTarget.total_sessions ?? 0) + jumlah;
    const newRemaining = (addSesiTarget.remaining_sessions ?? 0) + jumlah;
    const { error } = await supabase.from("students")
      .update({ total_sessions: newTotal, remaining_sessions: newRemaining })
      .eq("id", addSesiTarget.id);
    if (error) { setSavingAddSesi(false); return toast.error("Failed to add session", error.message); }

    if (addSesiForm.generate_bill) {
      const price = Number(addSesiForm.price) || 0;
      if (price > 0) {
        await supabase.from("bills").insert({
          student_id: addSesiTarget.id, branch_id: addSesiTarget.branch_id,
          class_id: addSesiTarget.class?.id ?? null,
          period_label: `Add ${jumlah} sessions`,
          type: "session_pack" as "monthly",
          sessions_total: jumlah,
          sessions_used: 0,
          amount: price,
          discount: 0,
          total: price,
          status: "unpaid",
        });
      }
    }

    setSavingAddSesi(false);
    toast.success(`${jumlah} sessions added`);
    setAddSesiTarget(null);
    load();
  };

  const deleteStudent = async (row: PrivateStudentRow) => {
    const yes = await confirm({
      title: "Delete this private student?",
      body: "This permanently deletes the student's account and their private class slot. This cannot be undone.",
      danger: true,
    });
    if (!yes) return;
    const res = await fetch(`/api/admin/users/${row.profile_id}`, { method: "DELETE" });
    const json = await res.json() as { error?: string };
    if (!res.ok) return toast.error("Failed to delete", json.error);
    // Clean up the now-orphaned private class row (1:1 — nothing else can use it).
    if (row.class) await supabase.from("classes").delete().eq("id", row.class.id);
    toast.success("Student deleted");
    load();
  };

  const scheduleSummary = (row: PrivateStudentRow) => {
    const cls = row.class;
    if (!cls) return "—";
    const days = (cls.schedule_days ?? []).join(", ") || "—";
    const daysNode = createElement(NoTranslate, null, days);
    const time = cls.time_start && cls.time_end ? `${cls.time_start.slice(0, 5)}-${cls.time_end.slice(0, 5)}` : "";
    return time ? createElement(Fragment, null, daysNode, ` · ${time}`) : daysNode;
  };

  const locationSummary = (row: PrivateStudentRow) => {
    const cls = row.class;
    if (!cls) return "—";
    if (cls.location_type === "external") return cls.external_location_name ? createElement(NoTranslate, null, cls.external_location_name) : "Somewhere else";
    return "This center's pool";
  };

  const coachName = (row: PrivateStudentRow) => {
    const list = row.class?.class_coaches ?? [];
    const head = list.find(cc => cc.role === "head") ?? list[0];
    if (!head?.profile) return "—";
    const extra = list.length - 1;
    return extra > 0 ? (<><NoTranslate>{head.profile.full_name}</NoTranslate>{" +"}<NoTranslate>{extra}</NoTranslate></>) : createElement(NoTranslate, null, head.profile.full_name);
  };

  return {
    branchId, branches, branchName,
    students, coaches, loading, search, setSearch,
    openForm, setOpenForm, editTarget, form, setForm, saving, detailTarget, setDetailTarget,
    newHeadCoachId, setNewHeadCoachId, newAssistantCoachIds, setNewAssistantCoachIds,
    addCoachId, setAddCoachId, coachMutating,
    addSesiTarget, setAddSesiTarget, addSesiForm, setAddSesiForm, savingAddSesi,
    showFilters, setShowFilters, filterBranchId, setFilterBranchId, filterCoachId, setFilterCoachId,
    filterLocationType, setFilterLocationType,
    load, coachesForBranch, filtered, activeFilterCount, resetFilters, selectedBranchName,
    editClassId, editClassCoaches,
    openCreate, openEdit, toggleDay, addStudentCoach, removeStudentCoach, setStudentCoachRole,
    saveStudent, openAddSesi, doAddSesi, deleteStudent, scheduleSummary, locationSummary, coachName,
  };
}
