"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import type { useCoachAbsensi } from "./useCoachAbsensi";

export default function PrivateSessionModal({ hook }: { hook: ReturnType<typeof useCoachAbsensi> }) {
  const {
    openPrivate, setOpenPrivate, privateClassId, setPrivateClassId,
    privateDate, setPrivateDate, privateNote, setPrivateNote,
    savingPrivate, savePrivateSession, privateClasses,
  } = hook;

  return (
    <Modal open={openPrivate} onClose={() => setOpenPrivate(false)} title={"Record Private Session"}
      footer={<><Btn variant="ghost" onClick={() => setOpenPrivate(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={savePrivateSession} disabled={savingPrivate}>{savingPrivate ? "Saving…" : "Record Session"}</Btn></>}>
      <div className="space-y-4">
        <div className="bg-wave-50 border border-wave-100 rounded-xl p-3 text-sm text-wave-800 flex gap-2">
          <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-wave-500" />
          <span>{"Recording this session will automatically deduct 1 remaining session from the student."}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Private class"} required>
            <Select value={privateClassId} onChange={e => setPrivateClassId(e.target.value)}>
              <option value="">{"Select class…"}</option>
              {privateClasses.map(c => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
            </Select>
          </Field>
          <Field label={"Session date"} required><Input type="date" value={privateDate} onChange={e => setPrivateDate(e.target.value)} max={new Date().toISOString().split("T")[0]} /></Field>
        </div>
        <Field label={"Note"} hint={"Optional — material, student condition, etc."}>
          <Textarea rows={2} value={privateNote} onChange={e => setPrivateNote(e.target.value)} placeholder={"E.g. Breaststroke drills, good progress."} />
        </Field>
      </div>
    </Modal>
  );
}
