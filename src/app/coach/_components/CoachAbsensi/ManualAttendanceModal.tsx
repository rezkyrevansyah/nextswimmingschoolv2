"use client";
import Btn from "@/components/ui/Btn";
import { Field, Select } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { MEMBER_DB_STATUSES, uiToMemberDb } from "@/lib/attendance";
import type { ClassRow } from "../../_types";
import type { useCoachAbsensi } from "./useCoachAbsensi";

export default function ManualAttendanceModal({ hook, classes }: { hook: ReturnType<typeof useCoachAbsensi>; classes: ClassRow[] }) {
  const {
    openManual, closeManualModal, manualClassId, onManualClassChange,
    manualDate, setManualDate, manualSessionDates, memberAtt, attStatus, setAttStatus,
    saving, saveManualAtt,
  } = hook;

  return (
    <Modal open={openManual} onClose={closeManualModal} title={"Manual Student Attendance"}
      footer={<><Btn variant="ghost" onClick={closeManualModal}>{"Cancel"}</Btn><Btn variant="primary" onClick={saveManualAtt} disabled={saving}>{saving ? "Saving…" : "Submit"}</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Class"} required>
            <Select value={manualClassId} onChange={e => onManualClassChange(e.target.value)}>
              <option value="">{"Select class…"}</option>
              {classes.filter(c => c.class_type !== "private").map(c => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
            </Select>
          </Field>
          <Field label={"Session / date"} required>
            <Select value={manualDate} onChange={e => setManualDate(e.target.value)} disabled={!manualClassId}>
              <option value="">{manualClassId ? "Select session…" : "Select a class first"}</option>
              {manualSessionDates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
        </div>
        {memberAtt.length > 0 && (
          <div className="space-y-2">
            {memberAtt.map((m) => (
              <div key={m.member_id} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                <Avatar name={m.member?.full_name ?? "?"} src={m.member?.avatar_url ?? undefined} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm truncate"><NoTranslate>{m.member?.full_name}</NoTranslate></div>
                  {m.type === "school_affiliate" && m.school_grade && (
                    <div className="text-[11px] text-ink-mute truncate">{"School Grade"}: <NoTranslate>{m.school_grade}</NoTranslate></div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {MEMBER_DB_STATUSES.map(id => {
                    const label = id === "hadir" ? "Present" : id === "telat" ? "Late" : id === "izin" ? "Leave" : id === "sakit" ? "Sick" : "Absent";
                    const active = (attStatus[m.member_id] ?? uiToMemberDb("present")) === id;
                    const activeStyle = id === "hadir" ? "border-ok-500 bg-ok-50 text-ok-600" : id === "telat" ? "border-warn-500 bg-warn-50 text-warn-600" : id === "tidak_hadir" ? "border-danger-500 bg-danger-50 text-danger-600" : "border-warn-400 bg-warn-50 text-warn-500";
                    return (
                      <button key={id} onClick={() => setAttStatus(s => ({ ...s, [m.member_id]: id }))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${active ? activeStyle : "border-line text-ink-mute hover:bg-paper-tint"}`}>{label}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
