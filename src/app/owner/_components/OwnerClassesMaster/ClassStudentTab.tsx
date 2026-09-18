"use client";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassStudentTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const { detailLoading, detailStudents } = hook;

  return (
    <div>
      {detailLoading ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"Loading…"}</div>
      ) : detailStudents.length === 0 ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"No active student in this class yet."}</div>
      ) : (
        <div className="divide-y divide-line border rounded-xl overflow-hidden">
          {detailStudents.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-white hover:bg-paper-tint transition-colors">
              <Avatar name={m.full_name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink text-xs"><NoTranslate>{m.full_name}</NoTranslate></div>
                <div className="text-[11px] text-ink-mute">
                  No: {m.student_no ?? "—"} · Telp: {m.phone ?? "—"}
                </div>
              </div>
              <div className="text-right">
                <Status kind={m.status === "active" ? "active" : "suspend"}>
                  {m.status === "active" ? "Active" : m.status}
                </Status>
                {m.remaining_sessions != null && (
                  <div className="text-[10px] text-ink-mute font-mono mt-0.5">
                    Sisa {m.remaining_sessions}/{m.total_sessions ?? "—"} sesi
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
