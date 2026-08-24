"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import type { ClassRow } from "../_types";
import { fmtDate } from "@/lib/utils";

interface Announcement {
  id: string; title: string; body: string; target_all: boolean; active: boolean;
  valid_until: string | null; created_at: string;
  target_roles: string[];
}

function buildRoleLabels(t: (key: string) => string) {
  return [
    { value: "member", label: t("admin.pengumuman.memberRole") },
    { value: "coach",  label: t("admin.pengumuman.coachRole") },
    { value: "admin",  label: t("admin.pengumuman.adminBranchRole") },
    { value: "school", label: t("admin.pengumuman.schoolRole") },
  ] as const;
}

export default function AdminPengumuman({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const ANNOUNCEMENT_ROLE_LABELS = buildRoleLabels(t);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState({ title: "", body: "", target: "all", target_roles: ["member"] as string[], valid_from: "", valid_until: "", class_ids: [] as string[] });

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter(r => r !== role)
        : [...f.target_roles, role],
    }));
  };

  const load = useCallback(async () => {
    const { data } = await supabase.from("announcements")
      .select("id, title, body, target_all, active, valid_until, created_at, target_roles, announcement_classes(class_id, class:classes(name))")
      .eq("branch_id", branchId).order("created_at", { ascending: false });
    if (data) setAnnouncements(data as unknown as Announcement[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    supabase.from("classes").select("id, name, time_start, time_end, status, branch_id, capacity, enrolled, schedule_days, price_monthly")
      .eq("branch_id", branchId).eq("status", "active").order("name")
      .then(({ data }) => { if (data) setClasses(data as unknown as ClassRow[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleClass = (id: string) => {
    setForm(f => ({
      ...f,
      class_ids: f.class_ids.includes(id) ? f.class_ids.filter(x => x !== id) : [...f.class_ids, id],
    }));
  };

  const create = async () => {
    if (!form.title || !form.body) return toast.error(t("admin.pengumuman.titleBodyRequired"));
    if (form.target === "class" && form.class_ids.length === 0) return toast.error(t("admin.pengumuman.selectAtLeastOneClass"));
    if (form.target_roles.length === 0) return toast.error(t("admin.pengumuman.selectAtLeastOneRecipient"));
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { data: ann, error } = await supabase.from("announcements").insert({
      branch_id: branchId, title: form.title, body: form.body,
      target_all: form.target === "all", active: true,
      target_roles: form.target_roles,
      valid_from: form.valid_from || new Date().toISOString().slice(0, 10),
      valid_until: form.valid_until || null, created_by: user?.id ?? "",
    }).select("id").single();
    if (error || !ann) { setSaving(false); return toast.error(t("admin.pengumuman.createFailed"), error?.message); }
    if (form.target === "class" && form.class_ids.length > 0) {
      await supabase.from("announcement_classes").insert(form.class_ids.map(class_id => ({ announcement_id: ann.id, class_id })));
    }
    // Send notifications based on selected roles
    const today = new Date().toISOString().slice(0, 10);
    const notifBody = `${form.title}: ${form.body.slice(0, 80)}${form.body.length > 80 ? "…" : ""}`;
    let targetUserIds: string[] = [];

    // MEMBER
    if (form.target_roles.includes("member")) {
      if (form.target === "all") {
        const { data: mRows } = await supabase.from("members").select("id").eq("branch_id", branchId).eq("status", "active");
        targetUserIds.push(...(mRows ?? []).map(m => m.id as string));
      } else if (form.class_ids.length > 0) {
        const { data: mcRows } = await supabase.from("member_classes").select("member_id").in("class_id", form.class_ids);
        targetUserIds.push(...[...new Set((mcRows ?? []).map(mc => mc.member_id as string))]);
      }
    }

    // COACH — get coaches of classes in this branch
    if (form.target_roles.includes("coach")) {
      const { data: clsRows } = await supabase.from("classes").select("id").eq("branch_id", branchId).eq("status", "active");
      const branchClassIds = (clsRows ?? []).map(c => (c as { id: string }).id);
      if (branchClassIds.length > 0) {
        const { data: ccRows } = await supabase.from("class_coaches").select("coach_id").in("class_id", branchClassIds);
        const coachIds = [...new Set((ccRows ?? []).map(cc => (cc as { coach_id: string }).coach_id))];
        targetUserIds.push(...coachIds);
      }
    }

    // ADMIN
    if (form.target_roles.includes("admin")) {
      const { data: admRows } = await supabase.from("profiles").select("id").eq("role", "admin").eq("branch_id", branchId);
      targetUserIds.push(...(admRows ?? []).map(a => (a as { id: string }).id));
    }

    // SCHOOL — school_affiliate members
    if (form.target_roles.includes("school")) {
      const { data: sRows } = await supabase.from("members").select("id").eq("branch_id", branchId).eq("type", "school_affiliate").eq("status", "active");
      targetUserIds.push(...(sRows ?? []).map(s => (s as { id: string }).id));
    }

    const uniqueIds = [...new Set(targetUserIds)];
    if (uniqueIds.length > 0) {
      await supabase.from("notifications").insert(
        uniqueIds.map(uid => ({ user_id: uid, title: t("admin.pengumuman.newAnnouncementNotifTitle"), body: notifBody, icon: "bell", kind: "info", created_at: today }))
      );
    }
    setSaving(false);
    toast.success(t("admin.pengumuman.createdToast"));
    setOpenAdd(false);
    setForm({ title: "", body: "", target: "all", target_roles: ["member"], valid_from: "", valid_until: "", class_ids: [] });
    load();
  };

  const deactivate = async (id: string) => {
    await supabase.from("announcements").update({ active: false }).eq("id", id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: false } : a));
    toast.success(t("admin.pengumuman.deactivatedToast"));
  };

  const activate = async (id: string) => {
    await supabase.from("announcements").update({ active: true }).eq("id", id);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: true } : a));
    toast.success(t("admin.pengumuman.activatedToast"));
  };

  const deleteAnn = async (id: string) => {
    const ok = await confirm({ body: t("admin.pengumuman.deleteConfirmBody") });
    if (!ok) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(t("admin.pengumuman.deleteFailed"), error.message);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast.success(t("admin.pengumuman.deletedToast"));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{t("admin.pengumuman.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("admin.pengumuman.pageSub")}</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ title: "", body: "", target: "all", target_roles: ["member"], valid_from: "", valid_until: "", class_ids: [] }); setOpenAdd(true); }}>{t("admin.pengumuman.createBtn")}</Btn>
      </div>
      {loading ? <div className="text-ink-mute text-sm">{t("admin.pengumuman.loading")}</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {announcements.map((a) => {
            const annClasses = (a as unknown as { announcement_classes?: { class_id: string; class?: { name: string } | null }[] }).announcement_classes;
            return (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0"><Icon name="bell" className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-display font-bold text-ink">{a.title}</h3><Status kind={a.active ? "active" : "inactive"}>{a.active ? t("admin.pengumuman.activeStatus") : t("admin.pengumuman.inactiveStatus")}</Status></div>
                    <div className="text-xs text-ink-mute mt-1 flex flex-wrap items-center gap-1.5">
                      {a.valid_until && <span>{t("admin.pengumuman.validUntilLine", { date: fmtDate(a.valid_until) })}</span>}
                      <span>{t("admin.pengumuman.targetLabel")} <b>{a.target_all ? t("admin.pengumuman.targetAll") : annClasses && annClasses.length > 0 ? annClasses.map(ac => ac.class?.name ?? "").join(", ") : t("admin.pengumuman.targetSpecific")}</b></span>
                      {(a.target_roles ?? []).length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {ANNOUNCEMENT_ROLE_LABELS.filter(r => (a.target_roles ?? []).includes(r.value)).map(r => (
                            <span key={r.value} className="px-1.5 py-0.5 rounded-md bg-ocean-50 text-ocean-700 text-[10px] font-bold border border-ocean-100">{r.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-ink-soft mt-3 leading-relaxed">{a.body}</p>
                    <div className="mt-4 flex gap-2">
                      {a.active
                        ? <Btn variant="ghost" size="sm" onClick={() => deactivate(a.id)}>{t("admin.pengumuman.deactivateBtn")}</Btn>
                        : <Btn variant="soft" size="sm" icon="check" onClick={() => activate(a.id)}>{t("admin.pengumuman.activateBtn")}</Btn>
                      }
                      <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => deleteAnn(a.id)}>{t("common.actions.delete")}</Btn>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {announcements.length === 0 && <p className="text-ink-mute">{t("admin.pengumuman.emptyState")}</p>}
        </div>
      )}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={t("admin.pengumuman.createBtn")}
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? t("common.actions.saving") : t("admin.pengumuman.publishBtn")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.pengumuman.fieldTitle")} required><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></Field>
          <Field label={t("admin.pengumuman.fieldBody")} required><Textarea rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></Field>
          <Field label={t("admin.pengumuman.fieldRecipients")} required hint={t("admin.pengumuman.fieldRecipientsHint")}>
            <div className="flex flex-wrap gap-2 mt-1">
              {ANNOUNCEMENT_ROLE_LABELS.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => toggleRole(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${form.target_roles.includes(value) ? "bg-ocean-600 text-white border-ocean-600" : "bg-white text-ink-soft border-line hover:border-ocean-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.pengumuman.fieldMemberTarget")}>
              <Select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value, class_ids: [] }))}>
                <option value="all">{t("admin.pengumuman.targetAllMembers")}</option>
                <option value="class">{t("admin.pengumuman.targetPerClass")}</option>
              </Select>
            </Field>
            <Field label={t("admin.pengumuman.fieldValidFrom")} hint={t("admin.pengumuman.validFromHint")}><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></Field>
          </div>
          <Field label={t("admin.pengumuman.fieldValidUntil")} hint={t("admin.pengumuman.validUntilHint")}><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></Field>
          {form.target === "class" && (
            <Field label={t("admin.pengumuman.fieldSelectClasses")} hint={t("admin.pengumuman.selectClassesHint")}>
              <div className="flex flex-wrap gap-2 mt-1">
                {classes.map(c => (
                  <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${form.class_ids.includes(c.id) ? "bg-ocean-600 text-white border-ocean-600" : "bg-white text-ink-soft border-line hover:border-ocean-300"}`}>
                    {c.name}
                  </button>
                ))}
                {classes.length === 0 && <span className="text-sm text-ink-mute">{t("admin.pengumuman.noActiveClasses")}</span>}
              </div>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}
