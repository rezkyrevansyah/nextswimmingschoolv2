"use client";
import { Card } from "@/components/ui/Card";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { useMemberListData } from "./useMemberListData";
import { useMemberDetailData } from "./useMemberDetailData";
import { useMemberCreateData } from "./useMemberCreateData";
import { useMemberEditData } from "./useMemberEditData";
import { useMemberActionsData } from "./useMemberActionsData";
import { useMemberImportData } from "./useMemberImportData";
import { useMemberQRData } from "./useMemberQRData";
import type { AdminMemberHook } from "./_hook";
import MembersHeader from "./MembersHeader";
import MembersFilterBar from "./MembersFilterBar";
import MembersTable from "./MembersTable";
import MemberDetailModal from "./MemberDetailModal";
import MemberEditModal from "./MemberEditModal";
import CreateMemberModal from "./CreateMemberModal";
import MemberActionModals from "./MemberActionModals";
import ImportExcelModal from "./ImportExcelModal";

export default function AdminMember({ branchId }: { branchId: string }) {
  const list = useMemberListData({ branchId });
  const detail = useMemberDetailData();
  const create = useMemberCreateData({ branchId, classes: list.classes, load: list.load, setSearch: list.setSearch });
  const edit = useMemberEditData({ detail: detail.detail, setDetail: detail.setDetail, classes: list.classes, load: list.load });
  const actions = useMemberActionsData({ branchId, detail: detail.detail, setDetail: detail.setDetail, classes: list.classes, load: list.load });
  const importData = useMemberImportData({ branchId, classes: list.classes, schoolsList: list.schoolsList, findCoachByPhone: list.findCoachByPhone, load: list.load });
  const qr = useMemberQRData({ members: list.members });
  const hook: AdminMemberHook = { ...list, ...detail, ...create, ...edit, ...actions, ...importData, ...qr };

  return (
    <div className="space-y-5">
      <MembersHeader hook={hook} />
      <Card padded={false}>
        <MembersFilterBar hook={hook} />
        <MembersTable hook={hook} />
      </Card>

      <MemberDetailModal hook={hook} />
      <MemberEditModal hook={hook} />
      <CreateMemberModal hook={hook} />
      <MemberActionModals hook={hook} />

      {hook.photoView && (
        <PhotoLightbox src={hook.photoView} name={hook.detail?.profile?.full_name ?? ""} onClose={() => hook.setPhotoView(null)} />
      )}

      <ImportExcelModal hook={hook} />
    </div>
  );
}
