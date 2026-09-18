"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import type { PayslipHook } from "./index";

export default function TaxSettingsModal({ hook }: { hook: PayslipHook }) {
  const {
    showTaxModal, setShowTaxModal, saveTaxSetting, savingTax,
    taxMode, setTaxMode, taxPercent, setTaxPercent, taxFixed, setTaxFixed,
  } = hook;

  return (
    <Modal
      open={showTaxModal}
      onClose={() => setShowTaxModal(false)}
      title={"Tax Settings (PPh 21)"}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Btn variant="ghost" onClick={() => setShowTaxModal(false)}>
            {"Cancel"}
          </Btn>
          <Btn variant="primary" onClick={saveTaxSetting} disabled={savingTax}>
            {savingTax ? "Saving..." : "Save Settings"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-mute">
          {"Set the default income tax (PPh 21) withholding rate for coach honoraria and staff payslips. This rate is applied automatically when generating a payslip."}
        </p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaxMode("percent")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                taxMode === "percent" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {"Percentage (%)"}
            </button>
            <button
              type="button"
              onClick={() => setTaxMode("fixed")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                taxMode === "fixed" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {"Fixed Amount (Rp)"}
            </button>
          </div>
          <div>
            {taxMode === "percent" ? (
              <Field label={"Tax Percentage Rate"}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  placeholder={"E.g.: 2.5 or 5"}
                  className="font-mono text-sm"
                />
              </Field>
            ) : (
              <Field label={"Fixed Tax Amount"}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={taxFixed ? Number(taxFixed).toLocaleString("id-ID") : ""}
                  onChange={(e) => setTaxFixed(e.target.value.replace(/\D/g, ""))}
                  placeholder={"E.g.: 50,000"}
                  className="font-mono text-sm"
                />
              </Field>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
