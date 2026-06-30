"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import type { ScheduleSlot } from "../_types";
import { getSlotTime } from "../_utils";

const DAY_NAMES = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
const DAY_IDX: Record<string, number> = { Senin: 0, Selasa: 1, Rabu: 2, Kamis: 3, Jumat: 4, Sabtu: 5, Minggu: 6 };

// Calendar constants — 1 hour = PX_PER_HOUR pixels, start at CAL_START
const CAL_START = 6;   // 06:00
const CAL_END   = 22;  // 22:00 (exclusive label)
const PX_PER_HOUR = 64;

/** Convert "HH:MM:SS" or "HH:MM" to minutes-since-midnight */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

interface CalEvent {
  classId: string; name: string; coach: string;
  timeStart: string; timeEnd: string;
  days: number[]; isSub?: boolean;
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

interface HolidayEntry { id: string; class_id: string; holiday_date: string; reason: string | null }
interface CalEventExt extends CalEvent { isHoliday?: boolean; holidayId?: string }

export default function AdminClassActivity({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [events, setEvents] = useState<CalEventExt[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([]);

  // Holiday modal state
  const [openHoliday, setOpenHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ class_id: "", holiday_date: "", reason: "" });
  const [savingH, setSavingH] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].toISOString().slice(0, 10);
  const weekEnd   = weekDates[6].toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);

    const [{ data: cls }, { data: leaves }, { data: hols }] = await Promise.all([
      supabase.from("classes")
        .select("id, name, schedule_days, time_start, time_end, schedule_times, class_coaches(profile:profiles(full_name))")
        .eq("branch_id", branchId).eq("status", "active"),
      supabase.from("coach_leaves")
        .select("id, date_from, date_to, substitute:profiles!coach_leaves_substitute_id_fkey(full_name), coach_leave_classes(class_id)")
        .eq("status", "approved")
        .lte("date_from", weekEnd).gte("date_to", weekStart),
      supabase.from("class_holidays")
        .select("id, class_id, holiday_date, reason")
        .eq("branch_id", branchId)
        .gte("holiday_date", weekStart).lte("holiday_date", weekEnd),
    ]);

    if (!cls) { setLoading(false); return; }

    setAllClasses((cls as { id: string; name: string }[]).map(c => ({ id: c.id, name: c.name })));

    const holArr = (hols ?? []) as HolidayEntry[];
    setHolidays(holArr);

    const subMap: Record<string, string> = {};
    (leaves ?? []).forEach((l) => {
      const sub = (l as unknown as { substitute: { full_name: string } | null }).substitute;
      if (sub) {
        (l.coach_leave_classes ?? []).forEach((lc) => {
          subMap[(lc as unknown as { class_id: string }).class_id] = sub.full_name;
        });
      }
    });

    const holMap: Record<string, string> = {};
    holArr.forEach(h => { holMap[`${h.class_id}|${h.holiday_date}`] = h.id; });

    const evts: CalEventExt[] = (cls as unknown as {
      id: string; name: string; schedule_days: string[];
      time_start: string; time_end: string; schedule_times?: ScheduleSlot[] | null;
      class_coaches: { profile: { full_name: string } | null }[];
    }[]).flatMap((c) => {
      const coach = c.class_coaches?.[0]?.profile?.full_name ?? "—";
      const subName = subMap[c.id];
      return (c.schedule_days ?? []).map((day: string) => {
        const dayIdx = DAY_IDX[day] ?? -1;
        if (dayIdx < 0) return null;
        const dateStr = weekDates[dayIdx]?.toISOString().slice(0, 10);
        const holKey = `${c.id}|${dateStr}`;
        const holidayId = holMap[holKey];
        // Per-day time override
        const t = getSlotTime(c, day);
        return {
          classId: c.id,
          name: c.name,
          coach: subName ? subName.split(" ")[0] : (coach === "—" ? "—" : coach.split(" ")[0]),
          timeStart: t.time_start || "00:00",
          timeEnd:   t.time_end   || t.time_start || "01:00",
          days: [dayIdx],
          isSub: !!subName,
          isHoliday: !!holidayId,
          holidayId,
        };
      }).filter(Boolean) as CalEventExt[];
    });

