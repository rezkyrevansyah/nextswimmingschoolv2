"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import type { useOwnerStorage } from "./useOwnerStorage";
import { fmtBytes, fmtRelTime, categoryColor, STORAGE_LIMIT } from "./_utils";

type Hook = ReturnType<typeof useOwnerStorage>;

export default function StorageOverview({ hook }: { hook: Hook }) {
  const { statsLoading, stats, statsError, loadStats, publicSize, privateSize } = hook;

  return (
    <>
      {/* ── Stats Hero (frame ao0pU) ── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-paper rounded-2xl border border-line shadow-xs p-5 space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-7 w-28 rounded" />
            </div>
          ))}
        </div>
      ) : statsError ? (
        <div className="rounded-2xl border border-danger-200/60 bg-danger-50 p-5 shadow-xs flex items-center gap-3 text-danger-700">
          <Icon name="warning" className="w-5 h-5 shrink-0 text-danger-600" />
          <div className="flex-1">
            <div className="font-semibold text-sm">{"Failed to load storage data"}</div>
            <div className="text-xs text-danger-600/80 mt-0.5">{"Make sure the Supabase Storage connection is working normally."}</div>
          </div>
          <Btn variant="ghost" size="sm" icon="refresh" onClick={loadStats}>{"Retry"}</Btn>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL USED */}
          <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">{"Total Size"}</div>
              <div className="font-display font-extrabold text-2xl text-ocean-600 mt-1 tabular-nums">
                {fmtBytes(stats.totalSize)}
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between items-center text-[10px] font-semibold text-ink-mute mb-1">
                <span>{((stats.totalSize / STORAGE_LIMIT) * 100).toFixed(1)}% {"Used"}</span>
                <span>1.0 GB limit</span>
              </div>
              <div className="h-1.5 w-full bg-paper-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-ocean-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((stats.totalSize / STORAGE_LIMIT) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: PUBLIC BUCKET */}
          <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">PUBLIC BUCKET</div>
              <div className="font-display font-extrabold text-2xl text-wave-600 mt-1 tabular-nums">
                {fmtBytes(publicSize)}
              </div>
            </div>
            <div className="text-xs text-ink-mute mt-3 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-wave-500 shrink-0" />
              <span className="truncate">Avatar, Logo, Kelas, Landing</span>
            </div>
          </div>

          {/* Card 3: PRIVATE BUCKET */}
          <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">PRIVATE BUCKET</div>
              <div className="font-display font-extrabold text-2xl text-sub-600 mt-1 tabular-nums">
                {fmtBytes(privateSize)}
              </div>
            </div>
            <div className="text-xs text-ink-mute mt-3 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-sub-500 shrink-0" />
              <span className="truncate">Absensi, Pembayaran, Sertifikat</span>
            </div>
          </div>

          {/* Card 4: FILES */}
          <div className="bg-paper rounded-2xl border border-line shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-ink-faint">{"Total Files"}</div>
              <div className="font-display font-extrabold text-2xl text-ink mt-1 tabular-nums">
                {stats.totalCount.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-ink-mute">
              <span>{fmtRelTime(stats.fetchedAt)}</span>
              <button
                type="button"
                onClick={loadStats}
                className="inline-flex items-center gap-1 font-semibold text-ocean-600 hover:text-ocean-700 transition-colors"
              >
                <Icon name="refresh" className="w-3.5 h-3.5" />
                {"Refresh"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Danger Warning Banner (frame Z6FPE) ── */}
      <div className="bg-danger-50 border border-danger-200/60 rounded-2xl p-4 flex items-start gap-3.5 text-danger-700 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-danger-100/80 flex items-center justify-center shrink-0 text-danger-600 mt-0.5">
          <Icon name="warning" className="w-4 h-4" />
        </div>
        <div className="space-y-1 text-xs leading-relaxed">
          <div className="font-bold text-danger-800 text-sm">{"Note:"}</div>
          <div className="text-danger-700/90">{"Backup is processed in the browser. The attendance-selfie category can be very large and take a long time. Backing up per category is recommended for large numbers of files. Make sure your browser has enough RAM for large ZIPs."}</div>
        </div>
      </div>

      {/* ── Distribusi Storage (frame E9CTx) ── */}
      {stats && (
        <div className="bg-paper rounded-2xl border border-line shadow-xs overflow-hidden">
          <div className="p-5 border-b border-line">
            <h3 className="font-display font-bold text-base text-ink">{"Storage Distribution"}</h3>
            <p className="text-xs text-ink-mute mt-0.5">{"Storage usage by file category"}</p>

            {/* Stacked bar */}
            <div className="h-3.5 rounded-full overflow-hidden flex mt-4 bg-paper-deep relative">
              {stats.categories.map((cat) => {
                const pct = (cat.size / STORAGE_LIMIT) * 100;
                if (pct <= 0 && cat.size === 0) return null;
                return (
                  <div
                    key={cat.prefix}
                    style={{ width: `${Math.max(pct, cat.size > 0 ? 0.5 : 0)}%` }}
                    className={`h-full ${categoryColor(cat.prefix)} transition-all`}
                    title={`${cat.label}: ${fmtBytes(cat.size)}`}
                  />
                );
              })}
              {stats.totalSize === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-semibold text-ink-faint">{"No files yet"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Categories Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-10 bg-paper-deep border-b border-line text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                  <th className="px-5">{"Category"}</th>
                  <th className="px-5">BUCKET</th>
                  <th className="px-5 text-right">{"Files"}</th>
                  <th className="px-5 text-right">{"Size"}</th>
                  <th className="px-5 text-right">PROPORSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {stats.categories.map((cat) => {
                  const pctOfLimit = (cat.size / STORAGE_LIMIT) * 100;
                  const pctOfUsed = stats.totalSize > 0 ? (cat.size / stats.totalSize) * 100 : 0;
                  const empty = cat.size === 0;
                  const isPrivate = ["attendances", "payments", "certs"].includes(cat.prefix);

                  return (
                    <tr key={cat.prefix} className={`h-14 hover:bg-paper-tint/60 transition-colors ${empty ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full shrink-0 ${categoryColor(cat.prefix)}`} />
                          <div>
                            <div className="font-semibold text-ink text-sm">{cat.label}</div>
                            <div className="text-[11px] text-ink-mute font-mono">{cat.prefix}/</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPrivate
                            ? "bg-paper-deep text-ink-soft border border-line"
                            : "bg-wave-50 text-wave-700 border border-wave-200/50"
                        }`}>
                          {isPrivate ? "Private" : "Public"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-ink tabular-nums">
                        {cat.count.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="font-bold text-ink tabular-nums">{fmtBytes(cat.size)}</div>
                        <div className="text-[11px] text-ink-faint">
                          {empty ? "empty" : `${pctOfLimit.toFixed(2)}% limit`}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="w-24 ml-auto">
                          <div className="flex justify-end text-[11px] text-ink-soft font-semibold mb-1">
                            {pctOfUsed.toFixed(1)}%
                          </div>
                          <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
                            <div
                              className={`h-full ${categoryColor(cat.prefix)} rounded-full`}
                              style={{ width: `${Math.max(pctOfUsed, empty ? 0 : 2)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
