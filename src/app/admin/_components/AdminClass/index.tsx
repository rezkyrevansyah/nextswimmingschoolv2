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
  const { t, showArchived, setShowArchived, archivedCount, openCreate } = hook;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{t("admin.classes.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("admin.classes.pageSub")}</p></div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Btn variant="ghost" icon="archive" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? t("admin.classes.viewActiveBtn") : t("admin.classes.archivedCountBtn", { count: archivedCount })}
            </Btn>
          )}
          {!showArchived && <Btn variant="primary" icon="plus" onClick={openCreate}>{t("admin.classes.addClassBtn")}</Btn>}
        </div>
      </div>
      {showArchived && (
        <div className="flex items-center gap-2 px-4 py-3 bg-archive-50 border border-archive-500/20 rounded-xl text-sm text-archive-600">
          <Icon name="archive" className="w-4 h-4 shrink-0" />
          <span>{t("admin.classes.archivedBannerText", { count: archivedCount })}</span>
        </div>
      )}

      <ClassGrid hook={hook} />
      <ClassFormModal hook={hook} />
      <ClassAttendanceModal hook={hook} />
      <ClassPackagesModal hook={hook} />
    </div>
  );
}