    setEvents(evts);
    setLoading(false);
  }, [branchId, weekStart, weekEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addHoliday = async () => {
    if (!holidayForm.class_id || !holidayForm.holiday_date) return toast.error("Kelas dan tanggal wajib diisi");
    setSavingH(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("class_holidays").upsert({
      class_id: holidayForm.class_id,
      branch_id: branchId,
      holiday_date: holidayForm.holiday_date,
      reason: holidayForm.reason || null,
      created_by: user?.id,
    }, { onConflict: "class_id,holiday_date" });
    setSavingH(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Kelas ditandai libur");
    setOpenHoliday(false);
    setHolidayForm({ class_id: "", holiday_date: "", reason: "" });
    load();
  };

  const removeHoliday = async (holidayId: string) => {
    const { error } = await supabase.from("class_holidays").delete().eq("id", holidayId);
    if (error) return toast.error("Gagal batalkan", error.message);
    toast.success("Status libur dibatalkan");
    load();
  };

  const weekLabel = `${weekDates[0].getDate()} ${weekDates[0].toLocaleDateString("id-ID", { month: "short" })} – ${weekDates[6].getDate()} ${weekDates[6].toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`;

  // Total calendar height in px
  const totalHours = CAL_END - CAL_START;
  const calHeight = totalHours * PX_PER_HOUR;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="font-display font-bold text-2xl">Class Activity</h2><p className="text-ink-mute text-sm mt-0.5">Kalender semua kelas aktif minggu ini.</p></div>
        <div className="flex gap-2 items-center flex-wrap">
          <Btn variant="soft" size="sm" icon="flag" onClick={() => setOpenHoliday(true)}>Tandai Libur</Btn>
          <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute"><Icon name="chevron-left" className="w-4 h-4" /></button>
          <div className="font-display font-bold text-ink px-2 text-sm">{weekLabel}</div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute"><Icon name="chevron-right" className="w-4 h-4" /></button>
        </div>
      </div>

      {holidays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {holidays.map(h => {
            const cls = allClasses.find(c => c.id === h.class_id);
            return (
              <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warn-50 border border-warn-200 text-xs font-semibold text-warn-700">
                <Icon name="flag" className="w-3 h-3" />
                {cls?.name ?? h.class_id} · {h.holiday_date}{h.reason ? ` (${h.reason})` : ""}
                <button onClick={() => removeHoliday(h.id)} className="ml-1 hover:text-warn-900">
                  <Icon name="x" className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {loading ? <div className="p-10 text-center text-ink-mute">Memuat kalender…</div> : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row */}
              <div className="grid border-b border-line" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div className="border-r border-line" />
                {DAY_NAMES.map((d, i) => {
                  const date = weekDates[i];
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={d} className={`border-b-0 p-3 text-center ${i < 6 ? "border-r border-line" : ""}`}>
                      <div className="text-[10px] font-bold text-ink-faint uppercase tracking-widest">{d.slice(0, 3)}</div>
                      <div className={`font-display font-bold text-lg mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? "bg-ocean-600 text-white" : "text-ink"}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Body: time gutter + 7 day columns */}
              <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                {/* Time gutter */}
                <div className="border-r border-line relative" style={{ height: `${calHeight}px` }}>
                  {Array.from({ length: totalHours }, (_, i) => (
                    <div key={i} className="absolute w-full flex items-start justify-end pr-2" style={{ top: `${i * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}>
                      <span className="text-[10px] font-bold text-ink-faint leading-none -mt-2">{String(CAL_START + i).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const dayEvents = events.filter(e => e.days.includes(dayIdx));

                  // ── Overlap / column layout ──────────────────────────────
                  // Assign each event a column slot so overlapping events share width.
                  // Algorithm: greedy interval-graph colouring.
                  interface SlotEvent { ev: CalEventExt; col: number; totalCols: number }
                  const slots: SlotEvent[] = [];
                  const colEnds: number[] = []; // tracks the end-minute of the last event in each column

                  for (const ev of dayEvents) {
                    const s = timeToMin(ev.timeStart);
                    const e = timeToMin(ev.timeEnd);
                    // Find the first column where this event fits (no overlap)
                    let col = colEnds.findIndex(end => end <= s);
                    if (col === -1) { col = colEnds.length; colEnds.push(e); }
                    else { colEnds[col] = e; }
                    slots.push({ ev, col, totalCols: 0 }); // totalCols filled below
                  }

                  // Second pass: for each event, totalCols = max column index + 1
                  // among all events that overlap with it.
                  for (const slot of slots) {
                    const s = timeToMin(slot.ev.timeStart);
                    const e = timeToMin(slot.ev.timeEnd);
                    let maxCol = slot.col;
                    for (const other of slots) {
                      const os = timeToMin(other.ev.timeStart);
                      const oe = timeToMin(other.ev.timeEnd);
                      if (os < e && oe > s) maxCol = Math.max(maxCol, other.col);
                    }
                    slot.totalCols = maxCol + 1;
                  }

                  return (
                    <div key={dayIdx} className={`relative ${dayIdx < 6 ? "border-r border-line" : ""}`} style={{ height: `${calHeight}px` }}>
                      {/* Hour gridlines */}
                      {Array.from({ length: totalHours }, (_, i) => (
                        <div key={i} className="absolute w-full border-t border-line/50" style={{ top: `${i * PX_PER_HOUR}px` }} />
                      ))}
                      {/* Half-hour gridlines (fainter) */}
                      {Array.from({ length: totalHours }, (_, i) => (
                        <div key={`h${i}`} className="absolute w-full border-t border-line/20" style={{ top: `${i * PX_PER_HOUR + PX_PER_HOUR / 2}px` }} />
                      ))}

                      {/* Events */}
                      {slots.map(({ ev, col, totalCols }) => {
                        const startMin = timeToMin(ev.timeStart);
                        const endMin   = timeToMin(ev.timeEnd);
                        const topPx    = ((startMin - CAL_START * 60) / 60) * PX_PER_HOUR;
                        const heightPx = Math.max(((endMin - startMin) / 60) * PX_PER_HOUR, 28);
                        const timeLabel = `${ev.timeStart.slice(0,5)}–${ev.timeEnd.slice(0,5)}`;
                        const GAP = 2; // px gap between columns
                        const colW = `calc(${100 / totalCols}% - ${GAP}px)`;
                        const colL = `calc(${(col / totalCols) * 100}% + ${GAP / 2}px)`;
                        return (
                          <div
                            key={ev.classId}
                            className={`absolute rounded-lg ring-1 ring-inset px-2 py-1 overflow-hidden cursor-default select-none ${
                              ev.isHoliday
                                ? "bg-warn-50 text-warn-700 ring-warn-400/40"
                                : ev.isSub
                                ? "bg-sub-50 text-sub-700 ring-sub-500/30"
                                : "bg-ocean-100 text-ocean-700 ring-ocean-500/30"
                            }`}
                            style={{ top: `${topPx}px`, height: `${heightPx}px`, left: colL, width: colW, zIndex: 5 + col }}
                            title={`${ev.name} · ${timeLabel}`}
                          >
                            <div className="font-bold text-[11px] truncate flex items-center gap-1 leading-tight">
                              {ev.isHoliday && <Icon name="flag" className="w-3 h-3 shrink-0" />}
                              {ev.isSub && !ev.isHoliday && <Icon name="refresh" className="w-3 h-3 shrink-0" />}
                              <span className="truncate">{ev.name}</span>
                            </div>
                            {heightPx >= 44 && (
                              <div className="text-[10px] opacity-75 truncate leading-tight mt-0.5">
                                {ev.isHoliday ? "Libur" : ev.isSub ? `Pengganti: ${ev.coach}` : ev.coach}
                              </div>
                            )}
                            {heightPx >= 56 && (
                              <div className="text-[10px] opacity-60 truncate font-mono leading-tight">{timeLabel}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tandai Libur Modal */}
      <Modal open={openHoliday} onClose={() => setOpenHoliday(false)} title="Tandai Kelas Libur" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenHoliday(false)}>Batal</Btn><Btn variant="primary" onClick={addHoliday} disabled={savingH}>{savingH ? "Menyimpan…" : "Tandai Libur"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Kelas" required>
            <Select value={holidayForm.class_id} onChange={e => setHolidayForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Pilih kelas…</option>
              {allClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Tanggal libur" required>
            <Input type="date" value={holidayForm.holiday_date} onChange={e => setHolidayForm(f => ({ ...f, holiday_date: e.target.value }))} />
          </Field>
          <Field label="Alasan (opsional)">
            <Input value={holidayForm.reason} onChange={e => setHolidayForm(f => ({ ...f, reason: e.target.value }))} placeholder="Mis. Libur nasional, kolam tutup" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
