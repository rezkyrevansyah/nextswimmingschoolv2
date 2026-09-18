"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { FinancialHook } from "./index";

export default function StaffSalaryModal({ hook }: { hook: FinancialHook }) {
  const { editSalaryModal, setEditSalaryModal, salaryForm, setSalaryForm, saveStaffSalary, savingSalary } = hook;

  if (!editSalaryModal) return null;
  const net =
    Number(salaryForm.base_salary || 0) +
    Number(salaryForm.allowances || 0) +
    Number(salaryForm.reimburse || 0) -
    Number(salaryForm.deductions || 0);

  return (
    <Modal
      open={!!editSalaryModal}
      onClose={() => setEditSalaryModal(null)}
      title={(<>{"Set Staff Salary: "}<NoTranslate>{<NoTranslate>{editSalaryModal.staff.full_name}</NoTranslate>}</NoTranslate>{" ("}<NoTranslate>{editSalaryModal.month}</NoTranslate>{")"}</>)}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setEditSalaryModal(null)}>{"Cancel"}</Btn>
          <Btn variant="primary" onClick={saveStaffSalary} disabled={savingSalary}>
            {savingSalary ? "Saving..." : "Save Salary"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={"Base Salary This Month (Rp)"} hint={"Amount can be adjusted monthly by Owner"}>
          <Input
            type="number"
            value={salaryForm.base_salary}
            onChange={e => setSalaryForm(f => ({ ...f, base_salary: e.target.value }))}
            placeholder={"E.g.: 3000000"}
          />
        </Field>
        <Field label={"Additional Allowances / Bonuses (Rp)"}>
          <Input type="number" value={salaryForm.allowances} onChange={e => setSalaryForm(f => ({ ...f, allowances: e.target.value }))} />
        </Field>
        <Field label={"Approved Reimbursement (Rp)"} hint={"Manual entry if staff has a reimbursement claim outside standard salary"}>
          <Input type="number" value={salaryForm.reimburse} onChange={e => setSalaryForm(f => ({ ...f, reimburse: e.target.value }))} />
        </Field>
        <Field label={"Deductions (Rp)"}>
          <Input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm(f => ({ ...f, deductions: e.target.value }))} />
        </Field>

        <Field label={"Salary Notes (Optional)"}>
          <Textarea
            rows={2}
            value={salaryForm.notes}
            onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))}
            placeholder={"Bonus or deduction notes..."}
          />
        </Field>

        <div className="flex items-center justify-between px-3 py-2 bg-ocean-50/50 rounded-xl">
          <span className="font-bold text-ocean-900 text-sm">{"Estimated Net Total:"}</span>
          <span className="font-mono font-extrabold text-ocean-900">{fmtIDR(net)}</span>
        </div>
      </div>
    </Modal>
  );
}
