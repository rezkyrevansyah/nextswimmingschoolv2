"use client";
import { useMemberPrivateData } from "./useMemberPrivateData";
import StudentTable from "./StudentTable";
import StudentFormModal from "./StudentFormModal";
import StudentDetailModal from "./StudentDetailModal";
import AddSessionsModal from "./AddSessionsModal";

export default function AdminMemberPrivate({ branchId, branches, onBranchesChange }: {
  /** Required for Admin (single-branch scope). Unused/omitted for Owner,
   * which shows every branch it can see in one table instead. */
  branchId?: string;
  /** Passed only from the Owner panel, which manages multiple centers — lets
   * this screen show every private member across all centers at once (with
   * a Branch column + filter), and lets the create form pick which center a
   * new student belongs to. Admin is always scoped to its one branch, so
   * this stays unset there. */
  branches?: { id: string; name: string }[];
  /** Re-fetches the `branches` list from the Owner side. Called right before
   * opening the create form so a center added in another tab/session is
   * pickable immediately, without waiting on whatever refresh timing the
   * page-level branch list normally relies on. */
  onBranchesChange?: () => void;
}) {
  const hook = useMemberPrivateData({ branchId, branches, onBranchesChange });

  return (
    <div className="space-y-4">
      <StudentTable hook={hook} />
      <StudentFormModal hook={hook} />
      <StudentDetailModal hook={hook} />
      <AddSessionsModal hook={hook} />
    </div>
  );
}
