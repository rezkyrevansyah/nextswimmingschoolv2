"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import type { useAdminFinancialData } from "./useAdminFinancialData";

type AdminFinancialDataHook = ReturnType<typeof useAdminFinancialData>;

export default function TxnModal({ hook }: { hook: AdminFinancialDataHook }) {
  const { showTxnModal, setShowTxnModal, txnForm, setTxnForm, savingTxn, saveTxn, categoriesByKind } = hook;

  return (
    <Modal open={!!showTxnModal} onClose={() => setShowTxnModal(null)}
      title={(showTxnModal?.edit ? `Edit ${(showTxnModal?.kind === "income" ? "Income" : "Expense")} Manual` : `Add ${(showTxnModal?.kind === "income" ? "Income" : "Expense")} Manual`)}
      size="md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Btn variant="ghost" onClick={() => setShowTxnModal(null)}>{"Cancel"}</Btn>
          <Btn variant="primary" onClick={saveTxn} disabled={savingTxn}>{savingTxn ? "Saving…" : "Save"}</Btn>
        </div>
      }>
      <div className="space-y-4">
        <Field label={"Category"}>
          <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
            {categoriesByKind(showTxnModal?.kind ?? "income").map(c => <option key={c.id} value={c.name} translate="no">{c.name}</option>)}
          </Select>
          {categoriesByKind(showTxnModal?.kind ?? "income").length === 0 && (
            <p className="text-xs text-warn-600 mt-1">{"No categories yet — ask the owner to add them in the Owner panel."}</p>
          )}
        </Field>
        {txnForm.category === "Lainnya" && (
          <Field label={"Custom Category"}><Input value={txnForm.categoryOther} onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))} placeholder={"E.g. Alumni donation"} /></Field>
        )}
        <Field label={"Description"}><Input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} placeholder={"E.g. Paid this month's electricity bill"} /></Field>
        {showTxnModal?.kind === "expense" && (
          <>
            <Switch checked={txnForm.isReimburse} onChange={v => setTxnForm(f => ({ ...f, isReimburse: v }))} label={"This is a reimbursable expense (proof required)"} />
            {txnForm.isReimburse && (
              <Field label={"Proof Link (Google Drive)"}>
                <Input value={txnForm.proofUrl} onChange={e => setTxnForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder="https://drive.google.com/..." type="url" />
              </Field>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={"Amount (Rp)"}><Input type="number" inputMode="numeric" min={0} value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} /></Field>
          <Field label={"Date"}><Input type="date" value={txnForm.occurred_at} onChange={e => setTxnForm(f => ({ ...f, occurred_at: e.target.value }))} className="font-mono" /></Field>
        </div>
        <Field label={"Notes (optional)"}><Textarea value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
      </div>
    </Modal>
  );
}
