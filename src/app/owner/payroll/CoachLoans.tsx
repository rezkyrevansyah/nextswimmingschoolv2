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
import { useLocale } from "@/components/providers/LocaleProvider";
import { computeInstallmentAmount } from "@/lib/payroll";

interface Branch {
  id: string;
  name: string;
}

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
  coach?: { full_name: string } | null;
  branch?: { name: string } | null;
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

interface CoachOption {
  id: string;
  full_name: string;
  branch_id: string | null;
}

const STATUS_KIND: Record<string, string> = {
  active: "pending",
  paid_off: "paid",
  written_off: "archived",
  cancelled: "rejected",
};

export default function CoachLoans({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const { t } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const statusLabel = (status: string) => t(`owner.coachLoans.statusLabel.${status}`);

  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
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
      .select("id, coach_id, branch_id, principal_amount, tenor_months, installment_amount, reason, status, notes, created_at, closed_at, coach:profiles!coach_loans_coach_id_fkey(full_name), branch:branches(name)")
      .order("created_at", { ascending: false });
    if (data) setLoans(data as unknown as LoanRow[]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadLoans(); }, [loadLoans]);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, branch_id").eq("role", "coach").order("full_name").then(({ data }) => {
      if (data) setCoaches(data as CoachOption[]);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loanPaymentSums = useMemo(() => {
    // paid amount per loan is fetched lazily on detail open; list view estimate uses this map once populated
    return new Map<string, number>();
  }, []);

  const filtered = useMemo(() => {
    let r = loans;
    if (branchFilter !== "all") r = r.filter(l => l.branch_id === branchFilter);
    if (statusFilter !== "all") r = r.filter(l => l.status === statusFilter);
    return r;
  }, [loans, branchFilter, statusFilter]);

  const activeLoans = loans.filter(l => l.status === "active");
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.principal_amount, 0);

  const handleCoachChange = (coachId: string) => {
    const c = coaches.find(x => x.id === coachId);
    setForm(f => ({ ...f, coach_id: coachId, branch_id: c?.branch_id ?? f.branch_id }));
  };

  const previewInstallment = useMemo(() => {
    const principal = Number(form.principal_amount || 0);
    const tenor = Number(form.tenor_months || 0);
    if (!principal || !tenor) return 0;
    return computeInstallmentAmount(principal, tenor);
  }, [form.principal_amount, form.tenor_months]);

  const saveLoan = async () => {
    if (!form.coach_id) return toast.error(t("owner.coachLoans.selectCoachRequired"));
    if (!form.branch_id) return toast.error(t("owner.coachLoans.selectBranchRequired"));
    const principal = Number(form.principal_amount || 0);
    const tenor = Number(form.tenor_months || 0);
    if (!principal || principal <= 0) return toast.error(t("owner.coachLoans.invalidPrincipal"));
    if (!tenor || tenor <= 0) return toast.error(t("owner.coachLoans.invalidTenor"));

    setSaving(true);
    const coach = coaches.find(c => c.id === form.coach_id);
    const { error } = await supabase.from("coach_loans").insert({
      coach_id: form.coach_id,
      branch_id: form.branch_id,
      principal_amount: principal,
      tenor_months: tenor,
      installment_amount: computeInstallmentAmount(principal, tenor),
      reason: form.reason.trim() || null,
      notes: form.notes.trim() || null,
      status: "active",
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(t("owner.coachLoans.saveFailed"), error.message);
    toast.success(t("owner.coachLoans.created"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_loans", entityId: form.coach_id,
      entityLabel: coach?.full_name, action: "create",
      label: t("owner.coachLoans.activityCreated", { coach: coach?.full_name ?? "coach", amount: fmtIDR(principal), tenor }),
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
    const ok = await confirm({ title: t("owner.coachLoans.writeOffConfirmTitle"), body: t("owner.coachLoans.writeOffConfirmBody", { amount: fmtIDR(remaining), coach: detail.coach?.full_name ?? "coach" }), confirmLabel: t("owner.coachLoans.writeOffConfirmLabel"), danger: true });
    if (!ok) return;
    setActioning(true);
    if (remaining > 0) {
      await supabase.from("coach_loan_payments").insert({
        loan_id: detail.id, amount: remaining, installment_number: installmentCount + 1,
        period_label: "Tulis-off", kind: "write_off", created_by: userId,
      });
    }
    const { error } = await supabase.from("coach_loans").update({ status: "written_off", closed_at: new Date().toISOString() }).eq("id", detail.id);
    setActioning(false);
    if (error) return toast.error(t("owner.coachLoans.writeOffFailed"), error.message);
    toast.success(t("owner.coachLoans.writeOffSuccess"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_loans", entityId: detail.id,
      entityLabel: detail.coach?.full_name, action: "update",
      label: t("owner.coachLoans.activityWrittenOff", { coach: detail.coach?.full_name ?? "coach", amount: fmtIDR(remaining) }),
    });
    setDetail(null);
    loadLoans();
  };

  const cancelLoan = async () => {
    if (!detail) return;
    const ok = await confirm({ title: t("owner.coachLoans.cancelConfirmTitle"), body: t("owner.coachLoans.cancelConfirmBody"), confirmLabel: t("owner.coachLoans.cancelConfirmLabel"), danger: true });
    if (!ok) return;
    setActioning(true);
    const { error } = await supabase.from("coach_loans").update({ status: "cancelled", closed_at: new Date().toISOString() }).eq("id", detail.id);
    setActioning(false);
    if (error) return toast.error(t("owner.coachLoans.cancelFailed"), error.message);
    toast.success(t("owner.coachLoans.cancelSuccess"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "coach_loans", entityId: detail.id,
      entityLabel: detail.coach?.full_name, action: "update",
      label: t("owner.coachLoans.activityCancelled", { coach: detail.coach?.full_name ?? "coach" }),
    });
    setDetail(null);
    loadLoans();
  };

  void loanPaymentSums;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl">{t("owner.coachLoans.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("owner.coachLoans.pageSub")}</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => { setForm({ coach_id: "", branch_id: branches[0]?.id ?? "", principal_amount: "", tenor_months: "", reason: "", notes: "" }); setShowCreate(true); }}>
          {t("owner.coachLoans.addLoan")}
        </Btn>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label={t("owner.coachLoans.statActiveLoans")} value={activeLoans.length} icon="wallet" tone="warn" sub={activeLoans.length > 0 ? t("owner.coachLoans.statActiveLoansSubRunning") : t("owner.coachLoans.statActiveLoansSubNone")} />
        <Stat label={t("owner.coachLoans.statOutstandingBalance")} value={fmtIDR(totalOutstanding)} icon="chart" tone="ocean" sub={t("owner.coachLoans.statOutstandingBalanceSub")} />
        <Stat label={t("owner.coachLoans.statTotalLoans")} value={loans.length} icon="clipboard" tone="ok" sub={t("owner.coachLoans.statTotalLoansSub")} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {branches.length > 1 && (
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="text-sm rounded-xl border border-line bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
            <option value="all">{t("owner.coachLoans.filterAllBranches")}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm rounded-xl border border-line bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
          <option value="all">{t("owner.coachLoans.filterAllStatus")}</option>
          <option value="active">{statusLabel("active")}</option>
          <option value="paid_off">{statusLabel("paid_off")}</option>
          <option value="written_off">{statusLabel("written_off")}</option>
          <option value="cancelled">{statusLabel("cancelled")}</option>
        </select>
        <span className="text-xs text-ink-mute self-center ml-auto">{t("owner.coachLoans.loanCount", { count: filtered.length })}</span>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("owner.coachLoans.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-ink-mute">{t("owner.coachLoans.empty")}</div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map(loan => (
              <div key={loan.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper-tint cursor-pointer" onClick={() => openDetail(loan)}>
                <Avatar name={loan.coach?.full_name ?? "?"} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{loan.coach?.full_name ?? "—"}</span>
                    <Status kind={STATUS_KIND[loan.status]}>{statusLabel(loan.status)}</Status>
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5">{loan.branch?.name ?? "—"} · {t("owner.coachLoans.perMonth", { tenor: loan.tenor_months, amount: fmtIDR(loan.installment_amount) })}</div>
                  {loan.reason && <div className="text-xs text-ink-faint mt-0.5 truncate">{loan.reason}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm">{fmtIDR(loan.principal_amount)}</div>
                  <div className="text-xs text-ink-mute">{t("owner.coachLoans.principalLabel")}</div>
                </div>
                <Icon name="chevron" className="w-4 h-4 text-ink-faint shrink-0" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: Tambah Pinjaman */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("owner.coachLoans.addModalTitle")} size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={saveLoan} disabled={saving}>{saving ? t("common.actions.saving") : t("owner.coachLoans.saveLoan")}</Btn>
          </div>
        }>
        <div className="space-y-4">
          <Field label={t("owner.coachLoans.fieldCoach")}>
            <Select value={form.coach_id} onChange={e => handleCoachChange(e.target.value)}>
              <option value="">{t("owner.coachLoans.selectCoachPlaceholder")}</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </Field>
          <Field label={t("owner.coachLoans.fieldBranch")}>
            <Select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">{t("owner.coachLoans.selectBranchPlaceholder")}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("owner.coachLoans.fieldPrincipal")}>
              <Input type="text" inputMode="numeric" value={form.principal_amount ? Number(form.principal_amount).toLocaleString("id-ID") : ""}
                onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field label={t("owner.coachLoans.fieldTenor")}>
              <Input type="number" inputMode="numeric" min={1} value={form.tenor_months}
                onChange={e => setForm(f => ({ ...f, tenor_months: e.target.value.replace(/\D/g, "") }))} />
            </Field>
          </div>
          {previewInstallment > 0 && (
            <div className="bg-ocean-50 border border-ocean-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ocean-900">{t("owner.coachLoans.installmentPerMonth")}</span>
              <span className="font-mono font-bold text-ocean-700 text-lg">{fmtIDR(previewInstallment)}</span>
            </div>
          )}
          <Field label={t("owner.coachLoans.fieldReason")}><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("owner.coachLoans.fieldReasonPlaceholder")} /></Field>
          <Field label={t("owner.coachLoans.fieldNotes")}><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
        </div>
      </Modal>

      {/* Modal: Detail Pinjaman */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={t("owner.coachLoans.detailModalTitle")} size="md"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <div className="flex gap-2">
              {detail?.status === "active" && installmentCount === 0 && (
                <Btn variant="ghost" onClick={cancelLoan} disabled={actioning}>{t("owner.coachLoans.cancelBtn")}</Btn>
              )}
              {detail?.status === "active" && (
                <Btn variant="danger" onClick={writeOffLoan} disabled={actioning}>{actioning ? "…" : t("owner.coachLoans.writeOffBtn")}</Btn>
              )}
            </div>
            <Btn variant="ghost" onClick={() => setDetail(null)}>{t("common.actions.close")}</Btn>
          </div>
        }>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.coachLoans.detailCoach")}</div><div className="font-semibold">{detail.coach?.full_name ?? "—"}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.coachLoans.detailBranch")}</div><div className="font-semibold">{detail.branch?.name ?? "—"}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.coachLoans.detailStatus")}</div><Status kind={STATUS_KIND[detail.status]}>{statusLabel(detail.status)}</Status></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.coachLoans.detailTenor")}</div><div>{t("owner.coachLoans.detailTenorMonths", { tenor: detail.tenor_months })}</div></div>
              {detail.reason && <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.coachLoans.detailReason")}</div><div>{detail.reason}</div></div>}
            </div>

            <div className="border-t border-line pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span>{t("owner.coachLoans.principalAmount")}</span><span className="font-mono font-semibold">{fmtIDR(detail.principal_amount)}</span></div>
              <div className="flex justify-between text-sm text-ok-700"><span>{t("owner.coachLoans.amountPaid")}</span><span className="font-mono">{fmtIDR(paidTotal)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>{t("owner.coachLoans.remainingBalance")}</span><span className="font-mono text-danger-600">{fmtIDR(Math.max(0, remaining))}</span></div>
              <div className="pt-1">
                <div className="h-2 rounded-full bg-paper-deep overflow-hidden">
                  <div className="h-full bg-ok-500 rounded-full" style={{ width: `${clampPercent(installmentCount, detail.tenor_months)}%` }} />
                </div>
                <div className="text-xs text-ink-mute mt-1">{t("owner.coachLoans.installmentsProgress", { paid: installmentCount, total: detail.tenor_months })}</div>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{t("owner.coachLoans.paymentHistoryTitle")}</div>
              {loadingPayments ? (
                <p className="text-sm text-ink-mute">{t("owner.coachLoans.loading")}</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-ink-mute">{t("owner.coachLoans.noPaymentsYet")}</p>
              ) : (
                <div className="space-y-1.5">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-line text-sm">
                      <div>
                        <div className="font-semibold text-ink">{p.kind === "installment" ? t("owner.coachLoans.installmentNumber", { number: p.installment_number }) : p.kind === "write_off" ? t("owner.coachLoans.writeOffKind") : t("owner.coachLoans.adjustmentKind")}</div>
                        <div className="text-xs text-ink-mute">{p.period_label}</div>
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
