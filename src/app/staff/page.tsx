"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import Modal from "@/components/ui/Modal";
import QRBox from "@/components/ui/QRBox";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import DatePicker from "@/components/ui/DatePicker";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR, fmtDate, fmtDateLong } from "@/lib/utils";
import { isUniqueViolation } from "@/lib/attendance";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { printPayslip } from "@/lib/printPayslip";
import type { User } from "@supabase/supabase-js";

type TabId = "home" | "absen" | "invoice" | "payslip" | "expenses" | "profile";

interface StaffProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  branch_id?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  avatar_url?: string | null;
  qr_code?: string | null;
  is_profile_complete?: boolean;
}

interface BranchInfo {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
}

interface StaffAttendance {
  id: string;
  attendance_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: "present" | "absent" | "izin" | "sakit";
  note: string | null;
  selfie_url: string | null;
  created_at: string;
}

interface StaffSalary {
  id: string;
  period_month: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  reimburse_amount: number;
  total_salary: number;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

interface ExpenseRow {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  proof_url: string | null;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
  created_at: string;
}

function fmtClockTime(val: string | null | undefined): string {
  if (!val) return "—";
  if (val.includes("T") || val.includes("-")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    }
  }
  return val.slice(0, 8);
}

function StaffProfileGate({
  profile,
  onComplete,
  onLogout,
}: {
  profile: StaffProfile;
  onComplete: (updated: Partial<StaffProfile>) => void;
  onLogout: () => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const supabase = createClient();
  const [form, setForm] = useState({
    phone: profile.phone ?? "",
    gender: profile.gender ?? "",
    birth_date: profile.birth_date ?? "",
    bank_name: profile.bank_name ?? "",
    bank_account: profile.bank_account ?? "",
    bank_holder: profile.bank_holder ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (
      !form.phone.trim() || !form.gender || !form.birth_date ||
      !form.bank_name.trim() || !form.bank_account.trim() || !form.bank_holder.trim()
    ) {
      return toast.error(t("staff.profileGate.allFieldsRequired"));
    }
    setSaving(true);
    const payload = {
      phone: form.phone.trim(),
      gender: form.gender,
      birth_date: form.birth_date,
      bank_name: form.bank_name.trim(),
      bank_account: form.bank_account.trim(),
      bank_holder: form.bank_holder.trim(),
      is_profile_complete: true,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(t("staff.profileGate.saveFailed"), error.message);
    onComplete(payload);
  };

  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center px-4 py-12">
      <Logo size={48} withWord />
      <div className="w-full max-w-md mt-8 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display font-bold text-2xl text-ink">{t("staff.profileGate.title")}</h1>
          <p className="text-sm text-ink-mute">{t("staff.profileGate.subtitle")}</p>
        </div>
        <Card className="space-y-4">
          <Field label={t("staff.profileGate.fieldPhone")} required>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={t("staff.profileGate.fieldPhonePlaceholder")}
              className="font-mono"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("staff.profileGate.fieldGender")} required>
              <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{t("staff.profileGate.selectEllipsis")}</option>
                <option value="male">{t("staff.profileGate.genderMale")}</option>
                <option value="female">{t("staff.profileGate.genderFemale")}</option>
              </Select>
            </Field>
            <Field label={t("staff.profileGate.fieldBirthDate")} required>
              <DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} />
            </Field>
          </div>
          <div className="pt-3 border-t border-line space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {t("staff.profileGate.bankSectionTitle")}
            </div>
            <Field label={t("staff.profileGate.fieldBankName")} required>
              <Input
                value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                placeholder={t("staff.profileGate.fieldBankNamePlaceholder")}
              />
            </Field>
            <Field label={t("staff.profileGate.fieldBankAccount")} required>
              <Input
                value={form.bank_account}
                onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                placeholder={t("staff.profileGate.fieldBankAccountPlaceholder")}
                className="font-mono"
              />
            </Field>
            <Field label={t("staff.profileGate.fieldBankHolder")} required>
              <Input
                value={form.bank_holder}
                onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))}
                placeholder={t("staff.profileGate.fieldBankHolderPlaceholder")}
              />
            </Field>
          </div>
          <Btn variant="primary" className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? t("staff.profileGate.saving") : t("staff.profileGate.saveAndContinue")}
          </Btn>
          <button onClick={onLogout} className="text-xs text-ink-mute hover:text-danger-600 transition-colors w-full text-center">
            {t("staff.profileGate.logoutBtn")}
          </button>
        </Card>
      </div>
    </div>
  );
}

function StaffClockInFlow({
  onCancel,
  onConfirm,
  loading
}: {
  onCancel: () => void;
  onConfirm: (photo: File) => void;
  loading: boolean;
}) {
  const { t } = useLocale();
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-paper anim-in">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-white">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-paper-tint text-ink transition-colors">
          <Icon name="arrow-left" className="w-5 h-5" />
        </button>
        <div>
          <div className="font-display font-bold text-ink leading-tight">{t("staff.actions.clockInSelfieTitle")}</div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mt-0.5">{t("staff.actions.clockInSelfieSub")}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          {!photoFile ? (
            <div className="aspect-[3/4] rounded-3xl bg-paper-tint border-2 border-dashed border-line flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-wave-50 text-wave-600 flex items-center justify-center mb-4">
                <Icon name="camera" className="w-8 h-8" />
              </div>
              <div className="font-display font-bold text-lg text-ink mb-2">{t("staff.actions.selfiePromptTitle")}</div>
              <p className="text-sm text-ink-mute mb-6">{t("staff.actions.selfiePromptBody")}</p>
              
              <label className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-wave-600 hover:bg-wave-700 text-white font-semibold cursor-pointer transition-colors shadow-lg shadow-wave-500/20">
                <Icon name="camera" className="w-5 h-5" /> {t("staff.actions.openCameraBtn")}
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleCapture} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from camera capture */}
              <img src={URL.createObjectURL(photoFile)} alt="selfie preview" className="w-full aspect-[3/4] object-cover rounded-3xl shadow-lg" />
              <div className="grid grid-cols-2 gap-3">
                <label className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white border border-line hover:bg-paper-tint text-ink font-semibold cursor-pointer transition-colors">
                  <Icon name="refresh" className="w-4 h-4" /> {t("staff.actions.retakeBtn")}
                  <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleCapture} />
                </label>
                <Btn variant="primary" className="h-11 shadow-lg shadow-ocean-500/20" disabled={loading || !photoFile} onClick={() => photoFile && onConfirm(photoFile)}>
                  {loading ? t("staff.home.clockInProcessing") : t("staff.actions.confirmBtn")}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StaffInvoiceItem {
  id: string;
  item_type: string;
  session_count: number;
  rate: number;
  description: string | null;
  proof_url: string | null;
}

