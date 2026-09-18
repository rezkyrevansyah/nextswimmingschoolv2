import type { useStudentListData } from "./useStudentListData";
import type { useStudentDetailData } from "./useStudentDetailData";
import type { useStudentCreateData } from "./useStudentCreateData";
import type { useStudentEditData } from "./useStudentEditData";
import type { useStudentActionsData } from "./useStudentActionsData";
import type { useStudentImportData } from "./useStudentImportData";
import type { useStudentQRData } from "./useStudentQRData";

export type AdminStudentHook =
  ReturnType<typeof useStudentListData> &
  ReturnType<typeof useStudentDetailData> &
  ReturnType<typeof useStudentCreateData> &
  ReturnType<typeof useStudentEditData> &
  ReturnType<typeof useStudentActionsData> &
  ReturnType<typeof useStudentImportData> &
  ReturnType<typeof useStudentQRData>;
