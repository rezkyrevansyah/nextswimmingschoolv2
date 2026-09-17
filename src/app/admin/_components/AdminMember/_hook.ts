import type { useMemberListData } from "./useMemberListData";
import type { useMemberDetailData } from "./useMemberDetailData";
import type { useMemberCreateData } from "./useMemberCreateData";
import type { useMemberEditData } from "./useMemberEditData";
import type { useMemberActionsData } from "./useMemberActionsData";
import type { useMemberImportData } from "./useMemberImportData";
import type { useMemberQRData } from "./useMemberQRData";

export type AdminMemberHook =
  ReturnType<typeof useMemberListData> &
  ReturnType<typeof useMemberDetailData> &
  ReturnType<typeof useMemberCreateData> &
  ReturnType<typeof useMemberEditData> &
  ReturnType<typeof useMemberActionsData> &
  ReturnType<typeof useMemberImportData> &
  ReturnType<typeof useMemberQRData> & {
    t: (key: string, vars?: Record<string, string | number>) => string;
  };
