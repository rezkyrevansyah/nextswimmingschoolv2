import type { useCoachList } from "./useCoachList";
import type { useCoachCreate } from "./useCoachCreate";
import type { useCoachDetailActions } from "./useCoachDetailActions";
import type { useCoachLinkAssign } from "./useCoachLinkAssign";

export type AdminCoachHook =
  ReturnType<typeof useCoachList> &
  ReturnType<typeof useCoachCreate> &
  ReturnType<typeof useCoachDetailActions> &
  ReturnType<typeof useCoachLinkAssign> & {
    t: (key: string, vars?: Record<string, string | number>) => string;
    monthsLong: string[];
    genderLabel: (g: string | null | undefined) => string | null;
    branchId: string;
    fmtMonthYear: (val: string | null | undefined, monthsLong: string[]) => string;
  };
