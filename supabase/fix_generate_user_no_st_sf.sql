-- Fix generate_user_no's account-code letters to match the locked spec in
-- docs/Next Swimming School Revamp/docs/README.md glossary and CLAUDE.md §8 rule 12:
-- Student (role `member`) = ST, Staff (role `staff`) = SF.
-- Previously these were swapped: member -> SW, staff -> ST.
-- Only affects NEW codes generated from now on — existing public_id/user_no/member_no
-- values already issued are historical records and must not be rewritten (per the
-- "ID dan QR tidak berganti kecuali akun dihapus" rule).
CREATE OR REPLACE FUNCTION public.generate_user_no(p_role text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
    declare
      v_seq bigint;
      v_code text;
    begin
      case p_role
        when 'member' then v_seq := nextval('public.member_no_seq'); v_code := 'ST';
        when 'coach'  then v_seq := nextval('public.coach_no_seq');  v_code := 'CO';
        when 'admin'  then v_seq := nextval('public.admin_no_seq');  v_code := 'AD';
        when 'owner'  then v_seq := nextval('public.owner_no_seq');  v_code := 'OW';
        when 'school' then v_seq := nextval('public.school_no_seq'); v_code := 'SC';
        when 'staff'  then v_seq := nextval('public.staff_no_seq');  v_code := 'SF';
        when 'manager_center' then v_seq := nextval('public.manager_center_no_seq'); v_code := 'MC';
        else raise exception 'generate_user_no: unknown role %', p_role;
      end case;
      return 'NEXT.' || lpad(v_seq::text, 3, '0') || '.' || v_code || '.' || to_char(now(), 'YY');
    end;
    $function$
