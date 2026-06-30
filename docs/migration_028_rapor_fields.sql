-- Migration 028: Rapor data fields for report card
-- Run in Supabase SQL Editor

-- 1. Member ID number (Nomor Induk) on members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS member_no text;

-- 2. Coach-filled personality/motivation/learning fields on rapor_entries
ALTER TABLE public.rapor_entries
  ADD COLUMN IF NOT EXISTS personality text,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS learning_achievements text;

-- 3. Personal best times table
CREATE TABLE IF NOT EXISTS public.member_best_times (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  stroke text NOT NULL CHECK (stroke = ANY (ARRAY[
    'freestyle'::text, 'backstroke'::text, 'breaststroke'::text,
    'butterfly'::text, 'IM'::text
  ])),
  distance integer NOT NULL CHECK (distance = ANY (ARRAY[25, 50, 100, 200, 400])),
  time_seconds numeric(8,2) NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  coach_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_best_times_pkey PRIMARY KEY (id),
  CONSTRAINT member_best_times_member_id_fkey FOREIGN KEY (member_id)
    REFERENCES public.members(id) ON DELETE CASCADE,
  CONSTRAINT member_best_times_branch_id_fkey FOREIGN KEY (branch_id)
    REFERENCES public.branches(id),
  CONSTRAINT member_best_times_coach_id_fkey FOREIGN KEY (coach_id)
    REFERENCES public.profiles(id)
);
