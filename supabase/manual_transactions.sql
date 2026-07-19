-- Manual income/expense entries (not derived from bills/coach_invoices)
-- Run this in Supabase SQL Editor. Safe to rerun.

create table if not exists public.manual_transactions (
  id uuid not null default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  kind text not null check (kind in ('income','expense')),
  category text,
  description text not null,
  amount integer not null check (amount > 0),
  occurred_at date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_by_role text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  constraint manual_transactions_pkey primary key (id)
);

alter table public.manual_transactions enable row level security;

drop policy if exists owner_all_manual_transactions on public.manual_transactions;
create policy owner_all_manual_transactions
on public.manual_transactions for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists admin_own_branch_manual_transactions on public.manual_transactions;
create policy admin_own_branch_manual_transactions
on public.manual_transactions for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.branch_id = manual_transactions.branch_id))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.branch_id = manual_transactions.branch_id));
