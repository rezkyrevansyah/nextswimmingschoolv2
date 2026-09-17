"use client";
import { useActivityLogData } from "./useActivityLogData";
import ActivityLogFilterBar from "./ActivityLogFilterBar";
import ActivityLogTable from "./ActivityLogTable";
import ActivityLogDetailModal from "./ActivityLogDetailModal";
import type { Branch } from "../../_types";

export default function OwnerActivityLog({ branches }: { branches: Branch[] }) {
  const hook = useActivityLogData(branches);

  return (
    <div className="space-y-6">
      <ActivityLogFilterBar hook={hook} />
      <ActivityLogTable hook={hook} />
      <ActivityLogDetailModal hook={hook} />
    </div>
  );
}
