"use client";
import Icon from "@/components/ui/Icon";
import { useClassesListData } from "./useClassesListData";
import { useClassDetailData } from "./useClassDetailData";
import type { OwnerClassesMasterHook } from "./_hook";
import ClassesToolbar from "./ClassesToolbar";
import ClassesTable from "./ClassesTable";
import ClassFormModal from "./ClassFormModal";
import ClassDetailModal from "./ClassDetailModal";

export default function OwnerClassesMaster({ branches }: { branches: { id: string; name: string }[] }) {
  const list = useClassesListData(branches);
  const detail = useClassDetailData({ allCoaches: list.allCoaches, load: list.load, setClasses: list.setClasses });
  const hook: OwnerClassesMasterHook = { ...list, ...detail };

  return (
    <div className="space-y-4">
      {/* Notice Banner */}
      <div className="bg-ocean-50 rounded-xl p-3 sm:px-4 flex items-center gap-3 text-xs text-ocean-800 border border-ocean-200/60">
        <Icon name="info" className="w-4 h-4 text-ocean-600 shrink-0" />
        <span className="flex-1">
          Session packages are not on this screen. They belong to Admin Class. Private lessons are not here either, they live in Private Students with their own package.
        </span>
      </div>

      <ClassesToolbar hook={hook} />
      <ClassesTable hook={hook} />
      <ClassFormModal hook={hook} />
      <ClassDetailModal hook={hook} />
    </div>
  );
}
