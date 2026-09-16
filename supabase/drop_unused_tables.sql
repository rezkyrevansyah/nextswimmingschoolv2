-- Database cleanup: drop tables confirmed dead by audit (zero code references
-- anywhere in src/, zero rows, each superseded by an actively-used replacement).
-- Structure + data backed up first at supabase/backups/pre_cleanup_2026-09-16.sql.
--
-- NOT dropped despite also having zero references: staff_rates, staff_invoices
-- (in-progress "staff invoicing" feature — staff_invoices.salary_id FKs into
-- monthly_salaries, so monthly_salaries is left alone too even though nothing
-- queries it directly yet). Also not dropped: 8 other zero-reference landing_*
-- / class_programs tables with no clear superseding replacement — held for a
-- separate review pass rather than dropped alongside these confirmed-dead ones.

-- Superseded by rapor_level_distances / rapor_level_strokes /
-- rapor_level_best_time_targets (see supabase/rapor_level_best_time_matrix.sql,
-- which already backfilled this data and left a commented-out drop statement).
DROP TABLE IF EXISTS public.rapor_level_best_times;

-- Superseded by landing_why_next (the section actually rendered on the public
-- landing page and edited in LandingCMS.tsx).
DROP TABLE IF EXISTS public.landing_whyus_cards;
DROP TABLE IF EXISTS public.landing_whyus;

-- Superseded by school_signatures (actively used in OwnerSchools.tsx and the
-- school-signature upload route). Assignments dropped first (FK to signatures).
DROP TABLE IF EXISTS public.rapor_signature_assignments;
DROP TABLE IF EXISTS public.rapor_signatures;

-- Superseded by the level-scoped rapor_level_criteria (actively used).
DROP TABLE IF EXISTS public.class_criteria;

-- Known leftover Drizzle placeholder, called out in this project's own
-- CLAUDE.md; only ever referenced by the acknowledged-stale src/db/schema.ts
-- stub and a one-off test script, never by the app.
DROP TABLE IF EXISTS public.drizzle_test_notes;
