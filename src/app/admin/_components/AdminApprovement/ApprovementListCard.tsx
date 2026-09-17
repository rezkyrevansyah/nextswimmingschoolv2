"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { calcAge } from "../../_utils";
import { fmtDate, waLink } from "@/lib/utils";
import { fmtMonthYear } from "./_utils";
import type { useApprovementData } from "./useApprovementData";

type ApprovementDataHook = ReturnType<typeof useApprovementData>;

export default function ApprovementListCard({ hook }: { hook: ApprovementDataHook }) {
  const {
    t, monthsLong, genderLabel,
    registrations, certs, loading,
    tab, setTab, search, setSearch, genderFilter, setGenderFilter, load,
    approvingId, openApproveReg, setDetailReg, setDetailCert, setRejectCertTarget, setCertRejectReason, approveCert,
    filteredRegs, filteredCerts, activeList, totalPages, safePage, pageNums, pagedRegs, pagedCerts, setPage,
  } = hook;

  return (
    <Card padded={false}>
      {/* Tab strip */}
      <div className="flex border-b border-line px-4">
        {(["reg", "cert"] as const).map(tb => {
          const isActive = tab === tb;
          const count = tb === "reg" ? registrations.length : certs.length;
          return (
            <button key={tb} type="button" onClick={() => setTab(tb)}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${isActive ? "text-ocean-700" : "text-ink-mute hover:text-ink-soft"}`}>
              {tb === "reg" ? t("admin.approvement.tabRegistration") : t("admin.approvement.tabCertification")}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-danger-500 text-white" : "bg-danger-100 text-danger-600"}`}>
                  {count}
                </span>
              )}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ocean-600 rounded-t-full" />}
            </button>
          );
        })}
      </div>

      {/* Search + Filter row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
        <div className="relative flex-1 max-w-xs">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input
            type="search"
            name="approvement_search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === "reg" ? t("admin.approvement.searchRegPlaceholder") : t("admin.approvement.searchCertPlaceholder")}
            className="w-full pl-9 pr-3 py-2 text-sm bg-paper-tint border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-500/20 transition-all"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint hover:text-ink-soft">
              <Icon name="x" className="w-4 h-4" />
            </button>
          )}
        </div>

        {tab === "reg" && (
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="text-sm border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-500/20 transition-all">
            <option value="">{t("admin.approvement.allGenders")}</option>
            <option value="male">{t("admin.approvement.genderMale")}</option>
            <option value="female">{t("admin.approvement.genderFemale")}</option>
          </select>
        )}

        <button type="button" onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-ink-mute border border-line rounded-lg hover:bg-paper-tint hover:text-ink transition-all">
          <Icon name="refresh" className="w-4 h-4" />
          <span className="hidden sm:inline">{t("admin.approvement.refreshBtn")}</span>
        </button>
      </div>

      {/* Table — Registrasi */}
      {tab === "reg" && (
        <>
          {loading ? (
            <div className="py-16 text-center text-ink-mute text-sm">{t("admin.approvement.loadingData")}</div>
          ) : filteredRegs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-full bg-paper-tint flex items-center justify-center">
                <Icon name="users" className="w-6 h-6 text-ink-faint" />
              </span>
              <div>
                <div className="font-semibold text-ink-soft text-sm">{search || genderFilter ? t("admin.approvement.noResultsFound") : t("admin.approvement.noNewRegistrations")}</div>
                <div className="text-xs text-ink-faint mt-0.5">{search || genderFilter ? t("admin.approvement.tryDifferentFilter") : t("admin.approvement.regFromPageHint")}</div>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">{t("admin.approvement.colApplicant")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden sm:table-cell">{t("admin.approvement.colEmail")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden md:table-cell">{t("admin.approvement.colGender")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden lg:table-cell">{t("admin.approvement.colRegDate")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide text-right">{t("admin.approvement.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagedRegs.map(r => {
                  const age = r.birth_date ? calcAge(r.birth_date) : null;
                  const contactPhone = r.phone_owner === "parent" ? r.parent_phone : r.phone;
                  return (
                    <tr key={r.id}
                      className="hover:bg-paper-tint cursor-pointer transition-colors"
                      onClick={() => setDetailReg(r)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.full_name} size={36} />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink truncate">{r.full_name}</div>
                            <div className="text-xs text-ink-mute">{r.phone ?? "—"}{age ? ` · ${t("admin.approvement.yearsSuffix", { n: age })}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-ink-soft truncate max-w-[180px] block">{r.email ?? <span className="text-danger-400 font-medium">{t("admin.approvement.notFilledYet")}</span>}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-ink-soft">
                          {genderLabel(r.gender) ?? <span className="text-ink-faint">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-ink-mute text-xs">{fmtDate(r.created_at)}</span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <a href={waLink(t("admin.approvement.welcomeWaMessage", { name: r.full_name }), contactPhone)} target="_blank" rel="noreferrer">
                            <Btn variant="wa" size="sm" icon="whatsapp" />
                          </a>
                          <Btn variant="primary" size="sm" icon="check" disabled={approvingId === r.id} onClick={() => openApproveReg(r)}>
                            {approvingId === r.id ? "…" : t("common.actions.approve")}
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Table — Sertifikasi */}
      {tab === "cert" && (
        <>
          {loading ? (
            <div className="py-16 text-center text-ink-mute text-sm">{t("admin.approvement.loadingData")}</div>
          ) : filteredCerts.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-full bg-paper-tint flex items-center justify-center">
                <Icon name="shield" className="w-6 h-6 text-ink-faint" />
              </span>
              <div>
                <div className="font-semibold text-ink-soft text-sm">{search ? t("admin.approvement.noResultsFound") : t("admin.approvement.noPendingCert")}</div>
                <div className="text-xs text-ink-faint mt-0.5">{search ? t("admin.approvement.tryDifferentSearch") : t("admin.approvement.certFromCoachHint")}</div>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">{t("admin.approvement.colCoach")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide">{t("admin.approvement.colCertificate")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden sm:table-cell">{t("admin.approvement.colIssuer")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide hidden md:table-cell">{t("admin.approvement.colValidUntil")}</th>
                  <th className="px-4 py-3 text-xs font-bold text-ink-mute uppercase tracking-wide text-right">{t("admin.approvement.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagedCerts.map(c => (
                  <tr key={c.id}
                    className="hover:bg-paper-tint cursor-pointer transition-colors"
                    onClick={() => setDetailCert(c)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.profile?.full_name ?? "?"} size={36} />
                        <span className="font-semibold text-ink truncate">{c.profile?.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink truncate max-w-[200px] block">{c.title ?? c.name}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-ink-soft">{c.issuer ?? <span className="text-ink-faint">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.no_expiry ? (
                        <span className="inline-flex items-center gap-1 text-ok-700 text-xs font-semibold">
                          <span className="w-3.5 h-3.5 rounded-full bg-ok-100 flex items-center justify-center shrink-0">
                            <Icon name="check" className="w-2 h-2 text-ok-600" strokeWidth={3} />
                          </span>
                          {t("admin.approvement.lifetimeLabel")}
                        </span>
                      ) : (
                        <span className="text-ink-mute text-xs">
                          {c.valid_until ? fmtMonthYear(c.valid_until, monthsLong) : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Btn variant="ghost" size="sm" className="text-danger-500" onClick={() => { setRejectCertTarget(c); setCertRejectReason(""); }}>{t("common.actions.reject")}</Btn>
                        <Btn variant="primary" size="sm" icon="check" onClick={() => approveCert(c.id)}>{t("common.actions.approve")}</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-line flex items-center justify-between gap-4">
          <span className="text-xs text-ink-mute">
            {t("admin.approvement.itemsPageLabel", { count: activeList.length, page: safePage + 1, total: totalPages })}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
              className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
            <button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
            {pageNums.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-2 py-1.5 text-sm text-ink-faint">…</span>
              ) : (
                <button key={p} type="button" onClick={() => setPage(p as number)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${safePage === p ? "bg-ocean-600 text-white" : "text-ink-soft hover:bg-paper-tint"}`}>
                  {(p as number) + 1}
                </button>
              )
            )}
            <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
            <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}
              className="px-2 py-1.5 rounded-lg text-sm text-ink-mute hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
          </div>
        </div>
      )}
    </Card>
  );
}
