"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useCoachAbsensi } from "./useCoachAbsensi";

export default function PrivateSessionModal({ hook }: { hook: ReturnType<typeof useCoachAbsensi> }) {
  const { t } = useLocale();
  const {
    openPrivate, setOpenPrivate, privateClassId, setPrivateClassId,
    privateDate, setPrivateDate, privateNote, setPrivateNote,
    savingPrivate, savePrivateSession, privateClasses,
  } = hook;

  return (
    <Modal open={openPrivate} onClose={() => setOpenPrivate(false)} title={t("coach.absen.recordPrivateSessionTitle")}
      footer={<><Btn variant="ghost" onClick={() => setOpenPrivate(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={savePrivateSession} disabled={savingPrivate}>{savingPrivate ? t("coach.absen.savingBtn") : t("coach.absen.recordSessionConfirmBtn")}</Btn></>}>
      <div className="space-y-4">
        <div className="bg-wave-50 border border-wave-100 rounded-xl p-3 text-sm text-wave-800 flex gap-2">
          <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-wave-500" />
          <span>{t("coach.absen.privateSessionInfoBanner")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("coach.absen.fieldPrivateClass")} required>
            <Select value={privateClassId} onChange={e => setPrivateClassId(e.target.value)}>
              <option value="">{t("coach.absen.selectClassEllipsis")}</option>
              {privateClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t("coach.absen.fieldSessionDateSingle")} required><Input type="date" value={privateDate} onChange={e => setPrivateDate(e.target.value)} max={new Date().toISOString().split("T")[0]} /></Field>
        </div>
        <Field label={t("coach.absen.fieldNoteLabel")} hint={t("coach.absen.fieldNoteHint")}>
          <Textarea rows={2} value={privateNote} onChange={e => setPrivateNote(e.target.value)} placeholder={t("coach.absen.notePlaceholder")} />
        </Field>
      </div>
    </Modal>
  );
}
