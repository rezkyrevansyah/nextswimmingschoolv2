"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { downloadRaporPdf, printSingleRaporPopup, fmtSwimTime, type PrintCriterion } from "@/lib/printRapor";
import { resolveRaporSigner, buildSchoolRaporSignatures } from "@/lib/rapor";
import type { useCoachRaporData } from "./useCoachRaporData";

export default function ViewRaporModal({ hook, coachName, branchName }: { hook: ReturnType<typeof useCoachRaporData>; coachName: string; branchName: string }) {
  const { viewing, setViewing, viewBestTimes, setViewBestTimes, period, signatureUrl, ownerSettings } = hook;

  return (
    <Modal
      open={!!viewing}
      onClose={() => { setViewing(null); setViewBestTimes([]); }}
      title={(<>{"Report Card — "}<NoTranslate>{viewing?.member?.profile?.full_name ?? ""}</NoTranslate></>)}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={() => { setViewing(null); setViewBestTimes([]); }}>{"Close"}</Btn>
          {viewing && period && (() => {
            const vScores = (viewing as unknown as { scores?: Record<string, number | string> }).scores ?? {};
            const vNotes  = (viewing as unknown as { notes?: string | null }).notes ?? null;
            const vClass  = (viewing as unknown as { class?: { rapor_signer_coach_id?: string | null; class_coaches?: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } }).class;
            const vCrit   = [...(viewing.rapor_levels?.rapor_level_criteria ?? [])]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(c => ({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] }));
            const signer  = resolveRaporSigner(vClass?.class_coaches ?? [], vClass?.rapor_signer_coach_id);
            const memSchool = (viewing.member as unknown as { school?: { id: string; name: string; logo_url: string | null; show_coach_sig?: boolean; show_head_sig?: boolean; show_school_sig?: boolean; coach_sig_title?: string; head_sig_title?: string; school_signatures?: { name: string; title: string; image_url: string; is_active: boolean }[] } | null })?.school;
            const coachSig = signer?.signature_url ?? signatureUrl;
            const signatures = buildSchoolRaporSignatures(memSchool, signer?.full_name ?? coachName, coachSig, ownerSettings);
            const raporData = {
              member_id: viewing.member_id, period_id: period.id,
              full_name: viewing.member?.profile?.full_name ?? "",
              member_no: viewing.member?.member_no ?? undefined,
              avatar_url: viewing.member?.profile?.avatar_url ?? undefined,
              birth_date: viewing.member?.profile?.birth_date ?? undefined,
              location: branchName || undefined,
              class_name: viewing.class?.name ?? "",
              coach_name: signer?.full_name ?? coachName,
              period_label: period.label,
              level: viewing.level ?? undefined,
              scores: vScores,
              notes: vNotes,
              personality: viewing.personality ?? undefined,
              motivation: viewing.motivation ?? undefined,
              learning_achievements: viewing.learning_achievements ?? undefined,
              criteria: vCrit,
              best_times: viewBestTimes,
              coach_signature_url: coachSig,
              school_logo_url: memSchool?.logo_url,
              signatures: signatures,
            };
            return (<>
              <Btn variant="outline" size="sm" icon="printer"
                onClick={() => printSingleRaporPopup(raporData)}>
                {"Print"}
              </Btn>
              <Btn variant="primary" size="sm" icon="download"
                onClick={() => void downloadRaporPdf(raporData)}>
                {"Download PDF"}
              </Btn>
            </>);
          })()}
        </>
      }
    >
      {viewing && (() => {
        const vScores   = (viewing as unknown as { scores?: Record<string, number | string> }).scores ?? {};
        const vNotes    = (viewing as unknown as { notes?: string | null }).notes ?? null;
        const vCriteria = [...(viewing.rapor_levels?.rapor_level_criteria ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(c => ({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] }));
        const critMap   = new Map(vCriteria.map(c => [c.id, c]));
        return (
          <div className="space-y-4">
            {/* Header */}
            <Card className="!p-3 bg-paper-tint">
              <div className="flex items-center gap-3">
                <Avatar name={viewing.member?.profile?.full_name ?? "?"} src={viewing.member?.profile?.avatar_url ?? undefined} size={42} />
                <div>
                  <div className="font-semibold text-ink"><NoTranslate>{viewing.member?.profile?.full_name}</NoTranslate></div>
                  <div className="text-xs text-ink-mute"><NoTranslate>{viewing.class?.name}</NoTranslate> · <NoTranslate>{period?.label}</NoTranslate></div>
                </div>
              </div>
            </Card>

            {/* Level */}
            {viewing.level && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-ink-soft">{"Level:"}</span>
                <span className="font-semibold text-ink"><NoTranslate>{viewing.level}</NoTranslate></span>
              </div>
            )}

            {/* Scores */}
            <div className="space-y-3">
              {(vCriteria.length > 0
                ? vCriteria.filter(c => c.id in vScores).map(c => [c.id, vScores[c.id]] as [string, number | string])
                : Object.entries(vScores)
              ).map(([key, val]) => {
                const crit   = critMap.get(key);
                const label  = crit?.label ?? key.replace(/_/g, " ");
                const numVal = typeof val === "number" ? val : null;
                const strVal = typeof val === "string" ? val : null;
                const max    = crit?.kind === "score_10" ? 10 : 100;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink capitalize"><NoTranslate>{label}</NoTranslate></span>
                      {numVal !== null && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                    </div>
                    {numVal !== null && (
                      <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                        <div
                          className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`}
                          style={{ width: `${(numVal / max) * 100}%` }}
                        />
                      </div>
                    )}
                    {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1"><NoTranslate>{strVal}</NoTranslate></p>}
                  </div>
                );
              })}
              {Object.keys(vScores).length === 0 && (
                <p className="text-sm text-ink-mute italic">{"No scores yet."}</p>
              )}
            </div>

            {/* Notes */}
            {vNotes && (
              <div>
                <div className="font-semibold text-ink text-sm mb-1">{"Coach notes"}</div>
                <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed"><NoTranslate>{vNotes}</NoTranslate></p>
              </div>
            )}

            {/* Personal Best Times */}
            {viewBestTimes.length > 0 && (
              <div>
                <div className="font-semibold text-ink text-sm mb-2">{"Personal Best Time"}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-ocean-600 text-white">
                        <th className="text-left px-3 py-2 font-semibold rounded-tl-lg">{"Stroke"}</th>
                        <th className="text-center px-3 py-2 font-semibold">{"Distance"}</th>
                        <th className="text-center px-3 py-2 font-semibold rounded-tr-lg">{"Time"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewBestTimes.map((bt, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-paper" : "bg-paper-tint"}>
                          <td className="px-3 py-2 font-medium text-ink uppercase"><NoTranslate>{bt.stroke}</NoTranslate></td>
                          <td className="px-3 py-2 text-center text-ink-soft">{bt.distance}m</td>
                          <td className="px-3 py-2 text-center font-mono text-ink">{fmtSwimTime(bt.time_seconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Personality / Motivation / Learning */}
            {(viewing.personality || viewing.motivation || viewing.learning_achievements) && (
              <div className="space-y-2 pt-2 border-t border-line">
                {[
                  { label: "Personality", value: viewing.personality },
                  { label: "Learning motivation", value: viewing.motivation },
                  { label: "Learning achievements", value: viewing.learning_achievements },
                ].filter(x => x.value).map(x => (
                  <div key={x.label} className="flex items-baseline gap-2 text-sm">
                    <span className="text-ink-mute min-w-[148px] shrink-0">{x.label}</span>
                    <span className="text-ink font-medium"><NoTranslate>{x.value}</NoTranslate></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </Modal>
  );
}
