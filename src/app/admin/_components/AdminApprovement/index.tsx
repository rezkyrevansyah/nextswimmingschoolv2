"use client";
import { useApprovementData } from "./useApprovementData";
import ApprovementListCard from "./ApprovementListCard";
import RegistrationModals from "./RegistrationModals";
import CertificationModals from "./CertificationModals";

export default function AdminApprovement({ branchId }: { branchId: string }) {
  const hook = useApprovementData(branchId);
  const { t, registrations, certs } = hook;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">{t("admin.approvement.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("admin.approvement.pageSub")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(registrations.length + certs.length) > 0 && (
            <span className="text-xs font-bold bg-danger-500 text-white px-2 py-0.5 rounded-full">
              {t("admin.approvement.pendingSuffix", { count: registrations.length + certs.length })}
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
