"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { PayslipHook } from "./index";

export default function EditPayslipModal({ hook }: { hook: PayslipHook }) {
  const {
    editSlip, setEditSlip, editPeriod, setEditPeriod, editGross, setEditGross,
    editNotes, setEditNotes, editDeductions, setEditDeductions, savingEdit, handleSaveEdit,
  } = hook;

  return (
    <Modal
      open={!!editSlip}
      onClose={() => setEditSlip(null)}
      title={"Edit Draft Payslip"}
      size="md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Btn variant="ghost" onClick={() => setEditSlip(null)}>
            {"Cancel"}
          </Btn>
          <Btn variant="primary" onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit ? "Saving…" : "Save"}
          </Btn>
        </div>
      }
    >
      {editSlip && (
        <div className="space-y-4">
          <div className="bg-paper-tint rounded-xl p-3 text-xs flex justify-between">
            <span className="font-semibold text-ink"><NoTranslate>{editSlip.coach?.full_name ?? "—"}</NoTranslate></span>
            <span className="text-ink-mute"><NoTranslate>{editSlip.branch?.name ?? "—"}</NoTranslate></span>
          </div>

          <Field label={"Period"} required>
            <Input value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)} />
          </Field>

          <Field label={"Gross Salary (Rp)"} required>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={editGross}
              onChange={(e) => setEditGross(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-sm"
            />
          </Field>

          {/* Deductions Editor */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider">{"Deductions"}</div>
            {editDeductions.map((d, idx) => (
              <div key={d.id || idx} className="flex items-center gap-2">
                <Input
                  value={d.label}
                  onChange={(e) => {
                    const next = [...editDeductions];
                    next[idx].label = e.target.value;
                    setEditDeductions(next);
                  }}
                  placeholder={"Deduction name"}
                  className="text-xs"
                />
                <div className="w-36">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={d.amount}
                    onChange={(e) => {
                      const next = [...editDeductions];
                      next[idx].amount = Number(e.target.value.replace(/\D/g, ""));
                      setEditDeductions(next);
                    }}
                    className="text-xs font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setEditDeductions(editDeductions.filter((_, i) => i !== idx))}
                  className="w-7 h-7 rounded-lg text-danger-500 hover:bg-danger-50 flex items-center justify-center shrink-0"
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Btn
              variant="outline"
              size="sm"
              icon="plus"
              onClick={() =>
                setEditDeductions([...editDeductions, { id: `temp-${Date.now()}`, label: "Other Deduction", amount: 0, type: "other" }])
              }
            >
              {"Add Deduction"}
            </Btn>
          </div>

          <Field label={"Notes (optional)"}>
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
          </Field>
        </div>
      )}
    </Modal>
  );
}
