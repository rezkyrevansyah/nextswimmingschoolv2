-- Migration 026: Payslips table for coach salary slips
-- Owner generates payslips from paid coach_invoices.
-- Coach can view published payslips in their panel.
-- coaches.id is the same as profiles.id (coaches table has coach_id FK to profiles).

CREATE TABLE IF NOT EXISTS public.payslips (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  invoice_id   UUID REFERENCES public.coach_invoices(id) ON DELETE SET NULL,
  period_label TEXT NOT NULL,
  gross_amount INTEGER NOT NULL DEFAULT 0,
  deductions   INTEGER NOT NULL DEFAULT 0,
  net_amount   INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslips_coach_id    ON public.payslips(coach_id);
CREATE INDEX IF NOT EXISTS idx_payslips_branch_id   ON public.payslips(branch_id);
CREATE INDEX IF NOT EXISTS idx_payslips_invoice_id  ON public.payslips(invoice_id);
