"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field, Input, Switch } from "@/components/ui/FormFields";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import type { useMemberPrivateData } from "./useMemberPrivateData";

type MemberPrivateDataHook = ReturnType<typeof useMemberPrivateData>;

export default function AddSessionsModal({ hook }: { hook: MemberPrivateDataHook }) {
  const { t } = useLocale();
  const { addSesiTarget, setAddSesiTarget, addSesiForm, setAddSesiForm, savingAddSesi, doAddSesi } = hook;

  return (
    <Modal
      open={!!addSesiTarget}
      onClose={() => setAddSesiTarget(null)}
      title={t("admin.memberPrivate.addSessionsTitle")}
      footer={
        <>
          <Btn variant="ghost" onClick={() => setAddSesiTarget(null)}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? t("common.actions.saving") : t("common.actions.save")}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("admin.memberPrivate.fieldSessionCount")} required>
          <Input type="number" min={1} value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-soft">{t("admin.memberPrivate.generateBillLabel")}</span>
          <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
        </div>
        {addSesiForm.generate_bill && (
          <Field label={t("admin.memberPrivate.fieldBatchPackagePrice")} hint={t("admin.memberPrivate.fieldBatchPackagePriceHint")}>
            <Input type="number" min={0} value={addSesiForm.price} onChange={e => setAddSesiForm(f => ({ ...f, price: e.target.value }))} />
          </Field>
        )}
      </div>
    </Modal>
  );
}
