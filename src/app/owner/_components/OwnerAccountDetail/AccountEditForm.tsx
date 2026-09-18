"use client";
import Icon from "@/components/ui/Icon";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { BANK_ACCOUNT_ROLES } from "./_types";
import type { useAccountDetailData } from "./useAccountDetailData";

type AccountDetailDataHook = ReturnType<typeof useAccountDetailData>;

export default function AccountEditForm({ hook }: { hook: AccountDetailDataHook }) {
  const { branches, schools, form, setForm } = hook;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={"Full Name"} required>
          <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
        </Field>
        <Field label={"Account Role"}>
          <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="owner">{"Owner"}</option>
            <option value="admin">{"Branch Admin"}</option>
            <option value="manager_center">{"Manager Center"}</option>
            <option value="coach">{"Coach"}</option>
            <option value="student">{"Student"}</option>
            <option value="staff">{"Branch Staff"}</option>
            <option value="school">{"School Partner"}</option>
          </Select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={"Email"}>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label={"Phone / WhatsApp"}>
          <Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={"Gender"}>
          <Select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
            <option value="">{"— Select —"}</option>
            <option value="male">{"Male"}</option>
            <option value="female">{"Female"}</option>
          </Select>
        </Field>
        <Field label={"Date of Birth"}>
          <Input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
        </Field>
      </div>

      <Field label={"Center"}>
        <Select value={form.branch_id} onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}>
          <option value="">{"— None —"}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id} translate="no" className="notranslate">
              {b.name}
            </option>
          ))}
        </Select>
      </Field>

      {/* Student Specific Form Inputs */}
      {form.role === "student" && (
        <div className="border border-green-200 bg-green-50/40 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-bold text-green-900 uppercase tracking-wider">{"Student Settings"}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={"Student Type"}>
              <Select value={form.student_type} onChange={(e) => setForm((f) => ({ ...f, student_type: e.target.value }))} disabled={form.student_type === "private"}>
                <option value="reguler">{"Regular"}</option>
                <option value="school_affiliate">{"School-affiliated"}</option>
                {form.student_type === "private" && <option value="private">{"Private"}</option>}
              </Select>
            </Field>
            {form.student_type !== "private" && (
              <>
                <Field label={"Total Sessions"}>
                  <Input type="number" min={0} value={form.total_sessions} onChange={(e) => setForm((f) => ({ ...f, total_sessions: e.target.value }))} />
                </Field>
                <Field label={"Remaining Sessions"}>
                  <Input type="number" min={0} value={form.remaining_sessions} onChange={(e) => setForm((f) => ({ ...f, remaining_sessions: e.target.value }))} />
                </Field>
              </>
            )}
          </div>
          {form.student_type === "private" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800">
              <Icon name="info" className="w-4 h-4 shrink-0 text-ocean-500" />
              <span>{"Private students are managed from the \"Student Private\" menu — schedule, location, coach, and session count are all edited there, safely, since it's the only place guaranteed to match this student's own class slot."}</span>
            </div>
          )}
          {form.student_type === "school_affiliate" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={"Select School"}>
                <Select value={form.school_id} onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}>
                  <option value="">{"— Select School —"}</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id} translate="no" className="notranslate">
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={"School Grade"} hint={"The child's grade/class at their day school, e.g. \"Kelas 5 SD\" — separate from the swim class"}>
                <Input
                  value={form.school_grade}
                  onChange={(e) => setForm((f) => ({ ...f, school_grade: e.target.value }))}
                  placeholder={"e.g. Kelas 5 SD"}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      <Field label={"Address"}>
        <Textarea
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          rows={2}
          placeholder={"Full address"}
        />
      </Field>

      {(form.role === "staff" || form.role === "admin" || form.role === "manager_center") && (
        <Field
          label={"Custom Role Label"}
          hint={"E.g. Freelance Photographer, Guest Trainer, Receptionist"}
        >
          <Input
            value={form.custom_role_label}
            onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
            placeholder={"Leave blank if none"}
          />
        </Field>
      )}

      {form.role === "coach" && (
        <>
          <Field label={"Specialization"}>
            <Input
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              placeholder={"E.g. Freestyle Swimming, Butterfly"}
            />
          </Field>
          <Field label={"Bio / About"}>
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
            {"Bank Account"}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label={"Bank Name"}>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                placeholder={"BCA, BRI, Mandiri..."}
              />
            </Field>
            <Field label={"Account Number"}>
              <Input
                value={form.bank_account}
                onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                placeholder={"1234567890"}
              />
            </Field>
            <Field label={"Account Holder Name"}>
              <Input
                value={form.bank_holder}
                onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                placeholder={"Bank account holder name"}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
