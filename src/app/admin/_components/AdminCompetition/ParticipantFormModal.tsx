"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";
import CompetitionDocUploader from "./CompetitionDocUploader";
import type { AdminCompetitionHook } from "./_hook";

export default function ParticipantFormModal({ hook, onNewCompRequested, onEditCompRequested }: {
  hook: AdminCompetitionHook;
  onNewCompRequested: () => void;
  onEditCompRequested: (compId: string) => void;
}) {
  const {
    t, activeTab, competitions, selectedComp,
    openPartForm, setOpenPartForm, editPart, partForm, setPartForm, savingPart, handleSaveParticipant,
    awardMemberId, awardMemberSearch, memberSearch, setMemberSearch, filteredMembers,
    coachesList, formEffectiveMemberId, formEffectiveCompId, getDoc, mergeDocs, handleViewDoc,
  } = hook;

  if (!openPartForm) return null;

  return (
    <Modal
      open={openPartForm}
      onClose={() => setOpenPartForm(false)}
      title={editPart ? t("admin.competition.editResultModalTitle") : t("admin.competition.addResultModalTitle")}
    >
      <form onSubmit={handleSaveParticipant} className="space-y-4">
        {/* Competition selector — shown only when opened from awards tab (no selectedComp).
            Includes inline Lomba CRUD (create/edit) so the admin never has to leave this
            popup just to register an event that doesn't exist yet or fix a typo in one. */}
        {!selectedComp && !editPart && (
          <Field label={t("admin.competition.fieldCompetition")} required>
            <div className="flex items-center gap-2">
              <Select
                value={partForm.competition_id}
                onChange={e => setPartForm(prev => ({ ...prev, competition_id: e.target.value }))}
                required
                className="flex-1"
              >
                <option value="">{t("admin.competition.selectCompOption")}</option>
                {competitions.map(c => {
                  // Native <select> option-list popups size themselves to the widest
                  // option and aren't clipped by the modal's bounds — a long competition
                  // name plus the date suffix can overflow past the modal edge. Truncate
                  // the name so the combined label stays short enough to fit.
                  const shortName = c.name.length > 45 ? `${c.name.slice(0, 45)}…` : c.name;
                  return (
                    <option key={c.id} value={c.id} title={c.name}>
                      {shortName} — {c.start_date ? fmtDate(c.start_date) : ""}
                    </option>
                  );
                })}
              </Select>
              <button
                type="button"
                title={t("admin.competition.addNewEventTitle")}
                onClick={onNewCompRequested}
                className="shrink-0 w-9 h-9 rounded-lg border border-line hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
              >
                <Icon name="plus" className="w-4 h-4" />
              </button>
              {partForm.competition_id && (
                <button
                  type="button"
                  title={t("admin.competition.editThisEventTitle")}
                  onClick={() => onEditCompRequested(partForm.competition_id)}
                  className="shrink-0 w-9 h-9 rounded-lg border border-line hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center transition-colors"
                >
                  <Icon name="edit" className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>
        )}

        <Field label={t("admin.competition.selectMemberField")} required>
          {(editPart || (activeTab === "awards" && awardMemberId && !editPart && partForm.member_id === awardMemberId)) ? (
            <div className="p-2.5 bg-paper-tint rounded-lg font-bold text-ink-strong">
              {editPart
                ? (editPart.member?.profile as { full_name: string } | null)?.full_name
                : awardMemberSearch}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder={t("admin.competition.searchMemberInline")}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              <Select
                value={partForm.member_id}
                onChange={e => setPartForm(prev => ({ ...prev, member_id: e.target.value }))}
                required
              >
                <option value="">{t("admin.competition.selectMemberOption")}</option>
                {filteredMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.branch_name || "Center"})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admin.competition.fieldCategoryEvent")} required hint={t("admin.competition.fieldCategoryEventHint")}>
            <Input
              value={partForm.category}
              onChange={e => setPartForm(prev => ({ ...prev, category: e.target.value }))}
              placeholder="50m Gaya Bebas"
              required
            />
          </Field>
          <Field label={t("admin.competition.fieldAgeGroup")} hint={t("admin.competition.fieldAgeGroupHint")}>
            <Input
              value={partForm.age_group}
              onChange={e => setPartForm(prev => ({ ...prev, age_group: e.target.value }))}
              placeholder="KU-4 (U-12)"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admin.competition.fieldStroke")} hint={t("admin.competition.fieldStrokeHint")}>
            <Input
              value={partForm.stroke}
              onChange={e => setPartForm(prev => ({ ...prev, stroke: e.target.value }))}
              placeholder={t("admin.competition.fieldStrokePlaceholder")}
            />
          </Field>
          <Field label={t("admin.competition.fieldDistance")} hint={t("admin.competition.fieldDistanceHint")}>
            <Input
              type="number" min={0} inputMode="numeric"
              value={partForm.distance_meters}
              onChange={e => setPartForm(prev => ({ ...prev, distance_meters: e.target.value }))}
              placeholder="50"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t("admin.competition.fieldResultTime")} hint={t("admin.competition.fieldResultTimeHint")}>
            <Input
              value={partForm.time_raw}
              onChange={e => setPartForm(prev => ({ ...prev, time_raw: e.target.value }))}
              placeholder="32.41"
            />
          </Field>
          <Field label={t("admin.competition.fieldRank")} hint={t("admin.competition.fieldRankHint")}>
            <Input
              type="number"
              min={1}
              value={partForm.rank}
              onChange={e => setPartForm(prev => ({ ...prev, rank: e.target.value }))}
              placeholder="1"
            />
          </Field>
          <Field label={t("admin.competition.fieldResultStatus")}>
            <Select value={partForm.result_status} onChange={e => setPartForm(prev => ({ ...prev, result_status: e.target.value }))}>
              <option value="finished">{t("admin.competition.statusFinished")}</option>
              <option value="finalist">{t("admin.competition.statusFinalist")}</option>
              <option value="dq">{t("admin.competition.statusDq")}</option>
              <option value="dns">{t("admin.competition.statusDns")}</option>
              <option value="dnf">{t("admin.competition.statusDnf")}</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admin.competition.fieldAwardMedal")}>
            <Select value={partForm.award} onChange={e => setPartForm(prev => ({ ...prev, award: e.target.value }))}>
              <option value="participant">{t("admin.competition.awardOptionParticipant")}</option>
              <option value="gold">{t("admin.competition.awardOptionGold")}</option>
              <option value="silver">{t("admin.competition.awardOptionSilver")}</option>
              <option value="bronze">{t("admin.competition.awardOptionBronze")}</option>
              <option value="fourth_place">{t("admin.competition.awardOptionFourthPlace")}</option>
              <option value="finalist">{t("admin.competition.awardOptionFinalist")}</option>
              <option value="custom">{t("admin.competition.awardOptionCustom")}</option>
            </Select>
          </Field>
          {partForm.award === "custom" && (
            <Field label={t("admin.competition.fieldCustomAward")}>
              <Input
                value={partForm.custom_award_label}
                onChange={e => setPartForm(prev => ({ ...prev, custom_award_label: e.target.value }))}
                placeholder={t("admin.competition.fieldCustomAwardPlaceholder")}
              />
            </Field>
          )}
          <Field label={t("admin.competition.fieldCoach")}>
            <Select value={partForm.coach_id} onChange={e => setPartForm(prev => ({ ...prev, coach_id: e.target.value }))}>
              <option value="">{t("admin.competition.fieldCoachNone")}</option>
              {coachesList.map(c => (
                <option key={c.id} value={c.id}>
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

        <Field label={t("admin.competition.fieldAdditionalNotes")}>
          <Textarea
            rows={2}
            value={partForm.notes}
            onChange={e => setPartForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={t("admin.competition.fieldAdditionalNotesPlaceholder")}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <Btn variant="ghost" onClick={() => setOpenPartForm(false)}>
            Batal
          </Btn>
          {!editPart && (
            <Btn variant="outline" type="submit" name="intent" value="keepOpen" disabled={savingPart}>
              {savingPart ? t("admin.competition.savingBtn") : t("admin.competition.saveAndAddAnotherBtn")}
            </Btn>
          )}
          <Btn variant="primary" type="submit" name="intent" value="close" disabled={savingPart}>
            {savingPart ? t("admin.competition.savingBtn") : t("admin.competition.saveResultBtn")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
