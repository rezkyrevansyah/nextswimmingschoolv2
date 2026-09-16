-- Attendance source of truth
--
-- Three tables, not one:
--   coach_attendances  UNIQUE (coach_id, class_id, session_date)
--                      CHECK status IN ('present','late','absent')
--                      Coach izin/sakit live on coach_leaves; approved leave
--                      writes original=absent + substitute=present here.
--   member_attendances UNIQUE (class_id, member_id, session_date)
--                      ENUM attendance_status: hadir|telat|izin|sakit|tidak_hadir
--                      Written by coach QR / coach manual / admin leave — never by the member.
--   staff_attendances  UNIQUE (staff_id, attendance_date)
--                      CHECK status IN ('present','absent','izin','sakit')
--                      No Late. One calendar-day row. Selfie stored on selfie_url.
--
-- UI canon (English): present | late | absent | sick | izin
-- Mapping lives in src/lib/attendance.ts
--
-- Unique indexes already exist on the live DB (verified 2026-09-16).
-- CREATE IF NOT EXISTS below is idempotent documentation.

ALTER TABLE public.staff_attendances
  ADD COLUMN IF NOT EXISTS selfie_url text;

CREATE UNIQUE INDEX IF NOT EXISTS coach_attendances_coach_class_date_key
  ON public.coach_attendances (coach_id, class_id, session_date);

CREATE UNIQUE INDEX IF NOT EXISTS member_attendances_class_member_date_key
  ON public.member_attendances (class_id, member_id, session_date);

CREATE UNIQUE INDEX IF NOT EXISTS staff_attendances_staff_date_key
  ON public.staff_attendances (staff_id, attendance_date);
