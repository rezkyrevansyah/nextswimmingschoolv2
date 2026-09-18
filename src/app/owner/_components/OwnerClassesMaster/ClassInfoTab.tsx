"use client";
import Icon from "@/components/ui/Icon";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassInfoTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const { dayLabels, detailClass } = hook;
  if (!detailClass) return null;

  return (
    <div className="space-y-4">
      {/* Photo banner if available */}
      {detailClass.photo_url && (
        <div className="aspect-video max-h-48 w-full rounded-2xl overflow-hidden border border-line bg-paper-deep">
          <img
            src={detailClass.photo_url}
            alt={detailClass.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
            {"Center"}
          </div>
          <div className="font-semibold text-ink text-sm">
            {(detailClass.branch as { name: string } | null | undefined)?.name ?? "—"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
            {"Status"}
          </div>
          <div>
            <Status kind={detailClass.status === "active" ? "active" : "archived"}>
              {detailClass.status === "active" ? "Active" : "Archived"}
            </Status>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
            {"Schedule"}
          </div>
          <div className="text-xs text-ink">
            {(detailClass.schedule_days ?? []).map((d) => dayLabels[d] ?? d).join(", ")}{" "}
            {detailClass.time_start && (
              <span className="font-mono font-bold">
                {detailClass.time_start.slice(0, 5)}
                {detailClass.time_end ? `–${detailClass.time_end.slice(0, 5)}` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
            {"Capacity"}
          </div>
          <div className="text-xs font-mono font-bold text-ink">
            {detailClass.enrolled}/{detailClass.capacity} {"participants"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
            {"Monthly Price"}
          </div>
          <div className="text-xs font-bold text-ocean-700">
            {detailClass.price_monthly != null
              ? fmtIDR(detailClass.price_monthly)
              : detailClass.price_per_session != null
              ? `${fmtIDR(detailClass.price_per_session)}/sesi`
              : "—"}
          </div>
        </div>

        {detailClass.location_type === "external" && (
          <div className="space-y-1 sm:col-span-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
              {"Location"}
            </div>
            <div className="text-xs text-ink">
              🏡 <NoTranslate>{detailClass.external_location_name || "—"}</NoTranslate> (<NoTranslate>{detailClass.external_location_address || "—"}</NoTranslate>)
              {detailClass.google_maps_url && (
                <a
                  href={detailClass.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-ocean-600 font-semibold hover:underline"
                >
                  Maps ↗
                </a>
              )}
            </div>
          </div>
        )}

        {(detailClass.coach_spreadsheets ?? []).length > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">
              {"Program Spreadsheet"}
            </div>
            <div className="space-y-1.5">
              {detailClass.coach_spreadsheets!.map((s) => (
                <div key={s.coach_id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-line bg-paper-tint">
                  <Avatar name={s.coach?.full_name ?? "?"} size={24} />
                  <span className="flex-1 text-xs font-semibold text-ink truncate"><NoTranslate>{s.coach?.full_name ?? "—"}</NoTranslate></span>
                  <a
                    href={s.spreadsheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-ocean-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Icon name="link" className="w-3 h-3" />
                    {"Open"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailClass.goals && (
        <div className="border-t border-line pt-3">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
            {"Goals"}
          </div>
          <p className="text-xs text-ink-soft leading-relaxed"><NoTranslate as="span">{detailClass.goals}</NoTranslate></p>
        </div>
      )}

      {detailClass.description && (
        <div className="border-t border-line pt-3">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">
            {"Description"}
          </div>
          <p className="text-xs text-ink-soft leading-relaxed"><NoTranslate as="span">{detailClass.description}</NoTranslate></p>
        </div>
      )}
    </div>
  );
}
