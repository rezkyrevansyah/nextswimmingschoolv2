import type { useClassesListData } from "./useClassesListData";
import type { useClassDetailData } from "./useClassDetailData";

export type OwnerClassesMasterHook =
  ReturnType<typeof useClassesListData> &
  ReturnType<typeof useClassDetailData>;
