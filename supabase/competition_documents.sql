-- Moves certificate/document upload from per-achievement (competition_participations)
-- to per (member, competition) — one document covers every category a member won at
-- that event, instead of re-uploading the same certificate for each category row.
-- Both statements are already applied to the live DB directly; this file is the checked-in record.

ALTER TABLE public.competition_participations DROP COLUMN certificate_url;
ALTER TABLE public.competition_participations DROP COLUMN photo_url;

CREATE TABLE public.competition_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competition_documents_pkey PRIMARY KEY (id),
  CONSTRAINT competition_documents_unique UNIQUE (competition_id, member_id)
);

-- Added after the initial rollout: the upload accepts PDFs, but the viewing UI needs to know
-- the real content type to decide whether to open it as an image lightbox or a new browser
-- tab (an <img> tag can't render a PDF, and the storage key/URL always ends in a fixed
-- extension regardless of the actual uploaded file, so it can't be inferred from the URL).
ALTER TABLE public.competition_documents ADD COLUMN content_type text;
