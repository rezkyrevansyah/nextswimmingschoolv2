"use client";
import Icon from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Placeholder from "@/components/ui/Placeholder";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { getSlotTime } from "../../_utils";
import { fmtIDR } from "@/lib/utils";
import type { useClassData } from "./useClassData";

type ClassDataHook = ReturnType<typeof useClassData>;

export default function ClassGrid({ hook }: { hook: ClassDataHook }) {
  const { dayLabels, visibleClasses, openPackages, openClassAtt, openEdit, archiveClass, restoreClass } = hook;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {visibleClasses.map((c) => {
        const archived = c.status === "archived";
        const coachNames = [...(c.class_coaches ?? [])]
          .sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0))
          .map(cc => cc.profile?.full_name).filter(Boolean) ?? [];
        const pct = c.enrolled / (c.capacity || 1);
        return (
          <Card key={c.id} padded={false} className={`overflow-hidden${archived ? " opacity-70" : ""}`}>
            <div className="relative">
              {c.photo_url
                ? <div className="aspect-video w-full overflow-hidden bg-paper-deep"><img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" /></div>
                : <Placeholder label={c.id} ratio="16/9" className="rounded-none border-0" />
              }
              <div className="absolute top-3 left-3 right-3 flex justify-between gap-2">
                {archived && <Status kind="archived">{"Archived"}</Status>}
              </div>
            </div>
            <div className="p-4">
              <div className="font-display font-bold text-ink"><NoTranslate>{c.name}</NoTranslate></div>
              {c.location_type === "external" && c.external_location_name && (
                <div className="mt-1.5 text-xs font-semibold text-wave-700 bg-wave-50 border border-wave-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <span>🏡 <NoTranslate>{c.external_location_name}</NoTranslate></span>
                  {c.google_maps_url && (
                    <a href={c.google_maps_url} target="_blank" rel="noreferrer" className="ml-auto text-[10px] font-bold text-wave-600 hover:underline">
                      {"Maps ↗"}
                    </a>
                  )}
                </div>
              )}
              <div className="text-xs text-ink-mute mt-0.5 space-y-0.5">
                {(c.schedule_days ?? []).length > 0
                  ? (c.schedule_days ?? []).map(day => {
                      const slotT = getSlotTime(c, day);
                      return <div key={day}>{dayLabels[day] ?? day} · {slotT.time_start?.slice(0,5)}{slotT.time_end ? `–${slotT.time_end.slice(0,5)}` : ""}</div>;
                    })
                  : <div>—</div>
                }
              </div>
              {coachNames.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm"><Avatar name={coachNames[0]!} size={24} /><span className="text-ink-soft font-medium"><NoTranslate>{coachNames[0]}</NoTranslate></span></div>
              )}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
                  <span>{"Capacity"}</span>
                  <span className={`font-mono ${pct >= 1 ? "text-danger-500" : pct > 0.7 ? "text-warn-600" : "text-ok-600"}`}>{c.enrolled}/{c.capacity}</span>
                </div>
                <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
                  <div className={`h-full ${pct >= 1 ? "bg-danger-500" : pct > 0.7 ? "bg-warn-500" : "bg-ok-500"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {(c.coach_spreadsheets ?? []).length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ok-600">
                    <Icon name="link" className="w-3 h-3" />{`${c.coach_spreadsheets!.length} spreadsheet`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warn-500">
                    <Icon name="warning" className="w-3 h-3" />{"No spreadsheet yet"}
                  </span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                {c.class_type === "private" ? (
                  <div>
                    <div className="text-xs text-ink-mute font-semibold">{"Private"}</div>
                    <div className="text-xs text-ink-mute">{`${(c.packages ?? []).filter(p => p.active).length} active packages`}</div>
                  </div>
                ) : (
                  <div className="font-display font-bold text-ocean-700">{fmtIDR(c.price_monthly)}<span className="text-xs text-ink-mute font-semibold">{"/mo"}</span></div>
                )}
                <div className="flex gap-1">
                  {archived ? (
                    <button onClick={() => restoreClass(c)} title={"Restore"} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ok-600 flex items-center justify-center"><Icon name="check" className="w-4 h-4" /></button>
                  ) : (
                    <>
                      {c.class_type === "private" && (
                        <button onClick={() => openPackages(c)} title={"Pricing packages"} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="invoice" className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => openClassAtt(c)} title={"Student attendance"} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-wave-600 flex items-center justify-center"><Icon name="calendar" className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(c)} title={"Edit class"} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                      <button onClick={() => archiveClass(c)} title={"Archive"} className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-danger-500 flex items-center justify-center"><Icon name="archive" className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
