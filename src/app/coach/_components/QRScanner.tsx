"use client";
import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";
import {
  minutesAfterStart,
  classifyStudentScan,
  STUDENT_ATTENDANCE_CONFLICT,
} from "@/lib/attendance";
import type { ClassRow } from "../_types";

export default function QRScanner({ coachId, classes, onClose }: {
  coachId: string;
  classes: ClassRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const supabase = createClient();
  const divId = "qr-reader-coach";
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });

  const markAttendance = async (qrCode: string) => {
    // Lookup student by qr_code, join profile for suspend check
    const { data: student, error: mErr } = await supabase
      .from("students")
      .select("id, status, suspend_until, profile:profiles(full_name)")
      .eq("qr_code", qrCode)
      .single();

    if (mErr || !student) {
      toast.error("QR not recognized", "Student not found");
      setTimeout(() => setLastScanned(null), 2000);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawProfile = Array.isArray((student as any).profile) ? (student as any).profile[0] : (student as any).profile;
    const typedStudent = {
      id: (student as any).id as string,
      status: (student as any).status as string,
      suspend_until: (student as any).suspend_until as string | null,
      profile: rawProfile as { full_name: string } | null,
    };
    const name = typedStudent.profile?.full_name ?? "Student";

    // Block suspended students
    const today = new Date().toISOString().split("T")[0];
    if (typedStudent.status === "suspended" || (typedStudent.suspend_until && typedStudent.suspend_until >= today)) {
      toast.error(`${name} is suspended`, "Student cannot be marked present while suspended");
      setTimeout(() => setLastScanned(null), 2500);
      return;
    }

    // Which of THIS coach's classes the scanned student actually belongs to —
    // not a single coach-wide "active class" guess (the old behavior), which
    // silently misattributed attendance whenever a coach has more than one
    // class the same day, and never worked for private students since it
    // never knew which class_id to consume a session against.
    const { data: mcRows } = await supabase
      .from("student_classes")
      .select("class_id")
      .eq("student_id", typedStudent.id)
      .in("class_id", classes.map(c => c.id));
    const studentClassIds = new Set((mcRows ?? []).map(r => r.class_id));
    const candidates = classes.filter(c => studentClassIds.has(c.id));
    const matchedClass = candidates.find(c => (c.schedule_days ?? []).includes(todayName)) ?? candidates[0];

    if (!matchedClass) {
      toast.error(`${name} isn't in any of your classes`, "This student isn't enrolled in a class you teach — attendance wasn't recorded");
      setTimeout(() => setLastScanned(null), 2500);
      return;
    }

    // Determine late status: student late if > 1 minute after class start
    const scanTime = new Date().toTimeString().slice(0, 8);
    const studentLateMin = matchedClass.time_start ? minutesAfterStart(scanTime, matchedClass.time_start) : -999;
    const studentStatus = classifyStudentScan(studentLateMin);

    if (matchedClass.class_type === "private") {
      // Attendance insert + remaining_sessions decrement + bill sync all
      // happen in one atomic DB transaction (record_private_session_attendance)
      // — if any part fails, nothing is committed, so a retry is always safe
      // and remaining_sessions can never silently drift from attendance.
      const { data: result, error: recordErr } = await supabase
        .rpc("record_private_session_attendance", {
          p_student_id: typedStudent.id, p_class_id: matchedClass.id, p_session_date: today,
          p_status: studentStatus, p_method: "qr", p_marked_by: coachId,
        })
        .single();
      if (recordErr) {
        toast.error(`Failed to mark attendance for ${name}`, "Failed to record attendance — nothing was saved, sessions left is unaffected. Please try again.");
        setTimeout(() => setLastScanned(null), 2500);
        return;
      }
      const { out_remaining_sessions, out_bill_id, out_bill_sessions_used, out_bill_sessions_total, out_already_recorded } = result as {
        out_remaining_sessions: number | null; out_bill_id: string | null;
        out_bill_sessions_used: number | null; out_bill_sessions_total: number | null; out_already_recorded: boolean;
      };
      if (out_already_recorded) {
        toast.error("This session on this date is already recorded");
        setTimeout(() => setLastScanned(null), 2500);
        return;
      }
      if (out_bill_id && out_bill_sessions_total != null && out_bill_sessions_used != null && (out_bill_sessions_total - out_bill_sessions_used) <= 1) {
        await supabase.from("notifications").insert({
          user_id: typedStudent.id,
          title: "Sessions almost up",
          body: `You have ${out_bill_sessions_total - out_bill_sessions_used} session(s) left in your package. Contact admin to renew your package.`,
          icon: "warning",
          kind: "warn",
        });
      }
      toast.success(`✓ ${name} present`, `Remaining sessions: ${out_remaining_sessions ?? 0}`);
      setTimeout(() => setLastScanned(null), 2500);
      return;
    }

    const { error } = await supabase.from("student_attendances").upsert({
      student_id: typedStudent.id,
      class_id: matchedClass.id,
      session_date: today,
      status: studentStatus,
      method: "qr",
      marked_by: coachId,
    }, { onConflict: STUDENT_ATTENDANCE_CONFLICT });

    if (error) {
      toast.error(`Failed to mark attendance for ${name}`, error.message);
    } else if (studentStatus === "telat") {
      toast.error(`${name} present — Late`, `${studentLateMin} minutes after class started`);
    } else {
      toast.success(`✓ ${name} present`, "Attendance recorded");
    }

    // Allow scanning again after 2.5s
    setTimeout(() => setLastScanned(null), 2500);
  };

  useEffect(() => {
    let html5QrCode: import("html5-qrcode").Html5Qrcode | null = null;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrCode = new Html5Qrcode(divId);
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText: string) => {
            if (decodedText === lastScanned) return; // debounce same QR
            setLastScanned(decodedText);
            await markAttendance(decodedText);
          },
          undefined
        );
        setScanning(true);
      } catch {
        toast.error("Cannot access camera", "Allow camera access in the browser");
      }
    }

    startScanner();

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <button onClick={onClose} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> {"Back"}
      </button>
      <Card className="text-center">
        <div className="font-display font-bold text-lg text-ink">{"Scan Student QR"}</div>
        <p className="text-xs text-ink-mute mt-1 mb-4">{"Point the camera at the student's QR card"}</p>
        <div id={divId} className="rounded-xl overflow-hidden bg-black" />
        {!scanning && <p className="text-xs text-ink-mute mt-3 animate-pulse">{"Starting camera…"}</p>}
        {lastScanned && (
          <div className="mt-3 text-xs text-ok-600 font-semibold animate-pulse">{"Processing scan…"}</div>
        )}
      </Card>
    </div>
  );
}
