"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminStudentHook } from "./_hook";

export default function ImportExcelModal({ hook }: { hook: AdminStudentHook }) {
  const {
    openImport, setOpenImport, importStep, setImportStep, importRows, importPage, setImportPage,
    importing, importProgress, importResult, handleExcelFile, downloadTemplate, runImport,
  } = hook;

  return (
    <Modal
      open={openImport}
      onClose={() => setOpenImport(false)}
      title={importStep === "upload" ? "Import Students from Excel" : importStep === "preview" ? `Import Preview (${importRows.length} rows)` : "Import Result"}
      size={importStep === "result" ? (importResult && (importResult.failed.length > 0 || importResult.classWarnings.length > 0) ? "lg" : "sm") : "xl"}
      footer={
        importStep === "upload" ? (
          <Btn variant="ghost" onClick={() => setOpenImport(false)}>{"Close"}</Btn>
        ) : importStep === "preview" ? (
          importing && importProgress ? (
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink-soft">{"Importing students…"}</span>
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
              <Btn variant="ghost" onClick={() => setImportStep("upload")}>{"Back"}</Btn>
              <Btn
                variant="primary"
                icon="upload"
                disabled={importRows.filter(r => r._status !== "error").length === 0}
                onClick={runImport}
              >
                {`Import ${importRows.filter(r => r._status !== "error").length} Students`}
              </Btn>
            </>
          )
        ) : (
          <>
            {importResult && importResult.failed.length > 0 && (
              <Btn variant="ghost" onClick={() => setImportStep("preview")}>{"View Preview Detail"}</Btn>
            )}
            <Btn variant="primary" onClick={() => setOpenImport(false)}>{"Close"}</Btn>
          </>
        )
      }
    >
      {/* Step: upload */}
      {importStep === "upload" && (
        <div className="space-y-5">
          <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-4 text-sm text-ocean-800 space-y-2">
            <div className="font-bold text-ocean-700 mb-1">{"Required columns in the Excel file:"}</div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div><span className="font-mono font-bold">nama_lengkap</span> <span className="text-ocean-600">{"— REQUIRED"}</span></div>
              <div><span className="font-mono font-bold">email</span> <span className="text-ocean-600">{"— REQUIRED"}</span></div>
              <div><span className="font-mono font-bold">password</span> <span className="text-ocean-600">{"— REQUIRED (min. 6 characters)"}</span></div>
              <div><span className="font-mono font-bold">tipe_student</span> <span className="text-ink-mute">— reguler / private / afiliasi_sekolah</span></div>
              <div><span className="font-mono font-bold">tanggal_lahir</span> <span className="text-ink-mute">— DD/MM/YYYY</span></div>
              <div><span className="font-mono font-bold">jenis_kelamin</span> <span className="text-ink-mute">{"— L or P"}</span></div>
              <div><span className="font-mono font-bold">no_hp</span> <span className="text-ink-mute">{"— Optional"}</span></div>
              <div><span className="font-mono font-bold">jumlah_sesi</span> <span className="text-ink-mute">{"— Required if type=private"}</span></div>
              <div><span className="font-mono font-bold">nama_kelas</span> <span className="text-ink-mute">{"— Must match a class name in the system"}</span></div>
              <div><span className="font-mono font-bold">nama_sekolah</span> <span className="text-ocean-600">{"— REQUIRED if type=afiliasi_sekolah"}</span></div>
            </div>
            <div className="text-xs text-ocean-700 pt-1 border-t border-ocean-100">{"For type=private, also fill in: jumlah_sesi, jadwal_hari, jam_mulai, jam_selesai (required — schedule at this center's own pool), and optionally coach_utama_hp / coach_asisten_hp and harga_paket."}</div>
          </div>
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-line rounded-2xl p-10 cursor-pointer hover:border-ocean-400 hover:bg-ocean-50/30 transition-colors">
            <Icon name="upload" className="w-10 h-10 text-ink-faint" />
            <div className="text-center">
              <div className="font-semibold text-ink">{"Click to choose a file"}</div>
              <div className="text-sm text-ink-mute">{".xlsx, .xls, or .csv"}</div>
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
              {"Download Excel template"}
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
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-ok-50 text-ok-700 ring-1 ring-ok-200">{`${okCount} OK`}</span>
              {warnCount > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-warn-50 text-warn-700 ring-1 ring-warn-200">{`${warnCount} Warning`}</span>}
              {errCount > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold bg-danger-50 text-danger-700 ring-1 ring-danger-200">{`${errCount} Error — will be skipped`}</span>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper-tint border-b border-line text-left">
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-10">#</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Name"}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Email"}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Type"}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Class"}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"School"}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Status"}</th>
                    <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Notes"}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr
                      key={r._rowNum}
                      className={r._status === "error" ? "bg-danger-50/40 border-b border-danger-100" : r._status === "warn" ? "bg-warn-50/40 border-b border-warn-100" : "border-b border-line"}
                    >
                      <td className="px-3 py-2 text-xs text-ink-mute">{r._rowNum}</td>
                      <td className="px-3 py-2 font-medium text-ink truncate max-w-[140px]">{r.full_name ? <NoTranslate>{r.full_name}</NoTranslate> : <span className="text-ink-faint italic">—</span>}</td>
                      <td className="px-3 py-2 text-ink-soft truncate max-w-[160px]">{r.email ? <NoTranslate>{r.email}</NoTranslate> : <span className="text-ink-faint italic">—</span>}</td>
                      <td className="px-3 py-2 text-xs capitalize">{r.student_type}</td>
                      <td className="px-3 py-2 text-xs text-ink-soft"><NoTranslate>{r.student_type === "private" ? (r.schedule_days?.length ? `${r.schedule_days.join(",")} ${r.time_start ?? ""}-${r.time_end ?? ""}` : "—") : (r.nama_kelas_raw || "—")}</NoTranslate></td>
                      <td className="px-3 py-2 text-xs text-ink-soft"><NoTranslate>{r.nama_sekolah_raw || "—"}</NoTranslate></td>
                      <td className="px-3 py-2">
                        {r._status === "ok" && <span className="text-xs font-bold text-ok-600">OK</span>}
                        {r._status === "warn" && <span className="text-xs font-bold text-warn-600">{"Warning"}</span>}
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
                <button type="button" onClick={() => setImportPage(p => Math.max(0, p - 1))} disabled={importPage === 0} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute disabled:opacity-40">{"‹ Previous"}</button>
                <span className="text-ink-mute text-xs">{`Page ${importPage + 1} of ${totalPages}`}</span>
                <button type="button" onClick={() => setImportPage(p => Math.min(totalPages - 1, p + 1))} disabled={importPage === totalPages - 1} className="px-3 py-1.5 rounded-lg border border-line text-ink-mute disabled:opacity-40">{"Next ›"}</button>
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
              <div className="text-sm font-semibold text-ok-800 mt-1">{"Students created successfully"}</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-ok-50 border border-ok-200 p-4 text-center">
                  <div className="text-3xl font-display font-extrabold text-ok-600">{importResult.success}</div>
                  <div className="text-xs font-semibold text-ok-700 mt-1">{"Students created successfully"}</div>
                </div>
                <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 text-center">
                  <div className="text-3xl font-display font-extrabold text-danger-600">{importResult.failed.length}</div>
                  <div className="text-xs font-semibold text-danger-700 mt-1">{"Failed to import"}</div>
                </div>
              </div>

              {importResult.failed.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-line max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-paper-tint border-b border-line text-left sticky top-0">
                        <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-14">{"Row"}</th>
                        <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Email"}</th>
                        <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Reason"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.failed.map(f => (
                        <tr key={f.row} className="border-b border-line">
                          <td className="px-3 py-2 text-xs text-ink-mute">{f.row}</td>
                          <td className="px-3 py-2 text-ink-soft"><NoTranslate>{f.email}</NoTranslate></td>
                          <td className="px-3 py-2 text-xs text-danger-700">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {importResult.classWarnings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-warn-700">{`${importResult.classWarnings.length} student(s) created without a class (class was full)`}</div>
                  <div className="overflow-x-auto rounded-xl border border-line max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-paper-tint border-b border-line text-left sticky top-0">
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs w-14">{"Row"}</th>
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Email"}</th>
                          <th className="px-3 py-2.5 font-semibold text-ink-mute text-xs">{"Reason"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.classWarnings.map(w => (
                          <tr key={w.row} className="border-b border-line">
                            <td className="px-3 py-2 text-xs text-ink-mute">{w.row}</td>
                            <td className="px-3 py-2 text-ink-soft"><NoTranslate>{w.email}</NoTranslate></td>
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
