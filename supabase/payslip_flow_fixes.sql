-- Fixes required for the unified Owner "Slip Gaji" (payslip) flow redesign.
-- Both statements are already applied to the live DB directly; this file is the checked-in record.

-- 1. coach_invoice_items.item_type CHECK was missing 'manual_fee', which PayslipGenerator.tsx's
--    manual_coach mode already inserts — that insert was silently violating the live constraint.
ALTER TABLE public.coach_invoice_items DROP CONSTRAINT coach_invoice_items_item_type_check;
ALTER TABLE public.coach_invoice_items ADD CONSTRAINT coach_invoice_items_item_type_check
  CHECK (item_type = ANY (ARRAY['class'::text, 'extra'::text, 'reimburse'::text, 'manual_fee'::text]));

-- 2. cancel_coach_invoice only allowed cancelling a 'pending' invoice, so a rejected invoice's
--    claimed coach_attendances rows stayed locked forever and the coach could never resubmit.
CREATE OR REPLACE FUNCTION public.cancel_coach_invoice(p_invoice_id uuid, p_coach_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM coach_invoices
    WHERE id = p_invoice_id AND coach_id = p_coach_id AND status IN ('pending','rejected')
  ) THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan atau sudah tidak bisa dibatalkan';
  END IF;
  UPDATE coach_attendances SET invoice_id = NULL WHERE invoice_id = p_invoice_id;
  DELETE FROM coach_invoice_items WHERE invoice_id = p_invoice_id;
  UPDATE coach_invoices SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_invoice_id;
END;
$function$;
