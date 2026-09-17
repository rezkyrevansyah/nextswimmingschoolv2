"use client";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useCoachRaporData } from "./useCoachRaporData";
import EntryFormModal from "./EntryFormModal";
import ViewRaporModal from "./ViewRaporModal";
import CoachMyReviews from "./CoachMyReviews";

export default function CoachRapor({ coachId, branchId, coachName, branchName }: { coachId: string; branchId: string; coachName: string; branchName: string }) {
  const { t } = useLocale();
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
              <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> {t("coach.rapor.activePeriodBadge")}
            </div>
            <div className="font-display font-bold text-2xl mt-0.5">{period.label}</div>
            {!loading && (
              <div className="flex flex-wrap gap-2.5 mt-3">
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("coach.rapor.filledCount")}</div>
                  <div className="font-display font-bold text-xl text-ok-300">{totalFilled}</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("coach.rapor.pendingCount")}</div>
                  <div className="font-display font-bold text-xl text-warn-300">{totalPending}</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{t("coach.rapor.completionLabel")}</div>
                  <div className="font-display font-bold text-xl">{pct}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card><p className="text-ink-mute">{t("coach.rapor.noActivePeriod")}</p></Card>
      )}

      {/* Progress summary card */}
      {period && !loading && entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-line shadow-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold text-ink">{t("coach.rapor.progressTitle")}</div>
            <div className="text-sm font-bold text-ocean-700 tabular-nums">{t("coach.rapor.progressCount", { filled: totalFilled, total: entries.length })}</div>
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
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">{t("coach.rapor.completedLabel")}</div>
            </div>
            <div className="text-center border-x border-line">
              <div className="font-display font-bold text-lg text-warn-600">{totalPending}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">{t("coach.rapor.pendingLabelShort")}</div>
            </div>
            <div className="text-center flex flex-col items-center gap-1">
              {pct === 100
                ? <Status kind="approved" dot={false}>{t("coach.rapor.allDoneBadge")}</Status>
                : pct > 0
                ? <Status kind="pending" dot={false}>{t("coach.rapor.percentDoneBadge", { pct })}</Status>
                : <Status kind="inactive" dot={false}>{t("coach.rapor.notStartedBadge")}</Status>}
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">{t("coach.rapor.statusLabel")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Signature upload card */}
      {period && (
        <div className="bg-white rounded-2xl border border-line shadow-card p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-ink">{t("coach.rapor.signatureTitle")}</p>
              <p className="text-xs text-ink-mute mt-0.5">
                {t("coach.rapor.signatureHint")}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {signatureUrl && (
                <img
                  src={signatureUrl}
                  alt={t("coach.rapor.signatureAlt")}
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
                      toast.success(t("coach.rapor.signatureUploadedToast"));
                    } catch (err) {
                      toast.error(t("coach.rapor.signatureUploadFailedTitle"), (err as Error).message);
                    } finally {
                      setSigUploading(false);
                      ev.target.value = "";
                    }
                  }}
                />
                {sigUploading ? t("coach.rapor.uploadingBtn") : signatureUrl ? t("coach.rapor.changeSignatureBtn") : t("coach.rapor.uploadSignatureBtn")}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Entry list */}
      {loading ? <div className="text-ink-mute text-sm">{t("coach.leave.loadingEllipsis")}</div> : (
        <div className="space-y-3">
          {paginated.map((e) => (
            <Card key={e.id || e.member_id} className="flex items-center gap-3">
              <Avatar name={e.member?.profile?.full_name ?? "?"} src={e.member?.profile?.avatar_url ?? undefined} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{e.member?.profile?.full_name}</div>
                <div className="text-xs text-ink-mute">{e.class?.name}</div>
              </div>
              {e.locked ? <Status kind="approved">{t("coach.rapor.doneBadge")}</Status> : <Status kind="pending">{t("coach.rapor.notDoneBadge")}</Status>}
              {e.locked && (
                <Btn variant="outline" size="sm" onClick={() => openView(e)}>{t("coach.rapor.viewBtn")}</Btn>
              )}
              <Btn variant={e.locked ? "ghost" : "primary"} size="sm" onClick={() => openEntry(e)}>
                {e.locked ? t("coach.rapor.editBtn") : t("coach.rapor.fillRaporBtn")}
              </Btn>
            </Card>
          ))}
          {entries.length === 0 && period && <p className="text-ink-mute text-sm">{t("coach.rapor.noEntriesForPeriod")}</p>}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-xs text-ink-mute tabular-nums">
                {t("coach.rapor.paginationSummary", { count: entries.length, page: safePage + 1, total: totalPages })}
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
        <SectionTitle sub={t("coach.rapor.myReviewsSub")}>{t("coach.rapor.myReviewsTitle")}</SectionTitle>
        <CoachMyReviews coachId={coachId} />
      </div>
    </div>
  );
}
