"use client";
import { useAdminRaporData } from "./useAdminRaporData";
import AdminRaporTable from "./AdminRaporTable";
import AdminRaporDetailModal from "./AdminRaporDetailModal";
import type { RaporPeriod } from "./_types";

export default function AdminRaporList({ branchId, periods }: { branchId: string; periods: RaporPeriod[] }) {
  const hook = useAdminRaporData(branchId, periods);

  return (
    <div>
      <AdminRaporTable hook={hook} />
      <AdminRaporDetailModal hook={hook} />
    </div>
  );
}
