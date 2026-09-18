"use client";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useAdminRaporData } from "./useAdminRaporData";

type AdminRaporDataHook = ReturnType<typeof useAdminRaporData>;

export default function AdminRaporDetailModal({ hook }: { hook: AdminRaporDataHook }) {
  const { open, setOpen, selectedPeriod, downloadingId, handleDownloadOne } = hook;

  return (
    <Modal
      open={!!open}
      onClose={() => setOpen(null)}
      title={(<>{"Report Card — "}<NoTranslate>{open?.full_name ?? ""}</NoTranslate></>)}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Btn variant="soft" size="sm" icon="download" disabled={downloadingId === open?.id}
            onClick={() => open && void handleDownloadOne(open)}>
            {downloadingId === open?.id ? "Downloading…" : "Download PDF"}
          </Btn>
          <Btn variant="primary" onClick={() => setOpen(null)}>{"Close"}</Btn>
        </div>
      }
    >
      {open && (
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="flex items-center gap-3">
              <Avatar name={open.full_name} size={42} />
              <div>
                <div className="font-semibold text-ink"><NoTranslate>{open.full_name}</NoTranslate></div>
                <div className="text-xs text-ink-mute"><NoTranslate>{open.class_name} · {open.coach_name}</NoTranslate> · {selectedPeriod?.label}</div>
              </div>
            </div>
          </Card>
          <div className="space-y-3">
            {open.criteria.length > 0
              ? open.criteria.map(c => {
                  const val = open.scores[c.id];
                  if (val == null) return null;
                  const numVal = typeof val === "number" ? val : null;
                  const strVal = typeof val === "string" ? val : null;
                  const max = c.kind === "score_10" ? 10 : c.kind === "score_100" ? 100 : null;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-ink"><NoTranslate>{c.label}</NoTranslate></span>
                        {numVal != null && max && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                      </div>
                      {numVal != null && max && (
                        <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                          <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                        </div>
                      )}
                      {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1"><NoTranslate>{strVal}</NoTranslate></p>}
                    </div>
                  );
                })
              : Object.entries(open.scores).map(([key, val]) => {
                  const numVal = typeof val === "number" ? val : null;
                  const strVal = typeof val === "string" ? val : null;
                  const max = numVal !== null && numVal <= 10 ? 10 : 100;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-ink capitalize"><NoTranslate>{key.replace(/_/g, " ")}</NoTranslate></span>
                        {numVal != null && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                      </div>
                      {numVal != null && (
                        <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                          <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                        </div>
                      )}
                      {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1"><NoTranslate>{strVal}</NoTranslate></p>}
                    </div>
                  );
                })
            }
            {open.notes && (
              <div>
                <div className="font-semibold text-ink text-sm mb-1">{"Coach's notes"}</div>
                <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed"><NoTranslate>{open.notes}</NoTranslate></p>
              </div>
            )}
            {Object.keys(open.scores).length === 0 && !open.notes && (
              <div className="text-center py-6 text-sm text-ink-mute">{"Coach hasn't filled in scores for this period yet."}</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
