"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Placeholder from "@/components/ui/Placeholder";
import TimePicker from "@/components/ui/TimePicker";
import Modal from "@/components/ui/Modal";
import type { ScheduleSlot, ClassRow, CoachProfile, ClassPackage, MemberAttendanceRow } from "../_types";
import { getSlotTime } from "../_utils";
import type { Database, Json } from "@/types/database";
import { fmtIDR, fmtDate } from "@/lib/utils";

const EMPTY_CLASS_FORM = { name: "", class_type: "reguler", schedule_days: [] as string[], schedule_times: [] as ScheduleSlot[], same_time_all: true, time_start: "", time_end: "", capacity: "", price_monthly: "", price_per_session: "", goals: "", description: "", photo_url: "" };
const DAY_OPTS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

export default function AdminClass({ branchId }: { branchId: string }) {
  const supabase = createClient();
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
    const { data } = await supabase.from("classes")
      .select("id, name, branch_id, status, capacity, enrolled, price_monthly, price_per_session, class_type, schedule_days, time_start, time_end, schedule_times, goals, description, photo_url, spreadsheet_url, spreadsheet_filled, class_coaches(coach_id, role, profile:profiles(full_name, id)), coach_spreadsheets:class_coach_spreadsheets(coach_id, spreadsheet_url, updated_at, coach:profiles(full_name)), packages:class_packages(id, name, sessions, price, sort_order, active)")
      .eq("branch_id", branchId).order("name");
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
    if (role === "head") {
      await supabase.from("class_coaches").update({ role: "assistant" }).eq("class_id", classId).neq("coach_id", coachId);
    }
    const { error } = await supabase.from("class_coaches").update({ role }).eq("class_id", classId).eq("coach_id", coachId);
    setCoachMutating(false);
    if (error) return toast.error(t("admin.classes.changeRoleFailed"), error.message);
    const current = editTarget?.class_coaches ?? [];
    patchClassCoaches(classId, current.map(cc => role === "head"
      ? { ...cc, role: cc.coach_id === coachId ? "head" : "assistant" }
      : (cc.coach_id === coachId ? { ...cc, role: "assistant" } : cc)));
  };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_CLASS_FORM); setOpenForm(true); };
  const openEdit = (c: ClassRow) => {
    setEditTarget(c);
    const slots = c.schedule_times ?? [];
    // Detect if all slots share the same time (or no per-day slots set)
    const uniqueTimes = new Set(slots.map(s => `${s.time_start}|${s.time_end}`));
    const sameTime = slots.length === 0 || uniqueTimes.size === 1;
    setForm({
      name: c.name, class_type: c.class_type ?? "reguler",
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
    setSaving(true);
    // Build schedule_times — use per-day slots; derive global time_start/time_end from first slot
    const days = isPrivate ? (form.schedule_days.length > 0 ? form.schedule_days : []) : form.schedule_days;
    const scheduleTimes: ScheduleSlot[] = form.same_time_all
      ? days.map(day => ({ day, time_start: form.time_start, time_end: form.time_end }))
      : form.schedule_times.filter(s => days.includes(s.day));
    const firstSlot = scheduleTimes[0];

    if (editTarget) {
      const updatePayload: Database["public"]["Tables"]["classes"]["Update"] = { name: form.name, class_type: form.class_type, schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null, time_start: firstSlot?.time_start || form.time_start || undefined, time_end: firstSlot?.time_end || form.time_end || undefined, capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, goals: form.goals.trim() || null, description: form.description.trim() || null };
      const { error } = await supabase.from("classes").update(updatePayload).eq("id", editTarget.id);
      setSaving(false);
      if (error) return toast.error(t("admin.classes.updateClassFailed"), error.message);
      toast.success(t("admin.classes.classUpdatedToast"));
    } else {
      const insertPayload: Database["public"]["Tables"]["classes"]["Insert"] = { name: form.name, class_type: form.class_type, schedule_days: days, schedule_times: (scheduleTimes.length > 0 ? scheduleTimes : null) as Json | null, time_start: firstSlot?.time_start || form.time_start || "", time_end: firstSlot?.time_end || form.time_end || "", capacity: isPrivate ? 1 : (Number(form.capacity) || 0), price_monthly: isPrivate ? 0 : (Number(form.price_monthly) || 0), price_per_session: isPrivate ? (Number(form.price_per_session) || null) : null, goals: form.goals.trim() || null, description: form.description.trim() || null, branch_id: branchId, status: "active", enrolled: 0 };
      const { error } = await supabase.from("classes").insert(insertPayload).select("id").single();
      if (error) { setSaving(false); return toast.error(t("admin.classes.createClassFailed"), error.message); }
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{t("admin.classes.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("admin.classes.pageSub")}</p></div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Btn variant="ghost" icon="archive" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? t("admin.classes.viewActiveBtn") : t("admin.classes.archivedCountBtn", { count: archivedCount })}
            </Btn>
          )}
          {!showArchived && <Btn variant="primary" icon="plus" onClick={openCreate}>{t("admin.classes.addClassBtn")}</Btn>}
        </div>
      </div>
      {showArchived && (
        <div className="flex items-center gap-2 px-4 py-3 bg-archive-50 border border-archive-500/20 rounded-xl text-sm text-archive-600">
          <Icon name="archive" className="w-4 h-4 shrink-0" />
          <span>{t("admin.classes.archivedBannerText", { count: archivedCount })}</span>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleClasses.map((c) => {
          const archived = c.status === "archived";
          const coachNames = [...(c.class_coaches ?? [])]
            .sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0))
            .map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
          const pct = c.enrolled / (c.capacity || 1);
          return (
            <Card key={c.id} padded={false} className={`overflow-hidden${archived ? " opacity-70" : ""}`}>
              <div className="relative">
                {c.photo_url
                  ? <div className="aspect-video w-full overflow-hidden bg-paper-deep"><img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" /></div>
                  : <Placeholder label={c.id} ratio="16/9" className="rounded-none border-0" />
                }
                <div className="absolute top-3 left-3 right-3 flex justify-between gap-2">
                  {archived && <Status kind="archived">{t("admin.classes.archivedBadge")}</Status>}
                </div>
              </div>
              <div className="p-4">
                <div className="font-display font-bold text-ink">{c.name}</div>
                <div className="text-xs text-ink-mute mt-0.5 space-y-0.5">
                  {(c.schedule_days ?? []).length > 0
                    ? (c.schedule_days ?? []).map(day => {
                        const slotT = getSlotTime(c, day);
                        return <div key={day}>{dayLabels[day] ?? day} · {slotT.time_start?.slice(0,5)}{slotT.time_end ? `–${slotT.time_end.slice(0,5)}` : ""}</div>;
                      })
                    : <div>—</div>
                  }
                </div>
                {coachNames.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm"><Avatar name={coachNames[0]!} size={24} /><span className="text-ink-soft font-medium">{coachNames[0]}</span></div>
                )}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
                    <span>{t("admin.classes.capacityLabel")}</span>
                    <span className={`font-mono ${pct >= 1 ? "text-danger-500" : pct > 0.7 ? "text-warn-600" : "text-ok-600"}`}>{c.enrolled}/{c.capacity}</span>
                  </div>
                  <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
                    <div className={`h-full ${pct >= 1 ? "bg-danger-500" : pct > 0.7 ? "bg-warn-500" : "bg-ok-500"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {(c.coach_spreadsheets ?? []).length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ok-600">
                      <Icon name="link" className="w-3 h-3" />{t("admin.classes.spreadsheetCountSuffix", { count: c.coach_spreadsheets!.length })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warn-500">
                      <Icon name="warning" className="w-3 h-3" />{t("admin.classes.noSpreadsheetYet")}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                  {c.class_type === "private" ? (
                    <div>
                      <div className="text-xs text-ink-mute font-semibold">{t("admin.classes.privateLabel")}</div>
                      <div className="text-xs text-ink-mute">{t("admin.classes.activePackagesCount", { count: (c.packages ?? []).filter(p => p.active).length })}</div>
                    </div>
                  ) : (
                    <div className="font-display font-bold text-ocean-700">{fmtIDR(c.price_monthly)}<span className="text-xs text-ink-mute font-semibold">{t("admin.classes.perMonthSuffix")}</span></div>
                  )}
                  <div className="flex gap-1">
                    {archived ? (
                      <button onClick={() => restoreClass(c)} title={t("admin.classes.restoreTitleAttr")} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ok-600 flex items-center justify-center"><Icon name="check" className="w-4 h-4" /></button>
                    ) : (
                      <>
                        {c.class_type === "private" && (
                          <button onClick={() => openPackages(c)} title={t("admin.classes.pricingPackagesTitleAttr")} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="invoice" className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => openClassAtt(c)} title={t("admin.classes.memberAttendanceTitleAttr")} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-wave-600 flex items-center justify-center"><Icon name="calendar" className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(c)} title={t("admin.classes.editClassTitleAttr")} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                        <button onClick={() => archiveClass(c)} title={t("admin.classes.archiveTitleAttr")} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-danger-500 flex items-center justify-center"><Icon name="archive" className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit class modal */}
      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editTarget ? t("admin.classes.editModalTitleEdit", { name: editTarget.name }) : t("admin.classes.addModalTitleAdd")} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpenForm(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveClass} disabled={saving}>{saving ? t("common.actions.saving") : editTarget ? t("admin.classes.saveChangesBtn") : t("admin.classes.saveClassBtn")}</Btn></>}>
        <div className="space-y-4">
          {/* Tipe kelas toggle — hanya saat create */}
          {!editTarget && (
            <Field label={t("admin.classes.fieldClassType")} required>
              <div className="flex gap-2">
                {[["reguler", t("admin.classes.typeRegularLabel"), t("admin.classes.typeRegularDesc")], ["private", t("admin.classes.typePrivateLabel"), t("admin.classes.typePrivateDesc")]].map(([val, label, desc]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, class_type: val, capacity: val === "private" ? "1" : f.capacity }))}
                    className={`flex-1 p-3 rounded-xl border-2 text-left transition-colors ${form.class_type === val ? "border-ocean-500 bg-ocean-50" : "border-line hover:bg-paper-tint"}`}>
                    <div className={`font-bold text-sm ${form.class_type === val ? "text-ocean-700" : "text-ink"}`}>{label}</div>
                    <div className="text-xs text-ink-mute mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </Field>
          )}
          {isPrivate && (
            <div className="bg-wave-50 border border-wave-100 rounded-xl p-3 text-sm text-wave-800 flex gap-2">
              <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-wave-500" />
              <span>{t("admin.classes.privateNotice")}</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.classes.fieldClassName")} required className="sm:col-span-2"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isPrivate ? t("admin.classes.classNamePlaceholderPrivate") : t("admin.classes.classNamePlaceholderRegular")} /></Field>
            {!isPrivate && (
              <>
                <Field label={t("admin.classes.fieldCapacity")} required><Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="15" min="1" /></Field>
                <Field label={t("admin.classes.fieldPricePerMonth")} required hint={form.price_monthly ? `Rp ${Number(form.price_monthly).toLocaleString("id-ID")}` : undefined}>
                  <Input type="text" inputMode="numeric" value={form.price_monthly ? Number(form.price_monthly).toLocaleString("id-ID") : ""}
                    onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value.replace(/\D/g, "") }))}
                    className="font-mono" placeholder="550.000" />
                </Field>
              </>
            )}
            {isPrivate && (
              <Field label={t("admin.classes.fieldPricePerSession")} hint={form.price_per_session ? `Rp ${Number(form.price_per_session).toLocaleString("id-ID")}` : t("admin.classes.pricePerSessionHint")}>
                <Input type="text" inputMode="numeric" value={form.price_per_session ? Number(form.price_per_session).toLocaleString("id-ID") : ""}
                  onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value.replace(/\D/g, "") }))}
                  className="font-mono" placeholder="150.000" />
              </Field>
            )}
          </div>

          {/* Hari & Jam */}
          <div className="block">
            <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">{isPrivate ? t("admin.classes.sessionDaysLabelPref") : t("admin.classes.sessionDaysLabel")}{!isPrivate && <span className="text-danger-500 ml-0.5">*</span>}</span>
            {/* Day picker */}
            <div className="flex flex-wrap gap-2 mt-1">
              {DAY_OPTS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${form.schedule_days.includes(d) ? "bg-ocean-700 text-white border-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  {(dayLabels[d] ?? d).slice(0,3)}
                </button>
              ))}
            </div>

            {/* Jam config — muncul setelah ada hari dipilih */}
            {form.schedule_days.length > 0 && (
              <div className="mt-3 rounded-xl border border-line overflow-hidden">
                {/* Toggle mode */}
                <div className="flex items-center justify-between px-3 py-2 bg-paper-tint border-b border-line">
                  <span className="text-xs font-semibold text-ink-mute">{t("admin.classes.timeSettingsLabel")}</span>
                  <div className="flex rounded-lg border border-line overflow-hidden text-xs font-bold">
                    <button type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        same_time_all: true,
                        // Ambil jam representatif dari slot pertama yang ada
                        time_start: f.schedule_times[0]?.time_start || f.time_start,
                        time_end:   f.schedule_times[0]?.time_end   || f.time_end,
                        // Samakan semua slot ke jam representatif itu
                        schedule_times: f.schedule_times.map(s => ({
                          ...s,
                          time_start: f.schedule_times[0]?.time_start || f.time_start,
                          time_end:   f.schedule_times[0]?.time_end   || f.time_end,
                        })),
                      }))}
                      className={`px-2.5 py-1 transition-colors ${form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"}`}>
                      {t("admin.classes.sameAllDaysBtn")}
                    </button>
                    <button type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        same_time_all: false,
                        // Pastikan semua slot terisi jam terkini dari mode "Sama semua hari"
                        schedule_times: f.schedule_days.map(day => {
                          const existing = f.schedule_times.find(s => s.day === day);
                          return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
                        }),
                      }))}
                      className={`px-2.5 py-1 transition-colors ${!form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"}`}>
                      {t("admin.classes.differentPerDayBtn")}
                    </button>
                  </div>
                </div>

                {form.same_time_all ? (
                  /* Mode: jam sama untuk semua hari */
                  <div className="px-3 py-3 flex gap-3 items-end flex-wrap">
                    <Field label={t("admin.classes.fieldStartTime")} className="flex-1 min-w-[120px]">
                      <TimePicker value={form.time_start}
                        onChange={v => setForm(f => ({
                          ...f,
                          time_start: v,
                          schedule_times: f.schedule_times.map(s => ({ ...s, time_start: v })),
                        }))} />
                    </Field>
                    <Field label={t("admin.classes.fieldEndTime")} className="flex-1 min-w-[120px]">
                      <TimePicker value={form.time_end}
                        onChange={v => setForm(f => ({
                          ...f,
                          time_end: v,
                          schedule_times: f.schedule_times.map(s => ({ ...s, time_end: v })),
                        }))} />
                    </Field>
                    <div className="pb-1 text-xs text-ink-mute self-end">{t("admin.classes.appliesTo", { days: form.schedule_days.map(d => dayLabels[d] ?? d).join(", ") })}</div>
                  </div>
                ) : (
                  /* Mode: jam berbeda per hari */
                  <div className="divide-y divide-line">
                    {DAY_OPTS.filter(d => form.schedule_days.includes(d)).map(day => {
                      const slot = form.schedule_times.find(s => s.day === day) ?? { day, time_start: "", time_end: "" };
                      return (
                        <div key={day} className="px-3 py-2.5 flex items-center gap-3">
                          <span className="w-12 text-xs font-bold text-ink-soft shrink-0">{(dayLabels[day] ?? day).slice(0,3)}</span>
                          <div className="flex gap-2 flex-1">
                            <TimePicker value={slot.time_start} className="flex-1"
                              onChange={v => updateSlotTime(day, "time_start", v)} />
                            <span className="text-ink-faint self-center text-xs">–</span>
                            <TimePicker value={slot.time_end} className="flex-1"
                              onChange={v => updateSlotTime(day, "time_end", v)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <span className="text-xs text-ink-faint mt-1 block">{isPrivate ? t("admin.classes.optionalInfoOnly") : t("admin.classes.pickDaysHint")}</span>
          </div>
          <Field label={t("admin.classes.fieldClassGoals")} hint={t("admin.classes.classGoalsHint")}><Textarea rows={2} value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder={t("admin.classes.classGoalsPlaceholder")} /></Field>
          <Field label={t("admin.classes.fieldClassDescription")} hint={t("admin.classes.classDescriptionHint")}><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("admin.classes.classDescriptionPlaceholder")} /></Field>
          {editTarget && coaches.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{t("admin.classes.teachingCoachesLabel")}</div>
              <div className="space-y-1.5">
                {[...(editTarget.class_coaches ?? [])].sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0)).map(cc => cc.profile && (
                  <div key={cc.coach_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-ocean-50 text-xs">
                    <Avatar name={cc.profile.full_name ?? ""} size={22} />
                    <span className="flex-1 font-semibold text-ocean-700 truncate">{cc.profile.full_name}</span>
                    <button type="button" disabled={coachMutating} onClick={() => setClassCoachRole(editTarget.id, cc.coach_id, "head")}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "head" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                      {t("admin.classes.headRoleBtn")}
                    </button>
                    <button type="button" disabled={coachMutating} onClick={() => setClassCoachRole(editTarget.id, cc.coach_id, "assistant")}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "assistant" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                      {t("admin.classes.assistantRoleBtn")}
                    </button>
                    <button type="button" disabled={coachMutating} onClick={() => removeClassCoach(editTarget.id, cc.coach_id)}
                      className="p-1 rounded-full text-danger-600 hover:bg-danger-50">
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(editTarget.class_coaches?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">{t("admin.classes.noCoachAssigned")}</span>}
              </div>
              {(() => {
                const assignedIds = new Set((editTarget.class_coaches ?? []).map(cc => cc.coach_id));
                const available = coaches.filter(c => !assignedIds.has(c.id));
                if (available.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 mt-2">
                    <select value={addCoachId} onChange={e => setAddCoachId(e.target.value)} disabled={coachMutating}
                      className="flex-1 text-xs rounded-lg border border-line px-2 py-1.5 bg-paper-tint">
                      <option value="">{t("admin.classes.selectCoachToAddPlaceholder")}</option>
                      {available.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    <Btn variant="soft" size="sm" disabled={!addCoachId || coachMutating} onClick={() => addClassCoach(editTarget.id, addCoachId)}>{t("common.actions.add")}</Btn>
                  </div>
                );
              })()}
              <p className="text-[11px] text-ink-faint mt-1.5">{t("admin.classes.maxOneHeadHint")}</p>
            </div>
          )}
          {editTarget && (
            <div className="border-t border-line pt-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("admin.classes.programSpreadsheetLabel")}</div>
              {(editTarget.coach_spreadsheets ?? []).length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-sm text-warn-700">
                  <Icon name="warning" className="w-4 h-4 shrink-0 text-warn-500" />
                  {t("admin.classes.noCoachFilledSpreadsheet")}
                </div>
              ) : (
                <div className="space-y-2">
                  {editTarget.coach_spreadsheets!.map(s => (
                    <div key={s.coach_id} className="flex items-center gap-3 p-3 rounded-xl bg-ok-50 border border-ok-100">
                      <Avatar name={s.coach?.full_name ?? "?"} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ok-700 font-semibold truncate">{s.coach?.full_name ?? s.coach_id}</div>
                        <div className="text-[10px] text-ink-faint font-mono">{new Date(s.updated_at).toLocaleDateString(localeTag)}</div>
                      </div>
                      <a href={s.spreadsheet_url} target="_blank" rel="noreferrer">
                        <Btn variant="soft" size="sm" icon="link">{t("admin.classes.openBtn")}</Btn>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Per-class attendance modal */}
      <Modal open={!!attClass} onClose={() => setAttClass(null)} title={t("admin.classes.attendanceModalTitle", { name: attClass?.name ?? "" })} size="lg"
        footer={<Btn variant="ghost" onClick={() => setAttClass(null)}>{t("common.actions.close")}</Btn>}>
        {loadingAtt2 ? (
          <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.loadingEllipsis")}</div>
        ) : attSessions.length === 0 ? (
          <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.noAttendanceDataForClass")}</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {attSessions.map(s => {
              const hadirCount = s.rows.filter(r => r.status === "hadir").length;
              const isOpen = attExpanded.has(s.date);
              return (
                <div key={s.date} className="border border-line rounded-xl overflow-hidden">
                  <button type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-paper-tint text-left"
                    onClick={() => setAttExpanded(prev => {
                      const next = new Set(prev);
                      if (next.has(s.date)) next.delete(s.date); else next.add(s.date);
                      return next;
                    })}>
                    <span className="flex-1 font-semibold text-sm text-ink">{fmtDate(s.date)}</span>
                    <span className="text-xs font-bold text-ok-600">{t("admin.classes.presentCountSuffix", { count: hadirCount })}</span>
                    <span className="text-xs text-ink-mute">{t("admin.classes.totalCountSuffix", { count: s.rows.length })}</span>
                    <Icon name="chevronD" className={`w-4 h-4 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line divide-y divide-line">
                      {s.rows.map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="flex-1 text-sm text-ink">{r.member?.profile?.full_name ?? "—"}</span>
                          <span className="text-xs text-ink-mute capitalize">{r.method === "manual" ? t("admin.classes.methodManual2") : r.method === "qr" ? t("admin.classes.methodQr2") : r.method ?? "—"}</span>
                          {r.status === "hadir"
                            ? <Status kind="approved" dot={false}>{t("admin.absensi.statusPresent")}</Status>
                            : r.status === "izin"
                            ? <Status kind="excused" dot={false}>{t("admin.absensi.statusExcused")}</Status>
                            : r.status === "sakit"
                            ? <Status kind="sick" dot={false}>{t("admin.absensi.statusSick")}</Status>
                            : <Status kind="rejected" dot={false}>{t("admin.absensi.statusAbsent")}</Status>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Package management modal */}
      <Modal open={!!packageClass} onClose={() => setPackageClass(null)} title={t("admin.classes.pricingModalTitle", { name: packageClass?.name ?? "" })} size="sm"
        footer={<Btn variant="ghost" onClick={() => setPackageClass(null)}>{t("common.actions.close")}</Btn>}>
        <div className="space-y-4">
          {packages.length === 0 ? (
            <div className="text-center py-6 text-ink-mute text-sm">{t("admin.classes.noPackagesYet")}</div>
          ) : (
            <div className="space-y-2">
              {packages.map(pkg => (
                <div key={pkg.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pkg.active ? "border-line bg-white" : "border-line bg-paper-tint opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink truncate">{pkg.name}</div>
                    <div className="text-xs text-ink-mute">{t("admin.classes.sessionsCountSuffix", { count: pkg.sessions })} · {fmtIDR(pkg.price)}</div>
                  </div>
                  <button onClick={() => togglePackageActive(pkg)} className={`text-xs px-2 py-1 rounded-lg font-bold shrink-0 ${pkg.active ? "bg-ok-50 text-ok-600" : "bg-paper-tint text-ink-mute"}`}>
                    {pkg.active ? t("admin.classes.activeBadge2") : t("admin.classes.inactiveBadge2")}
                  </button>
                  <button onClick={() => deletePackage(pkg.id)} className="w-7 h-7 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center shrink-0">
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line pt-4 space-y-3">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{t("admin.classes.addPackageLabel")}</div>
            <Field label={t("admin.classes.fieldPackageName")} hint={t("admin.classes.packageNameHint")}>
              <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder={t("admin.classes.packageNamePlaceholder")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.classes.fieldSessionCount")} required>
                <Input type="number" min={1} value={pkgForm.sessions} onChange={e => setPkgForm(f => ({ ...f, sessions: e.target.value }))} placeholder="10" />
              </Field>
              <Field label={t("admin.classes.fieldPackagePrice")} required>
                <Input type="number" min={0} value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} placeholder="1200000" className="font-mono" />
              </Field>
            </div>
            <Btn variant="primary" size="sm" icon="plus" onClick={savePackage} disabled={savingPkg}>{savingPkg ? t("common.actions.saving") : t("admin.classes.addPackageBtn")}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
