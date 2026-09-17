"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import { calcAge } from "../../_utils";
import { fmtDate, fmtDateLong, waLink } from "@/lib/utils";
import type { useApprovementData } from "./useApprovementData";

type ApprovementDataHook = ReturnType<typeof useApprovementData>;

export default function RegistrationModals({ hook }: { hook: ApprovementDataHook }) {
  const {
    t, genderLabel,
    detailReg, setDetailReg, openEditReg, deleteReg, rejectReg, approvingId, openApproveReg,
    editReg, setEditReg, editRegForm, setEditRegForm, savingEdit, saveEditReg,
    rejectRegTarget, setRejectRegTarget, regRejectReason, setRegRejectReason, rejectingReg, confirmRejectReg,
    approveTarget, setApproveTarget, proofFile, setProofFile, proofInputRef, confirmApproveReg,
  } = hook;

  return (
    <>
      {/* ── Detail Registrasi Modal ─────────────────────────────────────────── */}
      <Modal open={!!detailReg} onClose={() => setDetailReg(null)} title={t("admin.approvement.detailRegModalTitle")} size="sm"
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={() => detailReg && openEditReg(detailReg)}>{t("common.actions.edit")}</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && deleteReg(detailReg)}>{t("common.actions.delete")}</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && rejectReg(detailReg)}>{t("common.actions.reject")}</Btn>
            <div className="flex-1" />
            {detailReg && (
              <a href={waLink(t("admin.approvement.welcomeWaMessage", { name: detailReg.full_name }), detailReg.phone_owner === "parent" ? detailReg.parent_phone : detailReg.phone)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">{t("admin.approvement.chatWaBtn")}</Btn>
              </a>
            )}
            <Btn variant="primary" icon="check" disabled={!!approvingId} onClick={() => detailReg && openApproveReg(detailReg)}>
              {approvingId ? t("admin.approvement.processingBtn") : t("common.actions.approve")}
            </Btn>
          </div>
        }>
        {detailReg && (() => {
          const age = detailReg.birth_date ? calcAge(detailReg.birth_date) : null;
          const rows: [string, string | null | undefined][] = [
            [t("admin.approvement.rowFullName"), detailReg.full_name],
            [t("admin.approvement.rowEmail"), detailReg.email ?? "—"],
            [t("admin.approvement.rowBirthDate"), detailReg.birth_date ? `${fmtDate(detailReg.birth_date)}${age ? ` (${t("admin.approvement.yearsSuffix", { n: age })})` : ""}` : "—"],
            [t("admin.approvement.rowGender"), genderLabel(detailReg.gender) ?? "—"],
            [t("admin.approvement.rowPhone"), detailReg.phone ?? "—"],
            [t("admin.approvement.rowPhoneOwner"), detailReg.phone_owner === "parent" ? t("admin.approvement.phoneOwnerParent") : t("admin.approvement.phoneOwnerSelf")],
            ...(detailReg.phone_owner === "parent" ? [
              [t("admin.approvement.rowParentName"), detailReg.parent_name ?? "—"] as [string, string],
              [t("admin.approvement.rowParentPhone"), detailReg.parent_phone ?? "—"] as [string, string],
            ] : []),
            [t("admin.approvement.rowAddress"), detailReg.address ?? "—"],
            [t("admin.approvement.rowHealthNotes"), detailReg.health_notes ?? "—"],
            [t("admin.approvement.rowRegDate"), fmtDateLong(detailReg.created_at)],
          ];
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <Avatar name={detailReg.full_name} size={48} />
                <div>
                  <div className="font-display font-bold text-ink">{detailReg.full_name}</div>
                  <Status kind="pending" className="mt-1">{t("admin.approvement.waitingReviewStatus")}</Status>
                </div>
              </div>
              <div className="divide-y divide-line">
                {rows.map(([label, value]) => (
                  <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                    <span className="text-ink-mute">{label}</span>
                    <span className="text-ink font-medium break-words">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Tolak Registrasi ──────────────────────────────────────────────── */}
      <Modal open={!!rejectRegTarget} onClose={() => setRejectRegTarget(null)} title={t("admin.approvement.rejectRegModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectRegTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="danger" onClick={confirmRejectReg} disabled={rejectingReg}>{rejectingReg ? t("admin.approvement.rejectingBtn") : t("admin.approvement.rejectRegBtn")}</Btn></>}>
        <div className="space-y-4">
          {rejectRegTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink">{rejectRegTarget.full_name}</div>
              <div className="text-ink-mute">{rejectRegTarget.phone ?? "—"}</div>
            </div>
          )}
          <Field label={t("admin.approvement.fieldRejectReason")} required>
            <Textarea rows={3} value={regRejectReason} onChange={e => setRegRejectReason(e.target.value)} placeholder={t("admin.approvement.regRejectReasonPlaceholder")} />
          </Field>
        </div>
      </Modal>

      {/* ── Edit Registrasi ───────────────────────────────────────────────── */}
      <Modal open={!!editReg} onClose={() => setEditReg(null)} title={t("admin.approvement.editRegModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditReg(null)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={saveEditReg} disabled={savingEdit}>{savingEdit ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.approvement.rowFullName")} required><Input value={editRegForm.full_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label={t("admin.approvement.rowEmail")} required hint={t("admin.approvement.emailLoginHint")}><Input type="email" placeholder="nama@email.com" value={editRegForm.email ?? ""} onChange={e => setEditRegForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("admin.approvement.rowBirthDate")}><DatePicker value={editRegForm.birth_date ?? ""} onChange={v => setEditRegForm(f => ({ ...f, birth_date: v }))} /></Field>
            <Field label={t("admin.approvement.rowGender")}>
              <Select value={editRegForm.gender ?? ""} onChange={e => setEditRegForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">{t("admin.approvement.genderMale")}</option>
                <option value="female">{t("admin.approvement.genderFemale")}</option>
              </Select>
            </Field>
          </div>
          <Field label={t("admin.approvement.rowPhone")}><Input value={editRegForm.phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label={t("admin.approvement.rowPhoneOwner")}>
            <Select value={editRegForm.phone_owner ?? "self"} onChange={e => setEditRegForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">{t("admin.approvement.phoneOwnerSelf")}</option>
              <option value="parent">{t("admin.approvement.phoneOwnerParent")}</option>
            </Select>
          </Field>
          {editRegForm.phone_owner === "parent" && <>
            <Field label={t("admin.approvement.rowParentName")}><Input value={editRegForm.parent_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={t("admin.approvement.rowParentPhone")}><Input value={editRegForm.parent_phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>}
          <Field label={t("admin.approvement.rowAddress")}><Textarea rows={2} value={editRegForm.address ?? ""} onChange={e => setEditRegForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label={t("admin.approvement.fieldHealthNotes")}><Input value={editRegForm.health_notes ?? ""} onChange={e => setEditRegForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* ── Approve + Bukti Transfer ──────────────────────────────────────── */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title={t("admin.approvement.approveRegModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setApproveTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" icon="check" onClick={confirmApproveReg} disabled={!!approvingId}>{approvingId ? t("admin.approvement.processingBtn") : t("admin.approvement.approveCreateAccountBtn")}</Btn></>}>
        {approveTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm">{approveTarget.full_name}</div>
              <div className="text-xs text-ink-mute mt-0.5">{approveTarget.phone ?? "—"}</div>
            </Card>
            <div>
              <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">{t("admin.approvement.proofOfTransferLabel")}</span>
              <div className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl border-2 border-dashed transition-colors ${proofFile ? "border-ocean-400 bg-ocean-50" : "border-line hover:border-wave-300 hover:bg-paper-tint"}`}>
                <input ref={proofInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => proofInputRef.current?.click()}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${proofFile ? "bg-ocean-100 text-ocean-600" : "bg-paper-deep text-ink-faint"}`}>
                  <Icon name={proofFile ? "check" : "upload"} className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => proofInputRef.current?.click()}>
                  {proofFile ? (
                    <>
                      <div className="text-sm font-semibold text-ink truncate">{proofFile.name}</div>
                      <div className="text-xs text-ink-mute">{(proofFile.size / 1024).toFixed(0)} KB</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-ink-soft">{t("admin.approvement.clickToUploadGeneric")}</div>
                      <div className="text-xs text-ink-faint">{t("admin.approvement.fileTypeOptionalHint")}</div>
                    </>
                  )}
                </div>
                {proofFile && (
                  <button type="button" onClick={() => setProofFile(null)}
                    className="shrink-0 w-6 h-6 rounded-full bg-danger-50 text-danger-400 hover:bg-danger-100 flex items-center justify-center transition-colors">
                    <Icon name="x" className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <span className="text-xs text-ink-faint mt-1 block">{t("admin.approvement.uploadProofHint")}</span>
            </div>
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3 text-xs text-ocean-800">
              {t("admin.approvement.autoAccountNotice")}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
