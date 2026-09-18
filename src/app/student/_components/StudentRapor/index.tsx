"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import { useStudentRaporData } from "./useStudentRaporData";
import RaporDetailModal from "./RaporDetailModal";

export default function StudentRapor({ studentId, studentName, branchId, avatarUrl, studentNo, birthDate, location }: {
  studentId: string; studentName: string; branchId: string;
  avatarUrl?: string | null; studentNo?: string | null; birthDate?: string | null; location?: string;
}) {
  const hook = useStudentRaporData({ studentId, branchId });
  const {
    raporTab, setRaporTab, entries, competitionsHistory,
    openRapor, draftKey, getDraft, setDraft, saveReview, savingSlot,
  } = hook;

  // Separate open-period entries from closed-period (history)
  const openEntries = entries.filter((e) => e.period_is_open);
  const historyEntries = entries.filter((e) => !e.period_is_open);
  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="space-y-5">
      {/* Sub-tab toggle */}
      <div className="flex gap-1 bg-paper-tint border border-line rounded-xl p-1 w-fit">
        {([{ id: "rapor", label: "Report Card" }, { id: "review", label: "Coach Review" }] as const).map(tab => (
          <button key={tab.id} onClick={() => setRaporTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${raporTab === tab.id ? "bg-white text-ocean-700 shadow-card" : "text-ink-soft hover:bg-white/60"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {raporTab === "rapor" && (
      <>
      {/* Active / open period rapor */}
      {openEntries.length > 0 && (
        <>
          {openEntries.map((entry) => (
            <div key={entry.id} className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
              <div className="caustics absolute inset-0 opacity-30" />
              <div className="relative flex items-center gap-3">
                <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"><Icon name="book" className="w-7 h-7" /></span>
                <div>
                  <div className="text-wave-200 text-[10px] uppercase tracking-widest font-bold">{(<>{"Active report card · "}<NoTranslate>{entry.period}</NoTranslate></>)}</div>
                  <div className="font-display font-bold text-xl mt-0.5"><NoTranslate>{entry.class_name}</NoTranslate></div>
                  <div className="text-white/80 text-xs mt-0.5"><NoTranslate>{entry.coach_name}</NoTranslate></div>
                </div>
                <Btn variant="accent" size="sm" className="ml-auto" onClick={() => openRapor(entry)}>{"Open"}</Btn>
              </div>
            </div>
          ))}
        </>
      )}

      {openEntries.length === 0 && entries.length === 0 && (
        <div className="text-center py-12 text-ink-mute text-sm">{"No report cards available yet."}</div>
      )}

      {openEntries.length === 0 && entries.length > 0 && (
        <div className="rounded-xl border border-line bg-paper-tint p-4 text-sm text-ink-mute text-center">{"No report card period is currently active."}</div>
      )}

      {/* Competitions & Achievements Showcase */}
      {competitionsHistory.length > 0 && (
        <>
          <SectionTitle sub="Prestasi & riwayat keikutsertaan perlombaan renang">
            🏆 Riwayat Perlombaan & Medali ({competitionsHistory.length})
          </SectionTitle>
          <div className="space-y-2.5">
            {competitionsHistory.map((item) => {
              const compName = item.competition?.name || "Perlombaan";
              const compDate = item.competition?.start_date ? fmtDate(item.competition.start_date) : "—";
              const compLoc = item.competition?.location || item.competition?.city || "";
              const medalBadge =
                item.award === "gold" ? "🥇 Medali Emas" :
                item.award === "silver" ? "🥈 Medali Perak" :
                item.award === "bronze" ? "🥉 Medali Perunggu" :
                item.award === "custom" && item.custom_award_label ? <>🏆 <NoTranslate>{item.custom_award_label}</NoTranslate></> :
                item.rank ? `Juara ${item.rank}` : "🏊 Peserta";

              return (
                <Card key={item.id} className="!p-4 bg-white hover:border-ocean-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-bold text-ocean-900 text-base"><NoTranslate>{compName}</NoTranslate></div>
                      <div className="text-xs text-ink-mute mt-0.5">
                        📅 {compDate} {compLoc ? <>· 📍 <NoTranslate>{compLoc}</NoTranslate></> : ""}
                      </div>
                      <div className="mt-1 font-semibold text-ocean-700 text-xs">
                        <NoTranslate>{item.category}</NoTranslate> {item.age_group ? <>(<NoTranslate>{item.age_group}</NoTranslate>)</> : ""}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 shrink-0">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                        {medalBadge}
                      </span>
                      {item.time_formatted && (
                        <div className="font-mono font-bold text-ocean-700 text-xs mt-0.5">
                          ⏱️ {item.time_formatted}
                        </div>
                      )}
                      {item.certificate_url && (
                        <a
                          href={item.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-ocean-600 hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          <Icon name="eye" className="w-3.5 h-3.5" /> Lihat Sertifikat
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* History rapor (closed periods) */}
      {historyEntries.length > 0 && (
        <>
          <SectionTitle sub={"Ended periods"}>{"Report Card History"}</SectionTitle>
          <div className="space-y-2.5">
            {historyEntries.map((r) => (
              <Card key={r.id} className="!p-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-paper-tint text-ink-soft flex items-center justify-center"><Icon name="book" className="w-4 h-4" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm"><NoTranslate>{r.period}</NoTranslate></div>
                    <div className="text-xs text-ink-mute"><NoTranslate>{r.coach_name} · {r.class_name}</NoTranslate></div>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => openRapor(r)}>{"Open"}</Btn>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      </>
      )}

      {raporTab === "review" && (
        <>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-ink-mute text-sm">{"No report cards available for review yet."}</div>
          ) : (
            <div className="space-y-4">
              {entries.map(entry => (
                <Card key={entry.id} className="space-y-4">
                  <div>
                    <div className="font-display font-bold text-ink"><NoTranslate>{entry.class_name}</NoTranslate></div>
                    <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{entry.period}</NoTranslate>{!entry.period_is_open && " · period ended"}</div>
                  </div>
                  {entry.coachReviews.length === 0 ? (
                    <p className="text-xs text-ink-faint italic">{"No coaches registered in this class."}</p>
                  ) : (
                    <div className="space-y-3">
                      {entry.coachReviews.map(slot => {
                        const key = draftKey(entry.id, slot.coach_id);
                        const draft = getDraft(entry, slot);
                        const isSaving = savingSlot === key;
                        return (
                          <div key={slot.coach_id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar name={slot.coach_name} size={28} />
                              <span className="font-semibold text-sm text-ink"><NoTranslate>{slot.coach_name}</NoTranslate></span>
                              {slot.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide">{"Head"}</span>}
                            </div>
                            {entry.period_is_open ? (
                              <div className="bg-wave-50 border border-wave-100 rounded-2xl p-4">
                                <div className="flex items-center gap-0.5 mb-3">
                                  {Array.from({ length: 5 }).map((_, k) => (
                                    <button key={k} onClick={() => setDraft(entry, slot, { stars: k + 1 })} className="p-1 rounded-lg hover:bg-wave-100 transition-colors">
                                      <Icon name="star" className={`w-7 h-7 transition-colors ${k < draft.stars ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < draft.stars ? "currentColor" : "none"} />
                                    </button>
                                  ))}
                                  <span className="ml-2 text-sm font-semibold text-ink-soft">{ratingLabels[draft.stars]}</span>
                                </div>
                                <div className="relative">
                                  <Textarea rows={2} maxLength={300} className="pb-5" placeholder={"E.g. Coach is very patient and teaching methods are fun for the kids."} value={draft.text} onChange={(e) => setDraft(entry, slot, { text: e.target.value })} />
                                  <span className={`absolute bottom-2 right-3 text-[10px] font-mono tabular-nums pointer-events-none ${300 - draft.text.length <= 20 ? "text-danger-500 font-bold" : "text-ink-faint"}`}>
                                    {draft.text.length}/300
                                  </span>
                                </div>
                                <Btn variant="primary" size="sm" className="mt-3" disabled={isSaving} onClick={() => saveReview(entry, slot)}>
                                  {isSaving ? "Saving…" : slot.review_id ? "Update review" : "Save review"}
                                </Btn>
                              </div>
                            ) : (
                              <div className="bg-paper-tint border border-line rounded-2xl p-4">
                                {slot.review_stars ? (
                                  <>
                                    <div className="flex items-center gap-0.5 mb-2">
                                      {Array.from({ length: 5 }).map((_, k) => (
                                        <Icon key={k} name="star" className={`w-5 h-5 ${k < (slot.review_stars ?? 0) ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < (slot.review_stars ?? 0) ? "currentColor" : "none"} />
                                      ))}
                                      <span className="ml-2 text-xs font-semibold text-ink-soft">{ratingLabels[slot.review_stars]}</span>
                                    </div>
                                    {slot.review_message && <p className="text-sm text-ink-soft"><NoTranslate>{slot.review_message}</NoTranslate></p>}
                                  </>
                                ) : (
                                  <p className="text-sm text-ink-mute">{"Period has ended — no review submitted."}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <RaporDetailModal hook={hook} studentId={studentId} studentName={studentName} avatarUrl={avatarUrl} studentNo={studentNo} birthDate={birthDate} location={location} />
    </div>
  );
}
