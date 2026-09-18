"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { logActivity } from "@/lib/activityLog";
import type { ClassRow, ClassPackage } from "../../_types";
import type { StudentRow } from "./_types";

export function useStudentActionsData({
  branchId, detail, setDetail, classes, load,
}: {
  branchId: string;
  detail: StudentRow | null;
  setDetail: React.Dispatch<React.SetStateAction<StudentRow | null>>;
  classes: ClassRow[];
  load: () => Promise<void>;
}) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [suspendStudentTarget, setSuspendStudentTarget] = useState<StudentRow | null>(null);
  const [suspendStudentForm, setSuspendStudentForm] = useState({ reason: "", until: "" });
  const [suspendingStudent, setSuspendingStudent] = useState(false);
  const [openResetPwd, setOpenResetPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [openAddSesi, setOpenAddSesi] = useState(false);
  const [addSesiForm, setAddSesiForm] = useState({ jumlah: "", generate_bill: false, selectedPackageId: "" });
  const [savingAddSesi, setSavingAddSesi] = useState(false);
  const [privateClassPackages, setPrivateClassPackages] = useState<ClassPackage[]>([]);

  const doSuspendStudent = async () => {
    if (!suspendStudentTarget || !suspendStudentForm.reason || !suspendStudentForm.until) return toast.error("Reason and end date are required");
    setSuspendingStudent(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("students")
      .update({ status: "suspended", suspend_until: suspendStudentForm.until, suspend_reason: suspendStudentForm.reason })
      .eq("id", suspendStudentTarget.id);
    setSuspendingStudent(false);
    if (error) return toast.error("Failed to suspend student", error.message);
    toast.success(`${suspendStudentTarget.profile?.full_name ?? "Student"} suspended`);
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "students", entityId: suspendStudentTarget.id, entityLabel: suspendStudentTarget.profile?.full_name ?? undefined, action: "suspend", label: `Student ${suspendStudentTarget.profile?.full_name ?? suspendStudentTarget.id} suspended until ${suspendStudentForm.until}`, meta: { reason: suspendStudentForm.reason, until: suspendStudentForm.until } });
    setSuspendStudentTarget(null);
    setDetail(null);
    load();
  };

  const deleteStudent = async (m: StudentRow) => {
    const ok = await confirm({ body: `Permanently delete student account ${m.profile?.full_name ?? ""}? All data including attendance and bills will be deleted too.`, danger: true, confirmLabel: "Delete Permanently" });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${m.profile_id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json() as { error?: string };
      return toast.error("Failed to delete student", j.error);
    }
    toast.success("Student account permanently deleted");
    setDetail(null);
    load();
  };

  const liftSuspendStudent = async (m: StudentRow) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("students")
      .update({ status: "active", suspend_until: null, suspend_reason: null })
      .eq("id", m.id);
    if (error) return toast.error("Failed to end suspend", error.message);
    toast.success("Suspend ended");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "students", entityId: m.id, entityLabel: m.profile?.full_name ?? undefined, action: "unsuspend", label: `Suspend for student ${m.profile?.full_name ?? m.id} ended` });
    setDetail(null);
    load();
  };

  const resetPassword = async () => {
    if (!detail) return;
    if (!newPwd || newPwd.length < 6) return toast.error("Password must be at least 6 characters");
    const res = await fetch(`/api/admin/users/${detail.profile_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) { toast.success("Password reset"); setOpenResetPwd(false); setNewPwd(""); setShowNewPwd(false); }
    else toast.error("Failed to reset password");
  };

  const doAddSesi = async () => {
    if (!detail) return;
    const jumlah = Number(addSesiForm.jumlah);
    if (!jumlah || jumlah < 1) return toast.error("Invalid session count");
    setSavingAddSesi(true);
    const db = createClient();
    const newTotal = (detail.total_sessions ?? 0) + jumlah;
    const newRemaining = (detail.remaining_sessions ?? 0) + jumlah;
    const { error } = await db.from("students")
      .update({ total_sessions: newTotal, remaining_sessions: newRemaining })
      .eq("id", detail.id);
    if (error) { setSavingAddSesi(false); return toast.error("Failed to add session", error.message); }

    if (addSesiForm.generate_bill) {
      const selectedPkg = privateClassPackages.find(p => p.id === addSesiForm.selectedPackageId);
      if (selectedPkg) {
        // Use package price
        await db.from("bills").insert({
          student_id: detail.id, branch_id: branchId,
          class_id: detail.student_classes?.[0]?.class?.id ?? null,
          period_label: selectedPkg.name,
          type: "session_pack" as "monthly",
          sessions_total: selectedPkg.sessions,
          sessions_used: 0,
          amount: selectedPkg.price,
          discount: 0,
          total: selectedPkg.price,
          status: "unpaid",
        });
      } else {
        // Fallback: use price_per_session
        const cls = detail.student_classes?.[0]?.class;
        const classRow = cls ? classes.find(c => c.id === cls.id) : null;
        const pricePerSession = classRow?.price_per_session ?? 0;
        if (pricePerSession > 0) {
          await db.from("bills").insert({
            student_id: detail.id, branch_id: branchId,
            period_label: `Add ${jumlah} sessions`,
            type: "session_pack" as "monthly",
            amount: pricePerSession * jumlah,
            discount: 0,
            total: pricePerSession * jumlah,
            status: "unpaid",
          });
        }
      }
    }

    setSavingAddSesi(false);
    toast.success(`${jumlah} sessions added`);
    setOpenAddSesi(false);
    setAddSesiForm({ jumlah: "", generate_bill: false, selectedPackageId: "" });
    // Refresh detail
    const { data } = await db.from("students")
      .select("id, profile_id, type, status, date_start, qr_code, school_id, school_grade, remaining_sessions, total_sessions, suspend_until, suspend_reason, profile:profiles(full_name, birth_date, phone, gender, address, health_notes, email, avatar_url), student_classes(class:classes(id, name))")
      .eq("id", detail.id).single();
    if (data) setDetail(data as unknown as StudentRow);
    load();
  };

  return {
    suspendStudentTarget, setSuspendStudentTarget, suspendStudentForm, setSuspendStudentForm, suspendingStudent, doSuspendStudent,
    openResetPwd, setOpenResetPwd, newPwd, setNewPwd, showNewPwd, setShowNewPwd, resetPassword,
    openAddSesi, setOpenAddSesi, addSesiForm, setAddSesiForm, savingAddSesi, privateClassPackages, setPrivateClassPackages, doAddSesi,
    deleteStudent, liftSuspendStudent,
  };
}
