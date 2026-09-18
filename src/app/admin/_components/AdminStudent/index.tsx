"use client";
import { Card } from "@/components/ui/Card";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { useStudentListData } from "./useStudentListData";
import { useStudentDetailData } from "./useStudentDetailData";
import { useStudentCreateData } from "./useStudentCreateData";
import { useStudentEditData } from "./useStudentEditData";
import { useStudentActionsData } from "./useStudentActionsData";
import { useStudentImportData } from "./useStudentImportData";
import { useStudentQRData } from "./useStudentQRData";
import type { AdminStudentHook } from "./_hook";
import StudentsHeader from "./StudentsHeader";
import StudentsFilterBar from "./StudentsFilterBar";
import StudentsTable from "./StudentsTable";
import StudentDetailModal from "./StudentDetailModal";
import StudentEditModal from "./StudentEditModal";
import CreateStudentModal from "./CreateStudentModal";
import StudentActionModals from "./StudentActionModals";
import ImportExcelModal from "./ImportExcelModal";

export default function AdminStudent({ branchId }: { branchId: string }) {
  const list = useStudentListData({ branchId });
  const detail = useStudentDetailData();
  const create = useStudentCreateData({ branchId, classes: list.classes, load: list.load, setSearch: list.setSearch });
  const edit = useStudentEditData({ detail: detail.detail, setDetail: detail.setDetail, classes: list.classes, load: list.load });
  const actions = useStudentActionsData({ branchId, detail: detail.detail, setDetail: detail.setDetail, classes: list.classes, load: list.load });
  const importData = useStudentImportData({ branchId, classes: list.classes, schoolsList: list.schoolsList, findCoachByPhone: list.findCoachByPhone, load: list.load });
  const qr = useStudentQRData({ students: list.students });
  const hook: AdminStudentHook = { ...list, ...detail, ...create, ...edit, ...actions, ...importData, ...qr };

  return (
    <div className="space-y-5">
      <StudentsHeader hook={hook} />
      <Card padded={false}>
        <StudentsFilterBar hook={hook} />
        <StudentsTable hook={hook} />
      </Card>

      <StudentDetailModal hook={hook} />
      <StudentEditModal hook={hook} />
      <CreateStudentModal hook={hook} />
      <StudentActionModals hook={hook} />

      {hook.photoView && (
        <PhotoLightbox src={hook.photoView} name={hook.detail?.profile?.full_name ?? ""} onClose={() => hook.setPhotoView(null)} />
      )}

      <ImportExcelModal hook={hook} />
    </div>
  );
}
