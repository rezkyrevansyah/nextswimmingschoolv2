-- Rename the "member" role/table family to "student" throughout the schema.
-- Scope: user_role enum value, member_type/member_status enums, members table
-- and all its dependents (attendances, classes, leaves, reviews, best_times,
-- leave_classes), member_profiles view, member_no_seq, and the SQL functions
-- that reference these objects (handle_new_user, generate_user_no,
-- enforce_private_class_single_member, consume_private_session,
-- record_private_session_attendance). Indexes, constraints, triggers and RLS
-- policy names are also renamed for consistency (their logic already follows
-- automatically via OID references; only the labels are cosmetic here).
--
-- Run once via a Node script using DATABASE_URL (see CLAUDE.md "Applying
-- database migrations"). This file is the durable record of what ran.

-- 1. Enum: user_role.member -> user_role.student
ALTER TYPE user_role RENAME VALUE 'member' TO 'student';

-- 2. Enums: member_type / member_status -> student_type / student_status
ALTER TYPE member_type RENAME TO student_type;
ALTER TYPE member_status RENAME TO student_status;

-- 3. Sequence
ALTER SEQUENCE member_no_seq RENAME TO student_no_seq;

-- 4. Tables
ALTER TABLE members RENAME TO students;
ALTER TABLE member_attendances RENAME TO student_attendances;
ALTER TABLE member_best_times RENAME TO student_best_times;
ALTER TABLE member_classes RENAME TO student_classes;
ALTER TABLE member_leave_classes RENAME TO student_leave_classes;
ALTER TABLE member_leaves RENAME TO student_leaves;
ALTER TABLE member_reviews RENAME TO student_reviews;

-- 5. Columns
ALTER TABLE students RENAME COLUMN member_no TO student_no;
ALTER TABLE bills RENAME COLUMN member_id TO student_id;
ALTER TABLE competition_documents RENAME COLUMN member_id TO student_id;
ALTER TABLE competition_participations RENAME COLUMN member_id TO student_id;
ALTER TABLE student_attendances RENAME COLUMN member_id TO student_id;
ALTER TABLE student_best_times RENAME COLUMN member_id TO student_id;
ALTER TABLE student_classes RENAME COLUMN member_id TO student_id;
ALTER TABLE student_leaves RENAME COLUMN member_id TO student_id;
ALTER TABLE student_reviews RENAME COLUMN member_id TO student_id;
ALTER TABLE rapor_entries RENAME COLUMN member_id TO student_id;
ALTER TABLE registrations RENAME COLUMN member_id TO student_id;

-- 6. View
ALTER VIEW member_profiles RENAME TO student_profiles;

-- 7. Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$function$;

ALTER FUNCTION public.enforce_private_class_single_member() RENAME TO enforce_private_class_single_student;

CREATE OR REPLACE FUNCTION public.enforce_private_class_single_student()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_class_type text;
  v_existing_count integer;
BEGIN
  SELECT class_type INTO v_class_type FROM classes WHERE id = NEW.class_id;
  IF v_class_type = 'private' THEN
    SELECT count(*) INTO v_existing_count FROM student_classes
      WHERE class_id = NEW.class_id AND student_id <> NEW.student_id;
    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'This private class already has a different student assigned (class_id=%)', NEW.class_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP FUNCTION public.consume_private_session(uuid, uuid);

CREATE OR REPLACE FUNCTION public.consume_private_session(p_student_id uuid, p_class_id uuid)
RETURNS TABLE(out_remaining_sessions integer, out_bill_id uuid, out_bill_sessions_used integer, out_bill_sessions_total integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_remaining integer;
  v_bill_id uuid;
  v_bill_used integer;
  v_bill_total integer;
BEGIN
  UPDATE students
  SET remaining_sessions = GREATEST(0, COALESCE(remaining_sessions, 0) - 1)
  WHERE id = p_student_id
  RETURNING students.remaining_sessions INTO v_remaining;

  SELECT b.id, b.sessions_used, b.sessions_total INTO v_bill_id, v_bill_used, v_bill_total
  FROM bills b
  WHERE b.student_id = p_student_id AND b.class_id = p_class_id
    AND b.type = 'session_pack' AND b.status = 'paid'
  ORDER BY b.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_bill_id IS NOT NULL THEN
    UPDATE bills
    SET sessions_used = LEAST(COALESCE(sessions_total, sessions_used + 1), COALESCE(sessions_used, 0) + 1)
    WHERE id = v_bill_id
    RETURNING bills.sessions_used INTO v_bill_used;
  END IF;

  RETURN QUERY SELECT v_remaining, v_bill_id, v_bill_used, v_bill_total;
END;
$function$;

DROP FUNCTION public.record_private_session_attendance(uuid, uuid, date, attendance_status, attendance_method, uuid);

CREATE OR REPLACE FUNCTION public.record_private_session_attendance(p_student_id uuid, p_class_id uuid, p_session_date date, p_status attendance_status, p_method attendance_method, p_marked_by uuid)
RETURNS TABLE(out_remaining_sessions integer, out_bill_id uuid, out_bill_sessions_used integer, out_bill_sessions_total integer, out_already_recorded boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing_id uuid;
  v_remaining integer;
  v_bill_id uuid;
  v_bill_used integer;
  v_bill_total integer;
BEGIN
  SELECT id INTO v_existing_id FROM student_attendances
    WHERE class_id = p_class_id AND student_id = p_student_id AND session_date = p_session_date
    LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT NULL::integer, NULL::uuid, NULL::integer, NULL::integer, true;
    RETURN;
  END IF;

  INSERT INTO student_attendances (student_id, class_id, session_date, status, method, marked_by)
  VALUES (p_student_id, p_class_id, p_session_date, p_status, p_method, p_marked_by);

  UPDATE students
  SET remaining_sessions = GREATEST(0, COALESCE(remaining_sessions, 0) - 1)
  WHERE id = p_student_id
  RETURNING students.remaining_sessions INTO v_remaining;

  SELECT b.id, b.sessions_used, b.sessions_total INTO v_bill_id, v_bill_used, v_bill_total
  FROM bills b
  WHERE b.student_id = p_student_id AND b.class_id = p_class_id
    AND b.type = 'session_pack' AND b.status = 'paid'
  ORDER BY b.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_bill_id IS NOT NULL THEN
    UPDATE bills
    SET sessions_used = LEAST(COALESCE(sessions_total, sessions_used + 1), COALESCE(sessions_used, 0) + 1)
    WHERE id = v_bill_id
    RETURNING bills.sessions_used INTO v_bill_used;
  END IF;

  RETURN QUERY SELECT v_remaining, v_bill_id, v_bill_used, v_bill_total, false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_user_no(p_role text)
RETURNS text
LANGUAGE plpgsql
AS $function$
    declare
      v_seq bigint;
      v_code text;
    begin
      case p_role
        when 'student' then v_seq := nextval('public.student_no_seq'); v_code := 'ST';
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
    $function$;

-- 8. Trigger names (cosmetic, functions already point at renamed tables above)
ALTER TRIGGER member_classes_enrolled ON student_classes RENAME TO student_classes_enrolled;
ALTER TRIGGER trg_enforce_private_class_single_member ON student_classes RENAME TO trg_enforce_private_class_single_student;