interface StaffPastInvoice {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  rejection_reason?: string | null;
  coach_invoice_items?: StaffInvoiceItem[];
}

function StaffInvoice({ staffId, branchId, profile }: { staffId: string; branchId: string; profile: StaffProfile | null }) {
  const { t } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload, uploading } = useUpload();

  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [manualDescription, setManualDescription] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pastInvoices, setPastInvoices] = useState<StaffPastInvoice[]>([]);

  const load = useCallback(async () => {
    const { data: inv } = await supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, rejection_reason, coach_invoice_items(id, item_type, session_count, rate, description, proof_url)")
      .eq("coach_id", staffId)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false });
    setPastInvoices((inv as unknown as StaffPastInvoice[]) ?? []);
  }, [supabase, staffId]);

  useEffect(() => { load(); }, [load]);

  const requireOpenPeriod = async () => {
    const { data: periodRows } = await supabase
      .from("invoice_periods")
      .select("id")
      .eq("is_open", true)
      .order("date_to", { ascending: true })
      .limit(1);
    return periodRows?.[0]?.id ?? null;
  };

  const bankInfoSnapshot = () =>
    profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null;

  const notifyOwners = async (invoiceNumber: string, periodLabel: string, total: number) => {
    const { data: ownerProfiles } = await supabase.from("profiles").select("id").eq("branch_id", branchId).eq("role", "owner");
    if (ownerProfiles && ownerProfiles.length > 0) {
      await supabase.from("notifications").insert(ownerProfiles.map((op) => ({
        user_id: op.id,
        title: t("staff.invoice.ownerNewInvoiceTitle"),
        body: t("staff.invoice.ownerNewInvoiceBody", { name: profile?.full_name ?? "Staff", num: invoiceNumber, period: periodLabel, amount: fmtIDR(total) }),
        icon: "invoice",
        kind: "info",
      })));
    }
  };

  const submitManual = async () => {
    if (!manualDescription.trim()) return toast.error(t("staff.invoice.descriptionRequired"));
    const amountNum = Number(manualAmount);
    if (!amountNum || amountNum <= 0) return toast.error(t("staff.invoice.invalidAmount"));
    setSubmitting(true);
    const activePeriodId = await requireOpenPeriod();
    if (!activePeriodId) {
      setSubmitting(false);
      return toast.error(t("staff.expenses.periodClosedTitle"), t("staff.expenses.periodClosedBody"));
    }

    let proofUrl: string | undefined;
    if (manualProofFile) {
      try {
        proofUrl = await upload.paymentProof(manualProofFile, `staff-inv-${staffId}-${Date.now()}`) ?? undefined;
      } catch (err) {
        setSubmitting(false);
        return toast.error(t("staff.invoice.uploadProofFailed"), err instanceof Error ? err.message : undefined);
      }
    }

    const invoiceNumber = `INV-S-${Date.now().toString(36).toUpperCase()}`;
    const periodLabel = period;
    const { data: inv, error: invError } = await supabase.from("coach_invoices").insert({
      coach_id: staffId,
      branch_id: branchId,
      invoice_number: invoiceNumber,
      period_label: periodLabel,
      period_id: activePeriodId,
      total_amount: amountNum,
      bank_info: bankInfoSnapshot(),
      status: "pending",
    }).select("id").single();

    if (invError || !inv) {
      setSubmitting(false);
      return toast.error(t("staff.invoice.submitFailed"), invError?.message);
    }

    await supabase.from("coach_invoice_items").insert({
      invoice_id: inv.id,
      item_type: "manual_fee",
      session_count: 1,
      rate: amountNum,
      description: manualDescription.trim(),
      proof_url: proofUrl ?? null,
    });

    await notifyOwners(invoiceNumber, periodLabel, amountNum);
    setSubmitting(false);
    toast.success(t("staff.invoice.submitSuccessTitle"), t("staff.invoice.submitSuccessBody"));
    setManualDescription("");
    setManualAmount("");
    setManualProofFile(null);
    load();
  };

  const cancelInvoice = async (invoiceId: string) => {
    const ok = await confirm({
      title: t("staff.invoice.cancelConfirmTitle"),
      body: t("staff.invoice.cancelConfirmBody"),
      confirmLabel: t("staff.invoice.cancelConfirmLabel"),
      danger: true,
    });
    if (!ok) return;
    setCancelling(invoiceId);
    const { error } = await supabase.rpc("cancel_coach_invoice", { p_invoice_id: invoiceId, p_coach_id: staffId });
    setCancelling(null);
    if (error) return toast.error(t("staff.invoice.cancelFailed"), error.message);
    toast.success(t("staff.invoice.cancelSuccess"));
    load();
  };

  return (
    <Card className="space-y-4">
      <SectionTitle sub={t("staff.invoice.sub")}>{t("staff.invoice.title")}</SectionTitle>

      <div className="space-y-3">
        <Field label={t("staff.invoice.fieldPeriod")}>
          <div className="w-48">
            <MonthYearPicker value={period} onChange={setPeriod} />
          </div>
        </Field>

        <Field label={t("staff.invoice.fieldDescription")} required>
          <Input
            value={manualDescription}
            onChange={e => setManualDescription(e.target.value)}
            placeholder={t("staff.invoice.fieldDescriptionPlaceholder")}
          />
        </Field>

        <Field label={t("staff.invoice.fieldAmount")} required>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={manualAmount}
            onChange={e => setManualAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="Contoh: 3000000"
            className="font-mono"
          />
        </Field>

        <Field label={t("staff.invoice.fieldProof")}>
          <input
            type="file"
            accept="image/*"
            onChange={e => setManualProofFile(e.target.files?.[0] ?? null)}
            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer"
          />
        </Field>

        <Btn variant="primary" onClick={submitManual} disabled={submitting || uploading}>
          {submitting || uploading ? t("staff.invoice.submitting") : t("staff.invoice.submitBtn")}
        </Btn>
      </div>

      <div className="pt-4 border-t border-line space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("staff.invoice.pastInvoicesTitle")}</div>
        {pastInvoices.length === 0 ? (
          <p className="text-sm text-ink-mute">{t("staff.invoice.empty")}</p>
        ) : (
          pastInvoices.map(iv => (
            <div key={iv.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-ocean-700">{iv.invoice_number}</span>
                  <Status kind={iv.status === "paid" ? "paid" : iv.status === "approved" ? "approved" : iv.status === "rejected" ? "rejected" : "pending"}>
                    {iv.status === "paid" ? t("staff.invoice.statusPaid") : iv.status === "approved" ? t("staff.invoice.statusApproved") : iv.status === "rejected" ? t("staff.invoice.statusRejected") : t("staff.invoice.statusPending")}
                  </Status>
                </div>
                <div className="text-xs text-ink-mute mt-0.5">{iv.period_label}</div>
                {iv.status === "rejected" && iv.rejection_reason && (
                  <div className="text-xs text-danger-500 mt-0.5 flex items-center gap-1">
                    <Icon name="warning" className="w-3 h-3" />{iv.rejection_reason}
                  </div>
                )}
              </div>
              <div className="font-mono font-bold text-sm shrink-0">{fmtIDR(iv.total_amount)}</div>
              {(iv.status === "pending" || iv.status === "rejected") && (
                <button
                  title={t("staff.invoice.cancelTitleAttr")}
                  onClick={() => cancelInvoice(iv.id)}
                  disabled={cancelling === iv.id}
                  className="w-8 h-8 rounded-lg border border-danger-200 hover:bg-danger-50 flex items-center justify-center text-danger-400 hover:text-danger-600 transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const supabase = createClient();
  const { upload, uploading } = useUpload();

  const [active, setActive] = useState<TabId>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [branch, setBranch] = useState<BranchInfo | null>(null);

  // Data states
  const [todayAttendance, setTodayAttendance] = useState<StaffAttendance | null>(null);
  const [attendances, setAttendances] = useState<StaffAttendance[]>([]);
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Clock in/out form state
  const [clockNotes, setClockNotes] = useState("");
  const [clockLoading, setClockLoading] = useState(false);
  const [showSelfieFlow, setShowSelfieFlow] = useState(false);

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    "Operasional",
    "Perlengkapan",
    "Konsumsi",
    "Lainnya",
  ]);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "Operasional",
    occurred_at: new Date().toISOString().slice(0, 10),
    proof_url: "",
    notes: "",
  });
  const [expenseProofFile, setExpenseProofFile] = useState<File | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);

  // Load expense categories from manual_transaction_categories (CRUD by Owner in Owner Panel)
  const loadExpenseCategories = useCallback(async () => {
    const { data } = await supabase
      .from("manual_transaction_categories")
      .select("name")
      .eq("kind", "expense")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (data && data.length > 0) {
      const names = data.map(c => c.name);
      setExpenseCategories(names);
      setExpenseForm(prev => ({
        ...prev,
        category: prev.category && names.includes(prev.category) ? prev.category : names[0],
      }));
    }
  }, [supabase]);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    gender: "",
    birth_date: "",
    bank_name: "",
    bank_account: "",
    bank_holder: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Initial load
  const loadData = useCallback(async (userId: string) => {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Today's attendance
    const { data: todayAtt } = await supabase
      .from("staff_attendances")
      .select("*")
      .eq("staff_id", userId)
      .eq("attendance_date", today)
      .maybeSingle();
    setTodayAttendance((todayAtt as unknown as StaffAttendance) ?? null);

    // 2. All attendances for this staff
    const { data: allAtt } = await supabase
      .from("staff_attendances")
      .select("*")
      .eq("staff_id", userId)
      .order("attendance_date", { ascending: false });
    setAttendances((allAtt as unknown as StaffAttendance[]) ?? []);

    // 3. Payslips — query staff_salaries and unified payslips records
    const { data: salaryData } = await supabase
      .from("staff_salaries")
      .select("*")
      .eq("staff_id", userId)
      .order("period_month", { ascending: false });

    const { data: unifiedPayslips } = await supabase
      .from("payslips")
      .select("id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, created_at")
      .eq("coach_id", userId)
      .order("created_at", { ascending: false });

    const mergedSalaries: StaffSalary[] = ((salaryData as unknown as StaffSalary[]) ?? []).slice();

    if (unifiedPayslips) {
      for (const p of unifiedPayslips) {
        const exists = mergedSalaries.some(s => s.id === p.id || s.period_month === p.period_label);
        if (!exists) {
          mergedSalaries.push({
            id: p.id,
            period_month: p.period_label,
            base_salary: p.gross_amount ?? 0,
            allowances: 0,
            reimburse_amount: 0,
            deductions: p.deductions ?? 0,
            total_salary: p.net_amount ?? 0,
            status: p.status ?? "approved",
            notes: p.notes,
            paid_at: p.published_at,
            created_at: p.created_at,
          });
        }
      }
    }
    setSalaries(mergedSalaries);

    // 4. Reimbursements submitted by this staff
    const { data: expData } = await supabase
      .from("staff_reimbursements")
      .select("*")
      .eq("profile_id", userId)
      .order("submitted_at", { ascending: false });
    setExpenses((expData as unknown as ExpenseRow[]) ?? []);

    // 5. Expense categories created/managed by Owner in owner panel
    await loadExpenseCategories();
  }, [supabase, loadExpenseCategories]);

  useEffect(() => {
    if (showExpenseModal) {
      loadExpenseCategories();
    }
  }, [showExpenseModal, loadExpenseCategories]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, branch_id, gender, birth_date, bank_name, bank_account, bank_holder, avatar_url, qr_code, is_profile_complete")
        .eq("id", authUser.id)
        .single();

      if (prof) {
        const staffProf: StaffProfile = {
          id: prof.id,
          full_name: prof.full_name ?? authUser.user_metadata?.full_name ?? "Staff",
          email: prof.email ?? authUser.email,
          phone: prof.phone,
          branch_id: prof.branch_id,
          gender: prof.gender,
          birth_date: prof.birth_date,
          bank_name: prof.bank_name,
          bank_account: prof.bank_account,
          bank_holder: prof.bank_holder,
          avatar_url: prof.avatar_url,
          qr_code: (prof as unknown as { qr_code?: string | null }).qr_code ?? null,
          is_profile_complete: (prof as unknown as { is_profile_complete?: boolean }).is_profile_complete ?? false,
        };
        setProfile(staffProf);
        setProfileForm({
          full_name: staffProf.full_name,
          phone: staffProf.phone ?? "",
          gender: staffProf.gender ?? "",
          birth_date: staffProf.birth_date ?? "",
          bank_name: staffProf.bank_name ?? "",
          bank_account: staffProf.bank_account ?? "",
          bank_holder: staffProf.bank_holder ?? "",
        });

        if (prof.branch_id) {
          const { data: br } = await supabase
            .from("branches")
            .select("id, name, city, address")
            .eq("id", prof.branch_id)
            .single();
          if (br) setBranch(br as BranchInfo);
        }

        await loadData(authUser.id);
      }
      setLoading(false);
    }
    init();
  }, [supabase, router, loadData]);

  // Handle Clock-In
  const handleClockIn = async (photoFile: File) => {
    if (!user || !profile) return;
    setClockLoading(true);
    const now = new Date();
    const isoTimestamp = now.toISOString();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const today = now.toISOString().slice(0, 10);

    let selfieUrl: string | null = null;
    try {
      selfieUrl = await upload.staffSelfie(photoFile, today);
    } catch {
      toast.error(t("staff.actions.selfieUploadFailedTitle"), t("staff.actions.selfieUploadFailedBody"));
    }

    const { data, error } = await supabase
      .from("staff_attendances")
      .insert({
        staff_id: user.id,
        branch_id: profile.branch_id ?? "",
        attendance_date: today,
        clock_in_time: isoTimestamp,
        status: "present",
        note: clockNotes.trim() || null,
        selfie_url: selfieUrl,
      })
      .select("*")
      .single();

    setClockLoading(false);
    if (error) {
      if (isUniqueViolation(error.message)) {
        toast.error(t("staff.actions.alreadyClockedInTitle"), t("staff.actions.alreadyClockedInBody"));
        return;
      }
      toast.error(t("staff.actions.clockInFailed"), error.message);
      return;
    }

    setTodayAttendance(data as unknown as StaffAttendance);
    setClockNotes("");
    setShowSelfieFlow(false);
    toast.success(t("staff.actions.clockInSuccessTitle"), t("staff.actions.clockInSuccessBody", { time: timeStr }));
    await loadData(user.id);
  };

  // Handle Clock-Out
  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setClockLoading(true);
    const now = new Date();
    const isoTimestamp = now.toISOString();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const { error } = await supabase
      .from("staff_attendances")
      .update({
        clock_out_time: isoTimestamp,
        note: clockNotes.trim() ? `${todayAttendance.note ? todayAttendance.note + " | " : ""}${clockNotes.trim()}` : todayAttendance.note,
      })
      .eq("id", todayAttendance.id);

    setClockLoading(false);
    if (error) {
      toast.error(t("staff.actions.clockOutFailed"), error.message);
      return;
    }

    setTodayAttendance(prev => prev ? { ...prev, clock_out_time: isoTimestamp } : null);
    setClockNotes("");
    toast.success(t("staff.actions.clockOutSuccessTitle"), t("staff.actions.clockOutSuccessBody", { time: timeStr }));
    if (user) await loadData(user.id);
  };

  // Handle Leave / Sakit
  const handleRecordLeave = async (status: "izin" | "sakit") => {
    if (!user || !profile) return;
    const label = status === "izin" ? t("staff.home.leaveBtn") : t("staff.home.sickBtn");
    const yes = await confirm({
      title: t("staff.actions.leaveConfirmTitle", { type: label }),
      body: t("staff.actions.leaveConfirmBody", { type: label }),
      confirmLabel: t("staff.actions.leaveConfirmBtn", { type: label }),
    });
    if (!yes) return;

    setClockLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("staff_attendances")
      .insert({
        staff_id: user.id,
        branch_id: profile.branch_id ?? "",
        attendance_date: today,
        status: status,
        note: clockNotes.trim() || `Pengajuan ${label}`,
      })
      .select("*")
      .single();

    setClockLoading(false);
    if (error) {
      if (isUniqueViolation(error.message)) {
        return toast.error(t("staff.actions.alreadyClockedInTitle"), t("staff.actions.alreadyClockedInBody"));
      }
      return toast.error(t("staff.actions.recordLeaveFailed", { type: label }), error.message);
    }
    setTodayAttendance(data as unknown as StaffAttendance);
    setClockNotes("");
    toast.success(t("staff.actions.recordLeaveSuccess", { type: label }));
    await loadData(user.id);
  };

  // Handle Save Expense Reimburse
  const handleSaveExpense = async () => {
    if (!profile?.branch_id || !user) return toast.error(t("staff.expenses.branchUndefinedError"));
    if (!expenseForm.description.trim()) return toast.error(t("staff.expenses.descriptionRequired"));
    const amountNum = Number(expenseForm.amount);
    if (!amountNum || amountNum <= 0) return toast.error(t("staff.expenses.invalidAmount"));

    setSavingExpense(true);

    const { data: periodRows } = await supabase
      .from("invoice_periods")
      .select("id")
      .eq("is_open", true)
      .order("date_to", { ascending: true })
      .limit(1);
    const activePeriodId = periodRows?.[0]?.id;
    if (!activePeriodId) {
      setSavingExpense(false);
      return toast.error(t("staff.expenses.periodClosedTitle"), t("staff.expenses.periodClosedBody"));
    }

    let proofUrl = expenseForm.proof_url;
    if (expenseProofFile) {
      try {
        const uploaded = await upload.paymentProof(expenseProofFile, `staff-${user.id}-${Date.now()}`);
        if (uploaded) proofUrl = uploaded;
      } catch (err) {
        toast.error(t("staff.expenses.uploadProofFailed"), err instanceof Error ? err.message : undefined);
        setSavingExpense(false);
        return;
      }
    }

    const invoiceNumber = `RB-${expenseForm.occurred_at.replace(/-/g, "").slice(0, 6)}-${user.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const bankInfo = profile.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null;

    const chosenCategory = expenseForm.category || expenseCategories[0] || "Operasional";

    const { error } = await supabase.from("staff_reimbursements").insert({
      profile_id: user.id,
      branch_id: profile.branch_id,
      period_id: activePeriodId,
      invoice_number: invoiceNumber,
      description: `[${chosenCategory}] ${expenseForm.description.trim()}`,
      amount: amountNum,
      proof_url: proofUrl || null,
      bank_info: bankInfo,
    });

    setSavingExpense(false);
    if (error) {
      toast.error(t("staff.expenses.submitFailed"), error.message);
      return;
    }

    toast.success(t("staff.expenses.submitSuccessTitle"), t("staff.expenses.submitSuccessSub"));
    setShowExpenseModal(false);
    setExpenseForm({
      description: "",
      amount: "",
      category: expenseCategories[0] || "Operasional",
      occurred_at: new Date().toISOString().slice(0, 10),
      proof_url: "",
      notes: "",
    });
    setExpenseProofFile(null);
    await loadData(user.id);
  };

  // Handle Save Profile
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const nowComplete = !!(
      profileForm.phone.trim() && profileForm.gender && profileForm.birth_date &&
      profileForm.bank_name.trim() && profileForm.bank_account.trim() && profileForm.bank_holder.trim()
    );
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileForm.full_name.trim() || profile?.full_name,
        phone: profileForm.phone.trim() || null,
        gender: profileForm.gender || null,
        birth_date: profileForm.birth_date || null,
        bank_name: profileForm.bank_name.trim() || null,
        bank_account: profileForm.bank_account.trim() || null,
        bank_holder: profileForm.bank_holder.trim() || null,
        is_profile_complete: nowComplete,
      })
      .eq("id", user.id);

    setSavingProfile(false);
    if (error) return toast.error(t("staff.profile.saveFailed"), error.message);

    setProfile(prev => prev ? ({
      ...prev,
      full_name: profileForm.full_name.trim() || prev.full_name,
      phone: profileForm.phone.trim() || null,
      gender: profileForm.gender || null,
      birth_date: profileForm.birth_date || null,
      bank_name: profileForm.bank_name.trim() || null,
      bank_account: profileForm.bank_account.trim() || null,
      bank_holder: profileForm.bank_holder.trim() || null,
      is_profile_complete: nowComplete,
    }) : null);

    toast.success(t("staff.profile.saveSuccess"));
  };

  // Payslip Print Preview — uses the unified printPayslip engine identical to Owner and Coach panels
  const handlePrintPayslip = (sal: StaffSalary) => {
    void printPayslip(supabase, sal.id);
  };

  const navItems: NavItem[] = useMemo(() => [
    { id: "home", label: t("staff.nav.home"), short: "Home", icon: "home" },
    { id: "absen", label: t("staff.nav.absen"), short: "Absen", icon: "check" },
    { id: "invoice", label: t("staff.nav.invoice"), short: "Invoice", icon: "invoice" },
    { id: "payslip", label: t("staff.nav.payslip"), short: "Payslip", icon: "wallet" },
    { id: "expenses", label: t("staff.nav.expenses"), short: "Reimburse", icon: "wallet" },
    { id: "profile", label: t("staff.nav.profile"), short: "Profil", icon: "user" },
  ], [t]);

  const mobileNavItems: NavItem[] = useMemo(() => [
    { id: "home", label: t("staff.nav.home"), short: "Home", icon: "home" },
    { id: "absen", label: t("staff.nav.absen"), short: "Absen", icon: "check" },
    { id: "invoice", label: t("staff.nav.invoice"), short: "Invoice", icon: "invoice" },
    { id: "expenses", label: t("staff.nav.expenses"), short: "Reimburse", icon: "wallet" },
    { id: "profile", label: t("staff.nav.profile"), short: "Profil", icon: "user" },
  ], [t]);

  const pageTitles: Record<TabId, [string, string]> = useMemo(() => ({
    home: [t("staff.titles.home.title"), t("staff.titles.home.sub", { name: profile?.full_name ?? "Staff" })],
    absen: [t("staff.titles.absen.title"), t("staff.titles.absen.sub")],
    invoice: [t("staff.titles.invoice.title"), t("staff.titles.invoice.sub")],
    payslip: [t("staff.titles.payslip.title"), t("staff.titles.payslip.sub")],
    expenses: [t("staff.titles.expenses.title"), t("staff.titles.expenses.sub")],
    profile: [t("staff.titles.profile.title"), t("staff.titles.profile.sub")],
  }), [t, profile?.full_name]);

  const [title, sub] = pageTitles[active];

  // Attendances filtered by month
  const filteredAttendances = useMemo(() => {
    return attendances.filter(a => a.attendance_date.startsWith(selectedMonth));
  }, [attendances, selectedMonth]);

  const monthPresentCount = useMemo(() => {
    return filteredAttendances.filter(a => a.status === "present").length;
  }, [filteredAttendances]);

  const latestSalary = salaries[0] ?? null;

  if (profile && !profile.is_profile_complete) {
    return (
      <StaffProfileGate
        profile={profile}
        onComplete={(updated) => {
          setProfile(prev => prev ? ({ ...prev, ...updated }) : prev);
          setProfileForm(prev => ({
            ...prev,
            phone: updated.phone ?? prev.phone,
            gender: updated.gender ?? prev.gender,
            birth_date: updated.birth_date ?? prev.birth_date,
            bank_name: updated.bank_name ?? prev.bank_name,
            bank_account: updated.bank_account ?? prev.bank_account,
            bank_holder: updated.bank_holder ?? prev.bank_holder,
          }));
        }}
        onLogout={async () => { await supabase.auth.signOut(); router.push("/login"); }}
      />
    );
  }

  return (
    <div className="flex bg-paper-tint min-h-screen">
      {showSelfieFlow && (
        <StaffClockInFlow
          onCancel={() => setShowSelfieFlow(false)}
          onConfirm={handleClockIn}
          loading={clockLoading}
        />
      )}
      {/* Sidebar */}
      <Sidebar
        items={navItems}
        active={active}
        onSelect={(id) => { setActive(id as TabId); setMobileNav(false); }}
        brand={
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div className="min-w-0">
              <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">{t("staff.shell.brandTitle")}</div>
              <div className="text-[10px] text-ink-mute tracking-wide truncate">{branch?.name ?? "Next Swimming"}</div>
            </div>
          </div>
        }
        footer={
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint"
          >
            <Icon name="logout" className="w-4 h-4" /> {t("common.actions.logout")}
          </button>
        }
      />

      {/* Mobile Drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={() => setMobileNav(false)} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col z-10 anim-in">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo size={32} />
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-sm text-ocean-700 leading-tight">{t("staff.shell.brandTitle")}</div>
                  <div className="text-[10px] text-ink-mute truncate">{branch?.name ?? "Next Swimming"}</div>
                </div>
              </div>
              <button onClick={() => setMobileNav(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-mute hover:bg-paper-tint">
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(it => (
                <button
                  key={it.id}
                  onClick={() => { setActive(it.id as TabId); setMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                    active === it.id ? "bg-ocean-50 text-ocean-700 font-bold" : "text-ink-soft hover:bg-paper-tint"
                  }`}
                >
                  <Icon name={it.icon ?? ""} className={`w-4 h-4 ${active === it.id ? "text-ocean-600" : "text-ink-mute"}`} />
                  <span>{it.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-line">
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger-600 hover:bg-danger-50 transition"
              >
                <Icon name="logout" className="w-4 h-4" /> {t("common.actions.logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          sub={sub}
          search={t("staff.shell.searchPlaceholder")}
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <LanguageSwitcher />
              {user && <Bell userId={user.id} />}
              <Avatar name={profile?.full_name ?? "Staff"} size={36} />
            </>
          }
        />

        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7 space-y-6">
          {/* TAB 1: HOME */}
          {active === "home" && (
            <div className="space-y-6">
              {/* Presensi Widget Hero Card */}
              <Card className="relative overflow-hidden border-2 border-ocean-200 bg-gradient-to-br from-ocean-50/50 via-white to-sky-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ocean-100 text-ocean-800 text-xs font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-ocean-600 animate-ping" />
                      {t("staff.home.todayPresensiBadge", { date: fmtDateLong(new Date().toISOString().slice(0, 10)) })}
                    </div>
                    <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-ink">
                      {todayAttendance
                        ? todayAttendance.clock_out_time
                          ? t("staff.home.statusDone")
                          : t("staff.home.statusActive")
                        : t("staff.home.statusNotYet")}
                    </h3>
                    <p className="text-sm text-ink-soft max-w-md">
                      {todayAttendance
                        ? todayAttendance.clock_out_time
                          ? t("staff.home.dutySubtextDone", { in: fmtClockTime(todayAttendance.clock_in_time), out: fmtClockTime(todayAttendance.clock_out_time) })
                          : t("staff.home.dutySubtextActive", { in: fmtClockTime(todayAttendance.clock_in_time) })
                        : t("staff.home.dutySubtextNotYet")}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {!todayAttendance ? (
                      <>
                        <Btn
                          variant="primary"
                          size="lg"
                          icon="check"
                          onClick={() => setShowSelfieFlow(true)}
                          disabled={clockLoading}
                          className="shadow-lg shadow-ocean-500/20 py-3.5 px-6 font-bold"
                        >
                          {t("staff.home.clockInBtn")}
                        </Btn>
                        <div className="flex gap-2">
                          <Btn variant="outline" size="sm" onClick={() => handleRecordLeave("sakit")} disabled={clockLoading}>
                            {t("staff.home.sickBtn")}
                          </Btn>
                          <Btn variant="outline" size="sm" onClick={() => handleRecordLeave("izin")} disabled={clockLoading}>
                            {t("staff.home.leaveBtn")}
                          </Btn>
                        </div>
                      </>
                    ) : !todayAttendance.clock_out_time ? (
                      <Btn
                        variant="primary"
                        size="lg"
                        icon="check"
                        onClick={handleClockOut}
                        disabled={clockLoading}
                        className="bg-ok-600 hover:bg-ok-700 shadow-lg shadow-ok-500/20 py-3.5 px-6 font-bold"
                      >
                        {clockLoading ? t("staff.home.clockInProcessing") : t("staff.home.clockOutBtn")}
                      </Btn>
                    ) : (
                      <div className="px-4 py-2.5 rounded-xl bg-ok-100 text-ok-800 font-bold text-sm flex items-center gap-2">
                        <Icon name="check" className="w-5 h-5 text-ok-600" /> {t("staff.home.completedBadge")}
                      </div>
                    )}
                  </div>
                </div>

                {!todayAttendance?.clock_out_time && (
                  <div className="mt-4 pt-4 border-t border-line/60 flex items-center gap-3">
                    <Input
                      value={clockNotes}
                      onChange={e => setClockNotes(e.target.value)}
                      placeholder={t("staff.home.clockNotesPlaceholder")}
                      className="text-xs bg-white"
                    />
                  </div>
                )}
              </Card>

              {/* Quick Summary Grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Card>
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-mute">{t("staff.home.statMonthAttendanceTitle")}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display font-extrabold text-3xl text-ocean-700">{monthPresentCount}</span>
                    <span className="text-xs text-ink-mute">{t("staff.home.daysPresentSuffix")}</span>
                  </div>
                  <button onClick={() => setActive("absen")} className="mt-3 text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
                    {t("staff.home.viewAttendanceHistory")}
                  </button>
                </Card>

                <Card>
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-mute">{t("staff.home.statLatestPayslipTitle")}</div>
                  <div className="mt-2">
                    {latestSalary ? (
                      <div>
                        <div className="font-display font-extrabold text-2xl text-ink">{fmtIDR(latestSalary.total_salary)}</div>
                        <div className="text-xs text-ok-600 font-semibold mt-0.5">{t("staff.home.periodLabel", { period: latestSalary.period_month, status: latestSalary.status.toUpperCase() })}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-ink-mute">{t("staff.home.noPayslipYet")}</div>
                    )}
                  </div>
                  <button onClick={() => setActive("payslip")} className="mt-3 text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
                    {t("staff.home.viewPayslipDetail")}
                  </button>
                </Card>

                <Card>
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-mute">{t("staff.home.statExpensesTitle")}</div>
                  <div className="mt-2">
                    <div className="font-display font-extrabold text-2xl text-ink">{expenses.length}</div>
                    <div className="text-xs text-ink-mute">{t("staff.home.totalClaimsSubmitted")}</div>
                  </div>
                  <button onClick={() => { setActive("expenses"); setShowExpenseModal(true); }} className="mt-3 text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1">
                    {t("staff.home.submitNewExpense")}
                  </button>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: ABSEN */}
          {active === "absen" && (
            <Card className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <SectionTitle sub={t("staff.attendance.sub")}>
                  {t("staff.attendance.title")}
                </SectionTitle>
                <div className="w-48">
                  <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                      <th className="text-left py-3 px-4">{t("staff.attendance.colDate")}</th>
                      <th className="text-left py-3 px-4">{t("staff.attendance.colClockIn")}</th>
                      <th className="text-left py-3 px-4">{t("staff.attendance.colClockOut")}</th>
                      <th className="text-left py-3 px-4">{t("staff.attendance.colStatus")}</th>
                      <th className="text-left py-3 px-4">{t("staff.attendance.colNotes")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredAttendances.map(att => (
                      <tr key={att.id} className="hover:bg-paper-tint">
                        <td className="py-3 px-4 font-semibold text-ink">{fmtDate(att.attendance_date)}</td>
                        <td className="py-3 px-4 font-mono text-ink-soft">{fmtClockTime(att.clock_in_time)}</td>
                        <td className="py-3 px-4 font-mono text-ink-soft">{fmtClockTime(att.clock_out_time)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            att.status === "present" ? "bg-ok-50 text-ok-700" :
                            att.status === "sakit" ? "bg-amber-50 text-amber-700" :
                            att.status === "izin" ? "bg-warn-50 text-warn-700" : "bg-danger-50 text-danger-700"
                          }`}>
                            {att.status === "present" ? t("staff.attendance.statusPresent") :
                             att.status === "sakit" ? t("staff.attendance.statusSick") :
                             att.status === "izin" ? t("staff.attendance.statusLeave") : t("staff.attendance.statusAbsent")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-ink-mute">{att.note ?? "—"}</td>
                      </tr>
                    ))}
                    {filteredAttendances.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-ink-mute">
                          {t("staff.attendance.empty", { month: selectedMonth })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden space-y-3">
                {filteredAttendances.map(att => (
                  <div key={att.id} className="p-3.5 rounded-xl border border-line bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink">{fmtDate(att.attendance_date)}</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        att.status === "present" ? "bg-ok-50 text-ok-700" :
                        att.status === "sakit" ? "bg-amber-50 text-amber-700" :
                        att.status === "izin" ? "bg-warn-50 text-warn-700" : "bg-danger-50 text-danger-700"
                      }`}>
                        {att.status === "present" ? t("staff.attendance.statusPresent") :
                         att.status === "sakit" ? t("staff.attendance.statusSick") :
                         att.status === "izin" ? t("staff.attendance.statusLeave") : t("staff.attendance.statusAbsent")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-soft font-mono bg-paper-tint px-3 py-2 rounded-lg">
                      <div>Masuk: <span className="font-bold text-ink">{fmtClockTime(att.clock_in_time)}</span></div>
                      <div>Pulang: <span className="font-bold text-ink">{fmtClockTime(att.clock_out_time)}</span></div>
                    </div>
                    {att.note && <p className="text-xs text-ink-mute italic">{att.note}</p>}
                  </div>
                ))}
                {filteredAttendances.length === 0 && (
                  <div className="py-8 text-center text-xs text-ink-mute">
                    {t("staff.attendance.empty", { month: selectedMonth })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {active === "invoice" && (
            <StaffInvoice staffId={user?.id ?? ""} branchId={profile?.branch_id ?? ""} profile={profile} />
          )}

          {/* TAB 3: PAYSLIP */}
          {active === "payslip" && (
            <Card className="space-y-4">
              <SectionTitle sub={t("staff.payslip.sub")}>
                {t("staff.payslip.title")}
              </SectionTitle>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                      <th className="text-left py-3 px-4">{t("staff.payslip.colPeriod")}</th>
                      <th className="text-right py-3 px-4">{t("staff.payslip.colBaseSalary")}</th>
                      <th className="text-right py-3 px-4">{t("staff.payslip.colAllowances")}</th>
                      <th className="text-right py-3 px-4">{t("staff.payslip.colReimburse")}</th>
                      <th className="text-right py-3 px-4">{t("staff.payslip.colDeductions")}</th>
                      <th className="text-right py-3 px-4">{t("staff.payslip.colTotalSalary")}</th>
                      <th className="text-center py-3 px-4">{t("staff.payslip.colStatus")}</th>
                      <th className="text-right py-3 px-4">{t("staff.payslip.colAction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {salaries.map(sal => (
                      <tr key={sal.id} className="hover:bg-paper-tint">
                        <td className="py-3.5 px-4 font-bold text-ink">{sal.period_month}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-ink-soft">{fmtIDR(sal.base_salary)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-ok-600">{sal.allowances > 0 ? `+${fmtIDR(sal.allowances)}` : "—"}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-ok-600">{sal.reimburse_amount > 0 ? `+${fmtIDR(sal.reimburse_amount)}` : "—"}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-danger-600">{sal.deductions > 0 ? `-${fmtIDR(sal.deductions)}` : "—"}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-ocean-700">{fmtIDR(sal.total_salary)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            sal.status === "paid" ? "bg-ok-50 text-ok-700" :
                            sal.status === "approved" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"
                          }`}>
                            {sal.status === "paid" ? t("staff.payslip.statusPaid") :
                             sal.status === "approved" ? t("staff.payslip.statusApproved") : t("staff.payslip.statusDraft")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Btn variant="outline" size="sm" icon="print" onClick={() => handlePrintPayslip(sal)}>
                            {t("staff.payslip.printBtn")}
                          </Btn>
                        </td>
                      </tr>
                    ))}
                    {salaries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-ink-mute">
                          {t("staff.payslip.empty")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden space-y-3">
                {salaries.map(sal => (
                  <div key={sal.id} className="p-4 rounded-xl border border-line bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-base text-ink">{sal.period_month}</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        sal.status === "paid" ? "bg-ok-50 text-ok-700" :
                        sal.status === "approved" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"
                      }`}>
                        {sal.status === "paid" ? t("staff.payslip.statusPaid") :
                         sal.status === "approved" ? t("staff.payslip.statusApproved") : t("staff.payslip.statusDraft")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-paper-tint p-3 rounded-xl">
                      <div>
                        <div className="text-ink-mute">Gaji Pokok</div>
                        <div className="font-mono font-semibold text-ink mt-0.5">{fmtIDR(sal.base_salary)}</div>
                      </div>
                      <div>
                        <div className="text-ink-mute">Tunjangan</div>
                        <div className="font-mono font-semibold text-ok-600 mt-0.5">{sal.allowances > 0 ? `+${fmtIDR(sal.allowances)}` : "Rp 0"}</div>
                      </div>
                      {sal.reimburse_amount > 0 && (
                        <div>
                          <div className="text-ink-mute">Reimburse</div>
                          <div className="font-mono font-semibold text-ok-600 mt-0.5">+{fmtIDR(sal.reimburse_amount)}</div>
                        </div>
                      )}
                      {sal.deductions > 0 && (
                        <div>
                          <div className="text-ink-mute">Potongan</div>
                          <div className="font-mono font-semibold text-danger-600 mt-0.5">-{fmtIDR(sal.deductions)}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-line/60">
                      <div>
                        <div className="text-[11px] text-ink-mute uppercase tracking-wide">Total Diterima</div>
                        <div className="font-mono font-extrabold text-base text-ocean-700">{fmtIDR(sal.total_salary)}</div>
                      </div>
                      <Btn variant="outline" size="sm" icon="print" onClick={() => handlePrintPayslip(sal)}>
                        {t("staff.payslip.printBtn")}
                      </Btn>
                    </div>
                  </div>
                ))}
                {salaries.length === 0 && (
                  <div className="py-8 text-center text-xs text-ink-mute">
                    {t("staff.payslip.empty")}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* TAB 4: EXPENSES / REIMBURSE */}
          {active === "expenses" && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <SectionTitle sub={t("staff.expenses.sub")}>
                  {t("staff.expenses.title")}
                </SectionTitle>
                <Btn variant="primary" icon="plus" size="sm" onClick={() => setShowExpenseModal(true)}>
                  {t("staff.expenses.submitNewBtn")}
                </Btn>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                      <th className="text-left py-3 px-4">{t("staff.expenses.colSubmitDate")}</th>
                      <th className="text-left py-3 px-4">{t("staff.expenses.colDescription")}</th>
                      <th className="text-right py-3 px-4">{t("staff.expenses.colAmount")}</th>
                      <th className="text-center py-3 px-4">{t("staff.expenses.colProof")}</th>
                      <th className="text-center py-3 px-4">{t("staff.expenses.colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-paper-tint">
                        <td className="py-3.5 px-4 text-ink-soft">{fmtDate(exp.submitted_at)}</td>
                        <td className="py-3.5 px-4 font-semibold text-ink max-w-xs truncate">{exp.description}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-ink">{fmtIDR(exp.amount)}</td>
                        <td className="py-3.5 px-4 text-center">
                          {exp.proof_url ? (
                            <a
                              href={exp.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-ocean-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Icon name="link" className="w-3.5 h-3.5" /> {t("staff.expenses.viewProof")}
                            </a>
                          ) : (
                            <span className="text-xs text-ink-mute">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Status kind={exp.status === "paid" ? "paid" : exp.status === "approved" ? "approved" : exp.status === "rejected" ? "rejected" : exp.status === "cancelled" ? "inactive" : "pending"}>
                            {exp.status === "paid" ? t("staff.expenses.statusPaid") :
                             exp.status === "approved" ? t("staff.expenses.statusApproved") :
                             exp.status === "rejected" ? t("staff.expenses.statusRejected") :
                             exp.status === "cancelled" ? t("staff.expenses.statusCancelled") : t("staff.expenses.statusPending")}
                          </Status>
                          {exp.status === "rejected" && exp.rejection_reason && (
                            <div className="text-[10px] text-danger-500 mt-0.5">{exp.rejection_reason}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-ink-mute">
                          {t("staff.expenses.empty")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden space-y-3">
                {expenses.map(exp => (
                  <div key={exp.id} className="p-3.5 rounded-xl border border-line bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-ink-mute">{fmtDate(exp.submitted_at)}</div>
                        <div className="font-bold text-sm text-ink line-clamp-2 mt-0.5">{exp.description}</div>
                      </div>
                      <Status kind={exp.status === "paid" ? "paid" : exp.status === "approved" ? "approved" : exp.status === "rejected" ? "rejected" : exp.status === "cancelled" ? "inactive" : "pending"}>
                        {exp.status === "paid" ? t("staff.expenses.statusPaid") :
                         exp.status === "approved" ? t("staff.expenses.statusApproved") :
                         exp.status === "rejected" ? t("staff.expenses.statusRejected") :
                         exp.status === "cancelled" ? t("staff.expenses.statusCancelled") : t("staff.expenses.statusPending")}
                      </Status>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-line/60">
                      <span className="text-xs text-ink-mute">Nominal</span>
                      <span className="font-mono font-bold text-sm text-ink">{fmtIDR(exp.amount)}</span>
                    </div>

                    {exp.proof_url && (
                      <div className="pt-0.5">
                        <a
                          href={exp.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Icon name="link" className="w-3.5 h-3.5" /> {t("staff.expenses.viewProof")}
                        </a>
                      </div>
                    )}

                    {exp.status === "rejected" && exp.rejection_reason && (
                      <div className="text-xs text-danger-600 bg-danger-50 p-2 rounded-lg">
                        <span className="font-bold">Alasan ditolak:</span> {exp.rejection_reason}
                      </div>
                    )}
                  </div>
                ))}
                {expenses.length === 0 && (
                  <div className="py-8 text-center text-xs text-ink-mute">
                    {t("staff.expenses.empty")}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* TAB 5: PROFILE */}
          {active === "profile" && (
            <div className="max-w-2xl space-y-5">
              {profile?.qr_code && (
                <Card>
                  <div className="flex items-center gap-4">
                    <QRBox value={profile.qr_code} size={80} downloadable />
                    <div>
                      <div className="font-display font-bold text-base text-ink">{profile.full_name}</div>
                      <div className="text-xs text-ink-mute mt-0.5">{t("staff.profile.idCardSubtitle")}</div>
                      <div className="text-[10px] font-mono text-ink-faint mt-1 break-all">{profile.qr_code}</div>
                    </div>
                  </div>
                </Card>
              )}
              <Card className="space-y-4">
                <SectionTitle sub={t("staff.profile.sub")}>
                  {t("staff.profile.title")}
                </SectionTitle>

                <div className="space-y-3">
                  <Field label={t("staff.profile.fieldFullName")} required>
                    <Input
                      value={profileForm.full_name}
                      onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                    />
                  </Field>

                  <Field label={t("staff.profile.fieldPhone")}>
                    <Input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={t("staff.profile.fieldPhonePlaceholder")}
                      className="font-mono"
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label={t("staff.profile.fieldGender")}>
                      <Select value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                        <option value="">{t("staff.profile.selectEllipsis")}</option>
                        <option value="male">{t("staff.profile.genderMale")}</option>
                        <option value="female">{t("staff.profile.genderFemale")}</option>
                      </Select>
                    </Field>
                    <Field label={t("staff.profile.fieldBirthDate")}>
                      <DatePicker value={profileForm.birth_date} onChange={v => setProfileForm(f => ({ ...f, birth_date: v }))} />
                    </Field>
                  </div>

                  <div className="pt-4 border-t border-line space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
                      {t("staff.profile.bankSectionTitle")}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <Field label={t("staff.profile.fieldBankName")}>
                        <Input
                          value={profileForm.bank_name}
                          onChange={e => setProfileForm(f => ({ ...f, bank_name: e.target.value }))}
                          placeholder={t("staff.profile.fieldBankNamePlaceholder")}
                        />
                      </Field>
                      <Field label={t("staff.profile.fieldBankAccount")}>
                        <Input
                          value={profileForm.bank_account}
                          onChange={e => setProfileForm(f => ({ ...f, bank_account: e.target.value }))}
                          placeholder={t("staff.profile.fieldBankAccountPlaceholder")}
                          className="font-mono"
                        />
                      </Field>
                      <Field label={t("staff.profile.fieldBankHolder")}>
                        <Input
                          value={profileForm.bank_holder}
                          onChange={e => setProfileForm(f => ({ ...f, bank_holder: e.target.value }))}
                          placeholder={t("staff.profile.fieldBankHolderPlaceholder")}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Btn variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? t("staff.profile.savingBtn") : t("staff.profile.saveBtn")}
                  </Btn>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modal Ajukan Reimburse */}
      <Modal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={t("staff.expenses.modalTitle")}
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowExpenseModal(false)}>{t("staff.expenses.cancelBtn")}</Btn>
            <Btn variant="primary" onClick={handleSaveExpense} disabled={savingExpense || uploading}>
              {savingExpense || uploading ? t("staff.expenses.savingBtn") : t("staff.expenses.submitBtn")}
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("staff.expenses.fieldDescription")} required>
            <Input
              value={expenseForm.description}
              onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t("staff.expenses.fieldDescriptionPlaceholder")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("staff.expenses.fieldAmount")} required>
              <Input
                type="number"
                value={expenseForm.amount}
                onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="50000"
                className="font-mono"
              />
            </Field>
            <Field label={t("staff.expenses.fieldDate")}>
              <Input
                type="date"
                value={expenseForm.occurred_at}
                onChange={e => setExpenseForm(f => ({ ...f, occurred_at: e.target.value }))}
              />
            </Field>
          </div>
          <Field label={t("staff.expenses.fieldCategory")}>
            <Select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("staff.expenses.fieldProof")} hint={t("staff.expenses.fieldProofHint")}>
            <input
              type="file"
              accept="image/*"
              onChange={e => setExpenseProofFile(e.target.files?.[0] ?? null)}
              className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer"
            />
          </Field>
        </div>
      </Modal>

      <MobileNav items={mobileNavItems} active={active} onSelect={(id) => setActive(id as TabId)} />

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="staff" />}
    </div>
  );
}
