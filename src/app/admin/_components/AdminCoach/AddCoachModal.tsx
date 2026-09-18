"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import DatePicker from "@/components/ui/DatePicker";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import Modal from "@/components/ui/Modal";
import type { AdminCoachHook } from "./_hook";

export default function AddCoachModal({ hook }: { hook: AdminCoachHook }) {
  const {
    openAdd, setOpenAdd, saving, form, setForm, createAvatarPreview, setCreateAvatarFile, setCreateAvatarPreview,
    createCerts, setCreateCerts, showCoachPwd, setShowCoachPwd, createCoach,
  } = hook;

  return (
    <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={"Add Coach"} size="md"
      footer={<><Btn variant="ghost" onClick={() => setOpenAdd(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={createCoach} disabled={saving}>{saving ? "Creating…" : "Create Account"}</Btn></>}>
      <div className="space-y-4">
        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar name={form.full_name || "?"} src={createAvatarPreview ?? undefined} size={80} className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all" />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setCreateAvatarFile(f); setCreateAvatarPreview(f ? URL.createObjectURL(f) : null); }} />
          </label>
          <p className="text-xs text-ink-faint">{"Profile photo (optional)"}</p>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Personal Data"}</div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={"Full name"} required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder={"E.g. Reza Fahlevi"} /></Field>
              <Field label={"Nickname"} hint={"Optional"}><Input value={form.nick_name} onChange={e => setForm(f => ({ ...f, nick_name: e.target.value }))} placeholder={"E.g. Coach Reza"} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={"Gender"}>
                <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">{"Select…"}</option>
                  <option value="male">{"Male"}</option>
                  <option value="female">{"Female"}</option>
                </Select>
              </Field>
              <Field label={"Date of birth"} hint={"Optional"}><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
            </div>
            <Field label={"Email"} required><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
            <Field label={"Phone / WA"}><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
            <Field label={"Address"} hint={"Optional"}><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={"E.g. Jl. Anggrek No. 12, Bekasi"} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Education (Optional)"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={"Last education"}>
              <Select value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
                <option value="">{"Select…"}</option>
                {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label={"Institution name"}><Input value={form.education_institution} onChange={e => setForm(f => ({ ...f, education_institution: e.target.value }))} placeholder={"E.g. University of Indonesia"} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Coach Profile"}</div>
          <div className="space-y-3">
            <Field label={"Specialization"} hint={"Optional"}><Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder={"E.g. Children's swimming technique"} /></Field>
            <Field label={"Bio / Description"} hint={"Optional"}><Textarea rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder={"E.g. 5 years of experience teaching early-childhood swimming with a play-based approach."} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Bank Information (Optional)"}</div>
          <div className="space-y-3">
            <Field label={"Bank name"}><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder={"E.g. BCA, BRI, Mandiri"} /></Field>
            <Field label={"Account number"}><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} placeholder={"E.g. 1234567890"} /></Field>
            <Field label={"Account holder"}><Input value={form.bank_holder} onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder={"E.g. Reza Fahlevi"} /></Field>
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{"Certifications (Optional)"}</div>
            <Btn variant="ghost" size="sm" icon="plus" onClick={() => setCreateCerts(cs => [...cs, { title: "", issuer: "", valid_from: "", valid_until: "", no_expiry: false }])}>{"Add"}</Btn>
          </div>
          {createCerts.map((c, i) => (
            <div key={i} className="relative border border-line rounded-xl p-3 mb-3 space-y-2">
              <button type="button" onClick={() => setCreateCerts(cs => cs.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors"><Icon name="x" className="w-4 h-4" /></button>
              <Input placeholder={"E.g. Lifeguard Level 2"} value={c.title} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <Input placeholder={"E.g. Red Cross / Swim Federation"} value={c.issuer} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, issuer: e.target.value } : x))} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-ink-mute mb-1 block">{"Valid from"}</label><MonthYearPicker value={c.valid_from} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_from: v } : x))} /></div>
                <div><label className="text-xs text-ink-mute mb-1 block">{"Valid until"}</label><MonthYearPicker value={c.valid_until} disabled={c.no_expiry} onChange={v => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, valid_until: v } : x))} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                <input type="checkbox" checked={c.no_expiry} onChange={e => setCreateCerts(cs => cs.map((x, j) => j === i ? { ...x, no_expiry: e.target.checked, valid_until: "" } : x))} className="rounded" />
                {"No expiry"}
              </label>
            </div>
          ))}
        </div>

        <div className="pt-1 border-t border-line">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">{"Account"}</div>
          <Field label={"Initial password"} required>
            <div className="relative">
              <Input type={showCoachPwd ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowCoachPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
                <Icon name={showCoachPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
