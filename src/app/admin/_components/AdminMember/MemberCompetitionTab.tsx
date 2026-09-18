"use client";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import type { AdminMemberHook } from "./_hook";

export default function MemberCompetitionTab({ hook }: { hook: AdminMemberHook }) {
  const { loadingMemberComps, memberComps, setPhotoView } = hook;

  return (
    <div className="space-y-3">
      {loadingMemberComps ? (
        <div className="py-8 text-center text-ink-mute text-sm">Memuat riwayat perlombaan...</div>
      ) : memberComps.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm border border-dashed border-line rounded-xl">
          Belum ada riwayat perlombaan tercatat untuk student ini.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {memberComps.map((item) => {
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
              <div key={item.id} className="p-3 bg-paper-tint/70 rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-ink-strong text-sm"><NoTranslate>{compName}</NoTranslate></div>
                  <div className="text-ink-mute mt-0.5">
                    <span>{compDate}</span>
                    {compLoc && <span> · <NoTranslate>{compLoc}</NoTranslate></span>}
                  </div>
                  <div className="mt-1 font-semibold text-ocean-700">
                    <NoTranslate>{item.category}</NoTranslate> {item.age_group ? <>(<NoTranslate>{item.age_group}</NoTranslate>)</> : ""}
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-ocean-800 border border-line shadow-xs">
                    {medalBadge}
                  </span>
                  {item.time_formatted && (
                    <div className="font-mono font-bold text-ocean-700 text-xs">
                      ⏱️ {item.time_formatted}
                    </div>
                  )}
                  {item.certificate_url && (
                    <button
                      type="button"
                      onClick={() => setPhotoView(item.certificate_url)}
                      className="text-[11px] font-semibold text-ocean-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      <Icon name="eye" className="w-3 h-3" /> Sertifikat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
