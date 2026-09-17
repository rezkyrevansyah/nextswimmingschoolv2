"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { PayslipHook } from "./index";

export default function TaxSettingsModal({ hook }: { hook: PayslipHook }) {
  const { t } = useLocale();
  const {
    showTaxModal, setShowTaxModal, saveTaxSetting, savingTax,
    taxMode, setTaxMode, taxPercent, setTaxPercent, taxFixed, setTaxFixed,
  } = hook;

  return (
    <Modal
      open={showTaxModal}
      onClose={() => setShowTaxModal(false)}
      title={t("owner.payslip.taxSettingsTitle")}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Btn variant="ghost" onClick={() => setShowTaxModal(false)}>
            {t("common.actions.cancel")}
          </Btn>
          <Btn variant="primary" onClick={saveTaxSetting} disabled={savingTax}>
            {savingTax ? t("owner.payslip.savingLabel") : t("owner.payslip.saveSettingsBtn")}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-mute">
          {t("owner.payslip.taxSettingsModalSub")}
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
              {t("owner.payslip.taxModePercent")}
            </button>
            <button
              type="button"
              onClick={() => setTaxMode("fixed")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                taxMode === "fixed" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {t("owner.payslip.taxModeFixed")}
            </button>
          </div>
          <div>
            {taxMode === "percent" ? (
              <Field label={t("owner.payslip.fieldTaxPercentageRate")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  placeholder={t("owner.payslip.fieldTaxPercentagePlaceholder")}
                  className="font-mono text-sm"
                />
              </Field>
            ) : (
              <Field label={t("owner.payslip.fieldTaxFixedAmount")}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={taxFixed ? Number(taxFixed).toLocaleString("id-ID") : ""}
                  onChange={(e) => setTaxFixed(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("owner.payslip.fieldTaxFixedPlaceholder")}
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
