"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { fmtIDR } from "@/lib/utils";
import type { AdminStudentHook } from "./_hook";

export default function CreateStudentModal({ hook }: { hook: AdminStudentHook }) {
  const {
    openCreate, setOpenCreate, form, setForm, saving, createStudent,
    createAvatarPreview, setCreateAvatarFile, setCreateAvatarPreview,
    schoolsList, classes, showCreatePwd, setShowCreatePwd,
  } = hook;

  return (
    <Modal open={openCreate} onClose={() => setOpenCreate(false)} title={"Add New Student"} size="lg"
      footer={<><Btn variant="ghost" onClick={() => setOpenCreate(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={createStudent} disabled={saving}>{saving ? "Saving…" : "Save & send WA"}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Avatar picker */}
        <div className="sm:col-span-2 flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar
              name={form.full_name || "?"}
              src={createAvatarPreview ?? undefined}
              size={80}
              className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setCreateAvatarFile(f);
              setCreateAvatarPreview(f ? URL.createObjectURL(f) : null);
            }} />
          </label>
          <p className="text-xs text-ink-faint">{"Profile photo (optional)"}</p>
        </div>
        <Field label={"Full name"} required><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
        <Field label={"Date of birth"}><DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} /></Field>
        <Field label={"Gender"}>
          <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">{"— select —"}</option>
            <option value="male">{"Male"}</option>
            <option value="female">{"Female"}</option>
          </Select>
        </Field>
        <Field label={"Student type"} required hint={"Want to add a private student? Use Excel import (see Import Excel), or the Private Students menu for full schedule/coach/location control."}>
          <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="reguler">{"Regular"}</option><option value="school_affiliate">{"School Affiliate"}</option>
          </Select>
        </Field>
        {form.type === "school_affiliate" && (
          <>
            <Field label={"Affiliated school"}>
              <Select value={form.school_id} onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">{"— select school —"}</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label={"School Grade"} hint={"The child's grade/class at their day school, e.g. \"Kelas 5 SD\" — separate from the swim class"}>
              <Input
                value={form.school_grade}
                onChange={e => setForm(f => ({ ...f, school_grade: e.target.value }))}
                placeholder={"e.g. Kelas 5 SD"}
              />
            </Field>
          </>
        )}
        <Field label={"Assign class"} hint={form.type === "private" ? "Private classes only" : "Regular classes only"}>
          <Select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
            <option value="">{"— select class —"}</option>
            {classes.filter(c => c.class_type === form.type || (form.type === "school_affiliate" && c.class_type === "reguler")).map(c => <option key={c.id} value={c.id}>{c.name} ({c.enrolled}/{c.capacity})</option>)}
          </Select>
        </Field>
        {form.type === "private" && (
          <Field label={"Number of sessions"} required hint={`Price/session: ${classes.find(c => c.id === form.class_id)?.price_per_session ? fmtIDR(classes.find(c => c.id === form.class_id)!.price_per_session!) : "—"}`}>
            <Input type="number" min="1" value={form.jumlah_sesi} onChange={e => setForm(f => ({ ...f, jumlah_sesi: e.target.value }))} placeholder="Mis. 8" />
          </Field>
        )}
        <Field label={"Student phone / WA"}>
          <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Field label={"Contact owner"}>
          <Select value={form.phone_owner} onChange={e => setForm(f => ({ ...f, phone_owner: e.target.value }))}>
            <option value="self">{"Owned by the student"}</option>
            <option value="parent">{"Owned by parent / guardian"}</option>
          </Select>
        </Field>
        {form.phone_owner === "parent" && (
          <>
            <Field label={"Parent / guardian name"}><Input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={"Parent / guardian phone"}><Input type="tel" value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>
        )}
        <Field label={"Address"} className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={"E.g. Jl. Anggrek No. 12, Bekasi"} /></Field>
        <Field label={"Health notes"} className="sm:col-span-2" hint={"Allergies, special conditions, etc."}><Textarea rows={2} value={form.health_notes} onChange={e => setForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        <Field label={"Login email"} required><Input type="email" autoComplete="off" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <Field label={"Password"} required hint={"Minimum 6 characters"}>
          <div className="relative">
            <Input type={showCreatePwd ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="pr-10" />
            <button type="button" tabIndex={-1} onClick={() => setShowCreatePwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors">
              <Icon name={showCreatePwd ? "eye-off" : "eye"} className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
