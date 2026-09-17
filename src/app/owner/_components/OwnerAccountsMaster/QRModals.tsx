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
    t, branches,
    showQuickDownloadModal, setShowQuickDownloadModal, quickRole, setQuickRole, quickBranch, setQuickBranch,
    handleExecuteQuickDownload, generatingQR, qrProgress,
  } = hook;

  return (
    <>
      {/* ── Modal: Quick Batch Download Preset ── */}
      <Modal
        open={showQuickDownloadModal}
        onClose={() => setShowQuickDownloadModal(false)}
        title={t("owner.accounts.quickDownloadModalTitle")}
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowQuickDownloadModal(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="soft" icon="print" onClick={() => handleExecuteQuickDownload("print")}>
              {t("owner.accounts.printA4SheetBtn")}
            </Btn>
            <Btn variant="primary" icon="download" onClick={() => handleExecuteQuickDownload("zip")}>
              {t("owner.accounts.downloadZipBtn")}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {t("owner.accounts.quickDownloadModalHint")}
          </p>

          <Field label={t("owner.accounts.filterRoleLabel")}>
            <Select value={quickRole} onChange={(e) => setQuickRole(e.target.value as RoleFilter)}>
              <option value="all">{t("owner.accounts.filterRoleAll")}</option>
              <option value="coach">{t("owner.accounts.filterRoleCoachOnly")}</option>
              <option value="member">{t("owner.accounts.filterRoleMemberOnly")}</option>
              <option value="staff">{t("owner.accounts.filterRoleStaffOnly")}</option>
              <option value="admin">{t("owner.accounts.filterRoleAdminOnly")}</option>
              <option value="manager_center">{t("owner.accounts.filterRoleManagerCenterOnly")}</option>
              <option value="school">{t("owner.accounts.filterRoleSchoolOnly")}</option>
            </Select>
          </Field>

          <Field label={t("owner.accounts.filterCenterLabel")}>
            <Select value={quickBranch} onChange={(e) => setQuickBranch(e.target.value)}>
              <option value="all">{t("owner.accounts.filterCenterAll")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} translate="no" className="notranslate">
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="p-3 bg-paper-tint rounded-xl border border-line text-xs text-ink-mute space-y-1">
            <div className="font-semibold text-ink">{t("owner.accounts.generatedImageFormatTitle")}</div>
            <div>• {t("owner.accounts.generatedImageFormatBullet1")}</div>
            <div>
              • {t("owner.accounts.generatedImageFormatBullet2")}{" "}
              <code className="font-mono text-ocean-700 bg-white px-1 rounded">
                [ROLE]_[NAME]_[USER_NO].png
              </code>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Batch QR Generation Progress ── */}
      <Modal open={generatingQR && qrProgress !== null} onClose={() => {}} title={t("owner.accounts.creatingZipTitle")} size="sm">
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
