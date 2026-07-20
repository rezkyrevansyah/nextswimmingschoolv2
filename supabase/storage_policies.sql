-- RLS policies for Supabase Storage (storage.objects) — two buckets:
--   next-storage          (public)  — avatars, logos, class photos, signatures, landing images
--   next-storage-private  (private) — payment proofs, certifications, attendance selfies
--
-- Create both buckets in Supabase Studio → Storage before running this
-- (next-storage: public = true; next-storage-private: public = false).
--
-- Run this in Supabase SQL Editor. Safe to rerun.

-- Reuses current_user_role() if it already exists (created by an earlier RLS
-- migration); (re)create it here too so this script is self-contained even
-- if that earlier migration file is no longer present locally.
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- ── next-storage (public bucket) ────────────────────────────────────────────

drop policy if exists "next-storage: public read" on storage.objects;
create policy "next-storage: public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'next-storage');

drop policy if exists "next-storage: authenticated write" on storage.objects;
create policy "next-storage: authenticated write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'next-storage'
  and public.current_user_role() in ('owner', 'admin', 'coach')
);

drop policy if exists "next-storage: authenticated update" on storage.objects;
create policy "next-storage: authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'next-storage'
  and public.current_user_role() in ('owner', 'admin', 'coach')
)
with check (
  bucket_id = 'next-storage'
  and public.current_user_role() in ('owner', 'admin', 'coach')
);

drop policy if exists "next-storage: owner delete" on storage.objects;
create policy "next-storage: owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'next-storage'
  and public.current_user_role() = 'owner'
);

-- ── next-storage-private (private bucket) ──────────────────────────────────
-- No anon access at all. Reads happen exclusively through the service-role
-- client generating short-lived signed URLs (src/app/api/storage/signed-url),
-- which itself relies on the caller having already passed RLS on the row
-- that references the file's storage key.

drop policy if exists "next-storage-private: authenticated read" on storage.objects;
create policy "next-storage-private: authenticated read"
on storage.objects for select
to authenticated
using (bucket_id = 'next-storage-private');

drop policy if exists "next-storage-private: authenticated write" on storage.objects;
create policy "next-storage-private: authenticated write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'next-storage-private'
  and public.current_user_role() in ('owner', 'admin', 'coach')
);

drop policy if exists "next-storage-private: authenticated update" on storage.objects;
create policy "next-storage-private: authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'next-storage-private'
  and public.current_user_role() in ('owner', 'admin', 'coach')
)
with check (
  bucket_id = 'next-storage-private'
  and public.current_user_role() in ('owner', 'admin', 'coach')
);

drop policy if exists "next-storage-private: owner delete" on storage.objects;
create policy "next-storage-private: owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'next-storage-private'
  and public.current_user_role() = 'owner'
);
