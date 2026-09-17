"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import DatePicker from "@/components/ui/DatePicker";
import Modal from "@/components/ui/Modal";
import type { AdminCoachHook } from "./_hook";

export default function EditCoachModal({ hook }: { hook: AdminCoachHook }) {
  const {
    t, openEdit, setOpenEdit, editForm, setEditForm, editSaving, editAvatarPreview, setEditAvatarFile, setEditAvatarPreview,
    detail, saveEdit,
  } = hook;

  return (
    <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={t("admin.coaches.editCoachModalTitle")} size="md"
      footer={<><Btn variant="ghost" onClick={() => setOpenEdit(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
      <div className="space-y-4">
        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar name={editForm.full_name || detail?.full_name || ""} src={editAvatarPreview ?? detail?.avatar_url ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setEditAvatarFile(f); setEditAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
          <p className="text-xs text-ink-faint">{t("admin.coaches.clickToChangePhotoHint")}</p>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.personalDataLabel")}</div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.coaches.fieldFullName2")} required><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
              <Field label={t("admin.coaches.fieldNickname")} hint={t("admin.izin.optionalHint2")}><Input value={editForm.nick_name} onChange={e => setEditForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={t("admin.coaches.nicknamePlaceholder")} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.coaches.fieldGender2")}>
                <Select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">{t("admin.coaches.selectEllipsis")}</option>
                  <option value="male">{t("admin.approvement.genderMale")}</option>
                  <option value="female">{t("admin.approvement.genderFemale")}</option>
                </Select>
              </Field>
              <Field label={t("admin.coaches.fieldBirthDate2")} hint={t("admin.izin.optionalHint2")}><DatePicker value={editForm.birth_date} onChange={v => setEditForm(f => ({ ...f, birth_date: v }))} /></Field>
            </div>
            <Field label={t("admin.coaches.fieldPhoneWa")}><Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
            <Field label={t("admin.coaches.fieldAddress2")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.educationLabel")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("admin.coaches.fieldLastEducation")}>
              <Select value={editForm.education_level} onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}>
                <option value="">{t("admin.coaches.selectEllipsis")}</option>
                {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label={t("admin.coaches.fieldInstitutionName")}><Input value={editForm.education_institution} onChange={e => setEditForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={t("admin.coaches.institutionPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.coachProfileLabel")}</div>
          <div className="space-y-3">
            <Field label={t("admin.coaches.fieldSpecialization")} hint={t("admin.izin.optionalHint2")}><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} placeholder={t("admin.coaches.specializationPlaceholder")} /></Field>
            <Field label={t("admin.coaches.fieldBioDesc")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder={t("admin.coaches.bioPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.bankInfoLabel")}</div>
          <div className="space-y-3">
            <Field label={t("admin.coaches.fieldBankName")}><Input value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={t("admin.coaches.bankNamePlaceholder")} /></Field>
            <Field label={t("admin.coaches.fieldAccountNumber")}><Input value={editForm.bank_account} onChange={e => setEditForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={t("admin.coaches.accountNumberPlaceholder")} /></Field>
            <Field label={t("admin.coaches.fieldAccountHolder")}><Input value={editForm.bank_holder} onChange={e => setEditForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={t("admin.coaches.accountHolderPlaceholder")} /></Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
