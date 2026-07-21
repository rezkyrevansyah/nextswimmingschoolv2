-- Extends the existing `landing_config` singleton with footer-specific
-- columns (address, social links, copyright text) and gives it its first
-- RLS policies + a CMS write path via LandingCMS's Footer tab.
-- Run this in Supabase SQL Editor. Safe to rerun.

alter table public.landing_config
  add column if not exists footer_address text,
  add column if not exists social_instagram text,
  add column if not exists social_tiktok text,
  add column if not exists social_youtube text,
  add column if not exists copyright_text text;

-- Guarantee the singleton row exists (id=1) so the Owner CMS can always load+update it.
insert into public.landing_config (id) values (1) on conflict (id) do nothing;

alter table public.landing_config enable row level security;

drop policy if exists public_select_landing_config on public.landing_config;
create policy public_select_landing_config
on public.landing_config for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_config on public.landing_config;
create policy owner_write_landing_config
on public.landing_config for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
