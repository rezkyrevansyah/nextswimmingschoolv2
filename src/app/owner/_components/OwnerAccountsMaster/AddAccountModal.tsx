"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, PasswordInput, Select, Switch, SectionLabel } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { deriveStaffEmail, type CreatableRole } from "./_types";
import type { useAccountsMasterData } from "./useAccountsMasterData";

type AccountsMasterDataHook = ReturnType<typeof useAccountsMasterData>;

export default function AddAccountModal({ hook }: { hook: AccountsMasterDataHook }) {
  const {
    t, branches, schools,
    showAdd, setShowAdd, form, setForm, saving, saveNewAccount,
    autoCreateStaff, setAutoCreateStaff, staffFullName, setStaffFullName, staffEmail, setStaffEmail,
    staffPassword, setStaffPassword, sameStaffPassword, setSameStaffPassword,
  } = hook;

  return (
    <Modal
      open={showAdd}
      onClose={() => setShowAdd(false)}
      title={t("owner.accounts.createModalTitle")}
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>
            {t("common.actions.cancel")}
          </Btn>
          <Btn variant="primary" onClick={saveNewAccount} disabled={saving}>
            {saving ? t("common.actions.saving") : t("owner.accounts.addAccountBtn")}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("owner.accounts.fieldAccountType")} required>
          <Select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreatableRole }))}
          >
            <option value="admin">{t("owner.accounts.roleAdmin")}</option>
            <option value="manager_center">{t("owner.accounts.roleManagerCenter")}</option>
            <option value="coach">{t("owner.accounts.roleCoach")}</option>
            <option value="member">{t("owner.accounts.roleMember")}</option>
            <option value="school">{t("owner.accounts.roleSchool")}</option>
            <option value="staff">{t("owner.accounts.roleStaff")}</option>
          </Select>
        </Field>

        {/* ── Section 1: Personal Data ── */}
        <SectionLabel>{t("owner.accounts.sectionPersonalData")}</SectionLabel>
        <Field label={t("owner.accounts.fieldFullName")} required>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            autoComplete="off"
          />
        </Field>
        <Field label={t("owner.accounts.fieldPhone")}>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="08xxxxxxxxxx"
            autoComplete="off"
          />
        </Field>
        {(form.role === "staff" || form.role === "admin" || form.role === "manager_center") && (
          <Field
            label={t("owner.accounts.fieldCustomRoleLabel")}
            hint={t("owner.accounts.customRoleLabelHint")}
          >
            <Input
              value={form.custom_role_label}
              onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
              placeholder={t("owner.accounts.customRoleLabelPlaceholder")}
              autoComplete="off"
            />
          </Field>
        )}
        {form.role === "member" && (
          <>
            <Field label={t("owner.accounts.fieldMemberType")}>
              <Select
                value={form.member_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, member_type: e.target.value as typeof f.member_type }))
                }
              >
                <option value="reguler">{t("owner.accounts.memberTypeRegular")}</option>
                <option value="school_affiliate">{t("owner.accounts.memberTypeSchoolAffiliate")}</option>
              </Select>
            </Field>
            {form.member_type === "school_affiliate" && (
              <>
                <Field label={t("owner.accounts.fieldSchool")}>
                  <Select
                    value={form.school_id}
                    onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
                  >
                    <option value="">{t("owner.accounts.fieldSchoolPlaceholder")}</option>
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
                    autoComplete="off"
                  />
                </Field>
              </>
            )}
          </>
        )}
        {form.role === "staff" && (
          <div className="rounded-xl border border-line bg-paper-tint p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">{t("owner.accountDetail.bankAccountTitle")}</p>
              <p className="text-xs text-ink-mute mt-0.5">{t("owner.accounts.bankSectionHint")}</p>
            </div>
            <Field label={t("owner.accountDetail.fieldBankName")}>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                placeholder={t("owner.accountDetail.bankNamePlaceholder")}
                autoComplete="off"
              />
            </Field>
            <Field label={t("owner.accountDetail.fieldBankAccount")}>
              <Input
                value={form.bank_account}
                onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                placeholder={t("owner.accountDetail.bankAccountPlaceholder")}
                autoComplete="off"
              />
            </Field>
            <Field label={t("owner.accountDetail.fieldBankHolder")}>
              <Input
                value={form.bank_holder}
                onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                placeholder={t("owner.accountDetail.bankHolderPlaceholder")}
                autoComplete="off"
              />
            </Field>
          </div>
        )}

        {/* ── Section 2: Center Login Account ── */}
        <SectionLabel sub={t("owner.accounts.sectionBranchLoginSub")}>{t("owner.accounts.sectionBranchLogin")}</SectionLabel>
        <Field label={t("owner.accounts.fieldBranch")} required>
          <Select
            value={form.branch_id}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
          >
            <option value="" disabled>
              {t("owner.accounts.fieldBranchPlaceholder")}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} translate="no" className="notranslate">
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("owner.accounts.fieldEmail")} required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            autoComplete="off"
          />
        </Field>
        <Field
          label={t("owner.accounts.fieldPassword")}
          required
          hint={t("owner.accounts.fieldPasswordHint")}
        >
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />
        </Field>

        {/* ── Section 3: Staff Panel Account (admin / manager_center only) ── */}
        {(form.role === "admin" || form.role === "manager_center") && (
          <>
            <SectionLabel sub={t("owner.accounts.sectionStaffPanelSub")}>{t("owner.accounts.sectionStaffPanel")}</SectionLabel>
            <div className="rounded-xl border border-line bg-paper-tint p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Auto-create Staff account</p>
                  <p className="text-xs text-ink-mute mt-0.5">
                    Admin also receives a separate Staff account for attendance &amp; payslips
                  </p>
                </div>
                <Switch
                  checked={autoCreateStaff}
                  onChange={(next) => {
                    setAutoCreateStaff(next);
                    if (next) {
                      setStaffEmail((v) => v || deriveStaffEmail(form.email));
                      setSameStaffPassword(true);
                      setStaffPassword("");
                    }
                  }}
                />
              </div>
              {autoCreateStaff && (
                <>
                  <Field label={t("owner.accounts.fieldStaffName")} hint={t("owner.accounts.fieldStaffNameHint")}>
                    <Input
                      value={staffFullName}
                      onChange={(e) => setStaffFullName(e.target.value)}
                      placeholder={t("owner.accounts.fieldStaffNamePlaceholder")}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={t("owner.accounts.fieldStaffEmail")} required hint={t("owner.accounts.fieldStaffEmailHint")}>
                    <Input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="staff@example.com"
                      autoComplete="off"
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-ink-soft">{t("owner.accounts.staffPasswordDifferentToggle")}</span>
                    <Switch
                      checked={!sameStaffPassword}
                      onChange={(differs) => {
                        setSameStaffPassword(!differs);
                        setStaffPassword("");
                      }}
                    />
                  </div>
                  {sameStaffPassword ? (
                    <p className="text-xs text-ink-mute">{t("owner.accounts.staffPasswordSameNote")}</p>
                  ) : (
                    <Field label={t("owner.accounts.fieldStaffPassword")} required>
                      <PasswordInput
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder={t("owner.accounts.fieldStaffPasswordPlaceholder")}
                        autoComplete="new-password"
                      />
                    </Field>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
