"use client";
import { createClient } from "@/utils/supabase/client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { calcAge } from "../../_utils";
import type { ClassPackage } from "../../_types";
import type { AdminStudentHook } from "./_hook";
import StudentInfoTab from "./StudentInfoTab";
import StudentAttendanceTab from "./StudentAttendanceTab";
import StudentPaymentTab from "./StudentPaymentTab";
import StudentCompetitionTab from "./StudentCompetitionTab";

export default function StudentDetailModal({ hook }: { hook: AdminStudentHook }) {
  const {
    detail, closeDetail, detailTab, setDetailTab,
    attLoaded, loadAttendances, billsLoaded, loadBills, studentCompsLoaded, loadStudentComps,
    openEdit, setOpenResetPwd, setNewPwd,
    setAddSesiForm, setPrivateClassPackages, setOpenAddSesi,
    setSuspendStudentTarget, setSuspendStudentForm, liftSuspendStudent, deleteStudent,
  } = hook;

  const p = detail?.profile;
  const age = p?.birth_date ? calcAge(p.birth_date) : null;

  return (
    <Modal open={!!detail} onClose={closeDetail} title={<NoTranslate>{detail?.profile?.full_name ?? ""}</NoTranslate>} size="xl"
      footer={
        <>
          <Btn variant="ghost" onClick={closeDetail}>{"Close"}</Btn>
          <Btn variant="outline" icon="edit" onClick={() => detail && openEdit(detail)}>{"Edit Data"}</Btn>
          <Btn variant="outline" icon="refresh" onClick={() => { setOpenResetPwd(true); setNewPwd(""); }}>{"Reset Password"}</Btn>
          {detail?.type === "private" && (
            <Btn variant="accent" icon="plus" onClick={async () => {
              setAddSesiForm({ jumlah: "", generate_bill: false, selectedPackageId: "" });
              // Load packages for this student's private class
              const classId = detail.student_classes?.[0]?.class?.id;
              if (classId) {
                const db = createClient();
                const { data: pkgs } = await db.from("class_packages").select("id, name, sessions, price, sort_order, active").eq("class_id", classId).eq("active", true).order("sort_order");
                setPrivateClassPackages((pkgs ?? []) as ClassPackage[]);
              } else {
                setPrivateClassPackages([]);
              }
              setOpenAddSesi(true);
            }}>{"Add Session"}</Btn>
          )}
          {detail?.status !== "suspended"
            ? <Btn variant="ghost" className="text-warn-600" onClick={() => { setSuspendStudentTarget(detail); setSuspendStudentForm({ reason: "", until: "" }); }}>{"Suspend"}</Btn>
            : <Btn variant="soft" size="sm" icon="check" onClick={() => detail && liftSuspendStudent(detail)}>{"End Suspend"}</Btn>
          }
          <Btn variant="ghost" className="text-danger-500" icon="trash" onClick={() => detail && deleteStudent(detail)}>{"Delete Permanently"}</Btn>
        </>
      }>
      {detail && (
        <div className="grid md:grid-cols-3 gap-5">
          {/* Left: avatar + QR */}
          <div className="text-center">
            <div className="flex justify-center">
              <button type="button" onClick={() => p?.avatar_url && hook.setPhotoView(p.avatar_url)} className={p?.avatar_url ? "cursor-zoom-in" : "cursor-default"}>
                <Avatar name={p?.full_name ?? ""} src={p?.avatar_url ?? undefined} size={96} />
              </button>
            </div>
            <div className="font-display font-bold text-lg text-ink mt-3"><NoTranslate>{p?.full_name ?? "—"}</NoTranslate></div>
            {age && <div className="text-xs text-ink-mute">{`${age} years old`}</div>}
            <div className="mt-4 flex justify-center"><QRBox value={detail.qr_code ?? detail.id} size={120} /></div>
            <div className="text-[9px] text-ink-faint font-mono mt-1 break-all"><NoTranslate>{detail.qr_code ?? detail.id}</NoTranslate></div>
            {p?.phone ? (
              <a href={`https://wa.me/62${p.phone.replace(/^0/, "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${p.full_name}, `)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                <Btn variant="wa" size="sm" icon="whatsapp">{"Contact Student"}</Btn>
              </a>
            ) : (
              <div className="mt-3 text-xs text-ink-faint">{"Phone number not available"}</div>
            )}
          </div>

          {/* Right: tabbed detail */}
          <div className="md:col-span-2 space-y-4 text-sm">
            {/* Tab bar */}
            <div className="flex gap-1 bg-paper-tint rounded-xl p-1">
              {([["info", "Info"], ["absensi", "Attendance"], ["pembayaran", "Payment"], ["lomba", "Prestasi & Lomba"]] as const).map(([id, label]) => (
                <button key={id} type="button"
                  onClick={() => {
                    setDetailTab(id);
                    if (id === "absensi" && !attLoaded) loadAttendances(detail.id);
                    if (id === "pembayaran" && !billsLoaded) loadBills(detail.id);
                    if (id === "lomba" && !studentCompsLoaded) loadStudentComps(detail.id);
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${detailTab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
                  {label}
                </button>
              ))}
            </div>

            {detailTab === "info" && <StudentInfoTab hook={hook} />}
            {detailTab === "absensi" && <StudentAttendanceTab hook={hook} />}
            {detailTab === "pembayaran" && <StudentPaymentTab hook={hook} />}
            {detailTab === "lomba" && <StudentCompetitionTab hook={hook} />}
          </div>
        </div>
      )}
    </Modal>
  );
}
