"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";

export default function MemberLeave({ memberId, onSwitchToAbsen }: { memberId: string; onSwitchToAbsen?: () => void }) {
  const { t, tArray } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const [openForm, setOpenForm] = useState(false);
  const [leaves, setLeaves] = useState<{ id: string; date_from: string; date_to: string; type: string; reason: string | null; status: string; reject_reason: string | null; class_ids: string[] }[]>([]);
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ class_ids: [] as string[], start_date: "", end_date: "", type: "izin", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    const [lvRes, clsRes] = await Promise.all([
      supabase.from("member_leaves")
        .select("id, date_from, date_to, type, reason, status, reject_reason, member_leave_classes(class_id)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false }),
      supabase.from("member_classes")
        .select("classes(id, name)")
        .eq("member_id", memberId),
    ]);
    if (lvRes.data) {
      setLeaves(lvRes.data.map((l) => ({
        id: l.id, date_from: l.date_from, date_to: l.date_to, type: l.type,
        reason: l.reason, status: l.status, reject_reason: l.reject_reason,
        class_ids: (l.member_leave_classes as unknown as { class_id: string }[])?.map((x) => x.class_id) ?? [],
      })));
    }
    if (clsRes.data) {
      setMyClasses(clsRes.data.map((mc) => {
        const c = mc.classes as unknown as { id: string; name: string } | null;
        return { id: c?.id ?? "", name: c?.name ?? "" };
      }).filter((c) => c.id));
    }
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const submit = async () => {
    if (!form.start_date || !form.type) return;
    if (form.class_ids.length === 0) {
      return toast.error(t("member.leave.errorNoClassTitle"), t("member.leave.errorNoClassBody"));
    }
    const endDate = form.end_date || form.start_date;
    if (endDate < form.start_date) {
      return toast.error(t("member.leave.errorDateRangeTitle"), t("member.leave.errorDateRangeBody"));
    }
    setSubmitting(true);
    const { data: newLeave, error } = await supabase.from("member_leaves").insert({
      member_id: memberId,
      date_from: form.start_date,
      date_to: form.end_date || form.start_date,
      type: form.type as "izin" | "sakit" | "ujian" | "lainnya",
      reason: form.notes || null,
      status: "pending" as const,
    }).select("id").single();
    // Link to classes via member_leave_classes
    if (!error && newLeave && form.class_ids.length > 0) {
      await supabase.from("member_leave_classes").insert(form.class_ids.map((class_id) => ({ leave_id: newLeave.id, class_id })));
    }
    setSubmitting(false);
    if (!error) {
      setOpenForm(false);
      setForm({ class_ids: [], start_date: "", end_date: "", type: "izin", notes: "" });
      toast.success(t("member.leave.toastSuccessTitle"), t("member.leave.toastSuccessBody"));
      load();
    }
  };

  const monthNames = tArray("common.months.short");

  const getTypeLabel = (type: string) => {
    if (type === "izin") return t("member.leave.typeIzin");
    if (type === "sakit") return t("member.leave.typeSakit");
    if (type === "ujian") return t("member.leave.typeUjian");
    return t("member.leave.typeLainnya");
  };

  const getStatusLabel = (status: string) => {
    if (status === "approved") return t("member.leave.statusApproved");
    if (status === "rejected") return t("member.leave.statusRejected");
    return t("member.leave.statusPending");
  };

  return (
    <div className="space-y-5">
      {onSwitchToAbsen && (
        <div className="flex p-1 bg-white border border-line rounded-xl gap-1 shadow-2xs">
          <button
            type="button"
            onClick={onSwitchToAbsen}
            className="flex-1 py-2 text-xs font-semibold rounded-lg text-ink-mute hover:text-ink text-center transition"
          >
            {t("member.nav.attendance")}
          </button>
          <button
            type="button"
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-ocean-50 text-ocean-700 shadow-2xs text-center"
          >
            {t("member.nav.leave")}
          </button>
        </div>
      )}
      <Btn variant="primary" size="lg" icon="plus" className="w-full" onClick={() => setOpenForm(true)}>{t("member.leave.newLeaveBtn")}</Btn>
      <SectionTitle sub={t("member.leave.historySub")}>{t("member.leave.historyTitle")}</SectionTitle>
      <Card padded={false}>
        <div className="divide-y divide-line">
          {leaves.map((l) => {
            const d = new Date(l.date_from + "T00:00:00");
            const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            const endD = l.date_to && l.date_to !== l.date_from ? new Date(l.date_to + "T00:00:00") : null;
            const dateRange = endD
              ? `${dateStr}–${endD.getDate()} ${monthNames[endD.getMonth()]}`
              : dateStr;
            const typeLabel = getTypeLabel(l.type);
            return (
              <div key={l.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.status === "approved" ? "bg-ok-50 text-ok-600" : l.status === "rejected" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                    <Icon name={l.status === "approved" ? "check" : l.status === "rejected" ? "x" : "info"} className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm">{typeLabel} · {dateRange}</div>
                    <div className="text-xs text-ink-mute">{t("member.leave.appliedOn", { date: dateStr })}{l.reason ? ` · ${l.reason}` : ""}</div>
                  </div>
                  <Status kind={l.status as "approved" | "rejected" | "pending"}>{getStatusLabel(l.status)}</Status>
                </div>
                {l.reject_reason && <div className="mt-2 text-xs text-danger-600 bg-danger-50 rounded-lg p-2.5"><b>{t("member.leave.rejectReasonLabel")}</b> {l.reject_reason}</div>}
              </div>
            );
          })}
          {leaves.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">{t("member.leave.emptyHistory")}</div>}
        </div>
      </Card>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={t("member.leave.modalTitle")}
        footer={<><Btn variant="ghost" onClick={() => setOpenForm(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" disabled={submitting} onClick={submit}>{t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("member.leave.fieldClasses")} required hint={t("member.leave.fieldClassesHint")}>
            <div className="flex flex-wrap gap-2 mt-1">
              {myClasses.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => setForm((f) => ({ ...f, class_ids: f.class_ids.includes(c.id) ? f.class_ids.filter((x) => x !== c.id) : [...f.class_ids, c.id] }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${form.class_ids.includes(c.id) ? "bg-ocean-600 text-white border-ocean-600" : "bg-white text-ink-soft border-line hover:border-ocean-300"}`}>
                  {c.name}
                </button>
              ))}
              {myClasses.length === 0 && <span className="text-sm text-ink-mute">{t("member.leave.noClasses")}</span>}
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("member.leave.startDate")} required><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></Field>
            <Field label={t("member.leave.endDate")}><Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></Field>
          </div>
          <Field label={t("member.leave.fieldLeaveType")} required>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[["izin", t("member.leave.typeIzin")], ["sakit", t("member.leave.typeSakit")], ["ujian", t("member.leave.typeUjian")], ["lainnya", t("member.leave.typeLainnya")]].map(([val, label]) => (
                <label key={val} className={`px-2 py-2 rounded-xl border text-xs font-semibold text-center cursor-pointer ${form.type === val ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  <input type="radio" name="lt" className="sr-only" checked={form.type === val} onChange={() => setForm((f) => ({ ...f, type: val }))} />{label}
                </label>
              ))}
            </div>
          </Field>
          <Field label={t("member.leave.fieldReason")}><Textarea rows={3} placeholder={t("member.leave.reasonPlaceholder")} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
          <div className="text-xs text-ink-mute bg-paper-tint rounded-lg p-3 flex items-start gap-2"><Icon name="info" className="w-4 h-4 mt-0.5 text-wave-600" />{t("member.leave.pendingApprovalHint")}</div>
        </div>
      </Modal>
    </div>
  );
}
