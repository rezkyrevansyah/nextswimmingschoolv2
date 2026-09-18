"use client";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import type { AdminCompetitionHook } from "./_hook";

export default function CompetitionFormModal({ hook, onSaved }: { hook: AdminCompetitionHook; onSaved?: (newCompId: string) => void }) {
  const {
    openCompForm, setOpenCompForm, editComp, compForm, setCompForm, savingComp, handleSaveComp,
  } = hook;

  if (!openCompForm) return null;

  return (
    <Modal
      open={openCompForm}
      onClose={() => setOpenCompForm(false)}
      title={editComp ? "Edit Competition" : "Add New Competition"}
    >
      <form onSubmit={e => handleSaveComp(e, onSaved)} className="space-y-4">
        <Field label={"Competition Name"} required hint={"E.g. West Java Regional Swimming Championship 2026"}>
          <Input
            value={compForm.name}
            onChange={e => setCompForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder={"Enter official competition name"}
            required
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Organizer"} hint={"E.g.: West Java Swimming Association / Ministry of Youth and Sports"}>
            <Input
              value={compForm.organizer}
              onChange={e => setCompForm(prev => ({ ...prev, organizer: e.target.value }))}
              placeholder={"Event organizer"}
            />
          </Field>
          <Field label={"Level"}>
            <Select value={compForm.level} onChange={e => setCompForm(prev => ({ ...prev, level: e.target.value }))}>
              <option value="internal">{"Internal"}</option>
              <option value="local">{"Local / City"}</option>
              <option value="regional">{"Regional / Province"}</option>
              <option value="national">{"National"}</option>
              <option value="international">{"International"}</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Pool Location / Venue"}>
            <Input
              value={compForm.location}
              onChange={e => setCompForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder={"E.g.: UPI Bandung Swimming Pool"}
            />
          </Field>
          <Field label={"City"}>
            <Input
              value={compForm.city}
              onChange={e => setCompForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Contoh: Bandung"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Start Date"} required>
            <DatePicker
              value={compForm.start_date}
              onChange={d => setCompForm(prev => ({ ...prev, start_date: d }))}
            />
          </Field>
          <Field label={"End Date (Optional)"}>
            <DatePicker
              value={compForm.end_date}
              onChange={d => setCompForm(prev => ({ ...prev, end_date: d }))}
            />
          </Field>
        </div>

        <Field label={"Notes / Description (Optional)"}>
          <Textarea
            rows={3}
            value={compForm.description}
            onChange={e => setCompForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder={"Additional notes on qualifying rounds, age requirements, etc."}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <Btn variant="ghost" onClick={() => setOpenCompForm(false)}>
            Batal
          </Btn>
          <Btn variant="primary" type="submit" disabled={savingComp}>
            {savingComp ? "Saving..." : editComp ? "Save Changes" : "Create Competition"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
