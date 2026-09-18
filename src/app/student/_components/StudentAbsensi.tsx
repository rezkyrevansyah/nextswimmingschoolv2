"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { isMemberPresentLike, memberDbToUi, memberStatusKind, memberStatusIcon } from "@/lib/attendance";
import { createClient } from "@/utils/supabase/client";

export default function MemberAbsensi({ memberId, onSwitchToLeave }: { memberId: string; onSwitchToLeave?: () => void }) {
  const supabase = createClient();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [filterClass, setFilterClass] = useState("all");
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [allRows, setAllRows] = useState<{ id: string; session_date: string; status: string; notes: string | null; class_name: string; class_id: string; time: string }[]>([]);

  useEffect(() => {
    if (!memberId) return;
    // Load member's classes for filter dropdown
    supabase.from("member_classes").select("classes(id, name)").eq("member_id", memberId)
      .then(({ data }) => {
        if (data) setMyClasses(data.map((mc) => {
          const c = mc.classes as unknown as { id: string; name: string } | null;
          return { id: c?.id ?? "", name: c?.name ?? "" };
        }).filter((c) => c.id));
      });
    // Load all attendance (no limit so month filter works client-side)
    supabase.from("member_attendances")
      .select("id, session_date, status, class_id, classes(name, time_start)")
      .eq("member_id", memberId)
      .order("session_date", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return;
        setAllRows(data.map((r) => {
          const cls = r.classes as unknown as { name: string; time_start: string } | null;
          return { id: r.id, session_date: r.session_date, status: r.status, notes: null as string | null, class_name: cls?.name ?? "—", class_id: (r as unknown as { class_id: string }).class_id ?? "", time: cls?.time_start ?? "—" };
        }));
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = allRows.filter((r) => {
    const matchMonth = !filterMonth || r.session_date.startsWith(filterMonth);
    const matchClass = filterClass === "all" || r.class_id === filterClass;
    return matchMonth && matchClass;
  });

  const stats = {
    present: rows.filter((r) => isMemberPresentLike(r.status)).length,
    excused: rows.filter((r) => memberDbToUi(r.status) === "izin").length,
    sick: rows.filter((r) => memberDbToUi(r.status) === "sick").length,
    absent: rows.filter((r) => memberDbToUi(r.status) === "absent").length,
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getStatusText = (status: string) => {
    const ui = memberDbToUi(status);
    if (ui === "present") return "Present";
    if (ui === "late") return "Late";
    if (ui === "absent") return "Absent";
    if (ui === "izin") return "Leave";
    return "Sick";
  };

  return (
    <div className="space-y-5">
      {onSwitchToLeave && (
        <div className="flex p-1 bg-white border border-line rounded-xl gap-1 shadow-2xs">
          <button
            type="button"
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-ocean-50 text-ocean-700 shadow-2xs text-center"
          >
            {"Attendance"}
          </button>
          <button
            type="button"
            onClick={onSwitchToLeave}
            className="flex-1 py-2 text-xs font-semibold rounded-lg text-ink-mute hover:text-ink text-center transition"
          >
            {"Leave"}
          </button>
        </div>
      )}
      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-line bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300"
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-line bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300"
        >
          <option value="all">{"All Classes"}</option>
          {myClasses.map((c) => <option key={c.id} value={c.id} translate="no">{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[["Present", stats.present, "ok"], ["Leave", stats.excused, "warn"], ["Sick", stats.sick, "warn"], ["Absent", stats.absent, "danger"]].map(([l, v, t]) => (
          <Card key={l as string} className="!p-3 text-center">
            <div className={`font-display font-extrabold text-2xl text-${t}-500`}>{v}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-mute">{l}</div>
          </Card>
        ))}
      </div>
      <Card padded={false}>
        <div className="divide-y divide-line">
          {rows.map((r) => {
            const d = new Date(r.session_date + "T00:00:00");
            const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${memberDbToUi(r.status) === "present" ? "bg-ok-50 text-ok-600" : memberDbToUi(r.status) === "absent" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                  <Icon name={memberStatusIcon(r.status)} className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink"><NoTranslate>{r.class_name}</NoTranslate></div>
                  <div className="text-xs text-ink-mute font-mono">{dateStr} · {r.time}{r.notes ? <> · <NoTranslate>{r.notes}</NoTranslate></> : ""}</div>
                </div>
                <Status kind={memberStatusKind(r.status)}>
                  {getStatusText(r.status)}
                </Status>
              </div>
            );
          })}
          {rows.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">{"No attendance records yet."}</div>}
        </div>
      </Card>
    </div>
  );
}
