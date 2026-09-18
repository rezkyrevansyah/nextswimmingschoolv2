"use client";
import { useApprovementData } from "./useApprovementData";
import ApprovementListCard from "./ApprovementListCard";
import RegistrationModals from "./RegistrationModals";
import CertificationModals from "./CertificationModals";

export default function AdminApprovement({ branchId }: { branchId: string }) {
  const hook = useApprovementData(branchId);
  const { registrations, certs } = hook;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">{"Approvement"}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{"Pending registrations and certifications."}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(registrations.length + certs.length) > 0 && (
            <span className="text-xs font-bold bg-danger-500 text-white px-2 py-0.5 rounded-full">
              {`${registrations.length + certs.length} pending`}
            </span>
          )}
        </div>
      </div>

      <ApprovementListCard hook={hook} />
      <RegistrationModals hook={hook} />
      <CertificationModals hook={hook} />
    </div>
  );
}
