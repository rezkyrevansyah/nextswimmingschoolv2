"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Select } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import type { useAccountsMasterData } from "./useAccountsMasterData";
import type { RoleFilter } from "./_types";

type AccountsMasterDataHook = ReturnType<typeof useAccountsMasterData>;

export default function QRModals({ hook }: { hook: AccountsMasterDataHook }) {
  const {
    branches,
    showQuickDownloadModal, setShowQuickDownloadModal, quickRole, setQuickRole, quickBranch, setQuickBranch,
    handleExecuteQuickDownload, generatingQR, qrProgress,
  } = hook;

  return (
    <>
      {/* ── Modal: Quick Batch Download Preset ── */}
      <Modal
        open={showQuickDownloadModal}
        onClose={() => setShowQuickDownloadModal(false)}
        title={"Quick Download QR Codes"}
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowQuickDownloadModal(false)}>
              {"Cancel"}
            </Btn>
            <Btn variant="soft" icon="print" onClick={() => handleExecuteQuickDownload("print")}>
              {"Print A4 Sheet"}
            </Btn>
            <Btn variant="primary" icon="download" onClick={() => handleExecuteQuickDownload("zip")}>
              {"Download ZIP"}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {"Select a role or center filter to download all QR codes at once without manual checkbox selection."}
          </p>

          <Field label={"Filter Role"}>
            <Select value={quickRole} onChange={(e) => setQuickRole(e.target.value as RoleFilter)}>
              <option value="all">{"All Roles"}</option>
              <option value="coach">{"All Coaches"}</option>
              <option value="student">{"All Students"}</option>
              <option value="staff">{"All Staff"}</option>
              <option value="admin">{"All Admins"}</option>
              <option value="manager_center">{"All Manager Centers"}</option>
              <option value="school">{"All Schools"}</option>
            </Select>
          </Field>

          <Field label={"Filter Center"}>
            <Select value={quickBranch} onChange={(e) => setQuickBranch(e.target.value)}>
              <option value="all">{"All Centers"}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} translate="no" className="notranslate">
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="p-3 bg-paper-tint rounded-xl border border-line text-xs text-ink-mute space-y-1">
            <div className="font-semibold text-ink">{"Generated Image Format:"}</div>
            <div>• {"Each ID card includes name, role badge, identity number, and QR Code."}</div>
            <div>
              • {"Automatic file naming:"}{" "}
              <code className="font-mono text-ocean-700 bg-white px-1 rounded">
                [ROLE]_[NAME]_[USER_NO].png
              </code>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Batch QR Generation Progress ── */}
      <Modal open={generatingQR && qrProgress !== null} onClose={() => {}} title={"Creating ZIP Archive..."} size="sm">
        <div className="py-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center animate-pulse">
            <Icon name="download" className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-ink">
              Generating QR Cards...
            </div>
            <div className="text-xs text-ink-mute mt-1">
              Processing {qrProgress?.current || 0} of {qrProgress?.total || 0} accounts
            </div>
          </div>
          {qrProgress && (
            <div className="w-full bg-paper-deep rounded-full h-2 overflow-hidden border border-line">
              <div
                className="bg-ocean-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(qrProgress.current / qrProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
