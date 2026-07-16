-- Head Coach / Assistant Coach role per class, plus rapor signer override
-- Run this in Supabase SQL Editor. Safe to rerun.

alter table public.class_coaches add column if not exists role text not null default 'assistant'
  check (role = any (array['head'::text, 'assistant'::text]));

create unique index if not exists class_coaches_one_head_per_class
  on public.class_coaches (class_id) where role = 'head';

alter table public.classes add column if not exists rapor_signer_coach_id uuid references public.profiles(id);
