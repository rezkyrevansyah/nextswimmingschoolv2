-- Member Private rebuild: enforce the 1-private-class-per-1-member invariant
-- (previously just a UI convention, never enforced -- an edit-time gap in the
-- old AdminMember.tsx flow allowed a private class to end up with >1 member),
-- and make session-count consumption atomic (previously a client-side
-- read-then-write race between members.remaining_sessions and the matching
-- bills.sessions_used, done as two separate non-atomic writes).
--
-- Audited before writing this: 1 private class, 1 private member, cleanly
-- matched, zero existing violations -- safe to add the constraint now.

-- 1. Enforce 1:1 at the database level (defense-in-depth, regardless of
-- which UI writes to member_classes going forward).
CREATE OR REPLACE FUNCTION enforce_private_class_single_member()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_class_type text;
  v_existing_count integer;
BEGIN
  SELECT class_type INTO v_class_type FROM classes WHERE id = NEW.class_id;
  IF v_class_type = 'private' THEN
    SELECT count(*) INTO v_existing_count FROM member_classes
      WHERE class_id = NEW.class_id AND member_id <> NEW.member_id;
    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'This private class already has a different member assigned (class_id=%)', NEW.class_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_private_class_single_member ON member_classes;
CREATE TRIGGER trg_enforce_private_class_single_member
  BEFORE INSERT OR UPDATE ON member_classes
  FOR EACH ROW EXECUTE FUNCTION enforce_private_class_single_member();

-- 2. Atomic session consumption -- replaces the old client-side
-- read-remaining_sessions -> compute -> write-back, plus a separate
-- read-bill -> compute -> write-back, with one transactional RPC call.
-- Mirrors the same bill lookup the old client code used exactly
-- (type='session_pack', status='paid', most recent).
-- Output columns are prefixed (out_*) to avoid colliding with real column
-- names on members/bills -- RETURNS TABLE columns become implicit PL/pgSQL
-- variables, and e.g. a bare "remaining_sessions" output column would be
-- ambiguous against members.remaining_sessions referenced in the body below.
DROP FUNCTION IF EXISTS consume_private_session(uuid, uuid);
CREATE OR REPLACE FUNCTION consume_private_session(p_member_id uuid, p_class_id uuid)
RETURNS TABLE(out_remaining_sessions integer, out_bill_id uuid, out_bill_sessions_used integer, out_bill_sessions_total integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining integer;
  v_bill_id uuid;
  v_bill_used integer;
  v_bill_total integer;
BEGIN
  UPDATE members
  SET remaining_sessions = GREATEST(0, COALESCE(remaining_sessions, 0) - 1)
  WHERE id = p_member_id
  RETURNING members.remaining_sessions INTO v_remaining;

  SELECT b.id, b.sessions_used, b.sessions_total INTO v_bill_id, v_bill_used, v_bill_total
  FROM bills b
  WHERE b.member_id = p_member_id AND b.class_id = p_class_id
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
$$;
