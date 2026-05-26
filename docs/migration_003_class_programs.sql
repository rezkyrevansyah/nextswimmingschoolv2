-- Migration 003: class_programs table for coach spreadsheet input
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.class_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  month text NOT NULL,          -- e.g. "2026-05"
  week integer NOT NULL CHECK (week BETWEEN 1 AND 5),
  topic text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_programs_pkey PRIMARY KEY (id),
  CONSTRAINT class_programs_unique UNIQUE (class_id, month, week),
  CONSTRAINT class_programs_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT class_programs_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
);

ALTER TABLE public.class_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage own programs" ON public.class_programs
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "Admin/owner can read programs" ON public.class_programs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
