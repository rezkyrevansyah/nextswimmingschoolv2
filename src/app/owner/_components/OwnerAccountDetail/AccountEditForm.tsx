"use client";
import Icon from "@/components/ui/Icon";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { BANK_ACCOUNT_ROLES } from "./_types";
import type { useAccountDetailData } from "./useAccountDetailData";

type AccountDetailDataHook = ReturnType<typeof useAccountDetailData>;

export default function AccountEditForm({ hook }: { hook: AccountDetailDataHook }) {
  const { t, branches, schools, form, setForm } = hook;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("owner.accountDetail.fieldFullName")} required>
          <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
        </Field>
        <Field label={t("owner.accountDetail.fieldRole")}>
          <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="owner">{t("owner.accounts.roleOwner")}</option>
            <option value="admin">{t("owner.accounts.roleAdmin")}</option>
            <option value="manager_center">{t("owner.accounts.roleManagerCenter")}</option>
            <option value="coach">{t("owner.accounts.roleCoach")}</option>
            <option value="member">{t("owner.accounts.roleMember")}</option>
            <option value="staff">{t("owner.accounts.roleStaff")}</option>
            <option value="school">{t("owner.accounts.roleSchool")}</option>
          </Select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("owner.accountDetail.fieldEmail")}>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label={t("owner.accountDetail.fieldPhone")}>
          <Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("owner.accountDetail.fieldGender")}>
          <Select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
            <option value="">{t("owner.accountDetail.genderSelectPlaceholder")}</option>
            <option value="male">{t("owner.accountDetail.genderMale")}</option>
            <option value="female">{t("owner.accountDetail.genderFemale")}</option>
          </Select>
        </Field>
        <Field label={t("owner.accountDetail.fieldBirthDate")}>
          <Input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
        </Field>
      </div>

      <Field label={t("owner.accountDetail.fieldBranch")}>
        <Select value={form.branch_id} onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}>
          <option value="">{t("owner.accountDetail.branchNone")}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id} translate="no" className="notranslate">
              {b.name}
            </option>
          ))}
        </Select>
      </Field>

      {/* Member Specific Form Inputs */}
      {form.role === "member" && (
        <div className="border border-green-200 bg-green-50/40 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-bold text-green-900 uppercase tracking-wider">{t("owner.accountDetail.memberSettingsTitle")}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t("owner.accounts.fieldMemberType")}>
              <Select value={form.member_type} onChange={(e) => setForm((f) => ({ ...f, member_type: e.target.value }))} disabled={form.member_type === "private"}>
                <option value="reguler">{t("owner.accounts.memberTypeRegular")}</option>
                <option value="school_affiliate">{t("owner.accounts.memberTypeSchoolAffiliate")}</option>
                {form.member_type === "private" && <option value="private">{t("owner.accounts.memberTypePrivate")}</option>}
              </Select>
            </Field>
            {form.member_type !== "private" && (
              <>
                <Field label={t("owner.accountDetail.fieldTotalSessions")}>
                  <Input type="number" min={0} value={form.total_sessions} onChange={(e) => setForm((f) => ({ ...f, total_sessions: e.target.value }))} />
                </Field>
                <Field label={t("owner.accountDetail.fieldRemainingSessions")}>
                  <Input type="number" min={0} value={form.remaining_sessions} onChange={(e) => setForm((f) => ({ ...f, remaining_sessions: e.target.value }))} />
                </Field>
              </>
            )}
          </div>
          {form.member_type === "private" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800">
              <Icon name="info" className="w-4 h-4 shrink-0 text-ocean-500" />
              <span>{t("owner.accountDetail.privateManagedElsewhereNotice")}</span>
            </div>
          )}
          {form.member_type === "school_affiliate" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("owner.accountDetail.fieldSelectSchool")}>
                <Select value={form.school_id} onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}>
                  <option value="">{t("owner.accountDetail.selectSchoolPlaceholder")}</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id} translate="no" className="notranslate">
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("owner.accounts.fieldSchoolGrade")} hint={t("owner.accounts.fieldSchoolGradeHint")}>
                <Input
                  value={form.school_grade}
                  onChange={(e) => setForm((f) => ({ ...f, school_grade: e.target.value }))}
                  placeholder={t("owner.accounts.fieldSchoolGradePlaceholder")}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      <Field label={t("owner.accountDetail.fieldAddress")}>
        <Textarea
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          rows={2}
          placeholder={t("owner.accountDetail.addressPlaceholder")}
        />
      </Field>

      {(form.role === "staff" || form.role === "admin" || form.role === "manager_center") && (
        <Field
          label={t("owner.accountDetail.fieldCustomRoleLabel")}
          hint={t("owner.accountDetail.customRoleLabelHint")}
        >
          <Input
            value={form.custom_role_label}
            onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
            placeholder={t("owner.accountDetail.customRoleLabelPlaceholder")}
          />
        </Field>
      )}

      {form.role === "coach" && (
        <>
          <Field label={t("owner.accountDetail.fieldSpecialization")}>
            <Input
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              placeholder={t("owner.accountDetail.specializationPlaceholder")}
            />
          </Field>
          <Field label={t("owner.accountDetail.fieldBio")}>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={2}
            />
          </Field>
        </>
      )}

      {BANK_ACCOUNT_ROLES.includes(form.role) && (
        <div className="border-t border-line pt-4">
          <p className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">
            {t("owner.accountDetail.bankAccountTitle")}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("owner.accountDetail.fieldBankName")}>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                placeholder={t("owner.accountDetail.bankNamePlaceholder")}
              />
            </Field>
            <Field label={t("owner.accountDetail.fieldBankAccount")}>
              <Input
                value={form.bank_account}
                onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                placeholder={t("owner.accountDetail.bankAccountPlaceholder")}
              />
            </Field>
            <Field label={t("owner.accountDetail.fieldBankHolder")}>
              <Input
                value={form.bank_holder}
                onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                placeholder={t("owner.accountDetail.bankHolderPlaceholder")}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
