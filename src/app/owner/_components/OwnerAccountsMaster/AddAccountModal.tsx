"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, PasswordInput, Select, Switch, SectionLabel } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { deriveStaffEmail, type CreatableRole } from "./_types";
import type { useAccountsMasterData } from "./useAccountsMasterData";

type AccountsMasterDataHook = ReturnType<typeof useAccountsMasterData>;

export default function AddAccountModal({ hook }: { hook: AccountsMasterDataHook }) {
  const {
    branches, schools,
    showAdd, setShowAdd, form, setForm, saving, saveNewAccount,
    autoCreateStaff, setAutoCreateStaff, staffFullName, setStaffFullName, staffEmail, setStaffEmail,
    staffPassword, setStaffPassword, sameStaffPassword, setSameStaffPassword,
  } = hook;

  return (
    <Modal
      open={showAdd}
      onClose={() => setShowAdd(false)}
      title={"Add New Account"}
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>
            {"Cancel"}
          </Btn>
          <Btn variant="primary" onClick={saveNewAccount} disabled={saving}>
            {saving ? "Saving…" : "Add Account"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={"Account Type"} required>
          <Select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreatableRole }))}
          >
            <option value="admin">{"Branch Admin"}</option>
            <option value="manager_center">{"Manager Center"}</option>
            <option value="coach">{"Coach"}</option>
            <option value="student">{"Student"}</option>
            <option value="school">{"School Partner"}</option>
            <option value="staff">{"Branch Staff"}</option>
          </Select>
        </Field>

        {/* ── Section 1: Personal Data ── */}
        <SectionLabel>{"1. Personal Data"}</SectionLabel>
        <Field label={"Full Name"} required>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            autoComplete="off"
          />
        </Field>
        <Field label={"Phone / WhatsApp"}>
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
            label={"Custom Role Label"}
            hint={"E.g. Freelance Photographer, Guest Trainer, Receptionist"}
          >
            <Input
              value={form.custom_role_label}
              onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
              placeholder={"Leave blank if none"}
              autoComplete="off"
            />
          </Field>
        )}
        {form.role === "student" && (
          <>
            <Field label={"Student Type"}>
              <Select
                value={form.student_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, student_type: e.target.value as typeof f.student_type }))
                }
              >
                <option value="reguler">{"Regular"}</option>
                <option value="school_affiliate">{"School-affiliated"}</option>
              </Select>
            </Field>
            {form.student_type === "school_affiliate" && (
              <>
                <Field label={"School"}>
                  <Select
                    value={form.school_id}
                    onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
                  >
                    <option value="">{"Select school…"}</option>
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
              <p className="text-sm font-semibold text-ink">{"Bank Account"}</p>
              <p className="text-xs text-ink-mute mt-0.5">{"Optional — can also be filled in later from the account's edit screen."}</p>
            </div>
            <Field label={"Bank Name"}>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                placeholder={"BCA, BRI, Mandiri..."}
                autoComplete="off"
              />
            </Field>
            <Field label={"Account Number"}>
              <Input
                value={form.bank_account}
                onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                placeholder={"1234567890"}
                autoComplete="off"
              />
            </Field>
            <Field label={"Account Holder Name"}>
              <Input
                value={form.bank_holder}
                onChange={(e) => setForm((f) => ({ ...f, bank_holder: e.target.value }))}
                placeholder={"Bank account holder name"}
                autoComplete="off"
              />
            </Field>
          </div>
        )}

        {/* ── Section 2: Center Login Account ── */}
        <SectionLabel sub={"This is what the account holder uses to sign in"}>{"2. Center Login Account"}</SectionLabel>
        <Field label={"Center"} required>
          <Select
            value={form.branch_id}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
          >
            <option value="" disabled>
              {"Select center…"}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} translate="no" className="notranslate">
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={"Email"} required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            autoComplete="off"
          />
        </Field>
        <Field
          label={"Initial Password"}
          required
          hint={"The account holder can change it after logging in"}
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
            <SectionLabel sub={"Optional — gives this person a second login for the Staff panel"}>{"3. Staff Panel Account"}</SectionLabel>
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
                  <Field label={"Staff Name"} hint={"Optional, e.g. Dewi (Staff)"}>
                    <Input
                      value={staffFullName}
                      onChange={(e) => setStaffFullName(e.target.value)}
                      placeholder={"Staff name..."}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={"Staff account Email"} required hint={"Pre-filled from the login email above — change it if this person needs a different one"}>
                    <Input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="staff@example.com"
                      autoComplete="off"
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-ink-soft">{"Use a different password for the Staff account"}</span>
                    <Switch
                      checked={!sameStaffPassword}
                      onChange={(differs) => {
                        setSameStaffPassword(!differs);
                        setStaffPassword("");
                      }}
                    />
                  </div>
                  {sameStaffPassword ? (
                    <p className="text-xs text-ink-mute">{"Uses the same password as the Center login account above."}</p>
                  ) : (
                    <Field label={"Staff account Password"} required>
                      <PasswordInput
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder={"Min 8 characters"}
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
