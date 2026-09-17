"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";
import type { ClassRow } from "../../_types";

export default function LeaveForm({ back, coachId, branchId, classes }: { back: () => void; coachId: string; branchId?: string; classes: ClassRow[] }) {
  const toast = useToast();
  const supabase = createClient();
  const { t } = useLocale();
  const [type, setType] = useState("sakit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  // selectedClasses: array of { class_id, substitute_id } — one entry per checked class
  const [selectedClasses, setSelectedClasses] = useState<{ class_id: string; substitute_id: string }[]>([]);
  const [allCoaches, setAllCoaches] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Cross-branch: load ALL active coaches (not filtered by branchId)
    const today = new Date().toISOString().split("T")[0];
    supabase.from("profiles")
      .select("id, full_name, suspend_until")
      .eq("role", "coach")
      .neq("id", coachId)
      .order("full_name")
      .then(({ data }) => {
        if (!data) return;
        const active = (data as { id: string; full_name: string; suspend_until: string | null }[])
          .filter(c => !c.suspend_until || c.suspend_until < today);
        setAllCoaches(active);
      });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleClass = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses(prev => [...prev, { class_id: classId, substitute_id: "" }]);
    } else {
      setSelectedClasses(prev => prev.filter(c => c.class_id !== classId));
    }
  };

  const setSubstituteForClass = (classId: string, substituteId: string) => {
    setSelectedClasses(prev => prev.map(c => c.class_id === classId ? { ...c, substitute_id: substituteId } : c));
  };

  const canSubmit = selectedClasses.length > 0 && selectedClasses.every(c => !!c.substitute_id);

  const submit = async () => {
    if (!startDate || !endDate) return toast.error(t("coach.leave.startEndDateRequired"));
    if (selectedClasses.length === 0) return toast.error(t("coach.leave.selectAtLeastOneClass"));
    if (!selectedClasses.every(c => c.substitute_id)) return toast.error(t("coach.leave.everyClassNeedsSubstitute"));
    setSaving(true);

    const { data: leave, error } = await supabase.from("coach_leaves").insert({
      coach_id: coachId,
      branch_id: branchId || null,
      type: type as "izin" | "sakit" | "lainnya",
      date_from: startDate, date_to: endDate,
      reason: reason || null,
      status: "pending" as const,
      // backward compat: primary substitute = first class's substitute
      substitute_id: selectedClasses[0]?.substitute_id || null,
    }).select("id").single();

    if (error || !leave) { toast.error(t("coach.leave.submitLeaveFailed"), error?.message ?? ""); setSaving(false); return; }

    // Insert per-class entries with individual substitute_id
    await supabase.from("coach_leave_classes").insert(
      selectedClasses.map(c => ({
        leave_id: leave.id,
        class_id: c.class_id,
        substitute_id: c.substitute_id || null,
      }))
    );

    setSaving(false);
    toast.success(t("coach.leave.requestSentToast"), t("coach.leave.awaitingAdminApproval"));
    back();
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={back} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> {t("coach.clockIn.backBtn")}
      </button>
      <Card>
        <SectionTitle sub={t("coach.leave.formSub")}>{t("coach.leave.formTitle")}</SectionTitle>
        <div className="space-y-4">
          <Field label={t("coach.leave.fieldLeaveType")} required>
            <div className="grid grid-cols-3 gap-2">
              {[["izin", t("coach.leave.typeIzin")], ["sakit", t("coach.leave.typeSakit")], ["lainnya", t("coach.leave.typeLainnya")]].map(([val, label]) => (
                <label key={val} className={`px-3 py-2 rounded-xl border text-sm font-semibold text-center cursor-pointer ${type === val ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  <input type="radio" name="leave" className="sr-only" checked={type === val} onChange={() => setType(val)} />{label}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("coach.leave.fieldStart")} required><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
            <Field label={t("coach.leave.fieldEnd")} required><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
          </div>

          <Field label={t("coach.leave.fieldAffectedClasses")} required hint={t("coach.leave.affectedClassesHint")}>
            <div className="space-y-2 mt-1">
              {classes.length === 0 && <p className="text-xs text-ink-mute">{t("coach.leave.noClassesRegistered")}</p>}
              {classes.map(c => {
                const sel = selectedClasses.find(s => s.class_id === c.id);
                const isChecked = !!sel;
                const scheduleLabel = `${(c.schedule_days ?? []).join(", ")} ${c.time_start?.slice(0, 5) ?? ""}${c.time_end ? `–${c.time_end.slice(0, 5)}` : ""}`.trim();
                return (
                  <div key={c.id} className={`rounded-xl border transition-colors ${isChecked ? "border-ocean-400 bg-ocean-50/40" : "border-line"}`}>
                    <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => toggleClass(c.id, e.target.checked)}
                        className="mt-0.5 accent-ocean-600 w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{c.name}</div>
                        {scheduleLabel && <div className="text-xs text-ink-mute">{scheduleLabel}</div>}
                      </div>
                      {isChecked && (
                        sel?.substitute_id
                          ? <Icon name="check" className="w-4 h-4 text-ok-600 shrink-0 mt-0.5" />
                          : <Icon name="warn" className="w-4 h-4 text-warn-500 shrink-0 mt-0.5" />
                      )}
                    </label>
                    {isChecked && (
                      <div className="px-3 pb-2.5">
                        <Select
                          value={sel?.substitute_id ?? ""}
                          onChange={e => setSubstituteForClass(c.id, e.target.value)}
                        >
                          <option value="">{t("coach.leave.selectSubstitutePlaceholder")}</option>
                          {allCoaches.map(coach => (
                            <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                          ))}
                        </Select>
                        {!sel?.substitute_id && (
                          <p className="text-xs text-warn-600 mt-1">{t("coach.leave.substituteRequiredForClass")}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Field>

          <Field label={t("coach.leave.fieldReasonDesc")}><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder={t("coach.leave.reasonPlaceholder")} /></Field>
          <Btn variant="primary" size="lg" className="w-full" onClick={submit} disabled={saving || !canSubmit}>
            {saving ? t("coach.leave.sendingBtn") : !canSubmit && selectedClasses.length > 0 ? t("coach.leave.completeSubstitutesBtn") : t("coach.leave.submitRequestBtn")}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
