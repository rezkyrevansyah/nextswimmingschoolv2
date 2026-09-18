"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import DatePicker from "@/components/ui/DatePicker";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminStudentHook } from "./_hook";

export default function StudentEditModal({ hook }: { hook: AdminStudentHook }) {
  const {
    detail, openEditStudent, setOpenEditStudent, editStudentForm, setEditStudentForm, savingEdit, saveStudentEdit,
    editAvatarPreview, setEditAvatarFile, setEditAvatarPreview, schoolsList, classes,
  } = hook;

  return (
    <Modal open={openEditStudent} onClose={() => setOpenEditStudent(false)} title={(<>{"Edit Student — "}<NoTranslate>{detail?.profile?.full_name ?? ""}</NoTranslate></>)} size="lg"
      footer={<><Btn variant="ghost" onClick={() => setOpenEditStudent(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={saveStudentEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save Changes"}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Avatar picker */}
        <div className="sm:col-span-2 flex flex-col items-center gap-2">
          <label className="cursor-pointer group relative inline-block">
            <Avatar
              name={editStudentForm.full_name || detail?.profile?.full_name || ""}
              src={editAvatarPreview ?? detail?.profile?.avatar_url ?? undefined}
              size={80}
              className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm">
              <Icon name="camera" className="w-3 h-3" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setEditAvatarFile(f);
              setEditAvatarPreview(f ? URL.createObjectURL(f) : null);
            }} />
          </label>
          <p className="text-xs text-ink-faint">{"Click to change photo (optional)"}</p>
        </div>
        {/* Identitas */}
        <Field label={"Full name"} required><Input value={editStudentForm.full_name} onChange={e => setEditStudentForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
        <Field label={"Email"} hint={"Change the student's login email"}><Input type="email" placeholder="nama@email.com" value={editStudentForm.email} onChange={e => setEditStudentForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <Field label={"Student ID Number"} hint={"Auto-generated when the account is created, shown on report cards as the student ID"}>
          <div className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-line bg-paper-tint text-sm font-mono text-ink-soft flex items-center">
            <NoTranslate>{editStudentForm.student_no || "—"}</NoTranslate>
          </div>
        </Field>
        <Field label={"Date of birth"}><DatePicker value={editStudentForm.birth_date} onChange={v => setEditStudentForm(f => ({ ...f, birth_date: v }))} /></Field>
        <Field label={"Gender"}>
          <Select value={editStudentForm.gender} onChange={e => setEditStudentForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">{"— select —"}</option>
            <option value="male">{"Male"}</option>
            <option value="female">{"Female"}</option>
          </Select>
        </Field>
        <Field label={"Student type"} required hint={detail?.type === "private" ? "This student's type, schedule, coach, and location are managed from the Private Students menu." : "Want to add a private student? Use Excel import (see Import Excel), or the Private Students menu for full schedule/coach/location control."}>
          {detail?.type === "private" ? (
            <Select value="private" disabled><option value="private">{"Private"}</option></Select>
          ) : (
            <Select value={editStudentForm.type} onChange={e => setEditStudentForm(f => ({ ...f, type: e.target.value }))}>
              <option value="reguler">{"Regular"}</option>
              <option value="school_affiliate">{"School Affiliate"}</option>
            </Select>
          )}
        </Field>
        {editStudentForm.type === "school_affiliate" && (
          <>
            <Field label={"Affiliated school"}>
              <Select value={editStudentForm.school_id} onChange={e => setEditStudentForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">{"— select school —"}</option>
                {schoolsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label={"School Grade"} hint={"The child's grade/class at their day school, e.g. \"Kelas 5 SD\" — separate from the swim class"}>
              <Input
                value={editStudentForm.school_grade}
                onChange={e => setEditStudentForm(f => ({ ...f, school_grade: e.target.value }))}
                placeholder={"e.g. Kelas 5 SD"}
              />
            </Field>
          </>
        )}
        {/* Kontak */}
        <Field label={"Student phone / WA"}><Input type="tel" value={editStudentForm.phone} onChange={e => setEditStudentForm(f => ({ ...f, phone: e.target.value }))} /></Field>
        <Field label={"Contact owner"}>
          <Select value={editStudentForm.phone_owner} onChange={e => setEditStudentForm(f => ({ ...f, phone_owner: e.target.value }))}>
            <option value="self">{"Owned by the student"}</option>
            <option value="parent">{"Owned by parent / guardian"}</option>
          </Select>
        </Field>
        {editStudentForm.phone_owner === "parent" && (
          <>
            <Field label={"Parent / guardian name"}><Input value={editStudentForm.parent_name} onChange={e => setEditStudentForm(f => ({ ...f, parent_name: e.target.value }))} /></Field>
            <Field label={"Parent / guardian phone"}><Input type="tel" value={editStudentForm.parent_phone} onChange={e => setEditStudentForm(f => ({ ...f, parent_phone: e.target.value }))} /></Field>
          </>
        )}
        <Field label={"Address"} className="sm:col-span-2"><Textarea rows={2} value={editStudentForm.address} onChange={e => setEditStudentForm(f => ({ ...f, address: e.target.value }))} placeholder={"E.g. Jl. Anggrek No. 12, Bekasi"} /></Field>
        <Field label={"Health notes"} className="sm:col-span-2" hint={"Allergies, special conditions, etc."}><Textarea rows={2} value={editStudentForm.health_notes} onChange={e => setEditStudentForm(f => ({ ...f, health_notes: e.target.value }))} /></Field>
        {/* Kelas — multi-select checkboxes */}
        <div className="sm:col-span-2">
          <div className="text-sm font-semibold text-ink mb-2">{"Classes Joined"}</div>
          {detail?.type === "private" ? (
            <div className="space-y-1.5">
              {(detail.student_classes ?? []).length === 0 ? (
                <div className="text-sm text-ink-mute">{"No active classes in this center."}</div>
              ) : (
                detail.student_classes!.map(mc => mc.class && (
                  <div key={mc.class.id} className="px-3 py-2.5 rounded-xl border border-line bg-paper-tint text-sm font-semibold text-ink"><NoTranslate>{mc.class.name}</NoTranslate></div>
                ))
              )}
              <p className="text-xs text-ink-mute">{"This student's type, schedule, coach, and location are managed from the Private Students menu."}</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-sm text-ink-mute">{"No active classes in this center."}</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {classes.map(cls => {
                const checked = editStudentForm.class_ids.includes(cls.id);
                return (
                  <button key={cls.id} type="button"
                    onClick={() => setEditStudentForm(f => ({ ...f, class_ids: checked ? f.class_ids.filter(id => id !== cls.id) : [...f.class_ids, cls.id] }))}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${checked ? "bg-ocean-50 border-ocean-200" : "bg-paper-tint border-line hover:border-ocean-200"}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-ocean-600 border-ocean-600" : "border-line"}`}>
                      {checked && <Icon name="check" className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink truncate"><NoTranslate>{cls.name}</NoTranslate></div>
                      <div className="text-xs text-ink-mute">{cls.enrolled}/{cls.capacity} · {cls.time_start?.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
