-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  wa_numbers ARRAY NOT NULL DEFAULT '{}'::text[],
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  city text,
  phone text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'archived'::text])),
  bank_name text,
  bank_account text,
  bank_holder text,
  CONSTRAINT branches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'member'::user_role,
  branch_id uuid,
  full_name text NOT NULL DEFAULT ''::text,
  nick_name text,
  phone text,
  avatar_url text,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
  birth_date date,
  address text,
  bio text,
  specialization text,
  bank_name text,
  bank_account text,
  bank_holder text,
  education_level text,
  education_institution text,
  health_notes text,
  is_profile_complete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email text,
  suspend_until date,
  suspend_reason text,
  is_archived boolean NOT NULL DEFAULT false,
  show_on_landing boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL,
  profile_id uuid,
  name text NOT NULL,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  pic_name text,
  pic_phone text,
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT schools_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT schools_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  goal text,
  photo_url text,
  capacity integer NOT NULL DEFAULT 15,
  enrolled integer NOT NULL DEFAULT 0,
  sessions_per_week integer NOT NULL DEFAULT 3,
  sessions_per_month integer NOT NULL DEFAULT 12,
  schedule_days ARRAY NOT NULL DEFAULT '{}'::text[],
  time_start time without time zone NOT NULL,
  time_end time without time zone NOT NULL,
  location_name text,
  price_monthly integer NOT NULL DEFAULT 0,
  age_min integer,
  age_max integer,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'archived'::text])),
  spreadsheet_filled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  schedule_time text,
  goals text,
  class_type text NOT NULL DEFAULT 'reguler'::text CHECK (class_type = ANY (ARRAY['reguler'::text, 'private'::text])),
  price_per_session integer,
  schedule_times jsonb,
  spreadsheet_url text,
  show_on_landing boolean NOT NULL DEFAULT false,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.class_coaches (
  class_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_coaches_pkey PRIMARY KEY (class_id, coach_id),
  CONSTRAINT class_coaches_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT class_coaches_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.class_criteria (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['score_10'::text, 'score_100'::text, 'choice'::text, 'text'::text])),
  options ARRAY,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT class_criteria_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'reguler'::member_type,
  status USER-DEFINED NOT NULL DEFAULT 'active'::member_status,
  suspend_until date,
  suspend_reason text,
  school_id uuid,
  date_start date NOT NULL DEFAULT CURRENT_DATE,
  qr_code text NOT NULL DEFAULT (uuid_generate_v4())::text UNIQUE,
  remaining_sessions integer,
  total_sessions integer,
  pay_status USER-DEFINED NOT NULL DEFAULT 'unpaid'::payment_status,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT members_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT members_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.member_classes (
  member_id uuid NOT NULL,
  class_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_classes_pkey PRIMARY KEY (member_id, class_id),
  CONSTRAINT member_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT member_classes_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  valid_from date,
  valid_until date,
  no_expiry boolean NOT NULL DEFAULT false,
  photo_url text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::cert_status,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  issuer text,
  reject_reason text,
  CONSTRAINT certifications_pkey PRIMARY KEY (id),
  CONSTRAINT certifications_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT certifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.coach_attendances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  class_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  session_date date NOT NULL,
  clock_in_at timestamp with time zone NOT NULL DEFAULT now(),
  selfie_url text,
  distance_meters integer,
  is_manual boolean NOT NULL DEFAULT false,
  manual_by uuid,
  manual_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  clock_in_time text,
  status text NOT NULL DEFAULT 'present'::text CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text])),
  manual_note text,
  invoice_id uuid,
  CONSTRAINT coach_attendances_pkey PRIMARY KEY (id),
  CONSTRAINT coach_attendances_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_attendances_manual_by_fkey FOREIGN KEY (manual_by) REFERENCES public.profiles(id),
  CONSTRAINT coach_attendances_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT coach_attendances_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT coach_attendances_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.coach_invoices(id)
);
CREATE TABLE public.member_attendances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL,
  class_id uuid NOT NULL,
  session_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'hadir'::attendance_status,
  method USER-DEFINED,
  marked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_attendances_pkey PRIMARY KEY (id),
  CONSTRAINT member_attendances_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.profiles(id),
  CONSTRAINT member_attendances_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT member_attendances_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.coach_leaves (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  reason text,
  date_from date NOT NULL,
  date_to date NOT NULL,
  substitute_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::leave_status,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  reject_reason text,
  created_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  branch_id uuid,
  CONSTRAINT coach_leaves_pkey PRIMARY KEY (id),
  CONSTRAINT coach_leaves_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_leaves_substitute_id_fkey FOREIGN KEY (substitute_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_leaves_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT coach_leaves_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.coach_leave_classes (
  leave_id uuid NOT NULL,
  class_id uuid NOT NULL,
  substitute_id uuid,
  CONSTRAINT coach_leave_classes_pkey PRIMARY KEY (leave_id, class_id),
  CONSTRAINT coach_leave_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT coach_leave_classes_leave_id_fkey FOREIGN KEY (leave_id) REFERENCES public.coach_leaves(id),
  CONSTRAINT coach_leave_classes_substitute_id_fkey FOREIGN KEY (substitute_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.member_leaves (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  reason text,
  date_from date NOT NULL,
  date_to date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::leave_status,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  reject_reason text,
  created_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_leaves_pkey PRIMARY KEY (id),
  CONSTRAINT member_leaves_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT member_leaves_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.member_leave_classes (
  leave_id uuid NOT NULL,
  class_id uuid NOT NULL,
  CONSTRAINT member_leave_classes_pkey PRIMARY KEY (leave_id, class_id),
  CONSTRAINT member_leave_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT member_leave_classes_leave_id_fkey FOREIGN KEY (leave_id) REFERENCES public.member_leaves(id)
);
CREATE TABLE public.bills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL,
  class_id uuid,
  branch_id uuid NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'monthly'::bill_type,
  period_label text NOT NULL,
  amount integer NOT NULL,
  discount integer NOT NULL DEFAULT 0,
  discount_reason text,
  total integer DEFAULT (amount - discount),
  status USER-DEFINED NOT NULL DEFAULT 'unpaid'::payment_status,
  paid_at timestamp with time zone,
  paid_method text,
  proof_url text,
  verified_by uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sessions_total integer,
  sessions_used integer NOT NULL DEFAULT 0,
  CONSTRAINT bills_pkey PRIMARY KEY (id),
  CONSTRAINT bills_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT bills_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id),
  CONSTRAINT bills_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT bills_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.coach_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  period_label text NOT NULL,
  total_amount integer NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::invoice_status,
  pdf_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  invoice_number text,
  bank_info text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  CONSTRAINT coach_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT coach_invoices_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.coach_invoice_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL,
  class_id uuid NOT NULL,
  session_count integer NOT NULL,
  rate integer NOT NULL,
  subtotal integer DEFAULT (session_count * rate),
  attendance_id uuid,
  CONSTRAINT coach_invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT coach_invoice_items_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT coach_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.coach_invoices(id),
  CONSTRAINT coach_invoice_items_attendance_id_fkey FOREIGN KEY (attendance_id) REFERENCES public.coach_attendances(id)
);
CREATE TABLE public.coach_rates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid,
  class_id uuid NOT NULL,
  rate integer NOT NULL,
  set_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rate_per_session integer,
  CONSTRAINT coach_rates_pkey PRIMARY KEY (id),
  CONSTRAINT coach_rates_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.profiles(id),
  CONSTRAINT coach_rates_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  target_all boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  target_roles ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT announcements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.announcement_classes (
  announcement_id uuid NOT NULL,
  class_id uuid NOT NULL,
  CONSTRAINT announcement_classes_pkey PRIMARY KEY (announcement_id, class_id),
  CONSTRAINT announcement_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT announcement_classes_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  icon text NOT NULL DEFAULT 'bell'::text,
  kind text NOT NULL DEFAULT 'info'::text CHECK (kind = ANY (ARRAY['info'::text, 'warn'::text, 'danger'::text, 'success'::text])),
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rapor_periods (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL,
  label text NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_periods_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT rapor_periods_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.rapor_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  period_id uuid NOT NULL,
  member_id uuid NOT NULL,
  class_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  filled_at timestamp with time zone,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_entries_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_entries_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT rapor_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT rapor_entries_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT rapor_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.rapor_periods(id)
);
CREATE TABLE public.member_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  rapor_id uuid NOT NULL,
  member_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT member_reviews_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT member_reviews_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT member_reviews_rapor_id_fkey FOREIGN KEY (rapor_id) REFERENCES public.rapor_entries(id)
);
CREATE TABLE public.registrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_id uuid,
  full_name text NOT NULL,
  birth_date date,
  gender text,
  phone text,
  phone_owner text CHECK (phone_owner = ANY (ARRAY['self'::text, 'parent'::text])),
  parent_name text,
  parent_phone text,
  address text,
  health_notes text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  proof_url text,
  member_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reject_reason text,
  email text,
  CONSTRAINT registrations_pkey PRIMARY KEY (id),
  CONSTRAINT registrations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT registrations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT registrations_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.class_holidays (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  holiday_date date NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_holidays_pkey PRIMARY KEY (id),
  CONSTRAINT class_holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT class_holidays_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT class_holidays_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.class_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  month text NOT NULL,
  week integer NOT NULL CHECK (week >= 1 AND week <= 5),
  topic text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_programs_pkey PRIMARY KEY (id),
  CONSTRAINT class_programs_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT class_programs_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.landing_hero (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  headline text NOT NULL DEFAULT 'Belajar renang lebih aman, modern, dan profesional.'::text,
  body_text text NOT NULL DEFAULT 'Next Swimming School membantu anak hingga dewasa belajar renang dengan metode modern, coach bersertifikat, dan sistem digital yang memudahkan orang tua memantau setiap progres.'::text,
  badge_text text NOT NULL DEFAULT 'Sistem digital terintegrasi — 5+ cabang aktif'::text,
  bg_image_url text NOT NULL DEFAULT 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1800&q=80&auto=format&fit=crop'::text,
  cta_primary_text text NOT NULL DEFAULT 'Konsultasi Sekarang'::text,
  cta_primary_wa text NOT NULL DEFAULT 'Halo, saya ingin tanya soal program & jadwal Next Swimming School.'::text,
  cta_secondary_text text NOT NULL DEFAULT 'Daftar Online'::text,
  feature_1_icon text NOT NULL DEFAULT 'shield'::text,
  feature_1_text text NOT NULL DEFAULT 'Coach bersertifikat'::text,
  feature_2_icon text NOT NULL DEFAULT 'chart'::text,
  feature_2_text text NOT NULL DEFAULT 'Progress monitoring'::text,
  feature_3_icon text NOT NULL DEFAULT 'users'::text,
  feature_3_text text NOT NULL DEFAULT 'Rasio kelas kecil'::text,
  feature_4_icon text NOT NULL DEFAULT 'qr'::text,
  feature_4_text text NOT NULL DEFAULT 'Sistem QR absensi'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_hero_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_hero_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  value text NOT NULL DEFAULT '0'::text,
  suffix text NOT NULL DEFAULT ''::text,
  label text NOT NULL DEFAULT ''::text,
  sub text NOT NULL DEFAULT ''::text,
  icon text NOT NULL DEFAULT 'star'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_hero_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_whyus (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
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
  CONSTRAINT landing_whyus_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_whyus_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'chart'::text,
  title text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_whyus_cards_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_testimonials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL DEFAULT ''::text,
  role text NOT NULL DEFAULT ''::text,
  body_text text NOT NULL DEFAULT ''::text,
  avatar_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_testimonials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_faqs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  question text NOT NULL DEFAULT ''::text,
  answer text NOT NULL DEFAULT ''::text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_faqs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_finalcta (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  headline text NOT NULL DEFAULT 'Mulai perjalanan renangmu bersama Next Swimming School.'::text,
  body_text text NOT NULL DEFAULT 'Chat admin kami untuk konsultasi program yang paling sesuai dengan anak Anda atau diri sendiri.'::text,
  cta_wa_text text NOT NULL DEFAULT 'Chat admin sekarang'::text,
  cta_wa_message text NOT NULL DEFAULT 'Halo, saya tertarik untuk daftar di Next Swimming School.'::text,
  cta_sec_text text NOT NULL DEFAULT 'Lihat program'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_finalcta_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_config (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  footer_wa_number text NOT NULL DEFAULT '082110009667'::text,
  footer_tagline text NOT NULL DEFAULT 'Sekolah renang modern dengan ekosistem digital terintegrasi. Cabang aktif di Jakarta Selatan, Bogor, dan Bandung.'::text,
  floating_wa_message text NOT NULL DEFAULT 'Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?'::text,
  nav_cta_text text NOT NULL DEFAULT 'Konsultasi Sekarang'::text,
  nav_cta_message text NOT NULL DEFAULT 'Halo Admin Next Swimming School, saya ingin konsultasi program renang.'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.landing_nav_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  label text NOT NULL DEFAULT ''::text,
  href text NOT NULL DEFAULT '#'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_nav_links_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coach_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT coach_branches_pkey PRIMARY KEY (id),
  CONSTRAINT coach_branches_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.class_coach_spreadsheets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  spreadsheet_url text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_coach_spreadsheets_pkey PRIMARY KEY (id),
  CONSTRAINT class_coach_spreadsheets_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_coach_spreadsheets_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
);