-- Support one review per coach per rapor entry (multi-coach classes)
-- Run this in Supabase SQL Editor. Safe to rerun.

create unique index if not exists member_reviews_one_per_coach
  on public.member_reviews (rapor_id, member_id, coach_id);
