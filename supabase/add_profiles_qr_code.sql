-- Add qr_code to profiles for all roles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS qr_code text UNIQUE DEFAULT (uuid_generate_v4())::text;

-- Backfill existing profiles that have NULL qr_code
UPDATE profiles
  SET qr_code = (uuid_generate_v4())::text
  WHERE qr_code IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE profiles
  ALTER COLUMN qr_code SET NOT NULL;
