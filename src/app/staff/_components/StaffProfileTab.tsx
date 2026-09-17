"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import QRBox from "@/components/ui/QRBox";
import DatePicker from "@/components/ui/DatePicker";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useStaffData } from "./useStaffData";

export default function StaffProfileTab({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const { t } = useLocale();
  const { profile, profileForm, setProfileForm, savingProfile, handleSaveProfile } = hook;

  return (
    <div className="max-w-2xl space-y-5">
      {profile?.qr_code && (
        <Card>
          <div className="flex items-center gap-4">
            <QRBox value={profile.qr_code} size={80} downloadable />
            <div>
              <div className="font-display font-bold text-base text-ink">{profile.full_name}</div>
              <div className="text-xs text-ink-mute mt-0.5">{t("staff.profile.idCardSubtitle")}</div>
              <div className="text-[10px] font-mono text-ink-faint mt-1 break-all">{profile.qr_code}</div>
            </div>
          </div>
        </Card>
      )}
      <Card className="space-y-4">
        <SectionTitle sub={t("staff.profile.sub")}>
          {t("staff.profile.title")}
        </SectionTitle>

        <div className="space-y-3">
          <Field label={t("staff.profile.fieldFullName")} required>
            <Input
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
            />
          </Field>

          <Field label={t("staff.profile.fieldPhone")}>
            <Input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={t("staff.profile.fieldPhonePlaceholder")}
              className="font-mono"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("staff.profile.fieldGender")}>
              <Select value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("staff.profile.selectEllipsis")}</option>
                <option value="male">{t("staff.profile.genderMale")}</option>
                <option value="female">{t("staff.profile.genderFemale")}</option>
              </Select>
            </Field>
            <Field label={t("staff.profile.fieldBirthDate")}>
              <DatePicker value={profileForm.birth_date} onChange={v => setProfileForm(f => ({ ...f, birth_date: v }))} />
            </Field>
          </div>

          <div className="pt-4 border-t border-line space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {t("staff.profile.bankSectionTitle")}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={t("staff.profile.fieldBankName")}>
                <Input
                  value={profileForm.bank_name}
                  onChange={e => setProfileForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder={t("staff.profile.fieldBankNamePlaceholder")}
                />
              </Field>
              <Field label={t("staff.profile.fieldBankAccount")}>
                <Input
                  value={profileForm.bank_account}
                  onChange={e => setProfileForm(f => ({ ...f, bank_account: e.target.value }))}
                  placeholder={t("staff.profile.fieldBankAccountPlaceholder")}
                  className="font-mono"
                />
              </Field>
              <Field label={t("staff.profile.fieldBankHolder")}>
                <Input
                  value={profileForm.bank_holder}
                  onChange={e => setProfileForm(f => ({ ...f, bank_holder: e.target.value }))}
                  placeholder={t("staff.profile.fieldBankHolderPlaceholder")}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <Btn variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? t("staff.profile.savingBtn") : t("staff.profile.saveBtn")}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
