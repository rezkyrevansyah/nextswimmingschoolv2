"use client";
import Btn from "@/components/ui/Btn";
import { Stat } from "@/components/ui/Card";
import type { AdminMemberHook } from "./_hook";

export default function MembersHeader({ hook }: { hook: AdminMemberHook }) {
  const {
    qrSelectMode, selectedQR, setQrSelectMode, setSelectedQR, generatingQR, bulkDownloadQR,
    filteredSorted, downloadTemplate, setImportStep, setImportRows, setImportResult, setOpenImport,
    setForm, setOpenCreate, stats,
  } = hook;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{"Student Management"}</h2><p className="text-ink-mute text-sm mt-0.5">{"Student CRUD, suspend, and password reset."}</p></div>
        <div className="flex flex-wrap gap-2">
          {qrSelectMode ? (
            <>
              <span className="self-center text-sm text-ink-mute font-medium">
                {selectedQR.size > 0 ? `${selectedQR.size} selected` : "Select student"}
              </span>
              <Btn variant="ghost" size="sm" onClick={() => { setQrSelectMode(false); setSelectedQR(new Set()); }}>{"Cancel"}</Btn>
              <Btn variant="soft" size="sm" onClick={() => { setSelectedQR(new Set(filteredSorted.map(m => m.id))); }}>{`Select All (${filteredSorted.length})`}</Btn>
              <Btn
                variant="primary"
                icon="download"
                size="sm"
                disabled={selectedQR.size === 0 || generatingQR}
                onClick={() => bulkDownloadQR(Array.from(selectedQR))}
              >
                {generatingQR ? "Generating…" : `Download QR (${selectedQR.size})`}
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" icon="download" size="sm" onClick={downloadTemplate}>{"Download Template"}</Btn>
              <Btn variant="soft" icon="upload" onClick={() => { setImportStep("upload"); setImportRows([]); setImportResult(null); setOpenImport(true); }}>{"Import Excel"}</Btn>
              <Btn variant="outline" icon="qr" size="sm" onClick={() => { setQrSelectMode(true); setSelectedQR(new Set()); }}>{"Download QR"}</Btn>
              <Btn variant="primary" icon="plus" onClick={() => { setForm({ full_name: "", birth_date: "", gender: "", type: "reguler", phone: "", phone_owner: "self", parent_name: "", parent_phone: "", address: "", health_notes: "", class_id: "", school_id: "", school_grade: "", email: "", password: "", jumlah_sesi: "" }); setOpenCreate(true); }}>{"Add Student"}</Btn>
            </>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={"Total active"}      value={stats.all}     icon="users"   tone="ocean" />
        <Stat label={"Regular"}          value={stats.reguler} icon="grid"    tone="wave"  />
        <Stat label={"Private"}          value={stats.private} icon="sparkle" tone="ocean" />
        <Stat label={"School affiliate"}  value={stats.school}  icon="school"  tone="ocean" />
      </div>
    </>
  );
}
