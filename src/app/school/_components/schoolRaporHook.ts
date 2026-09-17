import type { useSchoolRaporData } from "./useSchoolRaporData";
import type { useSchoolRaporExport } from "./useSchoolRaporExport";

export type SchoolRaporHook = ReturnType<typeof useSchoolRaporData> & ReturnType<typeof useSchoolRaporExport>;
