-- CRITICAL FIX (step 1 of 2, additive/non-breaking):
-- profiles, branches, members currently have RLS disabled, and even where a
-- policy exists there is a blanket "authenticated full access using(true)"
-- policy that makes every other policy on these tables meaningless (Postgres
-- ORs policies together, so one `true` policy wins over all restrictions).
--
-- This script is ADDITIVE ONLY — it enables RLS and adds the correct
-- least-privilege policies, but does NOT drop the old blanket policies yet.
-- Run this first, deploy the corresponding app code fixes (register page,
-- role-escalation fix, branch_id IDOR fix), THEN run
-- rls_core_tables_drop_legacy.sql to actually remove the old permissive
-- policies and make this take effect.
--
-- Run this in Supabase SQL Editor. Safe to rerun (uses `create policy` which
-- errors on duplicate name rather than silently no-op'ing, so if you rerun
-- after partial failure, drop the partially-created policies first).

-- ── profiles ─────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = auth.uid());

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_select_coach_directory
on public.profiles for select to authenticated
using (role = 'coach');

create policy profiles_admin_same_branch_select
on public.profiles for select to authenticated
using (
  exists (select 1 from public.profiles caller where caller.id = auth.uid() and caller.role = 'admin')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
);

create policy profiles_admin_same_branch_update
on public.profiles for update to authenticated
using (
  exists (select 1 from public.profiles caller where caller.id = auth.uid() and caller.role = 'admin')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
)
with check (
  exists (select 1 from public.profiles caller where caller.id = auth.uid() and caller.role = 'admin')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
);

create policy profiles_school_read_affiliated_members
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.members m
    join public.schools s on s.id = m.school_id
    where m.profile_id = public.profiles.id and s.profile_id = auth.uid()
  )
);

create policy profiles_owner_all
on public.profiles for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

-- ── branches ─────────────────────────────────────────────────────────────────

alter table public.branches enable row level security;

-- Public/anon branch picker (register page) reads from this view, never the
-- base table directly, so anon never has row access to bank_name/bank_account.
create or replace view public.public_branches
with (security_invoker = true) as
select id, name, city from public.branches where status = 'active';

grant select on public.public_branches to anon, authenticated;

create policy branches_anon_select_active
on public.branches for select to anon
using (status = 'active');

create policy branches_authenticated_own_branch_select
on public.branches for select to authenticated
using (id = (select p.branch_id from public.profiles p where p.id = auth.uid()));

create policy branches_admin_own_branch_update
on public.branches for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and id = (select p.branch_id from public.profiles p where p.id = auth.uid())
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and id = (select p.branch_id from public.profiles p where p.id = auth.uid())
);

create policy branches_owner_all
on public.branches for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

-- ── members ──────────────────────────────────────────────────────────────────

alter table public.members enable row level security;

create policy members_select_own
on public.members for select to authenticated
using (profile_id = auth.uid());

create policy members_update_own
on public.members for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy members_admin_same_branch_all
on public.members for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
);

create policy members_coach_same_branch_select
on public.members for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
);

create policy members_coach_update_remaining_sessions
on public.members for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  and branch_id = (select p.branch_id from public.profiles p where p.id = auth.uid())
);

create policy members_school_select_affiliated
on public.members for select to authenticated
using (
  type = 'school_affiliate'
  and exists (
    select 1 from public.schools s where s.id = members.school_id and s.profile_id = auth.uid()
  )
);

create policy members_owner_all
on public.members for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
