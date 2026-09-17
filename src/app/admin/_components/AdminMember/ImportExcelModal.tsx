"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import type { AdminMemberHook } from "./_hook";

export default function ImportExcelModal({ hook }: { hook: AdminMemberHook }) {
  const {
    t, openImport, setOpenImport, importStep, setImportStep, importRows, importPage, setImportPage,
    importing, importProgress, importResult, handleExcelFile, downloadTemplate, runImport,
  } = hook;

  return (
    <Modal
      open={openImport}
      onClose={() => setOpenImport(false)}
      title={importStep === "upload" ? t("admin.members.importModalTitleUpload") : importStep === "preview" ? t("admin.members.importModalTitlePreview", { count: importRows.length }) : t("admin.members.importModalTitleResult")}
      size={importStep === "result" ? (importResult && (importResult.failed.length > 0 || importResult.classWarnings.length > 0) ? "lg" : "sm") : "xl"}
      footer={
        importStep === "upload" ? (
          <Btn variant="ghost" onClick={() => setOpenImport(false)}>{t("common.actions.close")}</Btn>
        ) : importStep === "preview" ? (
          importing && importProgress ? (
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink-soft">{t("admin.members.importingMembersLabel")}</span>
                  <span className="text-xs font-bold text-ocean-600 tabular-nums">
                    {importProgress.done}/{importProgress.total} ({Math.round((importProgress.done / importProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full rounded-full bg-ocean-500 transition-all duration-300"
                    style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => setImportStep("upload")}>{t("admin.members.backBtn")}</Btn>
              <Btn
                variant="primary"
                icon="upload"
                disabled={importRows.filter(r => r._status !== "error").length === 0}
                onClick={runImport}
              >
                {t("admin.members.importCountMembersBtn", { count: importRows.filter(r => r._status !== "error").length })}
              </Btn>
            </>
          )
        ) : (
          <>
            {importResult && importResult.failed.length > 0 && (
              <Btn variant="ghost" onClick={() => setImportStep("preview")}>{t("admin.members.viewPreviewDetailBtn")}</Btn>
            )}
            <Btn variant="primary" onClick={() => setOpenImport(false)}>{t("common.actions.close")}</Btn>
          </>
        )
      }
    >
      {/* Step: upload */}
      {importStep === "upload" && (
        <div className="space-y-5">
          <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-4 text-sm text-ocean-800 space-y-2">
            <div className="font-bold text-ocean-700 mb-1">{t("admin.members.columnsRequiredTitle")}</div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div><span className="font-mono font-bold">nama_lengkap</span> <span className="text-ocean-600">{t("admin.members.requiredBadge")}</span></div>
              <div><span className="font-mono font-bold">email</span> <span className="text-ocean-600">{t("admin.members.requiredBadge")}</span></div>
              <div><span className="font-mono font-bold">password</span> <span className="text-ocean-600">{t("admin.members.requiredMin6Badge")}</span></div>
              <div><span className="font-mono font-bold">tipe_member</span> <span className="text-ink-mute">— reguler / private / afiliasi_sekolah</span></div>
              <div><span className="font-mono font-bold">tanggal_lahir</span> <span className="text-ink-mute">— DD/MM/YYYY</span></div>
              <div><span className="font-mono font-bold">jenis_kelamin</span> <span className="text-ink-mute">{t("admin.members.genderColHint")}</span></div>
              <div><span className="font-mono font-bold">no_hp</span> <span className="text-ink-mute">{t("admin.members.optionalBadge")}</span></div>
              <div><span className="font-mono font-bold">jumlah_sesi</span> <span className="text-ink-mute">{t("admin.members.sessionCountColHint")}</span></div>
              <div><span className="font-mono font-bold">nama_kelas</span> <span className="text-ink-mute">{t("admin.members.classNameColHint")}</span></div>
              <div><span className="font-mono font-bold">nama_sekolah</span> <span className="text-ocean-600">{t("admin.members.schoolNameColHint")}</span></div>
            </div>
            <div className="text-xs text-ocean-700 pt-1 border-t border-ocean-100">{t("admin.members.privateImportColumnsNote")}</div>
          </div>
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-line rounded-2xl p-10 cursor-pointer hover:border-ocean-400 hover:bg-ocean-50/30 transition-colors">
            <Icon name="upload" className="w-10 h-10 text-ink-faint" />
            <div className="text-center">
              <div className="font-semibold text-ink">{t("admin.members.clickToChooseFile")}</div>
              <div className="text-sm text-ink-mute">{t("admin.members.fileTypesHint")}</div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { handleExcelFile(f); e.target.value = ""; } }}
            />
          </label>
          <div className="text-center">
            <button type="button" onClick={downloadTemplate} className="text-sm text-ocean-600 hover:underline font-semibold">
              {t("admin.members.downloadExcelTemplateBtn")}
            </button>
          </div>
        </div>
      )}

      {/* Step: preview */}
      {importStep === "preview" && (() => {
        const okCount = importRows.filter(r => r._status === "ok").length;
        const warnCount = importRows.filter(r => r._status === "warn").length;
        const errCount = importRows.filter(r => r._status === "error").length;
        const pageSize = 50;
        const totalPages = Math.ceil(importRows.length / pageSize);
        const pageRows = importRows.slice(importPage * pageSize, (importPage + 1) * pageSize);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-ok-50 text-ok-700 ring-1 ring-ok-200">{t("admin.members.okBadge", { count: okCount })}</span>
              {warnCount > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-warn-50 text-warn-700 ring-1 ring-warn-200">{t("admin.members.warningBadge", { count: warnCount })}</span>}
              {errCount > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-danger-50 text-danger-700 ring-1 ring-danger-200">{t("admin.members.errorSkippedBadge", { count: errCount })}</span>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper-tint border-b border-line text-left">
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-10">#</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colName3")}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.coaches.colEmail")}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colType2")}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colClassImport")}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colSchoolImport")}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colStatusImport")}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colNotesImport")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr
                      key={r._rowNum}
                      className={r._status === "error" ? "bg-danger-50/40 border-b border-danger-100" : r._status === "warn" ? "bg-warn-50/40 border-b border-warn-100" : "border-b border-line"}
                    >
                      <td className="px-3 py-2 text-xs text-ink-mute">{r._rowNum}</td>
                      <td className="px-3 py-2 font-medium text-ink truncate max-w-[140px]">{r.full_name || <span className="text-ink-faint italic">—</span>}</td>
                      <td className="px-3 py-2 text-ink-soft truncate max-w-[160px]">{r.email || <span className="text-ink-faint italic">—</span>}</td>
                      <td className="px-3 py-2 text-xs capitalize">{r.member_type}</td>
                      <td className="px-3 py-2 text-xs text-ink-soft">{r.member_type === "private" ? (r.schedule_days?.length ? `${r.schedule_days.join(",")} ${r.time_start ?? ""}-${r.time_end ?? ""}` : "—") : (r.nama_kelas_raw || "—")}</td>
                      <td className="px-3 py-2 text-xs text-ink-soft">{r.nama_sekolah_raw || "—"}</td>
                      <td className="px-3 py-2">
                        {r._status === "ok" && <span className="text-xs font-bold text-ok-600">OK</span>}
                        {r._status === "warn" && <span className="text-xs font-bold text-warn-600">{t("admin.members.statusWarn")}</span>}
                        {r._status === "error" && <span className="text-xs font-bold text-danger-600">Error</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-mute max-w-[200px]">
                        {[...r._errors, ...r._warnings].join("; ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => setImportPage(p => Math.max(0, p - 1))} disabled={importPage === 0} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute disabled:opacity-40">{t("admin.members.prevBtn")}</button>
                <span className="text-ink-mute text-xs">{t("admin.rapor.pageOfLabel", { page: importPage + 1, total: totalPages })}</span>
                <button type="button" onClick={() => setImportPage(p => Math.min(totalPages - 1, p + 1))} disabled={importPage === totalPages - 1} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute disabled:opacity-40">{t("admin.members.nextBtn")}</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Step: result */}
      {importStep === "result" && importResult && (
        <div className="space-y-5 py-2">
          {importResult.failed.length === 0 && importResult.classWarnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-ok-50/70 border border-ok-200 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-ok-100 text-ok-600 flex items-center justify-center mb-3">
                <Icon name="check" className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="text-4xl font-display font-extrabold text-ok-600">{importResult.success}</div>
              <div className="text-sm font-semibold text-ok-800 mt-1">{t("admin.members.membersCreatedSuccessfully")}</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-ok-50 border border-ok-200 p-4 text-center">
                  <div className="text-3xl font-display font-extrabold text-ok-600">{importResult.success}</div>
                  <div className="text-xs font-semibold text-ok-700 mt-1">{t("admin.members.membersCreatedSuccessfully")}</div>
                </div>
                <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 text-center">
                  <div className="text-3xl font-display font-extrabold text-danger-600">{importResult.failed.length}</div>
                  <div className="text-xs font-semibold text-danger-700 mt-1">{t("admin.members.failedToImport")}</div>
                </div>
              </div>

              {importResult.failed.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-line max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-paper-tint border-b border-line text-left sticky top-0">
                        <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-14">{t("admin.members.colRowImport")}</th>
                        <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.coaches.colEmail")}</th>
                        <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colReasonImport")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.failed.map(f => (
                        <tr key={f.row} className="border-b border-line">
                          <td className="px-3 py-2 text-xs text-ink-mute">{f.row}</td>
                          <td className="px-3 py-2 text-ink-soft">{f.email}</td>
                          <td className="px-3 py-2 text-xs text-danger-700">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {importResult.classWarnings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-warn-700">{t("admin.members.classFullWarningsTitle", { count: importResult.classWarnings.length })}</div>
                  <div className="overflow-x-auto rounded-xl border border-line max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-paper-tint border-b border-line text-left sticky top-0">
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-14">{t("admin.members.colRowImport")}</th>
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.coaches.colEmail")}</th>
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{t("admin.members.colReasonImport")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.classWarnings.map(w => (
                          <tr key={w.row} className="border-b border-line">
                            <td className="px-3 py-2 text-xs text-ink-mute">{w.row}</td>
                            <td className="px-3 py-2 text-ink-soft">{w.email}</td>
                            <td className="px-3 py-2 text-xs text-warn-700">{w.warning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
