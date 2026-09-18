"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminCoachHook } from "./_hook";

export default function SuspendResetModals({ hook }: { hook: AdminCoachHook }) {
  const {
    suspendTarget, setSuspendTarget, suspending, suspendForm, setSuspendForm, doSuspend,
    detail, openReset, setOpenReset, newPassword, setNewPassword, resetSaving, showNewPassword, setShowNewPassword, resetPassword,
  } = hook;

  return (
    <>
      {/* ── Suspend coach modal ── */}
      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={(<>{"Suspend Coach — "}<NoTranslate>{suspendTarget?.full_name ?? ""}</NoTranslate></>)} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendTarget(null)}>{"Cancel"}</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspend} disabled={suspending}>{suspending ? "Saving…" : "Apply Suspend"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>{"The coach can still log in but cannot perform activities (Clock In, enter report cards, etc.) during the suspension."}</span></div>
          </Card>
          <Field label={"Suspend reason"} required>
            <Textarea rows={2} value={suspendForm.reason} onChange={e => setSuspendForm(f => ({ ...f, reason: e.target.value }))} placeholder={"E.g. Attendance procedure violation."} />
          </Field>
          <Field label={"Suspend ends"} required hint={"Coach automatically reactivates after this date"}>
            <Input type="date" value={suspendForm.until} onChange={e => setSuspendForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* ── Reset password modal ── */}
      <Modal open={openReset} onClose={() => setOpenReset(false)} title={(<>{"Reset Password — "}<NoTranslate>{detail?.full_name ?? ""}</NoTranslate></>)} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenReset(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={resetPassword} disabled={resetSaving}>{resetSaving ? "Resetting…" : "Reset Password"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-ocean-50 border-ocean-100">
            <div className="text-xs text-ocean-700">{"The new password is active immediately without email confirmation. Share the new password with the coach."}</div>
          </Card>
          <Field label={"New password"} required hint={"Minimum 6 characters"}>
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
