-- Auto-generated structured ID number per account: NEXT.{seq}.{role code}.{yy}
-- e.g. NEXT.001.SW.26 (member), NEXT.001.CO.26 (coach), NEXT.001.AD.26 (admin),
--      NEXT.001.OW.26 (owner), NEXT.001.SC.26 (school)
-- Sequence never resets per year — continuous per-role counter; year segment
-- only records when that account was created. Run this in Supabase SQL Editor.
-- Safe to rerun (schema parts are idempotent; backfill only touches NULL rows).

create sequence if not exists public.member_no_seq;
create sequence if not exists public.coach_no_seq;
create sequence if not exists public.admin_no_seq;
create sequence if not exists public.owner_no_seq;
create sequence if not exists public.school_no_seq;

create or replace function public.generate_user_no(p_role text)
returns text
language plpgsql
as $$
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
    else raise exception 'generate_user_no: unknown role %', p_role;
  end case;
  return 'NEXT.' || lpad(v_seq::text, 3, '0') || '.' || v_code || '.' || to_char(now(), 'YY');
end;
$$;

alter table public.profiles add column if not exists user_no text;

-- ── Backfill existing accounts, in creation order, using each row's own
-- ── historical creation year — only touches rows that don't have one yet.
do $$
declare
  v_role text;
  v_code text;
begin
  for v_role, v_code in
    select * from (values ('coach', 'CO'), ('admin', 'AD'), ('owner', 'OW'), ('school', 'SC')) as t(role, code)
  loop
    execute format($f$
      with ranked as (
        select id, row_number() over (order by created_at) as rn, created_at
        from public.profiles where role = %L and user_no is null
      )
      update public.profiles p
      set user_no = 'NEXT.' || lpad(r.rn::text, 3, '0') || '.%s.' || to_char(r.created_at, 'YY')
      from ranked r where r.id = p.id
    $f$, v_role, v_code);
  end loop;
end $$;

with ranked as (
  select id, row_number() over (order by created_at) as rn, created_at
  from public.members where member_no is null
)
update public.members m
set member_no = 'NEXT.' || lpad(r.rn::text, 3, '0') || '.SW.' || to_char(r.created_at, 'YY')
from ranked r where r.id = m.id;

-- ── Advance each sequence past the last backfilled number so new signups continue correctly.
select setval('public.coach_no_seq',  greatest(1, (select count(*) from public.profiles where role = 'coach')));
select setval('public.admin_no_seq',  greatest(1, (select count(*) from public.profiles where role = 'admin')));
select setval('public.owner_no_seq',  greatest(1, (select count(*) from public.profiles where role = 'owner')));
select setval('public.school_no_seq', greatest(1, (select count(*) from public.profiles where role = 'school')));
select setval('public.member_no_seq', greatest(1, (select count(*) from public.members)));
