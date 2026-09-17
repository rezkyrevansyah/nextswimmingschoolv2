"use client";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { useLocale } from "@/components/providers/LocaleProvider";
import { downloadRaporPdf, printSingleRaporPopup } from "@/lib/printRapor";
import { buildSchoolRaporSignatures } from "@/lib/rapor";
import type { useMemberRaporData } from "./useMemberRaporData";

export default function RaporDetailModal({ hook, memberId, memberName, avatarUrl, memberNo, birthDate, location }: {
  hook: ReturnType<typeof useMemberRaporData>;
  memberId: string; memberName: string;
  avatarUrl?: string | null; memberNo?: string | null; birthDate?: string | null; location?: string;
}) {
  const { t } = useLocale();
  const { open, setOpen, selectedEntry, schoolInfo, ownerSettings } = hook;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={t("member.rapor.modalTitle", { period: selectedEntry?.period ?? "" })} size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          {selectedEntry && (() => {
            const signatures = buildSchoolRaporSignatures(schoolInfo, selectedEntry.coach_name, selectedEntry.coach_signature_url, ownerSettings);
            const raporData = {
              member_id: memberId, period_id: selectedEntry.period_id,
              full_name: memberName,
              member_no: memberNo ?? undefined,
              birth_date: birthDate ?? undefined,
              avatar_url: avatarUrl ?? undefined,
              location: location ?? undefined,
              level: selectedEntry.level ?? undefined,
              class_name: selectedEntry.class_name,
              coach_name: selectedEntry.coach_name,
              period_label: selectedEntry.period,
              scores: selectedEntry.scores,
              notes: selectedEntry.notes,
              personality: selectedEntry.personality,
              motivation: selectedEntry.motivation,
              learning_achievements: selectedEntry.learning_achievements,
              criteria: selectedEntry.criteria,
              best_times: selectedEntry.best_times,
              level_strokes: selectedEntry.level_strokes,
              level_distances: selectedEntry.level_distances,
              coach_signature_url: selectedEntry.coach_signature_url,
              school_logo_url: schoolInfo?.logo_url,
              signatures,
            };
            return (<>
              <Btn variant="outline" size="sm" icon="printer"
                onClick={() => printSingleRaporPopup(raporData)}>
                {t("common.actions.print")}
              </Btn>
              <Btn variant="soft" size="sm" icon="download"
                onClick={() => void downloadRaporPdf(raporData)}>
                {t("member.rapor.downloadPdf")}
              </Btn>
            </>);
          })()}
          <Btn variant="primary" onClick={() => setOpen(false)}>{t("common.actions.close")}</Btn>
        </div>
      }>
      {selectedEntry && (
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="flex items-center gap-3"><Avatar name={memberName} size={42} /><div><div className="font-semibold text-ink">{memberName}</div><div className="text-xs text-ink-mute">{selectedEntry.class_name} · {selectedEntry.coach_name}</div></div></div>
          </Card>
          <div className="space-y-3">
            {(() => {
              const criteriaMap = new Map(selectedEntry.criteria.map(c => [c.id, c]));
              const orderedEntries = selectedEntry.criteria.length > 0
                ? selectedEntry.criteria.filter(c => c.id in selectedEntry.scores).map(c => [c.id, selectedEntry.scores[c.id]] as [string, number | string])
                : Object.entries(selectedEntry.scores);
              return orderedEntries.map(([key, val]) => {
                const crit = criteriaMap.get(key);
                const label = crit?.label ?? key.replace(/_/g, " ");
                const numVal = typeof val === "number" ? val : null;
                const strVal = typeof val === "string" ? val : null;
                const isScore = numVal !== null;
                const max = crit?.kind === "score_10" ? 10 : crit?.kind === "score_100" ? 100 : (numVal !== null && numVal <= 10 ? 10 : 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink capitalize">{label}</span>
                      {isScore && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                    </div>
                    {isScore && (
                      <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                        <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                      </div>
                    )}
                    {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                  </div>
                );
              });
            })()}
            {selectedEntry.notes && (
              <div>
                <div className="font-semibold text-ink text-sm mb-1">{t("member.rapor.coachNotes")}</div>
                <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed">{selectedEntry.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
