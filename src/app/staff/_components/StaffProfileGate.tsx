"use client";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";
import type { StaffProfile } from "../_types";

export default function StaffProfileGate({
  profile,
  onComplete,
  onLogout,
}: {
  profile: StaffProfile;
  onComplete: (updated: Partial<StaffProfile>) => void;
  onLogout: () => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const supabase = createClient();
  const [form, setForm] = useState({
    phone: profile.phone ?? "",
    gender: profile.gender ?? "",
    birth_date: profile.birth_date ?? "",
    bank_name: profile.bank_name ?? "",
    bank_account: profile.bank_account ?? "",
    bank_holder: profile.bank_holder ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (
      !form.phone.trim() || !form.gender || !form.birth_date ||
      !form.bank_name.trim() || !form.bank_account.trim() || !form.bank_holder.trim()
    ) {
      return toast.error(t("staff.profileGate.allFieldsRequired"));
    }
    setSaving(true);
    const payload = {
      phone: form.phone.trim(),
      gender: form.gender,
      birth_date: form.birth_date,
      bank_name: form.bank_name.trim(),
      bank_account: form.bank_account.trim(),
      bank_holder: form.bank_holder.trim(),
      is_profile_complete: true,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(t("staff.profileGate.saveFailed"), error.message);
    onComplete(payload);
  };

  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center px-4 py-12">
      <Logo size={48} withWord />
      <div className="w-full max-w-md mt-8 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display font-bold text-2xl text-ink">{t("staff.profileGate.title")}</h1>
          <p className="text-sm text-ink-mute">{t("staff.profileGate.subtitle")}</p>
        </div>
        <Card className="space-y-4">
          <Field label={t("staff.profileGate.fieldPhone")} required>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={t("staff.profileGate.fieldPhonePlaceholder")}
              className="font-mono"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("staff.profileGate.fieldGender")} required>
              <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("staff.profileGate.selectEllipsis")}</option>
                <option value="male">{t("staff.profileGate.genderMale")}</option>
                <option value="female">{t("staff.profileGate.genderFemale")}</option>
              </Select>
            </Field>
            <Field label={t("staff.profileGate.fieldBirthDate")} required>
              <DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} />
            </Field>
          </div>
          <div className="pt-3 border-t border-line space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {t("staff.profileGate.bankSectionTitle")}
            </div>
            <Field label={t("staff.profileGate.fieldBankName")} required>
              <Input
                value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                placeholder={t("staff.profileGate.fieldBankNamePlaceholder")}
              />
            </Field>
            <Field label={t("staff.profileGate.fieldBankAccount")} required>
              <Input
                value={form.bank_account}
                onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                placeholder={t("staff.profileGate.fieldBankAccountPlaceholder")}
                className="font-mono"
              />
            </Field>
            <Field label={t("staff.profileGate.fieldBankHolder")} required>
              <Input
                value={form.bank_holder}
                onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))}
                placeholder={t("staff.profileGate.fieldBankHolderPlaceholder")}
              />
            </Field>
          </div>
          <Btn variant="primary" className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? t("staff.profileGate.saving") : t("staff.profileGate.saveAndContinue")}
          </Btn>
          <button onClick={onLogout} className="text-xs text-ink-mute hover:text-danger-600 transition-colors w-full text-center">
            {t("staff.profileGate.logoutBtn")}
          </button>
        </Card>
      </div>
    </div>
  );
}
