"use client";
import { useState } from "react";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { DraftReimburseItem } from "../../_types";

export default function ReimburseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Omit<DraftReimburseItem, "id">) => void }) {
  const toast = useToast();
  const { t } = useLocale();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const submit = () => {
    const desc = description.trim();
    const url = proofUrl.trim();
    const val = Number(amount);
    if (!desc) return toast.error(t("coach.reimburse.descriptionRequired"));
    if (!val || val <= 0) return toast.error(t("coach.reimburse.validAmountRequired"));
    if (!url) return toast.error(t("coach.reimburse.proofLinkRequired"));
    onAdd({ description: desc, amount: val, proofUrl: url });
  };

  return (
    <Modal open onClose={onClose} title={t("coach.reimburse.modalTitle")} size="md"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={submit}>{t("coach.reimburse.addToInvoiceBtn")}</Btn></>}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800 leading-relaxed">
          {t("coach.reimburse.hint")}
        </div>
        <Field label={t("coach.reimburse.fieldDescription")}>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t("coach.reimburse.descriptionPlaceholder")} />
        </Field>
        <Field label={t("coach.reimburse.fieldAmount")}>
          <Input type="number" inputMode="numeric" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="150000" />
        </Field>
        <Field label={t("coach.reimburse.fieldProofLink")}>
          <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://drive.google.com/..." type="url" />
        </Field>
      </div>
    </Modal>
  );
}
