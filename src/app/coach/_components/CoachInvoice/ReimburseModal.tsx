"use client";
import { useState } from "react";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import type { DraftReimburseItem } from "../../_types";

export default function ReimburseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Omit<DraftReimburseItem, "id">) => void }) {
  const toast = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const submit = () => {
    const desc = description.trim();
    const url = proofUrl.trim();
    const val = Number(amount);
    if (!desc) return toast.error("Enter a description first");
    if (!val || val <= 0) return toast.error("Enter a valid amount");
    if (!url) return toast.error("Enter the proof link first");
    onAdd({ description: desc, amount: val, proofUrl: url });
  };

  return (
    <Modal open onClose={onClose} title={"Add Expenses / Reimburse"} size="md"
      footer={<><Btn variant="ghost" onClick={onClose}>{"Cancel"}</Btn><Btn variant="primary" onClick={submit}>{"Add to Invoice"}</Btn></>}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800 leading-relaxed">
          {"Submit a reimbursement request for an expense (e.g. buying equipment). Include a Google Drive link as proof. This item will be added to the invoice when you click Generate Invoice."}
        </div>
        <Field label={"Description"}>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={"E.g. Bought a new kickboard"} />
        </Field>
        <Field label={"Amount (Rp)"}>
          <Input type="number" inputMode="numeric" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="150000" />
        </Field>
        <Field label={"Proof Link (Google Drive)"}>
          <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://drive.google.com/..." type="url" />
        </Field>
      </div>
    </Modal>
  );
}
