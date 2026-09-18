"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/FormFields";
import type { FinancialHook } from "./index";

export default function ManualTxnModal({ hook }: { hook: FinancialHook }) {
  const {
    showTxnModal, setShowTxnModal, txnForm, setTxnForm, saveTxn, savingTxn,
    branches, categoriesByKind,
  } = hook;

  if (!showTxnModal) return null;
  const categoryNames = categoriesByKind(showTxnModal.kind).map(c => c.name);
  const kindLabel = (showTxnModal.kind === "income" ? "Income" : "Expense");

  return (
    <Modal
      open={!!showTxnModal}
      onClose={() => setShowTxnModal(null)}
      title={showTxnModal.edit ? `Edit ${kindLabel} Manual` : `Add ${kindLabel} Manual`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setShowTxnModal(null)}>{"Cancel"}</Btn>
          <Btn variant="primary" onClick={saveTxn} disabled={savingTxn}>
            {savingTxn ? "Saving…" : "Save"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={"Center"} required>
          <Select value={txnForm.branch_id} onChange={e => setTxnForm(f => ({ ...f, branch_id: e.target.value }))}>
            <option value="">{"— Select center —"}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>

        <Field label={"Category"}>
          <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
            {categoryNames.map(name => <option key={name} value={name}>{name}</option>)}
            <option value="Lainnya">{"Other"}</option>
          </Select>
        </Field>

        {txnForm.category === "Lainnya" && (
          <Field label={"Custom Category"}>
            <Input
              value={txnForm.categoryOther}
              onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))}
              placeholder={"E.g.: Alumni donation"}
            />
          </Field>
        )}

        <Field label={"Description"} required>
          <Input
            value={txnForm.description}
            onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))}
            placeholder={"E.g.: Annual swim event sponsorship"}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={"Amount (Rp)"} required>
            <Input type="number" value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <Field label={"Date"} required>
            <Input type="date" value={txnForm.occurred_at} onChange={e => setTxnForm(f => ({ ...f, occurred_at: e.target.value }))} />
          </Field>
        </div>

        <Field label={"Notes (optional)"}>
          <Textarea rows={2} value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>

        {showTxnModal.kind === "expense" && (
          <div className="space-y-3">
            <Switch
              checked={txnForm.isReimburse}
              onChange={val => setTxnForm(f => ({ ...f, isReimburse: val }))}
              label={"This is a reimbursable expense (proof required)"}
            />
            {txnForm.isReimburse && (
              <Field label={"Proof Link (Google Drive)"} required>
                <Input
                  value={txnForm.proofUrl}
                  onChange={e => setTxnForm(f => ({ ...f, proofUrl: e.target.value }))}
                  placeholder={"https://drive.google.com/..."}
                />
              </Field>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
