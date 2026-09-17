"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea, Switch } from "@/components/ui/FormFields";
import { fmtIDR } from "@/lib/utils";
import type { AdminMemberHook } from "./_hook";

export default function MemberActionModals({ hook }: { hook: AdminMemberHook }) {
  const {
    t, detail,
    openResetPwd, setOpenResetPwd, newPwd, setNewPwd, showNewPwd, setShowNewPwd, resetPassword,
    suspendMemberTarget, setSuspendMemberTarget, suspendMemberForm, setSuspendMemberForm, suspendingMember, doSuspendMember,
    openAddSesi, setOpenAddSesi, addSesiForm, setAddSesiForm, savingAddSesi, privateClassPackages, doAddSesi,
    classes,
  } = hook;

  return (
    <>
      {/* Reset password modal */}
      <Modal open={openResetPwd} onClose={() => setOpenResetPwd(false)} title={t("admin.members.resetPasswordModalTitle2", { name: detail?.profile?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenResetPwd(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={resetPassword}>{t("admin.coaches.resetPasswordBtn")}</Btn></>}>
        <Field label={t("admin.coaches.fieldNewPassword")} hint={t("admin.coaches.minCharsHint")}>
          <div className="relative">
            <Input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" className="pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowNewPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
              <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </Modal>

      {/* Suspend member modal */}
      <Modal open={!!suspendMemberTarget} onClose={() => setSuspendMemberTarget(null)} title={t("admin.members.suspendMemberModalTitle", { name: suspendMemberTarget?.profile?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendMemberTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspendMember} disabled={suspendingMember}>{suspendingMember ? t("common.actions.saving") : t("admin.coaches.applySuspendBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>{t("admin.members.suspendMemberNoticeText")}</span></div>
          </Card>
          <Field label={t("admin.coaches.fieldSuspendReason")} required>
            <Textarea rows={2} value={suspendMemberForm.reason} onChange={e => setSuspendMemberForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("admin.members.suspendReasonPlaceholder2")} />
          </Field>
          <Field label={t("admin.coaches.fieldSuspendUntil")} required hint={t("admin.members.suspendUntilHintMember")}>
            <Input type="date" value={suspendMemberForm.until} onChange={e => setSuspendMemberForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* Tambah Sesi modal */}
      <Modal open={openAddSesi} onClose={() => setOpenAddSesi(false)} title={t("admin.members.addSessionModalTitle", { name: detail?.profile?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAddSesi(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? t("common.actions.saving") : t("admin.members.addSessionBtn")}</Btn></>}>
        <div className="space-y-4">
          {privateClassPackages.length > 0 ? (
            <Field label={t("admin.pembayaran.fieldSelectPackage")} required hint={t("admin.members.packageAutoFillHint")}>
              <div className="space-y-2">
                {privateClassPackages.map(pkg => (
                  <button key={pkg.id} type="button" onClick={() => setAddSesiForm(f => ({ ...f, jumlah: String(pkg.sessions), selectedPackageId: pkg.id }))}
                    className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl border-2 text-sm transition ${addSesiForm.selectedPackageId === pkg.id ? "border-ocean-500 bg-ocean-50" : "border-line bg-white hover:border-ocean-300"}`}>
                    <span className="font-semibold text-ink">{pkg.name}</span>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono font-bold text-ocean-700">{fmtIDR(pkg.price)}</div>
                      <div className="text-xs text-ink-mute">{t("admin.pembayaran.sessionsUnit", { n: pkg.sessions })}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label={t("admin.members.fieldSessionsToAdd")} required>
              <Input type="number" min="1" value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} placeholder="Mis. 8" />
            </Field>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-ocean-50/50 border border-ocean-100">
            <div><div className="font-semibold text-ink text-sm">{t("admin.members.generateBillLabel")}</div><div className="text-xs text-ink-mute">{privateClassPackages.length > 0 ? t("admin.members.generateBillFromPackageHint") : t("admin.members.generateBillFromPriceHint")}</div></div>
            <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
          </div>
          {addSesiForm.generate_bill && (() => {
            const selectedPkg = privateClassPackages.find(p => p.id === addSesiForm.selectedPackageId);
            if (selectedPkg) {
              return (
                <div className="bg-paper-tint rounded-xl p-3 text-sm">
                  <div className="text-ink-mute">{t("admin.members.billToBeCreatedLabel")}</div>
                  <div className="font-bold text-ink mt-1">{fmtIDR(selectedPkg.price)}</div>
                  <div className="text-xs text-ink-mute">{selectedPkg.name} · {t("admin.pembayaran.sessionsUnit", { n: selectedPkg.sessions })}</div>
                </div>
              );
            }
            const classRow = classes.find(c => c.id === detail?.member_classes?.[0]?.class?.id);
            const pricePerSession = classRow?.price_per_session;
            const jumlah = Number(addSesiForm.jumlah) || 0;
            return pricePerSession ? (
              <div className="bg-paper-tint rounded-xl p-3 text-sm">
                <div className="text-ink-mute">{t("admin.members.billToBeCreatedLabel")}</div>
                <div className="font-bold text-ink mt-1">{fmtIDR(pricePerSession * jumlah)}</div>
                <div className="text-xs text-ink-mute">{jumlah} × {fmtIDR(pricePerSession)}</div>
              </div>
            ) : (
              <div className="text-xs text-warn-600">{t("admin.members.noPackageOrPriceSet")}</div>
            );
          })()}
        </div>
      </Modal>
    </>
  );
}
