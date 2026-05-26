-- Migration 002: class_holidays table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.class_holidays (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  holiday_date date NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_holidays_pkey PRIMARY KEY (id),
  CONSTRAINT class_holidays_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT class_holidays_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT class_holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT class_holidays_unique UNIQUE (class_id, holiday_date)
);

-- RLS
ALTER TABLE public.class_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner can manage holidays" ON public.class_holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Coach can read their class holidays" ON public.class_holidays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_coaches
      WHERE class_id = class_holidays.class_id
      AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Member can read their class holidays" ON public.class_holidays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.member_classes mc
      JOIN public.members m ON m.id = mc.member_id
      WHERE mc.class_id = class_holidays.class_id
      AND m.profile_id = auth.uid()
    )
  );

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_class_holidays_class_date ON public.class_holidays (class_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_class_holidays_branch_date ON public.class_holidays (branch_id, holiday_date);
