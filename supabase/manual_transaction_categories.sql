-- CRUD-able categories for manual_transactions, separated by kind (income/expense).
-- Owner-managed; Admin can read (select category when creating a transaction) but not write.
-- manual_transactions.category itself stays free-text (not a FK) — deleting/renaming a
-- category here does not retroactively touch historical transactions.
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.manual_transaction_categories (
  id uuid not null default uuid_generate_v4(),
  kind text not null check (kind = any (array['income'::text, 'expense'::text])),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint manual_transaction_categories_pkey primary key (id),
  constraint manual_transaction_categories_kind_name_key unique (kind, name)
);

alter table public.manual_transaction_categories enable row level security;

drop policy if exists select_manual_transaction_categories on public.manual_transaction_categories;
create policy select_manual_transaction_categories
on public.manual_transaction_categories for select to authenticated using (true);

drop policy if exists owner_write_manual_transaction_categories on public.manual_transaction_categories;
create policy owner_write_manual_transaction_categories
on public.manual_transaction_categories for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

-- Seed the 5 defaults that used to be hardcoded, for both kinds.
insert into public.manual_transaction_categories (kind, name, sort_order)
values
  ('income',  'Sponsorship',  1),
  ('income',  'Sewa',         2),
  ('income',  'Listrik',      3),
  ('income',  'Perlengkapan', 4),
  ('income',  'Lainnya',      5),
  ('expense', 'Sponsorship',  1),
  ('expense', 'Sewa',         2),
  ('expense', 'Listrik',      3),
  ('expense', 'Perlengkapan', 4),
  ('expense', 'Lainnya',      5)
on conflict (kind, name) do nothing;

-- Auto-migrate any free-text category values already used on existing manual_transactions
-- (including past "Lainnya" custom entries) so historical rows keep a matching category.
insert into public.manual_transaction_categories (kind, name)
select distinct kind, category from public.manual_transactions
where category is not null and category <> ''
on conflict (kind, name) do nothing;
