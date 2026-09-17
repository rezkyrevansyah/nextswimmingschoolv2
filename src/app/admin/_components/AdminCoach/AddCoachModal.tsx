"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import DatePicker from "@/components/ui/DatePicker";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import Modal from "@/components/ui/Modal";
import type { AdminCoachHook } from "./_hook";

export default function AddCoachModal({ hook }: { hook: AdminCoachHook }) {
  const {
    t, openAdd, setOpenAdd, saving, form, setForm, createAvatarPreview, setCreateAvatarFile, setCreateAvatarPreview,
    createCerts, setCreateCerts, showCoachPwd, setShowCoachPwd, createCoach,
  } = hook;

  return (
    <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={t("admin.coaches.addCoachModalTitle")} size="md"
      footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={createCoach} disabled={saving}>{saving ? t("admin.coaches.creatingBtn2") : t("admin.coaches.createAccountBtn")}</Btn></>}>
      <div className="space-y-4">
        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar name={form.full_name || "?"} src={createAvatarPreview ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setCreateAvatarFile(f); setCreateAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
          <p className="text-xs text-ink-faint">{t("admin.coaches.profilePhotoOptionalHint")}</p>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.personalDataLabel")}</div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.coaches.fieldFullName2")} required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder={t("admin.coaches.fullNamePlaceholder")} /></Field>
              <Field label={t("admin.coaches.fieldNickname")} hint={t("admin.izin.optionalHint2")}><Input value={form.nick_name} onChange={e => setForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={t("admin.coaches.nicknamePlaceholder")} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("admin.coaches.fieldGender2")}>
                <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">{t("admin.coaches.selectEllipsis")}</option>
                  <option value="male">{t("admin.approvement.genderMale")}</option>
                  <option value="female">{t("admin.approvement.genderFemale")}</option>
                </Select>
              </Field>
              <Field label={t("admin.coaches.fieldBirthDate2")} hint={t("admin.izin.optionalHint2")}><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
            </div>
            <Field label={t("admin.coaches.fieldEmail2")} required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
            <Field label={t("admin.coaches.fieldPhoneWa")}><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
            <Field label={t("admin.coaches.fieldAddress2")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t("admin.coaches.addressPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.educationLabel")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("admin.coaches.fieldLastEducation")}>
              <Select value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
                <option value="">{t("admin.coaches.selectEllipsis")}</option>
                {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label={t("admin.coaches.fieldInstitutionName")}><Input value={form.education_institution} onChange={e => setForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={t("admin.coaches.institutionPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.coachProfileLabel")}</div>
          <div className="space-y-3">
            <Field label={t("admin.coaches.fieldSpecialization")} hint={t("admin.izin.optionalHint2")}><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder={t("admin.coaches.specializationPlaceholder")} /></Field>
            <Field label={t("admin.coaches.fieldBioDesc")} hint={t("admin.izin.optionalHint2")}><Textarea rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder={t("admin.coaches.bioPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.bankInfoLabel")}</div>
          <div className="space-y-3">
            <Field label={t("admin.coaches.fieldBankName")}><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={t("admin.coaches.bankNamePlaceholder")} /></Field>
            <Field label={t("admin.coaches.fieldAccountNumber")}><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={t("admin.coaches.accountNumberPlaceholder")} /></Field>
            <Field label={t("admin.coaches.fieldAccountHolder")}><Input value={form.bank_holder} onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={t("admin.coaches.accountHolderPlaceholder")} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{t("admin.coaches.certificationsOptionalLabel")}</div>
            <Btn variant="ghost" size="sm" icon="plus" onClick={() => setCreateCerts(cs => [...cs, { title: "", issuer: "", valid_from: "", valid_until: "", no_expiry: false }])}>{t("common.actions.add")}</Btn>
          </div>
          {createCerts.map((c, i) => (
            <div key={i} className="relative border border-line rounded-xl p-3 mb-3 space-y-2">
              <button type="button" onClick={() => setCreateCerts(cs => cs.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors"><Icon name="x" className="w-4 h-4" /></button>
              <Input placeholder={t("admin.coaches.certTitlePlaceholder")} value={c.title} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <Input placeholder={t("admin.coaches.certIssuerPlaceholder")} value={c.issuer} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-ink-mute mb-1 block">{t("admin.coaches.validFromLabel")}</label><MonthYearPicker value={c.valid_from} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_from: v } : x))} /></div>
                <div><label className="text-xs text-ink-mute mb-1 block">{t("admin.coaches.validUntilLabel")}</label><MonthYearPicker value={c.valid_until} disabled={c.no_expiry} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_until: v } : x))} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                <input type="checkbox" checked={c.no_expiry} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, no_expiry: e.target.checked, valid_until: "" } : x))} className="rounded" />
                {t("admin.approvement.noExpiryLabel")}
              </label>
            </div>
          ))}
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{t("admin.coaches.accountLabel")}</div>
          <Field label={t("admin.coaches.fieldInitialPassword")} required>
            <div className="relative">
              <Input type={showCoachPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowCoachPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showCoachPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
