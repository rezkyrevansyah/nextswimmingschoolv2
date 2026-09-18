"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import QRBox from "@/components/ui/QRBox";
import DatePicker from "@/components/ui/DatePicker";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useStaffData } from "./useStaffData";

export default function StaffProfileTab({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const { profile, profileForm, setProfileForm, savingProfile, handleSaveProfile } = hook;

  return (
    <div className="max-w-2xl space-y-5">
      {profile?.qr_code && (
        <Card>
          <div className="flex items-center gap-4">
            <QRBox value={profile.qr_code} size={80} downloadable />
            <div>
              <div className="font-display font-bold text-base text-ink"><NoTranslate>{profile.full_name}</NoTranslate></div>
              <div className="text-xs text-ink-mute mt-0.5">{"Staff · ID Card QR"}</div>
              <div className="text-[10px] font-mono text-ink-faint mt-1 break-all"><NoTranslate>{profile.qr_code}</NoTranslate></div>
            </div>
          </div>
        </Card>
      )}
      <Card className="space-y-4">
        <SectionTitle sub={"Configure your personal information and bank details for salary disbursement by owner."}>
          {"Personal Data & Bank Account"}
        </SectionTitle>

        <div className="space-y-3">
          <Field label={"Full Name"} required>
            <Input
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
            />
          </Field>

          <Field label={"WhatsApp / Mobile Number"}>
            <Input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={"0812xxxxxxxx"}
              className="font-mono"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={"Gender"}>
              <Select value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{"Select…"}</option>
                <option value="male">{"Male"}</option>
                <option value="female">{"Female"}</option>
              </Select>
            </Field>
            <Field label={"Date of Birth"}>
              <DatePicker value={profileForm.birth_date} onChange={v => setProfileForm(f => ({ ...f, birth_date: v }))} />
            </Field>
          </div>

          <div className="pt-4 border-t border-line space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {"Bank Account (For Salary Transfers & Reimbursements)"}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={"Bank Name"}>
                <Input
                  value={profileForm.bank_name}
                  onChange={e => setProfileForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder={"BCA / Mandiri / BSI"}
                />
              </Field>
              <Field label={"Account Number"}>
                <Input
                  value={profileForm.bank_account}
                  onChange={e => setProfileForm(f => ({ ...f, bank_account: e.target.value }))}
                  placeholder={"1234567890"}
                  className="font-mono"
                />
              </Field>
              <Field label={"Account Holder (Owner Name)"}>
                <Input
                  value={profileForm.bank_holder}
                  onChange={e => setProfileForm(f => ({ ...f, bank_holder: e.target.value }))}
                  placeholder={"Name printed on bank book"}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <Btn variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save Changes"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
