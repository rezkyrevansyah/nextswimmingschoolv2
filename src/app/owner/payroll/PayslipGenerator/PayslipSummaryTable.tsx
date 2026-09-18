"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Input, Select } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { fmtIDR } from "@/lib/utils";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { PayslipHook } from "./index";

export default function PayslipSummaryTable({ hook }: { hook: PayslipHook }) {
  const {
    branches, setShowTaxModal, openGenerateManual,
    summaryCounts,
    search, setSearch, monthFilter, setMonthFilter, branchFilter, setBranchFilter,
    roleFilter, setRoleFilter, workflowStatusFilter, setWorkflowStatusFilter,
    loadingInvoices, loadingPayslips, filteredUnifiedItems,
    openViewSlip, setInvoiceDetail, openEditSlip,
    approvingId, unapprovingId, publishingId,
    approveInvoice, setRejectModal, setRejectReason, unapproveInvoice, openGenerateForInvoice,
    publishPayslip, deletePayslip, printPayslip,
  } = hook;

  return (
    <div className="space-y-6">
      {/* ── HEADER & ACTIONS ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">
            {"Staff Payroll"}
          </h2>
          <p className="text-xs text-ink-mute mt-0.5">
            Manage invoice verification, salary approvals, loan deductions, and official payslip generation for Coaches & Staff.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="soft" icon="settings" onClick={() => setShowTaxModal(true)}>
            Tax Settings (PPh 21)
          </Btn>
          <Btn variant="primary" icon="plus" onClick={() => openGenerateManual("manual_coach")}>
            + Manual Entry
          </Btn>
        </div>
      </div>

      {/* ── 4 SUMMARY STAT CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Pending Review"}</div>
          <div className="text-2xl font-bold font-mono text-warn-600">{summaryCounts.pending}</div>
          <div className="text-xs text-ink-mute">{"Invoices & claims need approval"}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Ready to Generate"}</div>
          <div className="text-2xl font-bold font-mono text-ocean-700">{summaryCounts.approved}</div>
          <div className="text-xs text-ink-mute">{"Approved, ready to generate"}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Draft Payslips"}</div>
          <div className="text-2xl font-bold font-mono text-purple-700">{summaryCounts.draft}</div>
          <div className="text-xs text-ink-mute">{"Draft slips awaiting publish"}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Officially Published"}</div>
          <div className="text-2xl font-bold font-mono text-ok-700">{summaryCounts.published}</div>
          <div className="text-xs text-ink-mute">{"Published slips, ready to print/view"}</div>
        </div>
      </div>

      {/* ── UNIFIED TABLE & TOOLBAR ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={"Search name, center, invoice number..."}
              className="pl-9 text-sm"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-10 px-3 text-sm border border-line rounded-xl bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition"
            />
            {monthFilter && (
              <button
                type="button"
                onClick={() => setMonthFilter("")}
                className="h-10 px-3 text-xs font-semibold text-ink-mute hover:text-ink bg-paper border border-line rounded-xl hover:bg-paper-deep transition-colors cursor-pointer"
                title={"Show All Periods"}
              >
                {"All"}
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="!w-44 shrink-0">
            <option value="all">{"All Centers"}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | "coach" | "staff")} className="!w-44 shrink-0">
            <option value="all">{"All Roles"}</option>
            <option value="coach">{"Coach Only"}</option>
            <option value="staff">{"Staff Only"}</option>
          </Select>

          {/* Status Filter */}
          <Select value={workflowStatusFilter} onChange={(e) => setWorkflowStatusFilter(e.target.value)} className="!w-48 shrink-0">
            <option value="all">{"All statuses"}</option>
            <option value="pending">{"Pending Review"}</option>
            <option value="approved">{"Ready to Generate"}</option>
            <option value="draft">{"Draft Slip"}</option>
            <option value="published">{"Published / Paid"}</option>
            <option value="rejected">{"Rejected"}</option>
          </Select>
        </div>

        {/* Unified Table Card */}
        <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
          {loadingInvoices || loadingPayslips ? (
            <div className="p-12 text-center text-ink-mute text-sm">{"Loading payslips & invoices..."}</div>
          ) : filteredUnifiedItems.length === 0 ? (
            <div className="p-12 text-center text-ink-mute text-sm space-y-2">
              <Icon name="invoice" className="w-8 h-8 mx-auto text-ink-faint" />
              <div>No payslips or invoices match the filter.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="h-9 bg-paper-deep border-b border-line text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                    <th className="py-2.5 px-4">Penerima & Role</th>
                    <th className="py-2.5 px-4">Description & Reference</th>
                    <th className="py-2.5 px-4 text-right">Bruto</th>
                    <th className="py-2.5 px-4 text-right">Tax (PPh 21)</th>
                    <th className="py-2.5 px-4 text-right text-purple-700">Pot. Kasbon</th>
                    <th className="py-2.5 px-4 text-right">Pot. Lain</th>
                    <th className="py-2.5 px-4 text-right text-ocean-800">Transfer Riil (Net)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {filteredUnifiedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-paper-tint/60 transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.rawPayslip && item.workflowStatus === "published") {
                          openViewSlip(item.rawPayslip);
                        } else if (item.rawInvoice) {
                          setInvoiceDetail(item.rawInvoice);
                        } else if (item.rawPayslip) {
                          openEditSlip(item.rawPayslip);
                        }
                      }}
                    >
                      {/* Penerima & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={item.recipientName} size={34} />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-ink"><NoTranslate>{item.recipientName}</NoTranslate></span>
                              {item.role === "coach" ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-ocean-50 text-ocean-700 border border-ocean-200">
                                  Coach
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                  Staff
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{item.branchName}</NoTranslate></div>
                          </div>
                        </div>
                      </td>

                      {/* Keterangan & Referensi */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-xs text-ink"><NoTranslate>{item.title}</NoTranslate></div>
                        <div className="text-xs text-ink-mute flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-ocean-700 font-medium"><NoTranslate>{item.referenceNo}</NoTranslate></span>
                          <span>·</span>
                          <span><NoTranslate>{item.periodLabel}</NoTranslate></span>
                        </div>
                        {item.workflowStatus === "rejected" && item.rawInvoice?.rejection_reason && (
                          <div className="text-xs text-danger-600 mt-0.5 flex items-center gap-1">
                            <Icon name="warning" className="w-3 h-3 shrink-0" />
                            <span><NoTranslate>{item.rawInvoice.rejection_reason}</NoTranslate></span>
                          </div>
                        )}
                      </td>

                      {/* Bruto */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-ink">
                        {fmtIDR(item.grossAmount)}
                      </td>

                      {/* PPh 21 */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {item.taxAmount > 0 ? (
                          <span className="text-warn-700 font-semibold">- {fmtIDR(item.taxAmount)}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Pot. Kasbon */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {item.loanDeduction > 0 ? (
                          <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                            - {fmtIDR(item.loanDeduction)}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Pot. Lain */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {item.otherDeductions > 0 ? (
                          <span className="text-danger-700 font-semibold">- {fmtIDR(item.otherDeductions)}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Net */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-extrabold text-sm text-ocean-900 bg-ocean-50/70 border border-ocean-200/50 px-2 py-1 rounded-lg inline-block">
                          {fmtIDR(item.netAmount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Status
                          kind={
                            item.workflowStatus === "published"
                              ? "paid"
                              : item.workflowStatus === "rejected"
                              ? "rejected"
                              : item.workflowStatus === "pending"
                              ? "pending"
                              : item.workflowStatus === "draft"
                              ? "active"
                              : "approved"
                          }
                        >
                          {item.workflowStatus === "published"
                            ? "Published / Paid"
                            : item.workflowStatus === "rejected"
                            ? "Rejected"
                            : item.workflowStatus === "pending"
                            ? "Pending Review"
                            : item.workflowStatus === "draft"
                            ? "Draft Slip"
                            : "Ready to Generate"}
                        </Status>
                      </td>

                      {/* Aksi Kontekstual */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Case 1: Pending */}
                          {item.workflowStatus === "pending" && item.rawInvoice && (
                            <>
                              <Btn
                                variant="soft"
                                size="sm"
                                onClick={() => approveInvoice(item.rawInvoice!.id)}
                                disabled={approvingId === item.rawInvoice.id}
                              >
                                {approvingId === item.rawInvoice.id ? "…" : "Approve"}
                              </Btn>
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRejectModal(item.rawInvoice!);
                                  setRejectReason("");
                                }}
                              >
                                {"Reject"}
                              </Btn>
                              <button
                                type="button"
                                onClick={() => setInvoiceDetail(item.rawInvoice!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={"View Breakdown"}
                              >
                                <Icon name="eye" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 2: Approved (Siap Buat Slip) */}
                          {item.workflowStatus === "approved" && item.rawInvoice && (
                            <>
                              <Btn
                                variant="primary"
                                size="sm"
                                onClick={() => openGenerateForInvoice(item.rawInvoice!)}
                              >
                                {"Generate Payslip"}
                              </Btn>
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() => unapproveInvoice(item.rawInvoice!)}
                                disabled={unapprovingId === item.rawInvoice.id}
                                title={"Undo Approval"}
                              >
                                {unapprovingId === item.rawInvoice.id ? "…" : <Icon name="undo" className="w-3.5 h-3.5" />}
                              </Btn>
                              <button
                                type="button"
                                onClick={() => setInvoiceDetail(item.rawInvoice!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={"View Details"}
                              >
                                <Icon name="eye" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 3: Draft Slip */}
                          {item.workflowStatus === "draft" && item.rawPayslip && (
                            <>
                              <Btn
                                variant="soft"
                                size="sm"
                                onClick={() => publishPayslip(item.rawPayslip!)}
                                disabled={publishingId === item.rawPayslip.id}
                              >
                                {publishingId === item.rawPayslip.id ? "…" : "Publish"}
                              </Btn>
                              <button
                                type="button"
                                onClick={() => openEditSlip(item.rawPayslip!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={"Edit Draft Slip"}
                              >
                                <Icon name="edit" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePayslip(item.rawPayslip!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600 transition-colors"
                                title={"Delete Draft Slip"}
                              >
                                <Icon name="trash" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 4: Published (Resmi / Lunas) */}
                          {item.workflowStatus === "published" && item.rawPayslip && (
                            <>
                              <button
                                type="button"
                                onClick={() => printPayslip(item.rawPayslip!)}
                                className="px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-paper-tint text-xs font-semibold text-ink-mute hover:text-ocean-700 flex items-center gap-1.5 transition-colors"
                                title={"Print Payslip / PDF"}
                              >
                                <Icon name="print" className="w-3.5 h-3.5" />
                                <span>{"Print"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openViewSlip(item.rawPayslip!)}
                                className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600 transition-colors"
                                title={"View Payslip Breakdown"}
                              >
                                <Icon name="eye" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Case 5: Rejected */}
                          {item.workflowStatus === "rejected" && item.rawInvoice && (
                            <button
                              type="button"
                              onClick={() => setInvoiceDetail(item.rawInvoice!)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100 flex items-center gap-1 transition-colors"
                            >
                              <Icon name="warning" className="w-3 h-3" />
                              <span>{"Reason"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
