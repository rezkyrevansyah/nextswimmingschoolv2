"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import type { AdminMemberHook } from "./_hook";

export default function MemberEditModal({ hook }: { hook: AdminMemberHook }) {
  const {
    t, detail, openEditMember, setOpenEditMember, editMemberForm, setEditMemberForm, savingEdit, saveMemberEdit,
    editAvatarPreview, setEditAvatarFile, setEditAvatarPreview, schoolsList, classes,
  } = hook;

  return (
    <Modal open={openEditMember} onClose={() => setOpenEditMember(false)} title={t("admin.members.editMemberModalTitle", { name: detail?.profile?.full_name ?? "" })} size="lg"
      footer={<><Btn variant="ghost" onClick={() => setOpenEditMember(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveMemberEdit} disabled={savingEdit}>{savingEdit ? t("common.actions.saving") : t("admin.members.saveChangesBtn2")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Avatar picker */}
        <div className="sm:col-span-2 flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar
              name={editMemberForm.full_name || detail?.profile?.full_name || ""}
              src={editAvatarPreview ?? detail?.profile?.avatar_url ?? undefined}
              size={80}
              className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setEditAvatarFile(f);
              setEditAvatarPreview(f ? URL.createObjectURL(f) : null);
            }} />
          </label>
          <p className="text-xs text-ink-faint">{t("admin.coaches.clickToChangePhotoHint")}</p>
        </div>
        {/* Identitas */}
        <Field label={t("admin.coaches.fieldFullName2")} required><Input value={editMemberForm.full_name} onChange={e => setEditMemberForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
        <Field label={t("admin.coaches.fieldEmail2")} hint={t("admin.members.emailLoginChangeHint")}><Input type="email" placeholder="nama@email.com" value={editMemberForm.email} onChange={e => setEditMemberForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <Field label={t("admin.members.fieldMemberNo")} hint={t("admin.members.memberNoHint")}>
          <div className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-paper-tint text-sm font-mono text-ink-soft flex items-center">
            {editMemberForm.member_no || "—"}
          </div>
        </Field>
        <Field label={t("admin.members.rowBirthDateFull")}><DatePicker value={editMemberForm.birth_date} onChange={v => setEditMemberForm(f => ({ ...f, birth_date: v }))} /></Field>
        <Field label={t("admin.coaches.rowGender2")}>
          <Select value={editMemberForm.gender} onChange={e => setEditMemberForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">{t("admin.members.selectDashPlaceholder")}</option>
            <option value="male">{t("admin.approvement.genderMale")}</option>
            <option value="female">{t("admin.approvement.genderFemale")}</option>
          </Select>
        </Field>
        <Field label={t("admin.members.fieldMemberType")} required hint={detail?.type === "private" ? t("admin.members.privateManagedElsewhereHint") : t("admin.members.addPrivateElsewhereHint")}>
          {detail?.type === "private" ? (
            <Select value="private" disabled><option value="private">{t("admin.members.typePrivateFull")}</option></Select>
          ) : (
            <Select value={editMemberForm.type} onChange={e => setEditMemberForm(f => ({ ...f, type: e.target.value }))}>
              <option value="reguler">{t("admin.members.typeRegularFull")}</option>
              <option value="school_affiliate">{t("admin.members.typeAffiliateFull")}</option>
            </Select>
          )}
        </Field>
        {editMemberForm.type === "school_affiliate" && (
          <>
            <Field label={t("admin.members.fieldSchoolAffiliate")}>
              <Select value={editMemberForm.school_id} onChange={e => setEditMemberForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">{t("admin.members.selectSchoolPlaceholder")}</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label={t("admin.members.fieldSchoolGrade")} hint={t("admin.members.fieldSchoolGradeHint")}>
              <Input
                value={editMemberForm.school_grade}
                onChange={e => setEditMemberForm(f => ({ ...f, school_grade: e.target.value }))}
                placeholder={t("admin.members.fieldSchoolGradePlaceholder")}
              />
            </Field>
          </>
        )}
        {/* Kontak */}
        <Field label={t("admin.members.fieldMemberPhone")}><Input type="tel" value={editMemberForm.phone} onChange={e => setEditMemberForm(f => ({ ...f, phone: e.target.value }))} /></Field>
        <Field label={t("admin.members.fieldContactOwner")}>
          <Select value={editMemberForm.phone_owner} onChange={e => setEditMemberForm(f => ({ ...f, phone_owner: e.target.value }))}>
            <option value="self">{t("admin.members.ownedByMemberOpt")}</option>
            <option value="parent">{t("admin.members.ownedByParentOpt")}</option>
          </Select>
        </Field>
        {editMemberForm.phone_owner === "parent" && (
          <>
            <Field label={t("admin.members.fieldParentName2")}><Input value={editMemberForm.parent_name} onChange={e => setEditMemberForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={t("admin.members.fieldParentPhone2")}><Input type="tel" value={editMemberForm.parent_phone} onChange={e => setEditMemberForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>
        )}
        <Field label={t("admin.coaches.fieldAddress2")} className="sm:col-span-2"><Textarea rows={2} value={editMemberForm.address} onChange={e => setEditMemberForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
        <Field label={t("admin.members.fieldHealthNotes3")} className="sm:col-span-2" hint={t("admin.members.healthNotesHint")}><Textarea rows={2} value={editMemberForm.health_notes} onChange={e => setEditMemberForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        {/* Kelas — multi-select checkboxes */}
        <div className="sm:col-span-2">
          <div className="text-sm font-semibold text-ink mb-2">{t("admin.members.classesJoinedFieldLabel")}</div>
          {detail?.type === "private" ? (
            <div className="space-y-1.5">
              {(detail.member_classes ?? []).length === 0 ? (
                <div className="text-sm text-ink-mute">{t("admin.coaches.noActiveClassesInBranch")}</div>
              ) : (
                detail.member_classes!.map(mc => mc.class && (
                  <div key={mc.class.id} className="px-3 py-2.5 rounded-xl border border-line bg-paper-tint text-sm font-semibold text-ink">{mc.class.name}</div>
                ))
              )}
              <p className="text-xs text-ink-mute">{t("admin.members.privateManagedElsewhereHint")}</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-sm text-ink-mute">{t("admin.coaches.noActiveClassesInBranch")}</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {classes.map(cls => {
                const checked = editMemberForm.class_ids.includes(cls.id);
                return (
                  <button key={cls.id} type="button"
                    onClick={() => setEditMemberForm(f => ({ ...f, class_ids: checked ? f.class_ids.filter(id => id !== cls.id) : [...f.class_ids, cls.id] }))}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                      {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">{cls.name}</div>
                      <div className="text-xs text-ink-mute">{cls.enrolled}/{cls.capacity} · {cls.time_start?.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
