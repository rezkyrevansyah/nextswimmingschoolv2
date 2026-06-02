-- Migration 009: Add schedule_times JSONB column to classes
-- Allows per-day time configuration: [{ day, time_start, time_end }]
-- Falls back to existing time_start / time_end if not set per-day

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS schedule_times jsonb DEFAULT NULL;

-- Backfill existing rows: build schedule_times from schedule_days + time_start + time_end
-- Only backfill rows that have both schedule_days and time_start set
UPDATE classes
SET schedule_times = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'day', d.day,
      'time_start', to_char(time_start, 'HH24:MI'),
      'time_end',   COALESCE(to_char(time_end, 'HH24:MI'), '')
    )
  )
  FROM unnest(schedule_days) AS d(day)
)
WHERE schedule_days IS NOT NULL
  AND array_length(schedule_days, 1) > 0
  AND time_start IS NOT NULL
  AND schedule_times IS NULL;
