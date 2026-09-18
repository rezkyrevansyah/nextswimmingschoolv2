"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminCoachHook } from "./_hook";

export default function AssignClassModal({ hook }: { hook: AdminCoachHook }) {
  const {
    detail, openAssign, setOpenAssign, assignSaving, saveAssign,
    allClasses, assignedClassIds, setAssignedClassIds, assignRoles, setAssignRoles,
  } = hook;

  return (
    <Modal open={openAssign} onClose={() => setOpenAssign(false)} title={(<>{"Assign Class — "}<NoTranslate>{detail?.full_name ?? ""}</NoTranslate></>)} size="sm"
      footer={<><Btn variant="ghost" onClick={() => setOpenAssign(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={saveAssign} disabled={assignSaving}>{assignSaving ? "Saving…" : "Save"}</Btn></>}>
      <div className="space-y-3">
        <p className="text-sm text-ink-mute">{"Select the classes this coach will handle, then set their role (Head/Assistant). Max 1 head per class — setting a head here automatically demotes the previous head of that class."}</p>
        {allClasses.length === 0 ? (
          <div className="text-sm text-ink-mute py-4 text-center">{"No active classes in this center."}</div>
        ) : (
          <div className="space-y-2">
            {allClasses.map(cls => {
              const checked = assignedClassIds.includes(cls.id);
              const role = assignRoles[cls.id] ?? "assistant";
              return (
                <div key={cls.id}
                  className={`w-full rounded-xl border transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                  <button type="button" onClick={() => setAssignedClassIds(ids => checked ? ids.filter(id => id !== cls.id) : [...ids, cls.id])}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                      {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink"><NoTranslate>{cls.name}</NoTranslate></div>
                      {cls.schedule_days && <div className="text-xs text-ink-mute"><NoTranslate>{cls.schedule_days.join(", ")}</NoTranslate>{cls.time_start ? ` · ${cls.time_start.slice(0,5)}${cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}` : ""}</div>}
                    </div>
                  </button>
                  {checked && (
                    <div className="flex items-center gap-2 px-4 pb-3 pl-12">
                      <button type="button" onClick={() => setAssignRoles(r => ({ ...r, [cls.id]: "head" }))}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${role === "head" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                        {"Head"}
                      </button>
                      <button type="button" onClick={() => setAssignRoles(r => ({ ...r, [cls.id]: "assistant" }))}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors ${role === "assistant" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                        {"Assistant"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
