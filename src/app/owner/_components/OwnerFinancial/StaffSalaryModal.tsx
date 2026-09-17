"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { FinancialHook } from "./index";

export default function StaffSalaryModal({ hook }: { hook: FinancialHook }) {
  const { t, tNode } = useLocale();
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
      title={tNode("owner.financial.staffSalaryModalTitle", {
        name: <NoTranslate>{editSalaryModal.staff.full_name}</NoTranslate>,
        period: editSalaryModal.month,
      })}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setEditSalaryModal(null)}>{t("owner.financial.staffSalaryCancelBtn")}</Btn>
          <Btn variant="primary" onClick={saveStaffSalary} disabled={savingSalary}>
            {savingSalary ? t("owner.financial.staffSalarySavingBtn") : t("owner.financial.staffSalarySaveBtn")}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={t("owner.financial.fieldBaseSalary")} hint={t("owner.financial.fieldBaseSalaryHint")}>
          <Input
            type="number"
            value={salaryForm.base_salary}
            onChange={e => setSalaryForm(f => ({ ...f, base_salary: e.target.value }))}
            placeholder={t("owner.financial.fieldBaseSalaryPlaceholder")}
          />
        </Field>
        <Field label={t("owner.financial.fieldAllowancesExtra")}>
          <Input type="number" value={salaryForm.allowances} onChange={e => setSalaryForm(f => ({ ...f, allowances: e.target.value }))} />
        </Field>
        <Field label={t("owner.financial.fieldApprovedReimburse")} hint={t("owner.financial.fieldApprovedReimburseHint")}>
          <Input type="number" value={salaryForm.reimburse} onChange={e => setSalaryForm(f => ({ ...f, reimburse: e.target.value }))} />
        </Field>
        <Field label={t("owner.financial.fieldDeductions")}>
          <Input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm(f => ({ ...f, deductions: e.target.value }))} />
        </Field>

        <Field label={t("owner.financial.fieldSalaryNotes")}>
          <Textarea
            rows={2}
            value={salaryForm.notes}
            onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))}
            placeholder={t("owner.financial.fieldSalaryNotesPlaceholder")}
          />
        </Field>

        <div className="flex items-center justify-between px-3 py-2 bg-ocean-50/50 rounded-xl">
          <span className="font-bold text-ocean-900 text-sm">{t("owner.financial.estimatedNetTotal")}</span>
          <span className="font-mono font-extrabold text-ocean-900">{fmtIDR(net)}</span>
        </div>
      </div>
    </Modal>
  );
}
