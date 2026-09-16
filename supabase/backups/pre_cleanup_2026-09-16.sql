-- Backup snapshot (structure + data) of tables removed by drop_unused_tables.sql.
-- Taken 2026-09-16T04:15:08.281Z before dropping, for recovery if ever needed.
-- Regenerate a table with the CREATE TABLE block below, then re-insert rows from
-- the accompanying data listing (none of these tables had any rows at drop time).

-- ===== drizzle_test_notes (0 rows at backup time) =====
CREATE TABLE public.drizzle_test_notes (
  id integer NOT NULL DEFAULT nextval('drizzle_test_notes_id_seq'::regclass),
  title text NOT NULL,
  content text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT drizzle_test_notes_pkey PRIMARY KEY (id)
);

-- (no rows)

-- ===== rapor_level_best_times (0 rows at backup time) =====
CREATE TABLE public.rapor_level_best_times (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL,
  stroke text NOT NULL,
  distance integer NOT NULL,
  target_time_seconds numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_level_best_times_distance_check CHECK ((distance > 0)),
  CONSTRAINT rapor_level_best_times_level_id_fkey FOREIGN KEY (level_id) REFERENCES rapor_levels(id) ON DELETE CASCADE,
  CONSTRAINT rapor_level_best_times_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_level_best_times_target_time_seconds_check CHECK (((target_time_seconds IS NULL) OR (target_time_seconds > (0)::numeric)))
);

-- (no rows)

-- ===== landing_whyus (0 rows at backup time) =====
CREATE TABLE public.landing_whyus (
  id integer NOT NULL DEFAULT 1,
  section_label text NOT NULL DEFAULT 'Mengapa Kami'::text,
  headline text NOT NULL DEFAULT 'Lima alasan keluarga mempercayakan kami.'::text,
  body_text text NOT NULL DEFAULT 'Bukan sekadar belajar renang — kami menghadirkan ekosistem yang mempermudah orang tua, coach, dan administrasi sekolah dalam satu sistem.'::text,
  wa_button_text text NOT NULL DEFAULT 'Hubungi Admin via WhatsApp'::text,
  wa_message text NOT NULL DEFAULT 'Halo, saya ingin tanya kelebihan & detail program di Next Swimming School.'::text,
  featured_icon text NOT NULL DEFAULT 'shield'::text,
  featured_title text NOT NULL DEFAULT 'Coach Profesional'::text,
  featured_desc text NOT NULL DEFAULT 'Setiap coach memiliki sertifikasi yang diverifikasi admin sebelum mengajar.'::text,
  featured_stat1_label text NOT NULL DEFAULT 'Sertifikasi'::text,
  featured_stat1_value text NOT NULL DEFAULT '100%'::text,
  featured_stat2_label text NOT NULL DEFAULT 'Lifeguard ARC'::text,
  featured_stat2_value text NOT NULL DEFAULT 'Aktif'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_whyus_id_check CHECK ((id = 1)),
  CONSTRAINT landing_whyus_pkey PRIMARY KEY (id)
);

-- (no rows)

-- ===== landing_whyus_cards (0 rows at backup time) =====
CREATE TABLE public.landing_whyus_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'chart'::text,
  title text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_whyus_cards_pkey PRIMARY KEY (id)
);

-- (no rows)

-- ===== rapor_signatures (0 rows at backup time) =====
CREATE TABLE public.rapor_signatures (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  title text NOT NULL,
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_signatures_pkey PRIMARY KEY (id)
);

-- (no rows)

-- ===== rapor_signature_assignments (0 rows at backup time) =====
CREATE TABLE public.rapor_signature_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  context text NOT NULL,
  school_id uuid,
  signature_id uuid NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL,
  CONSTRAINT rapor_signature_assignments_context_check CHECK ((context = ANY (ARRAY['reguler'::text, 'private'::text, 'school'::text]))),
  CONSTRAINT rapor_signature_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_signature_assignments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT rapor_signature_assignments_signature_id_fkey FOREIGN KEY (signature_id) REFERENCES rapor_signatures(id),
  CONSTRAINT rapor_signature_assignments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id)
);

-- (no rows)

-- ===== class_criteria (0 rows at backup time) =====
CREATE TABLE public.class_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  label text NOT NULL,
  kind text NOT NULL,
  options text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_criteria_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT class_criteria_kind_check CHECK ((kind = ANY (ARRAY['score_10'::text, 'score_100'::text, 'choice'::text, 'text'::text]))),
  CONSTRAINT class_criteria_pkey PRIMARY KEY (id)
);

-- (no rows)

