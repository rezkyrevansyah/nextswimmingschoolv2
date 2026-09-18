// Shared utility functions used by multiple admin panel components.

import type { ClassRow } from "./_types";

/** Calculate age from a birth date string (YYYY-MM-DD). */
export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Handle error responses from /api/admin/users endpoints.
 * Returns [title, subtitle, duration] for toast.error().
 */
export function parseUserApiError(json: { error?: string; code?: string }): [string, string, number] {
  if (json.code === "EMAIL_TAKEN") {
    return ["Email already registered", json.error ?? "Use a different email.", 7000];
  }
  return ["Failed", json.error ?? "An error occurred.", 4000];
}

/** Get time for a specific day — falls back to global time_start/time_end. */
export function getSlotTime(
  cls: Pick<ClassRow, "schedule_times" | "time_start" | "time_end">,
  day: string
): { time_start: string; time_end: string } {
  const slot = cls.schedule_times?.find(s => s.day === day);
  return {
    time_start: slot?.time_start || cls.time_start || "",
    time_end:   slot?.time_end   || cls.time_end   || "",
  };
}
