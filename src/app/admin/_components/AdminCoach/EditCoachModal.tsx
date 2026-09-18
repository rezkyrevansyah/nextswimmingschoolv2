"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import DatePicker from "@/components/ui/DatePicker";
import Modal from "@/components/ui/Modal";
import type { AdminCoachHook } from "./_hook";

export default function EditCoachModal({ hook }: { hook: AdminCoachHook }) {
  const {
    openEdit, setOpenEdit, editForm, setEditForm, editSaving, editAvatarPreview, setEditAvatarFile, setEditAvatarPreview,
    detail, saveEdit,
  } = hook;

  return (
    <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={"Edit Coach Data"} size="md"
      footer={<><Btn variant="ghost" onClick={() => setOpenEdit(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving…" : "Save"}</Btn></>}>
      <div className="space-y-4">
        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar name={editForm.full_name || detail?.full_name || ""} src={editAvatarPreview ?? detail?.avatar_url ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setEditAvatarFile(f); setEditAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
          <p className="text-xs text-ink-faint">{"Click to change photo (optional)"}</p>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Personal Data"}</div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={"Full name"} required><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
              <Field label={"Nickname"} hint={"Optional"}><Input value={editForm.nick_name} onChange={e => setEditForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={"E.g. Coach Reza"} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={"Gender"}>
                <Select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">{"Select…"}</option>
                  <option value="male">{"Male"}</option>
                  <option value="female">{"Female"}</option>
                </Select>
              </Field>
              <Field label={"Date of birth"} hint={"Optional"}><DatePicker value={editForm.birth_date} onChange={v => setEditForm(f => ({ ...f, birth_date: v }))} /></Field>
            </div>
            <Field label={"Phone / WA"}><Input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
            <Field label={"Address"} hint={"Optional"}><Textarea rows={2} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder={"E.g. Jl. Anggrek No. 12, Bekasi"} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Education (Optional)"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={"Last education"}>
              <Select value={editForm.education_level} onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}>
                <option value="">{"Select…"}</option>
                {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label={"Institution name"}><Input value={editForm.education_institution} onChange={e => setEditForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={"E.g. University of Indonesia"} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Coach Profile"}</div>
          <div className="space-y-3">
            <Field label={"Specialization"} hint={"Optional"}><Input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))} placeholder={"E.g. Children's swimming technique"} /></Field>
            <Field label={"Bio / Description"} hint={"Optional"}><Textarea rows={2} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder={"E.g. 5 years of experience teaching early-childhood swimming with a play-based approach."} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Bank Information (Optional)"}</div>
          <div className="space-y-3">
            <Field label={"Bank name"}><Input value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={"E.g. BCA, BRI, Mandiri"} /></Field>
            <Field label={"Account number"}><Input value={editForm.bank_account} onChange={e => setEditForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={"E.g. 1234567890"} /></Field>
            <Field label={"Account holder"}><Input value={editForm.bank_holder} onChange={e => setEditForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={"E.g. Reza Fahlevi"} /></Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
