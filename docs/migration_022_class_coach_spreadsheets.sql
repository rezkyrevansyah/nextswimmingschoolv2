-- Migration 022: Per-coach spreadsheet per class
-- Creates class_coach_spreadsheets so each coach assigned to a class
-- can maintain their own Google Sheets link independently.
-- classes.spreadsheet_url and classes.spreadsheet_filled are kept for
-- backward compatibility and are kept in sync at the application layer.

-- 1. Create the new table
CREATE TABLE public.class_coach_spreadsheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spreadsheet_url TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, coach_id)
);

-- 2. Backfill: migrate existing classes.spreadsheet_url to primary coach
INSERT INTO public.class_coach_spreadsheets (class_id, coach_id, spreadsheet_url)
SELECT c.id, cc.coach_id, c.spreadsheet_url
FROM public.classes c
JOIN public.class_coaches cc ON cc.class_id = c.id AND cc.is_primary = true
WHERE c.spreadsheet_url IS NOT NULL AND c.spreadsheet_filled = true
ON CONFLICT (class_id, coach_id) DO NOTHING;

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ccs_class_id ON public.class_coach_spreadsheets(class_id);
CREATE INDEX IF NOT EXISTS idx_ccs_coach_id ON public.class_coach_spreadsheets(coach_id);
