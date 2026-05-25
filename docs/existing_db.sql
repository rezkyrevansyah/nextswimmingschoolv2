-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.announcement_classes (
  announcement_id uuid NOT NULL,
  class_id uuid NOT NULL,
  CONSTRAINT announcement_classes_pkey PRIMARY KEY (announcement_id, class_id),
  CONSTRAINT announcement_classes_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id),
  CONSTRAINT announcement_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
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
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
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
  CONSTRAINT bills_pkey PRIMARY KEY (id),
  CONSTRAINT bills_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT bills_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT bills_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT bills_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
);
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
  CONSTRAINT branches_pkey PRIMARY KEY (id)
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
  CONSTRAINT certifications_pkey PRIMARY KEY (id),
  CONSTRAINT certifications_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT certifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_coaches (
  class_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_coaches_pkey PRIMARY KEY (class_id, coach_id),
  CONSTRAINT class_coaches_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_coaches_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
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
  show_landing boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'archived'::text])),
  spreadsheet_filled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  schedule_time text,
  show_on_landing boolean,
  goals text,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
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
  status text NOT NULL DEFAULT 'present'::text CHECK (status = ANY (ARRAY['present'::text, 'absent'::text])),
  manual_note text,
  invoice_id uuid,
  CONSTRAINT coach_attendances_pkey PRIMARY KEY (id),
  CONSTRAINT coach_attendances_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_attendances_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT coach_attendances_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT coach_attendances_manual_by_fkey FOREIGN KEY (manual_by) REFERENCES public.profiles(id),
  CONSTRAINT coach_attendances_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.coach_invoices(id)
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
  CONSTRAINT coach_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.coach_invoices(id),
  CONSTRAINT coach_invoice_items_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT coach_invoice_items_attendance_id_fkey FOREIGN KEY (attendance_id) REFERENCES public.coach_attendances(id)
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
CREATE TABLE public.coach_leave_classes (
  leave_id uuid NOT NULL,
  class_id uuid NOT NULL,
  CONSTRAINT coach_leave_classes_pkey PRIMARY KEY (leave_id, class_id),
  CONSTRAINT coach_leave_classes_leave_id_fkey FOREIGN KEY (leave_id) REFERENCES public.coach_leaves(id),
  CONSTRAINT coach_leave_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
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
  CONSTRAINT coach_leaves_pkey PRIMARY KEY (id),
  CONSTRAINT coach_leaves_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_leaves_substitute_id_fkey FOREIGN KEY (substitute_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_leaves_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.coach_rates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  class_id uuid NOT NULL,
  rate integer NOT NULL,
  set_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rate_per_session integer,
  CONSTRAINT coach_rates_pkey PRIMARY KEY (id),
  CONSTRAINT coach_rates_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_rates_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT coach_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.profiles(id)
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
  CONSTRAINT member_attendances_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT member_attendances_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT member_attendances_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.member_classes (
  member_id uuid NOT NULL,
  class_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_classes_pkey PRIMARY KEY (member_id, class_id),
  CONSTRAINT member_classes_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT member_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.member_leave_classes (
  leave_id uuid NOT NULL,
  class_id uuid NOT NULL,
  CONSTRAINT member_leave_classes_pkey PRIMARY KEY (leave_id, class_id),
  CONSTRAINT member_leave_classes_leave_id_fkey FOREIGN KEY (leave_id) REFERENCES public.member_leaves(id),
  CONSTRAINT member_leave_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
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
  CONSTRAINT member_leaves_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT member_leaves_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
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
  CONSTRAINT member_reviews_rapor_id_fkey FOREIGN KEY (rapor_id) REFERENCES public.rapor_entries(id),
  CONSTRAINT member_reviews_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT member_reviews_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
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
  CONSTRAINT members_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT members_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
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
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
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
  CONSTRAINT rapor_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.rapor_periods(id),
  CONSTRAINT rapor_entries_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT rapor_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT rapor_entries_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
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
  CONSTRAINT rapor_periods_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT rapor_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
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
  CONSTRAINT registrations_pkey PRIMARY KEY (id),
  CONSTRAINT registrations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT registrations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT registrations_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_id uuid NOT NULL,
  profile_id uuid,
  name text NOT NULL,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT schools_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT schools_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);