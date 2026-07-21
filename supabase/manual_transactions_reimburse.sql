-- Fixes a pre-existing drift: Owner/Admin Financial UI already reads/writes
-- is_reimburse + proof_url on manual_transactions (reimbursement-proof feature
-- on manual expense entries), but these columns were never created in the DB
-- — every insert/update touching them has been silently failing.
-- Run this in Supabase SQL Editor. Safe to rerun.

alter table public.manual_transactions
  add column if not exists is_reimburse boolean not null default false,
  add column if not exists proof_url text;
