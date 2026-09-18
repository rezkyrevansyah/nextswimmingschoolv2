"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { calcAge } from "../../_utils";
import { fmtDate, fmtDateLong, waLink } from "@/lib/utils";
import type { useApprovementData } from "./useApprovementData";

type ApprovementDataHook = ReturnType<typeof useApprovementData>;

export default function RegistrationModals({ hook }: { hook: ApprovementDataHook }) {
  const {
    genderLabel,
    detailReg, setDetailReg, openEditReg, deleteReg, rejectReg, approvingId, openApproveReg,
    editReg, setEditReg, editRegForm, setEditRegForm, savingEdit, saveEditReg,
    rejectRegTarget, setRejectRegTarget, regRejectReason, setRegRejectReason, rejectingReg, confirmRejectReg,
    approveTarget, setApproveTarget, proofFile, setProofFile, proofInputRef, confirmApproveReg,
  } = hook;

  return (
    <>
      {/* ── Detail Registrasi Modal ─────────────────────────────────────────── */}
      <Modal open={!!detailReg} onClose={() => setDetailReg(null)} title={"Registration Detail"} size="sm"
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={() => detailReg && openEditReg(detailReg)}>{"Edit"}</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && deleteReg(detailReg)}>{"Delete"}</Btn>
            <Btn variant="ghost" className="text-danger-500" onClick={() => detailReg && rejectReg(detailReg)}>{"Reject"}</Btn>
            <div className="flex-1" />
            {detailReg && (
              <a href={waLink(`Hi ${detailReg.full_name}, thank you for registering at Next Swimming School.`, detailReg.phone_owner === "parent" ? detailReg.parent_phone : detailReg.phone)} target="_blank" rel="noreferrer">
                <Btn variant="wa" icon="whatsapp">{"Chat WA"}</Btn>
              </a>
            )}
            <Btn variant="primary" icon="check" disabled={!!approvingId} onClick={() => detailReg && openApproveReg(detailReg)}>
              {approvingId ? "Processing…" : "Approve"}
            </Btn>
          </div>
        }>
        {detailReg && (() => {
          const age = detailReg.birth_date ? calcAge(detailReg.birth_date) : null;
          const rows: [string, React.ReactNode][] = [
            ["Full name", <NoTranslate key="full_name">{detailReg.full_name}</NoTranslate>],
            ["Email", detailReg.email ? <NoTranslate key="email">{detailReg.email}</NoTranslate> : "—"],
            ["Date of birth", detailReg.birth_date ? `${fmtDate(detailReg.birth_date)}${age ? ` (${`${age} y`})` : ""}` : "—"],
            ["Gender", genderLabel(detailReg.gender) ?? "—"],
            ["Phone number", <NoTranslate key="phone">{detailReg.phone ?? "—"}</NoTranslate>],
            ["Phone owner", detailReg.phone_owner === "parent" ? "Parent / guardian" : "Self"],
            ...(detailReg.phone_owner === "parent" ? [
              ["Parent's name", <NoTranslate key="parent_name">{detailReg.parent_name ?? "—"}</NoTranslate>] as [string, React.ReactNode],
              ["Parent's phone number", <NoTranslate key="parent_phone">{detailReg.parent_phone ?? "—"}</NoTranslate>] as [string, React.ReactNode],
            ] : []),
            ["Address", <NoTranslate key="address">{detailReg.address ?? "—"}</NoTranslate>],
            ["Health notes", <NoTranslate key="health_notes">{detailReg.health_notes ?? "—"}</NoTranslate>],
            ["Registration date", fmtDateLong(detailReg.created_at)],
          ];
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <Avatar name={detailReg.full_name} size={48} />
                <div>
                  <div className="font-display font-bold text-ink"><NoTranslate>{detailReg.full_name}</NoTranslate></div>
                  <Status kind="pending" className="mt-1">{"Awaiting review"}</Status>
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
      <Modal open={!!rejectRegTarget} onClose={() => setRejectRegTarget(null)} title={"Reject Registration"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectRegTarget(null)}>{"Cancel"}</Btn><Btn variant="danger" onClick={confirmRejectReg} disabled={rejectingReg}>{rejectingReg ? "Rejecting…" : "Reject Registration"}</Btn></>}>
        <div className="space-y-4">
          {rejectRegTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink"><NoTranslate>{rejectRegTarget.full_name}</NoTranslate></div>
              <div className="text-ink-mute"><NoTranslate>{rejectRegTarget.phone ?? "—"}</NoTranslate></div>
            </div>
          )}
          <Field label={"Rejection reason"} required>
            <Textarea rows={3} value={regRejectReason} onChange={e => setRegRejectReason(e.target.value)} placeholder={"E.g. Incomplete data, WhatsApp number inactive."} />
          </Field>
        </div>
      </Modal>

      {/* ── Edit Registrasi ───────────────────────────────────────────────── */}
      <Modal open={!!editReg} onClose={() => setEditReg(null)} title={"Edit Registration Data"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setEditReg(null)}>{"Cancel"}</Btn><Btn variant="primary" onClick={saveEditReg} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-4">
          <Field label={"Full name"} required><Input value={editRegForm.full_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label={"Email"} required hint={"Will be used as the login account"}><Input type="email" placeholder="nama@email.com" value={editRegForm.email ?? ""} onChange={e => setEditRegForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={"Date of birth"}><DatePicker value={editRegForm.birth_date ?? ""} onChange={v => setEditRegForm(f => ({ ...f, birth_date: v }))} /></Field>
            <Field label={"Gender"}>
              <Select value={editRegForm.gender ?? ""} onChange={e => setEditRegForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">—</option>
                <option value="male">{"Male"}</option>
                <option value="female">{"Female"}</option>
              </Select>
            </Field>
          </div>
          <Field label={"Phone number"}><Input value={editRegForm.phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label={"Phone owner"}>
            <Select value={editRegForm.phone_owner ?? "self"} onChange={e => setEditRegForm(f => ({ ...f, phone_owner: e.target.value }))}>
              <option value="self">{"Self"}</option>
              <option value="parent">{"Parent / guardian"}</option>
            </Select>
          </Field>
          {editRegForm.phone_owner === "parent" && <>
            <Field label={"Parent's name"}><Input value={editRegForm.parent_name ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={"Parent's phone number"}><Input value={editRegForm.parent_phone ?? ""} onChange={e => setEditRegForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>}
          <Field label={"Address"}><Textarea rows={2} value={editRegForm.address ?? ""} onChange={e => setEditRegForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label={"Health notes / allergies"}><Input value={editRegForm.health_notes ?? ""} onChange={e => setEditRegForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        </div>
      </Modal>

      {/* ── Approve + Bukti Transfer ──────────────────────────────────────── */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title={"Approve Registration"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setApproveTarget(null)}>{"Cancel"}</Btn><Btn variant="primary" icon="check" onClick={confirmApproveReg} disabled={!!approvingId}>{approvingId ? "Processing…" : "Approve & Create Account"}</Btn></>}>
        {approveTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm"><NoTranslate>{approveTarget.full_name}</NoTranslate></div>
              <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{approveTarget.phone ?? "—"}</NoTranslate></div>
            </Card>
            <div>
              <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">{"Proof of transfer"}</span>
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
                      <div className="text-sm font-semibold text-ink-soft">{"Click to upload"}</div>
                      <div className="text-xs text-ink-faint">{"JPG, PNG, or PDF · Optional"}</div>
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
              <span className="text-xs text-ink-faint mt-1 block">{"Upload proof of transfer before approving. Optional if not yet available."}</span>
            </div>
            <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3 text-xs text-ocean-800">
              {"The student account will be created automatically with a temporary password. Complete the data & send the credential via WhatsApp from the Student menu."}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
