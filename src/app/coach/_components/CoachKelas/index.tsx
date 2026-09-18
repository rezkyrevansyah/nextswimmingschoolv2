"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Placeholder from "@/components/ui/Placeholder";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { createClient } from "@/utils/supabase/client";
import { memberDbToUi, memberStatusKind, memberStatusIcon } from "@/lib/attendance";
import type { ClassRow, CoachSpreadsheetRow } from "../../_types";
import { calcAgeFromBirthDate, type MemberDetail } from "./_shared";
import SpreadsheetModal from "./SpreadsheetModal";
import MemberDetailModal from "./MemberDetailModal";

export default function CoachKelas({ classes, coachId, classSpreadsheets, ownSpreadsheets, onRefreshClasses }: {
  classes: ClassRow[];
  coachId: string;
  classSpreadsheets: Map<string, CoachSpreadsheetRow[]>;
  ownSpreadsheets: Map<string, string>;
  onRefreshClasses?: () => void;
}) {
  const supabase = createClient();
  const localeTag = "en-US";
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [det, setDet] = useState<ClassRow | null>(null);
  const [openSpreadsheet, setOpenSpreadsheet] = useState<ClassRow | null>(null);
  const [memberDet, setMemberDet] = useState<MemberDetail | null>(null);
  const [memberAttHistory, setMemberAttHistory] = useState<{ memberId: string; memberName: string; classId: string; className: string; rows: { id: string; session_date: string; status: string }[] } | null>(null);
  const [loadingAtt, setLoadingAtt] = useState(false);

  const openMemberAtt = async (memberId: string, memberName: string, classId: string, className: string) => {
    setLoadingAtt(true);
    setMemberAttHistory({ memberId, memberName, classId, className, rows: [] });
    const { data } = await supabase.from("member_attendances")
      .select("id, session_date, status")
      .eq("member_id", memberId).eq("class_id", classId)
      .order("session_date", { ascending: false }).limit(50);
    setMemberAttHistory({ memberId, memberName, classId, className, rows: (data ?? []).map(r => ({ id: r.id, session_date: r.session_date, status: r.status })) });
    setLoadingAtt(false);
  };

  return (
    <div className="space-y-5">
      <SectionTitle sub={`${classes.length} classes`}>{"Your Classes"}</SectionTitle>
      <div className="space-y-3">
        {classes.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-lift transition" onClick={() => setDet(c)}>
            <div className="flex items-start gap-3">
              <Placeholder label="cls" ratio="1/1" className="!w-20 !aspect-square shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-ink"><NoTranslate>{c.name}</NoTranslate></div>
                <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{(c.schedule_days ?? []).join(", ")}</NoTranslate></div>
                <div className="text-xs text-ocean-700 font-semibold mt-1.5 font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-ink-mute">
                  <span className="inline-flex items-center gap-1"><Icon name="users" className="w-3.5 h-3.5" />{c.enrolled}/{c.capacity}</span>
                  {ownSpreadsheets.has(c.id)
                    ? <a href={ownSpreadsheets.get(c.id)!} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-ok-600 font-semibold hover:underline"><Icon name="link" className="w-3 h-3" />{"My Program"}</a>
                    : <span className="text-warn-500 font-semibold">{"Program not filled in"}</span>
                  }
                </div>
              </div>
              <Btn variant="soft" size="sm" icon="book" onClick={e => { e.stopPropagation(); setOpenSpreadsheet(c); }}>{"Program"}</Btn>
            </div>
          </Card>
        ))}
        {classes.length === 0 && <Card><p className="text-ink-mute text-sm">{"No classes assigned yet."}</p></Card>}
      </div>

      {/* Detail kelas modal */}
      <Modal open={!!det} onClose={() => setDet(null)} title={<NoTranslate>{det?.name ?? ""}</NoTranslate>} size="lg"
        footer={
          <div className="flex items-center gap-2 w-full">
            {det && ownSpreadsheets.has(det.id) && (
              <a href={ownSpreadsheets.get(det.id)!} target="_blank" rel="noreferrer">
                <Btn variant="soft" size="sm" icon="link">{"Open My Spreadsheet"}</Btn>
              </a>
            )}
            <div className="flex-1" />
            <Btn variant="soft" size="sm" icon="book" onClick={() => { setOpenSpreadsheet(det); setDet(null); }}>
              {det && ownSpreadsheets.has(det.id) ? "Edit Program" : "Fill In Program"}
            </Btn>
            <Btn variant="ghost" onClick={() => setDet(null)}>{"Close"}</Btn>
          </div>
        }>
        {det && (
          <div className="space-y-4">
            {/* Branch info / External Location info */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <Icon name="map-pin" className="w-4 h-4 text-ocean-500 shrink-0" />
              {det.location_type === "external" ? (
                <div>
                  <div className="font-semibold text-ink">🏡 {det.external_location_name ? <NoTranslate>{det.external_location_name}</NoTranslate> : "External Location"}</div>
                  {det.external_location_address && <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{det.external_location_address}</NoTranslate></div>}
                  {det.google_maps_url && (
                    <a href={det.google_maps_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-wave-600 hover:underline mt-1 inline-block">
                      {"Open in Google Maps ↗"}
                    </a>
                  )}
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-ink"><NoTranslate>{det.branch?.name ?? "—"}</NoTranslate></span>
                  {det.branch?.city && <span className="text-ink-mute"> · <NoTranslate>{det.branch.city}</NoTranslate></span>}
                  {det.branch?.address && <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{det.branch.address}</NoTranslate></div>}
                </div>
              )}
            </div>
            {det.goals && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Goals"}</div><p className="text-sm text-ink-soft mt-1"><NoTranslate>{det.goals}</NoTranslate></p></div>}
            {det.description && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Description"}</div><p className="text-sm text-ink-soft mt-1"><NoTranslate>{det.description}</NoTranslate></p></div>}
            {!ownSpreadsheets.has(det.id) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-sm text-warn-800">
                <Icon name="alert" className="w-4 h-4 shrink-0 text-warn-500" />
                {"Your program spreadsheet for this class hasn't been filled in yet."}
              </div>
            )}
            {(classSpreadsheets.get(det.id) ?? []).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">{"All Coaches' Spreadsheets"}</div>
                <div className="space-y-2">
                  {(classSpreadsheets.get(det.id) ?? []).map(s => (
                    <div key={s.coach_id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-line bg-paper-tint">
                      <Avatar name={s.coach?.full_name ?? "?"} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          <NoTranslate>{s.coach?.full_name ?? "—"}</NoTranslate>
                          {s.coach_id === coachId && <span className="ml-1.5 text-[10px] text-ocean-600 font-bold uppercase tracking-wide">{"You"}</span>}
                        </div>
                        <div className="text-[10px] text-ink-faint font-mono">{new Date(s.updated_at).toLocaleDateString(localeTag)}</div>
                      </div>
                      <a href={s.spreadsheet_url} target="_blank" rel="noreferrer"
                        className="shrink-0 text-ocean-600 flex items-center gap-1 text-xs font-semibold hover:underline">
                        <Icon name="link" className="w-3.5 h-3.5" />{"Open"}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <SectionTitle sub={`${det.enrolled} students registered · click for detail`}>{"Student List"}</SectionTitle>
              <div className="space-y-2">
                {(det.member_classes ?? []).map((mc, i) => {
                  const memberAge = mc.member?.profile?.birth_date ? calcAgeFromBirthDate(mc.member.profile.birth_date) : null;
                  return mc.member && (
                  <div key={mc.member.id ?? i} className="flex items-center gap-2 p-2.5 rounded-xl border border-line hover:bg-paper-tint transition">
                    <button onClick={() => setMemberDet(mc.member!)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <Avatar name={mc.member.profile?.full_name ?? "?"} src={mc.member.profile?.avatar_url ?? undefined} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink truncate"><NoTranslate>{mc.member.profile?.full_name ?? "—"}</NoTranslate></div>
                        {mc.member.profile?.birth_date && (
                          <div className="text-xs text-ink-mute">
                            {`${memberAge ?? 0} years old`}
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => openMemberAtt(mc.member!.id, mc.member!.profile?.full_name ?? "—", det.id, det.name)}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-ocean-50 hover:border-ocean-200 hover:text-ocean-700 transition flex items-center gap-1">
                      <Icon name="check" className="w-3 h-3" />{"Attendance"}
                    </button>
                  </div>
                );
                })}
                {(det.member_classes?.length ?? 0) === 0 && <div className="text-sm text-ink-mute">{"No students registered yet."}</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Member detail modal */}
      {memberDet && <MemberDetailModal member={memberDet} onClose={() => setMemberDet(null)} />}

      {/* Member attendance history modal */}
      {memberAttHistory && (
        <Modal open={!!memberAttHistory} onClose={() => setMemberAttHistory(null)}
          title={(<>{"Attendance — "}<NoTranslate>{memberAttHistory.memberName}</NoTranslate></>)}
          footer={<Btn variant="ghost" onClick={() => setMemberAttHistory(null)}>{"Close"}</Btn>}>
          <div className="text-xs text-ink-mute mb-3 font-semibold uppercase tracking-widest"><NoTranslate>{memberAttHistory.className}</NoTranslate></div>
          {loadingAtt ? (
            <div className="text-center py-6 text-ink-mute text-sm">{"Loading…"}</div>
          ) : memberAttHistory.rows.length === 0 ? (
            <div className="text-center py-6 text-ink-mute text-sm">{"No attendance data for this class yet."}</div>
          ) : (
            <div className="divide-y divide-line -mx-5">
              {memberAttHistory.rows.map((r) => {
                const d = new Date(r.session_date + "T00:00:00");
                const dateStr = `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
                const ui = memberDbToUi(r.status);
                const statusLabel = ui === "present" ? "Present"
                  : ui === "late" ? "Late"
                  : ui === "izin" ? "Leave"
                  : ui === "sick" ? "Sick"
                  : "Absent";
                const statusKind = memberStatusKind(r.status);
                const icon = memberStatusIcon(r.status);
                return (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ui === "present" ? "bg-ok-50 text-ok-600" : ui === "absent" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                      <Icon name={icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 text-sm font-mono text-ink-soft">{dateStr}</div>
                    <Status kind={statusKind}>{statusLabel}</Status>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Spreadsheet modal */}
      {openSpreadsheet && (
        <SpreadsheetModal
          classId={openSpreadsheet.id}
          className={openSpreadsheet.name}
          coachId={coachId}
          currentUrl={ownSpreadsheets.get(openSpreadsheet.id) ?? null}
          onClose={() => setOpenSpreadsheet(null)}
          onSaved={onRefreshClasses}
        />
      )}
    </div>
  );
}
