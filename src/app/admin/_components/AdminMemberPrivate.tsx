"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field, Input, Select, Textarea, Switch, SectionLabel } from "@/components/ui/FormFields";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import QRBox from "@/components/ui/QRBox";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { fmtDate, waLink, clampPercent, cn } from "@/lib/utils";
import { calcAge, parseUserApiError } from "../_utils";
import type { CoachProfile } from "../_types";

function MapLoading() {
  const { t } = useLocale();
  return <div className="rounded-xl border border-line bg-paper-tint h-[220px] flex items-center justify-center text-ink-mute text-sm">{t("admin.settings.mapLoading")}</div>;
}
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { ssr: false, loading: MapLoading });

const DAY_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

interface PrivateStudentRow {
  id: string; // member id
  profile_id: string;
  branch_id: string;
  branch: { name: string } | null;
  status: string;
  qr_code: string | null;
  member_no: string | null;
  remaining_sessions: number | null;
  total_sessions: number | null;
  profile: {
    full_name: string; email: string | null; phone: string | null; birth_date: string | null;
    gender: string | null; address: string | null; health_notes: string | null; avatar_url: string | null;
  } | null;
  class: {
    id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null;
    location_type: string | null; external_location_name: string | null; external_location_address: string | null;
    google_maps_url: string | null; custom_location_lat: number | null; custom_location_lng: number | null;
    class_coaches?: { coach_id: string; role: string; profile: { id: string; full_name: string } | null }[];
  } | null;
}

const EMPTY_FORM = {
  full_name: "", email: "", password: "", phone: "", birth_date: "", gender: "",
  address: "", health_notes: "", jumlah_sesi: "", package_price: "",
  schedule_days: [] as string[], time_start: "", time_end: "",
  location_type: "branch", external_location_name: "", external_location_address: "", google_maps_url: "",
  external_lat: "", external_lng: "", target_branch_id: "",
};

