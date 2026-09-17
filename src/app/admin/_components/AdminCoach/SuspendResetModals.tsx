"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import type { AdminCoachHook } from "./_hook";

export default function SuspendResetModals({ hook }: { hook: AdminCoachHook }) {
  const {
    t, suspendTarget, setSuspendTarget, suspending, suspendForm, setSuspendForm, doSuspend,
    detail, openReset, setOpenReset, newPassword, setNewPassword, resetSaving, showNewPassword, setShowNewPassword, resetPassword,
  } = hook;

  return (
    <>
      {/* ── Suspend coach modal ── */}
      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={t("admin.coaches.suspendModalTitle", { name: suspendTarget?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspend} disabled={suspending}>{suspending ? t("common.actions.saving") : t("admin.coaches.applySuspendBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>{t("admin.coaches.suspendNoticeText")}</span></div>
          </Card>
          <Field label={t("admin.coaches.fieldSuspendReason")} required>
            <Textarea rows={2} value={suspendForm.reason} onChange={e => setSuspendForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("admin.coaches.suspendReasonPlaceholder")} />
          </Field>
          <Field label={t("admin.coaches.fieldSuspendUntil")} required hint={t("admin.coaches.suspendUntilHint")}>
            <Input type="date" value={suspendForm.until} onChange={e => setSuspendForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* ── Reset password modal ── */}
      <Modal open={openReset} onClose={() => setOpenReset(false)} title={t("admin.coaches.resetPasswordModalTitle", { name: detail?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenReset(false)}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={resetPassword} disabled={resetSaving}>{resetSaving ? t("admin.coaches.resettingBtn") : t("admin.coaches.resetPasswordBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-ocean-50 border-ocean-100">
            <div className="text-xs text-ocean-700">{t("admin.coaches.newPasswordNoticeText")}</div>
          </Card>
          <Field label={t("admin.coaches.fieldNewPassword")} required hint={t("admin.coaches.minCharsHint")}>
            <div className="relative">
              <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showNewPassword ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>
    </>
  );
}
