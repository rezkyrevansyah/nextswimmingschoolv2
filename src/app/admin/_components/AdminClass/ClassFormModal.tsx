"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea, Select } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import TimePicker from "@/components/ui/TimePicker";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { DAY_OPTS } from "./_utils";
import type { useClassData } from "./useClassData";

type ClassDataHook = ReturnType<typeof useClassData>;

export default function ClassFormModal({ hook }: { hook: ClassDataHook }) {
  const {
    localeTag, dayLabels,
    openForm, setOpenForm, editTarget, form, setForm, fileInputRef, photoPreview,
    handlePhotoChange, handleRemovePhoto, isPrivate, saveClass, saving,
    toggleDay, updateSlotTime,
    coaches, addCoachId, setAddCoachId, coachMutating, addClassCoach, removeClassCoach, setClassCoachRole,
    newHeadCoachId, setNewHeadCoachId, newAssistantCoachIds, setNewAssistantCoachIds,
  } = hook;

  return (
    <Modal open={openForm} onClose={() => setOpenForm(false)} title={editTarget ? (<>{"Edit Class — "}<NoTranslate>{editTarget.name}</NoTranslate></>) : "Add New Class"} size="lg"
      footer={<><Btn variant="ghost" onClick={() => setOpenForm(false)}>{"Cancel"}</Btn><Btn variant="primary" onClick={saveClass} disabled={saving}>{saving ? "Saving…" : editTarget ? "Save changes" : "Save class"}</Btn></>}>
      <div className="space-y-4">
        {/* Optional Class Background / Cover Photo Upload */}
        <Field label={"Class Background / Cover Photo (Optional)"} hint={"Format JPG, PNG, WebP, or SVG · Max 5MB"}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-line bg-paper-tint group aspect-video max-h-52 w-full flex items-center justify-center">
              <img
                src={photoPreview}
                alt="Class cover preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                <Btn
                  type="button"
                  variant="primary"
                  size="sm"
                  icon="edit"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {"Change Photo"}
                </Btn>
                <Btn
                  type="button"
                  variant="danger"
                  size="sm"
                  icon="trash"
                  onClick={handleRemovePhoto}
                >
                  {"Remove"}
                </Btn>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-line hover:border-ocean-400 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-paper-tint hover:bg-ocean-50/40 group"
            >
              <div className="w-10 h-10 rounded-xl bg-paper-deep text-ink-mute group-hover:text-ocean-600 group-hover:bg-white flex items-center justify-center mx-auto mb-2 transition-colors">
                <Icon name="upload" className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-ink group-hover:text-ocean-700 transition-colors">
                {"Choose Class Photo"}
              </p>
              <p className="text-[11px] text-ink-mute mt-0.5">
                {"Format JPG, PNG, WebP, or SVG · Max 5MB"}
              </p>
            </div>
          )}
        </Field>

        {/* Private classes are no longer created here — see the dedicated
            "Member Private" menu, which creates the member and its class
            slot together and keeps the 1:1 relationship intact. This
            screen now only ever creates regular (shared) classes. */}
        {isPrivate && (
          <div className="bg-wave-50 border border-wave-100 rounded-xl p-3 text-sm text-wave-800 flex gap-2">
            <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-wave-500" />
            <span>{"Private classes automatically have capacity 1. Session days are a preference — attendance can be logged anytime by the coach."}</span>
          </div>
        )}
        {isPrivate && (
          <div className="space-y-3 bg-paper-tint/60 border border-line rounded-xl p-3.5">
            <Field label={"Private Session Location"}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, location_type: "branch" }))}
                  className={`flex-1 p-2.5 rounded-lg border text-left text-xs font-bold transition-colors ${form.location_type === "branch" ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line bg-white text-ink-soft hover:bg-paper-tint"}`}
                >
                  {"📍 Official Branch"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, location_type: "external" }))}
                  className={`flex-1 p-2.5 rounded-lg border text-left text-xs font-bold transition-colors ${form.location_type === "external" ? "border-wave-500 bg-wave-50 text-wave-700" : "border-line bg-white text-ink-soft hover:bg-paper-tint"}`}
                >
                  {"🏡 External Location / Pool"}
                </button>
              </div>
            </Field>

            {form.location_type === "external" && (
              <div className="space-y-3 pt-1">
                <Field label={"External Location Name"} required hint={"E.g. Oakwood Pool Apartment, Hilton Hotel, Student's House"}>
                  <Input
                    value={form.external_location_name}
                    onChange={e => setForm(f => ({ ...f, external_location_name: e.target.value }))}
                    placeholder={"Oakwood Pool Apartment"}
                  />
                </Field>
                <Field label={"Full Location Address"}>
                  <Textarea
                    value={form.external_location_address}
                    onChange={e => setForm(f => ({ ...f, external_location_address: e.target.value }))}
                    placeholder={"Jl. Mega Kuningan Barat No.3, South Jakarta"}
                    rows={2}
                  />
                </Field>
                <Field label={"Google Maps Link (Optional)"}>
                  <Input
                    value={form.google_maps_url}
                    onChange={e => setForm(f => ({ ...f, google_maps_url: e.target.value }))}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </Field>
              </div>
            )}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={"Class name"} required className="sm:col-span-2"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isPrivate ? "E.g. Private — Coach Salwa" : "E.g. Tadpole — Water Introduction"} /></Field>
          {!isPrivate && (
            <>
              <Field label={"Capacity"} required><Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="15" min="1" /></Field>
              <Field label={"Price/month"} required hint={form.price_monthly ? `Rp ${Number(form.price_monthly).toLocaleString("id-ID")}` : undefined}>
                <Input type="text" inputMode="numeric" value={form.price_monthly ? Number(form.price_monthly).toLocaleString("id-ID") : ""}
                  onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value.replace(/\D/g, "") }))}
                  className="font-mono" placeholder="550.000" />
              </Field>
            </>
          )}
          {isPrivate && (
            <Field label={"Price per session"} hint={form.price_per_session ? `Rp ${Number(form.price_per_session).toLocaleString("id-ID")}` : "Rp per session"}>
              <Input type="text" inputMode="numeric" value={form.price_per_session ? Number(form.price_per_session).toLocaleString("id-ID") : ""}
                onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value.replace(/\D/g, "") }))}
                className="font-mono" placeholder="150.000" />
            </Field>
          )}
        </div>

        {/* Hari & Jam */}
        <div className="block">
          <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">{isPrivate ? "Practice day preference" : "Session days"}{!isPrivate && <span className="text-danger-500 ml-0.5">*</span>}</span>
          {/* Day picker */}
          <div className="flex flex-wrap gap-2 mt-1">
            {DAY_OPTS.map(d => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${form.schedule_days.includes(d) ? "bg-ocean-700 text-white border-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                {(dayLabels[d] ?? d).slice(0,3)}
              </button>
            ))}
          </div>

          {/* Jam config — muncul setelah ada hari dipilih */}
          {form.schedule_days.length > 0 && (
            <div className="mt-3 rounded-xl border border-line overflow-hidden">
              {/* Toggle mode */}
              <div className="flex items-center justify-between px-3 py-2 bg-paper-tint border-b border-line">
                <span className="text-xs font-semibold text-ink-mute">{"Time settings"}</span>
                <div className="flex rounded-lg border border-line overflow-hidden text-xs font-bold">
                  <button type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      same_time_all: true,
                      // Ambil jam representatif dari slot pertama yang ada
                      time_start: f.schedule_times[0]?.time_start || f.time_start,
                      time_end:   f.schedule_times[0]?.time_end   || f.time_end,
                      // Samakan semua slot ke jam representatif itu
                      schedule_times: f.schedule_times.map(s => ({
                        ...s,
                        time_start: f.schedule_times[0]?.time_start || f.time_start,
                        time_end:   f.schedule_times[0]?.time_end   || f.time_end,
                      })),
                    }))}
                    className={`px-2.5 py-1 transition-colors ${form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"}`}>
                    {"Same for all days"}
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      same_time_all: false,
                      // Pastikan semua slot terisi jam terkini dari mode "Sama semua hari"
                      schedule_times: f.schedule_days.map(day => {
                        const existing = f.schedule_times.find(s => s.day === day);
                        return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
                      }),
                    }))}
                    className={`px-2.5 py-1 transition-colors ${!form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"}`}>
                    {"Different per day"}
                  </button>
                </div>
              </div>

              {form.same_time_all ? (
                /* Mode: jam sama untuk semua hari */
                <div className="px-3 py-3 flex gap-3 items-end flex-wrap">
                  <Field label={"Start time"} className="flex-1 min-w-[120px]">
                    <TimePicker value={form.time_start}
                      onChange={v => setForm(f => ({
                        ...f,
                        time_start: v,
                        schedule_times: f.schedule_times.map(s => ({ ...s, time_start: v })),
                      }))} />
                  </Field>
                  <Field label={"End time"} className="flex-1 min-w-[120px]">
                    <TimePicker value={form.time_end}
                      onChange={v => setForm(f => ({
                        ...f,
                        time_end: v,
                        schedule_times: f.schedule_times.map(s => ({ ...s, time_end: v })),
                      }))} />
                  </Field>
                  <div className="pb-1 text-xs text-ink-mute self-end">{`Applies to: ${form.schedule_days.map(d => dayLabels[d] ?? d).join(", ")}`}</div>
                </div>
              ) : (
                /* Mode: jam berbeda per hari */
                <div className="divide-y divide-line">
                  {DAY_OPTS.filter(d => form.schedule_days.includes(d)).map(day => {
                    const slot = form.schedule_times.find(s => s.day === day) ?? { day, time_start: "", time_end: "" };
                    return (
                      <div key={day} className="px-3 py-2.5 flex items-center gap-3">
                        <span className="w-12 text-xs font-bold text-ink-soft shrink-0">{(dayLabels[day] ?? day).slice(0,3)}</span>
                        <div className="flex gap-2 flex-1">
                          <TimePicker value={slot.time_start} className="flex-1"
                            onChange={v => updateSlotTime(day, "time_start", v)} />
                          <span className="text-ink-faint self-center text-xs">–</span>
                          <TimePicker value={slot.time_end} className="flex-1"
                            onChange={v => updateSlotTime(day, "time_end", v)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-ink-faint mt-1 block">{isPrivate ? "Optional — for information only" : "Pick one or more days, then set the time per day"}</span>
        </div>
        <Field label={"Class goals"} hint={"Shown on the coach page and student page"}><Textarea rows={2} value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder={"E.g. Water introduction, building confidence in water."} /></Field>
        <Field label={"Class description"} hint={"Optional — shown on the coach page and student page"}><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={"E.g. This class is designed for children aged 4–6 learning to swim for the first time..."} /></Field>
        {editTarget && coaches.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{"Teaching coaches"}</div>
            <div className="space-y-1.5">
              {[...(editTarget.class_coaches ?? [])].sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0)).map(cc => cc.profile && (
                <div key={cc.coach_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-ocean-50 text-xs">
                  <Avatar name={cc.profile.full_name ?? ""} size={22} />
                  <span className="flex-1 font-semibold text-ocean-700 truncate"><NoTranslate>{cc.profile.full_name}</NoTranslate></span>
                  <button type="button" disabled={coachMutating} onClick={() => setClassCoachRole(editTarget.id, cc.coach_id, "head")}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "head" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                    {"Head"}
                  </button>
                  <button type="button" disabled={coachMutating} onClick={() => setClassCoachRole(editTarget.id, cc.coach_id, "assistant")}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "assistant" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                    {"Assistant"}
                  </button>
                  <button type="button" disabled={coachMutating} onClick={() => removeClassCoach(editTarget.id, cc.coach_id)}
                    className="p-1 rounded-full text-danger-600 hover:bg-danger-50">
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(editTarget.class_coaches?.length ?? 0) === 0 && <span className="text-xs text-warn-600 font-semibold">{"No coach assigned yet"}</span>}
            </div>
            {(() => {
              const assignedIds = new Set((editTarget.class_coaches ?? []).map(cc => cc.coach_id));
              const available = coaches.filter(c => !assignedIds.has(c.id));
              if (available.length === 0) return null;
              return (
                <div className="flex items-center gap-2 mt-2">
                  <select value={addCoachId} onChange={e => setAddCoachId(e.target.value)} disabled={coachMutating}
                    className="flex-1 text-xs rounded-lg border border-line px-2 py-1.5 bg-paper-tint">
                    <option value="">{"Select coach to add…"}</option>
                    {available.map(c => <option key={c.id} value={c.id} translate="no">{c.full_name}</option>)}
                  </select>
                  <Btn variant="soft" size="sm" disabled={!addCoachId || coachMutating} onClick={() => addClassCoach(editTarget.id, addCoachId)}>{"Add"}</Btn>
                </div>
              );
            })()}
            <p className="text-[11px] text-ink-faint mt-1.5">{"Max 1 head per class — setting a new head automatically demotes the previous one."}</p>
          </div>
        )}
        {!editTarget && coaches.length > 0 && (
          <div className="border-t border-line pt-3 space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{"Teaching coaches"}</div>
            <Field label="Head Coach (Pelatih Utama)" hint="Maksimal 1 head coach per kelas">
              <Select value={newHeadCoachId} onChange={e => setNewHeadCoachId(e.target.value)}>
                <option value="">-- Pilih Head Coach (Opsional) --</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id} translate="no">{c.full_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Assistant Coach (Pelatih Pendamping)" hint="Dapat memilih lebih dari satu coach">
              <div className="space-y-1.5 max-h-36 overflow-y-auto border border-line rounded-xl p-2.5 bg-paper-tint">
                {coaches.filter(c => c.id !== newHeadCoachId).map(c => {
                  const isSelected = newAssistantCoachIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-paper-deep cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setNewAssistantCoachIds(prev =>
                            isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className="rounded border-line-strong text-ocean-600 focus:ring-ocean-500"
                      />
                      <span className="font-semibold text-ink"><NoTranslate>{c.full_name}</NoTranslate></span>
                    </label>
                  );
                })}
                {coaches.filter(c => c.id !== newHeadCoachId).length === 0 && (
                  <div className="text-xs text-ink-mute p-1 text-center">Tidak ada coach lain</div>
                )}
              </div>
            </Field>
          </div>
        )}
        {editTarget && (
          <div className="border-t border-line pt-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{"Program Spreadsheet"}</div>
            {(editTarget.coach_spreadsheets ?? []).length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-sm text-warn-700">
                <Icon name="warning" className="w-4 h-4 shrink-0 text-warn-500" />
                {"No coach has filled in the program spreadsheet yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {editTarget.coach_spreadsheets!.map(s => (
                  <div key={s.coach_id} className="flex items-center gap-3 p-3 rounded-xl bg-ok-50 border border-ok-100">
                    <Avatar name={s.coach?.full_name ?? "?"} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ok-700 font-semibold truncate"><NoTranslate>{s.coach?.full_name ?? s.coach_id}</NoTranslate></div>
                      <div className="text-[10px] text-ink-faint font-mono">{new Date(s.updated_at).toLocaleDateString(localeTag)}</div>
                    </div>
                    <a href={s.spreadsheet_url} target="_blank" rel="noreferrer">
                      <Btn variant="soft" size="sm" icon="link">{"Open"}</Btn>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
