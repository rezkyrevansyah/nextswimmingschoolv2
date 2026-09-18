"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { fmtIDR } from "@/lib/utils";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { PayslipHook } from "./index";

export default function GeneratePayslipModal({ hook }: { hook: PayslipHook }) {
  const {
    showGenModal, setShowGenModal, genMode, setGenMode, modalLockedInvoice, savingSlip,
    handleSavePayslip, netPreview,
    genPeriod, setGenPeriod, genNotes, setGenNotes, manualDescription, setManualDescription,
    genInvoiceId, genGross, setGenGross, genOtherDeduction, setGenOtherDeduction,
    genTaxOverride, setGenTaxOverride, genLoanCandidates, genLoanIncluded, setGenLoanIncluded,
    genLoanAmounts, setGenLoanAmounts, loadingLoans,
    coachList, manualCoachId, handleManualCoachChange, manualCoachBranchId, setManualCoachBranchId,
    manualCoachGross, setManualCoachGross, manualCoachTaxOverride, setManualCoachTaxOverride,
    manualCoachOtherDeduction, setManualCoachOtherDeduction,
    staffList, manualStaffId, handleManualStaffChange, manualStaffBranchId, setManualStaffBranchId,
    manualStaffBaseSalary, setManualStaffBaseSalary, manualStaffAllowances, setManualStaffAllowances,
    manualStaffReimburse, setManualStaffReimburse, manualStaffDeductions, setManualStaffDeductions,
    manualStaffTaxOverride, setManualStaffTaxOverride,
    staffPresentDays, staffDailyRate, setStaffDailyRate, loadingStaffAttendance,
    checkStaffAttendance, applyStaffAttendanceSalary,
    branches, currentGross, computedTaxForMode, effectiveTaxForMode, includedLoanTotal, otherDeductionAmount,
  } = hook;

  return (
    <Modal
      open={showGenModal}
      onClose={() => setShowGenModal(false)}
      title={"Generate Payslip"}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Btn variant="ghost" onClick={() => setShowGenModal(false)}>
            {"Cancel"}
          </Btn>
          <Btn variant="primary" onClick={handleSavePayslip} disabled={savingSlip || netPreview < 0}>
            {savingSlip ? "Saving…" : "Save as Draft"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Mode Switcher Tabs — hidden when generating from a locked invoice row */}
        {!modalLockedInvoice && (
          <div className="flex border-b border-line pb-2 gap-2">
            <button
              type="button"
              onClick={() => setGenMode("manual_coach")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                genMode === "manual_coach" ? "bg-ocean-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {"Manual Coach"}
            </button>
            <button
              type="button"
              onClick={() => setGenMode("manual_staff")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                genMode === "manual_staff" ? "bg-purple-700 text-white shadow-xs" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"
              }`}
            >
              {"Manual Staff"}
            </button>
          </div>
        )}

        {/* ── MODE 1: FROM INVOICE (row-initiated, always locked) ── */}
        {genMode === "from_invoice" && modalLockedInvoice && (
          <div className="space-y-4">
            <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 text-sm">
              <div className="text-xs text-ink-mute font-bold uppercase tracking-widest mb-1">{"Generating for invoice"}</div>
              <div className="font-mono font-semibold text-ink"><NoTranslate>{modalLockedInvoice.invoice_number}</NoTranslate></div>
              <div className="text-xs text-ink-mute"><NoTranslate>{modalLockedInvoice.coach?.full_name}</NoTranslate> · <NoTranslate>{modalLockedInvoice.period_label}</NoTranslate> · {fmtIDR(modalLockedInvoice.total_amount)}</div>
            </div>

            <Field label={"Period"}>
              <Input
                value={genPeriod}
                onChange={(e) => setGenPeriod(e.target.value)}
                placeholder={"E.g.: June 2026"}
              />
            </Field>
            <Field label={"Gross Salary (Rp)"}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={genGross}
                onChange={(e) => setGenGross(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>
        )}

        {/* ── MODE 2: MANUAL COACH ── */}
        {genMode === "manual_coach" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={"Select Coach"} required>
                <Select value={manualCoachId} onChange={(e) => handleManualCoachChange(e.target.value)}>
                  <option value="">{"— Select coach —"}</option>
                  {coachList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={"Center / Branch"} required>
                <Select value={manualCoachBranchId} onChange={(e) => setManualCoachBranchId(e.target.value)}>
                  <option value="">{"— Select center —"}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={"Period"} required>
                <Input
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  placeholder={"E.g.: June 2026"}
                />
              </Field>
              <Field label={"Gross Salary (Rp)"} required>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manualCoachGross}
                  onChange={(e) => setManualCoachGross(e.target.value.replace(/\D/g, ""))}
                  placeholder="3.500.000"
                  className="font-mono"
                />
              </Field>
            </div>

            <Field label={"Salary Description / Purpose"} hint="Salary purpose or description">
              <Input
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder={"e.g. Extra Session Teaching Fee, Private Bonus, etc."}
              />
            </Field>
          </div>
        )}

        {/* ── MODE 3: MANUAL STAFF ── */}
        {genMode === "manual_staff" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={"Select Staff"} required>
                <Select value={manualStaffId} onChange={(e) => handleManualStaffChange(e.target.value)}>
                  <option value="">{"— Select staff —"}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={"Center / Branch"} required>
                <Select value={manualStaffBranchId} onChange={(e) => setManualStaffBranchId(e.target.value)}>
                  <option value="">{"— Select center —"}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={"Period"} required>
                <Input
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  placeholder={"E.g.: September 2026 or 2026-09"}
                />
              </Field>
              <Field label={"Salary Description / Purpose"} hint="Salary purpose or description">
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder={"e.g. Monthly Operations Staff Salary, Overtime Bonus, etc."}
                />
              </Field>
            </div>

            {/* Attendance Calculator Widget */}
            <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Icon name="checkCircle" className="w-3.5 h-3.5 text-purple-700" />
                  {"Calculate from Attendance"}
                </span>
                <button
                  type="button"
                  onClick={checkStaffAttendance}
                  disabled={loadingStaffAttendance || !manualStaffId}
                  className="text-xs font-semibold text-purple-700 hover:underline"
                >
                  {loadingStaffAttendance ? "Calculating…" : "Calculate from Attendance"}
                </button>
              </div>
              {staffPresentDays !== null && (
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-semibold text-purple-900">
                    {`${staffPresentDays} days present`}
                  </span>
                  <span>×</span>
                  <div className="w-36">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={staffDailyRate}
                      onChange={(e) => setStaffDailyRate(e.target.value.replace(/\D/g, ""))}
                      placeholder={"Daily rate (Rp)"}
                      className="text-xs font-mono"
                    />
                  </div>
                  <Btn variant="soft" size="sm" onClick={applyStaffAttendanceSalary} disabled={!staffDailyRate}>
                    {"Apply"}
                  </Btn>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={"Base Salary (Rp)"} required>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manualStaffBaseSalary}
                  onChange={(e) => setManualStaffBaseSalary(e.target.value.replace(/\D/g, ""))}
                  placeholder="3.000.000"
                  className="font-mono text-sm"
                />
              </Field>
              <Field label={"Allowances (Rp, optional)"}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manualStaffAllowances}
                  onChange={(e) => setManualStaffAllowances(e.target.value.replace(/\D/g, ""))}
                  placeholder="500.000"
                  className="font-mono text-sm"
                />
              </Field>
              <Field label={"Reimbursements (Rp, optional)"}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manualStaffReimburse}
                  onChange={(e) => setManualStaffReimburse(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="font-mono text-sm"
                />
              </Field>
            </div>

            <Field label={"Other Deduction (Rp, optional)"}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={manualStaffDeductions}
                onChange={(e) => setManualStaffDeductions(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="font-mono text-sm"
              />
            </Field>
          </div>
        )}

        {/* ── DEDUCTIONS & LOANS ── */}
        {(genMode === "from_invoice" ? !!genInvoiceId : genMode === "manual_coach" ? !!manualCoachId : !!manualStaffId) && (
          <>
            {/* Tax Box */}
            <div className="border border-line rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{"Tax"}</span>
                {(genMode === "from_invoice" ? genTaxOverride : genMode === "manual_coach" ? manualCoachTaxOverride : manualStaffTaxOverride) == null ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (genMode === "from_invoice") setGenTaxOverride(String(computedTaxForMode));
                      else if (genMode === "manual_coach") setManualCoachTaxOverride(String(computedTaxForMode));
                      else setManualStaffTaxOverride(String(computedTaxForMode));
                    }}
                    className="text-xs text-ocean-600 hover:underline flex items-center gap-1"
                  >
                    <Icon name="edit" className="w-3 h-3" /> {"Edit manually"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (genMode === "from_invoice") setGenTaxOverride(null);
                      else if (genMode === "manual_coach") setManualCoachTaxOverride(null);
                      else setManualStaffTaxOverride(null);
                    }}
                    className="text-xs text-ink-mute hover:underline"
                  >
                    {"Use automatic"}
                  </button>
                )}
              </div>
              {(genMode === "from_invoice" ? genTaxOverride : genMode === "manual_coach" ? manualCoachTaxOverride : manualStaffTaxOverride) == null ? (
                <div className="font-mono font-bold text-ink">{fmtIDR(computedTaxForMode)}</div>
              ) : (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={genMode === "from_invoice" ? genTaxOverride ?? "" : genMode === "manual_coach" ? manualCoachTaxOverride ?? "" : manualStaffTaxOverride ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (genMode === "from_invoice") setGenTaxOverride(v);
                    else if (genMode === "manual_coach") setManualCoachTaxOverride(v);
                    else setManualStaffTaxOverride(v);
                  }}
                  className="font-mono text-sm"
                />
              )}
            </div>

            {/* Active Loans Installment Box (Coach & Staff) */}
            {loadingLoans ? (
              <div className="text-sm text-ink-mute">{"Checking active loans…"}</div>
            ) : (
              genLoanCandidates.length > 0 && (
                <div className="border border-line rounded-xl p-3.5 space-y-3 bg-paper-tint/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{"Loan Installments"}</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {"Active Deduction"}
                    </span>
                  </div>
                  {genLoanCandidates.map((c) => (
                    <div key={c.loan.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!genLoanIncluded[c.loan.id]}
                        onChange={(e) =>
                          setGenLoanIncluded((prev) => ({ ...prev, [c.loan.id]: e.target.checked }))
                        }
                        className="w-4 h-4 rounded accent-ocean-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ink-soft font-medium">
                          {(<>{"Installment #"}<NoTranslate>{c.next.installmentNumber}</NoTranslate>{" of "}<NoTranslate>{c.loan.tenor_months}</NoTranslate><NoTranslate>{c.loan.reason ? ` · ${c.loan.reason}` : ""}</NoTranslate></>)}
                        </div>
                        <div className="text-[11px] text-ink-faint font-mono">
                          {"Remaining"}: {fmtIDR(c.next.remainingBefore)}
                        </div>
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={c.next.remainingBefore}
                          disabled={!genLoanIncluded[c.loan.id]}
                          value={genLoanAmounts[c.loan.id] ?? ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            const clamped = digits ? String(Math.min(Number(digits), c.next.remainingBefore)) : "";
                            setGenLoanAmounts((prev) => ({ ...prev, [c.loan.id]: clamped }));
                          }}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-ink-faint">{"Uncheck to skip this month's installment (e.g. coach is on leave)."}</p>
                </div>
              )
            )}

            {/* Other Deductions (Coach only, staff has it above) */}
            {genMode !== "manual_staff" && (
              <Field label={"Other Deduction (Rp, optional)"}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={genMode === "from_invoice" ? genOtherDeduction : manualCoachOtherDeduction}
                  onChange={(e) =>
                    genMode === "from_invoice"
                      ? setGenOtherDeduction(e.target.value.replace(/\D/g, ""))
                      : setManualCoachOtherDeduction(e.target.value.replace(/\D/g, ""))
                  }
                  className="font-mono text-sm"
                />
              </Field>
            )}
          </>
        )}

        {/* ── Real-time Breakdown Summary Card ── */}
        {currentGross > 0 && (
          <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span>{"Gross Salary"}</span>
              <span className="font-mono font-semibold">{fmtIDR(currentGross)}</span>
            </div>
            {effectiveTaxForMode > 0 && (
              <div className="flex justify-between text-danger-700">
                <span>{"Tax"}</span>
                <span className="font-mono">- {fmtIDR(effectiveTaxForMode)}</span>
              </div>
            )}
            {includedLoanTotal > 0 && (
              <div className="flex justify-between text-danger-700">
                <span>{"Loan Installment"}</span>
                <span className="font-mono">- {fmtIDR(includedLoanTotal)}</span>
              </div>
            )}
            {otherDeductionAmount > 0 && (
              <div className="flex justify-between text-danger-700">
                <span>{"Other Deduction"}</span>
                <span className="font-mono">- {fmtIDR(otherDeductionAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1.5 border-t border-line">
              <span className={netPreview < 0 ? "text-danger-700" : "text-ok-900"}>{"Net Salary"}</span>
              <span className={`font-mono ${netPreview < 0 ? "text-danger-700" : "text-ok-700"}`}>{fmtIDR(netPreview)}</span>
            </div>
          </div>
        )}

        {netPreview < 0 && (
          <div className="flex items-center gap-2 text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
            <Icon name="warning" className="w-4 h-4 shrink-0" />
            {"Deductions exceed the gross salary — net salary would be negative."}
          </div>
        )}

        <Field label={"Notes (optional)"}>
          <Textarea
            value={genNotes}
            onChange={(e) => setGenNotes(e.target.value)}
            rows={2}
            placeholder={"Notes for the coach…"}
          />
        </Field>
      </div>
    </Modal>
  );
}
