"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea, Switch } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { AdminStudentHook } from "./_hook";

export default function StudentActionModals({ hook }: { hook: AdminStudentHook }) {
  const {
    detail,
    openResetPwd, setOpenResetPwd, newPwd, setNewPwd, showNewPwd, setShowNewPwd, resetPassword,
    suspendStudentTarget, setSuspendStudentTarget, suspendStudentForm, setSuspendStudentForm, suspendingStudent, doSuspendStudent,
    openAddSesi, setOpenAddSesi, addSesiForm, setAddSesiForm, savingAddSesi, privateClassPackages, doAddSesi,
    classes,
  } = hook;

  return (
    <>
      {/* Reset password modal */}
      <Modal open={openResetPwd} onClose={() => setOpenResetPwd(false)} title={(<>{"Reset Password — "}<NoTranslate>{detail?.profile?.full_name ?? ""}</NoTranslate></>)} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenResetPwd(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={resetPassword}>{"Reset Password"}</Btn></>}>
        <Field label={"New password"} hint={"Minimum 6 characters"}>
          <div className="relative">
            <Input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" className="pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowNewPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
              <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </Modal>

      {/* Suspend student modal */}
      <Modal open={!!suspendStudentTarget} onClose={() => setSuspendStudentTarget(null)} title={(<>{"Suspend Student — "}<NoTranslate>{suspendStudentTarget?.profile?.full_name ?? ""}</NoTranslate></>)} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setSuspendStudentTarget(null)}>{"Cancel"}</Btn><Btn variant="ghost" className="text-warn-600" onClick={doSuspendStudent} disabled={suspendingStudent}>{suspendingStudent ? "Saving…" : "Apply Suspend"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-warn-50 border-warn-200">
            <div className="flex items-start gap-2.5 text-sm text-warn-700"><Icon name="warning" className="w-5 h-5 shrink-0 mt-0.5" /><span>{"The student cannot log in during the suspension and won't appear in the coach's attendance list."}</span></div>
          </Card>
          <Field label={"Suspend reason"} required>
            <Textarea rows={2} value={suspendStudentForm.reason} onChange={e => setSuspendStudentForm(f => ({ ...f, reason: e.target.value }))} placeholder={"E.g. Unpaid bill for 2 months."} />
          </Field>
          <Field label={"Suspend ends"} required hint={"Student automatically reactivates after this date"}>
            <Input type="date" value={suspendStudentForm.until} onChange={e => setSuspendStudentForm(f => ({ ...f, until: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Modal>

      {/* Tambah Sesi modal */}
      <Modal open={openAddSesi} onClose={() => setOpenAddSesi(false)} title={(<>{"Add Session — "}<NoTranslate>{detail?.profile?.full_name ?? ""}</NoTranslate></>)} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenAddSesi(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={doAddSesi} disabled={savingAddSesi}>{savingAddSesi ? "Saving…" : "Add Session"}</Btn></>}>
        <div className="space-y-4">
          {privateClassPackages.length > 0 ? (
            <Field label={"Select package"} required hint={"Session count fills in automatically from the selected package."}>
              <div className="space-y-2">
                {privateClassPackages.map(pkg => (
                  <button key={pkg.id} type="button" onClick={() => setAddSesiForm(f => ({ ...f, jumlah: String(pkg.sessions), selectedPackageId: pkg.id }))}
                    className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl border-2 text-sm transition ${addSesiForm.selectedPackageId === pkg.id ? "border-ocean-500 bg-ocean-50" : "border-line bg-white hover:border-ocean-300"}`}>
                    <span className="font-semibold text-ink"><NoTranslate>{pkg.name}</NoTranslate></span>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono font-bold text-ocean-700">{fmtIDR(pkg.price)}</div>
                      <div className="text-xs text-ink-mute">{`${pkg.sessions} sessions`}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label={"Number of sessions to add"} required>
              <Input type="number" min="1" value={addSesiForm.jumlah} onChange={e => setAddSesiForm(f => ({ ...f, jumlah: e.target.value }))} placeholder="Mis. 8" />
            </Field>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-ocean-50/50 border border-ocean-100">
            <div><div className="font-semibold text-ink text-sm">{"Generate bill"}</div><div className="text-xs text-ink-mute">{privateClassPackages.length > 0 ? "Automatically create a bill from the selected package." : "Automatically create a bill based on the price per session."}</div></div>
            <Switch checked={addSesiForm.generate_bill} onChange={v => setAddSesiForm(f => ({ ...f, generate_bill: v }))} />
          </div>
          {addSesiForm.generate_bill && (() => {
            const selectedPkg = privateClassPackages.find(p => p.id === addSesiForm.selectedPackageId);
            if (selectedPkg) {
              return (
                <div className="bg-paper-tint rounded-xl p-3 text-sm">
                  <div className="text-ink-mute">{"Bill to be created:"}</div>
                  <div className="font-bold text-ink mt-1">{fmtIDR(selectedPkg.price)}</div>
                  <div className="text-xs text-ink-mute"><NoTranslate>{selectedPkg.name}</NoTranslate> · {`${selectedPkg.sessions} sessions`}</div>
                </div>
              );
            }
            const classRow = classes.find(c => c.id === detail?.student_classes?.[0]?.class?.id);
            const pricePerSession = classRow?.price_per_session;
            const jumlah = Number(addSesiForm.jumlah) || 0;
            return pricePerSession ? (
              <div className="bg-paper-tint rounded-xl p-3 text-sm">
                <div className="text-ink-mute">{"Bill to be created:"}</div>
                <div className="font-bold text-ink mt-1">{fmtIDR(pricePerSession * jumlah)}</div>
                <div className="text-xs text-ink-mute">{jumlah} × {fmtIDR(pricePerSession)}</div>
              </div>
            ) : (
              <div className="text-xs text-warn-600">{"No package or price per session has been set for this class."}</div>
            );
          })()}
        </div>
      </Modal>
    </>
  );
}
