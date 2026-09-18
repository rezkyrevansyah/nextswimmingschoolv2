"use client";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useIzinData } from "./useIzinData";

type IzinDataHook = ReturnType<typeof useIzinData>;

export default function CreateLeaveModal({ hook }: { hook: IzinDataHook }) {
  const {
    tab, openCreate, setOpenCreate, createForm, setCreateForm, creating, createLeave,
    allCoaches, allStudents, allClasses,
  } = hook;

  return (
    <Modal open={openCreate} onClose={() => setOpenCreate(false)} title={`Create ${tab === "coach" ? "Coach" : "Student"} Leave`} size="sm"
      footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>{"Cancel"}</Btn><Btn variant="primary" icon="check" onClick={createLeave} disabled={creating}>{creating ? "Saving…" : "Create Leave"}</Btn></>}>
      <div className="space-y-4">
        <Field label={tab === "coach" ? "Coach" : "Student"} required>
          <Select value={createForm.target_id} onChange={e => setCreateForm(f => ({ ...f, target_id: e.target.value }))}>
            <option value="">{`— select ${tab === "coach" ? "Coach".toLowerCase() : "Student".toLowerCase()} —`}</option>
            {tab === "coach"
              ? allCoaches.map(c => <option key={c.id} value={c.id} translate="no">{c.full_name}</option>)
              : allStudents.map(m => <option key={m.id} value={m.id} translate="no">{m.full_name}</option>)}
          </Select>
        </Field>
        <Field label={"Leave type"} required>
          <Select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
            <option value="sakit">{"Sick"}</option>
            <option value="izin">{"Permission"}</option>
            <option value="cuti">{"Leave"}</option>
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Start date"} required><Input type="date" value={createForm.date_from} onChange={e => setCreateForm(f => ({ ...f, date_from: e.target.value }))} /></Field>
          <Field label={"End date"} required><Input type="date" value={createForm.date_to} onChange={e => setCreateForm(f => ({ ...f, date_to: e.target.value }))} min={createForm.date_from} /></Field>
        </div>
        <Field label={"Classes affected"} hint={"Optional"}>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {allClasses.map(c => {
              const sel = createForm.class_ids.includes(c.id);
              return (
                <button key={c.id} type="button"
                  onClick={() => setCreateForm(f => {
                    const newIds = sel ? f.class_ids.filter(id => id !== c.id) : [...f.class_ids, c.id];
                    const newSubs = { ...f.class_substitutes };
                    if (sel) delete newSubs[c.id];
                    return { ...f, class_ids: newIds, class_substitutes: newSubs };
                  })}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${sel ? "bg-ocean-700 text-white border-ocean-700" : "bg-paper-tint border-line text-ink-soft hover:border-ocean-300"}`}>
                  <NoTranslate>{c.name}</NoTranslate>
                </button>
              );
            })}
          </div>
        </Field>
        {tab === "coach" && createForm.class_ids.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider mb-2">{"Substitute Coach per Class"}</div>
            <div className="space-y-3">
              {allClasses.filter(c => createForm.class_ids.includes(c.id)).map(c => (
                <div key={c.id} className="space-y-1.5">
                  <div className="text-sm font-semibold text-ink"><NoTranslate>{c.name}</NoTranslate></div>
                  <Select
                    value={createForm.class_substitutes[c.id] ?? ""}
                    onChange={e => setCreateForm(f => ({ ...f, class_substitutes: { ...f.class_substitutes, [c.id]: e.target.value } }))}
                  >
                    <option value="">{"— no substitute —"}</option>
                    {allCoaches.filter(c2 => c2.id !== createForm.target_id).map(c2 => <option key={c2.id} value={c2.id} translate="no">{c2.full_name}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}
        <Field label={"Notes"} hint={"Optional"}>
          <Textarea rows={2} value={createForm.reason} onChange={e => setCreateForm(f => ({ ...f, reason: e.target.value }))} placeholder={"E.g. Fever since yesterday."} />
        </Field>
      </div>
    </Modal>
  );
}
