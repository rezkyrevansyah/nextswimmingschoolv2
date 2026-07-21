-- Owner-managed "FAQ" landing section. Table `landing_faqs` already exists in
-- the schema but has never been wired to RLS/trigger — this migration only
-- adds what's missing. Run this in Supabase SQL Editor. Safe to rerun.

drop trigger if exists set_landing_faqs_updated_at on public.landing_faqs;
create trigger set_landing_faqs_updated_at
before update on public.landing_faqs
for each row execute function public.set_updated_at();

alter table public.landing_faqs enable row level security;

drop policy if exists public_select_landing_faqs on public.landing_faqs;
create policy public_select_landing_faqs
on public.landing_faqs for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_faqs on public.landing_faqs;
create policy owner_write_landing_faqs
on public.landing_faqs for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
