-- Coach invoice items: support extra-session and reimbursement line items alongside class sessions
-- Run this in Supabase SQL Editor. Safe to rerun.

alter table public.coach_invoice_items add column if not exists item_type text not null default 'class'
  check (item_type in ('class', 'extra', 'reimburse'));
alter table public.coach_invoice_items add column if not exists description text;
alter table public.coach_invoice_items add column if not exists proof_url text;
alter table public.coach_invoice_items alter column class_id drop not null;
