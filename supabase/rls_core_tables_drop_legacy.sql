-- CRITICAL FIX (step 2 of 2 — BREAKING, run manually only after):
--   1. rls_core_tables_additive.sql has been run successfully, AND
--   2. the corresponding app code fixes are deployed:
--        - src/app/register/page.tsx uses `public_branches` instead of `branches`
--        - PATCH /api/admin/users/[userId] blocks non-owner callers from changing `role`
--        - branch_id is validated against caller's own branch in admin API routes
--   3. you have manually tested each role (owner/admin/coach/member/school) against
--      the additive policies while the legacy "full access" policies were still
--      present (see rls_core_tables_additive.sql header for the safe rollout order).
--
-- This script removes the old blanket "authenticated full access using(true)"
-- policies. Once this runs, RLS actually starts restricting access — this is
-- the point where the fix takes effect. Keep this file's contents handy to
-- reverse quickly (see bottom) if something unexpected breaks.
--
-- Run this in Supabase SQL Editor.

drop policy if exists "profiles: authenticated full access" on public.profiles;
drop policy if exists owner_update_profiles_landing on public.profiles; -- superseded by profiles_owner_all

drop policy if exists "branches: authenticated full access" on public.branches;
drop policy if exists "branches: public read" on public.branches; -- superseded by branches_anon_select_active + public_branches view
drop policy if exists "branches: owner write" on public.branches; -- superseded by branches_owner_all

drop policy if exists "members: authenticated full access" on public.members;
drop policy if exists "members: admin write" on public.members; -- superseded by members_admin_same_branch_all

-- ── Emergency rollback (only if something breaks and you need access restored
-- immediately while debugging) — re-paste and run this block: ─────────────────
--
-- create policy "authenticated full access" on public.profiles for all to authenticated using (true) with check (true);
-- create policy "authenticated full access" on public.branches for all to authenticated using (true) with check (true);
-- create policy "authenticated full access" on public.members for all to authenticated using (true) with check (true);
