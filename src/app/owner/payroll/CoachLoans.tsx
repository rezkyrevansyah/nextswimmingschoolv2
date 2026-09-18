"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { fmtIDR, clampPercent } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { computeInstallmentAmount } from "@/lib/payroll";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { Branch } from "../_types";

interface LoanRow {
  id: string;
  coach_id: string;
  branch_id: string;
  principal_amount: number;
  tenor_months: number;
  installment_amount: number;
  reason: string | null;
  status: "active" | "paid_off" | "written_off" | "cancelled";
  notes: string | null;
  created_at: string;
  closed_at: string | null;
  coach?: { full_name: string; role?: string } | null;
  branch?: { name: string } | null;
  coach_loan_payments?: { amount: number; kind: string }[];
}

interface PaymentRow {
  id: string;
  amount: number;
  installment_number: number;
  period_label: string;
  kind: string;
  created_at: string;
  payslip_id: string | null;
}

interface BorrowerOption {
  id: string;
  full_name: string;
  role: "coach" | "staff";
  branch_id: string | null;
}

const STATUS_KIND: Record<string, string> = {
  active: "pending",
  paid_off: "paid",
  written_off: "archived",
  cancelled: "rejected",
};

const LOAN_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paid_off: "Paid Off",
  written_off: "Written Off",
  cancelled: "Cancelled",
};

