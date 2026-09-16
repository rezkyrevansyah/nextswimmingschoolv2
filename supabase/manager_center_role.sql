-- Manager Center role: sees every Admin-panel menu (incl. Financial, which
-- Admin never sees) plus a per-center toggle letting Owner hide Payments
-- from Admin specifically. Manager Center reuses profiles.linked_admin_id
-- (see add_profiles_linked_admin.sql) to optionally get a linked Staff
-- account, same pattern already used for Admin -> Staff.

-- 1. New role value.
-- Run this statement on its own (do not reference 'manager_center' in the
-- same transaction/script) -- Postgres cannot use a freshly added enum
-- value until it is committed.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager_center';

-- 2. Per-center Payments visibility toggle for the Admin role.
-- Manager Center always sees Payments regardless of this flag.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS show_payments_to_admin boolean NOT NULL DEFAULT true;

-- 3. Structured account-number sequence for manager_center (NEXT.xxx.MC.yy),
-- same pattern as member_no_seq/coach_no_seq/etc. Must run after statement 1
-- above has committed (needs the enum value to exist as a valid p_role input,
-- though the function itself only compares it as text).
CREATE SEQUENCE IF NOT EXISTS public.manager_center_no_seq;

CREATE OR REPLACE FUNCTION public.generate_user_no(p_role text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_seq bigint;
  v_code text;
begin
  case p_role
    when 'member' then v_seq := nextval('public.member_no_seq'); v_code := 'SW';
    when 'coach'  then v_seq := nextval('public.coach_no_seq');  v_code := 'CO';
    when 'admin'  then v_seq := nextval('public.admin_no_seq');  v_code := 'AD';
    when 'owner'  then v_seq := nextval('public.owner_no_seq');  v_code := 'OW';
    when 'school' then v_seq := nextval('public.school_no_seq'); v_code := 'SC';
    when 'staff'  then v_seq := nextval('public.staff_no_seq');  v_code := 'ST';
    when 'manager_center' then v_seq := nextval('public.manager_center_no_seq'); v_code := 'MC';
    else raise exception 'generate_user_no: unknown role %', p_role;
  end case;
  return 'NEXT.' || lpad(v_seq::text, 3, '0') || '.' || v_code || '.' || to_char(now(), 'YY');
end;
$function$;
