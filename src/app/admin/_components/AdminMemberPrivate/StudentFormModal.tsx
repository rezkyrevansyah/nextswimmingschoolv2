"use client";
import dynamic from "next/dynamic";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field, Input, Select, Textarea, Switch, SectionLabel } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { DAY_OPTS } from "./_types";
import type { useMemberPrivateData } from "./useMemberPrivateData";

function MapLoading() {
  const { t } = useLocale();
  return <div className="rounded-xl border border-line bg-paper-tint h-[220px] flex items-center justify-center text-ink-mute text-sm">{t("admin.settings.mapLoading")}</div>;
}
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { ssr: false, loading: MapLoading });

type MemberPrivateDataHook = ReturnType<typeof useMemberPrivateData>;

export default function StudentFormModal({ hook }: { hook: MemberPrivateDataHook }) {
  const { t } = useLocale();
  const {
    branchId, branches, openForm, setOpenForm, editTarget, form, setForm, saving, saveStudent,
    selectedBranchName, toggleDay, editClassId, editClassCoaches, coachesForBranch,
    addCoachId, setAddCoachId, coachMutating, addStudentCoach, removeStudentCoach, setStudentCoachRole,
    newHeadCoachId, setNewHeadCoachId, newAssistantCoachIds, setNewAssistantCoachIds,
  } = hook;

  return (
    <Modal
      open={openForm}
      onClose={() => setOpenForm(false)}
      title={editTarget ? t("admin.memberPrivate.editStudentTitle") : t("admin.memberPrivate.addStudentTitle")}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setOpenForm(false)}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" onClick={saveStudent} disabled={saving}>{saving ? t("common.actions.saving") : t("common.actions.save")}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        {!editTarget && branches && branches.length > 1 && (
          <Field label={t("admin.memberPrivate.fieldTargetBranch")} required hint={t("admin.memberPrivate.fieldTargetBranchHint")}>
            <Select value={form.target_branch_id} onChange={e => setForm(f => ({ ...f, target_branch_id: e.target.value }))}>
              <option value="">{t("admin.memberPrivate.fieldTargetBranchPlaceholder")}</option>
              {branches.map(b => <option key={b.id} value={b.id} translate="no">{b.name}</option>)}
            </Select>
          </Field>
        )}
        <SectionLabel>{t("admin.memberPrivate.sectionIdentity")}</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("admin.coaches.fieldFullName2")} required>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label={t("admin.members.fieldMemberPhone")}>
            <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label={t("admin.schoolPanel.loginEmailLabel")} required={!editTarget}>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          {!editTarget && (
            <Field label={t("admin.members.fieldPassword")} required hint={t("admin.coaches.minCharsHint")}>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </Field>
          )}
          <Field label={t("admin.coaches.rowGender2")}>
            <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">{t("admin.members.selectDashPlaceholder")}</option>
              <option value="male">{t("admin.approvement.genderMale")}</option>
              <option value="female">{t("admin.approvement.genderFemale")}</option>
            </Select>
          </Field>
          <Field label={t("admin.members.rowBirthDateFull")}>
            <DatePicker value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} />
          </Field>
        </div>
        <Field label={t("admin.coaches.fieldAddress2")}>
          <Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </Field>

        {!editTarget && (
          <>
            <SectionLabel sub={t("admin.memberPrivate.sectionPackageSub")}>{t("admin.memberPrivate.sectionPackage")}</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("admin.memberPrivate.fieldPackagePrice")} hint={t("admin.memberPrivate.fieldPackagePriceHint")}>
                <Input type="number" min={0} value={form.package_price} onChange={e => setForm(f => ({ ...f, package_price: e.target.value }))} />
              </Field>
              <Field label={t("admin.memberPrivate.fieldInitialSessions")} hint={t("admin.memberPrivate.fieldInitialSessionsHint")}>
                <Input type="number" min={0} value={form.jumlah_sesi} onChange={e => setForm(f => ({ ...f, jumlah_sesi: e.target.value }))} />
              </Field>
            </div>
          </>
        )}

        <SectionLabel sub={t("admin.memberPrivate.sectionScheduleSub")}>{t("admin.memberPrivate.sectionSchedule")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.schedule_days.includes(day) ? "bg-ocean-600 border-ocean-600 text-white" : "border-line text-ink-soft hover:bg-paper-tint"}`}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("admin.classes.fieldStartTime")}>
            <TimePicker value={form.time_start} onChange={v => setForm(f => ({ ...f, time_start: v }))} />
          </Field>
          <Field label={t("admin.classes.fieldEndTime")}>
            <TimePicker value={form.time_end} onChange={v => setForm(f => ({ ...f, time_end: v }))} />
          </Field>
        </div>

        <SectionLabel sub={t("admin.memberPrivate.sectionLocationSub")}>{t("admin.memberPrivate.sectionLocation")}</SectionLabel>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.location_type === "external"}
            onChange={isExternal => setForm(f => ({ ...f, location_type: isExternal ? "external" : "branch" }))}
            label={form.location_type === "external"
              ? t("admin.memberPrivate.externalLocation")
              : selectedBranchName
                ? t("admin.memberPrivate.branchLocationNamed", { branch: selectedBranchName })
                : t("admin.memberPrivate.branchLocation")}
          />
        </div>
        {form.location_type === "branch" && (
          <p className="text-xs text-ink-mute -mt-1">{t("admin.memberPrivate.branchLocationHint", { branch: selectedBranchName || "—" })}</p>
        )}
        {form.location_type === "external" && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("admin.classes.fieldExternalLocationName")} required>
                <Input value={form.external_location_name} onChange={e => setForm(f => ({ ...f, external_location_name: e.target.value }))} />
              </Field>
              <Field label={t("admin.classes.fieldExternalLocationAddress")}>
                <Input value={form.external_location_address} onChange={e => setForm(f => ({ ...f, external_location_address: e.target.value }))} />
              </Field>
              <Field label={t("admin.classes.fieldGoogleMapsLink")} className="sm:col-span-2">
                <Input value={form.google_maps_url} onChange={e => setForm(f => ({ ...f, google_maps_url: e.target.value }))} />
              </Field>
            </div>
            <Field label={t("admin.memberPrivate.fieldMapPin")} hint={t("admin.memberPrivate.fieldMapPinHint")}>
              <MapPicker
                lat={form.external_lat}
                lng={form.external_lng}
                onChange={(newLat, newLng) => setForm(f => ({ ...f, external_lat: newLat, external_lng: newLng }))}
                onSelectAddress={addr => setForm(f => ({ ...f, external_location_address: addr }))}
                height={220}
              />
            </Field>
          </div>
        )}

        <SectionLabel sub={t("admin.memberPrivate.sectionCoachSub")}>{t("admin.memberPrivate.sectionCoach")}</SectionLabel>
        {editTarget && editClassId ? (
          <div>
            <div className="space-y-1.5">
              {[...editClassCoaches].sort((a, b) => (b.role === "head" ? 1 : 0) - (a.role === "head" ? 1 : 0)).map(cc => cc.profile && (
                <div key={cc.coach_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-ocean-50 text-xs">
                  <Avatar name={cc.profile.full_name ?? ""} size={22} />
                  <span className="flex-1 font-semibold text-ocean-700 truncate">{cc.profile.full_name}</span>
                  <button type="button" disabled={coachMutating} onClick={() => setStudentCoachRole(editClassId, cc.coach_id, "head")}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "head" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                    {t("admin.classes.headRoleBtn")}
                  </button>
                  <button type="button" disabled={coachMutating} onClick={() => setStudentCoachRole(editClassId, cc.coach_id, "assistant")}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${cc.role === "assistant" ? "bg-ocean-700 text-white" : "bg-white border border-line text-ink-mute"}`}>
                    {t("admin.classes.assistantRoleBtn")}
                  </button>
                  <button type="button" disabled={coachMutating} onClick={() => removeStudentCoach(editClassId, cc.coach_id)}
                    className="p-1 rounded-full text-danger-600 hover:bg-danger-50">
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {editClassCoaches.length === 0 && <span className="text-xs text-warn-600 font-semibold">{t("admin.classes.noCoachAssigned")}</span>}
            </div>
            {(() => {
              const assignedIds = new Set(editClassCoaches.map(cc => cc.coach_id));
              const available = coachesForBranch(editTarget.branch_id).filter(c => !assignedIds.has(c.id));
              if (available.length === 0) return null;
              return (
                <div className="flex items-center gap-2 mt-2">
                  <Select value={addCoachId} onChange={e => setAddCoachId(e.target.value)} disabled={coachMutating}>
                    <option value="">{t("admin.classes.selectCoachToAddPlaceholder")}</option>
                    {available.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </Select>
                  <Btn variant="soft" size="sm" disabled={!addCoachId || coachMutating} onClick={() => addStudentCoach(editClassId, addCoachId)}>{t("common.actions.add")}</Btn>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={t("admin.memberPrivate.fieldHeadCoach")} hint={t("admin.memberPrivate.fieldHeadCoachHint")}>
              <Select value={newHeadCoachId} onChange={e => setNewHeadCoachId(e.target.value)}>
                <option value="">{t("admin.memberPrivate.noCoachOption")}</option>
                {coachesForBranch(form.target_branch_id || branchId || null).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
            <Field label={t("admin.memberPrivate.fieldAssistantCoaches")} hint={t("admin.memberPrivate.fieldAssistantCoachesHint")}>
              <div className="space-y-1.5 max-h-36 overflow-y-auto border border-line rounded-xl p-2.5 bg-paper-tint">
                {coachesForBranch(form.target_branch_id || branchId || null).filter(c => c.id !== newHeadCoachId).map(c => {
                  const isSelected = newAssistantCoachIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-paper-deep cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setNewAssistantCoachIds(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                        className="rounded border-line-strong text-ocean-600 focus:ring-ocean-500"
                      />
                      <span className="font-semibold text-ink">{c.full_name}</span>
                    </label>
                  );
                })}
                {coachesForBranch(form.target_branch_id || branchId || null).filter(c => c.id !== newHeadCoachId).length === 0 && (
                  <div className="text-xs text-ink-mute p-1 text-center">{t("admin.memberPrivate.noOtherCoaches")}</div>
                )}
              </div>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
