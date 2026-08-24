"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import type { School } from "../_types";
import { parseUserApiError } from "../_utils";
import { waLink } from "@/lib/utils";

const EMPTY_SCHOOL_FORM = { name: "", email: "", password: "", pic_name: "", pic_phone: "" };

export default function AdminSchoolPanel({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_SCHOOL_FORM);
  const [createdCredential, setCreatedCredential] = useState<{ name: string; email: string; password: string; pic_phone: string } | null>(null);
  const [showSchoolPwd, setShowSchoolPwd] = useState(false);
  // Detail / edit
  const [detailTarget, setDetailTarget] = useState<School | null>(null);
  const [editTarget, setEditTarget] = useState<School | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", pic_name: "", pic_phone: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("schools").select("id, name, email, profile_id, pic_name, pic_phone").eq("branch_id", branchId).order("name");
    if (data) setSchools(data as School[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const create = async () => {
    if (!form.name || !form.email || !form.password) return toast.error(t("admin.schoolPanel.nameEmailPasswordRequired"));
    if (form.password.length < 6) return toast.error(t("admin.schoolPanel.passwordMinLength"));
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.name, role: "school", branch_id: branchId }),
    });
    const json = await res.json() as { user_id?: string; error?: string; code?: string };
    if (!res.ok) { const [errT, errS, errD] = parseUserApiError(json, t); toast.error(errT, errS, errD); setSaving(false); return; }

    const { error } = await supabase.from("schools").insert({
      branch_id: branchId, name: form.name, email: form.email,
      profile_id: json.user_id ?? null,
      pic_name: form.pic_name || null, pic_phone: form.pic_phone || null,
    });
    setSaving(false);
    if (error) return toast.error(t("admin.schoolPanel.addSchoolFailed"), error.message);
    toast.success(t("admin.schoolPanel.schoolAddedToast"));
    setCreatedCredential({ name: form.name, email: form.email, password: form.password, pic_phone: form.pic_phone });
    setOpenAdd(false);
    setForm(EMPTY_SCHOOL_FORM);
    load();
  };

  const openEdit = (s: School) => {
    setEditTarget(s);
    setEditForm({ name: s.name, email: s.email ?? "", pic_name: s.pic_name ?? "", pic_phone: s.pic_phone ?? "" });
  };

  const saveEdit = async () => {
    if (!editTarget || !editForm.name) return toast.error(t("admin.schoolPanel.schoolNameRequired"));
    setEditSaving(true);
    const { error } = await supabase.from("schools").update({
      name: editForm.name, email: editForm.email || null,
      pic_name: editForm.pic_name || null, pic_phone: editForm.pic_phone || null,
    }).eq("id", editTarget.id);
    setEditSaving(false);
    if (error) return toast.error(t("admin.schoolPanel.saveFailed"), error.message);
    toast.success(t("admin.schoolPanel.schoolUpdatedToast"));
    setEditTarget(null);
    // Refresh detail jika sedang dibuka
    if (detailTarget?.id === editTarget.id) {
      setDetailTarget(s => s ? { ...s, ...editForm, email: editForm.email || null, pic_name: editForm.pic_name || null, pic_phone: editForm.pic_phone || null } : null);
    }
    load();
  };

  const deleteSchool = async (s: School) => {
    const ok = await confirm({ title: t("admin.schoolPanel.deleteConfirmTitle"), body: t("admin.schoolPanel.deleteConfirmBody", { name: s.name }), confirmLabel: t("common.actions.delete"), danger: true });
    if (!ok) return;
    // Hapus auth.users jika ada profile terkait
    if (s.profile_id) {
      await fetch(`/api/admin/users/${s.profile_id}`, { method: "DELETE" });
    } else {
      const { error } = await supabase.from("schools").delete().eq("id", s.id);
      if (error) return toast.error(t("admin.schoolPanel.deleteFailed"), error.message);
    }
    toast.success(t("admin.schoolPanel.schoolDeletedToast"));
    if (detailTarget?.id === s.id) setDetailTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{t("admin.schoolPanel.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("admin.schoolPanel.pageSub")}</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_SCHOOL_FORM); setOpenAdd(true); }}>{t("admin.schoolPanel.addSchoolBtn")}</Btn>
      </div>
      {loading ? <div className="text-ink-mute text-sm">{t("admin.schoolPanel.loading")}</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          {schools.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-lift transition" onClick={() => setDetailTarget(s)}>
              <div className="flex items-start gap-3">
                <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center shrink-0"><Icon name="school" className="w-7 h-7" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-ink">{s.name}</div>
                  <div className="text-xs text-ink-mute mt-0.5">{s.email ?? "—"}</div>
                  {s.pic_name && <div className="text-xs text-ink-soft mt-0.5">{t("admin.schoolPanel.picLine", { name: s.pic_name })}{s.pic_phone ? ` · ${s.pic_phone}` : ""}</div>}
                  <div className="mt-2.5 flex gap-2">
                    <Status kind={s.profile_id ? "active" : "warn"}>{s.profile_id ? t("admin.schoolPanel.accountActiveStatus") : t("admin.schoolPanel.noAccountYetStatus")}</Status>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {schools.length === 0 && <p className="text-ink-mute">{t("admin.schoolPanel.emptyState")}</p>}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detailTarget && !editTarget} onClose={() => setDetailTarget(null)} title={t("admin.schoolPanel.detailModalTitle")} size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { const s = detailTarget!; setDetailTarget(null); deleteSchool(s); }}>{t("common.actions.delete")}</Btn>
            <div className="flex-1" />
            <Btn variant="ghost" onClick={() => setDetailTarget(null)}>{t("common.actions.close")}</Btn>
            <Btn variant="primary" icon="edit" onClick={() => openEdit(detailTarget!)}>{t("common.actions.edit")}</Btn>
          </div>
        }>
        {detailTarget && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <span className="w-14 h-14 rounded-2xl bg-ocean-700 text-white flex items-center justify-center shrink-0"><Icon name="school" className="w-7 h-7" /></span>
              <div>
                <div className="font-display font-bold text-lg text-ink">{detailTarget.name}</div>
                <Status kind={detailTarget.profile_id ? "active" : "warn"}>{detailTarget.profile_id ? t("admin.schoolPanel.accountActiveStatus") : t("admin.schoolPanel.noAccountYetStatus")}</Status>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-ink-mute">{t("admin.schoolPanel.loginEmailLabel")}</span>
                <span className="font-mono text-ink">{detailTarget.email ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-ink-mute">{t("admin.schoolPanel.picNameLabel")}</span>
                <span className="font-semibold text-ink">{detailTarget.pic_name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-ink-mute">{t("admin.schoolPanel.picPhoneLabel")}</span>
                <span className="font-semibold text-ink">{detailTarget.pic_phone ?? "—"}</span>
              </div>
            </div>
            {detailTarget.pic_phone && (
              <a href={waLink(t("admin.schoolPanel.waDetailMessage", { pic: detailTarget.pic_name ?? "", school: detailTarget.name, email: detailTarget.email ?? "", url: typeof window !== "undefined" ? window.location.origin : "" }), detailTarget.pic_phone)} target="_blank" rel="noreferrer" className="block">
                <Btn variant="wa" icon="whatsapp" className="w-full">{t("admin.schoolPanel.contactPicWaBtn")}</Btn>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t("admin.schoolPanel.editModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.schoolPanel.fieldSchoolName")} required><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label={t("admin.schoolPanel.loginEmailLabel")}><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.schoolPanel.picNameLabel")}><Input value={editForm.pic_name} onChange={e => setEditForm(f => ({ ...f, pic_name: e.target.value }))} placeholder={t("admin.schoolPanel.picNamePlaceholder")} /></Field>
            <Field label={t("admin.schoolPanel.picPhoneLabel")}><Input value={editForm.pic_phone} onChange={e => setEditForm(f => ({ ...f, pic_phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
        </div>
      </Modal>

      {/* Add school modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={t("admin.schoolPanel.addSchoolModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={create} disabled={saving}>{saving ? t("common.actions.saving") : t("admin.schoolPanel.createSchoolBtn")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.schoolPanel.fieldSchoolName")} required><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("admin.schoolPanel.schoolNamePlaceholder")} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.schoolPanel.picNameLabel")}><Input value={form.pic_name} onChange={e => setForm(f => ({ ...f, pic_name: e.target.value }))} placeholder={t("admin.schoolPanel.picNamePlaceholder")} /></Field>
            <Field label={t("admin.schoolPanel.picPhoneLabel")} hint={t("admin.schoolPanel.picPhoneHintAdd")}><Input value={form.pic_phone} onChange={e => setForm(f => ({ ...f, pic_phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
          <Field label={t("admin.schoolPanel.loginEmailLabel")} required hint={t("admin.schoolPanel.fieldEmailHint")}><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label={t("admin.schoolPanel.fieldPasswordLabel")} required hint={t("admin.schoolPanel.fieldPasswordHint")}>
            <div className="relative">
              <Input type={showSchoolPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowSchoolPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showSchoolPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>

      {/* Credential popup after create */}
      <Modal open={!!createdCredential} onClose={() => setCreatedCredential(null)} title={t("admin.schoolPanel.credentialModalTitle")} size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Btn variant="ghost" onClick={() => setCreatedCredential(null)}>{t("common.actions.close")}</Btn>
            <div className="flex-1" />
            {createdCredential?.pic_phone && (
              <a href={waLink(t("admin.schoolPanel.waCredentialMessage", { school: createdCredential.name, email: createdCredential.email, password: createdCredential.password, url: typeof window !== "undefined" ? window.location.origin : "" }))} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">{t("admin.schoolPanel.sendToWaPicBtn")}</Btn>
              </a>
            )}
          </div>
        }>
        <div className="space-y-4">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-start gap-2.5 text-sm text-ok-700"><Icon name="check" className="w-5 h-5 shrink-0 mt-0.5" /><span>{t("admin.schoolPanel.accountCreatedNotice")}</span></div>
          </Card>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">{t("admin.schoolPanel.schoolLabel")}</span><span className="font-semibold text-ink">{createdCredential?.name}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">{t("admin.schoolPanel.emailLabel")}</span><span className="font-mono text-ink">{createdCredential?.email}</span></div>
            <div className="flex justify-between p-3 rounded-lg bg-paper-tint"><span className="text-ink-mute">{t("admin.schoolPanel.passwordLabel")}</span><span className="font-mono text-ink">{createdCredential?.password}</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
