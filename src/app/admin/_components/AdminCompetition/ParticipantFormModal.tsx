"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import CompetitionDocUploader from "./CompetitionDocUploader";
import type { AdminCompetitionHook } from "./_hook";

export default function ParticipantFormModal({ hook, onNewCompRequested, onEditCompRequested }: {
  hook: AdminCompetitionHook;
  onNewCompRequested: () => void;
  onEditCompRequested: (compId: string) => void;
}) {
  const {
    activeTab, competitions, selectedComp,
    openPartForm, setOpenPartForm, editPart, partForm, setPartForm, savingPart, handleSaveParticipant,
    awardMemberId, awardMemberSearch, memberSearch, setMemberSearch, filteredMembers,
    coachesList, formEffectiveMemberId, formEffectiveCompId, getDoc, mergeDocs, handleViewDoc,
  } = hook;

  if (!openPartForm) return null;

  return (
    <Modal
      open={openPartForm}
      onClose={() => setOpenPartForm(false)}
      title={editPart ? "Edit Student Result" : "Add Student Result"}
    >
      <form onSubmit={handleSaveParticipant} className="space-y-4">
        {/* Competition selector — shown only when opened from awards tab (no selectedComp).
            Includes inline Lomba CRUD (create/edit) so the admin never has to leave this
            popup just to register an event that doesn't exist yet or fix a typo in one. */}
        {!selectedComp && !editPart && (
          <Field label={"Competition"} required>
            <div className="flex items-center gap-2">
              <Select
                value={partForm.competition_id}
                onChange={e => setPartForm(prev => ({ ...prev, competition_id: e.target.value }))}
                required
                className="flex-1"
              >
                <option value="">{"-- Select competition --"}</option>
                {competitions.map(c => {
                  // Native <select> option-list popups size themselves to the widest
                  // option and aren't clipped by the modal's bounds — a long competition
                  // name plus the date suffix can overflow past the modal edge. Truncate
                  // the name so the combined label stays short enough to fit.
                  const shortName = c.name.length > 45 ? `${c.name.slice(0, 45)}…` : c.name;
                  return (
                    <option key={c.id} value={c.id} title={c.name} translate="no">
                      {shortName} — {c.start_date ? fmtDate(c.start_date) : ""}
                    </option>
                  );
                })}
              </Select>
              <button
                type="button"
                title={"Add new event"}
                onClick={onNewCompRequested}
                className="shrink-0 w-9 h-9 rounded-lg border border-line hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
              >
                <Icon name="plus" className="w-4 h-4" />
              </button>
              {partForm.competition_id && (
                <button
                  type="button"
                  title={"Edit this event"}
                  onClick={() => onEditCompRequested(partForm.competition_id)}
                  className="shrink-0 w-9 h-9 rounded-lg border border-line hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                >
                  <Icon name="edit" className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>
        )}

        <Field label={"Select Student"} required>
          {(editPart || (activeTab === "awards" && awardMemberId && !editPart && partForm.member_id === awardMemberId)) ? (
            <div className="p-2.5 bg-paper-tint rounded-lg font-bold text-ink-strong">
              <NoTranslate>
                {editPart
                  ? (editPart.member?.profile as { full_name: string } | null)?.full_name
                  : awardMemberSearch}
              </NoTranslate>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder={"Type to search student..."}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              <Select
                value={partForm.member_id}
                onChange={e => setPartForm(prev => ({ ...prev, member_id: e.target.value }))}
                required
              >
                <option value="">{"-- Select Student --"}</option>
                {filteredMembers.map(m => (
                  <option key={m.id} value={m.id} translate="no">
                    {m.full_name} ({m.branch_name || "Center"})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Event / Category"} required hint={"E.g. 50m Freestyle / 100m Breaststroke"}>
            <Input
              value={partForm.category}
              onChange={e => setPartForm(prev => ({ ...prev, category: e.target.value }))}
              placeholder="50m Gaya Bebas"
              required
            />
          </Field>
          <Field label={"Age Group (KU)"} hint={"E.g.: KU-4 (11-12 yo) / Open"}>
            <Input
              value={partForm.age_group}
              onChange={e => setPartForm(prev => ({ ...prev, age_group: e.target.value }))}
              placeholder="KU-4 (U-12)"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Stroke"} hint={"E.g.: Freestyle, Breaststroke, Backstroke, Butterfly, Medley"}>
            <Input
              value={partForm.stroke}
              onChange={e => setPartForm(prev => ({ ...prev, stroke: e.target.value }))}
              placeholder={"Freestyle"}
            />
          </Field>
          <Field label={"Distance (meters)"} hint={"E.g.: 25, 50, 100"}>
            <Input
              type="number" min={0} inputMode="numeric"
              value={partForm.distance_meters}
              onChange={e => setPartForm(prev => ({ ...prev, distance_meters: e.target.value }))}
              placeholder="50"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={"Result Time"} hint={"E.g.: 32.41 or 1:12.20"}>
            <Input
              value={partForm.time_raw}
              onChange={e => setPartForm(prev => ({ ...prev, time_raw: e.target.value }))}
              placeholder="32.41"
            />
          </Field>
          <Field label={"Rank / Place"} hint={"E.g.: 1, 2, 3"}>
            <Input
              type="number"
              min={1}
              value={partForm.rank}
              onChange={e => setPartForm(prev => ({ ...prev, rank: e.target.value }))}
              placeholder="1"
            />
          </Field>
          <Field label={"Result Status"}>
            <Select value={partForm.result_status} onChange={e => setPartForm(prev => ({ ...prev, result_status: e.target.value }))}>
              <option value="finished">{"Finished"}</option>
              <option value="finalist">{"Finalist"}</option>
              <option value="dq">{"Disqualified (DQ)"}</option>
              <option value="dns">{"Did Not Start (DNS)"}</option>
              <option value="dnf">{"Did Not Finish (DNF)"}</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={"Award / Medal"}>
            <Select value={partForm.award} onChange={e => setPartForm(prev => ({ ...prev, award: e.target.value }))}>
              <option value="participant">{"🏊 Participant"}</option>
              <option value="gold">{"🥇 Gold Medal"}</option>
              <option value="silver">{"🥈 Silver Medal"}</option>
              <option value="bronze">{"🥉 Bronze Medal"}</option>
              <option value="fourth_place">{"🏅 4th Place"}</option>
              <option value="finalist">{"⭐ Finalist"}</option>
              <option value="custom">{"🏆 Special Award"}</option>
            </Select>
          </Field>
          {partForm.award === "custom" && (
            <Field label={"Special Award Name"}>
              <Input
                value={partForm.custom_award_label}
                onChange={e => setPartForm(prev => ({ ...prev, custom_award_label: e.target.value }))}
                placeholder={"E.g.: Best Swimmer"}
              />
            </Field>
          )}
          <Field label={"Accompanying Coach (Optional)"}>
            <Select value={partForm.coach_id} onChange={e => setPartForm(prev => ({ ...prev, coach_id: e.target.value }))}>
              <option value="">{"-- None / To be determined --"}</option>
              {coachesList.map(c => (
                <option key={c.id} value={c.id} translate="no">
                  {c.full_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {formEffectiveMemberId && formEffectiveCompId && (
          <CompetitionDocUploader
            memberId={formEffectiveMemberId}
            competitionId={formEffectiveCompId}
            doc={getDoc(formEffectiveMemberId, formEffectiveCompId)}
            onUploaded={doc => mergeDocs([doc])}
            onView={handleViewDoc}
          />
        )}

        <Field label={"Additional Notes (Optional)"}>
          <Textarea
            rows={2}
            value={partForm.notes}
            onChange={e => setPartForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={"Notes on personal best, wind, pool conditions, etc."}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <Btn variant="ghost" onClick={() => setOpenPartForm(false)}>
            Batal
          </Btn>
          {!editPart && (
            <Btn variant="outline" type="submit" name="intent" value="keepOpen" disabled={savingPart}>
              {savingPart ? "Saving..." : "Save & Add Another"}
            </Btn>
          )}
          <Btn variant="primary" type="submit" name="intent" value="close" disabled={savingPart}>
            {savingPart ? "Saving..." : "Save Result"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
