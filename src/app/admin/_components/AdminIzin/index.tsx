"use client";
import Btn from "@/components/ui/Btn";
import { useIzinData } from "./useIzinData";
import IzinListCard from "./IzinListCard";
import LeaveDecisionModals from "./LeaveDecisionModals";
import DetailLeaveModal from "./DetailLeaveModal";
import CreateLeaveModal from "./CreateLeaveModal";

export default function AdminIzin({ branchId }: { branchId: string }) {
  const hook = useIzinData(branchId);
  const { setCreateForm, setOpenCreate } = hook;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{"Leave Management"}</h2><p className="text-ink-mute text-sm mt-0.5">{"Approve coach & student leave requests."}</p></div>
        <Btn variant="primary" icon="plus" onClick={() => { setCreateForm({ target_id: "", type: "sakit", date_from: "", date_to: "", reason: "", class_ids: [], class_substitutes: {} }); setOpenCreate(true); }}>{"Create Leave"}</Btn>
      </div>

      <IzinListCard hook={hook} />
      <LeaveDecisionModals hook={hook} />
      <DetailLeaveModal hook={hook} />
      <CreateLeaveModal hook={hook} />
    </div>
  );
}
