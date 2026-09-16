-- Fixes "Session Left" drift for private members: the previous flow inserted
-- the member_attendances row, then called consume_private_session as a
-- SEPARATE step. If that second call failed (network blip, transient DB
-- error), the attendance was already recorded — permanently blocking retry
-- via the existing dup-check — while remaining_sessions silently failed to
-- decrement. This function folds dup-check + insert + decrement + bill sync
-- into one atomic transaction: any failure rolls back everything, so a retry
-- is always safe and remaining_sessions can never drift from attendance.
--
-- Also discovered while testing this fix: a legacy trigger
-- (private_sessions_decrement -> decrement_private_sessions()) independently
-- decremented members.remaining_sessions on every 'hadir' attendance insert,
-- stacking with the application-level consume_private_session() RPC call and
-- silently double-decrementing every on-time private attendance (a 'telat'
-- attendance was unaffected, since the trigger only matched status='hadir').
-- This predates consume_private_session and was never removed when it was
-- introduced. Dropped here so this new RPC is the sole place that decrements
-- remaining_sessions.
DROP TRIGGER IF EXISTS private_sessions_decrement ON member_attendances;
DROP FUNCTION IF EXISTS decrement_private_sessions();

CREATE OR REPLACE FUNCTION record_private_session_attendance(
  p_member_id uuid, p_class_id uuid, p_session_date date,
  p_status attendance_status, p_method attendance_method, p_marked_by uuid
)
RETURNS TABLE(
  out_remaining_sessions integer, out_bill_id uuid,
  out_bill_sessions_used integer, out_bill_sessions_total integer,
  out_already_recorded boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_id uuid;
  v_remaining integer;
  v_bill_id uuid;
  v_bill_used integer;
  v_bill_total integer;
BEGIN
  SELECT id INTO v_existing_id FROM member_attendances
    WHERE class_id = p_class_id AND member_id = p_member_id AND session_date = p_session_date
    LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT NULL::integer, NULL::uuid, NULL::integer, NULL::integer, true;
    RETURN;
  END IF;

  INSERT INTO member_attendances (member_id, class_id, session_date, status, method, marked_by)
  VALUES (p_member_id, p_class_id, p_session_date, p_status, p_method, p_marked_by);

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

  RETURN QUERY SELECT v_remaining, v_bill_id, v_bill_used, v_bill_total, false;
END;
$$;
