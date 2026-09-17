"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/FormFields";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { FinancialHook } from "./index";

export default function ManualTxnModal({ hook }: { hook: FinancialHook }) {
  const { t, tNode } = useLocale();
  const {
    showTxnModal, setShowTxnModal, txnForm, setTxnForm, saveTxn, savingTxn,
    branches, categoriesByKind,
  } = hook;

  if (!showTxnModal) return null;
  const categoryNames = categoriesByKind(showTxnModal.kind).map(c => c.name);
  const kindLabel = t(showTxnModal.kind === "income" ? "owner.financial.txnKindIncome" : "owner.financial.txnKindExpense");

  return (
    <Modal
      open={!!showTxnModal}
      onClose={() => setShowTxnModal(null)}
      title={tNode(showTxnModal.edit ? "owner.financial.txnModalEditTitle" : "owner.financial.txnModalAddTitle", { kind: kindLabel })}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setShowTxnModal(null)}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" onClick={saveTxn} disabled={savingTxn}>
            {savingTxn ? t("common.actions.saving") : t("common.actions.save")}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={t("owner.financial.fieldBranch")} required>
          <Select value={txnForm.branch_id} onChange={e => setTxnForm(f => ({ ...f, branch_id: e.target.value }))}>
            <option value="">{t("owner.financial.fieldBranchPlaceholder")}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>

        <Field label={t("owner.financial.fieldCategory")}>
          <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
            {categoryNames.map(name => <option key={name} value={name}>{name}</option>)}
            <option value="Lainnya">{t("owner.financial.categoryOther")}</option>
          </Select>
        </Field>

        {txnForm.category === "Lainnya" && (
          <Field label={t("owner.financial.fieldCategoryOther")}>
            <Input
              value={txnForm.categoryOther}
              onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))}
              placeholder={t("owner.financial.fieldCategoryOtherPlaceholder")}
            />
          </Field>
        )}

        <Field label={t("owner.financial.fieldDescription")} required>
          <Input
            value={txnForm.description}
            onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t("owner.financial.fieldDescriptionPlaceholder")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("owner.financial.fieldAmount")} required>
            <Input type="number" value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <Field label={t("owner.financial.fieldDate")} required>
            <Input type="date" value={txnForm.occurred_at} onChange={e => setTxnForm(f => ({ ...f, occurred_at: e.target.value }))} />
          </Field>
        </div>

        <Field label={t("owner.financial.fieldNotes")}>
          <Textarea rows={2} value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>

        {showTxnModal.kind === "expense" && (
          <div className="space-y-3">
            <Switch
              checked={txnForm.isReimburse}
              onChange={val => setTxnForm(f => ({ ...f, isReimburse: val }))}
              label={t("owner.financial.fieldIsReimburse")}
            />
            {txnForm.isReimburse && (
              <Field label={t("owner.financial.fieldProofUrl")} required>
                <Input
                  value={txnForm.proofUrl}
                  onChange={e => setTxnForm(f => ({ ...f, proofUrl: e.target.value }))}
                  placeholder={t("owner.financial.fieldProofUrlPlaceholder")}
                />
              </Field>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
