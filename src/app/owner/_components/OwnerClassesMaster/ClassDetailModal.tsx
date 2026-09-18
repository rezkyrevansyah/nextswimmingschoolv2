"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import ClassInfoTab from "./ClassInfoTab";
import ClassCoachTab from "./ClassCoachTab";
import ClassStudentTab from "./ClassStudentTab";
import { ClassCoachAttendanceTab, ClassStudentAttendanceTab } from "./ClassAttendanceTabs";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassDetailModal({ hook }: { hook: OwnerClassesMasterHook }) {
  const { detailClass, setDetailClass, detailTab, switchDetailTab } = hook;

  return (
    <Modal
      open={!!detailClass}
      onClose={() => setDetailClass(null)}
      title={(<>{"Class Detail — "}<NoTranslate>{detailClass?.name ?? ""}</NoTranslate></>)}
      size="xl"
      footer={
        <Btn variant="ghost" onClick={() => setDetailClass(null)}>
          {"Close"}
        </Btn>
      }
    >
      {detailClass && (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-1 flex-wrap border-b border-line pb-2">
            {(["info", "coach", "student", "att_coach", "att_student"] as const).map((tab) => {
              const labels: Record<string, string> = {
                info: "Info",
                coach: "Coach",
                student: "Student",
                att_coach: "Coach Attendance",
                att_student: "Student Attendance",
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchDetailTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    detailTab === tab ? "bg-ocean-600 text-white shadow-sm" : "text-ink-mute hover:bg-paper-tint hover:text-ink"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {detailTab === "info" && <ClassInfoTab hook={hook} />}
          {detailTab === "coach" && <ClassCoachTab hook={hook} />}
          {detailTab === "student" && <ClassStudentTab hook={hook} />}
          {detailTab === "att_coach" && <ClassCoachAttendanceTab hook={hook} />}
          {detailTab === "att_student" && <ClassStudentAttendanceTab hook={hook} />}
        </div>
      )}
    </Modal>
  );
}
