"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import type { useStaffData } from "./useStaffData";

export default function ExpenseModal({ hook }: { hook: ReturnType<typeof useStaffData> }) {
  const {
    showExpenseModal, setShowExpenseModal, expenseForm, setExpenseForm,
    expenseCategories, setExpenseProofFile, handleSaveExpense, savingExpense, uploading,
  } = hook;

  return (
    <Modal
      open={showExpenseModal}
      onClose={() => setShowExpenseModal(false)}
      title={"Submit Reimbursement / Expense Claim"}
      size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setShowExpenseModal(false)}>{"Cancel"}</Btn>
          <Btn variant="primary" onClick={handleSaveExpense} disabled={savingExpense || uploading}>
            {savingExpense || uploading ? "Submitting…" : "Submit Claim"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={"Expense Description"} required>
          <Input
            value={expenseForm.description}
            onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
            placeholder={"Example: Purchased pool cleaning supplies"}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={"Amount (IDR)"} required>
            <Input
              type="number"
              value={expenseForm.amount}
              onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="50000"
              className="font-mono"
            />
          </Field>
          <Field label={"Receipt Date"}>
            <Input
              type="date"
              value={expenseForm.occurred_at}
              onChange={e => setExpenseForm(f => ({ ...f, occurred_at: e.target.value }))}
            />
          </Field>
        </div>
        <Field label={"Category"}>
          <Select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
            {expenseCategories.map(cat => (
              <option key={cat} value={cat} translate="no">
                {cat}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={"Receipt Photo / Payment Proof"} hint={"Upload receipt/invoice photo"}>
          <input
            type="file"
            accept="image/*"
            onChange={e => setExpenseProofFile(e.target.files?.[0] ?? null)}
            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer"
          />
        </Field>
      </div>
    </Modal>
  );
}
