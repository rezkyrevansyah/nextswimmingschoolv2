"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea, Select } from "@/components/ui/FormFields";
import TimePicker from "@/components/ui/TimePicker";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { DAY_OPTS } from "./_types";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassFormModal({ hook }: { hook: OwnerClassesMasterHook }) {
  const {
    branches, allCoaches, dayLabels,
    openForm, setOpenForm, editTarget, form, setForm, saving, saveClass,
    fileInputRef, photoPreview, handlePhotoChange, handleRemovePhoto,
    isPrivate, toggleDay, updateSlotTime,
    newHeadCoachId, setNewHeadCoachId, newAssistantCoachIds, setNewAssistantCoachIds,
  } = hook;

  return (
    <Modal
      open={openForm}
      onClose={() => setOpenForm(false)}
      title={editTarget ? (<>{"Edit Class — "}<NoTranslate>{editTarget.name}</NoTranslate></>) : "Add New Class"}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setOpenForm(false)}>
            {"Cancel"}
          </Btn>
          <Btn variant="primary" onClick={saveClass} disabled={saving}>
            {saving ? "Saving…" : "Save Class"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {/* Branch / Center Selector */}
        <Field label={"Center / Branch"} required>
          <Select
            value={form.branch_id}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
          >
            <option value="">{"Select Center…"}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} translate="no">
                {b.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* Optional Cover Photo */}
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
              <p className="text-[11px] text-ink-mute mt-0.5">{"Format JPG, PNG, WebP, or SVG · Max 5MB"}</p>
            </div>
          )}
        </Field>

        {/* Private classes are no longer created/edited here — see the
            dedicated "Student Private" menu, which creates the student and
            its class slot together and keeps the 1:1 relationship intact.
            This screen now only ever manages regular (shared) classes. */}

        {/* Private class location settings */}
        {isPrivate && (
          <div className="space-y-3 bg-paper-tint/60 border border-line rounded-xl p-3.5">
            <Field label={"Private Location Type"}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, location_type: "branch" }))}
                  className={`flex-1 p-2.5 rounded-lg border text-left text-xs font-bold transition-colors ${
                    form.location_type === "branch" ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line bg-white text-ink-soft hover:bg-paper-tint"
                  }`}
                >
                  {"📍 Official Branch"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, location_type: "external" }))}
                  className={`flex-1 p-2.5 rounded-lg border text-left text-xs font-bold transition-colors ${
                    form.location_type === "external" ? "border-wave-500 bg-wave-50 text-wave-700" : "border-line bg-white text-ink-soft hover:bg-paper-tint"
                  }`}
                >
                  {"🏡 External Location / Pool"}
                </button>
              </div>
            </Field>

            {form.location_type === "external" && (
              <div className="space-y-3 pt-1">
                <Field label={"External Location Name"} required>
                  <Input
                    value={form.external_location_name}
                    onChange={(e) => setForm((f) => ({ ...f, external_location_name: e.target.value }))}
                    placeholder="e.g. Oakwood Apartment Pool"
                  />
                </Field>
                <Field label={"External Location Address"}>
                  <Textarea
                    value={form.external_location_address}
                    onChange={(e) => setForm((f) => ({ ...f, external_location_address: e.target.value }))}
                    placeholder="e.g. Jl. Dr. Satrio No. 1"
                    rows={2}
                  />
                </Field>
                <Field label={"Google Maps Link"}>
                  <Input
                    value={form.google_maps_url}
                    onChange={(e) => setForm((f) => ({ ...f, google_maps_url: e.target.value }))}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* Name, Capacity, Price */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={"Class Name"} required className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Beginner Class A"
            />
          </Field>
          {!isPrivate ? (
            <>
              <Field label={"Capacity"} required>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  placeholder="15"
                  min="1"
                />
              </Field>
              <Field
                label={"Monthly Price"}
                required
                hint={form.price_monthly ? fmtIDR(Number(form.price_monthly)) : undefined}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.price_monthly ? Number(form.price_monthly).toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value.replace(/\D/g, "") }))}
                  className="font-mono"
                  placeholder="500.000"
                />
              </Field>
            </>
          ) : (
            <Field
              label={"Price per Session"}
              hint={form.price_per_session ? fmtIDR(Number(form.price_per_session)) : undefined}
            >
              <Input
                type="text"
                inputMode="numeric"
                value={form.price_per_session ? Number(form.price_per_session).toLocaleString("id-ID") : ""}
                onChange={(e) => setForm((f) => ({ ...f, price_per_session: e.target.value.replace(/\D/g, "") }))}
                className="font-mono"
                placeholder="150.000"
              />
            </Field>
          )}
        </div>

        {/* Schedule Days & Times */}
        <div>
          <span className="text-[13px] font-semibold text-ink-soft mb-1.5 block">
            {"Schedule Days"}
            {!isPrivate && <span className="text-danger-500 ml-0.5">*</span>}
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {DAY_OPTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  form.schedule_days.includes(d)
                    ? "bg-ocean-700 text-white border-ocean-700"
                    : "border-line text-ink-soft hover:bg-paper-tint"
                }`}
              >
                {(dayLabels[d] ?? d).slice(0, 3)}
              </button>
            ))}
          </div>

          {form.schedule_days.length > 0 && (
            <div className="mt-3 rounded-xl border border-line overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-paper-tint border-b border-line">
                <span className="text-xs font-semibold text-ink-mute">{"Time Settings"}</span>
                <div className="flex rounded-lg border border-line overflow-hidden text-xs font-bold">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        same_time_all: true,
                        time_start: f.schedule_times[0]?.time_start || f.time_start,
                        time_end: f.schedule_times[0]?.time_end || f.time_end,
                        schedule_times: f.schedule_times.map((s) => ({
                          ...s,
                          time_start: f.schedule_times[0]?.time_start || f.time_start,
                          time_end: f.schedule_times[0]?.time_end || f.time_end,
                        })),
                      }))
                    }
                    className={`px-2.5 py-1 transition-colors ${
                      form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"
                    }`}
                  >
                    {"Same for all days"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        same_time_all: false,
                        schedule_times: f.schedule_days.map((day) => {
                          const existing = f.schedule_times.find((s) => s.day === day);
                          return existing ?? { day, time_start: f.time_start, time_end: f.time_end };
                        }),
                      }))
                    }
                    className={`px-2.5 py-1 transition-colors ${
                      !form.same_time_all ? "bg-ocean-700 text-white" : "text-ink-soft hover:bg-paper-deep"
                    }`}
                  >
                    {"Different per day"}
                  </button>
                </div>
              </div>

              {form.same_time_all ? (
                <div className="px-3 py-3 flex gap-3 items-end flex-wrap">
                  <Field label={"Start Time"} className="flex-1 min-w-[120px]">
                    <TimePicker
                      value={form.time_start}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          time_start: v,
                          schedule_times: f.schedule_times.map((s) => ({ ...s, time_start: v })),
                        }))
                      }
                    />
                  </Field>
                  <Field label={"End Time"} className="flex-1 min-w-[120px]">
                    <TimePicker
                      value={form.time_end}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          time_end: v,
                          schedule_times: f.schedule_times.map((s) => ({ ...s, time_end: v })),
                        }))
                      }
                    />
                  </Field>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {DAY_OPTS.filter((d) => form.schedule_days.includes(d)).map((day) => {
                    const slot = form.schedule_times.find((s) => s.day === day) ?? {
                      day,
                      time_start: "",
                      time_end: "",
                    };
                    return (
                      <div key={day} className="px-3 py-2.5 flex items-center gap-3">
                        <span className="w-12 text-xs font-bold text-ink-soft shrink-0">
                          {(dayLabels[day] ?? day).slice(0, 3)}
                        </span>
                        <div className="flex gap-2 flex-1">
                          <TimePicker
                            value={slot.time_start}
                            className="flex-1"
                            onChange={(v) => updateSlotTime(day, "time_start", v)}
                          />
                          <span className="text-ink-faint self-center text-xs">–</span>
                          <TimePicker
                            value={slot.time_end}
                            className="flex-1"
                            onChange={(v) => updateSlotTime(day, "time_end", v)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Initial Coach Assignment for new classes */}
        {!editTarget && allCoaches.length > 0 && (
          <div className="border-t border-line pt-3 space-y-3">
            <Field label={"Head Coach (Optional)"}>
              <Select value={newHeadCoachId} onChange={(e) => setNewHeadCoachId(e.target.value)}>
                <option value="">-- {"Head Coach (Optional)"} --</option>
                {allCoaches.map((c) => (
                  <option key={c.id} value={c.id} translate="no">
                    {c.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={"Assistant Coaches (Optional)"}>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border border-line rounded-xl p-2.5 bg-paper-tint">
                {allCoaches
                  .filter((c) => c.id !== newHeadCoachId)
                  .map((c) => {
                    const isSelected = newAssistantCoachIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-paper-deep cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setNewAssistantCoachIds((prev) =>
                              isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className="rounded border-line-strong text-ocean-600 focus:ring-ocean-500"
                        />
                        <span className="font-semibold text-ink"><NoTranslate>{c.full_name}</NoTranslate></span>
                      </label>
                    );
                  })}
              </div>
            </Field>
          </div>
        )}

        {/* Goals & Description */}
        <Field label={"Class Goals"} hint={"Optional — shown on coach & student portal"}>
          <Textarea
            rows={2}
            value={form.goals}
            onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
            placeholder={"E.g. Water familiarization, building confidence in water."}
          />
        </Field>
        <Field label={"Class Description"}>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={"E.g. Designed for beginners learning swimming fundamentals."}
          />
        </Field>
      </div>
    </Modal>
  );
}