export default function AdminMemberPrivate({ branchId, branches, onBranchesChange }: {
  /** Required for Admin (single-branch scope). Unused/omitted for Owner,
   * which shows every branch it can see in one table instead. */
  branchId?: string;
  /** Passed only from the Owner panel, which manages multiple centers — lets
   * this screen show every private member across all centers at once (with
   * a Branch column + filter), and lets the create form pick which center a
   * new student belongs to. Admin is always scoped to its one branch, so
   * this stays unset there. */
  branches?: { id: string; name: string }[];
  /** Re-fetches the `branches` list from the Owner side. Called right before
   * opening the create form so a center added in another tab/session is
   * pickable immediately, without waiting on whatever refresh timing the
   * page-level branch list normally relies on. */
  onBranchesChange?: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();

  const [students, setStudents] = useState<PrivateStudentRow[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  // Admin is always scoped to a single branch (passed down from admin/page.tsx,
  // same as every other Admin sub-page); Owner picks it via the selector above
  // this screen. There's no per-member branch picker in this form by design —
  // but we still show its name so "this center's pool" isn't a mystery label.
  const [branchName, setBranchName] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PrivateStudentRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PrivateStudentRow | null>(null);

  // Coach roster for the create form — buffered until the class row exists.
  const [newHeadCoachId, setNewHeadCoachId] = useState("");
  const [newAssistantCoachIds, setNewAssistantCoachIds] = useState<string[]>([]);
  // Coach roster mutations for the edit form — applied live (same pattern as
  // AdminClass.tsx), since the class row already exists there.
  const [addCoachId, setAddCoachId] = useState("");
  const [coachMutating, setCoachMutating] = useState(false);

  const [addSesiTarget, setAddSesiTarget] = useState<PrivateStudentRow | null>(null);
  const [addSesiForm, setAddSesiForm] = useState({ jumlah: "", generate_bill: false, price: "" });
  const [savingAddSesi, setSavingAddSesi] = useState(false);

  // Advanced filter — replaces the old "pick one branch to even see anything"
  // model: the table always shows every row this screen can see, narrowed by
  // whichever of these are set. Branch filter only makes sense in Owner mode.
  const [showFilters, setShowFilters] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterCoachId, setFilterCoachId] = useState("");
  const [filterLocationType, setFilterLocationType] = useState("");

  const load = useCallback(async () => {
    if (!branches && !branchId) return;
    setLoading(true);
    let query = supabase
      .from("members")
      .select(
        "id, profile_id, branch_id, branch:branches(name), status, qr_code, member_no, remaining_sessions, total_sessions, " +
        "profile:profiles(full_name, email, phone, birth_date, gender, address, health_notes, avatar_url), " +
        "member_classes(class:classes(id, name, schedule_days, time_start, time_end, location_type, external_location_name, external_location_address, google_maps_url, custom_location_lat, custom_location_lng, class_coaches(coach_id, role, profile:profiles(id, full_name))))"
      )
      .eq("type", "private");
    // Owner sees every branch it can see (RLS already scopes this) in one
    // table; Admin stays scoped to its own single branch.
    if (!branches && branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) { setLoading(false); return toast.error(t("admin.memberPrivate.loadFailed"), error.message); }

    const rows: PrivateStudentRow[] = ((data ?? []) as unknown as Array<Omit<PrivateStudentRow, "class"> & { member_classes?: { class: PrivateStudentRow["class"] }[] }>).map(m => ({
      ...m,
      class: m.member_classes?.[0]?.class ?? null,
    }));
    setStudents(rows);
    setLoading(false);
  }, [branchId, branches, supabase, toast, t]);

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

  // Coaches scoped to a given branch — every branch's coaches when in Admin
  // mode (already branch-filtered from the query above), or just that one
  // branch's coaches out of the full multi-branch list in Owner mode.
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

  // Name of the branch this student's "at the center" location actually
  // resolves to — the one just picked in the form when multiple centers are
  // available, otherwise the single branch this whole screen is scoped to.
  const selectedBranchName = branches
    ? (branches.find(b => b.id === (form.target_branch_id || branchId))?.name ?? "")
    : branchName;

  const editClassId = editTarget?.class?.id ?? null;
  const editClassCoaches = editTarget?.class?.class_coaches ?? [];

  const openCreate = () => {
    onBranchesChange?.();
    setEditTarget(null);
    // Admin always has a fixed branchId. Owner has none — but when there's
    // only one center total the Center field below is hidden (nothing to
    // pick), so default to it directly instead of leaving this blank and
    // making creation impossible for an Owner with a single center.
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
      // The student's own branch, not necessarily whatever branchId this
      // screen happens to be scoped to (Owner's table now spans every
      // branch at once) — used for the Location label and the edit-mode
      // coach roster's branch scoping below.
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

  // Coach roster mutations for the edit form — write straight to class_coaches
  // and patch editTarget locally, so a student can have a head coach plus any
  // number of assistant coaches without waiting on the main Save button.
  const patchEditCoaches = (next: NonNullable<PrivateStudentRow["class"]>["class_coaches"]) => {
    setEditTarget(prev => prev && prev.class ? { ...prev, class: { ...prev.class, class_coaches: next } } : prev);
  };

  const addStudentCoach = async (classId: string, coachId: string) => {
    if (!coachId) return;
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").insert({ class_id: classId, coach_id: coachId, role: "assistant" });
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.addCoachFailed"), error.message);
    const coach = coaches.find(c => c.id === coachId);
    const current = editTarget?.class?.class_coaches ?? [];
    patchEditCoaches([...current, { coach_id: coachId, role: "assistant", profile: coach ? { id: coach.id, full_name: coach.full_name } : null }]);
    setAddCoachId("");
    toast.success(t("admin.classes.coachAddedToast"));
  };

  const removeStudentCoach = async (classId: string, coachId: string) => {
    const ok = await confirm({ title: t("admin.classes.removeCoachConfirmTitle"), body: t("admin.classes.removeCoachConfirmBody"), danger: true });
    if (!ok) return;
    setCoachMutating(true);
    const { error } = await supabase.from("class_coaches").delete().eq("class_id", classId).eq("coach_id", coachId);
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.removeCoachFailed"), error.message);
    const current = editTarget?.class?.class_coaches ?? [];
    patchEditCoaches(current.filter(cc => cc.coach_id !== coachId));
    toast.success(t("admin.classes.coachRemovedToast"));
  };

  const setStudentCoachRole = async (classId: string, coachId: string, role: "head" | "assistant") => {
    setCoachMutating(true);
    // Promote the target to head first, then demote everyone else — if the
    // second call fails partway through, the class still has a head coach
    // (possibly two, briefly) instead of ending up with zero.
    const { error } = await supabase.from("class_coaches").update({ role }).eq("class_id", classId).eq("coach_id", coachId);
    if (role === "head" && !error) {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", classId).neq("coach_id", coachId);
    }
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.changeRoleFailed"), error.message);
    const current = editTarget?.class?.class_coaches ?? [];
    patchEditCoaches(current.map(cc => role === "head"
      ? { ...cc, role: cc.coach_id === coachId ? "head" : "assistant" }
      : (cc.coach_id === coachId ? { ...cc, role: "assistant" } : cc)));
  };

  const saveStudent = async () => {
    if (!form.full_name.trim()) return toast.error(t("admin.members.fullNameRequired2"));
    if (form.schedule_days.length === 0) return toast.error(t("admin.memberPrivate.scheduleDaysRequired"));
    if (!form.time_start || !form.time_end) return toast.error(t("admin.memberPrivate.timeRequired"));
    if (form.location_type === "external" && !form.external_location_name.trim()) {
      return toast.error(t("admin.classes.externalLocationNameRequired"));
    }

    setSaving(true);
    const locType = form.location_type;
    const extName = locType === "external" ? (form.external_location_name.trim() || null) : null;
    const extAddr = locType === "external" ? (form.external_location_address.trim() || null) : null;
    const mapsUrl = locType === "external" ? (form.google_maps_url.trim() || null) : null;
    const extLat = locType === "external" && form.external_lat ? Number(form.external_lat) : null;
    const extLng = locType === "external" && form.external_lng ? Number(form.external_lng) : null;

    if (editTarget) {
      // Update the backing private class row (schedule/location) — safe to
      // mutate directly since the 1:1 trigger guarantees this class belongs
      // to exactly this student. The coach's next clock-in always reads
      // these fields live, so a location/schedule change here takes effect
      // immediately without touching past attendance records.
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
        if (classErr) { setSaving(false); return toast.error(t("admin.memberPrivate.saveClassFailed"), classErr.message); }
      }

      // Update identity fields via the shared PATCH route (handles auth email sync too).
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
      if (!res.ok) { const [errT, errS] = parseUserApiError(json, t); return toast.error(errT, errS); }
      toast.success(t("admin.memberPrivate.studentUpdatedToast"));
    } else {
      if (!form.email || !form.password) return (setSaving(false), toast.error(t("admin.coaches.nameEmailPasswordRequired")));
      const targetBranchId = form.target_branch_id || branchId;
      if (!targetBranchId) { setSaving(false); return toast.error(t("admin.memberPrivate.fieldTargetBranchRequired")); }

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
      if (classErr || !newClass) { setSaving(false); return toast.error(t("admin.memberPrivate.saveClassFailed"), classErr?.message); }

      // 2. Create the member, linked to that class (existing route already
      // handles the members insert + member_classes link + capacity check).
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, password: form.password, full_name: form.full_name,
          role: "member", branch_id: targetBranchId, phone: form.phone || undefined,
          birth_date: form.birth_date || null, gender: form.gender || null,
          address: form.address || null, health_notes: form.health_notes || null,
          member_type: "private",
          class_id: newClass.id,
          total_sessions: Number(form.jumlah_sesi) || null,
        }),
      });
      const json = await res.json() as { error?: string; code?: string; user_id?: string };
      if (!res.ok || !json.user_id) {
        // Roll back the orphaned class row since member creation failed.
        await supabase.from("classes").delete().eq("id", newClass.id);
        setSaving(false);
        const [errT, errS] = parseUserApiError(json, t);
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
      // member's payment history (member_type "private" bypasses the
      // regular monthly-billing flow, so this is the only bill they get).
      const packagePrice = Number(form.package_price) || 0;
      const sessionCount = Number(form.jumlah_sesi) || 0;
      if (packagePrice > 0) {
        await supabase.from("bills").insert({
          member_id: json.user_id, branch_id: targetBranchId,
          class_id: newClass.id,
          period_label: t("admin.members.fallbackBillPeriodLabel", { count: sessionCount }),
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
      toast.success(t("admin.memberPrivate.studentCreatedToast"));
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
    if (!jumlah || jumlah < 1) return toast.error(t("admin.members.invalidSessionCount"));
    setSavingAddSesi(true);
    const newTotal = (addSesiTarget.total_sessions ?? 0) + jumlah;
    const newRemaining = (addSesiTarget.remaining_sessions ?? 0) + jumlah;
    const { error } = await supabase.from("members")
      .update({ total_sessions: newTotal, remaining_sessions: newRemaining })
      .eq("id", addSesiTarget.id);
    if (error) { setSavingAddSesi(false); return toast.error(t("admin.members.addSessionFailed"), error.message); }

    if (addSesiForm.generate_bill) {
      const price = Number(addSesiForm.price) || 0;
      if (price > 0) {
        await supabase.from("bills").insert({
          member_id: addSesiTarget.id, branch_id: addSesiTarget.branch_id,
          class_id: addSesiTarget.class?.id ?? null,
          period_label: t("admin.members.fallbackBillPeriodLabel", { count: jumlah }),
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
    toast.success(t("admin.members.sessionsAddedToast", { count: jumlah }));
    setAddSesiTarget(null);
    load();
  };

  const deleteStudent = async (row: PrivateStudentRow) => {
    const yes = await confirm({
      title: t("admin.memberPrivate.deleteConfirmTitle"),
      body: t("admin.memberPrivate.deleteConfirmBody"),
      danger: true,
    });
    if (!yes) return;
    const res = await fetch(`/api/admin/users/${row.profile_id}`, { method: "DELETE" });
    const json = await res.json() as { error?: string };
    if (!res.ok) return toast.error(t("admin.memberPrivate.deleteFailed"), json.error);
    // Clean up the now-orphaned private class row (1:1 — nothing else can use it).
    if (row.class) await supabase.from("classes").delete().eq("id", row.class.id);
    toast.success(t("admin.memberPrivate.deletedToast"));
    load();
  };

  const scheduleSummary = (row: PrivateStudentRow) => {
    const cls = row.class;
    if (!cls) return "—";
    const days = (cls.schedule_days ?? []).join(", ") || "—";
    const time = cls.time_start && cls.time_end ? `${cls.time_start.slice(0, 5)}-${cls.time_end.slice(0, 5)}` : "";
    return time ? `${days} · ${time}` : days;
  };

  const locationSummary = (row: PrivateStudentRow) => {
    const cls = row.class;
    if (!cls) return "—";
    if (cls.location_type === "external") return cls.external_location_name || t("admin.memberPrivate.externalLocation");
    return t("admin.memberPrivate.branchLocation");
  };

  const coachName = (row: PrivateStudentRow) => {
    const list = row.class?.class_coaches ?? [];
    const head = list.find(cc => cc.role === "head") ?? list[0];
    if (!head?.profile) return "—";
    const extra = list.length - 1;
    return extra > 0 ? t("admin.memberPrivate.coachNamePlusMore", { name: head.profile.full_name, count: extra }) : head.profile.full_name;
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar matching pen.dev o9hxIV */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          <div className="relative w-64">
            <Icon name="search" className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("admin.memberPrivate.searchPlaceholder")}
              className="w-full h-10 pl-9 pr-3 text-sm bg-paper border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
            />
          </div>

          {branches && (
            <select
              value={filterBranchId}
              onChange={e => setFilterBranchId(e.target.value)}
              className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
            >
              <option value="">{t("admin.memberPrivate.allBranchesOpt")}</option>
              {branches.map(b => <option key={b.id} value={b.id} translate="no">{b.name}</option>)}
            </select>
          )}

          <select
            value={filterCoachId}
            onChange={e => setFilterCoachId(e.target.value)}
            className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
          >
            <option value="">{t("admin.memberPrivate.allCoachesOpt")}</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-10 rounded-xl border transition-colors ${showFilters ? "bg-ocean-600 text-white border-ocean-600" : "bg-paper border-line text-ink-soft hover:bg-paper-tint hover:border-line-strong"}`}
          >
            <Icon name="settings" className="w-4 h-4" />
            {t("admin.memberPrivate.filterBtn")}
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <Btn variant="primary" icon="plus" onClick={openCreate} className="!h-10 !rounded-xl">
          {t("admin.memberPrivate.addStudentBtn")}
        </Btn>
      </div>

      {showFilters && (
        <div className="bg-paper border border-line rounded-2xl p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1.5">{t("admin.memberPrivate.filterByLocation")}</div>
            <select
              value={filterLocationType}
              onChange={e => setFilterLocationType(e.target.value)}
              className="w-full h-9 text-sm border border-line rounded-xl px-3 bg-paper outline-none focus:border-ocean-500"
            >
              <option value="">{t("admin.memberPrivate.allLocationsOpt")}</option>
              <option value="branch">{t("admin.memberPrivate.branchLocation")}</option>
              <option value="external">{t("admin.memberPrivate.externalLocation")}</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-2 flex items-end justify-end pb-1">
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">
                {t("admin.members.resetAllFiltersBtn")}
              </button>
            </div>
          )}
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {filterBranchId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 font-semibold ring-1 ring-ocean-200">
              {branches?.find(b => b.id === filterBranchId)?.name ?? "—"}
              <button type="button" onClick={() => setFilterBranchId("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterCoachId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 font-semibold ring-1 ring-ocean-200">
              {coaches.find(c => c.id === filterCoachId)?.full_name ?? "—"}
              <button type="button" onClick={() => setFilterCoachId("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          {filterLocationType && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ocean-50 text-ocean-700 font-semibold ring-1 ring-ocean-200">
              {filterLocationType === "branch" ? t("admin.memberPrivate.branchLocation") : t("admin.memberPrivate.externalLocation")}
              <button type="button" onClick={() => setFilterLocationType("")}><Icon name="x" className="w-3 h-3" /></button>
            </span>
          )}
          <button type="button" onClick={resetFilters} className="text-ink-mute hover:text-danger-600 transition ml-1">
            {t("admin.members.clearAllBtn")}
          </button>
        </div>
      )}

      {/* Card matching pen.dev e97zeW */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="font-display font-bold text-base text-ink">{t("admin.memberPrivate.pageTitle")}</h3>
          <p className="text-xs text-ink-mute mt-0.5">{t("admin.memberPrivate.pageSub")}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="h-9 bg-paper-deep border-b border-line text-left text-[10px] uppercase font-bold text-ink-faint tracking-wider">
              <tr>
                <th className="px-5 py-2">{t("admin.memberPrivate.colStudent")}</th>
                {branches && <th className="px-5 py-2">{t("admin.memberPrivate.colBranch")}</th>}
                <th className="px-5 py-2">{t("admin.memberPrivate.colCoach")}</th>
                <th className="px-5 py-2">{t("admin.memberPrivate.colSchedule")}</th>
                <th className="px-5 py-2">{t("admin.memberPrivate.colSessions")}</th>
                <th className="px-5 py-2 text-right">{t("admin.memberPrivate.colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-paper-tint/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.profile?.full_name ?? "?"} size={32} />
                      <div>
                        <div className="font-semibold text-ink text-sm">{row.profile?.full_name}</div>
                        <div className="text-[11px] font-mono text-ink-mute">{row.member_no || row.profile?.email || "—"}</div>
                      </div>
                    </div>
                  </td>
                  {branches && (
                    <td className="px-5 py-3 text-ink-soft text-sm">
                      {row.branch?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-5 py-3 text-ink-soft text-sm">
                    {coachName(row)}
                  </td>
                  <td className="px-5 py-3 text-ink-soft text-xs font-mono">
                    <div>{scheduleSummary(row)}</div>
                    {locationSummary(row) && <div className="text-[11px] text-ink-mute font-sans mt-0.5">{locationSummary(row)}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono font-bold text-ink text-sm">{row.remaining_sessions ?? 0}</span>
                    <span className="font-mono text-ink-faint text-xs"> / {row.total_sessions ?? 0}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailTarget(row)}
                        title={t("admin.memberPrivate.detailBtn")}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors"
                      >
                        <Icon name="qr" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddSesi(row)}
                        title={t("admin.memberPrivate.addSessionsBtn")}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-ocean-50 text-ocean-600 flex items-center justify-center transition-colors"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        title={t("common.actions.edit")}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStudent(row)}
                        title={t("common.actions.delete")}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-danger-50 text-ink-mute hover:text-danger-600 flex items-center justify-center transition-colors"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={branches ? 6 : 5} className="px-5 py-12 text-center text-ink-mute text-sm">
                    {t("admin.memberPrivate.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editTarget ? t("admin.memberPrivate.editStudentTitle") : t("admin.memberPrivate.addStudentTitle")}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenForm(false)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={saveStudent} disabled={saving}>{saving ? t("common.actions.saving") : t("common.actions.save")}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          {!editTarget && branches && branches.length > 1 && (
            <Field label={t("admin.memberPrivate.fieldTargetBranch")} required hint={t("admin.memberPrivate.fieldTargetBranchHint")}>
              <Select value={form.target_branch_id} onChange={e => setForm(f => ({ ...f, target_branch_id: e.target.value }))}>
                <option value="">{t("admin.memberPrivate.fieldTargetBranchPlaceholder")}</option>
                {branches.map(b => <option key={b.id} value={b.id} translate="no">{b.name}</option>)}
              </Select>
            </Field>
          )}
          <SectionLabel>{t("admin.memberPrivate.sectionIdentity")}</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("admin.coaches.fieldFullName2")} required>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label={t("admin.members.fieldMemberPhone")}>
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label={t("admin.schoolPanel.loginEmailLabel")} required={!editTarget}>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            {!editTarget && (
              <Field label={t("admin.members.fieldPassword")} required hint={t("admin.coaches.minCharsHint")}>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </Field>
            )}
            <Field label={t("admin.coaches.rowGender2")}>
              <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("admin.members.selectDashPlaceholder")}</option>
                <option value="male">{t("admin.approvement.genderMale")}</option>
                <option value="female">{t("admin.approvement.genderFemale")}</option>
              </Select>
            </Field>
            <Field label={t("admin.members.rowBirthDateFull")}>
              <DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} />
            </Field>
          </div>
          <Field label={t("admin.coaches.fieldAddress2")}>
            <Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </Field>

          {!editTarget && (
            <>
              <SectionLabel sub={t("admin.memberPrivate.sectionPackageSub")}>{t("admin.memberPrivate.sectionPackage")}</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("admin.memberPrivate.fieldPackagePrice")} hint={t("admin.memberPrivate.fieldPackagePriceHint")}>
                  <Input type="number" min={0} value={form.package_price} onChange={e => setForm(f => ({ ...f, package_price: e.target.value }))} />
                </Field>
                <Field label={t("admin.memberPrivate.fieldInitialSessions")} hint={t("admin.memberPrivate.fieldInitialSessionsHint")}>
                  <Input type="number" min={0} value={form.jumlah_sesi} onChange={e => setForm(f => ({ ...f, jumlah_sesi: e.target.value }))} />
                </Field>
              </div>
            </>
          )}

          <SectionLabel sub={t("admin.memberPrivate.sectionScheduleSub")}>{t("admin.memberPrivate.sectionSchedule")}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.schedule_days.includes(day) ? "bg-ocean-600 border-ocean-600 text-white" : "border-line text-ink-soft hover:bg-paper-tint"}`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.classes.fieldStartTime")}>
              <TimePicker value={form.time_start} onChange={v => setForm(f => ({ ...f, time_start: v }))} />
            </Field>
            <Field label={t("admin.classes.fieldEndTime")}>
              <TimePicker value={form.time_end} onChange={v => setForm(f => ({ ...f, time_end: v }))} />
            </Field>
          </div>

          <SectionLabel sub={t("admin.memberPrivate.sectionLocationSub")}>{t("admin.memberPrivate.sectionLocation")}</SectionLabel>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.location_type === "external"}
              onChange={isExternal => setForm(f => ({ ...f, location_type: isExternal ? "external" : "branch" }))}
              label={form.location_type === "external"
                ? t("admin.memberPrivate.externalLocation")
                : selectedBranchName
                  ? t("admin.memberPrivate.branchLocationNamed", { branch: selectedBranchName })
                  : t("admin.memberPrivate.branchLocation")}
            />
          </div>
          {form.location_type === "branch" && (
            <p className="text-xs text-ink-mute -mt-1">{t("admin.memberPrivate.branchLocationHint", { branch: selectedBranchName || "—" })}</p>
          )}
          {form.location_type === "external" && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t("admin.classes.fieldExternalLocationName")} required>
                  <Input value={form.external_location_name} onChange={e => setForm(f => ({ ...f, external_location_name: e.target.value }))} />
                </Field>
                <Field label={t("admin.classes.fieldExternalLocationAddress")}>
                  <Input value={form.external_location_address} onChange={e => setForm(f => ({ ...f, external_location_address: e.target.value }))} />
                </Field>
                <Field label={t("admin.classes.fieldGoogleMapsLink")} className="sm:col-span-2">
                  <Input value={form.google_maps_url} onChange={e => setForm(f => ({ ...f, google_maps_url: e.target.value }))} />
                </Field>
              </div>
              <Field label={t("admin.memberPrivate.fieldMapPin")} hint={t("admin.memberPrivate.fieldMapPinHint")}>
                <MapPicker
                  lat={form.external_lat}
                  lng={form.external_lng}
                  onChange={(newLat, newLng) => setForm(f => ({ ...f, external_lat: newLat, external_lng: newLng }))}
                  onSelectAddress={addr => setForm(f => ({ ...f, external_location_address: addr }))}
                  height={220}
                />
              </Field>
            </div>
          )}

          <SectionLabel sub={t("admin.memberPrivate.sectionCoachSub")}>{t("admin.memberPrivate.sectionCoach")}</SectionLabel>
          {editTarget && editClassId ? (
            <div>
              <div className="space-y-1.5">
                {[...editClassCoaches].sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0)).map(cc => cc.profile && (
                  <div key={cc.coach_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-ocean-50 text-xs">
                    <Avatar name={cc.profile.full_name ?? ""} size={22} />
                    <span className="flex-1 font-semibold text-ocean-700 truncate">{cc.profile.full_name}</span>
                    <button type="button" disabled={coachMutating} onClick={() => setStudentCoachRole(editClassId, cc.coach_id, "head")}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "head" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                      {t("admin.classes.headRoleBtn")}
                    </button>
                    <button type="button" disabled={coachMutating} onClick={() => setStudentCoachRole(editClassId, cc.coach_id, "assistant")}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "assistant" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                      {t("admin.classes.assistantRoleBtn")}
                    </button>
                    <button type="button" disabled={coachMutating} onClick={() => removeStudentCoach(editClassId, cc.coach_id)}
                      className="p-1 rounded-full text-danger-600 hover:bg-danger-50">
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {editClassCoaches.length === 0 && <span className="text-xs text-warn-600 font-semibold">{t("admin.classes.noCoachAssigned")}</span>}
              </div>
              {(() => {
                const assignedIds = new Set(editClassCoaches.map(cc => cc.coach_id));
                const available = coachesForBranch(editTarget.branch_id).filter(c => !assignedIds.has(c.id));
                if (available.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 mt-2">
                    <Select value={addCoachId} onChange={e => setAddCoachId(e.target.value)} disabled={coachMutating}>
                      <option value="">{t("admin.classes.selectCoachToAddPlaceholder")}</option>
                      {available.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </Select>
                    <Btn variant="soft" size="sm" disabled={!addCoachId || coachMutating} onClick={() => addStudentCoach(editClassId, addCoachId)}>{t("common.actions.add")}</Btn>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              <Field label={t("admin.memberPrivate.fieldHeadCoach")} hint={t("admin.memberPrivate.fieldHeadCoachHint")}>
                <Select value={newHeadCoachId} onChange={e => setNewHeadCoachId(e.target.value)}>
                  <option value="">{t("admin.memberPrivate.noCoachOption")}</option>
                  {coachesForBranch(form.target_branch_id || branchId || null).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </Select>
              </Field>
              <Field label={t("admin.memberPrivate.fieldAssistantCoaches")} hint={t("admin.memberPrivate.fieldAssistantCoachesHint")}>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-line rounded-xl p-2.5 bg-paper-tint">
                  {coachesForBranch(form.target_branch_id || branchId || null).filter(c => c.id !== newHeadCoachId).map(c => {
                    const isSelected = newAssistantCoachIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-paper-deep cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setNewAssistantCoachIds(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                          className="rounded border-line-strong text-ocean-600 focus:ring-ocean-500"
                        />
                        <span className="font-semibold text-ink">{c.full_name}</span>
                      </label>
                    );
                  })}
                  {coachesForBranch(form.target_branch_id || branchId || null).filter(c => c.id !== newHeadCoachId).length === 0 && (
                    <div className="text-xs text-ink-mute p-1 text-center">{t("admin.memberPrivate.noOtherCoaches")}</div>
                  )}
                </div>
              </Field>
            </div>
          )}
        </div>
      </Modal>

      {/* Detail modal — spacious, modern, aesthetic card layout */}
      <Modal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-ocean-500 ring-4 ring-ocean-100" />
            <span>{t("admin.memberPrivate.detailTitle")}</span>
          </div>
        }
        size="xl"
        footer={
          detailTarget && (
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <div className="text-xs text-ink-mute flex items-center gap-1.5">
                <Icon name="info" className="w-3.5 h-3.5 text-ocean-600" />
                <span>{detailTarget.branch?.name ?? branchName ?? "Private Student"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Btn variant="ghost" size="sm" onClick={() => setDetailTarget(null)}>
                  {t("common.actions.close")}
                </Btn>
                <Btn
                  variant="soft"
                  size="sm"
                  icon="plus"
                  onClick={() => {
                    const tgt = detailTarget;
                    setDetailTarget(null);
                    openAddSesi(tgt);
                  }}
                >
                  {t("admin.memberPrivate.addSessionsBtn")}
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  icon="edit"
                  onClick={() => {
                    const tgt = detailTarget;
                    setDetailTarget(null);
                    openEdit(tgt);
                  }}
                >
                  {t("admin.coaches.editDataBtn")}
                </Btn>
              </div>
            </div>
          )
        }
      >
        {detailTarget && (() => {
          const profile = detailTarget.profile;
          const cls = detailTarget.class;
          const age = profile?.birth_date ? calcAge(profile.birth_date) : null;
          const remSessions = detailTarget.remaining_sessions ?? 0;
          const totSessions = detailTarget.total_sessions ?? 0;
          const usedSessions = Math.max(0, totSessions - remSessions);
          const sessionPercent = totSessions > 0 ? clampPercent(remSessions, totSessions) : 0;

          const coachList = cls?.class_coaches ?? [];
          const headCoach = coachList.find(cc => cc.role === "head") ?? coachList[0];
          const assistantCoaches = coachList.filter(cc => cc.coach_id !== headCoach?.coach_id);

          const waGreeting = t("admin.members.waGreetingPrefix", { name: profile?.full_name ?? "" });
          const waUrl = profile?.phone ? waLink(waGreeting, profile.phone) : null;

          const isExt = cls?.location_type === "external";
          const locationName = isExt
            ? (cls?.external_location_name || t("admin.memberPrivate.externalLocation"))
            : (detailTarget.branch?.name
              ? t("admin.memberPrivate.branchLocationNamed", { branch: detailTarget.branch.name })
              : branchName
              ? t("admin.memberPrivate.branchLocationNamed", { branch: branchName })
              : t("admin.memberPrivate.branchLocation"));

          const mapsUrl = cls?.google_maps_url || (cls?.custom_location_lat != null && cls?.custom_location_lng != null
            ? `https://www.google.com/maps/search/?api=1&query=${cls.custom_location_lat},${cls.custom_location_lng}`
            : null);

          return (
            <div className="grid md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Digital Member Pass & Attendance QR (4 cols) */}
              <div className="md:col-span-4 space-y-4">
                <div className="p-5 rounded-2xl bg-paper-tint/60 border border-line flex flex-col items-center text-center shadow-sm">
                  <div className="relative">
                    <Avatar
                      name={profile?.full_name ?? ""}
                      src={profile?.avatar_url ?? undefined}
                      size={88}
                      className="ring-4 ring-white shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1">
                      <Status kind={detailTarget.status === "suspended" ? "suspended" : "active"} dot={false} className="!text-[10px] !px-2 shadow-xs">
                        {detailTarget.status === "suspended" ? t("admin.coaches.statusSuspend") : t("admin.coaches.statusActive")}
                      </Status>
                    </div>
                  </div>

                  <div className="font-display font-bold text-xl text-ink mt-3.5 leading-snug">
                    {profile?.full_name ?? "—"}
                  </div>

                  {detailTarget.member_no ? (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-line-strong/60 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-ocean-500" />
                      <span className="font-mono text-xs font-semibold text-ocean-800 tracking-wider">
                        {detailTarget.member_no}
                      </span>
                    </div>
                  ) : null}

                  {/* QR Code Container Box */}
                  <div className="w-full mt-5 p-3.5 bg-white rounded-2xl border border-line shadow-sm flex flex-col items-center">
                    <QRBox
                      value={detailTarget.qr_code ?? detailTarget.id}
                      size={152}
                      downloadable
                      downloadName={`QR_${(profile?.full_name ?? "student").replace(/\s+/g, "_")}`}
                      hideCaption
                    />
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-mute font-medium bg-paper-tint px-3 py-1 rounded-full w-full">
                      <Icon name="qr" className="w-3.5 h-3.5 text-ocean-600 shrink-0" />
                      <span className="truncate">{t("admin.memberPrivate.detailQrHint")}</span>
                    </div>
                  </div>

                  {/* Contact WhatsApp Button */}
                  {profile?.phone && waUrl && (
                    <div className="w-full mt-3">
                      <Btn
                        variant="wa"
                        size="sm"
                        icon="whatsapp"
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full shadow-xs"
                      >
                        {t("admin.members.contactMemberBtn")}
                      </Btn>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Structured Information Cards (8 cols) */}
              <div className="md:col-span-8 space-y-4">
                {/* 1. Session Quota & Package Balance Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-line shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center">
                        <Icon name="chart" className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-ink">{t("admin.memberPrivate.detailSessionBalance")}</h4>
                        <p className="text-xs text-ink-mute">
                          {remSessions > 0
                            ? `${remSessions} ${t("admin.memberPrivate.detailSessionsLeftSuffix")}`
                            : t("admin.memberPrivate.detailAllSessionsUsed")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const tgt = detailTarget;
                        setDetailTarget(null);
                        openAddSesi(tgt);
                      }}
                      className="text-xs font-semibold text-ocean-600 hover:text-ocean-700 bg-ocean-50 hover:bg-ocean-100/80 px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                    >
                      <Icon name="plus" className="w-3 h-3" />
                      <span>{t("admin.memberPrivate.addSessionsBtn")}</span>
                    </button>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-paper-tint rounded-full overflow-hidden p-0.5 border border-line">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          remSessions === 0
                            ? "bg-danger-500"
                            : remSessions <= 2
                            ? "bg-warn-500"
                            : "bg-ocean-600"
                        )}
                        style={{ width: `${sessionPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-ink-mute font-medium px-0.5">
                      <span>{remSessions === 0 ? t("admin.coaches.statusSuspend") : `${sessionPercent}% ${t("admin.memberPrivate.detailRemainingSessions")}`}</span>
                      <span>{totSessions} {t("admin.memberPrivate.colSessions")}</span>
                    </div>
                  </div>

                  {/* Mini metrics 3-col grid */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-paper-tint/70 border border-line/60 text-center">
                      <div className="text-[11px] text-ink-mute font-medium">{t("admin.memberPrivate.detailRemainingSessions")}</div>
                      <div className={cn(
                        "text-lg font-mono font-bold mt-0.5",
                        remSessions === 0 ? "text-danger-600" : remSessions <= 2 ? "text-warn-600" : "text-ocean-700"
                      )}>
                        {remSessions}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-paper-tint/70 border border-line/60 text-center">
                      <div className="text-[11px] text-ink-mute font-medium">{t("admin.memberPrivate.detailUsedSessions")}</div>
                      <div className="text-lg font-mono font-bold text-ink-soft mt-0.5">
                        {usedSessions}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-paper-tint/70 border border-line/60 text-center">
                      <div className="text-[11px] text-ink-mute font-medium">{t("admin.memberPrivate.detailTotalSessions")}</div>
                      <div className="text-lg font-mono font-bold text-ink mt-0.5">
                        {totSessions}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Training Schedule & Pool Location Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-line shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <div className="w-8 h-8 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center">
                      <Icon name="calendar" className="w-4 h-4" />
                    </div>
                    <h4 className="font-display font-bold text-sm text-ink">{t("admin.memberPrivate.detailScheduleLocation")}</h4>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    {/* Schedule Column */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-ink-mute block">{t("admin.memberPrivate.colSchedule")}</span>
                      {(cls?.schedule_days ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {cls!.schedule_days.map(day => (
                            <span key={day} className="px-2.5 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold border border-ocean-200/60 shadow-xs">
                              {day}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-mute italic">—</span>
                      )}
                      {cls?.time_start && cls?.time_end && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-paper-tint text-ink text-xs font-semibold mt-1">
                          <Icon name="calendar" className="w-3.5 h-3.5 text-ocean-600" />
                          <span>{cls.time_start.slice(0, 5)} – {cls.time_end.slice(0, 5)} WIB</span>
                        </div>
                      )}
                    </div>

                    {/* Location Column */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-mute block">{t("admin.memberPrivate.colLocation")}</span>
                      <div className="flex items-start gap-1.5">
                        <Icon name="pin" className="w-4 h-4 text-ocean-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-ink leading-snug">{locationName}</div>
                          {isExt && cls?.external_location_address && (
                            <p className="text-xs text-ink-mute mt-0.5 leading-relaxed">{cls.external_location_address}</p>
                          )}
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-ocean-600 hover:text-ocean-700 font-semibold inline-flex items-center gap-1 mt-1.5"
                            >
                              <Icon name="link" className="w-3 h-3" />
                              <span>{t("admin.memberPrivate.detailOpenMaps")}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coach Section */}
                  <div className="pt-3 border-t border-line/60">
                    <span className="text-xs font-semibold text-ink-mute block mb-2">{t("admin.memberPrivate.sectionCoach")}</span>
                    {headCoach?.profile ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-paper-tint border border-line">
                          <Avatar name={headCoach.profile.full_name} size={28} />
                          <div>
                            <div className="text-xs font-bold text-ink leading-none">{headCoach.profile.full_name}</div>
                            <div className="text-[10px] text-ocean-700 font-semibold mt-0.5">{t("admin.memberPrivate.fieldHeadCoach")}</div>
                          </div>
                        </div>
                        {assistantCoaches.map(ac => ac.profile && (
                          <div key={ac.coach_id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-paper-tint/60 border border-line/60">
                            <Avatar name={ac.profile.full_name} size={24} />
                            <div>
                              <div className="text-xs font-semibold text-ink-soft leading-none">{ac.profile.full_name}</div>
                              <div className="text-[10px] text-ink-mute mt-0.5">{t("admin.memberPrivate.fieldAssistantCoaches")}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-mute italic">{t("admin.memberPrivate.detailNoCoachAssigned")}</span>
                    )}
                  </div>
                </div>

                {/* 3. Student Profile & Contact Details Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-line shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Icon name="user" className="w-4 h-4" />
                    </div>
                    <h4 className="font-display font-bold text-sm text-ink">{t("admin.memberPrivate.detailStudentProfile")}</h4>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3.5 text-sm">
                    <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                      <span className="text-xs text-ink-mute flex items-center gap-1.5">
                        <Icon name="mail" className="w-3.5 h-3.5 text-ink-mute" />
                        <span>{t("admin.schoolPanel.loginEmailLabel")}</span>
                      </span>
                      <div className="font-semibold text-ink break-all text-xs sm:text-sm font-mono">
                        {profile?.email ?? "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                      <span className="text-xs text-ink-mute flex items-center gap-1.5">
                        <Icon name="whatsapp" className="w-3.5 h-3.5 text-ink-mute" />
                        <span>{t("admin.members.fieldMemberPhone")}</span>
                      </span>
                      <div className="font-semibold text-ink text-xs sm:text-sm">
                        {profile?.phone ?? "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                      <span className="text-xs text-ink-mute flex items-center gap-1.5">
                        <Icon name="calendar" className="w-3.5 h-3.5 text-ink-mute" />
                        <span>{t("admin.members.rowBirthDateFull")}</span>
                      </span>
                      <div className="font-semibold text-ink text-xs sm:text-sm">
                        {profile?.birth_date ? (
                          <>
                            <span>{fmtDate(profile.birth_date)}</span>
                            {age !== null && (
                              <span className="text-ink-mute font-normal text-xs ml-1.5">
                                ({t("admin.members.yearsOldSuffix", { n: age })})
                              </span>
                            )}
                          </>
                        ) : "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                      <span className="text-xs text-ink-mute flex items-center gap-1.5">
                        <Icon name="users" className="w-3.5 h-3.5 text-ink-mute" />
                        <span>{t("admin.coaches.rowGender2")}</span>
                      </span>
                      <div className="font-semibold text-ink text-xs sm:text-sm">
                        {profile?.gender === "male"
                          ? t("admin.approvement.genderMale")
                          : profile?.gender === "female"
                          ? t("admin.approvement.genderFemale")
                          : "—"}
                      </div>
                    </div>

                    {profile?.address && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                        <span className="text-xs text-ink-mute flex items-center gap-1.5">
                          <Icon name="pin" className="w-3.5 h-3.5 text-ink-mute" />
                          <span>{t("admin.coaches.fieldAddress2")}</span>
                        </span>
                        <div className="font-medium text-ink text-xs sm:text-sm leading-relaxed">
                          {profile.address}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Health Notes Banner if present */}
                  {profile?.health_notes && (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                      <Icon name="warning" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">{t("admin.memberPrivate.detailHealthNotesLabel")}</span>
                        <p className="leading-relaxed">{profile.health_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add sessions modal */}
      <Modal
        open={!!addSesiTarget}
        onClose={() => setAddSesiTarget(null)}
        title={t("admin.memberPrivate.addSessionsTitle")}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAddSesiTarget(null)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? t("common.actions.saving") : t("common.actions.save")}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("admin.memberPrivate.fieldSessionCount")} required>
            <Input type="number" min={1} value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">{t("admin.memberPrivate.generateBillLabel")}</span>
            <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
          </div>
          {addSesiForm.generate_bill && (
            <Field label={t("admin.memberPrivate.fieldBatchPackagePrice")} hint={t("admin.memberPrivate.fieldBatchPackagePriceHint")}>
              <Input type="number" min={0} value={addSesiForm.price} onChange={e => setAddSesiForm(f => ({ ...f, price: e.target.value }))} />
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}
