"use client";
import Btn from "@/components/ui/Btn";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useCoachList } from "./useCoachList";
import { useCoachCreate } from "./useCoachCreate";
import { useCoachDetailActions } from "./useCoachDetailActions";
import { useCoachLinkAssign } from "./useCoachLinkAssign";
import type { AdminCoachHook } from "./_hook";
import { EMPTY_COACH_FORM } from "./_types";
import { fmtMonthYear } from "./_utils";
import CoachTable from "./CoachTable";
import CoachDetailModal from "./CoachDetailModal";
import LinkCoachModal from "./LinkCoachModal";
import AddCoachModal from "./AddCoachModal";
import EditCoachModal from "./EditCoachModal";
import SuspendResetModals from "./SuspendResetModals";
import AssignClassModal from "./AssignClassModal";
import CredentialAndCertModals from "./CredentialAndCertModals";

export default function AdminCoach({ branchId }: { branchId: string }) {
  const { t, tArray } = useLocale();
  const monthsLong = tArray("common.months.long");
  const genderLabel = (g: string | null | undefined) => g === "male" ? t("admin.approvement.genderMale") : g === "female" ? t("admin.approvement.genderFemale") : null;

  const list = useCoachList(branchId);
  const create = useCoachCreate(branchId, list.load);
  const detailActions = useCoachDetailActions(list.load);
  const linkAssign = useCoachLinkAssign(branchId, list.load, detailActions.detail, detailActions.setDetail);

  const hook: AdminCoachHook = {
    ...list, ...create, ...detailActions, ...linkAssign,
    t, monthsLong, genderLabel, branchId, fmtMonthYear,
  };

  const { coaches, setShowArchived, showArchived, setLinkSearch, setLinkSelectedIds, setLinkShowFilters,
    setLinkFilterBranch, setLinkFilterCity, setOpenLink, loadLinkCandidates,
    setForm, setCreateAvatarFile, setCreateAvatarPreview, setOpenAdd, setDetail } = hook;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">{t("admin.coaches.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("admin.coaches.pageSub")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {coaches.some(c => c.is_archived) && (
            <Btn variant="ghost" size="sm" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? t("admin.coaches.hideArchivedBtn") : t("admin.coaches.showArchivedBtn", { count: coaches.filter(c => c.is_archived).length })}
            </Btn>
          )}
          <Btn variant="soft" icon="link" onClick={() => { setLinkSearch(""); setLinkSelectedIds(new Set()); setLinkShowFilters(false); setLinkFilterBranch(""); setLinkFilterCity(""); setOpenLink(true); loadLinkCandidates(); }}>{t("admin.coaches.linkExistingCoachBtn")}</Btn>
          <Btn variant="primary" icon="plus" onClick={() => { setForm(EMPTY_COACH_FORM); setCreateAvatarFile(null); setCreateAvatarPreview(null); setOpenAdd(true); }}>{t("admin.coaches.addCoachBtn")}</Btn>
        </div>
      </div>

      <CoachTable hook={list} onSelect={c => setDetail(c)} />
      <CoachDetailModal hook={hook} />
      <LinkCoachModal hook={hook} />
      <AddCoachModal hook={hook} />
      <EditCoachModal hook={hook} />
      <SuspendResetModals hook={hook} />
      <AssignClassModal hook={hook} />
      <CredentialAndCertModals hook={hook} />
    </div>
  );
}
