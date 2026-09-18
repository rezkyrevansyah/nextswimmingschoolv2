"use client";
import { Field, Input, Switch } from "@/components/ui/FormFields";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import type { useStudentPrivateData } from "./useStudentPrivateData";

type StudentPrivateDataHook = ReturnType<typeof useStudentPrivateData>;

export default function AddSessionsModal({ hook }: { hook: StudentPrivateDataHook }) {
  const { addSesiTarget, setAddSesiTarget, addSesiForm, setAddSesiForm, savingAddSesi, doAddSesi } = hook;

  return (
    <Modal
      open={!!addSesiTarget}
      onClose={() => setAddSesiTarget(null)}
      title={"Add Sessions"}
      footer={
        <>
          <Btn variant="ghost" onClick={() => setAddSesiTarget(null)}>{"Cancel"}</Btn>
          <Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? "Saving…" : "Save"}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={"Number of Sessions"} required>
          <Input type="number" min={1} value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-soft">{"Also generate a bill"}</span>
          <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
        </div>
        {addSesiForm.generate_bill && (
          <Field label={"Package Price for This Batch (Rp)"} hint={"Total price for the sessions being added, not per session"}>
            <Input type="number" min={0} value={addSesiForm.price} onChange={e => setAddSesiForm(f => ({ ...f, price: e.target.value }))} />
          </Field>
        )}
      </div>
    </Modal>
  );
}
