-- ============================================================
-- SEED OWNER PROFILE
-- Jalankan setelah reset_all_data.sql
-- Pastikan user sudah ada di auth.users dengan id berikut
-- ============================================================

INSERT INTO public.profiles (
  id,
  role,
  full_name,
  email,
  is_profile_complete,
  created_at,
  updated_at
)
VALUES (
  'c69fe3b1-8411-4013-a0ce-885e70d2c6ee',
  'owner',
  'Owner',
  (SELECT email FROM auth.users WHERE id = 'c69fe3b1-8411-4013-a0ce-885e70d2c6ee'),
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role               = 'owner',
  is_profile_complete = true,
  updated_at         = now();