export default function CoachLoans({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const statusLabel = (status: string) => LOAN_STATUS_LABELS[status] ?? status;

  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "coach" | "staff">("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ coach_id: "", branch_id: "", principal_amount: "", tenor_months: "", reason: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<LoanRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [actioning, setActioning] = useState(false);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coach_loans")
      .select("id, coach_id, branch_id, principal_amount, tenor_months, installment_amount, reason, status, notes, created_at, closed_at, coach:profiles!coach_loans_coach_id_fkey(full_name, role), branch:branches(name), coach_loan_payments(amount, kind)")
      .order("created_at", { ascending: false });
    if (data) setLoans(data as unknown as LoanRow[]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadLoans(); }, [loadLoans]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, role, branch_id")
      .in("role", ["coach", "staff"])
      .order("full_name")
      .then(({ data }) => {
        if (data) setBorrowers(data as BorrowerOption[]);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let r = loans;
    if (branchFilter !== "all") r = r.filter(l => l.branch_id === branchFilter);
    if (statusFilter !== "all") r = r.filter(l => l.status === statusFilter);
    if (roleFilter !== "all") r = r.filter(l => (l.coach?.role ?? "coach") === roleFilter);
    return r;
  }, [loans, branchFilter, statusFilter, roleFilter]);

  const activeLoans = loans.filter(l => l.status === "active");
  const totalOutstanding = activeLoans.reduce((sum, l) => {
    const paid = (l.coach_loan_payments ?? []).reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, l.principal_amount - paid);
  }, 0);

  const handleBorrowerChange = (borrowerId: string) => {
    const b = borrowers.find(x => x.id === borrowerId);
    setForm(f => ({ ...f, coach_id: borrowerId, branch_id: b?.branch_id ?? f.branch_id }));
  };

  const previewInstallment = useMemo(() => {
    const principal = Number(form.principal_amount || 0);
    const tenor = Number(form.tenor_months || 0);
    if (!principal || !tenor) return 0;
    return computeInstallmentAmount(principal, tenor);
  }, [form.principal_amount, form.tenor_months]);

  const saveLoan = async () => {
    if (!form.coach_id) return toast.error("Please select a coach or staff student first");
    if (!form.branch_id) return toast.error("Please select a center first");
    const principal = Number(form.principal_amount || 0);
    const tenor = Number(form.tenor_months || 0);
    if (!principal || principal <= 0) return toast.error("Enter a valid loan principal amount");
    if (!tenor || tenor <= 0) return toast.error("Enter a valid installment tenor (months)");

    setSaving(true);
    const borrower = borrowers.find(c => c.id === form.coach_id);
    const { data: newLoan, error } = await supabase.from("coach_loans").insert({
      coach_id: form.coach_id,
      branch_id: form.branch_id,
      principal_amount: principal,
      tenor_months: tenor,
      installment_amount: computeInstallmentAmount(principal, tenor),
      reason: form.reason.trim() || null,
      notes: form.notes.trim() || null,
      status: "active",
      created_by: userId,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error("Failed to save loan", error.message);
    // Record the disbursement as a cash outflow
    const rolePrefix = borrower?.role === "staff" ? "Staff" : "Coach";
    await supabase.from("manual_transactions").insert({
      branch_id: form.branch_id,
      kind: "expense",
      category: "Staff Loan",
      description: `Loan / cash advance disbursement for ${rolePrefix} ${borrower?.full_name ?? ""}`,
      amount: principal,
      occurred_at: new Date().toISOString().split("T")[0],
      notes: newLoan ? `coach_loan:${newLoan.id}` : null,
      created_by: userId,
      created_by_role: "owner",
    });
    toast.success("Loan / cash advance created successfully");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_loans", entityId: form.coach_id,
      entityLabel: borrower?.full_name, action: "create",
      label: `New loan for ${rolePrefix} ${borrower?.full_name ?? ""} of ${fmtIDR(principal)} (${tenor} months)`,
      meta: { principal_amount: principal, tenor_months: tenor },
    });
    setShowCreate(false);
    setForm({ coach_id: "", branch_id: "", principal_amount: "", tenor_months: "", reason: "", notes: "" });
    loadLoans();
  };

  const openDetail = async (loan: LoanRow) => {
    setDetail(loan);
    setLoadingPayments(true);
    const { data } = await supabase
      .from("coach_loan_payments")
      .select("id, amount, installment_number, period_label, kind, created_at, payslip_id")
      .eq("loan_id", loan.id)
      .order("installment_number", { ascending: true });
    if (data) setPayments(data as PaymentRow[]);
    setLoadingPayments(false);
  };

  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = detail ? detail.principal_amount - paidTotal : 0;
  const installmentCount = payments.filter(p => p.kind === "installment").length;

  const writeOffLoan = async () => {
    if (!detail) return;
    const ok = await confirm({ title: "Write Off Remaining Loan?", body: (<>{"The remaining balance of "}<NoTranslate>{fmtIDR(remaining)}</NoTranslate>{" will be written off and "}<NoTranslate>{detail.coach?.full_name ?? "coach"}</NoTranslate>{"'s loan marked as paid off. This action will no longer deduct from salary."}</>), confirmLabel: "Write Off", danger: true });
    if (!ok) return;
    setActioning(true);
    if (remaining > 0) {
      await supabase.from("coach_loan_payments").insert({
        loan_id: detail.id, amount: remaining, installment_number: installmentCount + 1,
        period_label: "Write-off", kind: "write_off", created_by: userId,
      });
    }
    const { error } = await supabase.from("coach_loans").update({ status: "written_off", closed_at: new Date().toISOString() }).eq("id", detail.id);
    setActioning(false);
    if (error) return toast.error("Failed to write off loan", error.message);
    toast.success("Loan written off");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_loans", entityId: detail.id,
      entityLabel: detail.coach?.full_name, action: "update",
      label: `${detail.coach?.full_name ?? "coach"}'s loan written off (remaining ${fmtIDR(remaining)})`,
    });
    setDetail(null);
    loadLoans();
  };

  const cancelLoan = async () => {
    if (!detail) return;
    const ok = await confirm({ title: "Cancel Loan?", body: "This loan has no deducted installments yet and will be fully cancelled.", confirmLabel: "Cancel Loan", danger: true });
    if (!ok) return;
    setActioning(true);
    const { error } = await supabase.from("coach_loans").update({ status: "cancelled", closed_at: new Date().toISOString() }).eq("id", detail.id);
    setActioning(false);
    if (error) return toast.error("Failed to cancel loan", error.message);
    toast.success("Loan cancelled");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_loans", entityId: detail.id,
      entityLabel: detail.coach?.full_name, action: "update",
      label: `${detail.coach?.full_name ?? "coach"}'s loan cancelled`,
    });
    setDetail(null);
    loadLoans();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">{"Loan List"}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{"Manage staff loans and track installment progress."}</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ coach_id: "", branch_id: branches[0]?.id ?? "", principal_amount: "", tenor_months: "", reason: "", notes: "" }); setShowCreate(true); }}>
          {"Add Loan"}
        </Btn>
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-ocean-50 border border-ocean-200/60 text-ocean-800 text-xs">
        <Icon name="info" className="w-4 h-4 text-ocean-600 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          Pinjaman aktif otomatis menjadi opsi potongan saat payslip/invoice masih berstatus draft. Setelah payslip diterbitkan (published), rincian cicilan tercatat resmi di slip gaji.
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Active Loans"}</div>
          <div className="text-2xl font-bold font-mono text-warn-600">{activeLoans.length}</div>
          <div className="text-xs text-ink-mute">{activeLoans.length > 0 ? "in progress" : "none"}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Total Outstanding Balance"}</div>
          <div className="text-2xl font-bold font-mono text-ocean-700">{fmtIDR(totalOutstanding)}</div>
          <div className="text-xs text-ink-mute">{"estimated principal, before paid installments"}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">{"Total Loans"}</div>
          <div className="text-2xl font-bold font-mono text-ok-700">{loans.length}</div>
          <div className="text-xs text-ink-mute">{"all statuses"}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        {branches.length > 1 && (
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
            <option value="all">{"All centers"}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
          <option value="all">{"All Categories (Coach & Staff)"}</option>
          <option value="coach">{"Coach Only"}</option>
          <option value="staff">{"Staff Only"}</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 text-sm rounded-xl border border-line bg-paper px-3 text-ink focus:outline-none focus:border-ocean-500 transition">
          <option value="all">{"All statuses"}</option>
          <option value="active">{statusLabel("active")}</option>
          <option value="paid_off">{statusLabel("paid_off")}</option>
          <option value="written_off">{statusLabel("written_off")}</option>
          <option value="cancelled">{statusLabel("cancelled")}</option>
        </select>
        <span className="text-xs font-semibold text-ink-mute self-center ml-auto">{`${filtered.length} loans`}</span>
      </div>

      {/* Loans Table Card */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        <div className="h-9 bg-paper-deep border-b border-line px-5 flex items-center justify-between text-[10px] uppercase font-bold text-ink-faint tracking-wider">
          <span>PEMINJAM & RINCIAN</span>
          <span>NOMINAL & SISA</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-ink-mute text-sm">{"Loading data…"}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-ink-mute text-sm">{"No loans yet. Click \"Add Loan\" to get started."}</div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map(loan => {
              const isStaff = loan.coach?.role === "staff";
              const paidTotal = (loan.coach_loan_payments ?? []).reduce((s, p) => s + p.amount, 0);
              const remainingBalance = Math.max(0, loan.principal_amount - paidTotal);
              const paidCount = (loan.coach_loan_payments ?? []).filter(p => p.kind === "installment").length;

              return (
                <div key={loan.id} className="flex items-center gap-3 px-5 py-4 hover:bg-paper-tint/60 transition-colors cursor-pointer" onClick={() => openDetail(loan)}>
                  <Avatar name={loan.coach?.full_name ?? "?"} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ink"><NoTranslate>{loan.coach?.full_name ?? "—"}</NoTranslate></span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isStaff
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-ocean-50 text-ocean-700 border border-ocean-200"
                      }`}>
                        {isStaff ? "Staff" : "Coach"}
                      </span>
                      <Status kind={STATUS_KIND[loan.status]}>{statusLabel(loan.status)}</Status>
                    </div>
                    <div className="text-xs text-ink-mute mt-0.5">
                      <NoTranslate>{loan.branch?.name ?? "—"}</NoTranslate> · {`${loan.tenor_months} months · Installment ${fmtIDR(loan.installment_amount)}/month`}
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-1.5 max-w-sm">
                      <div className="flex-1 h-1.5 rounded-full bg-paper-deep overflow-hidden">
                        <div
                          className="h-full bg-ok-500 rounded-full"
                          style={{ width: `${clampPercent(paidCount, loan.tenor_months)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-ink-mute shrink-0">
                        {`${paidCount}/${loan.tenor_months} mos · Remaining ${fmtIDR(remainingBalance)}`}
                      </span>
                    </div>
                    {loan.reason && <div className="text-xs text-ink-faint mt-1 truncate"><NoTranslate>{loan.reason}</NoTranslate></div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm text-ink">{fmtIDR(loan.principal_amount)}</div>
                    <div className="text-[11px] text-ink-mute">{"Loan Principal"}</div>
                    <div className="text-xs font-mono font-semibold text-danger-600 mt-0.5">
                      {`Remaining: ${fmtIDR(remainingBalance)}`}
                    </div>
                  </div>
                  <Icon name="chevron" className="w-4 h-4 text-ink-faint shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Tambah Pinjaman */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={"Add Loan"} size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>{"Cancel"}</Btn>
            <Btn variant="primary" onClick={saveLoan} disabled={saving}>{saving ? "Saving…" : "Save Loan"}</Btn>
          </div>
        }>
        <div className="space-y-4">
          <Field label={"Loan Recipient (Coach / Staff)"}>
            <Select value={form.coach_id} onChange={e => handleBorrowerChange(e.target.value)}>
              <option value="">{"— Select Coach or Staff —"}</option>
              {borrowers.map(c => (
                <option key={c.id} value={c.id}>
                  [{c.role === "staff" ? "Staff" : "Coach"}] {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Center"}>
            <Select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">{"— Select center —"}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={"Principal Amount (Rp)"}>
              <Input type="text" inputMode="numeric" value={form.principal_amount ? Number(form.principal_amount).toLocaleString("id-ID") : ""}
                onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field label={"Installment Tenor (months)"}>
              <Input type="number" inputMode="numeric" min={1} value={form.tenor_months}
                onChange={e => setForm(f => ({ ...f, tenor_months: e.target.value.replace(/\D/g, "") }))} />
            </Field>
          </div>
          {previewInstallment > 0 && (
            <div className="bg-ocean-50 border border-ocean-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ocean-900">{"Installment per Month"}</span>
              <span className="font-mono font-bold text-ocean-700 text-lg">{fmtIDR(previewInstallment)}</span>
            </div>
          )}
          <Field label={"Reason (optional)"}><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={"E.g.: Home renovation loan"} /></Field>
          <Field label={"Notes (optional)"}><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
        </div>
      </Modal>

      {/* Modal: Detail Pinjaman */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={"Loan Detail"} size="md"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <div className="flex gap-2">
              {detail?.status === "active" && installmentCount === 0 && (
                <Btn variant="ghost" onClick={cancelLoan} disabled={actioning}>{"Cancel Loan"}</Btn>
              )}
              {detail?.status === "active" && (
                <Btn variant="danger" onClick={writeOffLoan} disabled={actioning}>{actioning ? "…" : "Write Off Remaining"}</Btn>
              )}
            </div>
            <Btn variant="ghost" onClick={() => setDetail(null)}>{"Close"}</Btn>
          </div>
        }>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{"Recipient"}</div><div className="font-semibold"><NoTranslate>{detail.coach?.full_name ?? "—"}</NoTranslate> <span className="text-xs font-normal text-ink-mute">({detail.coach?.role === "staff" ? "Staff" : "Coach"})</span></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{"Center"}</div><div className="font-semibold"><NoTranslate>{detail.branch?.name ?? "—"}</NoTranslate></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{"Status"}</div><Status kind={STATUS_KIND[detail.status]}>{statusLabel(detail.status)}</Status></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{"Tenor"}</div><div>{`${detail.tenor_months} months`}</div></div>
              {detail.reason && <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{"Reason"}</div><div><NoTranslate>{detail.reason}</NoTranslate></div></div>}
            </div>

            <div className="border-t border-line pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span>{"Loan Principal"}</span><span className="font-mono font-semibold">{fmtIDR(detail.principal_amount)}</span></div>
              <div className="flex justify-between text-sm text-ok-700"><span>{"Amount Paid"}</span><span className="font-mono">{fmtIDR(paidTotal)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>{"Remaining Balance"}</span><span className="font-mono text-danger-600">{fmtIDR(Math.max(0, remaining))}</span></div>
              <div className="pt-1">
                <div className="h-2 rounded-full bg-paper-deep overflow-hidden">
                  <div className="h-full bg-ok-500 rounded-full" style={{ width: `${clampPercent(installmentCount, detail.tenor_months)}%` }} />
                </div>
                <div className="text-xs text-ink-mute mt-1">{`${installmentCount} of ${detail.tenor_months} installments`}</div>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{"Payment History"}</div>
              {loadingPayments ? (
                <p className="text-sm text-ink-mute">{"Loading data…"}</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-ink-mute">{"No installments deducted yet."}</p>
              ) : (
                <div className="space-y-1.5">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-line text-sm">
                      <div>
                        <div className="font-semibold text-ink">{p.kind === "installment" ? `Installment #${p.installment_number}` : p.kind === "write_off" ? "Write-off" : "Adjustment"}</div>
                        <div className="text-xs text-ink-mute"><NoTranslate>{p.period_label}</NoTranslate></div>
                      </div>
                      <div className="font-mono font-bold">{fmtIDR(p.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
