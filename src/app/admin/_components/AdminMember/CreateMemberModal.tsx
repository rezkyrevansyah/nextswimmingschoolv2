"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { fmtIDR } from "@/lib/utils";
import type { AdminMemberHook } from "./_hook";

export default function CreateMemberModal({ hook }: { hook: AdminMemberHook }) {
  const {
    t, openCreate, setOpenCreate, form, setForm, saving, createMember,
    createAvatarPreview, setCreateAvatarFile, setCreateAvatarPreview,
    schoolsList, classes, showCreatePwd, setShowCreatePwd,
  } = hook;

  return (
    <Modal open={openCreate} onClose={() => setOpenCreate(false)} title={t("admin.members.addMemberModalTitle")} size="lg"
      footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={createMember} disabled={saving}>{saving ? t("common.actions.saving") : t("admin.members.saveAndSendWaBtn")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Avatar picker */}
        <div className="sm:col-span-2 flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar
              name={form.full_name || "?"}
              src={createAvatarPreview ?? undefined}
              size={80}
              className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setCreateAvatarFile(f);
              setCreateAvatarPreview(f ? URL.createObjectURL(f) : null);
            }} />
          </label>
          <p className="text-xs text-ink-faint">{t("admin.coaches.profilePhotoOptionalHint")}</p>
        </div>
        <Field label={t("admin.coaches.fieldFullName2")} required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
        <Field label={t("admin.members.rowBirthDateFull")}><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
        <Field label={t("admin.coaches.rowGender2")}>
          <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">{t("admin.members.selectDashPlaceholder")}</option>
            <option value="male">{t("admin.approvement.genderMale")}</option>
            <option value="female">{t("admin.approvement.genderFemale")}</option>
          </Select>
        </Field>
        <Field label={t("admin.members.fieldMemberType")} required hint={t("admin.members.addPrivateElsewhereHint")}>
          <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="reguler">{t("admin.members.typeRegularFull")}</option><option value="school_affiliate">{t("admin.members.typeAffiliateFull")}</option>
          </Select>
        </Field>
        {form.type === "school_affiliate" && (
          <>
            <Field label={t("admin.members.fieldSchoolAffiliate")}>
              <Select value={form.school_id} onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">{t("admin.members.selectSchoolPlaceholder")}</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label={t("admin.members.fieldSchoolGrade")} hint={t("admin.members.fieldSchoolGradeHint")}>
              <Input
                value={form.school_grade}
                onChange={e => setForm(f => ({ ...f, school_grade: e.target.value }))}
                placeholder={t("admin.members.fieldSchoolGradePlaceholder")}
              />
            </Field>
          </>
        )}
        <Field label={t("admin.members.fieldAssignClass")} hint={form.type === "private" ? t("admin.members.privateClassesOnlyHint") : t("admin.members.regularClassesOnlyHint")}>
          <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">{t("admin.members.dashSelectClassPlaceholder")}</option>
            {classes.filter(c => c.class_type === form.type || (form.type === "school_affiliate" && c.class_type === "reguler")).map(c => <option key={c.id} value={c.id}>{c.name} ({c.enrolled}/{c.capacity})</option>)}
          </Select>
        </Field>
        {form.type === "private" && (
          <Field label={t("admin.members.fieldSessionCount2")} required hint={t("admin.members.pricePerSessionHintPrefix", { price: classes.find(c => c.id === form.class_id)?.price_per_session ? fmtIDR(classes.find(c => c.id === form.class_id)!.price_per_session!) : "—" })}>
            <Input type="number" min="1" value={form.jumlah_sesi} onChange={e => setForm(f => ({ ...f, jumlah_sesi: e.target.value }))} placeholder="Mis. 8" />
          </Field>
        )}
        <Field label={t("admin.members.fieldMemberPhone")}>
          <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Field label={t("admin.members.fieldContactOwner")}>
          <Select value={form.phone_owner} onChange={e => setForm(f => ({ ...f, phone_owner: e.target.value }))}>
            <option value="self">{t("admin.members.ownedByMemberOpt")}</option>
            <option value="parent">{t("admin.members.ownedByParentOpt")}</option>
          </Select>
        </Field>
        {form.phone_owner === "parent" && (
          <>
            <Field label={t("admin.members.fieldParentName2")}><Input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={t("admin.members.fieldParentPhone2")}><Input type="tel" value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>
        )}
        <Field label={t("admin.coaches.fieldAddress2")} className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
        <Field label={t("admin.members.fieldHealthNotes3")} className="sm:col-span-2" hint={t("admin.members.healthNotesHint")}><Textarea rows={2} value={form.health_notes} onChange={e => setForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        <Field label={t("admin.schoolPanel.loginEmailLabel")} required><Input type="email" autoComplete="off" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <Field label={t("admin.members.fieldPassword")} required hint={t("admin.coaches.minCharsHint")}>
          <div className="relative">
            <Input type={showCreatePwd ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowCreatePwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
              <Icon name={showCreatePwd ? "eye-off" : "eye"} className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
