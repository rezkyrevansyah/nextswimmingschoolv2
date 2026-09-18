"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { useClassData } from "./useClassData";
import ClassGrid from "./ClassGrid";
import ClassFormModal from "./ClassFormModal";
import ClassAttendanceModal from "./ClassAttendanceModal";
import ClassPackagesModal from "./ClassPackagesModal";

export default function AdminClass({ branchId }: { branchId: string }) {
  const hook = useClassData(branchId);
  const { showArchived, setShowArchived, archivedCount, openCreate } = hook;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{"Class Management"}</h2><p className="text-ink-mute text-sm mt-0.5">{"Create classes, set schedules, and configure assessment criteria."}</p></div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Btn variant="ghost" icon="archive" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? "View active classes" : `Archived (${archivedCount})`}
            </Btn>
          )}
          {!showArchived && <Btn variant="primary" icon="plus" onClick={openCreate}>{"Add Class"}</Btn>}
        </div>
      </div>
      {showArchived && (
        <div className="flex items-center gap-2 px-4 py-3 bg-archive-50 border border-archive-500/20 rounded-xl text-sm text-archive-600">
          <Icon name="archive" className="w-4 h-4 shrink-0" />
          <span>{`Showing ${archivedCount} archived classes. Archived classes don't appear anywhere.`}</span>
        </div>
      )}

      <ClassGrid hook={hook} />
      <ClassFormModal hook={hook} />
      <ClassAttendanceModal hook={hook} />
      <ClassPackagesModal hook={hook} />
    </div>
  );
}
