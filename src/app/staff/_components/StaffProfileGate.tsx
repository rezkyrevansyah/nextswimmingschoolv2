"use client";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import { useToast } from "@/components/providers/ToastProvider";
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
      return toast.error("All fields are required to continue");
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
    if (error) return toast.error("Failed to save", error.message);
    onComplete(payload);
  };

  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center px-4 py-12">
      <Logo size={48} withWord />
      <div className="w-full max-w-md mt-8 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display font-bold text-2xl text-ink">{"Complete Your Profile"}</h1>
          <p className="text-sm text-ink-mute">{"Fill in the fields below to unlock the staff panel."}</p>
        </div>
        <Card className="space-y-4">
          <Field label={"WhatsApp / Mobile Number"} required>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={"0812xxxxxxxx"}
              className="font-mono"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={"Gender"} required>
              <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{"Select…"}</option>
                <option value="male">{"Male"}</option>
                <option value="female">{"Female"}</option>
              </Select>
            </Field>
            <Field label={"Date of Birth"} required>
              <DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} />
            </Field>
          </div>
          <div className="pt-3 border-t border-line space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {"Bank Account"}
            </div>
            <Field label={"Bank Name"} required>
              <Input
                value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                placeholder={"BCA / Mandiri / BSI"}
              />
            </Field>
            <Field label={"Account Number"} required>
              <Input
                value={form.bank_account}
                onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                placeholder={"1234567890"}
                className="font-mono"
              />
            </Field>
            <Field label={"Account Holder (Owner Name)"} required>
              <Input
                value={form.bank_holder}
                onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))}
                placeholder={"Name printed on bank book"}
              />
            </Field>
          </div>
          <Btn variant="primary" className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save & Continue"}
          </Btn>
          <button onClick={onLogout} className="text-xs text-ink-mute hover:text-danger-600 transition-colors w-full text-center">
            {"Log out"}
          </button>
        </Card>
      </div>
    </div>
  );
}
