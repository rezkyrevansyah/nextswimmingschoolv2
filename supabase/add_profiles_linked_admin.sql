-- Link staff accounts that were auto-created alongside an admin account
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS linked_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
