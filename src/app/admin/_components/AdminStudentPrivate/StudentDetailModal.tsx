"use client";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import QRBox from "@/components/ui/QRBox";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate, waLink, clampPercent, cn } from "@/lib/utils";
import { calcAge } from "../../_utils";
import type { useMemberPrivateData } from "./useMemberPrivateData";

type MemberPrivateDataHook = ReturnType<typeof useMemberPrivateData>;

export default function StudentDetailModal({ hook }: { hook: MemberPrivateDataHook }) {
  const { detailTarget, setDetailTarget, branchName, openAddSesi, openEdit } = hook;

  return (
    <Modal
      open={!!detailTarget}
      onClose={() => setDetailTarget(null)}
      title={
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ocean-500 ring-4 ring-ocean-100" />
          <span>{"Student Detail"}</span>
        </div>
      }
      size="xl"
      footer={
        detailTarget && (
          <div className="flex items-center justify-between w-full gap-2 flex-wrap">
            <div className="text-xs text-ink-mute flex items-center gap-1.5">
              <Icon name="info" className="w-3.5 h-3.5 text-ocean-600" />
              <NoTranslate>{detailTarget.branch?.name ?? branchName ?? "Private Student"}</NoTranslate>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setDetailTarget(null)}>
                {"Close"}
              </Btn>
              <Btn
                variant="soft"
                size="sm"
                icon="plus"
                onClick={() => {
                  const tgt = detailTarget;
                  setDetailTarget(null);
                  openAddSesi(tgt);
                }}
              >
                {"Add Sessions"}
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon="edit"
                onClick={() => {
                  const tgt = detailTarget;
                  setDetailTarget(null);
                  openEdit(tgt);
                }}
              >
                {"Edit Data"}
              </Btn>
            </div>
          </div>
        )
      }
    >
      {detailTarget && (() => {
        const profile = detailTarget.profile;
        const cls = detailTarget.class;
        const age = profile?.birth_date ? calcAge(profile.birth_date) : null;
        const remSessions = detailTarget.remaining_sessions ?? 0;
        const totSessions = detailTarget.total_sessions ?? 0;
        const usedSessions = Math.max(0, totSessions - remSessions);
        const sessionPercent = totSessions > 0 ? clampPercent(remSessions, totSessions) : 0;

        const coachList = cls?.class_coaches ?? [];
        const headCoach = coachList.find(cc => cc.role === "head") ?? coachList[0];
        const assistantCoaches = coachList.filter(cc => cc.coach_id !== headCoach?.coach_id);

        const waGreeting = `Hi ${profile?.full_name ?? ""}, `;
        const waUrl = profile?.phone ? waLink(waGreeting, profile.phone) : null;

        const isExt = cls?.location_type === "external";
        const locationName = isExt
          ? (cls?.external_location_name ? <NoTranslate>{cls.external_location_name}</NoTranslate> : "Somewhere else")
          : (detailTarget.branch?.name
            ? (<>{"This center's pool ("}<NoTranslate>{detailTarget.branch.name}</NoTranslate>{")"}</>)
            : branchName
            ? (<>{"This center's pool ("}<NoTranslate>{branchName}</NoTranslate>{")"}</>)
            : "This center's pool");

        const mapsUrl = cls?.google_maps_url || (cls?.custom_location_lat != null && cls?.custom_location_lng != null
          ? `https://www.google.com/maps/search/?api=1&query=${cls.custom_location_lat},${cls.custom_location_lng}`
          : null);

        return (
          <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Digital Member Pass & Attendance QR (4 cols) */}
            <div className="md:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-paper-tint/60 border border-line flex flex-col items-center text-center shadow-sm">
                <div className="relative">
                  <Avatar
                    name={profile?.full_name ?? ""}
                    src={profile?.avatar_url ?? undefined}
                    size={88}
                    className="ring-4 ring-white shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1">
                    <Status kind={detailTarget.status === "suspended" ? "suspended" : "active"} dot={false} className="!text-[10px] !px-2 shadow-xs">
                      {detailTarget.status === "suspended" ? "Suspend" : "Active"}
                    </Status>
                  </div>
                </div>

                <div className="font-display font-bold text-xl text-ink mt-3.5 leading-snug">
                  <NoTranslate>{profile?.full_name ?? "—"}</NoTranslate>
                </div>

                {detailTarget.member_no ? (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-line-strong/60 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-ocean-500" />
                    <span className="font-mono text-xs font-semibold text-ocean-800 tracking-wider">
                      <NoTranslate>{detailTarget.member_no}</NoTranslate>
                    </span>
                  </div>
                ) : null}

                {/* QR Code Container Box */}
                <div className="w-full mt-5 p-3.5 bg-white rounded-2xl border border-line shadow-sm flex flex-col items-center">
                  <QRBox
                    value={detailTarget.qr_code ?? detailTarget.id}
                    size={152}
                    downloadable
                    downloadName={`QR_${(profile?.full_name ?? "student").replace(/\s+/g, "_")}`}
                    hideCaption
                  />
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-mute font-medium bg-paper-tint px-3 py-1 rounded-full w-full">
                    <Icon name="qr" className="w-3.5 h-3.5 text-ocean-600 shrink-0" />
                    <span className="truncate">{"Scan this QR to verify attendance"}</span>
                  </div>
                </div>

                {/* Contact WhatsApp Button */}
                {profile?.phone && waUrl && (
                  <div className="w-full mt-3">
                    <Btn
                      variant="wa"
                      size="sm"
                      icon="whatsapp"
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full shadow-xs"
                    >
                      {"Contact Student"}
                    </Btn>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Structured Information Cards (8 cols) */}
            <div className="md:col-span-8 space-y-4">
              {/* 1. Session Quota & Package Balance Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-line shadow-sm space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center">
                      <Icon name="chart" className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-ink">{"Session Balance & Quota"}</h4>
                      <p className="text-xs text-ink-mute">
                        {remSessions > 0
                          ? `${remSessions} ${"sessions left"}`
                          : "All sessions have been used"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const tgt = detailTarget;
                      setDetailTarget(null);
                      openAddSesi(tgt);
                    }}
                    className="text-xs font-semibold text-ocean-600 hover:text-ocean-700 bg-ocean-50 hover:bg-ocean-100/80 px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                  >
                    <Icon name="plus" className="w-3 h-3" />
                    <span>{"Add Sessions"}</span>
                  </button>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-paper-tint rounded-full overflow-hidden p-0.5 border border-line">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        remSessions === 0
                          ? "bg-danger-500"
                          : remSessions <= 2
                          ? "bg-warn-500"
                          : "bg-ocean-600"
                      )}
                      style={{ width: `${sessionPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-ink-mute font-medium px-0.5">
                    <span>{remSessions === 0 ? "Suspend" : `${sessionPercent}% ${"Remaining"}`}</span>
                    <span>{totSessions} {"Sessions"}</span>
                  </div>
                </div>

                {/* Mini metrics 3-col grid */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-paper-tint/70 border border-line/60 text-center">
                    <div className="text-[11px] text-ink-mute font-medium">{"Remaining"}</div>
                    <div className={cn(
                      "text-lg font-mono font-bold mt-0.5",
                      remSessions === 0 ? "text-danger-600" : remSessions <= 2 ? "text-warn-600" : "text-ocean-700"
                    )}>
                      {remSessions}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-paper-tint/70 border border-line/60 text-center">
                    <div className="text-[11px] text-ink-mute font-medium">{"Used"}</div>
                    <div className="text-lg font-mono font-bold text-ink-soft mt-0.5">
                      {usedSessions}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-paper-tint/70 border border-line/60 text-center">
                    <div className="text-[11px] text-ink-mute font-medium">{"Package Total"}</div>
                    <div className="text-lg font-mono font-bold text-ink mt-0.5">
                      {totSessions}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Training Schedule & Pool Location Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-line shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <div className="w-8 h-8 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center">
                    <Icon name="calendar" className="w-4 h-4" />
                  </div>
                  <h4 className="font-display font-bold text-sm text-ink">{"Training Schedule & Pool"}</h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {/* Schedule Column */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-ink-mute block">{"Schedule"}</span>
                    {(cls?.schedule_days ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {cls!.schedule_days.map(day => (
                          <span key={day} className="px-2.5 py-1 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-semibold border border-ocean-200/60 shadow-xs">
                            <NoTranslate>{day}</NoTranslate>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-mute italic">—</span>
                    )}
                    {cls?.time_start && cls?.time_end && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-paper-tint text-ink text-xs font-semibold mt-1">
                        <Icon name="calendar" className="w-3.5 h-3.5 text-ocean-600" />
                        <span>{cls.time_start.slice(0, 5)} – {cls.time_end.slice(0, 5)} WIB</span>
                      </div>
                    )}
                  </div>

                  {/* Location Column */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-ink-mute block">{"Location"}</span>
                    <div className="flex items-start gap-1.5">
                      <Icon name="pin" className="w-4 h-4 text-ocean-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-ink leading-snug">{locationName}</div>
                        {isExt && cls?.external_location_address && (
                          <p className="text-xs text-ink-mute mt-0.5 leading-relaxed"><NoTranslate>{cls.external_location_address}</NoTranslate></p>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-ocean-600 hover:text-ocean-700 font-semibold inline-flex items-center gap-1 mt-1.5"
                          >
                            <Icon name="link" className="w-3 h-3" />
                            <span>{"Open in Google Maps"}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coach Section */}
                <div className="pt-3 border-t border-line/60">
                  <span className="text-xs font-semibold text-ink-mute block mb-2">{"Coach"}</span>
                  {headCoach?.profile ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-paper-tint border border-line">
                        <Avatar name={headCoach.profile.full_name} size={28} />
                        <div>
                          <div className="text-xs font-bold text-ink leading-none"><NoTranslate>{headCoach.profile.full_name}</NoTranslate></div>
                          <div className="text-[10px] text-ocean-700 font-semibold mt-0.5">{"Head Coach"}</div>
                        </div>
                      </div>
                      {assistantCoaches.map(ac => ac.profile && (
                        <div key={ac.coach_id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-paper-tint/60 border border-line/60">
                          <Avatar name={ac.profile.full_name} size={24} />
                          <div>
                            <div className="text-xs font-semibold text-ink-soft leading-none"><NoTranslate>{ac.profile.full_name}</NoTranslate></div>
                            <div className="text-[10px] text-ink-mute mt-0.5">{"Assistant Coach(es)"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-ink-mute italic">{"No coach assigned yet"}</span>
                  )}
                </div>
              </div>

              {/* 3. Student Profile & Contact Details Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-line shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Icon name="user" className="w-4 h-4" />
                  </div>
                  <h4 className="font-display font-bold text-sm text-ink">{"Student Profile & Contact"}</h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5 text-sm">
                  <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                    <span className="text-xs text-ink-mute flex items-center gap-1.5">
                      <Icon name="mail" className="w-3.5 h-3.5 text-ink-mute" />
                      <span>{"Login email"}</span>
                    </span>
                    <div className="font-semibold text-ink break-all text-xs sm:text-sm font-mono">
                      <NoTranslate>{profile?.email ?? "—"}</NoTranslate>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                    <span className="text-xs text-ink-mute flex items-center gap-1.5">
                      <Icon name="whatsapp" className="w-3.5 h-3.5 text-ink-mute" />
                      <span>{"Student phone / WA"}</span>
                    </span>
                    <div className="font-semibold text-ink text-xs sm:text-sm">
                      <NoTranslate>{profile?.phone ?? "—"}</NoTranslate>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                    <span className="text-xs text-ink-mute flex items-center gap-1.5">
                      <Icon name="calendar" className="w-3.5 h-3.5 text-ink-mute" />
                      <span>{"Date of birth"}</span>
                    </span>
                    <div className="font-semibold text-ink text-xs sm:text-sm">
                      {profile?.birth_date ? (
                        <>
                          <span>{fmtDate(profile.birth_date)}</span>
                          {age !== null && (
                            <span className="text-ink-mute font-normal text-xs ml-1.5">
                              ({`${age} years old`})
                            </span>
                          )}
                        </>
                      ) : "—"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                    <span className="text-xs text-ink-mute flex items-center gap-1.5">
                      <Icon name="users" className="w-3.5 h-3.5 text-ink-mute" />
                      <span>{"Gender"}</span>
                    </span>
                    <div className="font-semibold text-ink text-xs sm:text-sm">
                      {profile?.gender === "male"
                        ? "Male"
                        : profile?.gender === "female"
                        ? "Female"
                        : "—"}
                    </div>
                  </div>

                  {profile?.address && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-paper-tint/50 border border-line/60 space-y-1">
                      <span className="text-xs text-ink-mute flex items-center gap-1.5">
                        <Icon name="pin" className="w-3.5 h-3.5 text-ink-mute" />
                        <span>{"Address"}</span>
                      </span>
                      <div className="font-medium text-ink text-xs sm:text-sm leading-relaxed">
                        <NoTranslate>{profile.address}</NoTranslate>
                      </div>
                    </div>
                  )}
                </div>

                {/* Health Notes Banner if present */}
                {profile?.health_notes && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                    <Icon name="warning" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">{"Health History / Allergies"}</span>
                      <p className="leading-relaxed"><NoTranslate>{profile.health_notes}</NoTranslate></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}
