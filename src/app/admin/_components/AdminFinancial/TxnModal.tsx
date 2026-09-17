"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import type { useAdminFinancialData } from "./useAdminFinancialData";

type AdminFinancialDataHook = ReturnType<typeof useAdminFinancialData>;

export default function TxnModal({ hook }: { hook: AdminFinancialDataHook }) {
  const { t } = useLocale();
  const { showTxnModal, setShowTxnModal, txnForm, setTxnForm, savingTxn, saveTxn, categoriesByKind } = hook;

  return (
    <Modal open={!!showTxnModal} onClose={() => setShowTxnModal(null)}
      title={t(showTxnModal?.edit ? "admin.financial.editModalTitleEdit" : "admin.financial.addModalTitleAdd", { kind: t(showTxnModal?.kind === "income" ? "admin.financial.kindIncome" : "admin.financial.kindExpense") })}
      size="md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Btn variant="ghost" onClick={() => setShowTxnModal(null)}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" onClick={saveTxn} disabled={savingTxn}>{savingTxn ? t("common.actions.saving") : t("common.actions.save")}</Btn>
        </div>
      }>
      <div className="space-y-4">
        <Field label={t("admin.financial.fieldCategory")}>
          <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
            {categoriesByKind(showTxnModal?.kind ?? "income").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          {categoriesByKind(showTxnModal?.kind ?? "income").length === 0 && (
            <p className="text-xs text-warn-600 mt-1">{t("admin.financial.noCategoriesHint")}</p>
          )}
        </Field>
        {txnForm.category === "Lainnya" && (
          <Field label={t("admin.financial.fieldCategoryCustom")}><Input value={txnForm.categoryOther} onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))} placeholder={t("admin.financial.categoryCustomPlaceholder")} /></Field>
        )}
        <Field label={t("admin.financial.fieldDescription")}><Input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} placeholder={t("admin.financial.descriptionPlaceholder")} /></Field>
        {showTxnModal?.kind === "expense" && (
          <>
            <Switch checked={txnForm.isReimburse} onChange={v => setTxnForm(f => ({ ...f, isReimburse: v }))} label={t("admin.financial.reimburseSwitchLabel")} />
            {txnForm.isReimburse && (
              <Field label={t("admin.financial.fieldProofLink")}>
                <Input value={txnForm.proofUrl} onChange={e => setTxnForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder="https://drive.google.com/..." type="url" />
              </Field>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("admin.financial.fieldAmount")}><Input type="number" inputMode="numeric" min={0} value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} /></Field>
          <Field label={t("admin.financial.fieldDate")}><Input type="date" value={txnForm.occurred_at} onChange={e => setTxnForm(f => ({ ...f, occurred_at: e.target.value }))} className="font-mono" /></Field>
        </div>
        <Field label={t("admin.financial.fieldNotesOptional")}><Textarea value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
      </div>
    </Modal>
  );
}
