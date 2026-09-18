"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { printPayslip } from "@/lib/printPayslip";
import { isUniqueViolation, staffStatusKind, uiToStaffDb, isStaffPresentLike, type StaffDbStatus } from "@/lib/attendance";
import type { User } from "@supabase/supabase-js";
import type { BranchInfo, ExpenseRow, StaffAttendance, StaffLeaveRequest, StaffProfile, StaffSalary, TabId } from "../_types";
import { useStaffExpense } from "./useStaffExpense";

export function useStaffData() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const supabase = createClient();
  const { upload } = useUpload();

  const [active, setActive] = useState<TabId>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [branch, setBranch] = useState<BranchInfo | null>(null);

  // Data states
  const [todayAttendance, setTodayAttendance] = useState<StaffAttendance | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([]);
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

  const loadLeaveRequests = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("staff_leaves")
      .select("id, type, date_from, date_to, reason, status, reject_reason, created_at")
      .eq("staff_id", userId)
      .order("created_at", { ascending: false });
    setLeaveRequests((data as unknown as StaffLeaveRequest[]) ?? []);
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

    // 5. This staff's own leave requests (pending/approved/rejected)
    await loadLeaveRequests(userId);
  }, [supabase, loadLeaveRequests]);

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

    let selfieUrl: string;
    try {
      selfieUrl = await upload.staffSelfie(photoFile, today);
    } catch {
      setClockLoading(false);
      toast.error("Selfie upload failed", "Attendance was not saved — please try again");
      return;
    }

    const { data, error } = await supabase
      .from("staff_attendances")
      .insert({
        staff_id: user.id,
        branch_id: profile.branch_id ?? "",
        attendance_date: today,
        clock_in_time: isoTimestamp,
        status: uiToStaffDb("present"),
        note: clockNotes.trim() || null,
        selfie_url: selfieUrl,
      })
      .select("*")
      .single();

    setClockLoading(false);
    if (error) {
      if (isUniqueViolation(error.message)) {
        toast.error("Already clocked in", "Today's attendance is already recorded.");
        return;
      }
      toast.error("Failed to clock in", error.message);
      return;
    }

    setTodayAttendance(data as unknown as StaffAttendance);
    setClockNotes("");
    setShowSelfieFlow(false);
    toast.success("Clock-In Successful!", `Recorded at ${timeStr}`);
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
      toast.error("Failed to clock out", error.message);
      return;
    }

    setTodayAttendance(prev => prev ? { ...prev, clock_out_time: isoTimestamp } : null);
    setClockNotes("");
    toast.success("Clock-Out Successful!", `Recorded at ${timeStr}. Have a good rest!`);
    if (user) await loadData(user.id);
  };

  // Handle Leave / Sakit
  const handleRecordLeave = async (status: "izin" | "sakit") => {
    if (!user || !profile) return;
    const label = status === "izin" ? "Leave" : "Sick";
    const yes = await confirm({
      title: `Request Leave: ${label}`,
      body: `Submit a ${label} request for today? Your owner will review it before it's recorded.`,
      confirmLabel: "Yes, Submit Request",
    });
    if (!yes) return;

    setClockLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("staff_leaves")
      .insert({
        staff_id: user.id,
        branch_id: profile.branch_id ?? null,
        type: status,
        date_from: today,
        date_to: today,
        reason: clockNotes.trim() || null,
        status: "pending",
      });

    setClockLoading(false);
    if (error) {
      return toast.error(`Failed to submit ${label} request`, error.message);
    }
    setClockNotes("");
    toast.success(`${label} request submitted for approval`);
    await loadLeaveRequests(user.id);
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
    if (error) return toast.error("Failed to save profile", error.message);

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

    toast.success("Profile & bank account updated successfully");
  };

  // Payslip Print Preview — uses the unified printPayslip engine identical to Owner and Coach panels
  const handlePrintPayslip = (sal: StaffSalary) => {
    void printPayslip(supabase, sal.id);
  };

  const pageTitles: Record<TabId, [string, string]> = useMemo(() => ({
    home: ["Staff Home", `Welcome, ${profile?.full_name ?? "Staff"}!`],
    absen: ["Daily Attendance", "Record and review your attendance history."],
    invoice: ["Invoice", "Submit your own salary invoice — from attendance or manual entry."],
    payslip: ["Payslip", "Monthly payslip history issued by management."],
    expenses: ["Reimbursement Claims", "Submit operational expenses with receipt proofs."],
    profile: ["Profile & Bank Account", "Account information and bank details for salary transfer."],
  }), [profile?.full_name]);

  // Attendances filtered by month
  const filteredAttendances = useMemo(() => {
    return attendances.filter(a => a.attendance_date.startsWith(selectedMonth));
  }, [attendances, selectedMonth]);

  const monthPresentCount = useMemo(() => {
    return filteredAttendances.filter(a => isStaffPresentLike(a.status)).length;
  }, [filteredAttendances]);

  const staffStatusBadge = (status: StaffDbStatus) => {
    const kind = staffStatusKind(status);
    const className = kind === "present" ? "bg-ok-50 text-ok-700" : kind === "sick" ? "bg-amber-50 text-amber-700" : kind === "excused" ? "bg-warn-50 text-warn-700" : "bg-danger-50 text-danger-700";
    const label = kind === "present" ? "Present" : kind === "sick" ? "Sick" : kind === "excused" ? "Leave" : "Absent";
    return { className, label };
  };

  const latestSalary = salaries[0] ?? null;

  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const expense = useStaffExpense({ user, profile, onSaved: () => user && loadData(user.id) });

  return {
    supabase,
    active, setActive, mobileNav, setMobileNav,
    user, profile, setProfile, branch,
    todayAttendance, leaveRequests, attendances, salaries, expenses,
    selectedMonth, setSelectedMonth,
    clockNotes, setClockNotes, clockLoading, showSelfieFlow, setShowSelfieFlow,
    profileForm, setProfileForm, savingProfile,
    handleClockIn, handleClockOut, handleRecordLeave, handleSaveProfile, handlePrintPayslip,
    pageTitles, filteredAttendances, monthPresentCount, staffStatusBadge, latestSalary,
    logout,
    ...expense,
  };
}
