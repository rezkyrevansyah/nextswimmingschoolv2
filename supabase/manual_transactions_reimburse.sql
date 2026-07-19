-- Manual expense entries: support marking an entry as reimburse + attaching a proof link
-- Run this in Supabase SQL Editor. Safe to rerun.

alter table public.manual_transactions add column if not exists is_reimburse boolean not null default false;
alter table public.manual_transactions add column if not exists proof_url text;
