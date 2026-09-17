"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import StarDisplay from "@/components/ui/StarDisplay";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDate } from "@/lib/utils";

interface MyReviewRow {
  id: string; stars: number; message: string | null;
  created_at: string; member_name: string; period_label: string;
}

export default function CoachMyReviews({ coachId }: { coachId: string }) {
  const { t } = useLocale();
  const [reviews, setReviews] = useState<MyReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rapor/coach-reviews");
      if (!res.ok) { setLoading(false); return; }
      const { reviews: rows } = await res.json() as { reviews: MyReviewRow[] };
      setReviews(rows);
      setLoading(false);
    })();
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;

  if (loading) return <div className="text-ink-mute text-sm py-3">{t("coach.rapor.loadingReviews")}</div>;

  return (
    <div className="space-y-3">
      {avg !== null && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-center shrink-0">
            <div className="text-3xl font-bold text-amber-600">{avg.toFixed(1)}</div>
            <StarDisplay stars={Math.round(avg)} size="sm" />
            <div className="text-xs text-ink-mute mt-1">{t("coach.rapor.reviewCountLabel", { count: reviews.length })}</div>
          </div>
          <div className="flex-1 space-y-1">
            {[5,4,3,2,1].map(s => {
              const cnt = reviews.filter(r => r.stars === s).length;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-ink-mute w-2">{s}</span>
                  <Icon name="star" className="w-3 h-3 text-amber-400 shrink-0" strokeWidth={1.5} fill="currentColor" />
                  <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: reviews.length ? `${(cnt/reviews.length)*100}%` : "0%" }} />
                  </div>
                  <span className="text-xs text-ink-mute w-4 text-right">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {reviews.length === 0 && <p className="text-ink-mute text-sm text-center py-6">{t("coach.rapor.noReviewsYet")}</p>}
      <div className="space-y-2.5">
        {reviews.map(r => (
          <div key={r.id} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                {/* reviewer identity is masked server-side — do not add Avatar/photo here */}
                <div className="font-semibold text-ink text-sm">{r.member_name}</div>
                <div className="text-xs text-ink-mute">{r.period_label}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StarDisplay stars={r.stars} size="sm" />
                <span className="text-xs text-ink-faint">{fmtDate(r.created_at)}</span>
              </div>
            </div>
            {r.message && <p className="text-sm text-ink-soft bg-paper-tint rounded-xl px-3 py-2">{r.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
