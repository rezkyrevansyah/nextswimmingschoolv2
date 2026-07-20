-- FIX: infinite recursion in RLS policies on public.profiles
--
-- Root cause: several policies on `profiles` (profiles_owner_all,
-- profiles_admin_same_branch_select/update) check the CALLER's own role/branch
-- by querying `profiles` itself inside a policy defined ON `profiles`. Postgres
-- must re-evaluate profiles' RLS to run that inner query, which re-triggers the
-- same policy, recursing infinitely. The same pattern was also used (but not
-- yet exercised) in branches_owner_all/branches_admin_own_branch_update and
-- members_owner_all/members_admin_same_branch_all/members_coach_*, since those
-- also subquery `profiles` and therefore hit the same recursive policies.
--
-- This went unnoticed while the old blanket "authenticated full access
-- using(true)" policy still existed on profiles (Postgres ORs policies
-- together, so the permissive policy short-circuited before recursion could
-- bite). It surfaced now because rls_core_tables_drop_legacy.sql has already
-- been run, removing that safety net.
--
-- Fix: two SECURITY DEFINER helper functions that read the caller's own row
-- directly (bypassing RLS, since they run with the function owner's
-- privileges) instead of going through a normal SELECT that re-triggers RLS.
-- They only ever return facts about auth.uid() itself — no cross-user data
-- exposure risk.
--
-- Run this in Supabase SQL Editor. Safe to rerun.

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_branch_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_branch_id() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_branch_id() to authenticated;

-- ── profiles ─────────────────────────────────────────────────────────────────

drop policy if exists profiles_admin_same_branch_select on public.profiles;
create policy profiles_admin_same_branch_select
on public.profiles for select to authenticated
using (
  public.current_user_role() = 'admin'
  and branch_id = public.current_user_branch_id()
);

drop policy if exists profiles_admin_same_branch_update on public.profiles;
create policy profiles_admin_same_branch_update
on public.profiles for update to authenticated
using (
  public.current_user_role() = 'admin'
  and branch_id = public.current_user_branch_id()
)
with check (
  public.current_user_role() = 'admin'
  and branch_id = public.current_user_branch_id()
);

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all
on public.profiles for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

-- ── branches ─────────────────────────────────────────────────────────────────

drop policy if exists branches_authenticated_own_branch_select on public.branches;
create policy branches_authenticated_own_branch_select
on public.branches for select to authenticated
using (id = public.current_user_branch_id());

drop policy if exists branches_admin_own_branch_update on public.branches;
create policy branches_admin_own_branch_update
on public.branches for update to authenticated
using (
  public.current_user_role() = 'admin'
  and id = public.current_user_branch_id()
)
with check (
  public.current_user_role() = 'admin'
  and id = public.current_user_branch_id()
);

drop policy if exists branches_owner_all on public.branches;
create policy branches_owner_all
on public.branches for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

-- ── members ──────────────────────────────────────────────────────────────────

drop policy if exists members_admin_same_branch_all on public.members;
create policy members_admin_same_branch_all
on public.members for all to authenticated
using (
  public.current_user_role() = 'admin'
  and branch_id = public.current_user_branch_id()
)
with check (
  public.current_user_role() = 'admin'
  and branch_id = public.current_user_branch_id()
);

drop policy if exists members_coach_same_branch_select on public.members;
create policy members_coach_same_branch_select
on public.members for select to authenticated
using (
  public.current_user_role() = 'coach'
  and branch_id = public.current_user_branch_id()
);

drop policy if exists members_coach_update_remaining_sessions on public.members;
create policy members_coach_update_remaining_sessions
on public.members for update to authenticated
using (
  public.current_user_role() = 'coach'
  and branch_id = public.current_user_branch_id()
)
with check (
  public.current_user_role() = 'coach'
  and branch_id = public.current_user_branch_id()
);

drop policy if exists members_owner_all on public.members;
create policy members_owner_all
on public.members for all to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

-- Note: profiles_select_own, profiles_update_own, profiles_select_coach_directory,
-- profiles_school_read_affiliated_members, members_select_own, members_update_own,
-- members_school_select_affiliated, branches_anon_select_active are untouched —
-- they don't self-query profiles for a role/branch check, so they were never
-- part of the recursion and don't need the helper function.
