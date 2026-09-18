"use client";
import { useState } from "react";
import AdminAbsensiCoach from "./AdminAbsensiCoach";
import AdminAbsensiStudent from "./AdminAbsensiStudent";

export default function AdminAbsensi({ branchId }: { branchId: string }) {
  const [sub, setSub] = useState<"coach" | "student">("coach");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">{"Attendance"}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{"Coach and student attendance data · center SSDP."}</p>
      </div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-paper-tint rounded-xl p-1 w-fit">
        {([["coach", "Coach"], ["student", "Student"]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSub(id)}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${sub === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === "coach" && <AdminAbsensiCoach branchId={branchId} />}
      {sub === "student" && <AdminAbsensiStudent branchId={branchId} />}
    </div>
  );
}
