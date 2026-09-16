-- Staff self-invoice submission flow (attendance-based or manual entry), reusing the
-- coach_invoices/coach_invoice_items/payslips pipeline already built for coaches.
-- All statements are already applied to the live DB directly; this file is the checked-in record.

-- 1. Persisted daily rate per staff, set once by the owner (mirrors coach_rates), used to
--    auto-compute an attendance-based invoice total instead of the staff retyping it each time.
CREATE TABLE public.staff_rates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL UNIQUE,
  rate_per_day integer NOT NULL,
  set_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_rates_pkey PRIMARY KEY (id),
  CONSTRAINT staff_rates_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT staff_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.profiles(id)
);

-- 2. staff_attendances gets its own claim/release column (mirrors coach_attendances.invoice_id)
--    so an attendance-based staff invoice can atomically claim present days, and release them
--    back if the invoice is cancelled/rejected-then-resubmitted, exactly like coach invoicing.
ALTER TABLE public.staff_attendances ADD COLUMN invoice_id uuid REFERENCES public.coach_invoices(id);

-- 3. New item_type for an aggregate "N present days x daily rate" line item on a staff invoice.
ALTER TABLE public.coach_invoice_items DROP CONSTRAINT coach_invoice_items_item_type_check;
ALTER TABLE public.coach_invoice_items ADD CONSTRAINT coach_invoice_items_item_type_check
  CHECK (item_type = ANY (ARRAY['class'::text, 'extra'::text, 'reimburse'::text, 'manual_fee'::text, 'staff_session'::text]));

-- 4. cancel_coach_invoice now also frees staff_attendances rows (harmless no-op for a coach
--    invoice, since its items never reference staff_attendances). Keeps one shared RPC instead
--    of a parallel cancel_staff_invoice.
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
  UPDATE staff_attendances SET invoice_id = NULL WHERE invoice_id = p_invoice_id;
  DELETE FROM coach_invoice_items WHERE invoice_id = p_invoice_id;
  UPDATE coach_invoices SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_invoice_id;
END;
$function$;
