"use client";
import Btn from "@/components/ui/Btn";
import { Stat } from "@/components/ui/Card";
import type { AdminMemberHook } from "./_hook";

export default function MembersHeader({ hook }: { hook: AdminMemberHook }) {
  const {
    t, qrSelectMode, selectedQR, setQrSelectMode, setSelectedQR, generatingQR, bulkDownloadQR,
    filteredSorted, downloadTemplate, setImportStep, setImportRows, setImportResult, setOpenImport,
    setForm, setOpenCreate, stats,
  } = hook;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{t("admin.members.pageTitle")}</h2><p className="text-ink-mute text-sm mt-0.5">{t("admin.members.pageSub")}</p></div>
        <div className="flex flex-wrap gap-2">
          {qrSelectMode ? (
            <>
              <span className="self-center text-sm text-ink-mute font-medium">
                {selectedQR.size > 0 ? t("admin.members.selectedCountQr", { count: selectedQR.size }) : t("admin.members.selectMemberPrompt")}
              </span>
              <Btn variant="ghost" size="sm" onClick={() => { setQrSelectMode(false); setSelectedQR(new Set()); }}>{t("common.actions.cancel")}</Btn>
              <Btn variant="soft" size="sm" onClick={() => { setSelectedQR(new Set(filteredSorted.map(m => m.id))); }}>{t("admin.members.selectAllCountBtn", { count: filteredSorted.length })}</Btn>
              <Btn
                variant="primary"
                icon="download"
                size="sm"
                disabled={selectedQR.size === 0 || generatingQR}
                onClick={() => bulkDownloadQR(Array.from(selectedQR))}
              >
                {generatingQR ? t("admin.members.generatingBtn3") : t("admin.members.downloadQrCountBtn", { count: selectedQR.size })}
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" icon="download" size="sm" onClick={downloadTemplate}>{t("admin.members.downloadTemplateBtn")}</Btn>
              <Btn variant="soft" icon="upload" onClick={() => { setImportStep("upload"); setImportRows([]); setImportResult(null); setOpenImport(true); }}>{t("admin.members.importExcelBtn")}</Btn>
              <Btn variant="outline" icon="qr" size="sm" onClick={() => { setQrSelectMode(true); setSelectedQR(new Set()); }}>{t("admin.members.downloadQrBtn")}</Btn>
              <Btn variant="primary" icon="plus" onClick={() => { setForm({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", school_grade: "", email: "", password: "", jumlah_sesi: "" }); setOpenCreate(true); }}>{t("admin.members.addMemberBtn")}</Btn>
            </>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={t("admin.members.statTotalActive")}      value={stats.all}     icon="users"   tone="ocean" />
        <Stat label={t("admin.members.statRegular")}          value={stats.reguler} icon="grid"    tone="wave"  />
        <Stat label={t("admin.members.statPrivate")}          value={stats.private} icon="sparkle" tone="ocean" />
        <Stat label={t("admin.members.statSchoolAffiliate")}  value={stats.school}  icon="school"  tone="ocean" />
      </div>
    </>
  );
}
