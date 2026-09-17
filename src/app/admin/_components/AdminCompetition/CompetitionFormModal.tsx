"use client";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import type { AdminCompetitionHook } from "./_hook";

export default function CompetitionFormModal({ hook, onSaved }: { hook: AdminCompetitionHook; onSaved?: (newCompId: string) => void }) {
  const {
    t, openCompForm, setOpenCompForm, editComp, compForm, setCompForm, savingComp, handleSaveComp,
  } = hook;

  if (!openCompForm) return null;

  return (
    <Modal
      open={openCompForm}
      onClose={() => setOpenCompForm(false)}
      title={editComp ? t("admin.competition.editCompModalTitle") : t("admin.competition.addCompModalTitle")}
    >
      <form onSubmit={e => handleSaveComp(e, onSaved)} className="space-y-4">
        <Field label={t("admin.competition.fieldName")} required hint={t("admin.competition.fieldNameHint")}>
          <Input
            value={compForm.name}
            onChange={e => setCompForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t("admin.competition.fieldNamePlaceholder")}
            required
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admin.competition.fieldOrganizer")} hint={t("admin.competition.fieldOrganizerHint")}>
            <Input
              value={compForm.organizer}
              onChange={e => setCompForm(prev => ({ ...prev, organizer: e.target.value }))}
              placeholder={t("admin.competition.fieldOrganizerPlaceholder")}
            />
          </Field>
          <Field label={t("admin.competition.fieldLevel")}>
            <Select value={compForm.level} onChange={e => setCompForm(prev => ({ ...prev, level: e.target.value }))}>
              <option value="internal">{t("admin.competition.levelInternal")}</option>
              <option value="local">{t("admin.competition.levelLocal")}</option>
              <option value="regional">{t("admin.competition.levelRegional")}</option>
              <option value="national">{t("admin.competition.levelNational")}</option>
              <option value="international">{t("admin.competition.levelInternational")}</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admin.competition.fieldLocation")}>
            <Input
              value={compForm.location}
              onChange={e => setCompForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder={t("admin.competition.fieldLocationPlaceholder")}
            />
          </Field>
          <Field label={t("admin.competition.fieldCity")}>
            <Input
              value={compForm.city}
              onChange={e => setCompForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Contoh: Bandung"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admin.competition.fieldStartDate")} required>
            <DatePicker
              value={compForm.start_date}
              onChange={d => setCompForm(prev => ({ ...prev, start_date: d }))}
            />
          </Field>
          <Field label={t("admin.competition.fieldEndDate")}>
            <DatePicker
              value={compForm.end_date}
              onChange={d => setCompForm(prev => ({ ...prev, end_date: d }))}
            />
          </Field>
        </div>

        <Field label={t("admin.competition.fieldNotes")}>
          <Textarea
            rows={3}
            value={compForm.description}
            onChange={e => setCompForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder={t("admin.competition.fieldNotesPlaceholder")}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <Btn variant="ghost" onClick={() => setOpenCompForm(false)}>
            Batal
          </Btn>
          <Btn variant="primary" type="submit" disabled={savingComp}>
            {savingComp ? t("admin.competition.savingBtn") : editComp ? t("admin.competition.saveChangesBtn") : t("admin.competition.createCompBtn")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
