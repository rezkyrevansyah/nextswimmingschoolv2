"use client";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useToast } from "@/components/providers/ToastProvider";
import { useCoachRaporData } from "./useCoachRaporData";
import EntryFormModal from "./EntryFormModal";
import ViewRaporModal from "./ViewRaporModal";
import CoachMyReviews from "./CoachMyReviews";

export default function CoachRapor({ coachId, branchId, coachName, branchName }: { coachId: string; branchId: string; coachName: string; branchName: string }) {
  const hook = useCoachRaporData({ coachId, branchId, coachName, branchName });
  const {
    period, loading, entries,
    totalFilled, totalPending, pct,
    signatureUrl, sigUploading, setSigUploading, setSignatureUrl,
    upload, fileUploading,
    paginated, openView, openEntry,
    setPage, totalPages, safePage,
  } = hook;

  const toast = useToast();

  return (
    <div className="space-y-5">
      {/* Hero period card */}
      {period ? (
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-wave-500/30 blur-2xl" />
          <div className="relative">
            <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> {"Active period"}
            </div>
            <div className="font-display font-bold text-2xl mt-0.5"><NoTranslate>{period.label}</NoTranslate></div>
            {!loading && (
              <div className="flex flex-wrap gap-2.5 mt-3">
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Filled in"}</div>
                  <div className="font-display font-bold text-xl text-ok-300">{totalFilled}</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Not yet filled"}</div>
                  <div className="font-display font-bold text-xl text-warn-300">{totalPending}</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Completion"}</div>
                  <div className="font-display font-bold text-xl">{pct}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card><p className="text-ink-mute">{"No active report card period."}</p></Card>
      )}

      {/* Progress summary card */}
      {period && !loading && entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-line shadow-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold text-ink">{"Report Card Progress"}</div>
            <div className="text-sm font-bold text-ocean-700 tabular-nums">{`${totalFilled}/${entries.length} students`}</div>
          </div>
          <div className="h-2.5 bg-paper-deep rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-ok-500" : pct >= 50 ? "bg-wave-500" : "bg-warn-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center">
              <div className="font-display font-bold text-lg text-ok-600">{totalFilled}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">{"Done"}</div>
            </div>
            <div className="text-center border-x border-line">
              <div className="font-display font-bold text-lg text-warn-600">{totalPending}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">{"Pending"}</div>
            </div>
            <div className="text-center flex flex-col items-center gap-1">
              {pct === 100
                ? <Status kind="approved" dot={false}>{"All Done"}</Status>
                : pct > 0
                ? <Status kind="pending" dot={false}>{`${pct}% done`}</Status>
                : <Status kind="inactive" dot={false}>{"Not started"}</Status>}
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">{"Status"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Signature upload card */}
      {period && (
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-ink">{"Report Card Signature"}</p>
              <p className="text-xs text-ink-mute mt-0.5">
                {"Upload a signature to show on report cards you print for students"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {signatureUrl && (
                <img
                  src={signatureUrl}
                  alt={"Signature"}
                  className="h-12 max-w-[120px] object-contain border border-line rounded-lg bg-paper-tint px-2"
                />
              )}
              <label className={`cursor-pointer inline-flex items-center justify-center font-semibold transition-colors text-xs px-3 py-1.5 rounded-lg gap-1.5 border border-line text-ink-soft hover:bg-paper-tint hover:border-line-strong ${(sigUploading || fileUploading) ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={sigUploading || fileUploading}
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    setSigUploading(true);
                    try {
                      const url = await upload.signature(file);
                      setSignatureUrl(url);
                      toast.success("Signature uploaded successfully");
                    } catch (err) {
                      toast.error("Failed to upload signature", (err as Error).message);
                    } finally {
                      setSigUploading(false);
                      ev.target.value = "";
                    }
                  }}
                />
                {sigUploading ? "Uploading…" : signatureUrl ? "Change Signature" : "Upload Signature"}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Entry list */}
      {loading ? <div className="text-ink-mute text-sm">{"Loading…"}</div> : (
        <div className="space-y-3">
          {paginated.map((e) => (
            <Card key={e.id || e.student_id} className="flex items-center gap-3">
              <Avatar name={e.student?.profile?.full_name ?? "?"} src={e.student?.profile?.avatar_url ?? undefined} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate"><NoTranslate>{e.student?.profile?.full_name}</NoTranslate></div>
                <div className="text-xs text-ink-mute"><NoTranslate>{e.class?.name}</NoTranslate></div>
              </div>
              {e.locked ? <Status kind="approved">{"Done"}</Status> : <Status kind="pending">{"Pending"}</Status>}
              {e.locked && (
                <Btn variant="outline" size="sm" onClick={() => openView(e)}>{"View"}</Btn>
              )}
              <Btn variant={e.locked ? "ghost" : "primary"} size="sm" onClick={() => openEntry(e)}>
                {e.locked ? "Edit" : "Fill in report"}
              </Btn>
            </Card>
          ))}
          {entries.length === 0 && period && <p className="text-ink-mute text-sm">{"No report card entries for this period yet."}</p>}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-xs text-ink-mute tabular-nums">
                {`${entries.length} students · page ${safePage + 1}/${totalPages}`}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
                <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                  .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                    if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((item, idx) => item === "…"
                    ? <span key={`e${idx}`} className="px-2 text-ink-faint text-sm">…</span>
                    : <button key={item} type="button" onClick={() => setPage(item as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${safePage === item ? "bg-ocean-600 text-white" : "border border-line text-ink-mute hover:bg-paper-tint"}`}>{(item as number) + 1}</button>
                  )
                }
                <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
                <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      <EntryFormModal hook={hook} />
      <ViewRaporModal hook={hook} coachName={coachName} branchName={branchName} />

      <div>
        <SectionTitle sub={"Student reviews about you"}>{"My Reviews"}</SectionTitle>
        <CoachMyReviews coachId={coachId} />
      </div>
    </div>
  );
}
