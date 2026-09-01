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
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR, fmtDate, fmtDateLong } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import type { User } from "@supabase/supabase-js";

type TabId = "home" | "absen" | "payslip" | "expenses" | "profile";

interface StaffProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  branch_id?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  avatar_url?: string | null;
  qr_code?: string | null;
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

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
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

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
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

    // 3. Payslips
    const { data: salaryData } = await supabase
      .from("staff_salaries")
      .select("*")
      .eq("staff_id", userId)
      .order("period_month", { ascending: false });
    setSalaries((salaryData as unknown as StaffSalary[]) ?? []);

    // 4. Reimbursements submitted by this staff
    const { data: expData } = await supabase
      .from("staff_reimbursements")
      .select("*")
      .eq("profile_id", userId)
      .order("submitted_at", { ascending: false });
    setExpenses((expData as unknown as ExpenseRow[]) ?? []);
  }, [supabase]);

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
        .select("id, full_name, email, phone, branch_id, bank_name, bank_account, bank_holder, avatar_url, qr_code")
        .eq("id", authUser.id)
        .single();

      if (prof) {
        const staffProf: StaffProfile = {
          id: prof.id,
          full_name: prof.full_name ?? authUser.user_metadata?.full_name ?? "Staff",
          email: prof.email ?? authUser.email,
          phone: prof.phone,
          branch_id: prof.branch_id,
          bank_name: prof.bank_name,
          bank_account: prof.bank_account,
          bank_holder: prof.bank_holder,
          avatar_url: prof.avatar_url,
          qr_code: (prof as unknown as { qr_code?: string | null }).qr_code ?? null,
        };
        setProfile(staffProf);
        setProfileForm({
          full_name: staffProf.full_name,
          phone: staffProf.phone ?? "",
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
  const handleClockIn = async () => {
    if (!user || !profile) return;
    setClockLoading(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const today = now.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("staff_attendances")
      .insert({
        staff_id: user.id,
        branch_id: profile.branch_id ?? "",
        attendance_date: today,
        clock_in_time: timeStr,
        status: "present",
        note: clockNotes.trim() || null,
      })
      .select("*")
      .single();

    setClockLoading(false);
    if (error) {
      toast.error(t("staff.actions.clockInFailed"), error.message);
      return;
    }

    setTodayAttendance(data as unknown as StaffAttendance);
    setClockNotes("");
    toast.success(t("staff.actions.clockInSuccessTitle"), t("staff.actions.clockInSuccessBody", { time: timeStr }));
    await loadData(user.id);
  };

  // Handle Clock-Out
  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setClockLoading(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const { error } = await supabase
      .from("staff_attendances")
      .update({
        clock_out_time: timeStr,
        note: clockNotes.trim() ? `${todayAttendance.note ? todayAttendance.note + " | " : ""}${clockNotes.trim()}` : todayAttendance.note,
      })
      .eq("id", todayAttendance.id);

    setClockLoading(false);
    if (error) {
      toast.error(t("staff.actions.clockOutFailed"), error.message);
      return;
    }

    setTodayAttendance(prev => prev ? { ...prev, clock_out_time: timeStr } : null);
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
    if (error) return toast.error(t("staff.actions.recordLeaveFailed", { type: label }), error.message);
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

    const { error } = await supabase.from("staff_reimbursements").insert({
      profile_id: user.id,
      branch_id: profile.branch_id,
      period_id: activePeriodId,
      invoice_number: invoiceNumber,
      description: `[${expenseForm.category || "Operasional"}] ${expenseForm.description.trim()}`,
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
      category: "Operasional",
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
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileForm.full_name.trim() || profile?.full_name,
        phone: profileForm.phone.trim() || null,
        bank_name: profileForm.bank_name.trim() || null,
        bank_account: profileForm.bank_account.trim() || null,
        bank_holder: profileForm.bank_holder.trim() || null,
      })
      .eq("id", user.id);

    setSavingProfile(false);
    if (error) return toast.error(t("staff.profile.saveFailed"), error.message);

    setProfile(prev => prev ? ({
      ...prev,
      full_name: profileForm.full_name.trim() || prev.full_name,
      phone: profileForm.phone.trim() || null,
      bank_name: profileForm.bank_name.trim() || null,
      bank_account: profileForm.bank_account.trim() || null,
      bank_holder: profileForm.bank_holder.trim() || null,
    }) : null);

    toast.success(t("staff.profile.saveSuccess"));
  };

  // Payslip Print Preview
  const handlePrintPayslip = (sal: StaffSalary) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t("staff.payslip.printDocTitle", { name: profile?.full_name ?? "Staff", period: sal.period_month })}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 22px; font-weight: bold; color: #0369a1; text-transform: uppercase; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .info-table, .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .info-table td { padding: 6px 0; font-size: 14px; }
          .info-table td.label { width: 160px; color: #64748b; font-weight: 600; }
          .data-table th, .data-table td { padding: 10px 14px; text-align: left; font-size: 14px; border: 1px solid #e2e8f0; }
          .data-table th { background: #f8fafc; font-weight: 700; color: #334155; }
          .total-row td { font-weight: bold; font-size: 16px; background: #f0fdf4; color: #15803d; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { margin-top: 60px; border-top: 1px solid #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${t("staff.payslip.printHeaderTitle")}</div>
          <div class="subtitle">${t("staff.payslip.printHeaderSub", { branch: branch?.name ?? "" })}</div>
        </div>
        <table class="info-table">
          <tr><td class="label">${t("staff.payslip.printStaffName")}</td><td><strong>${profile?.full_name ?? "-"}</strong></td><td class="label">${t("staff.payslip.printPeriod")}</td><td><strong>${sal.period_month}</strong></td></tr>
          <tr><td class="label">${t("staff.payslip.printCenter")}</td><td>${branch?.name ?? "-"}</td><td class="label">${t("staff.payslip.printStatus")}</td><td><strong style="color: #16a34a;">${sal.status.toUpperCase()}</strong></td></tr>
          <tr><td class="label">${t("staff.payslip.printBankAccount")}</td><td colspan="3">${profile?.bank_name ?? "-"} ${profile?.bank_account ?? ""} a/n ${profile?.bank_holder ?? ""}</td></tr>
        </table>
        <table class="data-table">
          <thead>
            <tr><th>${t("staff.payslip.printComponentHeader")}</th><th style="text-align: right;">${t("staff.payslip.printAmountHeader")}</th></tr>
          </thead>
          <tbody>
            <tr><td>${t("staff.payslip.printBaseSalary")}</td><td style="text-align: right;">${fmtIDR(sal.base_salary)}</td></tr>
            ${sal.allowances > 0 ? `<tr><td>${t("staff.payslip.printAllowances")}</td><td style="text-align: right; color: #16a34a;">+ ${fmtIDR(sal.allowances)}</td></tr>` : ""}
            ${sal.reimburse_amount > 0 ? `<tr><td>${t("staff.payslip.printReimburse")}</td><td style="text-align: right; color: #16a34a;">+ ${fmtIDR(sal.reimburse_amount)}</td></tr>` : ""}
            ${sal.deductions > 0 ? `<tr><td>${t("staff.payslip.printDeductions")}</td><td style="text-align: right; color: #dc2626;">- ${fmtIDR(sal.deductions)}</td></tr>` : ""}
            <tr class="total-row"><td>${t("staff.payslip.printTotalTakeHomePay")}</td><td style="text-align: right;">${fmtIDR(sal.total_salary)}</td></tr>
          </tbody>
        </table>
        ${sal.notes ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 20px;"><em>${t("staff.payslip.printNotePrefix", { note: sal.notes })}</em></div>` : ""}
        <div class="footer">
          <div class="signature-box">${t("staff.payslip.printReceiverLabel")}<div class="signature-line">${profile?.full_name ?? "Staff"}</div></div>
          <div class="signature-box">${t("staff.payslip.printManagementLabel")}<div class="signature-line">Next Swimming School</div></div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const navItems: NavItem[] = useMemo(() => [
    { id: "home", label: t("staff.nav.home"), icon: "home" },
    { id: "absen", label: t("staff.nav.absen"), icon: "check" },
    { id: "payslip", label: t("staff.nav.payslip"), icon: "wallet" },
    { id: "expenses", label: t("staff.nav.expenses"), icon: "invoice" },
    { id: "profile", label: t("staff.nav.profile"), icon: "user" },
  ], [t]);

  const pageTitles: Record<TabId, [string, string]> = useMemo(() => ({
    home: [t("staff.titles.home.title"), t("staff.titles.home.sub", { name: profile?.full_name ?? "Staff" })],
    absen: [t("staff.titles.absen.title"), t("staff.titles.absen.sub")],
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

  return (
    <div className="flex bg-paper-tint min-h-screen">
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
                          ? t("staff.home.dutySubtextDone", { in: todayAttendance.clock_in_time ?? "-", out: todayAttendance.clock_out_time })
                          : t("staff.home.dutySubtextActive", { in: todayAttendance.clock_in_time ?? "-" })
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
                          onClick={handleClockIn}
                          disabled={clockLoading}
                          className="shadow-lg shadow-ocean-500/20 py-3.5 px-6 font-bold"
                        >
                          {clockLoading ? t("staff.home.clockInProcessing") : t("staff.home.clockInBtn")}
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

              <div className="overflow-x-auto">
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
                        <td className="py-3 px-4 font-mono text-ink-soft">{att.clock_in_time ?? "—"}</td>
                        <td className="py-3 px-4 font-mono text-ink-soft">{att.clock_out_time ?? "—"}</td>
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
            </Card>
          )}

          {/* TAB 3: PAYSLIP */}
          {active === "payslip" && (
            <Card className="space-y-4">
              <SectionTitle sub={t("staff.payslip.sub")}>
                {t("staff.payslip.title")}
              </SectionTitle>

              <div className="overflow-x-auto">
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

              <div className="overflow-x-auto">
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
              <option value="Operasional">{t("staff.expenses.catOperational")}</option>
              <option value="Perlengkapan">{t("staff.expenses.catEquipment")}</option>
              <option value="Konsumsi">{t("staff.expenses.catConsumption")}</option>
              <option value="Lainnya">{t("staff.expenses.catOther")}</option>
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

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="staff" />}
    </div>
  );
}
