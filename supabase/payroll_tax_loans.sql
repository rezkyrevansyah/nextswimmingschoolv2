-- Tax settings, coach loans, loan payment ledger, and payslip deduction breakdown
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── tax_settings ─────────────────────────────────────────────────────────────
create table if not exists public.tax_settings (
  id uuid not null default gen_random_uuid(),
  coach_id uuid,
  mode text not null check (mode = any (array['percent'::text, 'fixed'::text])),
  percent_value numeric(5,2),
  fixed_value integer,
  is_active boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint tax_settings_pkey primary key (id),
  constraint tax_settings_coach_id_fkey foreign key (coach_id) references public.profiles(id),
  constraint tax_settings_updated_by_fkey foreign key (updated_by) references public.profiles(id),
  constraint tax_settings_mode_value_chk check (
    (mode = 'percent' and percent_value is not null and fixed_value is null) or
    (mode = 'fixed' and fixed_value is not null and percent_value is null)
  )
);

create unique index if not exists tax_settings_general_unique
  on public.tax_settings (coalesce(coach_id::text, ''))
  where is_active;

-- ── coach_loans ──────────────────────────────────────────────────────────────
create table if not exists public.coach_loans (
  id uuid not null default gen_random_uuid(),
  coach_id uuid not null,
  branch_id uuid not null,
  principal_amount integer not null check (principal_amount > 0),
  tenor_months integer not null check (tenor_months > 0),
  installment_amount integer not null check (installment_amount > 0),
  reason text,
  status text not null default 'active' check (status = any (array['active'::text, 'paid_off'::text, 'written_off'::text, 'cancelled'::text])),
  started_period_label text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone,
  notes text,
  constraint coach_loans_pkey primary key (id),
  constraint coach_loans_coach_id_fkey foreign key (coach_id) references public.profiles(id),
  constraint coach_loans_branch_id_fkey foreign key (branch_id) references public.branches(id),
  constraint coach_loans_created_by_fkey foreign key (created_by) references public.profiles(id)
);

-- ── coach_loan_payments (ledger) ─────────────────────────────────────────────
create table if not exists public.coach_loan_payments (
  id uuid not null default gen_random_uuid(),
  loan_id uuid not null,
  payslip_id uuid,
  amount integer not null check (amount > 0),
  installment_number integer not null,
  period_label text not null,
  kind text not null default 'installment' check (kind = any (array['installment'::text, 'manual_adjustment'::text, 'write_off'::text])),
  created_at timestamp with time zone not null default now(),
  created_by uuid,
  constraint coach_loan_payments_pkey primary key (id),
  constraint coach_loan_payments_loan_id_fkey foreign key (loan_id) references public.coach_loans(id) on delete cascade,
  constraint coach_loan_payments_payslip_id_fkey foreign key (payslip_id) references public.payslips(id) on delete cascade,
  constraint coach_loan_payments_created_by_fkey foreign key (created_by) references public.profiles(id)
);

create unique index if not exists coach_loan_payments_one_per_payslip
  on public.coach_loan_payments (loan_id, payslip_id)
  where payslip_id is not null;

-- ── payslip_deductions (breakdown) ──────────────────────────────────────────
create table if not exists public.payslip_deductions (
  id uuid not null default gen_random_uuid(),
  payslip_id uuid not null,
  type text not null check (type = any (array['tax'::text, 'loan'::text, 'bpjs'::text, 'absence_penalty'::text, 'other'::text])),
  label text not null,
  amount integer not null check (amount >= 0),
  loan_id uuid,
  loan_payment_id uuid,
  meta jsonb,
  created_at timestamp with time zone not null default now(),
  constraint payslip_deductions_pkey primary key (id),
  constraint payslip_deductions_payslip_id_fkey foreign key (payslip_id) references public.payslips(id) on delete cascade,
  constraint payslip_deductions_loan_id_fkey foreign key (loan_id) references public.coach_loans(id),
  constraint payslip_deductions_loan_payment_id_fkey foreign key (loan_payment_id) references public.coach_loan_payments(id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.tax_settings enable row level security;
alter table public.coach_loans enable row level security;
alter table public.coach_loan_payments enable row level security;
alter table public.payslip_deductions enable row level security;

drop policy if exists owner_all_tax_settings on public.tax_settings;
create policy owner_all_tax_settings
on public.tax_settings
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists owner_all_coach_loans on public.coach_loans;
create policy owner_all_coach_loans
on public.coach_loans
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists coach_select_own_loans on public.coach_loans;
create policy coach_select_own_loans
on public.coach_loans
for select
to authenticated
using (coach_id = auth.uid());

drop policy if exists owner_all_coach_loan_payments on public.coach_loan_payments;
create policy owner_all_coach_loan_payments
on public.coach_loan_payments
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists coach_select_own_loan_payments on public.coach_loan_payments;
create policy coach_select_own_loan_payments
on public.coach_loan_payments
for select
to authenticated
using (exists (select 1 from public.coach_loans l where l.id = coach_loan_payments.loan_id and l.coach_id = auth.uid()));

drop policy if exists owner_all_payslip_deductions on public.payslip_deductions;
create policy owner_all_payslip_deductions
on public.payslip_deductions
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists coach_select_own_payslip_deductions on public.payslip_deductions;
create policy coach_select_own_payslip_deductions
on public.payslip_deductions
for select
to authenticated
using (exists (select 1 from public.payslips s where s.id = payslip_deductions.payslip_id and s.coach_id = auth.uid()));
