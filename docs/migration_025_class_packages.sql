-- Migration 025: Class packages for private class pricing
-- Structured package definitions replace unstructured price_per_session usage.
-- price_per_session column on classes is kept for backward compat but no longer
-- used for private classes that have packages defined here.

CREATE TABLE IF NOT EXISTS public.class_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sessions    INTEGER NOT NULL CHECK (sessions > 0),
  price       INTEGER NOT NULL CHECK (price >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_packages_class_id ON public.class_packages(class_id);
