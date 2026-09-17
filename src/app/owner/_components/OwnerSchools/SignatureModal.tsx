"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Btn from "@/components/ui/Btn";
import { Field, Input, Switch } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import type { useOwnerSchoolsData } from "./useOwnerSchoolsData";

type OwnerSchoolsDataHook = ReturnType<typeof useOwnerSchoolsData>;

export default function SignatureModal({ hook }: { hook: OwnerSchoolsDataHook }) {
  const { t } = useLocale();
  const { showSigModal, setShowSigModal, sigForm, setSigForm, setSigFile, sigSaving, saveSignature } = hook;

  return (
    <Modal open={showSigModal} onClose={() => setShowSigModal(false)} title={sigForm.id ? t("owner.schools.editSigModalTitle") : t("owner.schools.addSigModalTitle")} size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setShowSigModal(false)}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" onClick={saveSignature} disabled={sigSaving}>{sigSaving ? t("common.actions.saving") : t("owner.schools.sigSaved")}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("owner.schools.fieldSignerName")} required>
          <Input value={sigForm.name} onChange={e => setSigForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dra. Hj. Siti Aminah, M.Pd" />
        </Field>
        <Field label={t("owner.schools.fieldSignerTitle")} required>
          <Input value={sigForm.title} onChange={e => setSigForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Kepala Sekolah SMAN 70 Jakarta / Principal" />
        </Field>
        <Field label={t("owner.schools.fieldSignerActive")}>
          <div className="flex items-center gap-3">
            <Switch checked={sigForm.is_active} onChange={checked => setSigForm(f => ({ ...f, is_active: checked }))} />
            <span className="text-sm text-ink-mute">{t("owner.schools.activeSigBadge")}</span>
          </div>
        </Field>
        <Field label={t("owner.schools.fieldSignerImage")} required={!sigForm.id}>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" onChange={e => setSigFile(e.target.files?.[0] ?? null)} className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer" />
          <div className="text-xs text-ink-mute mt-1.5">Disarankan format PNG transparan atau SVG dengan kontras tajam (garis tinta hitam/biru tua).</div>
        </Field>
      </div>
    </Modal>
  );
}
