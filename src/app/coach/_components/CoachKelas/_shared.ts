import type { ClassRow } from "../../_types";

// Captured once at module load to avoid impure Date.now() calls during render
const MODULE_NOW_MS = Date.now();

export type MemberDetail = NonNullable<NonNullable<ClassRow["member_classes"]>[number]["member"]>;

export function calcAgeFromBirthDate(birthDate: string, nowMs: number = MODULE_NOW_MS): number {
  return Math.floor((nowMs - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
}
