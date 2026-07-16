"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { printPayslip as printPayslipUtil } from "@/lib/printPayslip";
import {
  resolveTaxSetting,
  calculateTax,
  loansToDeductFor,
  generatePayslip,
  publishPayslipWithLoanClosure,
  type TaxSetting,
  type LoanCandidate,
  type DeductionInput,
} from "@/lib/payroll";

interface Branch {
  id: string;
  name: string;
}

interface InvoiceItem {
  id: string;
  class_id: string;
  session_count: number;
  rate: number;
}

interface InvoiceLike {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  branch_id?: string | null;
  branch?: { name: string } | null;
  coach?: { id: string; full_name: string } | null;
  coach_invoice_items?: InvoiceItem[];
}

interface OwnerPayslipRow {
  id: string;
  coach_id: string;
  branch_id: string;
  invoice_id: string | null;
  period_label: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  notes: string | null;
  status: string;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  coach?: { full_name: string } | null;
  branch?: { name: string } | null;
}

interface PayslipDeductionRow {
  id: string;
  type: string;
  label: string;
  amount: number;
}

export default function PayslipGenerator({
  branches, userId, userName, invoices, invoicesWithoutSlip,
}: {
  branches: Branch[];
  userId: string;
  userName: string;
  invoices: InvoiceLike[];
  invoicesWithoutSlip: InvoiceLike[];
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [payslips, setPayslips] = useState<OwnerPayslipRow[]>([]);
  const [loadingPayslips, setLoadingPayslips] = useState(true);
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Tax settings ─────────────────────────────────────────────────────────────
  const [taxMode, setTaxMode] = useState<"percent" | "fixed">("percent");
  const [taxPercent, setTaxPercent] = useState("");
  const [taxFixed, setTaxFixed] = useState("");
  const [taxSettingId, setTaxSettingId] = useState<string | null>(null);
  const [savingTax, setSavingTax] = useState(false);

  const loadTaxSetting = useCallback(async () => {
    const setting = await resolveTaxSetting(supabase);
    if (setting) {
      setTaxSettingId(setting.id);
      setTaxMode(setting.mode);
      setTaxPercent(setting.percent_value != null ? String(setting.percent_value) : "");
      setTaxFixed(setting.fixed_value != null ? String(setting.fixed_value) : "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadTaxSetting(); }, [loadTaxSetting]);

  const saveTaxSetting = async () => {
    if (taxMode === "percent" && (!taxPercent || Number(taxPercent) <= 0)) return toast.error("Masukkan persentase pajak yang valid");
    if (taxMode === "fixed" && (!taxFixed || Number(taxFixed) <= 0)) return toast.error("Masukkan nominal pajak yang valid");
    setSavingTax(true);
    const payload = {
      coach_id: null,
      mode: taxMode,
      percent_value: taxMode === "percent" ? Number(taxPercent) : null,
      fixed_value: taxMode === "fixed" ? Number(taxFixed) : null,
      is_active: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const op = taxSettingId
      ? supabase.from("tax_settings").update(payload).eq("id", taxSettingId)
      : supabase.from("tax_settings").insert(payload);
    const { error } = await op;
    setSavingTax(false);
    if (error) return toast.error("Gagal menyimpan pengaturan pajak", error.message);
    toast.success("Pengaturan pajak disimpan");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "tax_settings", entityId: taxSettingId ?? "new",
      action: "update", label: `Pengaturan pajak diubah menjadi ${taxMode === "percent" ? `${taxPercent}%` : fmtIDR(Number(taxFixed))}`,
    });
    loadTaxSetting();
  };

  // ── Payslip list ─────────────────────────────────────────────────────────────
  const loadPayslips = useCallback(async () => {
    setLoadingPayslips(true);
    const { data } = await supabase.from("payslips")
      .select("id, coach_id, branch_id, invoice_id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, published_by, created_at, coach:profiles!payslips_coach_id_fkey(full_name), branch:branches(name)")
      .order("created_at", { ascending: false });
    if (data) setPayslips(data as unknown as OwnerPayslipRow[]);
    setLoadingPayslips(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadPayslips(); }, [loadPayslips]);

  const filteredPayslips = useMemo(() => {
    let r = payslips;
    if (branchFilter !== "all") r = r.filter(p => p.branch_id === branchFilter);
    if (statusFilter !== "all") r = r.filter(p => p.status === statusFilter);
    return r;
  }, [payslips, branchFilter, statusFilter]);

  const invoicesEligible = useMemo(() => {
    const usedInvoiceIds = new Set(payslips.map(p => p.invoice_id).filter(Boolean));
    return invoicesWithoutSlip.filter(i => !usedInvoiceIds.has(i.id));
  }, [invoicesWithoutSlip, payslips]);

  // ── Generate modal ───────────────────────────────────────────────────────────
  const [showGenModal, setShowGenModal] = useState(false);
  const [savingSlip, setSavingSlip] = useState(false);
  const [genInvoiceId, setGenInvoiceId] = useState("");
  const [genPeriod, setGenPeriod] = useState("");
  const [genGross, setGenGross] = useState("");
  const [genOtherDeduction, setGenOtherDeduction] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [genTaxOverride, setGenTaxOverride] = useState<string | null>(null);
  const [genLoanCandidates, setGenLoanCandidates] = useState<LoanCandidate[]>([]);
  const [genLoanIncluded, setGenLoanIncluded] = useState<Record<string, boolean>>({});
  const [genLoanAmounts, setGenLoanAmounts] = useState<Record<string, string>>({});
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [taxSetting, setTaxSettingForGen] = useState<TaxSetting | null>(null);

  const resetGenForm = () => {
    setGenInvoiceId(""); setGenPeriod(""); setGenGross(""); setGenOtherDeduction("");
    setGenNotes(""); setGenTaxOverride(null); setGenLoanCandidates([]);
    setGenLoanIncluded({}); setGenLoanAmounts({});
  };

  const handleGenInvoiceChange = async (invoiceId: string) => {
    const inv = invoicesEligible.find(e => e.id === invoiceId);
    if (!inv || !inv.coach?.id) {
      setGenInvoiceId(invoiceId);
      return;
    }
    setGenInvoiceId(invoiceId);
    setGenPeriod(inv.period_label);
    setGenGross(String(inv.total_amount));
    setGenOtherDeduction("");
    setGenTaxOverride(null);

    setLoadingLoans(true);
    const [setting, candidates] = await Promise.all([
      resolveTaxSetting(supabase),
      loansToDeductFor(supabase, inv.coach.id),
    ]);
    setTaxSettingForGen(setting);
    setGenLoanCandidates(candidates);
    const included: Record<string, boolean> = {};
    const amounts: Record<string, string> = {};
    candidates.forEach(c => { included[c.loan.id] = true; amounts[c.loan.id] = String(c.next.amount); });
    setGenLoanIncluded(included);
    setGenLoanAmounts(amounts);
    setLoadingLoans(false);
  };

  const computedTax = useMemo(() => {
    const gross = Number(genGross || 0);
    return calculateTax(gross, taxSetting);
  }, [genGross, taxSetting]);

  const effectiveTax = genTaxOverride != null ? Number(genTaxOverride || 0) : computedTax;

  const includedLoanTotal = useMemo(() => {
    return genLoanCandidates.reduce((sum, c) => {
      if (!genLoanIncluded[c.loan.id]) return sum;
      return sum + Number(genLoanAmounts[c.loan.id] || 0);
    }, 0);
  }, [genLoanCandidates, genLoanIncluded, genLoanAmounts]);

  const otherDeductionAmount = Number(genOtherDeduction || 0);
  const totalDeductionsPreview = effectiveTax + includedLoanTotal + otherDeductionAmount;
  const netPreview = Number(genGross || 0) - totalDeductionsPreview;

  const savePayslip = async () => {
    if (!genInvoiceId) return toast.error("Pilih invoice terlebih dahulu");
    if (!genPeriod.trim()) return toast.error("Period label kosong");
    const inv = invoicesEligible.find(e => e.id === genInvoiceId);
    if (!inv || !inv.coach?.id) return toast.error("Invoice tidak ditemukan");

    setSavingSlip(true);
    const grossAmount = Number(genGross || 0);
    const deductions: DeductionInput[] = [];

    if (effectiveTax > 0) {
      deductions.push({
        type: "tax",
        label: "Pajak Penghasilan",
        amount: effectiveTax,
        meta: { mode: taxSetting?.mode ?? null, percent_value: taxSetting?.percent_value ?? null, fixed_value: taxSetting?.fixed_value ?? null, gross_amount: grossAmount, overridden: genTaxOverride != null },
      });
    }
    for (const c of genLoanCandidates) {
      if (!genLoanIncluded[c.loan.id]) continue;
      const amount = Number(genLoanAmounts[c.loan.id] || 0);
      if (amount <= 0) continue;
      deductions.push({
        type: "loan",
        label: `Cicilan Pinjaman (${c.next.installmentNumber}/${c.loan.tenor_months})`,
        amount,
        loan_id: c.loan.id,
        installment_number: c.next.installmentNumber,
        period_label: genPeriod.trim(),
      });
    }
    if (otherDeductionAmount > 0) {
      deductions.push({ type: "other", label: "Potongan Lain", amount: otherDeductionAmount });
    }

    const result = await generatePayslip(supabase, {
      coach_id: inv.coach.id,
      branch_id: inv.branch_id ?? "",
      invoice_id: genInvoiceId,
      period_label: genPeriod.trim(),
      gross_amount: grossAmount,
      deductions,
      notes: genNotes.trim() || null,
      created_by: userId,
    });
    setSavingSlip(false);

    if ("error" in result) return toast.error("Gagal simpan", result.error);
    toast.success("Slip gaji berhasil dibuat (draft)");
    logActivity(supabase, {
      userId, userRole: "owner", userName, entityType: "payslips", entityId: inv.coach.id,
      entityLabel: inv.coach.full_name, action: "create",
      label: `Slip gaji ${inv.coach.full_name} periode ${genPeriod.trim()} dibuat (draft)`,
      meta: { gross_amount: grossAmount, deductions: totalDeductionsPreview, net_amount: netPreview },
    });
    setShowGenModal(false);
    resetGenForm();
    loadPayslips();
  };

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const publishPayslip = async (p: OwnerPayslipRow) => {
    const ok = await confirm({ title: "Terbitkan Slip Gaji?", body: `Slip gaji ${p.coach?.full_name ?? "coach"} periode ${p.period_label} akan diterbitkan dan dapat dilihat coach.`, confirmLabel: "Terbitkan" });
    if (!ok) return;
    setPublishingId(p.id);
    const { error } = await supabase.from("payslips").update({ status: "published", published_at: new Date().toISOString(), published_by: userId }).eq("id", p.id);
    if (!error) await publishPayslipWithLoanClosure(supabase, p.id);
    setPublishingId(null);
    if (error) return toast.error("Gagal terbitkan", error.message);
    toast.success("Slip gaji diterbitkan");
    logActivity(supabase, { userId, userRole: "owner", userName, branchId: p.branch_id, entityType: "payslips", entityId: p.id, entityLabel: p.coach?.full_name ?? undefined, action: "publish", label: `Slip gaji ${p.coach?.full_name ?? "coach"} periode ${p.period_label} diterbitkan`, meta: { net_amount: p.net_amount } });
    setPayslips(prev => prev.map(s => s.id === p.id ? { ...s, status: "published", published_at: new Date().toISOString() } : s));
  };

  const deletePayslip = async (p: OwnerPayslipRow) => {
    const ok = await confirm({ title: "Hapus Slip Gaji?", body: "Slip gaji draft ini akan dihapus, termasuk cicilan pinjaman yang sudah tercatat di dalamnya (akan dihitung ulang saat slip baru dibuat).", confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("payslips").delete().eq("id", p.id);
    if (error) return toast.error("Gagal hapus", error.message);
    toast.success("Slip gaji dihapus");
    logActivity(supabase, { userId, userRole: "owner", userName, branchId: p.branch_id, entityType: "payslips", entityId: p.id, entityLabel: p.coach?.full_name ?? undefined, action: "delete", label: `Slip gaji draft ${p.coach?.full_name ?? "coach"} periode ${p.period_label} dihapus` });
    setPayslips(prev => prev.filter(s => s.id !== p.id));
  };

  const printPayslip = (p: OwnerPayslipRow) => { void printPayslipUtil(supabase, p.id); };

  // ── View/detail modal ────────────────────────────────────────────────────────
  const [viewSlip, setViewSlip] = useState<OwnerPayslipRow | null>(null);
  const [viewDeductions, setViewDeductions] = useState<PayslipDeductionRow[]>([]);
  const [loadingViewDeductions, setLoadingViewDeductions] = useState(false);

  const openViewSlip = async (p: OwnerPayslipRow) => {
    setViewSlip(p);
    setLoadingViewDeductions(true);
    const { data } = await supabase.from("payslip_deductions").select("id, type, label, amount").eq("payslip_id", p.id).order("type");
    if (data) setViewDeductions(data as PayslipDeductionRow[]);
    setLoadingViewDeductions(false);
  };

  void invoices;

  return (
    <div className="space-y-5">
      {/* ── Tax Settings Card ────────────────────────────────────────────────── */}
      <Card className="space-y-3">
        <div>
          <div className="font-display font-bold text-base">Pengaturan Pajak</div>
          <p className="text-xs text-ink-mute mt-0.5">Berlaku global untuk semua coach. Perubahan di sini tidak mengubah slip gaji yang sudah pernah dibuat.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            <button onClick={() => setTaxMode("percent")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${taxMode === "percent" ? "bg-ocean-700 text-white" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"}`}>
              Persentase (%)
            </button>
            <button onClick={() => setTaxMode("fixed")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${taxMode === "fixed" ? "bg-ocean-700 text-white" : "bg-paper-tint text-ink-soft hover:bg-paper-deep"}`}>
              Nominal Tetap (Rp)
            </button>
          </div>
          <div className="w-40">
            {taxMode === "percent" ? (
              <Input type="number" inputMode="decimal" min={0} max={100} step="0.01" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} placeholder="5" className="font-mono" />
            ) : (
              <Input type="text" inputMode="numeric" value={taxFixed ? Number(taxFixed).toLocaleString("id-ID") : ""} onChange={e => setTaxFixed(e.target.value.replace(/\D/g, ""))} placeholder="50.000" className="font-mono" />
            )}
          </div>
          <Btn variant="soft" size="sm" onClick={saveTaxSetting} disabled={savingTax}>{savingTax ? "…" : "Simpan"}</Btn>
        </div>
      </Card>

      <div className="mt-8 pt-2">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="font-display font-bold text-xl">Slip Gaji</div>
            <p className="text-sm text-ink-mute">Generate dan terbitkan slip gaji dari invoice yang sudah lunas.</p>
          </div>
          <Btn variant="primary" icon="plus" onClick={() => { resetGenForm(); setShowGenModal(true); }}>
            Generate Slip Gaji
          </Btn>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="text-sm rounded-xl border border-line bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
            <option value="all">Semua cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm rounded-xl border border-line bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
            <option value="all">Semua status</option>
            <option value="draft">Draft</option>
            <option value="published">Diterbitkan</option>
          </select>
          <span className="text-xs text-ink-mute self-center ml-auto">{filteredPayslips.length} slip</span>
        </div>

        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          {loadingPayslips ? (
            <div className="p-10 text-center text-ink-mute">Memuat data…</div>
          ) : filteredPayslips.length === 0 ? (
            <div className="p-10 text-center text-ink-mute">Belum ada slip gaji. Klik &ldquo;Generate Slip Gaji&rdquo; untuk membuat dari invoice yang sudah lunas.</div>
          ) : (
            <div className="divide-y divide-line">
              {filteredPayslips.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper-tint">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.status === "published" ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
                    <Icon name="invoice" className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.coach?.full_name ?? "—"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "published" ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
                        {p.status === "published" ? "Diterbitkan" : "Draft"}
                      </span>
                    </div>
                    <div className="text-xs text-ink-mute mt-0.5">{p.period_label} · {p.branch?.name ?? "—"}</div>
                    <div className="text-xs text-ink-mute">Gross {fmtIDR(p.gross_amount)} · Potongan {fmtIDR(p.deductions)} · <span className="text-ok-700 font-semibold">Net {fmtIDR(p.net_amount)}</span></div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openViewSlip(p)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600" title="Lihat / Cetak">
                      <Icon name="eye" className="w-4 h-4" />
                    </button>
                    {p.status === "draft" && (
                      <>
                        <Btn variant="soft" size="sm" onClick={() => publishPayslip(p)} disabled={publishingId === p.id}>
                          {publishingId === p.id ? "…" : "Terbitkan"}
                        </Btn>
                        <button onClick={() => deletePayslip(p)} className="w-8 h-8 rounded-lg border border-line hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title="Hapus">
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Generate Slip Gaji ────────────────────────────────────────── */}
      <Modal open={showGenModal} onClose={() => setShowGenModal(false)} title="Generate Slip Gaji" size="lg"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowGenModal(false)}>Batal</Btn>
            <Btn variant="primary" onClick={savePayslip} disabled={savingSlip || !genInvoiceId}>
              {savingSlip ? "Menyimpan…" : "Simpan sebagai Draft"}
            </Btn>
          </div>
        }>
        <div className="space-y-4">
          <Field label="Invoice Coach (sudah lunas)">
            <Select value={genInvoiceId} onChange={e => handleGenInvoiceChange(e.target.value)}>
              <option value="">— Pilih invoice —</option>
              {invoicesEligible.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.coach?.full_name ?? "—"} · {inv.period_label} · {fmtIDR(inv.total_amount)} ({inv.branch?.name ?? "—"})</option>
              ))}
            </Select>
          </Field>
          {invoicesEligible.length === 0 && (
            <p className="text-xs text-ink-mute">Semua invoice lunas sudah memiliki slip gaji, atau belum ada invoice yang lunas.</p>
          )}

          {genInvoiceId && (
            <>
              <Field label="Periode"><Input value={genPeriod} onChange={e => setGenPeriod(e.target.value)} placeholder="Contoh: Juni 2026" /></Field>
              <Field label="Gaji Kotor (Rp)"><Input type="number" inputMode="numeric" min={0} value={genGross} onChange={e => setGenGross(e.target.value.replace(/\D/g, ""))} /></Field>

              <div className="border border-line rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Pajak Penghasilan</span>
                  {genTaxOverride == null ? (
                    <button type="button" onClick={() => setGenTaxOverride(String(computedTax))} className="text-xs text-ocean-600 hover:underline flex items-center gap-1">
                      <Icon name="edit" className="w-3 h-3" /> Ubah manual
                    </button>
                  ) : (
                    <button type="button" onClick={() => setGenTaxOverride(null)} className="text-xs text-ink-mute hover:underline">Pakai otomatis</button>
                  )}
                </div>
                {genTaxOverride == null ? (
                  <div className="font-mono font-bold text-ink">{fmtIDR(computedTax)}</div>
                ) : (
                  <Input type="number" inputMode="numeric" min={0} value={genTaxOverride} onChange={e => setGenTaxOverride(e.target.value.replace(/\D/g, ""))} className="font-mono" />
                )}
              </div>

              {loadingLoans ? (
                <div className="text-sm text-ink-mute">Memeriksa pinjaman aktif…</div>
              ) : genLoanCandidates.length > 0 && (
                <div className="border border-line rounded-xl p-3.5 space-y-3">
                  <span className="text-sm font-semibold text-ink">Cicilan Pinjaman</span>
                  {genLoanCandidates.map(c => (
                    <div key={c.loan.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={!!genLoanIncluded[c.loan.id]} onChange={e => setGenLoanIncluded(prev => ({ ...prev, [c.loan.id]: e.target.checked }))} className="w-4 h-4 rounded accent-ocean-600" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ink-soft">Cicilan ke-{c.next.installmentNumber} dari {c.loan.tenor_months} {c.loan.reason ? `· ${c.loan.reason}` : ""}</div>
                      </div>
                      <div className="w-32">
                        <Input type="number" inputMode="numeric" min={0} disabled={!genLoanIncluded[c.loan.id]}
                          value={genLoanAmounts[c.loan.id] ?? ""} onChange={e => setGenLoanAmounts(prev => ({ ...prev, [c.loan.id]: e.target.value.replace(/\D/g, "") }))}
                          className="font-mono text-sm" />
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-ink-faint">Uncheck untuk melewati cicilan bulan ini (misalnya coach sedang cuti).</p>
                </div>
              )}

              <Field label="Potongan Lain (Rp, opsional)"><Input type="number" inputMode="numeric" min={0} value={genOtherDeduction} onChange={e => setGenOtherDeduction(e.target.value.replace(/\D/g, ""))} /></Field>

              <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Gaji Kotor</span><span className="font-mono">{fmtIDR(Number(genGross || 0))}</span></div>
                <div className="flex justify-between text-danger-700"><span>Pajak</span><span className="font-mono">- {fmtIDR(effectiveTax)}</span></div>
                {includedLoanTotal > 0 && <div className="flex justify-between text-danger-700"><span>Cicilan Pinjaman</span><span className="font-mono">- {fmtIDR(includedLoanTotal)}</span></div>}
                {otherDeductionAmount > 0 && <div className="flex justify-between text-danger-700"><span>Potongan Lain</span><span className="font-mono">- {fmtIDR(otherDeductionAmount)}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1.5 border-t border-line">
                  <span className="text-ok-900">Gaji Bersih</span>
                  <span className="font-mono text-ok-700">{fmtIDR(netPreview)}</span>
                </div>
              </div>

              <Field label="Catatan (opsional)"><Textarea value={genNotes} onChange={e => setGenNotes(e.target.value)} rows={2} placeholder="Catatan untuk coach…" /></Field>
            </>
          )}
        </div>
      </Modal>

      {/* ── Modal: View / Print Slip Gaji ────────────────────────────────────── */}
      <Modal open={!!viewSlip} onClose={() => setViewSlip(null)} title="Detail Slip Gaji" size="md"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Btn variant="ghost" icon="print" onClick={() => viewSlip && printPayslip(viewSlip)}>Cetak</Btn>
            <Btn variant="ghost" onClick={() => setViewSlip(null)}>Tutup</Btn>
          </div>
        }>
        {viewSlip && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Coach</div><div className="font-semibold">{viewSlip.coach?.full_name ?? "—"}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Cabang</div><div className="font-semibold">{viewSlip.branch?.name ?? "—"}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Periode</div><div>{viewSlip.period_label}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Status</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${viewSlip.status === "published" ? "bg-ok-50 text-ok-700" : "bg-warn-50 text-warn-700"}`}>
                  {viewSlip.status === "published" ? "Diterbitkan" : "Draft"}
                </span>
              </div>
              {viewSlip.published_at && <div className="col-span-2"><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Diterbitkan pada</div><div>{new Date(viewSlip.published_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</div></div>}
            </div>
            <div className="border-t border-line pt-4 space-y-2">
              <div className="flex justify-between py-2 border-b border-line text-sm"><span>Gaji Kotor</span><span className="font-mono font-semibold">{fmtIDR(viewSlip.gross_amount)}</span></div>
              {loadingViewDeductions ? (
                <div className="text-sm text-ink-mute py-2">Memuat rincian potongan…</div>
              ) : viewDeductions.length > 0 ? (
                viewDeductions.map(d => (
                  <div key={d.id} className="flex justify-between py-2 border-b border-line text-sm text-danger-700"><span>{d.label}</span><span className="font-mono">- {fmtIDR(d.amount)}</span></div>
                ))
              ) : (
                <div className="flex justify-between py-2 border-b border-line text-sm text-danger-700"><span>Potongan</span><span className="font-mono">- {fmtIDR(viewSlip.deductions)}</span></div>
              )}
              <div className="flex justify-between py-2 text-base font-bold"><span>Gaji Bersih</span><span className="font-mono text-ok-700">{fmtIDR(viewSlip.net_amount)}</span></div>
            </div>
            {viewSlip.notes && (
              <div className="bg-paper-tint rounded-xl p-3 text-sm text-ink-mute">{viewSlip.notes}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
