"use client";
import type { Branch } from "../../_types";
import { usePayslipData } from "./usePayslipData";
import { useTaxSettings } from "./useTaxSettings";
import { useGeneratePayslipForm } from "./useGeneratePayslipForm";
import { usePayslipLifecycle } from "./usePayslipLifecycle";
import PayslipSummaryTable from "./PayslipSummaryTable";
import TaxSettingsModal from "./TaxSettingsModal";
import GeneratePayslipModal from "./GeneratePayslipModal";
import InvoiceDetailModal from "./InvoiceDetailModal";
import EditPayslipModal from "./EditPayslipModal";
import ViewPayslipModal from "./ViewPayslipModal";

export type PayslipHook =
  ReturnType<typeof usePayslipData> &
  ReturnType<typeof useTaxSettings> &
  ReturnType<typeof useGeneratePayslipForm> &
  ReturnType<typeof usePayslipLifecycle>;

export default function PayslipGenerator({
  branches,
  userId,
  userName,
}: {
  branches: Branch[];
  userId: string;
  userName: string;
}) {
  const data = usePayslipData({ branches, userId, userName });
  const tax = useTaxSettings({ userId, userName });
  const genForm = useGeneratePayslipForm({
    branches, userId, userName,
    coachList: data.coachList, staffList: data.staffList,
    invoicesEligible: data.invoicesEligible,
    loadPayslips: data.loadPayslips, loadInvoices: data.loadInvoices,
  });
  const lifecycle = usePayslipLifecycle({
    userId, userName,
    loadPayslips: data.loadPayslips,
    setPayslips: data.setPayslips,
    setCoachInvoices: data.setCoachInvoices,
  });
  const hook: PayslipHook = { ...data, ...tax, ...genForm, ...lifecycle };

  return (
    <div className="space-y-6">
      <PayslipSummaryTable hook={hook} />
      <TaxSettingsModal hook={hook} />
      <GeneratePayslipModal hook={hook} />
      <InvoiceDetailModal hook={hook} />
      <EditPayslipModal hook={hook} />
      <ViewPayslipModal hook={hook} />
    </div>
  );
}
